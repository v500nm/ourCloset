'use client';

import { useState, useEffect } from 'react';
import { TwinningTierOption } from '../types/twinning.types';
import { generateTwinningTiers } from '../services/twinningService';

export function useTwinning(eventContext: string = 'Sarah & Tariq\'s Sangeet Night') {
  const [tiers, setTiers] = useState<TwinningTierOption[]>([]);
  const [selectedTier, setSelectedTier] = useState<'subtle' | 'balanced' | 'direct'>('balanced');
  const [status, setStatus] = useState<'PENDING' | 'ACCEPTED' | 'DECLINED'>('PENDING');
  const [rerolls, setRerolls] = useState(2);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    generateTwinningTiers(eventContext).then((res) => {
      setTiers(res);
      setLoading(false);
    });
  }, [eventContext]);

  const handleAccept = () => {
    setStatus('ACCEPTED');
  };

  const handleReroll = async () => {
    if (rerolls > 0) {
      setLoading(true);
      setRerolls((prev) => prev - 1);
      const res = await generateTwinningTiers(eventContext);
      setTiers(res);
      setLoading(false);
    }
  };

  return {
    tiers,
    selectedTier,
    setSelectedTier,
    status,
    rerolls,
    loading,
    handleAccept,
    handleReroll,
  };
}
