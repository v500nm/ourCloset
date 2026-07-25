'use client';

import { useState, useEffect } from 'react';
import { WardrobeItem, CulturalStyle, ItemCategory, LaundryStatus } from '@/types';
import { useWardrobe } from '@/providers/WardrobeProvider';

export function useWardrobeItems(initialStyle: CulturalStyle = 'western') {
  const { items, addItem, removeItem, updateItemLaundryStatus } = useWardrobe();
  const [selectedStyle, setSelectedStyle] = useState<CulturalStyle>(initialStyle);
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory | 'all'>('all');
  const [laundryFilter, setLaundryFilter] = useState<'ALL' | 'DIRTY_ONLY' | 'DRY_CLEANING'>('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const filteredItems = items.filter((item) => {
    const matchesStyle = selectedStyle ? item.cultural_style === selectedStyle : true;
    const matchesCategory = selectedCategory === 'all' ? true : item.category === selectedCategory;

    if (laundryFilter === 'DIRTY_ONLY') {
      return item.laundry_status === 'DIRTY' || item.laundry_status === 'IN_WASH';
    }
    if (laundryFilter === 'DRY_CLEANING') {
      return item.laundry_status === 'DRY_CLEANING';
    }
    return matchesStyle && matchesCategory;
  });



  return {
    items: filteredItems,
    allItems: items,
    selectedStyle,
    setSelectedStyle,
    selectedCategory,
    setSelectedCategory,
    laundryFilter,
    setLaundryFilter,
    addItem,
    removeItem,
    updateItemLaundryStatus,
    loading,
  };
}
