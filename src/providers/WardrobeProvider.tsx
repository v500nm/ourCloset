'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { WardrobeItem } from '@/types';
import { MOCK_WARDROBE } from '@/lib/mockData';

interface WardrobeContextProps {
  items: WardrobeItem[];
  addItem: (item: WardrobeItem) => void;
  removeItem: (id: string) => void;
  markItemsDirty: (ids: string[]) => void;
  updateItemLaundryStatus: (id: string, status: WardrobeItem['laundry_status']) => void;
}

const WardrobeContext = createContext<WardrobeContextProps | undefined>(undefined);

export const WardrobeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<WardrobeItem[]>(MOCK_WARDROBE);
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    // 1. Get current time
    const now = new Date();
    
    // 2. Check last reset time from localStorage
    const storedLastReset = localStorage.getItem('lastLaundryReset');
    let lastResetDate = storedLastReset ? new Date(storedLastReset) : null;

    // 3. Find when the most recent Sunday 11:59 PM was
    // JS Date getDay(): 0 = Sunday, 1 = Monday, etc.
    const mostRecentSunday = new Date(now);
    mostRecentSunday.setDate(now.getDate() - now.getDay()); // Go back to Sunday
    mostRecentSunday.setHours(23, 59, 59, 999); // End of Day

    // If today is Sunday but before 11:59 PM, the "most recent" reset window was actually LAST Sunday.
    if (now.getDay() === 0 && now.getTime() < mostRecentSunday.getTime()) {
      mostRecentSunday.setDate(mostRecentSunday.getDate() - 7);
    }

    // 4. If we have no record, or the last reset was BEFORE the most recent Sunday EOD, reset clothes!
    if (!lastResetDate || lastResetDate.getTime() < mostRecentSunday.getTime()) {
      setItems(prev => prev.map(item => {
        if (item.laundry_status === 'DIRTY') {
          return { ...item, laundry_status: 'CLEAN' };
        }
        return item;
      }));
      // Record the new reset time (as the most recent Sunday to prevent re-runs until next week)
      localStorage.setItem('lastLaundryReset', mostRecentSunday.toISOString());
      console.log('🧺 [WardrobeProvider] Sunday EOD Passed: All dirty clothes have been washed and reset to CLEAN!');
    }

    setHasInitialized(true);
  }, []);

  const addItem = (item: WardrobeItem) => {
    setItems((prev) => [item, ...prev]);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const markItemsDirty = (ids: string[]) => {
    setItems((prev) =>
      prev.map((item) =>
        ids.includes(item.id) ? { ...item, laundry_status: 'DIRTY', last_worn_at: new Date().toISOString() } : item
      )
    );
  };

  const updateItemLaundryStatus = (id: string, status: WardrobeItem['laundry_status']) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, laundry_status: status } : item
      )
    );
  };

  return (
    <WardrobeContext.Provider value={{ items, addItem, removeItem, markItemsDirty, updateItemLaundryStatus }}>
      {children}
    </WardrobeContext.Provider>
  );
};

export const useWardrobe = () => {
  const context = useContext(WardrobeContext);
  if (context === undefined) {
    throw new Error('useWardrobe must be used within a WardrobeProvider');
  }
  return context;
};
