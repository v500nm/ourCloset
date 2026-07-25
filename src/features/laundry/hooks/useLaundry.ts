'use client';

import { useState } from 'react';
import { LaundryFilterTab, LaundryStatus, WardrobeItem } from '../types/laundry.types';
import { MOCK_WARDROBE } from '@/lib/mockData';
import { calculateLaundrySummary } from '../services/laundryService';

export function useLaundry() {
  const [items, setItems] = useState<WardrobeItem[]>(MOCK_WARDROBE);
  const [activeTab, setActiveTab] = useState<LaundryFilterTab>('ALL');

  const summary = calculateLaundrySummary(items);

  const filteredItems = items.filter((item) => {
    if (activeTab === 'DIRTY_ONLY') return item.laundry_status === 'DIRTY' || item.laundry_status === 'IN_WASH';
    if (activeTab === 'DRY_CLEANERS') return item.laundry_status === 'DRY_CLEANING';
    return true;
  });

  const setStatus = (itemId: string, newStatus: LaundryStatus) => {
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, laundry_status: newStatus } : i))
    );
  };

  return {
    items: filteredItems,
    allItems: items,
    activeTab,
    setActiveTab,
    summary,
    setStatus,
  };
}
