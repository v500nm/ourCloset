/**
 * SyncRecorder: decides whether a local write must be mirrored to the outbox, and stamps per-field HLCs.
 *
 * Disabled by default, so guest mode and the unit suites behave exactly as before. It is enabled only for a real
 * signed-in user (see syncBootstrap). Repositories call it INSIDE their Dexie transaction so a row and its outbox
 * entry commit atomically: a crash can never leave a write that was stored locally but never queued.
 */
import { defaultHlc } from './hlc';
import { normalizeTable, pickSyncFields, touchesSyncedField, type SyncTable } from './syncMapper';
import type { EnqueueMutationInput } from './outbox';

type Rec = Record<string, unknown>;

const sameValue = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

export interface RecordedChange {
  /** Fields to merge into the local row (per-field clocks + row clock). */
  localPatch: Rec;
  /** What to enqueue. */
  mutation: EnqueueMutationInput;
}

export class SyncRecorder {
  private userId: string | null = null;

  enable(userId: string): void {
    this.userId = userId;
  }

  disable(): void {
    this.userId = null;
  }

  get activeUserId(): string | null {
    return this.userId;
  }

  /** Only the signed-in user's own rows are ever recorded; pulled partner rows must not echo back. */
  shouldRecord(ownerId: unknown): boolean {
    return this.userId !== null && ownerId === this.userId;
  }

  /** A brand-new row: every synced field gets the same fresh clock. */
  recordInsert(table: SyncTable, entityId: string, row: Rec, hlc = defaultHlc.nowString()): RecordedChange {
    const fields = pickSyncFields(table, row, { includeOwner: true });
    const fieldHlc: Record<string, string> = {};
    for (const k of Object.keys(fields)) fieldHlc[k] = hlc;
    return {
      localPatch: { hlc, _field_hlc: fieldHlc },
      mutation: { table, entityId, action: 'insert', payload: { ...fields, _field_hlc: fieldHlc }, hlc },
    };
  }

  /**
   * An edit. Returns null when nothing synced actually changed (no HLC churn, no outbox noise for e.g.
   * `updated_at`-only writes or a re-assignment of an identical value).
   */
  recordUpdate(
    table: SyncTable,
    entityId: string,
    existing: Rec,
    changes: Rec,
    hlc = defaultHlc.nowString()
  ): RecordedChange | null {
    if (!touchesSyncedField(table, changes)) return null;

    const candidate = pickSyncFields(table, changes);
    const changed: Rec = {};
    for (const [k, v] of Object.entries(candidate)) {
      if (!sameValue(existing[k], v)) changed[k] = v;
    }
    if (Object.keys(changed).length === 0) return null;

    const stamp: Record<string, string> = {};
    for (const k of Object.keys(changed)) stamp[k] = hlc;

    const isDelete = typeof changed.deleted_at === 'string' && changed.deleted_at.length > 0;
    return {
      localPatch: {
        hlc,
        _field_hlc: { ...((existing._field_hlc as Record<string, string> | undefined) ?? {}), ...stamp },
      },
      mutation: {
        table,
        entityId,
        action: isDelete ? 'delete' : 'update',
        payload: { ...changed, _field_hlc: stamp },
        hlc,
      },
    };
  }
}

export const syncRecorder = new SyncRecorder();

export { normalizeTable };
