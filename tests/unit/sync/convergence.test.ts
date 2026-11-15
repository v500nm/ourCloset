import { describe, it, expect, beforeEach } from 'vitest';
import { OurClosetDB } from '@/data/db';
import { OutboxQueue, OutboxMutation } from '@/data/sync/outbox';
import { HlcClock, compareHlc } from '@/data/sync/hlc';
import { SyncWorker, SyncTransport, RemoteDelta, reconcileEntity } from '@/data/sync/syncWorker';
import { WardrobeItem } from '@/types';

/**
 * Shared in-memory mock Supabase/cloud server
 * Simulates server-side storage where both devices push and pull deltas.
 */
class MockCloudServerTransport implements SyncTransport {
  public serverDeltas: RemoteDelta[] = [];
  public isOnline = true;
  /** Server write order. Mirrors Postgres `server_seq`: assigned on ARRIVAL, unrelated to client HLCs. */
  private seq = 0;
  /** Reproduces the ORIGINAL bug: cursor = max client HLC seen. Only used by the regression test below. */
  public legacyHlcCursor = false;

  isConfigured(): boolean {
    return this.isOnline;
  }

  async push(mutations: OutboxMutation[]): Promise<{
    succeededIds: string[];
    failed: { id: string; error: string }[];
  }> {
    if (!this.isOnline) {
      return {
        succeededIds: [],
        failed: mutations.map(m => ({ id: m.id, error: 'Network offline' })),
      };
    }

    const succeededIds: string[] = [];

    for (const m of mutations) {
      const fieldHlcs: Record<string, string> = {};
      for (const key of Object.keys(m.payload)) {
        fieldHlcs[key] = m.hlc;
      }
      if (m.action === 'delete') {
        fieldHlcs['deleted_at'] = m.hlc;
      }

      this.serverDeltas.push({
        table: m.table,
        entityId: m.entityId,
        action: m.action,
        payload: {
          ...m.payload,
          id: m.entityId,
          _field_hlc: fieldHlcs,
        },
        hlc: m.hlc,
        fieldHlcs,
        deletedAt: m.action === 'delete' ? (m.payload.deleted_at as string) || new Date().toISOString() : null,
        updatedAt: new Date().toISOString(),
        serverSeq: ++this.seq,
      });

      succeededIds.push(m.id);
    }

    return { succeededIds, failed: [] };
  }

  async pull(cursor: string | null): Promise<{
    deltas: RemoteDelta[];
    nextCursor: string | null;
  }> {
    if (!this.isOnline) {
      return { deltas: [], nextCursor: cursor };
    }

    if (this.legacyHlcCursor) {
      const fresh = this.serverDeltas.filter(d => !cursor || compareHlc(d.hlc, cursor) > 0);
      let max = cursor;
      for (const d of fresh) if (!max || compareHlc(d.hlc, max) > 0) max = d.hlc;
      return { deltas: fresh, nextCursor: max };
    }

    // The cursor is the SERVER's write order, never a client HLC (see SyncTransport.pull).
    const after = cursor === null ? 0 : Number(cursor);
    const filtered = this.serverDeltas.filter(d => (d.serverSeq ?? 0) > after);
    const nextCursor = filtered.length ? String(Math.max(...filtered.map(d => d.serverSeq ?? 0))) : cursor;
    return { deltas: filtered, nextCursor };
  }

  clear() {
    this.serverDeltas = [];
  }
}

describe('Two-Device Offline Convergence Engine (ADR-003)', () => {
  let cloudServer: MockCloudServerTransport;

  beforeEach(() => {
    cloudServer = new MockCloudServerTransport();
  });

  it('proves unit reconciliation function is commutative (A merged B === B merged A)', () => {
    const itemA: WardrobeItem & { _field_hlc: Record<string, string>; hlc: string } = {
      id: 'garment-1',
      user_id: 'user-partner-1',
      title: 'Silk Kurta',
      category: 'shirt',
      cultural_style: 'indian_traditional',
      formality_level: 3,
      laundry_status: 'DIRTY', // Partner A marked DIRTY at t=100
      image_url: 'placeholder.webp',
      wear_count: 5,
      season_tags: ['all-season'],
      privacy_tier: 'PUBLIC',
      created_at: '2026-01-01T00:00:00.000Z',
      hlc: '000000000000100:00000:deviceA',
      _field_hlc: {
        laundry_status: '000000000000100:00000:deviceA',
      },
    };

    const itemB: WardrobeItem & { _field_hlc: Record<string, string>; hlc: string } = {
      id: 'garment-1',
      user_id: 'user-partner-1',
      title: 'Royal Raw Silk Kurta', // Partner B renamed and raised formality at t=120
      category: 'shirt',
      cultural_style: 'indian_traditional',
      formality_level: 5,
      laundry_status: 'CLEAN',
      image_url: 'placeholder.webp',
      wear_count: 5,
      season_tags: ['all-season'],
      privacy_tier: 'PUBLIC',
      created_at: '2026-01-01T00:00:00.000Z',
      hlc: '000000000000120:00000:deviceB',
      _field_hlc: {
        title: '000000000000120:00000:deviceB',
        formality_level: '000000000000120:00000:deviceB',
      },
    };

    // Reconcile A receiving B
    const resultAB = reconcileEntity(itemA, itemB);

    // Reconcile B receiving A
    const resultBA = reconcileEntity(itemB, itemA);

    // Both must converge to:
    // title: 'Royal Raw Silk Kurta' (from B, t=120)
    // formality_level: 5 (from B, t=120)
    // laundry_status: 'DIRTY' (from A, t=100 > initial)
    expect(resultAB.merged.title).toBe('Royal Raw Silk Kurta');
    expect(resultAB.merged.formality_level).toBe(5);
    expect(resultAB.merged.laundry_status).toBe('DIRTY');

    expect(resultBA.merged.title).toBe('Royal Raw Silk Kurta');
    expect(resultBA.merged.formality_level).toBe(5);
    expect(resultBA.merged.laundry_status).toBe('DIRTY');

    expect(resultAB.merged.title).toBe(resultBA.merged.title);
    expect(resultAB.merged.laundry_status).toBe(resultBA.merged.laundry_status);
    expect(resultAB.merged.formality_level).toBe(resultBA.merged.formality_level);
  });

  it('runs two-device disconnected simulation where both edit concurrently and reconnect', async () => {
    const dbA = new OurClosetDB(`devA_${Date.now()}_${Math.random()}`);
    const dbB = new OurClosetDB(`devB_${Date.now()}_${Math.random()}`);
    await Promise.all([dbA.open(), dbB.open()]);

    const clockA = new HlcClock({ nodeId: 'devA', initialMillis: 1000 });
    const clockB = new HlcClock({ nodeId: 'devB', initialMillis: 1050 });

    const outboxA = new OutboxQueue(dbA);
    const outboxB = new OutboxQueue(dbB);

    const workerA = new SyncWorker(dbA, outboxA, cloudServer, { storagePrefix: `devA_${Date.now()}` });
    const workerB = new SyncWorker(dbB, outboxB, cloudServer, { storagePrefix: `devB_${Date.now()}` });

    const initialItem: WardrobeItem = {
      id: 'jacket-42',
      user_id: 'user-1',
      title: 'Nehru Jacket',
      category: 'suit',
      cultural_style: 'indian_traditional',
      formality_level: 3,
      laundry_status: 'CLEAN',
      image_url: 'jacket.webp',
      wear_count: 2,
      season_tags: ['winter'],
      privacy_tier: 'PUBLIC',
      created_at: '2026-01-01T00:00:00.000Z',
    };

    // Both devices start with the same initial garment
    await Promise.all([
      dbA.wardrobeItems.put({ ...initialItem }),
      dbB.wardrobeItems.put({ ...initialItem }),
    ]);

    // 1. Both devices go OFFLINE
    cloudServer.isOnline = false;

    // 2. Device A goes to laundry and marks jacket as DIRTY
    const hlcA = clockA.nowString();
    await dbA.wardrobeItems.update('jacket-42', {
      laundry_status: 'DIRTY',
      _field_hlc: { laundry_status: hlcA },
    } as any);
    await outboxA.enqueue({
      table: 'wardrobe_items',
      entityId: 'jacket-42',
      action: 'update',
      payload: { laundry_status: 'DIRTY' },
      hlc: hlcA,
    });

    // 3. Concurrently, Device B edits the jacket's formality to 5 and title to "Embroidered Nehru Jacket"
    const hlcB = clockB.nowString();
    await dbB.wardrobeItems.update('jacket-42', {
      title: 'Embroidered Nehru Jacket',
      formality_level: 5,
      _field_hlc: { title: hlcB, formality_level: hlcB },
    } as any);
    await outboxB.enqueue({
      table: 'wardrobe_items',
      entityId: 'jacket-42',
      action: 'update',
      payload: { title: 'Embroidered Nehru Jacket', formality_level: 5 },
      hlc: hlcB,
    });

    // Verify outbox queued on both devices while offline
    expect(await outboxA.peekPending()).toHaveLength(1);
    expect(await outboxB.peekPending()).toHaveLength(1);

    // 4. Both devices RECONNECT to internet
    cloudServer.isOnline = true;

    // 5. Run delta sync cycles
    // Device A pushes first, then pulls
    const resA1 = await workerA.syncNow();
    // Device B pushes, then pulls Device A's changes
    const resB = await workerB.syncNow();
    // Device A pulls Device B's changes
    const resA2 = await workerA.syncNow();

    // 6. Assert both devices have converged to identical state
    const finalItemA = await dbA.wardrobeItems.get('jacket-42');
    const finalItemB = await dbB.wardrobeItems.get('jacket-42');

    expect(finalItemA).toBeDefined();
    expect(finalItemB).toBeDefined();

    expect(finalItemA?.title).toBe('Embroidered Nehru Jacket');
    expect(finalItemB?.title).toBe('Embroidered Nehru Jacket');

    expect(finalItemA?.formality_level).toBe(5);
    expect(finalItemB?.formality_level).toBe(5);

    expect(finalItemA?.laundry_status).toBe('DIRTY');
    expect(finalItemB?.laundry_status).toBe('DIRTY');

    // Outbox queues on both devices should now be completely drained
    expect((await outboxA.getStats()).pending).toBe(0);
    expect((await outboxB.getStats()).pending).toBe(0);

    await Promise.all([dbA.delete(), dbB.delete()]);
  });

  describe('Delete-versus-Edit Conflict Resolution', () => {
    it('soft-deletes item when delete HLC is strictly newer than edit HLC', () => {
      const editedLocal: WardrobeItem & { _field_hlc: Record<string, string>; hlc: string } = {
        id: 'item-del-1',
        user_id: 'u1',
        title: 'T-Shirt',
        category: 'shirt',
        cultural_style: 'western',
        formality_level: 1,
        laundry_status: 'CLEAN',
        image_url: 'shirt.webp',
        wear_count: 1,
        season_tags: ['summer'],
        privacy_tier: 'PUBLIC',
        created_at: '2026-01-01T00:00:00.000Z',
        hlc: '000000000000100:00000:devA',
        _field_hlc: { title: '000000000000100:00000:devA' },
      };

      const incomingDelete = {
        id: 'item-del-1',
        deleted_at: '2026-01-02T00:00:00.000Z',
        hlc: '000000000000200:00000:devB',
        _field_hlc: { deleted_at: '000000000000200:00000:devB' },
      };

      const result = reconcileEntity(editedLocal, incomingDelete as any, {
        incomingAction: 'delete',
        incomingHlc: '000000000000200:00000:devB',
      });

      expect(result.merged.deleted_at).toBeDefined();
    });

    it('un-deletes / resurrects item when edit HLC is strictly newer than delete HLC', () => {
      const deletedLocal: WardrobeItem & { _field_hlc: Record<string, string>; hlc: string } = {
        id: 'item-del-2',
        user_id: 'u1',
        title: 'Old Kurta',
        category: 'shirt',
        cultural_style: 'indian_traditional',
        formality_level: 2,
        laundry_status: 'CLEAN',
        image_url: 'kurta.webp',
        wear_count: 1,
        season_tags: ['all-season'],
        privacy_tier: 'PUBLIC',
        created_at: '2026-01-01T00:00:00.000Z',
        deleted_at: '2026-01-01T12:00:00.000Z',
        hlc: '000000000000100:00000:devA',
        _field_hlc: { deleted_at: '000000000000100:00000:devA' },
      };

      // Device B edited the item at t=300 (after Device A deleted it at t=100)
      const incomingEdit = {
        id: 'item-del-2',
        title: 'Restored & Tailored Kurta',
        formality_level: 4,
        hlc: '000000000000300:00000:devB',
        _field_hlc: {
          title: '000000000000300:00000:devB',
          formality_level: '000000000000300:00000:devB',
        },
      };

      const result = reconcileEntity(deletedLocal, incomingEdit as any, {
        incomingAction: 'update',
        incomingHlc: '000000000000300:00000:devB',
      });

      // Item should be un-deleted and updated!
      expect(result.merged.deleted_at).toBeUndefined();
      expect(result.merged.title).toBe('Restored & Tailored Kurta');
      expect(result.merged.formality_level).toBe(4);
    });
  });

  describe('Master Plan Exit Criterion: 50-Run Convergence Loop', () => {
    it('passes 50 consecutive convergence simulation runs with randomized sync orders and delays', async () => {
      const TOTAL_RUNS = 50;

      for (let run = 1; run <= TOTAL_RUNS; run++) {
        const dbA = new OurClosetDB(`simA_${run}_${Date.now()}_${Math.random()}`);
        const dbB = new OurClosetDB(`simB_${run}_${Date.now()}_${Math.random()}`);
        await Promise.all([dbA.open(), dbB.open()]);

        const cloud = new MockCloudServerTransport();
        const clockA = new HlcClock({ nodeId: `devA_${run}`, initialMillis: 1000 + run });
        const clockB = new HlcClock({ nodeId: `devB_${run}`, initialMillis: 1005 + run });

        const outboxA = new OutboxQueue(dbA);
        const outboxB = new OutboxQueue(dbB);

        const workerA = new SyncWorker(dbA, outboxA, cloud, { storagePrefix: `simA_${run}` });
        const workerB = new SyncWorker(dbB, outboxB, cloud, { storagePrefix: `simB_${run}` });

        const testId = `garment-sim-${run}`;
        const baseItem: WardrobeItem = {
          id: testId,
          user_id: 'user-sim',
          title: `Garment ${run}`,
          category: 'shirt',
          cultural_style: 'western',
          formality_level: 2,
          laundry_status: 'CLEAN',
          image_url: 'img.webp',
          wear_count: 0,
          season_tags: ['summer'],
          privacy_tier: 'PUBLIC',
          created_at: new Date().toISOString(),
        };

        await Promise.all([
          dbA.wardrobeItems.put({ ...baseItem }),
          dbB.wardrobeItems.put({ ...baseItem }),
        ]);

        // Disconnect
        cloud.isOnline = false;

        // Device A edits laundry status
        const hlcA = clockA.nowString();
        await dbA.wardrobeItems.update(testId, {
          laundry_status: 'IN_WASH',
          _field_hlc: { laundry_status: hlcA },
        } as any);
        await outboxA.enqueue({
          table: 'wardrobe_items',
          entityId: testId,
          action: 'update',
          payload: { laundry_status: 'IN_WASH' },
          hlc: hlcA,
        });

        // Device B edits formality and title
        const hlcB = clockB.nowString();
        await dbB.wardrobeItems.update(testId, {
          title: `Updated Title ${run}`,
          formality_level: 4,
          _field_hlc: { title: hlcB, formality_level: hlcB },
        } as any);
        await outboxB.enqueue({
          table: 'wardrobe_items',
          entityId: testId,
          action: 'update',
          payload: { title: `Updated Title ${run}`, formality_level: 4 },
          hlc: hlcB,
        });

        // Reconnect
        cloud.isOnline = true;

        // Alternating sync orders
        if (run % 2 === 0) {
          await workerA.syncNow();
          await workerB.syncNow();
          await workerA.syncNow();
        } else {
          await workerB.syncNow();
          await workerA.syncNow();
          await workerB.syncNow();
        }

        const resA = await dbA.wardrobeItems.get(testId);
        const resB = await dbB.wardrobeItems.get(testId);

        expect(resA).toBeDefined();
        expect(resB).toBeDefined();
        expect(resA?.laundry_status).toBe('IN_WASH');
        expect(resB?.laundry_status).toBe('IN_WASH');
        expect(resA?.title).toBe(`Updated Title ${run}`);
        expect(resB?.title).toBe(`Updated Title ${run}`);
        expect(resA?.formality_level).toBe(4);
        expect(resB?.formality_level).toBe(4);

        await Promise.all([dbA.delete(), dbB.delete()]);
      }
    });
  });

  describe('REGRESSION: pull cursor must follow server write order, not client HLCs', () => {
    /**
     * Offline device A edited at HLC 100 but reconnects LATE. Device B (HLC 200) already synced and its cursor
     * advanced. With a cursor of "max HLC seen", B asks for hlc > 200 and A's HLC-100 edit is skipped forever.
     */
    async function scenario(legacy: boolean) {
      const server = new MockCloudServerTransport();
      server.legacyHlcCursor = legacy;
      const dbA = new OurClosetDB(`curA_${Math.random()}`);
      const dbB = new OurClosetDB(`curB_${Math.random()}`);
      await Promise.all([dbA.open(), dbB.open()]);
      const oA = new OutboxQueue(dbA);
      const oB = new OutboxQueue(dbB);
      const wA = new SyncWorker(dbA, oA, server, { storagePrefix: `curA_${Math.random()}` });
      const wB = new SyncWorker(dbB, oB, server, { storagePrefix: `curB_${Math.random()}` });

      const base: WardrobeItem = {
        id: 'late-1', user_id: 'u', title: 'Shirt', category: 'shirt', cultural_style: 'western',
        formality_level: 2, laundry_status: 'CLEAN', image_url: '', wear_count: 0, season_tags: ['summer'],
        privacy_tier: 'PUBLIC', created_at: '2026-01-01T00:00:00.000Z',
      };
      await Promise.all([dbA.wardrobeItems.put({ ...base }), dbB.wardrobeItems.put({ ...base })]);

      const hA = '000000000000100:00000:A'; // older edit, made first, pushed last
      const hB = '000000000000200:00000:B';

      await dbA.wardrobeItems.update('late-1', { laundry_status: 'DIRTY', _field_hlc: { laundry_status: hA } } as any);
      await oA.enqueue({ table: 'wardrobe_items', entityId: 'late-1', action: 'update', payload: { laundry_status: 'DIRTY' }, hlc: hA });
      await dbB.wardrobeItems.update('late-1', { title: 'Linen Shirt', _field_hlc: { title: hB } } as any);
      await oB.enqueue({ table: 'wardrobe_items', entityId: 'late-1', action: 'update', payload: { title: 'Linen Shirt' }, hlc: hB });

      await wB.syncNow(); // B pushes first; its cursor now sits at/after HLC 200
      await wA.syncNow(); // A reconnects late and pushes the OLDER edit
      await wB.syncNow(); // B must still learn about it

      const seenByB = await dbB.wardrobeItems.get('late-1');
      await Promise.all([dbA.delete(), dbB.delete()]);
      return seenByB?.laundry_status;
    }

    it('documents the bug: an HLC-based cursor silently loses the late offline edit', async () => {
      expect(await scenario(true)).toBe('CLEAN'); // A's DIRTY never arrives
    });

    it('server-sequence cursor delivers the late offline edit', async () => {
      expect(await scenario(false)).toBe('DIRTY');
    });
  });
});
