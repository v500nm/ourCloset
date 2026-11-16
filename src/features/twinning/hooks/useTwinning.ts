'use client';

import { useState, useEffect } from 'react';
import { TwinningTierOption } from '../types/twinning.types';
import { generateTwinningTiers, TwinningGenerationOptions } from '../services/twinningService';
import { trackPrivacyEvent } from '@/services/telemetry';

export function useTwinning(
  eventContext: string = "Sarah & Tariq's Sangeet Night",
  options?: TwinningGenerationOptions
) {
  const [tiers, setTiers] = useState<TwinningTierOption[]>([]);
  const [selectedTier, setSelectedTier] = useState<'subtle' | 'balanced' | 'direct'>('balanced');
  const [status, setStatus] = useState<'PENDING' | 'ACCEPTED' | 'DECLINED'>('PENDING');
  const [rerolls, setRerolls] = useState(2);
  const [loading, setLoading] = useState(true);

  const initiatorMemberId = options?.initiatorMemberId;
  const partnerMemberId = options?.partnerMemberId;

  useEffect(() => {
    generateTwinningTiers(eventContext, undefined, undefined, {
      initiatorMemberId,
      partnerMemberId,
    }).then((res) => {
      setTiers(res);
      setLoading(false);
      trackPrivacyEvent('outfit_generated', {
        tier_count: res.length,
      });
    });
  }, [eventContext, initiatorMemberId, partnerMemberId]);

  const handleAccept = () => {
    setStatus('ACCEPTED');
    trackPrivacyEvent('outfit_accepted', {
      selected_tier: selectedTier,
      rerolls_used: 2 - rerolls,
    });
  };

  const handleReroll = async () => {
    if (rerolls > 0) {
      setLoading(true);
      const remaining = rerolls - 1;
      setRerolls(remaining);
      trackPrivacyEvent('outfit_rerolled', {
        rerolls_remaining: remaining,
      });
      const res = await generateTwinningTiers(eventContext, undefined, undefined, options);
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
