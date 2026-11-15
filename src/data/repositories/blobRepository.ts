import { db, OurClosetDB, StoredBlob } from '../db';

export class BlobRepository {
  constructor(private database: OurClosetDB = db) {}

  async saveBlob(id: string, dataUrl: string, mimeType = 'image/jpeg'): Promise<string> {
    const size = Math.round((dataUrl.length * 3) / 4); // approximate byte size of base64
    const blobRecord: StoredBlob = {
      id,
      dataUrl,
      mimeType,
      size,
      createdAt: new Date().toISOString(),
    };
    return this.database.blobs.put(blobRecord);
  }

  async getBlob(id: string): Promise<StoredBlob | undefined> {
    return this.database.blobs.get(id);
  }

  async deleteBlob(id: string): Promise<void> {
    await this.database.blobs.delete(id);
  }

  async getAll(): Promise<StoredBlob[]> {
    return this.database.blobs.toArray();
  }

  async count(): Promise<number> {
    return this.database.blobs.count();
  }

  async clear(): Promise<void> {
    await this.database.blobs.clear();
  }
}

export const blobRepository = new BlobRepository();

