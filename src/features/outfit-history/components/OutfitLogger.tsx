'use client';

import React, { useState } from 'react';
import { useOutfitHistory } from '../hooks/useOutfitHistory';
import { Button, Card } from '@/components';

export const OutfitLogger: React.FC = () => {
  const [eventContext, setEventContext] = useState('');
  const { addOutfit } = useOutfitHistory();

  const handleLog = () => {
    if (eventContext.trim()) {
      addOutfit({ eventContext, itemIds: [] });
      setEventContext('');
    }
  };

  return (
    <Card className="max-w-md mb-6">
      <h3 className="text-sm font-semibold text-slate-200 mb-2">Log Outfit Wear</h3>
      <input
        type="text"
        value={eventContext}
        onChange={(e) => setEventContext(e.target.value)}
        placeholder="Event context (e.g. Sarah's Wedding)"
        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 mb-3 focus:outline-none focus:border-indigo-500"
      />
      <Button onClick={handleLog} className="w-full">
        Log Outfit & Update Wear Counts
      </Button>
    </Card>
  );
};
