import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { OurClosetDB } from '@/data/db';
import { MemberRepository } from '@/data/repositories/memberRepository';
import { FamilyMember } from '@/providers/HouseholdProvider';

const sampleMember1: FamilyMember = {
  id: 'm-01',
  name: 'Test Member 1',
  role: 'husband',
  hierarchyRole: 'head_of_household',
  closetCount: 15,
  privacyTier: 'PUBLIC',
  joinedAt: '2026-01-01',
};

const sampleMember2: FamilyMember = {
  id: 'm-02',
  name: 'Test Member 2',
  role: 'wife',
  hierarchyRole: 'spouse',
  closetCount: 20,
  privacyTier: 'PUBLIC',
  joinedAt: '2026-01-01',
};

describe('MemberRepository', () => {
  let testDb: OurClosetDB;
  let repo: MemberRepository;

  beforeEach(() => {
    testDb = new OurClosetDB(`test-members-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`);
    repo = new MemberRepository(testDb);
  });

  afterEach(async () => {
    await testDb.delete();
  });

  it('adds and manages household members', async () => {
    await repo.bulkAdd([sampleMember1, sampleMember2]);
    expect(await repo.count()).toBe(2);

    const member1 = await repo.getById('m-01');
    expect(member1?.name).toBe('Test Member 1');

    await repo.update('m-01', { closetCount: 18 });
    const updated = await repo.getById('m-01');
    expect(updated?.closetCount).toBe(18);

    // Toggle privacy
    expect(updated?.privacyTier).toBe('PUBLIC');
    await repo.togglePrivacy('m-01');
    const privateMember = await repo.getById('m-01');
    expect(privateMember?.privacyTier).toBe('PRIVATE');

    // Remove
    await repo.remove('m-02');
    expect(await repo.count()).toBe(1);
    expect(await repo.getById('m-02')).toBeUndefined();
  });
});

