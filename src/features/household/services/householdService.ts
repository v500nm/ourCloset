/**
 * Household Bonding & Invite Service
 * Per Claude Phase Plan §3 Phase 5:
 * - Single-use expiring invite code generation (6-char alphanumeric, 24h expiration).
 * - Joining household pairs partners and grants partner visibility over PUBLIC items.
 * - Leaving / dissolving bonds unlinks household while strictly preserving personal items.
 */

import { CreateHouseholdParams, HouseholdBond, HouseholdRole } from '../types/household.types';
import { householdRepository } from '@/data/repositories/householdRepository';
import { memberRepository } from '@/data/repositories/memberRepository';

export interface InviteCodeResult {
  code: string;
  expiresAt: string;
  householdId: string;
}

/**
 * Generates an uppercase 6-character alphanumeric invite code with 24-hour expiration.
 */
export function generateAlphanumericCode(length = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid ambiguous 0, O, 1, I
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Fetches the user's active household bond.
 */
export async function fetchUserHousehold(): Promise<HouseholdBond | null> {
  const household = await householdRepository.getHousehold();
  return household || null;
}

/**
 * Creates a new household bond and assigns the creator role.
 */
export async function createHousehold(
  params: CreateHouseholdParams,
  creatorId = 'user-current'
): Promise<HouseholdBond> {
  const id = 'primary-household';
  const now = new Date().toISOString();

  const bond: HouseholdBond = {
    id,
    household_type: 'couple',
    sync_status: 'ACTIVE',
    created_at: now,
  };

  await householdRepository.saveHousehold(bond);

  // Add creator to member repository
  await memberRepository.add({
    id: creatorId,
    name: params.householdName || 'Partner 1',
    role: params.role,
    hierarchyRole: 'head_of_household',
    customRoleLabel: params.role,
    closetCount: 0,
    privacyTier: 'PUBLIC',
    joinedAt: now,
  });

  return bond;
}

/**
 * Generates an expiring single-use invite code for a household.
 */
export async function generateHouseholdInvite(
  householdId?: string,
  expiresInHours = 24
): Promise<InviteCodeResult> {
  let household = await householdRepository.getHousehold();
  if (!household) {
    // Auto-create household if none exists yet
    household = await createHousehold({ householdName: 'Our Household', role: 'partner' });
  }

  const code = generateAlphanumericCode(6);
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString();

  const updatedHousehold: HouseholdBond = {
    ...household,
    invite_code: code,
    invite_expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  };

  await householdRepository.saveHousehold(updatedHousehold);

  return {
    code,
    expiresAt,
    householdId: household.id,
  };
}

/**
 * Accepts an invite code, verifies expiration, and joins partner to household.
 */
export async function joinHouseholdByInvite(
  inviteCode: string,
  joiningUserId = 'partner-user',
  joiningUserName = 'Partner',
  role: HouseholdRole = 'partner'
): Promise<{ success: boolean; household: HouseholdBond }> {
  const cleanCode = inviteCode.trim().toUpperCase();

  // 1. Locate household with matching invite code
  let household = await householdRepository.getByInviteCode(cleanCode);

  // Fallback to primary household if stored there
  if (!household) {
    const current = await householdRepository.getHousehold();
    if (current && current.invite_code === cleanCode) {
      household = current;
    }
  }

  if (!household) {
    throw new Error('Invalid invite code. Household not found.');
  }

  // 2. Validate expiration
  if (household.invite_expires_at) {
    const expires = new Date(household.invite_expires_at).getTime();
    if (Date.now() > expires) {
      throw new Error('This invite code has expired. Please ask your partner to generate a new code.');
    }
  }

  // 3. Mark code as redeemed (single-use)
  const updatedHousehold: HouseholdBond = {
    ...household,
    sync_status: 'ACTIVE',
    invite_code: undefined,
    invite_expires_at: undefined,
    updated_at: new Date().toISOString(),
  };

  await householdRepository.saveHousehold(updatedHousehold);

  // 4. Add joining member to roster
  await memberRepository.add({
    id: joiningUserId,
    name: joiningUserName,
    role,
    hierarchyRole: 'spouse',
    customRoleLabel: role,
    closetCount: 0,
    privacyTier: 'PUBLIC',
    joinedAt: new Date().toISOString(),
  });

  // Set primary couple IDs
  const allMembers = await memberRepository.getAll();
  if (allMembers.length >= 2) {
    await householdRepository.setPrimaryCoupleIds([allMembers[0].id, allMembers[1].id]);
  }

  return { success: true, household: updatedHousehold };
}

/**
 * Backward-compatible joinHousehold wrapper.
 */
export async function joinHousehold(params: { inviteCode: string }): Promise<HouseholdBond> {
  const res = await joinHouseholdByInvite(params.inviteCode);
  return res.household;
}

/**
 * Leaves household: unlinks partner relationship while preserving personal wardrobe items.
 */
export async function leaveHousehold(userId: string): Promise<void> {
  const household = await householdRepository.getHousehold();
  if (household) {
    // Pause sync when a partner leaves
    await householdRepository.saveHousehold({
      ...household,
      sync_status: 'PAUSED',
      updated_at: new Date().toISOString(),
    });
  }

  await memberRepository.remove(userId);
}

/**
 * Dissolves household completely: removes bond and pauses partner sync.
 */
export async function dissolveHousehold(): Promise<void> {
  const household = await householdRepository.getHousehold();
  if (household) {
    await householdRepository.deleteHousehold(household.id);
  }
}
