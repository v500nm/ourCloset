'use client';

import { useState, useEffect } from 'react';
import { OutfitHistory, LogOutfitParams } from '../types/history.types';
import { fetchOutfitHistory, logOutfitWear } from '../services/historyService';

export function useOutfitHistory() {
  const [history, setHistory] = useState<OutfitHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOutfitHistory().then((res) => {
      setHistory(res);
      setLoading(false);
    });
  }, []);

  const addOutfit = async (params: LogOutfitParams) => {
    const newEntry = await logOutfitWear(params);
    if (newEntry) setHistory((prev) => [newEntry, ...prev]);
  };

  return { history, loading, addOutfit };
}
