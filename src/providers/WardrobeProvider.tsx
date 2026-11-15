'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { WardrobeItem } from '@/types';
import { wardrobeRepository } from '@/data/repositories/wardrobeRepository';
import { applyWeeklyReset } from '@/features/laundry/services/laundryReset';
import { requestStoragePersistence } from '@/data/storage/storageQuota';
import { seedSampleWardrobe } from '@/data/seed/sampleWardrobe';

interface WardrobeContextProps {
  items: WardrobeItem[];
  isLoading: boolean;
  addItem: (item: WardrobeItem) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  markItemsDirty: (ids: string[]) => Promise<void>;
  updateItemLaundryStatus: (id: string, status: WardrobeItem['laundry_status']) => Promise<void>;
  loadSampleWardrobe: () => Promise<void>;
}

const WardrobeContext = createContext<WardrobeContextProps | undefined>(undefined);

export const WardrobeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Reactive query from Dexie IndexedDB
  const liveItems = useLiveQuery(() => wardrobeRepository.getAll(), []);
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    // 1. Request persistent storage from browser
    requestStoragePersistence();

    // 2. Perform laundry reset calculation using pure helper
    const checkLaundryReset = async () => {
      try {
        const storedLastReset = typeof window !== 'undefined' ? localStorage.getItem('lastLaundryReset') : null;
        const lastResetDate = storedLastReset ? new Date(storedLastReset) : null;
        const now = new Date();

        const allCurrentItems = await wardrobeRepository.getAll();
        const resetResult = applyWeeklyReset(allCurrentItems, now, lastResetDate);

        if (resetResult.resetApplied) {
          const dirtyItemIds = allCurrentItems
            .filter(item => item.laundry_status === 'DIRTY')
            .map(item => item.id);

          for (const id of dirtyItemIds) {
            await wardrobeRepository.updateLaundryStatus(id, 'CLEAN');
          }
          if (typeof window !== 'undefined') {
            localStorage.setItem('lastLaundryReset', resetResult.newResetDate.toISOString());
          }
        }
      } catch (err) {
        console.warn('[WardrobeProvider] Weekly laundry check encountered error:', err);
      } finally {
        setHasInitialized(true);
      }
    };

    checkLaundryReset();
  }, []);

  const addItem = async (item: WardrobeItem) => {
    await wardrobeRepository.create(item);
  };

  const removeItem = async (id: string) => {
    await wardrobeRepository.delete(id);
  };

  const markItemsDirty = async (ids: string[]) => {
    await wardrobeRepository.markDirty(ids);
  };

  const updateItemLaundryStatus = async (id: string, status: WardrobeItem['laundry_status']) => {
    await wardrobeRepository.updateLaundryStatus(id, status);
  };

  const loadSampleWardrobe = async () => {
    await seedSampleWardrobe();
  };

  const items = liveItems || [];
  const isLoading = liveItems === undefined && !hasInitialized;

  return (
    <WardrobeContext.Provider
      value={{
        items,
        isLoading,
        addItem,
        removeItem,
        markItemsDirty,
        updateItemLaundryStatus,
        loadSampleWardrobe,
      }}
    >
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
