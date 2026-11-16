import Dexie, { type Table } from 'dexie';
import type { WardrobeItem, OutfitHistory, HouseholdBond, FamilyMember } from '@/types';
import type { OutboxMutation } from './sync/outboxTypes';

export interface StoredBlob {
  id: string;
  dataUrl: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

// Retain v1 SyncMutation type for backwards compatibility
export type SyncMutation = OutboxMutation;

// Schema definitions and Dexie instance
export class OurClosetDB extends Dexie {
  wardrobeItems!: Table<WardrobeItem, string>;
  outfitLogs!: Table<OutfitHistory, string>;
  members!: Table<FamilyMember, string>;
  household!: Table<HouseholdBond, string>;
  blobs!: Table<StoredBlob, string>;
  syncQueue!: Table<OutboxMutation, string>;

  constructor(dbName = 'ourClosetDB') {
    super(dbName);

    // Schema Version 1 - Base local-first relational tables
    this.version(1).stores({
      wardrobeItems: 'id, user_id, category, cultural_style, formality_level, laundry_status, privacy_tier, created_at, updated_at, deleted_at, [user_id+laundry_status], [cultural_style+category]',
      outfitLogs: 'id, household_id, worn_by, worn_at, created_at, [worn_by+worn_at]',
      members: 'id, household_id, name, role, hierarchyRole, privacyTier, joinedAt',
      household: 'id, household_type, sync_status, created_at',
      blobs: 'id, mimeType, size, createdAt',
      syncQueue: 'id, table_name, record_id, action, status, created_at',
    });

    // Schema Version 2 - HLC and granular offline outbox queue
    this.version(2).stores({
      syncQueue: 'id, table, entityId, action, status, hlc, idempotencyKey, createdAt, [table+entityId], [status+createdAt]',
    });
  }
}

export const db = new OurClosetDB();
