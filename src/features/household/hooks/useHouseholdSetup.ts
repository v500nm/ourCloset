'use client';

import { useState } from 'react';
import { HouseholdBond, HouseholdRole } from '../types/household.types';
import { createHousehold, joinHousehold } from '../services/householdService';

export function useHouseholdSetup() {
  const [householdName, setHouseholdName] = useState('The Smith Residence');
  const [role, setRole] = useState<HouseholdRole>('husband');
  const [inviteCode, setInviteCode] = useState('');
  const [activeBond, setActiveBond] = useState<HouseholdBond | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    const bond = await createHousehold({ householdName, role });
    setActiveBond(bond);
    setLoading(false);
  };

  const handleJoin = async () => {
    if (!inviteCode.trim()) return;
    setLoading(true);
    const bond = await joinHousehold({ inviteCode });
    setActiveBond(bond);
    setLoading(false);
  };

  return {
    householdName,
    setHouseholdName,
    role,
    setRole,
    inviteCode,
    setInviteCode,
    activeBond,
    loading,
    handleCreate,
    handleJoin,
  };
}
