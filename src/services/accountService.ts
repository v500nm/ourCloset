/**
 * Account Service & Guest Migration
 * Per Claude Phase Plan §3 Phase 5 & ADR-002:
 * - Migrates guest IndexedDB items to authenticated user on sign-in/up.
 * - Account deletion: wipes all local IndexedDB stores and sessions.
 * - Data export: GDPR-compliant JSON bundle of user's personal closet.
 */

import { db } from '@/data/db';
import { wardrobeRepository } from '@/data/repositories/wardrobeRepository';
import { outfitRepository } from '@/data/repositories/outfitRepository';
import { memberRepository } from '@/data/repositories/memberRepository';
import { householdRepository } from '@/data/repositories/householdRepository';
import { blobRepository } from '@/data/repositories/blobRepository';
import { createClient, isSupabaseConfigured } from '@/services/supabase/client';
import { isUuid } from '@/data/sync/syncMapper';

export interface MigrationSummary {
  itemsMigrated: number;
  outfitsMigrated: number;
  membersMigrated: number;
  newUserId: string;
}

export interface UserDataExportBundle {
  version: string;
  exportedAt: string;
  userId: string;
  wardrobeItems: unknown[];
  outfitHistory: unknown[];
  householdMembers: unknown[];
  householdBond: unknown;
  blobCount: number;
}

/**
 * Re-keys local guest items and logs to the newly authenticated user ID.
 */
export async function migrateGuestDataToUser(newUserId: string): Promise<MigrationSummary> {
  let itemsMigrated = 0;
  let outfitsMigrated = 0;
  let membersMigrated = 0;

  // 1. Migrate wardrobe items
  const allItems = await wardrobeRepository.getAll();
  for (const item of allItems) {
    if (item.user_id === 'guest' || item.user_id === 'user-current' || !item.user_id) {
      await wardrobeRepository.update(item.id, {
        user_id: newUserId,
        updated_at: new Date().toISOString(),
      });
      itemsMigrated++;
    }
  }

  // 2. Migrate outfit logs
  const allOutfits = await outfitRepository.getAll();
  for (const outfit of allOutfits) {
    if (outfit.worn_by === 'guest' || outfit.worn_by === 'user-current' || outfit.worn_by === 'Self') {
      await db.outfitLogs.update(outfit.id, {
        worn_by: newUserId,
      });
      outfitsMigrated++;
    }
  }

  // 3. Migrate household member profile if existing
  const allMembers = await memberRepository.getAll();
  for (const member of allMembers) {
    if (member.id === 'user-current' || member.id === 'guest') {
      await memberRepository.remove(member.id);
      await memberRepository.add({
        ...member,
        id: newUserId,
      });
      membersMigrated++;
    }
  }

  return {
    itemsMigrated,
    outfitsMigrated,
    membersMigrated,
    newUserId,
  };
}

/**
 * Exports all user data stored in IndexedDB as a single JSON bundle.
 */
export async function exportAllUserData(userId = 'user-current'): Promise<UserDataExportBundle> {
  const [items, outfits, members, household, blobCount] = await Promise.all([
    wardrobeRepository.getAll(),
    outfitRepository.getAll(),
    memberRepository.getAll(),
    householdRepository.getHousehold(),
    blobRepository.count(),
  ]);

  return {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    userId,
    wardrobeItems: items,
    outfitHistory: outfits,
    householdMembers: members,
    householdBond: household || null,
    blobCount,
  };
}

/**
 * Permanently deletes user account and purges all local data.
 */
export async function deleteUserAccount(userId?: string): Promise<void> {
  // 1. Server copy FIRST. If this fails we throw and leave local data intact: wiping locally while the server
  //    copy survives would break the deletion promise on the privacy page while looking like success.
  if (userId && isUuid(userId) && isSupabaseConfigured()) {
    const supabase = createClient();
    const { error } = await supabase.rpc('delete_my_account');
    if (error) throw new Error(`Account deletion failed: ${error.message}`);
    await supabase.auth.signOut();
  }

  // 2. Stop sync so nothing re-uploads while we wipe.
  // (dynamic import: syncBootstrap imports this module, a static import would be a cycle)
  const { stopSync } = await import('@/data/sync/syncBootstrap');
  stopSync();

  // 3. Purge all IndexedDB tables
  await Promise.all([
    wardrobeRepository.clear(),
    outfitRepository.clear(),
    memberRepository.clear(),
    householdRepository.clear(),
    blobRepository.clear(),
    db.syncQueue.clear(),
  ]);

  // Clear local storage and session markers
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.removeItem('auth_session');
      localStorage.removeItem('mock_users_db');
      localStorage.removeItem('ourcloset_primary_couple');
      localStorage.removeItem('ourcloset_active_mode');
    } catch {
      // Ignore
    }
  }
}

