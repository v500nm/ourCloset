import { db, OurClosetDB } from '../db';
import { WardrobeItem, LaundryStatus, ItemCategory, CulturalStyle } from '@/types';
import { OutboxQueue } from '../sync/outbox';
import { syncRecorder } from '../sync/syncRecorder';

export class WardrobeRepository {
  private outbox: OutboxQueue;

  constructor(private database: OurClosetDB = db) {
    this.outbox = new OutboxQueue(database);
  }

  /**
   * The single write path for edits. When sync is active for the row's owner, the row, its per-field clocks and
   * its outbox entry commit in ONE transaction (no stored-but-never-queued writes after a crash).
   */
  private applyChanges(id: string, changes: Record<string, unknown>): Promise<number> {
    return this.database.transaction('rw', this.database.wardrobeItems, this.database.syncQueue, async () => {
      const existing = await this.database.wardrobeItems.get(id);
      if (!existing) return 0;
      const patch: Record<string, unknown> = { ...changes, updated_at: new Date().toISOString() };
      if (syncRecorder.shouldRecord(existing.user_id)) {
        const rec = syncRecorder.recordUpdate('wardrobe_items', id, existing as unknown as Record<string, unknown>, changes);
        if (rec) {
          Object.assign(patch, rec.localPatch);
          await this.outbox.enqueue(rec.mutation);
        }
      }
      return this.database.wardrobeItems.update(id, patch as unknown as Partial<WardrobeItem>);
    });
  }

  private async insertOne(prepared: WardrobeItem): Promise<string> {
    if (!syncRecorder.shouldRecord(prepared.user_id)) {
      return this.database.wardrobeItems.put(prepared);
    }
    const rec = syncRecorder.recordInsert('wardrobe_items', prepared.id, prepared as unknown as Record<string, unknown>);
    const id = await this.database.wardrobeItems.put({ ...prepared, ...rec.localPatch } as WardrobeItem);
    await this.outbox.enqueue(rec.mutation);
    return id;
  }

  async getAll(userId?: string): Promise<WardrobeItem[]> {
    let collection = this.database.wardrobeItems.filter(item => !item.deleted_at);
    if (userId) {
      collection = collection.filter(item => item.user_id === userId);
    }
    return collection.toArray();
  }

  async getById(id: string): Promise<WardrobeItem | undefined> {
    const item = await this.database.wardrobeItems.get(id);
    if (item && !item.deleted_at) {
      return item;
    }
    return undefined;
  }

  async create(item: WardrobeItem): Promise<string> {
    const now = new Date().toISOString();
    const preparedItem: WardrobeItem = {
      ...item,
      created_at: item.created_at || now,
      updated_at: (item as unknown as { updated_at?: string }).updated_at || now,
    };
    return this.database.transaction('rw', this.database.wardrobeItems, this.database.syncQueue, () =>
      this.insertOne(preparedItem)
    );
  }

  async bulkCreate(items: WardrobeItem[]): Promise<void> {
    const now = new Date().toISOString();
    const preparedItems = items.map(item => ({
      ...item,
      created_at: item.created_at || now,
      updated_at: (item as unknown as { updated_at?: string }).updated_at || now,
    }));
    await this.database.transaction('rw', this.database.wardrobeItems, this.database.syncQueue, async () => {
      for (const item of preparedItems) await this.insertOne(item);
    });
  }

  async update(id: string, updates: Partial<WardrobeItem>): Promise<number> {
    return this.applyChanges(id, updates as Record<string, unknown>);
  }

  async delete(id: string, softDelete = true): Promise<void> {
    // While sync is active a hard delete would never propagate (and would let the row resurrect from the
    // server), so it is always a tombstone for the signed-in user's rows.
    const existing = syncRecorder.activeUserId ? await this.database.wardrobeItems.get(id) : undefined;
    if (softDelete || (existing && syncRecorder.shouldRecord(existing.user_id))) {
      await this.applyChanges(id, { deleted_at: new Date().toISOString() });
    } else {
      await this.database.wardrobeItems.delete(id);
    }
  }

  async markDirty(ids: string[]): Promise<void> {
    const now = new Date().toISOString();
    await this.database.transaction('rw', this.database.wardrobeItems, this.database.syncQueue, async () => {
      for (const id of ids) {
        await this.applyChanges(id, { laundry_status: 'DIRTY', last_worn_at: now });
      }
    });
  }

  async updateLaundryStatus(id: string, status: LaundryStatus): Promise<void> {
    await this.applyChanges(id, { laundry_status: status });
  }

  async getByLaundryStatus(status: LaundryStatus, userId?: string): Promise<WardrobeItem[]> {
    if (userId) {
      return this.database.wardrobeItems
        .where('[user_id+laundry_status]')
        .equals([userId, status])
        .filter(item => !item.deleted_at)
        .toArray();
    }
    return this.database.wardrobeItems
      .where('laundry_status')
      .equals(status)
      .filter(item => !item.deleted_at)
      .toArray();
  }

  async getByCategoryAndStyle(
    category: ItemCategory,
    style: CulturalStyle,
    userId?: string
  ): Promise<WardrobeItem[]> {
    let collection = this.database.wardrobeItems
      .where('[cultural_style+category]')
      .equals([style, category])
      .filter(item => !item.deleted_at);

    if (userId) {
      collection = collection.filter(item => item.user_id === userId);
    }
    return collection.toArray();
  }

  async count(userId?: string): Promise<number> {
    if (userId) {
      return this.database.wardrobeItems
        .where('user_id')
        .equals(userId)
        .filter(item => !item.deleted_at)
        .count();
    }
    return this.database.wardrobeItems.filter(item => !item.deleted_at).count();
  }

  async clear(): Promise<void> {
    await this.database.wardrobeItems.clear();
  }
}

export const wardrobeRepository = new WardrobeRepository();

