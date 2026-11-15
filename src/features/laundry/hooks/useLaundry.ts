'use client';

import { useState } from 'react';
import { LaundryFilterTab, LaundryStatus } from '../types/laundry.types';
import { calculateLaundrySummary } from '../services/laundryService';
import { useWardrobe } from '@/providers/WardrobeProvider';

export function useLaundry() {
  const { items, updateItemLaundryStatus } = useWardrobe();
  const [activeTab, setActiveTab] = useState<LaundryFilterTab>('ALL');

  const summary = calculateLaundrySummary(items);

  const filteredItems = items.filter((item) => {
    if (activeTab === 'DIRTY_ONLY') return item.laundry_status === 'DIRTY' || item.laundry_status === 'IN_WASH';
    if (activeTab === 'DRY_CLEANERS') return item.laundry_status === 'DRY_CLEANING';
    return true;
  });

  const setStatus = (itemId: string, newStatus: LaundryStatus) => {
    updateItemLaundryStatus(itemId, newStatus);
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
