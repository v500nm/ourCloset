export interface StorageEstimateInfo {
  usageBytes: number;
  quotaBytes: number;
  usagePercent: number;
  usageFormatted: string;
  quotaFormatted: string;
  isPersisted: boolean;
}

/**
 * Formats a byte number into human-readable string (KB, MB, GB).
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Requests durable/persistent client storage from the browser via StorageManager API.
 * Prevents the browser from evicting local IndexedDB data under low disk pressure.
 */
export async function requestStoragePersistence(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
    try {
      return await navigator.storage.persist();
    } catch (err) {
      console.warn('[Storage] Failed to request persistent storage permission:', err);
      return false;
    }
  }
  return false;
}

/**
 * Checks whether persistent storage is currently granted.
 */
export async function isStoragePersisted(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persisted) {
    try {
      return await navigator.storage.persisted();
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Estimates current IndexedDB usage and total device storage quota.
 */
export async function getStorageQuota(): Promise<StorageEstimateInfo> {
  let usageBytes = 0;
  let quotaBytes = 0;
  let isPersisted = false;

  if (typeof navigator !== 'undefined' && navigator.storage) {
    try {
      if (navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        usageBytes = estimate.usage || 0;
        quotaBytes = estimate.quota || 0;
      }
      if (navigator.storage.persisted) {
        isPersisted = await navigator.storage.persisted();
      }
    } catch (err) {
      console.warn('[Storage] Failed to retrieve storage estimate:', err);
    }
  }

  const usagePercent = quotaBytes > 0 ? (usageBytes / quotaBytes) * 100 : 0;

  return {
    usageBytes,
    quotaBytes,
    usagePercent: Number(usagePercent.toFixed(2)),
    usageFormatted: formatBytes(usageBytes),
    quotaFormatted: formatBytes(quotaBytes),
    isPersisted,
  };
}

/**
 * Checks if an error is a QuotaExceededError (IndexedDB / LocalStorage full).
 */
export function isQuotaExceededError(error: unknown): boolean {
  if (!error) return false;
  if (typeof error === 'object' && error !== null) {
    const err = error as { name?: string; code?: number };
    return (
      err.name === 'QuotaExceededError' ||
      err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      err.code === 22 ||
      err.code === 1014
    );
  }
  return false;
}

