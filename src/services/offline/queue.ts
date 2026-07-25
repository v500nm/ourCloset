import { get, set } from 'idb-keyval';

export interface QueuedMutation {
  id: string;
  table: string;
  action: 'insert' | 'update' | 'delete';
  payload: Record<string, unknown>;
  timestamp: number;
}

const QUEUE_KEY = 'ourcloset_offline_mutations';

export async function getOfflineQueue(): Promise<QueuedMutation[]> {
  return (await get<QueuedMutation[]>(QUEUE_KEY)) || [];
}

export async function enqueueMutation(mutation: Omit<QueuedMutation, 'id' | 'timestamp'>): Promise<void> {
  const queue = await getOfflineQueue();
  const newEntry: QueuedMutation = {
    ...mutation,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  };
  queue.push(newEntry);
  await set(QUEUE_KEY, queue);
}

export async function clearOfflineQueue(): Promise<void> {
  await set(QUEUE_KEY, []);
}
