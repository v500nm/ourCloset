import { describe, it, expect } from 'vitest';
import { formatBytes, isQuotaExceededError, getStorageQuota } from '@/data/storage/storageQuota';

describe('Storage Quota & Diagnostics', () => {
  it('formats byte quantities accurately across units', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1024 * 1024 * 5.5)).toBe('5.5 MB');
    expect(formatBytes(1024 * 1024 * 1024 * 2)).toBe('2 GB');
  });

  it('accurately identifies QuotaExceededError instances', () => {
    expect(isQuotaExceededError({ name: 'QuotaExceededError' })).toBe(true);
    expect(isQuotaExceededError({ name: 'NS_ERROR_DOM_QUOTA_REACHED' })).toBe(true);
    expect(isQuotaExceededError({ code: 22 })).toBe(true);
    expect(isQuotaExceededError({ name: 'OtherError' })).toBe(false);
    expect(isQuotaExceededError(null)).toBe(false);
  });

  it('returns valid storage estimate info even when navigator.storage is partially mocked or absent', async () => {
    const info = await getStorageQuota();
    expect(info).toBeDefined();
    expect(typeof info.usageBytes).toBe('number');
    expect(typeof info.quotaBytes).toBe('number');
    expect(typeof info.usageFormatted).toBe('string');
  });
});

