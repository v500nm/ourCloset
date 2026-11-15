import { describe, it, expect, beforeEach } from 'vitest';
import { OurClosetDB } from '@/data/db';
import { OutboxQueue, MAX_RETRY_COUNT } from '@/data/sync/outbox';

describe('Offline Outbox Queue & Mutation Coalescing', () => {
  let testDb: OurClosetDB;
  let outbox: OutboxQueue;

  beforeEach(async () => {
    // Generate unique in-memory Dexie DB for isolation
    testDb = new OurClosetDB(`test_outbox_${Date.now()}_${Math.random()}`);
    outbox = new OutboxQueue(testDb);
    await testDb.open();
  });

  it('enqueues a mutation with default pending status and HLC timestamp', async () => {
    const mutation = await outbox.enqueue({
      table: 'wardrobe_items',
      entityId: 'item-101',
      action: 'insert',
      payload: { title: 'Ivory Kurta', category: 'TOP' },
    });

    expect(mutation).not.toBeNull();
    expect(mutation?.entityId).toBe('item-101');
    expect(mutation?.action).toBe('insert');
    expect(mutation?.status).toBe('pending');
    expect(mutation?.retryCount).toBe(0);
    expect(mutation?.hlc).toBeDefined();

    const pending = await outbox.peekPending();
    expect(pending).toHaveLength(1);
    expect(pending[0].entityId).toBe('item-101');
  });

  describe('Mutation Coalescing Rules', () => {
    it('coalesces repeated updates to the same entity by merging payloads', async () => {
      // First update: change laundry_status
      await outbox.enqueue({
        table: 'wardrobe_items',
        entityId: 'item-202',
        action: 'update',
        payload: { laundry_status: 'DIRTY' },
      });

      // Second update: change formality_level and note
      const coalesced = await outbox.enqueue({
        table: 'wardrobe_items',
        entityId: 'item-202',
        action: 'update',
        payload: { formality_level: 4, notes: 'Sangeet wear' },
      });

      expect(coalesced).not.toBeNull();
      expect(coalesced?.action).toBe('update');
      expect(coalesced?.payload).toEqual({
        laundry_status: 'DIRTY',
        formality_level: 4,
        notes: 'Sangeet wear',
      });

      // Assert only 1 mutation exists in the queue
      const pending = await outbox.peekPending();
      expect(pending).toHaveLength(1);
      expect(pending[0].payload.laundry_status).toBe('DIRTY');
      expect(pending[0].payload.formality_level).toBe(4);
    });

    it('merges an insert followed by updates into a single insert with full state', async () => {
      // Local insert created while offline
      await outbox.enqueue({
        table: 'wardrobe_items',
        entityId: 'item-303',
        action: 'insert',
        payload: { title: 'Bandhgala', category: 'OUTERWEAR', cultural_style: 'INDIAN_TRADITIONAL' },
      });

      // Subsequent edit before syncing
      const coalesced = await outbox.enqueue({
        table: 'wardrobe_items',
        entityId: 'item-303',
        action: 'update',
        payload: { primary_color_hex: '#1A1A1A', formality_level: 5 },
      });

      expect(coalesced).not.toBeNull();
      // Must remain an INSERT so the remote creates the record
      expect(coalesced?.action).toBe('insert');
      expect(coalesced?.payload).toEqual({
        title: 'Bandhgala',
        category: 'OUTERWEAR',
        cultural_style: 'INDIAN_TRADITIONAL',
        primary_color_hex: '#1A1A1A',
        formality_level: 5,
      });

      const pending = await outbox.peekPending();
      expect(pending).toHaveLength(1);
      expect(pending[0].action).toBe('insert');
    });

    it('cancels an insert followed by delete entirely (remote never saw it)', async () => {
      // Local insert while offline
      await outbox.enqueue({
        table: 'wardrobe_items',
        entityId: 'item-404',
        action: 'insert',
        payload: { title: 'Accidental Item' },
      });

      const pendingBefore = await outbox.peekPending();
      expect(pendingBefore).toHaveLength(1);

      // Local delete while still offline
      const result = await outbox.enqueue({
        table: 'wardrobe_items',
        entityId: 'item-404',
        action: 'delete',
        payload: {},
      });

      // Should return null and remove the mutation completely
      expect(result).toBeNull();
      const pendingAfter = await outbox.peekPending();
      expect(pendingAfter).toHaveLength(0);
    });

    it('coalesces an update followed by delete into a delete operation', async () => {
      // Local update to an existing server record
      await outbox.enqueue({
        table: 'wardrobe_items',
        entityId: 'item-505',
        action: 'update',
        payload: { notes: 'Updated notes' },
      });

      // Local delete
      const coalesced = await outbox.enqueue({
        table: 'wardrobe_items',
        entityId: 'item-505',
        action: 'delete',
        payload: {},
      });

      expect(coalesced).not.toBeNull();
      expect(coalesced?.action).toBe('delete');
      expect(coalesced?.payload.deleted_at).toBeDefined();

      const pending = await outbox.peekPending();
      expect(pending).toHaveLength(1);
      expect(pending[0].action).toBe('delete');
    });

    it('does not coalesce mutations across different entities or tables', async () => {
      await outbox.enqueue({
        table: 'wardrobe_items',
        entityId: 'item-A',
        action: 'update',
        payload: { title: 'A' },
      });

      await outbox.enqueue({
        table: 'wardrobe_items',
        entityId: 'item-B',
        action: 'update',
        payload: { title: 'B' },
      });

      await outbox.enqueue({
        table: 'outfit_logs',
        entityId: 'item-A',
        action: 'update',
        payload: { title: 'A log' },
      });

      const pending = await outbox.peekPending();
      expect(pending).toHaveLength(3);
    });
  });

  describe('Dead-Letter Queue & Retries', () => {
    it('transitions to dead_letter state after 5 consecutive failures', async () => {
      const item = await outbox.enqueue({
        table: 'wardrobe_items',
        entityId: 'item-fail',
        action: 'insert',
        payload: { title: 'Failing item' },
      });
      const id = item!.id;

      // Retries 1 to 4
      for (let i = 1; i < MAX_RETRY_COUNT; i++) {
        const failed = await outbox.markFailed(id, `Network error attempt ${i}`);
        expect(failed?.retryCount).toBe(i);
        expect(failed?.status).toBe('failed');
      }

      // 5th failure -> triggers dead_letter
      const finalFailed = await outbox.markFailed(id, 'Fatal 5th retry failure');
      expect(finalFailed?.retryCount).toBe(MAX_RETRY_COUNT);
      expect(finalFailed?.status).toBe('dead_letter');
      expect(finalFailed?.error).toBe('Fatal 5th retry failure');

      // Verify dead letters query
      const deadLetters = await outbox.getDeadLetters();
      expect(deadLetters).toHaveLength(1);
      expect(deadLetters[0].id).toBe(id);

      // Peek pending should not return dead_letter items
      const pending = await outbox.peekPending();
      expect(pending).toHaveLength(0);
    });

    it('allows inspecting and retrying dead-letter items', async () => {
      const item = await outbox.enqueue({
        table: 'wardrobe_items',
        entityId: 'item-dead',
        action: 'update',
        payload: { title: 'Fix me' },
      });
      const id = item!.id;

      for (let i = 1; i <= MAX_RETRY_COUNT; i++) {
        await outbox.markFailed(id, `Attempt ${i}`);
      }

      let deadLetters = await outbox.getDeadLetters();
      expect(deadLetters).toHaveLength(1);

      // User triggers retry
      await outbox.retryDeadLetter(id);

      deadLetters = await outbox.getDeadLetters();
      expect(deadLetters).toHaveLength(0);

      const pending = await outbox.peekPending();
      expect(pending).toHaveLength(1);
      expect(pending[0].id).toBe(id);
      expect(pending[0].status).toBe('pending');
      expect(pending[0].retryCount).toBe(0);
      expect(pending[0].error).toBeNull();
    });
  });

  describe('Lifecycle Batch Operations', () => {
    it('handles markInFlight and markCompleted', async () => {
      const item1 = await outbox.enqueue({ table: 'wardrobe', entityId: '1', action: 'insert', payload: {} });
      const item2 = await outbox.enqueue({ table: 'wardrobe', entityId: '2', action: 'insert', payload: {} });

      const ids = [item1!.id, item2!.id];
      await outbox.markInFlight(ids);

      const pending = await outbox.peekPending();
      expect(pending).toHaveLength(0); // In flight items are excluded from pending

      const stats = await outbox.getStats();
      expect(stats.inFlight).toBe(2);

      // Complete batch
      await outbox.markCompleted(ids);

      const statsAfter = await outbox.getStats();
      expect(statsAfter.total).toBe(0);
    });
  });
});
