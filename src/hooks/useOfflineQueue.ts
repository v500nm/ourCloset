'use client';

import { useState, useEffect } from 'react';
import { getOfflineQueue, QueuedMutation } from '@/services/offline/queue';

export function useOfflineQueue() {
  const [queue, setQueue] = useState<QueuedMutation[]>([]);

  const refreshQueue = async () => {
    const items = await getOfflineQueue();
    setQueue(items);
  };

  useEffect(() => {
    refreshQueue();
  }, []);

  return { queue, refreshQueue, pendingCount: queue.length };
}
