/**
 * Delta Sync & Two-Way Reconciliation Worker
 * Per ADR-003 and Phase 5 Specifications
 *
 * Implements:
 * - Push: Drains outbox with exponential backoff and jitter.
 * - Pull: Cursor-based delta pull querying records where hlc > last_synced_hlc.
 * - Conflict Resolution: Per-Field Last-Write-Wins (LWW) using HLC.
 * - Deletion Handling: Tombstone-based soft-deletion with deterministic un-deletion on newer edits.
 * - Local Fallback: Operates completely in local offline mode if Supabase is unconfigured.
 */

import { db, OurClosetDB } from '../db';
import { outboxQueue, OutboxQueue, OutboxMutation } from './outbox';
import { compareHlc, defaultHlc } from './hlc';
import { isSupabaseConfigured, createClient } from '@/services/supabase/client';
import {
  normalizeTable,
  pickSyncFields,
  fieldHlcFor,
  deltaFromRow,
  type SyncTable,
  type RemoteDelta,
} from './syncMapper';

export type SyncState = 'synced' | 'pending' | 'offline' | 'error';
export type { RemoteDelta } from './syncMapper';

export interface SyncTransport {
  isConfigured(): boolean;
  push(mutations: OutboxMutation[]): Promise<{
    succeededIds: string[];
    failed: { id: string; error: string }[];
  }>;
  /**
   * Pull everything written after `cursor`. The cursor is OPAQUE to the worker and must come from the server's
   * write order. It must never be derived from client HLCs: an offline device pushes OLD hlcs late, so
   * "max hlc seen" would skip those writes forever (this was the original convergence bug).
   * Implementations may return overlap (re-delivery); reconciliation is idempotent.
   */
  pull(cursor: string | null): Promise<{
    deltas: RemoteDelta[];
    nextCursor: string | null;
  }>;
}

export interface SyncResult {
  pushedCount: number;
  pulledCount: number;
  conflictsResolved: number;
  errors: string[];
}

export interface SyncStats {
  state: SyncState;
  pendingCount: number;
  inFlightCount: number;
  failedCount: number;
  deadLetterCount: number;
  lastSyncedAt: string | null;
  lastSyncedCursor: string | null;
  lastError: string | null;
}

// Backoff configuration
export const SYNC_CONFIG = {
  baseBackoffMs: 1000,
  maxBackoffMs: 30000,
  jitterMs: 500,
  defaultSyncIntervalMs: 30000,
  // New key names on purpose: an old build stored a client HLC here, which is not a valid server cursor.
  storageKeyCursor: 'ourcloset_sync_cursor_v2',
  storageKeyLastSyncTime: 'ourcloset_last_synced_time',
  /** Re-read this many seq numbers behind the cursor: sequence order is assignment order, not commit order. */
  pullOverlap: 25,
  pageSize: 500,
};

export const INITIAL_HLC = '000000000000000:00000:initial';

/**
 * Calculates exponential backoff delay with jitter
 */
export function calculateBackoff(retryCount: number): number {
  const base = Math.min(
    SYNC_CONFIG.maxBackoffMs,
    SYNC_CONFIG.baseBackoffMs * Math.pow(2, Math.max(0, retryCount))
  );
  const jitter = Math.random() * SYNC_CONFIG.jitterMs;
  return Math.floor(base + jitter);
}

/**
 * Pure Per-Field Last-Write-Wins (LWW) Reconciliation Function
 * Merges local and incoming records deterministically using field-level HLC timestamps.
 */
export function reconcileEntity<T extends Record<string, any>>(
  local: T | null | undefined,
  incoming: T,
  options?: {
    incomingAction?: 'insert' | 'update' | 'delete';
    incomingHlc?: string;
    incomingFieldHlcs?: Record<string, string>;
    incomingDeletedAt?: string | null;
  }
): { merged: T; changed: boolean; conflictFieldCount: number } {
  if (!local) {
    const fieldHlcs = {
      ...(options?.incomingFieldHlcs || (incoming as any)._field_hlc || {}),
    };
    const incomingHlc = options?.incomingHlc || (incoming as any).hlc;
    return {
      merged: {
        ...incoming,
        _field_hlc: fieldHlcs,
        hlc: incomingHlc || (incoming as any).hlc,
        deleted_at: options?.incomingDeletedAt || incoming.deleted_at,
      },
      changed: true,
      conflictFieldCount: 0,
    };
  }

  const merged: any = { ...local };
  const localFieldHlc: Record<string, string> = {
    ...((local as any)._field_hlc || {}),
  };
  const incomingFieldHlc: Record<string, string> = {
    ...((incoming as any)._field_hlc || options?.incomingFieldHlcs || {}),
  };

  const defaultIncomingHlc =
    options?.incomingHlc || (incoming as any).hlc || defaultHlc.getStateString();
  const defaultLocalHlc = (local as any).hlc || INITIAL_HLC;

  let changed = false;
  let conflictFieldCount = 0;

  const incomingHasExplicitFieldHlcs =
    Boolean((incoming as any)._field_hlc) || Boolean(options?.incomingFieldHlcs);
  const localHasExplicitFieldHlcs = Boolean((local as any)._field_hlc);

  // Process all candidate keys
  const candidateKeys = new Set([
    ...Object.keys(incoming),
    ...Object.keys(incomingFieldHlc),
  ]);

  for (const key of candidateKeys) {
    if (key === '_field_hlc' || key === 'id') continue;

    // If incoming does not provide a value for this field in a partial delta, skip it
    if (incoming[key] === undefined && !incomingFieldHlc[key]) {
      continue;
    }

    // Determine incoming field HLC
    let inFieldHlc: string;
    if (incomingFieldHlc[key]) {
      inFieldHlc = incomingFieldHlc[key];
    } else if (incomingHasExplicitFieldHlcs) {
      // If incoming explicitly tracks fields and this key wasn't in it, this field wasn't touched in this revision
      inFieldHlc = INITIAL_HLC;
    } else {
      inFieldHlc = defaultIncomingHlc;
    }

    // Determine local field HLC
    let locFieldHlc: string;
    if (localFieldHlc[key]) {
      locFieldHlc = localFieldHlc[key];
    } else if (localHasExplicitFieldHlcs) {
      locFieldHlc = INITIAL_HLC;
    } else {
      locFieldHlc = defaultLocalHlc;
    }

    const comparison = compareHlc(inFieldHlc, locFieldHlc);

    if (comparison > 0) {
      // Incoming field is strictly newer: overwrite local field
      if (incoming[key] !== undefined) {
        merged[key] = incoming[key];
      }
      // Always persist the newer clock, even when the value is identical (A -> B -> A toggles): otherwise a
      // later, older-but-different write would win locally while the server rejects it.
      localFieldHlc[key] = inFieldHlc;
      changed = true;
      conflictFieldCount++;
    }
  }

  // Deletion and Tombstone Reconciliation (ADR-003)
  const incomingIsDeleted =
    options?.incomingAction === 'delete' ||
    Boolean(options?.incomingDeletedAt) ||
    Boolean(incoming.deleted_at);

  const localIsDeleted = Boolean(local.deleted_at);

  const inDeleteHlc =
    incomingFieldHlc['deleted_at'] || defaultIncomingHlc;
  const locDeleteHlc =
    localFieldHlc['deleted_at'] || localFieldHlc['updated_at'] || defaultLocalHlc;

  if (incomingIsDeleted && !localIsDeleted) {
    // Incoming is delete. Compare delete HLC vs local record HLC
    if (compareHlc(inDeleteHlc, locDeleteHlc) > 0) {
      merged.deleted_at =
        options?.incomingDeletedAt ||
        incoming.deleted_at ||
        new Date().toISOString();
      localFieldHlc['deleted_at'] = inDeleteHlc;
      changed = true;
    }
  } else if (!incomingIsDeleted && localIsDeleted) {
    // Local was deleted, but incoming is an edit or insert
    // If incoming edit HLC > local delete HLC -> Re-activate (intentional un-deletion)
    if (compareHlc(defaultIncomingHlc, locDeleteHlc) > 0) {
      merged.deleted_at = undefined;
      delete merged.deleted_at;
      delete localFieldHlc['deleted_at'];
      changed = true;
    }
  }

  // Determine newest overall HLC
  const newestHlc =
    compareHlc(defaultIncomingHlc, defaultLocalHlc) > 0
      ? defaultIncomingHlc
      : defaultLocalHlc;

  merged._field_hlc = localFieldHlc;
  merged.hlc = newestHlc;
  merged.updated_at = new Date().toISOString();

  return { merged, changed, conflictFieldCount };
}

/** Minimal surface of supabase-js the transport uses; lets tests inject a fake. */
export interface SupabaseLike {
  rpc(fn: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: { message: string } | null }>;
  from(table: string): any;
}

/**
 * Supabase transport.
 * - Wardrobe writes go through the `sync_wardrobe_upsert` RPC, which merges per-field LWW ON THE SERVER with the
 *   same semantics as reconcileEntity. A plain UPDATE would be last-ARRIVAL-wins and let a stale offline device
 *   overwrite newer fields.
 * - Pull pages on `server_seq` (one global sequence across both tables).
 * - Errors THROW. The previous implementation swallowed per-table failures and still advanced the cursor,
 *   permanently skipping that table's rows.
 */
export class SupabaseSyncTransport implements SyncTransport {
  constructor(private clientFactory: () => SupabaseLike = () => createClient() as unknown as SupabaseLike) {}

  isConfigured(): boolean {
    return isSupabaseConfigured();
  }

  async push(mutations: OutboxMutation[]): Promise<{
    succeededIds: string[];
    failed: { id: string; error: string }[];
  }> {
    if (!this.isConfigured() || mutations.length === 0) {
      return { succeededIds: [], failed: [] };
    }

    const supabase = this.clientFactory();
    const succeededIds: string[] = [];
    const failed: { id: string; error: string }[] = [];

    for (const m of mutations) {
      try {
        const table = normalizeTable(m.table);
        if (!table) throw new Error(`Unsupported sync table: ${m.table}`);

        if (table === 'wardrobe_items') {
          const isDelete = m.action === 'delete';
          const fields = isDelete
            ? { deleted_at: (m.payload.deleted_at as string) || new Date().toISOString() }
            : pickSyncFields(table, m.payload, { includeOwner: m.action === 'insert' });
          const { error } = await supabase.rpc('sync_wardrobe_upsert', {
            p_id: m.entityId,
            p_fields: fields,
            p_field_hlc: fieldHlcFor(m.payload, Object.keys(fields), m.hlc),
            p_hlc: m.hlc,
          });
          if (error) throw new Error(error.message);
        } else {
          // outfit_history: immutable log, except for tombstoning.
          if (m.action === 'delete') {
            const { error } = await supabase
              .from('outfit_history')
              .update({ deleted_at: new Date().toISOString(), hlc_timestamp: m.hlc })
              .eq('id', m.entityId);
            if (error) throw new Error(error.message);
          } else {
            const row = {
              id: m.entityId,
              ...pickSyncFields(table, m.payload, { includeOwner: true }),
              hlc_timestamp: m.hlc,
            };
            const { error } = await supabase
              .from('outfit_history')
              .upsert(row, { onConflict: 'id', ignoreDuplicates: true });
            if (error) throw new Error(error.message);
          }
        }
        succeededIds.push(m.id);
      } catch (err: any) {
        failed.push({ id: m.id, error: err?.message || 'Remote push failure' });
      }
    }

    return { succeededIds, failed };
  }

  async pull(cursor: string | null): Promise<{ deltas: RemoteDelta[]; nextCursor: string | null }> {
    if (!this.isConfigured()) {
      return { deltas: [], nextCursor: cursor };
    }

    const supabase = this.clientFactory();
    const since = cursor === null ? 0 : Math.max(0, Number(cursor) - SYNC_CONFIG.pullOverlap);
    const tables: SyncTable[] = ['wardrobe_items', 'outfit_history'];
    const deltas: RemoteDelta[] = [];
    let maxSeq = cursor === null ? 0 : Number(cursor);

    for (const table of tables) {
      let from = since;
      for (;;) {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .gt('server_seq', from)
          .order('server_seq', { ascending: true })
          .limit(SYNC_CONFIG.pageSize);
        if (error) throw new Error(`pull ${table}: ${error.message}`);
        const page: Record<string, any>[] = data ?? [];
        for (const row of page) {
          const delta = deltaFromRow(table, row);
          deltas.push(delta);
          if (delta.serverSeq !== undefined && delta.serverSeq > maxSeq) maxSeq = delta.serverSeq;
        }
        if (page.length < SYNC_CONFIG.pageSize) break;
        from = Number(page[page.length - 1].server_seq);
      }
    }

    return { deltas, nextCursor: maxSeq > 0 ? String(maxSeq) : cursor };
  }
}

/**
 * SyncWorker Orchestrator
 */
export class SyncWorker {
  private currentState: SyncState = 'synced';
  private lastSyncedAt: string | null = null;
  private lastSyncedCursor: string | null = null;
  private lastError: string | null = null;
  private isSyncing = false;
  private syncTimer: NodeJS.Timeout | null = null;
  private listeners: Set<(state: SyncState, stats: SyncStats) => void> = new Set();
  private storageKeyCursor: string;
  private storageKeyTime: string;

  constructor(
    private database: OurClosetDB = db,
    private outbox: OutboxQueue = outboxQueue,
    private transport: SyncTransport = new SupabaseSyncTransport(),
    options?: { storagePrefix?: string }
  ) {
    const prefix = options?.storagePrefix ? `_${options.storagePrefix}` : '';
    this.storageKeyCursor = `${SYNC_CONFIG.storageKeyCursor}${prefix}`;
    this.storageKeyTime = `${SYNC_CONFIG.storageKeyLastSyncTime}${prefix}`;
    this.loadPersistedCursor();
  }

  public setTransport(transport: SyncTransport) {
    this.transport = transport;
  }

  private loadPersistedCursor() {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        this.lastSyncedCursor = window.localStorage.getItem(this.storageKeyCursor);
        this.lastSyncedAt = window.localStorage.getItem(this.storageKeyTime);
      } catch {
        // Ignore storage access errors
      }
    }
  }

  private savePersistedCursor(cursor: string) {
    this.lastSyncedCursor = cursor;
    this.lastSyncedAt = new Date().toISOString();
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(this.storageKeyCursor, cursor);
        window.localStorage.setItem(this.storageKeyTime, this.lastSyncedAt);
      } catch {
        // Ignore storage access errors
      }
    }
  }

  public onSyncStateChange(listener: (state: SyncState, stats: SyncStats) => void): () => void {
    this.listeners.add(listener);
    // Immediately emit current state
    this.getStats().then(stats => listener(this.currentState, stats));
    return () => this.listeners.delete(listener);
  }

  private async notifyListeners() {
    const stats = await this.getStats();
    this.listeners.forEach(fn => {
      try {
        fn(this.currentState, stats);
      } catch {
        // Avoid listener exceptions interrupting sync
      }
    });
  }

  public getState(): SyncState {
    return this.currentState;
  }

  public async getStats(): Promise<SyncStats> {
    const outboxStats = await this.outbox.getStats();
    return {
      state: this.currentState,
      pendingCount: outboxStats.pending,
      inFlightCount: outboxStats.inFlight,
      failedCount: outboxStats.failed,
      deadLetterCount: outboxStats.deadLetter,
      lastSyncedAt: this.lastSyncedAt,
      lastSyncedCursor: this.lastSyncedCursor,
      lastError: this.lastError,
    };
  }

  /**
   * Triggers a two-way delta sync cycle (Push -> Pull -> Reconcile).
   */
  public async syncNow(): Promise<SyncResult> {
    if (this.isSyncing) {
      return { pushedCount: 0, pulledCount: 0, conflictsResolved: 0, errors: ['Sync already in progress'] };
    }

    this.isSyncing = true;
    const result: SyncResult = {
      pushedCount: 0,
      pulledCount: 0,
      conflictsResolved: 0,
      errors: [],
    };

    try {
      // 1. Check connectivity & remote transport configuration
      const isConfigured = this.transport.isConfigured();
      // `onLine` is undefined in some runtimes (Node 22, odd webviews); only an explicit `false` means offline.
      const isOnline = typeof navigator === 'undefined' || navigator.onLine !== false;

      if (!isConfigured || !isOnline) {
        const stats = await this.outbox.getStats();
        if (stats.pending > 0 || stats.deadLetter > 0) {
          this.currentState = stats.deadLetter > 0 ? 'error' : 'pending';
        } else {
          this.currentState = 'offline';
        }
        await this.notifyListeners();
        return result;
      }

      // 2. DRAIN OUTBOX (PUSH)
      const pendingMutations = await this.outbox.peekPending(50);
      if (pendingMutations.length > 0) {
        this.currentState = 'pending';
        await this.notifyListeners();

        const mutationIds = pendingMutations.map(m => m.id);
        await this.outbox.markInFlight(mutationIds);

        const pushResult = await this.transport.push(pendingMutations);

        if (pushResult.succeededIds.length > 0) {
          await this.outbox.markCompleted(pushResult.succeededIds);
          result.pushedCount = pushResult.succeededIds.length;
        }

        if (pushResult.failed.length > 0) {
          for (const fail of pushResult.failed) {
            await this.outbox.markFailed(fail.id, fail.error);
            result.errors.push(fail.error);
          }
          this.lastError = pushResult.failed[0].error;
        }
      }

      // 3. CURSOR-BASED DELTA PULL
      const pullResult = await this.transport.pull(this.lastSyncedCursor);

      let maxRemoteHlc: string | null = null;
      for (const delta of pullResult.deltas) {
        const applied = await this.reconcileRemoteDelta(delta);
        if (applied.changed) {
          result.pulledCount++;
          result.conflictsResolved += applied.conflictFieldCount;
        }
        if (!maxRemoteHlc || compareHlc(delta.hlc, maxRemoteHlc) > 0) maxRemoteHlc = delta.hlc;
      }

      // Advance the local logical clock past anything we have seen, so our next edit sorts after it.
      if (maxRemoteHlc) defaultHlc.receive(maxRemoteHlc);

      // Persist the cursor only AFTER every delta applied: a crash mid-pull re-delivers, which is safe
      // because reconciliation is idempotent.
      if (pullResult.nextCursor && pullResult.nextCursor !== this.lastSyncedCursor) {
        this.savePersistedCursor(pullResult.nextCursor);
      }

      // 4. Update overall status
      const postStats = await this.outbox.getStats();
      if (postStats.deadLetter > 0) {
        this.currentState = 'error';
      } else if (postStats.pending > 0) {
        this.currentState = 'pending';
      } else {
        this.currentState = 'synced';
        this.lastError = null;
      }
    } catch (err: any) {
      this.lastError = err?.message || 'Sync failed';
      result.errors.push(this.lastError!);
      this.currentState = 'error';
    } finally {
      this.isSyncing = false;
      await this.notifyListeners();
    }

    return result;
  }

  /**
   * Applies an incoming remote delta onto the local Dexie table with per-field LWW
   */
  public async reconcileRemoteDelta(delta: RemoteDelta): Promise<{ changed: boolean; conflictFieldCount: number }> {
    const kind = normalizeTable(delta.table);
    const table = kind === 'wardrobe_items' ? this.database.wardrobeItems
      : kind === 'outfit_history' ? this.database.outfitLogs
      : null;

    if (!table) {
      return { changed: false, conflictFieldCount: 0 };
    }

    return this.database.transaction('rw', table, async () => {
      const local = await (table as any).get(delta.entityId);

      // ADR-002: photos never sync, so a row that exists only remotely has no image. Guarantee the field exists
      // here (not in each transport) so UI code can rely on '' meaning "show the swatch".
      const incomingPayload =
        !local && kind === 'wardrobe_items'
          ? { ...delta.payload, image_url: (delta.payload.image_url as string | undefined) ?? '' }
          : delta.payload;

      const { merged, changed, conflictFieldCount } = reconcileEntity(
        local,
        incomingPayload,
        {
          incomingAction: delta.action,
          incomingHlc: delta.hlc,
          incomingFieldHlcs: delta.fieldHlcs,
          incomingDeletedAt: delta.deletedAt,
        }
      );

      if (changed) {
        await (table as any).put(merged);
      }

      return { changed, conflictFieldCount };
    });
  }

  /**
   * Starts periodic sync timer in background
   */
  public startPeriodicSync(intervalMs = SYNC_CONFIG.defaultSyncIntervalMs): void {
    if (this.syncTimer) clearInterval(this.syncTimer);

    // Initial sync
    this.syncNow();

    this.syncTimer = setInterval(() => {
      this.syncNow();
    }, intervalMs);
  }

  /**
   * Stops periodic sync timer
   */
  public stopPeriodicSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  /**
   * Retries all dead letter items and triggers an immediate sync
   */
  public async retryFailed(): Promise<void> {
    await this.outbox.retryAllDeadLetters();
    this.currentState = 'pending';
    await this.notifyListeners();
    await this.syncNow();
  }
}

export const syncWorker = new SyncWorker();
