'use client';

import { useEffect } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { isSupabaseConfigured } from '@/services/supabase/client';
import { startSyncForUser, stopSync } from '@/data/sync/syncBootstrap';
import { isUuid } from '@/data/sync/syncMapper';

/**
 * Starts cloud sync for a real, signed-in Supabase user and stops it otherwise.
 *
 * Guest mode, the local mock accounts (ids like "u-1") and any deployment without Supabase credentials never
 * reach `startSyncForUser`, so they keep working fully offline exactly as before.
 */
export function SyncBootstrap() {
  const { user, loading } = useAuth();
  const userId = user?.id;
  const isGuest = Boolean(user?.isGuest);

  useEffect(() => {
    if (loading) return;
    if (!userId || isGuest || !isUuid(userId) || !isSupabaseConfigured()) {
      stopSync();
      return;
    }
    let cancelled = false;
    startSyncForUser(userId).catch(err => {
      if (!cancelled) console.error('[sync] failed to start', err);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, isGuest, loading]);

  useEffect(() => () => stopSync(), []);

  return null;
}
