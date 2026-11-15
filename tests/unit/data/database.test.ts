import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { OurClosetDB } from '@/data/db';

describe('OurClosetDB Schema & Versioning', () => {
  let testDb: OurClosetDB;

  beforeEach(() => {
    testDb = new OurClosetDB(`test-db-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`);
  });

  afterEach(async () => {
    if (testDb) {
      await testDb.delete();
    }
  });

  it('declares and mounts all required tables in schema version 1 and 2', () => {
    expect(testDb.verno).toBe(2);
    expect(testDb.tables.map(t => t.name)).toEqual(
      expect.arrayContaining([
        'wardrobeItems',
        'outfitLogs',
        'members',
        'household',
        'blobs',
        'syncQueue',
      ])
    );
  });

  it('includes multi-attribute compound indexes for wardrobeItems', () => {
    const table = testDb.wardrobeItems;
    const indexNames = table.schema.indexes.map(idx => idx.name);

    expect(indexNames).toContain('[user_id+laundry_status]');
    expect(indexNames).toContain('[cultural_style+category]');
    expect(indexNames).toContain('laundry_status');
    expect(indexNames).toContain('category');
    expect(indexNames).toContain('cultural_style');
  });

  it('includes compound indexes for outfitLogs', () => {
    const table = testDb.outfitLogs;
    const indexNames = table.schema.indexes.map(idx => idx.name);

    expect(indexNames).toContain('[worn_by+worn_at]');
    expect(indexNames).toContain('worn_by');
    expect(indexNames).toContain('worn_at');
  });
});

