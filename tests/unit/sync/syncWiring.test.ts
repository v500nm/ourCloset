import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { OurClosetDB } from '@/data/db';
import { WardrobeRepository } from '@/data/repositories/wardrobeRepository';
import { OutfitRepository } from '@/data/repositories/outfitRepository';
import { OutboxQueue, OutboxMutation } from '@/data/sync/outbox';
import { syncRecorder } from '@/data/sync/syncRecorder';
import { ensureUuidIds, backfillOutbox } from '@/data/sync/syncBootstrap';
import { isUuid } from '@/data/sync/syncMapper';
import {
  SyncWorker,
  SyncTransport,
  RemoteDelta,
  SupabaseSyncTransport,
  SupabaseLike,
} from '@/data/sync/syncWorker';
import { WardrobeItem } from '@/types';

const ME = 'aaaaaaaa-0000-4000-8000-00000000000a';
const PARTNER = 'bbbbbbbb-0000-4000-8000-00000000000b';

const item = (over: Partial<WardrobeItem> = {}): WardrobeItem => ({
  id: 'cccccccc-0000-4000-8000-000000000001',
  user_id: ME,
  title: 'Navy Suit',
  category: 'suit',
  cultural_style: 'western',
  formality_level: 4,
  image_url: 'data:image/webp;base64,AAAA',
  color_embedding: [0.1, 0.2],
  silhouette_embedding: [0.3],
  season_tags: ['winter'],
  wear_count: 0,
  laundry_status: 'CLEAN',
  privacy_tier: 'PUBLIC',
  created_at: '2026-01-01T00:00:00.000Z',
  ...over,
});

let db: OurClosetDB;
let repo: WardrobeRepository;
let outbox: OutboxQueue;

beforeEach(async () => {
  db = new OurClosetDB(`wiring_${Math.random()}`);
  await db.open();
  repo = new WardrobeRepository(db);
  outbox = new OutboxQueue(db);
});

afterEach(async () => {
  syncRecorder.disable();
  await db.delete();
});

describe('recorder is inert unless a user is signed in (guest mode unchanged)', () => {
  it('writes nothing to the outbox when disabled', async () => {
    await repo.create(item());
    await repo.updateLaundryStatus(item().id, 'DIRTY');
    expect(await outbox.peekPending()).toEqual([]);
    expect((await db.wardrobeItems.get(item().id))?.laundry_status).toBe('DIRTY');
  });
});

describe('outbox payloads (ADR-002 privacy boundary on the real code path)', () => {
  beforeEach(() => syncRecorder.enable(ME));

  it('NEVER includes image_url or embeddings, even when the local row has them', async () => {
    await repo.create(item());
    const [m] = await outbox.peekPending();
    expect(m.action).toBe('insert');
    const keys = Object.keys(m.payload);
    expect(keys).not.toContain('image_url');
    expect(keys).not.toContain('color_embedding');
    expect(keys).not.toContain('silhouette_embedding');
    expect(JSON.stringify(m.payload)).not.toContain('base64');
    expect(m.payload.title).toBe('Navy Suit');
    expect(m.payload.user_id).toBe(ME);
  });

  it('stamps the local row with the same clocks it queues', async () => {
    await repo.create(item());
    const [m] = await outbox.peekPending();
    const row = (await db.wardrobeItems.get(item().id)) as any;
    expect(row.hlc).toBe(m.hlc);
    expect(row._field_hlc.title).toBe(m.hlc);
  });

  it('keeps DISTINCT per-field clocks when edits coalesce', async () => {
    await repo.create(item());
    await repo.update(item().id, { title: 'Charcoal Suit' });
    await new Promise(r => setTimeout(r, 3));
    await repo.updateLaundryStatus(item().id, 'DIRTY');

    const pending = await outbox.peekPending();
    expect(pending).toHaveLength(1); // insert + updates collapsed
    expect(pending[0].action).toBe('insert');
    const fh = pending[0].payload._field_hlc as Record<string, string>;
    expect(fh.title).toBeDefined();
    expect(fh.laundry_status).toBeDefined();
    expect(fh.laundry_status > fh.title).toBe(true); // later edit keeps its later clock
    expect(pending[0].payload.title).toBe('Charcoal Suit');
    expect(pending[0].payload.laundry_status).toBe('DIRTY');
  });

  it('does not enqueue a no-op edit', async () => {
    await repo.create(item());
    await db.syncQueue.clear();
    await repo.update(item().id, { title: 'Navy Suit' }); // identical value
    await repo.update(item().id, { updated_at: 'x' } as any); // not a synced field
    expect(await outbox.peekPending()).toEqual([]);
  });

  it('deleting a synced row is a tombstone, even when a hard delete was requested', async () => {
    await repo.create(item());
    await db.syncQueue.clear();
    await repo.delete(item().id, false);
    const row = await db.wardrobeItems.get(item().id);
    expect(row).toBeDefined(); // still present locally as a tombstone
    expect(row?.deleted_at).toBeTruthy();
    const [m] = await outbox.peekPending();
    expect(m.action).toBe('delete');
  });

  it('insert followed by delete before any sync cancels out (server never hears of it)', async () => {
    await repo.create(item());
    await repo.delete(item().id);
    expect(await outbox.peekPending()).toEqual([]);
  });

  it('does not record edits to a partner\'s (pulled) rows', async () => {
    await db.wardrobeItems.put(item({ id: 'cccccccc-0000-4000-8000-000000000009', user_id: PARTNER }));
    await repo.updateLaundryStatus('cccccccc-0000-4000-8000-000000000009', 'DIRTY');
    expect(await outbox.peekPending()).toEqual([]);
  });

  it('outfit logs get uuid ids and queue without photo_url', async () => {
    const outfits = new OutfitRepository(db);
    const id = await outfits.logOutfit({
      worn_by: ME, item_ids: [item().id], worn_at: '2026-11-16', event_context: 'Office',
      photo_url: 'data:image/png;base64,ZZZ',
    } as any);
    expect(isUuid(id)).toBe(true);
    const [m] = await outbox.peekPending();
    expect(m.table).toBe('outfit_history');
    expect(Object.keys(m.payload)).not.toContain('photo_url');
    expect(m.payload.worn_by).toBe(ME);
  });
});

describe('ensureUuidIds', () => {
  it('re-keys sample ids and rewrites outfit item_ids; idempotent', async () => {
    await db.wardrobeItems.put(item({ id: 'SU-NVY-01' }));
    await db.wardrobeItems.put(item({ id: 'SK-GLD-01', title: 'Sherwani' }));
    await db.wardrobeItems.put(item({ id: 'dddddddd-0000-4000-8000-000000000001', title: 'Already ok' }));
    await db.outfitLogs.put({
      id: 'ootd-123-abc', worn_by: ME, item_ids: ['SU-NVY-01', 'SK-GLD-01'], worn_at: '2026-11-01', created_at: 'x',
    } as any);

    const first = await ensureUuidIds(ME, db);
    expect(first).toEqual({ items: 2, logs: 1 });

    const items = await db.wardrobeItems.toArray();
    expect(items.every(i => isUuid(i.id))).toBe(true);
    expect(items.map(i => i.title).sort()).toEqual(['Already ok', 'Navy Suit', 'Sherwani']);

    const [log] = await db.outfitLogs.toArray();
    expect(isUuid(log.id)).toBe(true);
    // item_ids must point at rows that actually exist after re-keying
    const ids = new Set(items.map(i => i.id));
    expect(log.item_ids.every(x => ids.has(x))).toBe(true);

    expect(await ensureUuidIds(ME, db)).toEqual({ items: 0, logs: 0 });
  });

  it('does not touch a partner\'s rows', async () => {
    await db.wardrobeItems.put(item({ id: 'THEIRS-1', user_id: PARTNER }));
    await ensureUuidIds(ME, db);
    expect(await db.wardrobeItems.get('THEIRS-1')).toBeDefined();
  });
});

describe('backfillOutbox', () => {
  it('queues own never-synced rows once, skips partner rows and already-stamped rows', async () => {
    syncRecorder.enable(ME);
    await db.wardrobeItems.put(item({ id: 'eeeeeeee-0000-4000-8000-000000000001' })); // unstamped, mine
    await db.wardrobeItems.put(item({ id: 'eeeeeeee-0000-4000-8000-000000000002', user_id: PARTNER }));
    await db.wardrobeItems.put({ ...item({ id: 'eeeeeeee-0000-4000-8000-000000000003' }), hlc: 'x' } as any); // stamped

    expect(await backfillOutbox(ME, db)).toEqual({ items: 1, logs: 0 });
    const pending = await outbox.peekPending();
    expect(pending.map(p => p.entityId)).toEqual(['eeeeeeee-0000-4000-8000-000000000001']);
    expect(Object.keys(pending[0].payload)).not.toContain('image_url');

    expect(await backfillOutbox(ME, db)).toEqual({ items: 0, logs: 0 });
    expect(await outbox.peekPending()).toHaveLength(1);
  });
});

describe('end-to-end: device A (real repositories) -> server -> device B', () => {
  class Server implements SyncTransport {
    deltas: RemoteDelta[] = [];
    seq = 0;
    isConfigured() { return true; }
    async push(ms: OutboxMutation[]) {
      for (const m of ms) {
        const fh = (m.payload._field_hlc as Record<string, string>) ?? {};
        const { _field_hlc, ...data } = m.payload;
        this.deltas.push({
          table: m.table, entityId: m.entityId, action: m.action,
          payload: { ...data, id: m.entityId, _field_hlc: fh }, hlc: m.hlc, fieldHlcs: fh, serverSeq: ++this.seq,
        });
      }
      return { succeededIds: ms.map(m => m.id), failed: [] };
    }
    async pull(c: string | null) {
      const after = c === null ? 0 : Number(c);
      const d = this.deltas.filter(x => (x.serverSeq ?? 0) > after);
      return { deltas: d, nextCursor: d.length ? String(Math.max(...d.map(x => x.serverSeq!))) : c };
    }
  }

  it('a created item reaches the partner without its photo, then an edit and delete follow', async () => {
    const server = new Server();
    const dbB = new OurClosetDB(`wiringB_${Math.random()}`);
    await dbB.open();
    const wA = new SyncWorker(db, outbox, server, { storagePrefix: `a${Math.random()}` });
    const wB = new SyncWorker(dbB, new OutboxQueue(dbB), server, { storagePrefix: `b${Math.random()}` });

    syncRecorder.enable(ME);
    await repo.create(item());
    await wA.syncNow();
    await wB.syncNow();

    const onB = await dbB.wardrobeItems.get(item().id);
    expect(onB?.title).toBe('Navy Suit');
    expect(onB?.image_url).toBe(''); // ADR-002: photo stayed on A
    expect((onB as any)?.color_embedding).toBeUndefined();

    await repo.updateLaundryStatus(item().id, 'DIRTY');
    await wA.syncNow();
    await wB.syncNow();
    expect((await dbB.wardrobeItems.get(item().id))?.laundry_status).toBe('DIRTY');

    await repo.delete(item().id);
    await wA.syncNow();
    await wB.syncNow();
    expect((await dbB.wardrobeItems.get(item().id))?.deleted_at).toBeTruthy();

    // B's pulled rows must never echo back to the server
    expect(await new OutboxQueue(dbB).peekPending()).toEqual([]);
    await dbB.delete();
  });
});

describe('SupabaseSyncTransport (against a fake client)', () => {
  class T extends SupabaseSyncTransport {
    isConfigured() { return true; }
  }
  const mutation = (over: Partial<OutboxMutation>): OutboxMutation => ({
    id: 'm1', table: 'wardrobe_items', entityId: item().id, action: 'insert', payload: {}, hlc: '000000000000200:00000:A',
    idempotencyKey: 'k', retryCount: 0, status: 'pending', createdAt: 'x', ...over,
  });

  it('pushes wardrobe writes through the merge RPC with whitelisted fields and per-field clocks', async () => {
    const calls: Array<{ fn: string; args: any }> = [];
    const client = { rpc: async (fn: string, args: any) => (calls.push({ fn, args }), { data: null, error: null }), from: () => ({}) } as unknown as SupabaseLike;
    const res = await new T(() => client).push([
      mutation({
        payload: {
          user_id: ME, title: 'X', image_url: 'SECRET', color_embedding: [1], laundry_status: 'DIRTY',
          _field_hlc: { title: '000000000000100:00000:A', laundry_status: '000000000000150:00000:A' },
        },
      }),
    ]);
    expect(res.succeededIds).toEqual(['m1']);
    expect(calls[0].fn).toBe('sync_wardrobe_upsert');
    expect(Object.keys(calls[0].args.p_fields).sort()).toEqual(['laundry_status', 'title', 'user_id']);
    expect(JSON.stringify(calls[0].args)).not.toContain('SECRET');
    expect(calls[0].args.p_field_hlc.title).toBe('000000000000100:00000:A');
    expect(calls[0].args.p_field_hlc.laundry_status).toBe('000000000000150:00000:A');
  });

  it('does not send user_id on updates (ownership is immutable)', async () => {
    const calls: any[] = [];
    const client = { rpc: async (_f: string, a: any) => (calls.push(a), { data: null, error: null }), from: () => ({}) } as unknown as SupabaseLike;
    await new T(() => client).push([mutation({ action: 'update', payload: { user_id: PARTNER, title: 'Y' } })]);
    expect(calls[0].p_fields).toEqual({ title: 'Y' });
  });

  it('reports an RPC error as a failed mutation instead of dropping it', async () => {
    const client = { rpc: async () => ({ data: null, error: { message: 'boom' } }), from: () => ({}) } as unknown as SupabaseLike;
    const res = await new T(() => client).push([mutation({})]);
    expect(res.succeededIds).toEqual([]);
    expect(res.failed).toEqual([{ id: 'm1', error: 'boom' }]);
  });

  function pullClient(rowsByTable: Record<string, any[]>, calls: any[] = [], failTable?: string) {
    return {
      rpc: async () => ({ data: null, error: null }),
      from: (table: string) => {
        const state: any = { table };
        const q: any = {
          select: () => q,
          gt: (_c: string, v: number) => ((state.gt = v), q),
          order: () => q,
          limit: async (n: number) => {
            calls.push({ table, gt: state.gt, limit: n });
            if (table === failTable) return { data: null, error: { message: 'db down' } };
            const rows = (rowsByTable[table] ?? []).filter(r => r.server_seq > state.gt).slice(0, n);
            return { data: rows, error: null };
          },
        };
        return q;
      },
    } as unknown as SupabaseLike;
  }

  it('pulls on server_seq, applies overlap, and returns the max seq as the next cursor', async () => {
    const calls: any[] = [];
    const rows = {
      wardrobe_items: [
        { id: 'w1', title: 'A', server_seq: 90, hlc_timestamp: 'h1', field_hlc: { title: 'h1' }, household_id: 'H', deleted_at: null },
        { id: 'w2', title: 'B', server_seq: 120, hlc_timestamp: 'h2', field_hlc: {}, deleted_at: '2026-01-01' },
      ],
      outfit_history: [{ id: 'o1', worn_by: PARTNER, item_ids: [], worn_at: '2026-11-01', server_seq: 130, hlc_timestamp: 'h3' }],
    };
    const res = await new T(() => pullClient(rows, calls)).pull('100');
    expect(res.nextCursor).toBe('130');
    expect(calls[0].gt).toBe(75); // 100 - overlap(25)
    const w1 = res.deltas.find(d => d.entityId === 'w1')!;
    expect(w1.payload.image_url).toBe('');
    expect(Object.keys(w1.payload)).not.toContain('household_id');
    expect(Object.keys(w1.payload)).not.toContain('server_seq');
    expect(res.deltas.find(d => d.entityId === 'w2')!.action).toBe('delete');
  });

  it('REGRESSION: a failing table throws instead of silently advancing the cursor past its rows', async () => {
    const rows = { wardrobe_items: [], outfit_history: [{ id: 'o1', worn_by: PARTNER, item_ids: [], worn_at: 'x', server_seq: 500, hlc_timestamp: 'h' }] };
    await expect(new T(() => pullClient(rows, [], 'wardrobe_items')).pull('10')).rejects.toThrow(/db down/);
  });
});
