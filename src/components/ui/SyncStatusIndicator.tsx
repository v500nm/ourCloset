'use client';

import React, { useEffect, useState } from 'react';
import { syncWorker, SyncState, SyncStats } from '@/data/sync/syncWorker';

export interface SyncStatusIndicatorProps {
  className?: string;
  showLabel?: boolean;
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  className = '',
  showLabel = false,
}) => {
  const [syncState, setSyncState] = useState<SyncState>('offline');
  const [stats, setStats] = useState<SyncStats | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    // Initial fetch
    syncWorker.getStats().then((s) => {
      setSyncState(s.state);
      setStats(s);
    });

    const unsubscribe = syncWorker.onSyncStateChange((state, newStats) => {
      setSyncState(state);
      setStats(newStats);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleRetry = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRetrying(true);
    try {
      await syncWorker.retryFailed();
    } catch {
      // Handled in worker
    } finally {
      setIsRetrying(false);
    }
  };

  const getStatusConfig = () => {
    switch (syncState) {
      case 'synced':
        return {
          icon: 'cloud_done',
          color: 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
          dotColor: 'bg-emerald-500',
          label: 'Synced',
          tooltip: stats?.lastSyncedAt
            ? `Synced at ${new Date(stats.lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
            : 'All changes synced',
        };
      case 'pending':
        const count = stats?.pendingCount ?? 0;
        return {
          icon: 'sync',
          color: 'text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
          dotColor: 'bg-amber-500 animate-pulse',
          label: count > 0 ? `${count} pending` : 'Syncing...',
          tooltip: `${count} pending changes queuing for sync`,
        };
      case 'error':
        return {
          icon: 'cloud_sync',
          color: 'text-sindoor bg-sindoor/10 border-sindoor/30',
          dotColor: 'bg-sindoor',
          label: 'Sync failed',
          tooltip: stats?.lastError || 'Sync failed. Click to retry.',
        };
      case 'offline':
      default:
        return {
          icon: 'cloud_off',
          color: 'text-on-surface-variant/70 bg-surface-variant/40 border-outline-variant/30',
          dotColor: 'bg-outline-variant',
          label: 'Offline',
          tooltip: 'Working locally offline. Changes will sync when online.',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono border transition-all duration-200 ${config.color} ${className}`}
      title={config.tooltip}
      role="status"
      aria-label={`Sync status: ${config.label}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`} aria-hidden="true" />
      <span
        className={`material-symbols-outlined text-[14px] leading-none ${
          syncState === 'pending' || isRetrying ? 'animate-spin' : ''
        }`}
        aria-hidden="true"
      >
        {isRetrying ? 'progress_activity' : config.icon}
      </span>
      {showLabel && <span className="font-medium truncate max-w-[90px]">{config.label}</span>}
      {syncState === 'error' && (
        <button
          onClick={handleRetry}
          disabled={isRetrying}
          className="ml-1 text-[11px] font-bold underline hover:opacity-80 transition-opacity"
          aria-label="Retry sync"
        >
          {isRetrying ? 'Retrying...' : 'Retry'}
        </button>
      )}
    </div>
  );
};

