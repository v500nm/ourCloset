import { db } from '../db';
import { WardrobeItem, OutfitHistory, HouseholdBond } from '@/types';
import { FamilyMember } from '@/providers/HouseholdProvider';
import { StoredBlob } from '../db';

export interface BackupPayload {
  version: number;
  app: 'ourCloset';
  exportedAt: string;
  data: {
    wardrobeItems: WardrobeItem[];
    outfitLogs: OutfitHistory[];
    members: FamilyMember[];
    household: HouseholdBond[];
    blobs: StoredBlob[];
  };
}

export interface ImportResult {
  success: boolean;
  counts: {
    items: number;
    outfits: number;
    members: number;
    blobs: number;
  };
}

/**
 * Serializes the entire local IndexedDB database into a single JSON backup payload.
 * Serves as the primary data recovery and migration export for the user per ADR-002.
 */
export async function exportWholeStore(): Promise<string> {
  const [wardrobeItems, outfitLogs, members, household, blobs] = await Promise.all([
    db.wardrobeItems.toArray(),
    db.outfitLogs.toArray(),
    db.members.toArray(),
    db.household.toArray(),
    db.blobs.toArray(),
  ]);

  const payload: BackupPayload = {
    version: 1,
    app: 'ourCloset',
    exportedAt: new Date().toISOString(),
    data: {
      wardrobeItems,
      outfitLogs,
      members,
      household,
      blobs,
    },
  };

  return JSON.stringify(payload, null, 2);
}

/**
 * Validates and imports a backup JSON payload into the local database transactionally.
 */
export async function importWholeStore(
  jsonString: string,
  options: { clearExisting?: boolean } = { clearExisting: true }
): Promise<ImportResult> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    throw new Error('Invalid JSON format: Failed to parse backup file');
  }

  const payload = parsed as Partial<BackupPayload>;
  if (!payload || payload.app !== 'ourCloset' || !payload.version || !payload.data) {
    throw new Error('Invalid backup schema: File is not a valid ourCloset backup payload');
  }

  const { wardrobeItems = [], outfitLogs = [], members = [], household = [], blobs = [] } = payload.data;

  await db.transaction('rw', [db.wardrobeItems, db.outfitLogs, db.members, db.household, db.blobs], async () => {
    if (options.clearExisting) {
      await Promise.all([
        db.wardrobeItems.clear(),
        db.outfitLogs.clear(),
        db.members.clear(),
        db.household.clear(),
        db.blobs.clear(),
      ]);
    }

    if (wardrobeItems.length > 0) await db.wardrobeItems.bulkPut(wardrobeItems);
    if (outfitLogs.length > 0) await db.outfitLogs.bulkPut(outfitLogs);
    if (members.length > 0) await db.members.bulkPut(members);
    if (household.length > 0) await db.household.bulkPut(household);
    if (blobs.length > 0) await db.blobs.bulkPut(blobs);
  });

  return {
    success: true,
    counts: {
      items: wardrobeItems.length,
      outfits: outfitLogs.length,
      members: members.length,
      blobs: blobs.length,
    },
  };
}

/**
 * Browser helper to trigger a file download for the exported backup.
 */
export async function downloadBackupFile(): Promise<void> {
  if (typeof window === 'undefined') return;
  const json = await exportWholeStore();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ourcloset-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

