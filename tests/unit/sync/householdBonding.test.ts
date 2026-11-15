import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateHouseholdInvite,
  joinHouseholdByInvite,
  leaveHousehold,
  createHousehold,
} from '@/features/household/services/householdService';
import { householdRepository } from '@/data/repositories/householdRepository';
import { memberRepository } from '@/data/repositories/memberRepository';
import { wardrobeRepository } from '@/data/repositories/wardrobeRepository';

describe('Household Bonding & Invites', () => {
  beforeEach(async () => {
    await householdRepository.clear();
    await memberRepository.clear();
    await wardrobeRepository.clear();
  });

  it('generates an uppercase 6-character invite code expiring in 24 hours', async () => {
    await createHousehold({ householdName: 'Armaan & Sarah', role: 'partner' }, 'user-armaan');

    const invite = await generateHouseholdInvite();
    expect(invite.code).toMatch(/^[A-Z0-9]{6}$/);

    const expiresAt = new Date(invite.expiresAt).getTime();
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;

    expect(expiresAt).toBeGreaterThan(now);
    expect(expiresAt - now).toBeLessThanOrEqual(twentyFourHours + 1000);
  });

  it('accepts valid invite code and forms active household bond', async () => {
    await createHousehold({ householdName: 'Armaan & Sarah', role: 'partner' }, 'user-armaan');
    const invite = await generateHouseholdInvite();

    const joinResult = await joinHouseholdByInvite(
      invite.code,
      'user-sarah',
      'Sarah',
      'partner'
    );

    expect(joinResult.success).toBe(true);
    expect(joinResult.household.sync_status).toBe('ACTIVE');

    // Verify members
    const members = await memberRepository.getAll();
    expect(members.length).toBe(2);
    expect(members.some((m) => m.id === 'user-sarah')).toBe(true);
    expect(members.some((m) => m.id === 'user-armaan')).toBe(true);

    // Verify couple IDs set
    const coupleIds = await householdRepository.getPrimaryCoupleIds();
    expect(coupleIds).toEqual(['user-armaan', 'user-sarah']);

    // Verify invite code is consumed (single-use)
    await expect(
      joinHouseholdByInvite(invite.code, 'user-intruder', 'Intruder', 'relative')
    ).rejects.toThrow('Invalid invite code');
  });

  it('rejects expired invite codes', async () => {
    const household = await createHousehold(
      { householdName: 'Expired Test', role: 'partner' },
      'user-1'
    );

    // Manually set past expiration date (expired 2 hours ago)
    await householdRepository.saveHousehold({
      ...household,
      invite_code: 'EXP999',
      invite_expires_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    });

    await expect(
      joinHouseholdByInvite('EXP999', 'user-partner', 'Partner')
    ).rejects.toThrow(/expired/i);
  });

  it('leaving household unlinks partner while preserving individual wardrobe items', async () => {
    await createHousehold({ householdName: 'Bond', role: 'partner' }, 'user-armaan');
    const invite = await generateHouseholdInvite();
    await joinHouseholdByInvite(invite.code, 'user-sarah', 'Sarah');

    // Add personal wardrobe item for Sarah
    await wardrobeRepository.create({
      id: 'sarahs-dress',
      user_id: 'user-sarah',
      title: 'Emerald Satin Slip Dress',
      category: 'traditional_combo',
      cultural_style: 'western',
      formality_level: 4,
      image_url: 'data:image/webp;base64,mock',
      season_tags: ['all-season'],
      wear_count: 3,
      laundry_status: 'CLEAN',
      privacy_tier: 'PUBLIC',
      created_at: new Date().toISOString(),
    });

    // Sarah leaves household
    await leaveHousehold('user-sarah');

    const membersAfter = await memberRepository.getAll();
    expect(membersAfter.length).toBe(1);
    expect(membersAfter[0].id).toBe('user-armaan');

    const householdAfter = await householdRepository.getHousehold();
    expect(householdAfter?.sync_status).toBe('PAUSED');

    // Personal wardrobe item MUST still exist in database
    const sarahsItem = await wardrobeRepository.getById('sarahs-dress');
    expect(sarahsItem).toBeDefined();
    expect(sarahsItem?.title).toBe('Emerald Satin Slip Dress');
  });
});

