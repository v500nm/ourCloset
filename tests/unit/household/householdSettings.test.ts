import { describe, it, expect, beforeEach } from 'vitest';
import { memberRepository } from '@/data/repositories/memberRepository';
import { householdRepository } from '@/data/repositories/householdRepository';
import { FamilyMember } from '@/providers/HouseholdProvider';

describe('Household Settings & Coordination Management', () => {
  beforeEach(async () => {
    await memberRepository.clear();
    await householdRepository.clear();
    await householdRepository.clearPrimaryCoupleIds();
    await householdRepository.clearTwinningPairIds();
  });

  const memberA: FamilyMember = {
    id: 'm-member-a',
    name: 'Adnan',
    role: 'husband',
    hierarchyRole: 'head_of_household',
    customRoleLabel: 'Husband',
    closetCount: 20,
    privacyTier: 'PUBLIC',
    joinedAt: '2026-01-01',
  };

  const memberB: FamilyMember = {
    id: 'm-member-b',
    name: 'Armaan',
    role: 'family_member',
    hierarchyRole: 'relative',
    customRoleLabel: 'Brother',
    closetCount: 15,
    privacyTier: 'PUBLIC',
    joinedAt: '2026-01-02',
  };

  const memberC: FamilyMember = {
    id: 'm-member-c',
    name: 'Farhan',
    role: 'family_member',
    hierarchyRole: 'relative',
    customRoleLabel: 'Cousin',
    closetCount: 10,
    privacyTier: 'PRIVATE',
    joinedAt: '2026-01-03',
  };

  it('supports adding and editing members in repository', async () => {
    await memberRepository.add(memberA);
    expect(await memberRepository.count()).toBe(1);

    // Edit member
    await memberRepository.update('m-member-a', {
      name: 'Adnan S.',
      customRoleLabel: 'Lead Curator',
      privacyTier: 'PRIVATE',
    });

    const updated = await memberRepository.getById('m-member-a');
    expect(updated?.name).toBe('Adnan S.');
    expect(updated?.customRoleLabel).toBe('Lead Curator');
    expect(updated?.privacyTier).toBe('PRIVATE');
  });

  it('supports removing a member from household', async () => {
    await memberRepository.bulkAdd([memberA, memberB]);
    expect(await memberRepository.count()).toBe(2);

    await memberRepository.remove('m-member-b');
    expect(await memberRepository.count()).toBe(1);
    expect(await memberRepository.getById('m-member-b')).toBeUndefined();
  });

  it('manages couple setting options correctly', async () => {
    await memberRepository.bulkAdd([memberA, memberB]);

    // Set couple
    await householdRepository.setPrimaryCoupleIds(['m-member-a', 'm-member-b']);
    const couple = await householdRepository.getPrimaryCoupleIds();
    expect(couple).toEqual(['m-member-a', 'm-member-b']);

    // Clear couple
    await householdRepository.clearPrimaryCoupleIds();
    const cleared = await householdRepository.getPrimaryCoupleIds();
    expect(cleared).toBeNull();
  });

  it('manages twinning pairing ("twinning with whom") settings', async () => {
    await memberRepository.bulkAdd([memberA, memberB, memberC]);

    // Set twinning pair: Adnan twinning with Armaan
    await householdRepository.setTwinningPairIds(['m-member-a', 'm-member-b']);
    let twinPair = await householdRepository.getTwinningPairIds();
    expect(twinPair).toEqual(['m-member-a', 'm-member-b']);

    // Reconfigure twinning pair: Adnan twinning with Farhan
    await householdRepository.setTwinningPairIds(['m-member-a', 'm-member-c']);
    twinPair = await householdRepository.getTwinningPairIds();
    expect(twinPair).toEqual(['m-member-a', 'm-member-c']);

    // Clear twinning pair
    await householdRepository.clearTwinningPairIds();
    expect(await householdRepository.getTwinningPairIds()).toBeNull();
  });
});

