/**
 * Offline Outbox Queue
 * Per ADR-003 and Phase 5 Specifications
 *
 * Persists local offline mutations into Dexie's syncQueue table.
 * Features:
 * - Coalesces repeated updates to the same entity into a single merged patch.
 * - Merges insert followed by updates into a single insert with full state.
 * - Cancels insert followed by delete completely (remote never saw it).
 * - Transitions repeated failures into dead-letter state after 5 retries.
 */

import { db, OurClosetDB } from '../db';
import { defaultHlc } from './hlc';
import { mergeOutboxPayload } from './syncMapper';

export type MutationAction = 'insert' | 'update' | 'delete';
export type MutationStatus = 'pending' | 'in_flight' | 'failed' | 'dead_letter';

export interface OutboxMutation {
  id: string;
  table: string;
  entityId: string;
  action: MutationAction;
  payload: Record<string, unknown>;
  hlc: string;
  idempotencyKey: string;
  retryCount: number;
  status: MutationStatus;
  lastAttemptAt?: string | null;
  error?: string | null;
  createdAt: string;

  // Compatibility aliases with v1 schema
  table_name?: string;
  record_id?: string;
}

export interface EnqueueMutationInput {
  table: string;
  entityId: string;
  action: MutationAction;
  payload: Record<string, unknown>;
  hlc?: string;
  idempotencyKey?: string;
}

export const MAX_RETRY_COUNT = 5;

export class OutboxQueue {
  constructor(private database: OurClosetDB = db) {}

  /**
   * Enqueues a new mutation with mutation coalescing.
   * Returns the created or updated OutboxMutation, or null if cancelled (insert + delete).
   */
  async enqueue(input: EnqueueMutationInput): Promise<OutboxMutation | null> {
    const hlc = input.hlc || defaultHlc.nowString();
    const action = input.action;
    const table = input.table;
    const entityId = input.entityId;
    const newPayload = input.payload || {};

    return this.database.transaction('rw', this.database.syncQueue, async () => {
      // Find existing pending or failed mutations for this entity
      // Note: We do NOT coalesce with 'in_flight' mutations to avoid racing with active HTTP payloads.
      const existing = await this.database.syncQueue
        .filter(
          item =>
            (item.table === table || item.table_name === table) &&
            (item.entityId === entityId || item.record_id === entityId) &&
            (item.status === 'pending' || item.status === 'failed')
        )
        .first();

      if (!existing) {
        // No existing pending mutation: Create a new outbox entry
        const record: OutboxMutation = {
          id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `outbox_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
          table,
          entityId,
          action,
          payload: newPayload,
          hlc,
          idempotencyKey: input.idempotencyKey || `${table}:${entityId}:${hlc}`,
          retryCount: 0,
          status: 'pending',
          lastAttemptAt: null,
          error: null,
          createdAt: new Date().toISOString(),
          table_name: table,
          record_id: entityId,
        };

        await this.database.syncQueue.put(record);
        return record;
      }

      // Existing mutation found -> Apply Coalescing Rules:

      // Case 1: Insert followed by Delete -> Remote server never knew about this record.
      // Cancel the mutation completely!
      if (existing.action === 'insert' && action === 'delete') {
        await this.database.syncQueue.delete(existing.id);
        return null;
      }

      // Case 2: Insert followed by Update -> Coalesce into single Insert with merged payload.
      if (existing.action === 'insert' && action === 'update') {
        const coalesced: OutboxMutation = {
          ...existing,
          payload: mergeOutboxPayload(existing.payload, newPayload),
          hlc,
          idempotencyKey: input.idempotencyKey || `${table}:${entityId}:${hlc}`,
          status: 'pending',
          retryCount: 0,
          error: null,
        };
        await this.database.syncQueue.put(coalesced);
        return coalesced;
      }

      // Case 3: Update followed by Update -> Coalesce into single Update with merged payload.
      if (existing.action === 'update' && action === 'update') {
        const coalesced: OutboxMutation = {
          ...existing,
          payload: mergeOutboxPayload(existing.payload, newPayload),
          hlc,
          idempotencyKey: input.idempotencyKey || `${table}:${entityId}:${hlc}`,
          status: 'pending',
          retryCount: 0,
          error: null,
        };
        await this.database.syncQueue.put(coalesced);
        return coalesced;
      }

      // Case 4: Update followed by Delete -> Becomes a single Delete operation.
      if (existing.action === 'update' && action === 'delete') {
        const coalesced: OutboxMutation = {
          ...existing,
          action: 'delete',
          payload: {
            ...newPayload,
            deleted_at: new Date().toISOString(),
          },
          hlc,
          idempotencyKey: input.idempotencyKey || `${table}:${entityId}:${hlc}`,
          status: 'pending',
          retryCount: 0,
          error: null,
        };
        await this.database.syncQueue.put(coalesced);
        return coalesced;
      }

      // Case 5: Delete followed by Insert/Update -> Intentional resurrection / reactivation
      if (existing.action === 'delete' && (action === 'insert' || action === 'update')) {
        const coalesced: OutboxMutation = {
          ...existing,
          action: 'update',
          payload: newPayload,
          hlc,
          idempotencyKey: input.idempotencyKey || `${table}:${entityId}:${hlc}`,
          status: 'pending',
          retryCount: 0,
          error: null,
        };
        await this.database.syncQueue.put(coalesced);
        return coalesced;
      }

      // Fallback: Overwrite with latest action & payload
      const coalesced: OutboxMutation = {
        ...existing,
        action,
        payload: mergeOutboxPayload(existing.payload, newPayload),
        hlc,
        idempotencyKey: input.idempotencyKey || `${table}:${entityId}:${hlc}`,
        status: 'pending',
        retryCount: 0,
        error: null,
      };
      await this.database.syncQueue.put(coalesced);
      return coalesced;
    });
  }

  /**
   * Retrieves pending mutations ready for push, ordered by HLC timestamp.
   */
  async peekPending(limit = 50): Promise<OutboxMutation[]> {
    const items = await this.database.syncQueue
      .filter(item => item.status === 'pending')
      .limit(limit)
      .toArray();

    return items.sort((a, b) => (a.hlc < b.hlc ? -1 : a.hlc > b.hlc ? 1 : 0));
  }

  /**
   * Marks mutations as in_flight during an active push batch.
   */
  async markInFlight(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await this.database.transaction('rw', this.database.syncQueue, async () => {
      for (const id of ids) {
        await this.database.syncQueue.update(id, {
          status: 'in_flight',
          lastAttemptAt: new Date().toISOString(),
        } as unknown as Partial<OutboxMutation>);
      }
    });
  }

  /**
   * Marks successfully pushed mutations as completed by removing them from the outbox.
   */
  async markCompleted(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await this.database.syncQueue.bulkDelete(ids);
  }

  /**
   * Records a failed push attempt for a mutation.
   * Increments retry count; marks as 'dead_letter' once MAX_RETRY_COUNT (5) is reached.
   */
  async markFailed(id: string, error: string): Promise<OutboxMutation | undefined> {
    return this.database.transaction('rw', this.database.syncQueue, async () => {
      const item = await this.database.syncQueue.get(id);
      if (!item) return undefined;

      const newRetryCount = (item.retryCount || 0) + 1;
      const isDeadLetter = newRetryCount >= MAX_RETRY_COUNT;

      const updates: Partial<OutboxMutation> = {
        retryCount: newRetryCount,
        status: isDeadLetter ? 'dead_letter' : 'failed',
        error,
        lastAttemptAt: new Date().toISOString(),
      };

      await this.database.syncQueue.update(id, updates as unknown as Partial<OutboxMutation>);
      return { ...item, ...updates } as OutboxMutation;
    });
  }

  /**
   * Resets a dead letter item back to 'pending' state for immediate retry.
   */
  async retryDeadLetter(id: string): Promise<void> {
    await this.database.syncQueue.update(id, {
      status: 'pending',
      retryCount: 0,
      error: null,
    } as unknown as Partial<OutboxMutation>);
  }

  /**
   * Resets all dead letter items back to 'pending'.
   */
  async retryAllDeadLetters(): Promise<number> {
    const deadLetters = await this.getDeadLetters();
    for (const item of deadLetters) {
      await this.retryDeadLetter(item.id);
    }
    return deadLetters.length;
  }

  /**
   * Retrieves all mutations currently in dead_letter status.
   */
  async getDeadLetters(): Promise<OutboxMutation[]> {
    return this.database.syncQueue
      .filter(item => item.status === 'dead_letter')
      .toArray();
  }

  /**
   * Returns current count breakdown of outbox mutations.
   */
  async getStats(): Promise<{
    pending: number;
    inFlight: number;
    failed: number;
    deadLetter: number;
    total: number;
  }> {
    const all = await this.database.syncQueue.toArray();
    let pending = 0;
    let inFlight = 0;
    let failed = 0;
    let deadLetter = 0;

    for (const item of all) {
      if (item.status === 'pending') pending++;
      else if (item.status === 'in_flight') inFlight++;
      else if (item.status === 'failed') failed++;
      else if (item.status === 'dead_letter') deadLetter++;
    }

    return {
      pending,
      inFlight,
      failed,
      deadLetter,
      total: all.length,
    };
  }

  /**
   * Clears all items in the outbox queue (used for testing and hard resets).
   */
  async clear(): Promise<void> {
    await this.database.syncQueue.clear();
  }
}

export const outboxQueue = new OutboxQueue();
