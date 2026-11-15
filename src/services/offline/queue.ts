/**
 * Offline queue adapter
 * Bridges legacy calls to the new Dexie-backed OutboxQueue (ADR-001 & ADR-003)
 */

import { outboxQueue, OutboxMutation, MutationAction } from '@/data/sync/outbox';

export type QueuedMutation = OutboxMutation;

export async function getOfflineQueue(): Promise<OutboxMutation[]> {
  return outboxQueue.peekPending(100);
}

export async function enqueueMutation(mutation: {
  table: string;
  action: 'insert' | 'update' | 'delete' | 'INSERT' | 'UPDATE' | 'DELETE';
  payload: Record<string, unknown>;
  record_id?: string;
  entityId?: string;
  id?: string;
}): Promise<void> {
  const entityId = mutation.entityId || mutation.record_id || mutation.id || (mutation.payload?.id as string) || crypto.randomUUID();
  const action = mutation.action.toLowerCase() as MutationAction;

  await outboxQueue.enqueue({
    table: mutation.table,
    entityId,
    action,
    payload: mutation.payload,
  });
}

export async function clearOfflineQueue(): Promise<void> {
  await outboxQueue.clear();
}

export { outboxQueue };
