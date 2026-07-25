import { CreateHouseholdParams, HouseholdBond, JoinHouseholdParams } from '../types/household.types';

export async function fetchUserHousehold(): Promise<HouseholdBond | null> {
  return {
    id: 'h-bonded-101',
    household_type: 'couple',
    sync_status: 'ACTIVE',
    created_at: '2026-01-15T08:00:00Z',
  };
}

export async function createHousehold(params: CreateHouseholdParams): Promise<HouseholdBond> {
  return {
    id: `h-${Date.now().toString().slice(-4)}`,
    household_type: 'couple',
    sync_status: 'ACTIVE',
    created_at: new Date().toISOString(),
  };
}

export async function joinHousehold(params: JoinHouseholdParams): Promise<HouseholdBond> {
  return {
    id: 'h-bonded-101',
    household_type: 'couple',
    sync_status: 'ACTIVE',
    created_at: new Date().toISOString(),
  };
}
