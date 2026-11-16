import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SyncStatusIndicator } from '@/components/ui/SyncStatusIndicator';
import { syncWorker, SyncStats } from '@/data/sync/syncWorker';

describe('SyncStatusIndicator Component', () => {
  const dummyStats: SyncStats = {
    state: 'synced',
    pendingCount: 0,
    inFlightCount: 0,
    failedCount: 0,
    deadLetterCount: 0,
    lastSyncedAt: '2026-11-16T00:00:00.000Z',
    lastSyncedCursor: 'test-cursor-1',
    lastError: null,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders a valid status element with accessible attributes', () => {
    const html = renderToStaticMarkup(
      React.createElement(SyncStatusIndicator, { showLabel: true })
    );

    expect(html).toContain('role="status"');
    expect(html).toContain('aria-label="Sync status:');
  });

  it('renders custom class name properly', () => {
    const html = renderToStaticMarkup(
      React.createElement(SyncStatusIndicator, { className: 'custom-sync-pill', showLabel: false })
    );

    expect(html).toContain('custom-sync-pill');
    expect(html).toContain('material-symbols-outlined');
  });

  it('renders label text when showLabel is enabled', () => {
    const html = renderToStaticMarkup(
      React.createElement(SyncStatusIndicator, { showLabel: true })
    );

    expect(html).toContain('font-mono');
  });
});
