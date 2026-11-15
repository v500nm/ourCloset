/**
 * Sync lifecycle: turns the pieces (recorder, outbox, worker) on for a real signed-in user and off again.
 *
 * Order matters:
 *   1. re-key guest rows to the user           (migrateGuestDataToUser)
 *   2. make every id a UUID                    (server ids are uuid; sample ids like "SU-NVY-01" would be rejected,
 *                                               and two partners loading the same sample closet would collide)
 *   3. enable the recorder
 *   4. backfill rows that predate sync into the outbox
 *   5. start the worker + online/visibility triggers
 */
import { db as defaultDb, OurClosetDB } from '../db';
import { OutboxQueue } from './outbox';
import { syncRecorder } from './syncRecorder';
import { isUuid, generateUuid } from './syncMapper';
import { syncWorker } from './syncWorker';
import { migrateGuestDataToUser } from '@/services/accountService';

const newId = generateUuid;

/**
 * Re-keys non-UUID ids of the user's own rows, and rewrites outfit `item_ids` that point at them.
 * Idempotent: a second run finds nothing to do.
 */
export async function ensureUuidIds(
  userId: string,
  database: OurClosetDB = defaultDb
): Promise<{ items: number; logs: number }> {
  let items = 0;
  let logs = 0;

  await database.transaction('rw', database.wardrobeItems, database.outfitLogs, async () => {
    const idMap = new Map<string, string>();

    const own = await database.wardrobeItems.filter(i => i.user_id === userId && !isUuid(i.id)).toArray();
    for (const item of own) {
      const id = newId();
      idMap.set(item.id, id);
      await database.wardrobeItems.delete(item.id);
      await database.wardrobeItems.put({ ...item, id });
      items++;
    }

    const allLogs = await database.outfitLogs.filter(l => l.worn_by === userId).toArray();
    for (const log of allLogs) {
      const remapped = (log.item_ids ?? []).map(x => idMap.get(x) ?? x);
      const idChanged = !isUuid(log.id);
      const itemsChanged = remapped.some((x, i) => x !== log.item_ids[i]);
      if (!idChanged && !itemsChanged) continue;
      const id = idChanged ? newId() : log.id;
      if (idChanged) await database.outfitLogs.delete(log.id);
      await database.outfitLogs.put({ ...log, id, item_ids: remapped });
      logs++;
    }
  });

  return { items, logs };
}

/** Queue every own row that has never been recorded (no `hlc`) as an insert. Idempotent. */
export async function backfillOutbox(
  userId: string,
  database: OurClosetDB = defaultDb
): Promise<{ items: number; logs: number }> {
  const outbox = new OutboxQueue(database);
  let items = 0;
  let logs = 0;

  await database.transaction('rw', database.wardrobeItems, database.outfitLogs, database.syncQueue, async () => {
    const pendingItems = await database.wardrobeItems
      .filter(i => i.user_id === userId && !(i as unknown as { hlc?: string }).hlc)
      .toArray();
    for (const item of pendingItems) {
      const rec = syncRecorder.recordInsert('wardrobe_items', item.id, item as unknown as Record<string, unknown>);
      await database.wardrobeItems.put({ ...item, ...rec.localPatch } as typeof item);
      await outbox.enqueue(rec.mutation);
      items++;
    }

    const pendingLogs = await database.outfitLogs
      .filter(l => l.worn_by === userId && !(l as unknown as { hlc?: string }).hlc)
      .toArray();
    for (const log of pendingLogs) {
      const rec = syncRecorder.recordInsert('outfit_history', log.id, log as unknown as Record<string, unknown>);
      await database.outfitLogs.put({ ...log, ...rec.localPatch } as typeof log);
      await outbox.enqueue(rec.mutation);
      logs++;
    }
  });

  return { items, logs };
}

let detach: (() => void) | null = null;

export async function startSyncForUser(userId: string): Promise<void> {
  if (syncRecorder.activeUserId === userId && detach) return; // already running for this user
  stopSync();

  await migrateGuestDataToUser(userId);
  await ensureUuidIds(userId);
  syncRecorder.enable(userId);
  await backfillOutbox(userId);

  syncWorker.startPeriodicSync();

  if (typeof window !== 'undefined') {
    const kick = () => void syncWorker.syncNow();
    const onVisible = () => {
      if (document.visibilityState === 'visible') kick();
    };
    window.addEventListener('online', kick);
    document.addEventListener('visibilitychange', onVisible);
    detach = () => {
      window.removeEventListener('online', kick);
      document.removeEventListener('visibilitychange', onVisible);
    };
  } else {
    detach = () => {};
  }
}

export function stopSync(): void {
  syncWorker.stopPeriodicSync();
  syncRecorder.disable();
  detach?.();
  detach = null;
}
