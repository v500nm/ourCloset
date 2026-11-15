import { describe, it, expect, beforeEach } from 'vitest';
import {
  migrateGuestDataToUser,
  exportAllUserData,
  deleteUserAccount,
} from '@/services/accountService';
import { wardrobeRepository } from '@/data/repositories/wardrobeRepository';
import { outfitRepository } from '@/data/repositories/outfitRepository';
import { memberRepository } from '@/data/repositories/memberRepository';
import { householdRepository } from '@/data/repositories/householdRepository';
import { blobRepository } from '@/data/repositories/blobRepository';

describe('Supabase Auth & Guest Store Migration', () => {
  beforeEach(async () => {
    await wardrobeRepository.clear();
    await outfitRepository.clear();
    await memberRepository.clear();
    await householdRepository.clear();
    await blobRepository.clear();
  });

  it('migrates guest wardrobe items and outfit logs to authenticated user ID', async () => {
    // 1. Seed guest items
    await wardrobeRepository.create({
      id: 'guest-item-1',
      user_id: 'guest',
      title: 'Linen Kurta',
      category: 'traditional_combo',
      cultural_style: 'indian_traditional',
      formality_level: 3,
      image_url: 'data:image/webp;base64,mock',
      season_tags: ['summer'],
      wear_count: 1,
      laundry_status: 'CLEAN',
      privacy_tier: 'PUBLIC',
      created_at: new Date().toISOString(),
    });

    await wardrobeRepository.create({
      id: 'guest-item-2',
      user_id: 'user-current',
      title: 'Oxford Shirt',
      category: 'shirt',
      cultural_style: 'western',
      formality_level: 3,
      image_url: 'data:image/webp;base64,mock2',
      season_tags: ['all-season'],
      wear_count: 0,
      laundry_status: 'CLEAN',
      privacy_tier: 'PUBLIC',
      created_at: new Date().toISOString(),
    });

    // 2. Seed guest outfit log
    await outfitRepository.logOutfit({
      worn_by: 'guest',
      worn_at: new Date().toISOString(),
      item_ids: ['guest-item-1'],
      event_context: 'Festival',
    });

    // 3. Seed guest member
    await memberRepository.add({
      id: 'user-current',
      name: 'Guest Stylist',
      role: 'partner',
      hierarchyRole: 'head_of_household',
      customRoleLabel: 'Stylist',
      closetCount: 2,
      privacyTier: 'PUBLIC',
      joinedAt: new Date().toISOString(),
    });

    // Run migration upon user sign up / sign in
    const authUserId = 'usr-supabase-9988';
    const summary = await migrateGuestDataToUser(authUserId);

    expect(summary.itemsMigrated).toBe(2);
    expect(summary.outfitsMigrated).toBe(1);
    expect(summary.membersMigrated).toBe(1);
    expect(summary.newUserId).toBe(authUserId);

    // Verify items are now owned by authenticated user
    const item1 = await wardrobeRepository.getById('guest-item-1');
    const item2 = await wardrobeRepository.getById('guest-item-2');
    expect(item1?.user_id).toBe(authUserId);
    expect(item2?.user_id).toBe(authUserId);

    // Verify outfit logs belong to new user
    const outfits = await outfitRepository.getAll();
    expect(outfits[0].worn_by).toBe(authUserId);

    // Verify member is re-keyed
    const member = await memberRepository.getById(authUserId);
    expect(member).toBeDefined();
    expect(member?.name).toBe('Guest Stylist');
  });

  it('exports complete user data bundle in GDPR-compliant JSON', async () => {
    await wardrobeRepository.create({
      id: 'item-exp',
      user_id: 'usr-1',
      title: 'Exported Blazer',
      category: 'suit',
      cultural_style: 'western',
      formality_level: 4,
      image_url: 'https://example.com/img.jpg',
      season_tags: ['all-season'],
      wear_count: 2,
      laundry_status: 'CLEAN',
      privacy_tier: 'PUBLIC',
      created_at: new Date().toISOString(),
    });

    const exportBundle = await exportAllUserData('usr-1');
    expect(exportBundle.version).toBe('1.0.0');
    expect(exportBundle.userId).toBe('usr-1');
    expect(exportBundle.wardrobeItems.length).toBe(1);
    expect(exportBundle.exportedAt).toBeDefined();
  });

  it('purges all local database stores upon account deletion', async () => {
    await wardrobeRepository.create({
      id: 'del-item',
      user_id: 'usr-del',
      title: 'Delete Me',
      category: 'shirt',
      cultural_style: 'western',
      formality_level: 2,
      image_url: 'https://example.com/img.jpg',
      season_tags: ['summer'],
      wear_count: 0,
      laundry_status: 'CLEAN',
      privacy_tier: 'PUBLIC',
      created_at: new Date().toISOString(),
    });

    expect(await wardrobeRepository.count()).toBe(1);

    await deleteUserAccount('usr-del');

    expect(await wardrobeRepository.count()).toBe(0);
    expect(await outfitRepository.count()).toBe(0);
    expect(await memberRepository.count()).toBe(0);
  });
});
