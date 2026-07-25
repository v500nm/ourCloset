'use client';

import React from 'react';
import { useHousehold } from '../hooks/useHousehold';
import { Button, Card, Badge } from '@/components';

export const HouseholdBonding: React.FC = () => {
  const { bond, loading } = useHousehold();

  if (loading) return <div className="text-xs text-slate-400">Loading household status...</div>;

  return (
    <Card className="max-w-md mb-6">
      <h3 className="text-sm font-semibold text-slate-200 mb-2">Household & Twinning Setup</h3>
      {bond ? (
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-300">Active Household:</span>
          <Badge variant="clean">{bond.household_type.toUpperCase()} MODE</Badge>
        </div>
      ) : (
        <div>
          <p className="text-xs text-slate-400 mb-3">No active household bond. Pair with your partner or family member.</p>
          <Button variant="outline" className="w-full text-xs">
            Link Household Member
          </Button>
        </div>
      )}
    </Card>
  );
};
