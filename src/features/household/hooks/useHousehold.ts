'use client';

import { useState, useEffect } from 'react';
import { HouseholdBond } from '../types/household.types';
import { fetchUserHousehold } from '../services/householdService';

export function useHousehold() {
  const [bond, setBond] = useState<HouseholdBond | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserHousehold().then((res: HouseholdBond | null) => {
      setBond(res);
      setLoading(false);
    });
  }, []);

  return { bond, loading };
}
