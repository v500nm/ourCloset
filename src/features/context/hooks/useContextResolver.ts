'use client';

import { useState } from 'react';
import { ContextAttributes, ContextPreset, ActiveMode, EventSubContext } from '../types/context.types';
import { resolveContextFromFreeform, resolveContextFromPreset } from '../services/contextService';

export function useContextResolver() {
  const [mode, setMode] = useState<ActiveMode>({ type: 'solo', memberIds: ['m-adnan'] });
  const [selectedPreset, setSelectedPreset] = useState<ContextPreset>('Event');
  const [selectedSubPreset, setSelectedSubPreset] = useState<EventSubContext>('Sangeet');
  const [freeformText, setFreeformText] = useState('sunset beach cocktail, pastel modest vibes');
  const [resolvedContext, setResolvedContext] = useState<ContextAttributes | null>(null);
  const [loading, setLoading] = useState(false);

  const resolvePreset = async (preset: ContextPreset, subPreset?: EventSubContext) => {
    setLoading(true);
    setSelectedPreset(preset);
    if (subPreset) setSelectedSubPreset(subPreset);
    const res = await resolveContextFromPreset(preset, subPreset);
    setResolvedContext(res);
    setLoading(false);
  };

  const resolveFreeform = async (text: string) => {
    setLoading(true);
    setFreeformText(text);
    const res = await resolveContextFromFreeform(text);
    setResolvedContext(res);
    setLoading(false);
  };

  return {
    mode,
    setMode,
    selectedPreset,
    selectedSubPreset,
    freeformText,
    setFreeformText,
    resolvedContext,
    loading,
    resolvePreset,
    resolveFreeform,
  };
}
