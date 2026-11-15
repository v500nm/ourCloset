import { db, OurClosetDB } from '../db';
import { OutfitHistory } from '@/types';
import { OutboxQueue } from '../sync/outbox';
import { syncRecorder } from '../sync/syncRecorder';
import { generateUuid } from '../sync/syncMapper';

export class OutfitRepository {
  private outbox: OutboxQueue;

  constructor(private database: OurClosetDB = db) {
    this.outbox = new OutboxQueue(database);
  }

  async logOutfit(outfit: Omit<OutfitHistory, 'id' | 'created_at'> & { id?: string; created_at?: string }): Promise<string> {
    const now = new Date().toISOString();
    // UUID, not a timestamp string: the server column is `uuid`, and ids must be unique across partners.
    const id = outfit.id || generateUuid();
    const record: OutfitHistory = {
      ...outfit,
      id,
      created_at: outfit.created_at || now,
    };
    if (!syncRecorder.shouldRecord(record.worn_by)) {
      return this.database.outfitLogs.put(record);
    }
    return this.database.transaction('rw', this.database.outfitLogs, this.database.syncQueue, async () => {
      const rec = syncRecorder.recordInsert('outfit_history', id, record as unknown as Record<string, unknown>);
      const key = await this.database.outfitLogs.put({ ...record, ...rec.localPatch } as OutfitHistory);
      await this.outbox.enqueue(rec.mutation);
      return key;
    });
  }

  async getRecentOutfits(wornBy: string, limit = 10): Promise<OutfitHistory[]> {
    return this.database.outfitLogs
      .where('worn_by')
      .equals(wornBy)
      .reverse()
      .sortBy('worn_at')
      .then(items => items.slice(0, limit));
  }

  async getOutfitsByDateRange(startDate: string, endDate: string, wornBy?: string): Promise<OutfitHistory[]> {
    let collection = this.database.outfitLogs
      .where('worn_at')
      .between(startDate, endDate, true, true);

    if (wornBy) {
      collection = collection.filter(item => item.worn_by === wornBy);
    }
    return collection.toArray();
  }

  async getOutfitsInLastDays(days: number, wornBy?: string): Promise<OutfitHistory[]> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const endDate = new Date().toISOString();
    return this.getOutfitsByDateRange(startDate, endDate, wornBy);
  }

  async getAll(): Promise<OutfitHistory[]> {
    return this.database.outfitLogs.reverse().sortBy('worn_at');
  }

  async getById(id: string): Promise<OutfitHistory | undefined> {
    return this.database.outfitLogs.get(id);
  }

  async count(): Promise<number> {
    return this.database.outfitLogs.count();
  }

  async clear(): Promise<void> {
    await this.database.outfitLogs.clear();
  }
}

export const outfitRepository = new OutfitRepository();

