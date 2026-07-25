import { HouseholdBond, HouseholdRole, HouseholdType, Profile } from '@/types';

export interface CreateHouseholdParams {
  householdName: string;
  role: HouseholdRole;
}

export interface JoinHouseholdParams {
  inviteCode: string;
}

export type { HouseholdBond, HouseholdRole, HouseholdType, Profile };
