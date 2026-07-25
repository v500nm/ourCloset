'use client';

import { useState } from 'react';
import { TravelCapsuleResult, TravelParams } from '../types/travel.types';
import { generateCapsule } from '../services/travelService';

export function useTravelPlanner() {
  const [params, setParams] = useState<TravelParams>({
    destination: 'Kyoto, Japan',
    durationDays: 7,
    season: 'Spring',
    culturalContext: 'western',
  });

  const [result, setResult] = useState<TravelCapsuleResult | null>(null);
  const [activeTab, setActiveTab] = useState<'capsule' | 'combinations' | 'checklist'>('capsule');
  const [loading, setLoading] = useState(false);

  const runPlanner = async () => {
    setLoading(true);
    const res = await generateCapsule(params);
    setResult(res);
    setLoading(false);
  };

  const toggleChecklist = (itemId: string) => {
    if (!result) return;
    setResult({
      ...result,
      packingChecklist: result.packingChecklist.map((c) =>
        c.item.id === itemId ? { ...c, packed: !c.packed } : c
      ),
    });
  };

  return {
    params,
    setParams,
    result,
    activeTab,
    setActiveTab,
    loading,
    runPlanner,
    toggleChecklist,
  };
}
