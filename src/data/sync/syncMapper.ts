/**
 * Sync mapping layer: the single place that decides WHICH fields leave the device and how rows are translated.
 *
 * ADR-002 is enforced here by construction: only whitelisted metadata columns can ever be pushed. There is no
 * image_url / photo_url / embedding in any list below, so no code path can add one by accident.
 */
import type { RemoteDelta } from './syncWorker';

export type SyncTable = 'wardrobe_items' | 'outfit_history';

/** Columns pushed to `wardrobe_items`. `user_id` is insert-only (ownership is immutable server-side). */
export const WARDROBE_SYNC_FIELDS = [
  'title', 'category', 'cultural_style', 'primary_color_hex', 'secondary_color_hex',
  'hardware_metal_color', 'leather_tone', 'formality_level', 'fabric_type', 'season_tags',
  'laundry_status', 'privacy_tier', 'wear_count', 'last_worn_at', 'deleted_at',
] as const;

export const OUTFIT_SYNC_FIELDS = ['event_context', 'item_ids', 'worn_at', 'rating', 'deleted_at'] as const;

const FIELDS: Record<SyncTable, readonly string[]> = {
  wardrobe_items: WARDROBE_SYNC_FIELDS,
  outfit_history: OUTFIT_SYNC_FIELDS,
};

/** Owner column per table, sent on insert only. */
const OWNER_COLUMN: Record<SyncTable, string> = { wardrobe_items: 'user_id', outfit_history: 'worn_by' };

/** Accepts both server names and local Dexie table names. */
export function normalizeTable(name: string): SyncTable | null {
  switch (name) {
    case 'wardrobe_items':
    case 'wardrobeItems':
      return 'wardrobe_items';
    case 'outfit_history':
    case 'outfit_logs':
    case 'outfitLogs':
      return 'outfit_history';
    default:
      return null;
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === 'string' && UUID_RE.test(v);

/** RFC 4122 v4. Server ids are `uuid`, so every id minted on a device must be one. */
export function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** Whitelisted, defined fields only. Pass `includeOwner` for inserts. */
export function pickSyncFields(
  table: SyncTable,
  source: Record<string, unknown>,
  opts: { includeOwner?: boolean } = {}
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of FIELDS[table]) {
    if (source[key] !== undefined) out[key] = source[key];
  }
  if (opts.includeOwner) {
    const ownerKey = OWNER_COLUMN[table];
    if (source[ownerKey] !== undefined) out[ownerKey] = source[ownerKey];
  }
  return out;
}

/** True when `changes` touches at least one synced column (ignores updated_at, image_url, _field_hlc, ...). */
export function touchesSyncedField(table: SyncTable, changes: Record<string, unknown>): boolean {
  return FIELDS[table].some(k => changes[k] !== undefined);
}

/** Merge outbox payloads, keeping per-field HLCs of BOTH sides (a plain spread would overwrite them). */
export function mergeOutboxPayload(
  older: Record<string, unknown>,
  newer: Record<string, unknown>
): Record<string, unknown> {
  const olderHlc = (older._field_hlc as Record<string, string> | undefined) ?? {};
  const newerHlc = (newer._field_hlc as Record<string, string> | undefined) ?? {};
  const merged: Record<string, unknown> = { ...older, ...newer };
  if (Object.keys(olderHlc).length || Object.keys(newerHlc).length) {
    merged._field_hlc = { ...olderHlc, ...newerHlc };
  }
  return merged;
}

/** Per-field HLC for a mutation: the stamp recorded at edit time, else the mutation's own HLC. */
export function fieldHlcFor(payload: Record<string, unknown>, fields: string[], fallbackHlc: string): Record<string, string> {
  const stamped = (payload._field_hlc as Record<string, string> | undefined) ?? {};
  const out: Record<string, string> = {};
  for (const f of fields) out[f] = stamped[f] ?? fallbackHlc;
  return out;
}

type Row = Record<string, any>;

/** Server row -> delta for the local reconciler. Columns the server derives (household_id, seq) are dropped. */
export function deltaFromRow(table: SyncTable, row: Row): RemoteDelta {
  const { hlc_timestamp, field_hlc, server_seq, household_id, ...rest } = row;
  const fieldHlcs: Record<string, string> | undefined =
    field_hlc && Object.keys(field_hlc).length ? field_hlc : undefined;
  const payload: Record<string, unknown> = { ...rest };
  if (table === 'wardrobe_items') {
    // ADR-002: photos never sync. A remote-only item has no local image; UI shows a swatch for ''.
    payload.image_url = '';
    payload.season_tags = payload.season_tags ?? [];
  }
  if (fieldHlcs) payload._field_hlc = fieldHlcs;
  return {
    table,
    entityId: row.id,
    action: row.deleted_at ? 'delete' : 'update',
    payload,
    hlc: hlc_timestamp ?? '000000000000000:00000:server',
    fieldHlcs,
    deletedAt: row.deleted_at ?? null,
    updatedAt: row.updated_at,
    serverSeq: server_seq != null ? Number(server_seq) : undefined,
  };
}
