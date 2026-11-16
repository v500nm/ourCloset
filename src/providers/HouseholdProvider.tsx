'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { FamilyHierarchyRole, HouseholdRole, FamilyMember } from '@/types';
import { memberRepository } from '@/data/repositories/memberRepository';
import { householdRepository } from '@/data/repositories/householdRepository';

export type { FamilyMember };

interface HouseholdContextProps {
  members: FamilyMember[];
  setMembers: React.Dispatch<React.SetStateAction<FamilyMember[]>>;
  addMember: (member: FamilyMember) => void;
  editMember: (id: string, updates: Partial<FamilyMember>) => void;
  togglePrivacy: (id: string) => void;
  removeMember: (id: string) => void;
  primaryCoupleIds: [string, string] | null;
  setPrimaryCouple: (id1: string, id2: string) => void;
  clearPrimaryCouple: () => void;
  twinningPair: [string, string] | null;
  setTwinningPair: (id1: string, id2: string) => void;
  clearTwinningPair: () => void;
}

const HouseholdContext = createContext<HouseholdContextProps | undefined>(undefined);

// Initial default household members for first run
export const DEFAULT_MEMBERS: FamilyMember[] = [
  {
    id: 'm-adnan',
    name: 'Adnan',
    role: 'husband',
    hierarchyRole: 'head_of_household',
    customRoleLabel: 'Husband',
    closetCount: 24,
    privacyTier: 'PUBLIC',
    joinedAt: '2026-01-15',
  },
  {
    id: 'm-armaan',
    name: 'Armaan',
    role: 'family_member',
    hierarchyRole: 'relative',
    customRoleLabel: 'Brother',
    closetCount: 12,
    privacyTier: 'PUBLIC',
    joinedAt: '2026-02-01',
  },
  {
    id: 'm-pappa',
    name: 'Pappa',
    role: 'family_member',
    hierarchyRole: 'parent_in_law',
    customRoleLabel: 'Father',
    closetCount: 10,
    privacyTier: 'PUBLIC',
    joinedAt: '2026-02-05',
  },
  {
    id: 'm-ammi',
    name: 'Ammi',
    role: 'family_member',
    hierarchyRole: 'parent_in_law',
    customRoleLabel: 'Mother',
    closetCount: 45,
    privacyTier: 'PUBLIC',
    joinedAt: '2026-02-05',
  },
];

export const HouseholdProvider: React.FC<{ children: ReactNode; initialMembers?: FamilyMember[] }> = ({
  children,
  initialMembers,
}) => {
  // If running in isolated demo mode (initialMembers provided per ADR-007), stay purely in-memory
  const isIsolatedDemo = !!initialMembers;
  const [isolatedMembers, setIsolatedMembers] = useState<FamilyMember[]>(initialMembers || DEFAULT_MEMBERS);
  const [isolatedCoupleIds, setIsolatedCoupleIds] = useState<[string, string] | null>(
    initialMembers && initialMembers.length >= 2 ? [initialMembers[0].id, initialMembers[1].id] : null
  );
  const [isolatedTwinningPair, setIsolatedTwinningPair] = useState<[string, string] | null>(null);

  // Production live query from IndexedDB
  const liveMembers = useLiveQuery(
    () => (isIsolatedDemo ? Promise.resolve(isolatedMembers) : memberRepository.getAll()),
    [isIsolatedDemo]
  );

  const [primaryCoupleIds, setPrimaryCoupleIdsState] = useState<[string, string] | null>(
    isIsolatedDemo ? isolatedCoupleIds : null
  );
  const [twinningPair, setTwinningPairState] = useState<[string, string] | null>(
    isIsolatedDemo ? isolatedTwinningPair : null
  );

  useEffect(() => {
    if (isIsolatedDemo) return;

    const initHousehold = async () => {
      const count = await memberRepository.count();
      if (count === 0) {
        await memberRepository.bulkAdd(DEFAULT_MEMBERS);
      }
      const couple = await householdRepository.getPrimaryCoupleIds();
      // Filter out any invalid or empty IDs
      if (couple && couple[0] && couple[1]) {
        setPrimaryCoupleIdsState(couple);
      } else {
        setPrimaryCoupleIdsState(null);
      }

      const twin = await householdRepository.getTwinningPairIds();
      if (twin && twin[0] && twin[1]) {
        setTwinningPairState(twin);
      } else {
        setTwinningPairState(null);
      }
    };

    initHousehold();
  }, [isIsolatedDemo]);

  const addMember = (member: FamilyMember) => {
    if (isIsolatedDemo) {
      setIsolatedMembers(prev => [...prev, member]);
    } else {
      memberRepository.add(member);
    }
  };

  const editMember = (id: string, updates: Partial<FamilyMember>) => {
    if (isIsolatedDemo) {
      setIsolatedMembers(prev => prev.map(m => (m.id === id ? { ...m, ...updates } : m)));
    } else {
      memberRepository.update(id, updates);
    }
  };

  const togglePrivacy = (id: string) => {
    if (isIsolatedDemo) {
      setIsolatedMembers(prev =>
        prev.map(m => (m.id === id ? { ...m, privacyTier: m.privacyTier === 'PUBLIC' ? 'PRIVATE' : 'PUBLIC' } : m))
      );
    } else {
      memberRepository.togglePrivacy(id);
    }
  };

  const removeMember = (id: string) => {
    if (isIsolatedDemo) {
      setIsolatedMembers(prev => prev.filter(m => m.id !== id));
      if (isolatedCoupleIds && (isolatedCoupleIds[0] === id || isolatedCoupleIds[1] === id)) {
        setIsolatedCoupleIds(null);
      }
      if (isolatedTwinningPair && (isolatedTwinningPair[0] === id || isolatedTwinningPair[1] === id)) {
        setIsolatedTwinningPair(null);
      }
    } else {
      memberRepository.remove(id);
      if (primaryCoupleIds && (primaryCoupleIds[0] === id || primaryCoupleIds[1] === id)) {
        clearPrimaryCouple();
      }
      if (twinningPair && (twinningPair[0] === id || twinningPair[1] === id)) {
        clearTwinningPair();
      }
    }
  };

  const setPrimaryCouple = (id1: string, id2: string) => {
    if (!id1 || !id2 || id1 === id2) return;
    const couple: [string, string] = [id1, id2];
    if (isIsolatedDemo) {
      setIsolatedCoupleIds(couple);
    } else {
      setPrimaryCoupleIdsState(couple);
      householdRepository.setPrimaryCoupleIds(couple);
    }
  };

  const clearPrimaryCouple = () => {
    if (isIsolatedDemo) {
      setIsolatedCoupleIds(null);
    } else {
      setPrimaryCoupleIdsState(null);
      householdRepository.clearPrimaryCoupleIds();
    }
  };

  const setTwinningPair = (id1: string, id2: string) => {
    if (!id1 || !id2 || id1 === id2) return;
    const pair: [string, string] = [id1, id2];
    if (isIsolatedDemo) {
      setIsolatedTwinningPair(pair);
    } else {
      setTwinningPairState(pair);
      householdRepository.setTwinningPairIds(pair);
    }
  };

  const clearTwinningPair = () => {
    if (isIsolatedDemo) {
      setIsolatedTwinningPair(null);
    } else {
      setTwinningPairState(null);
      householdRepository.clearTwinningPairIds();
    }
  };

  const members = isIsolatedDemo ? isolatedMembers : liveMembers || DEFAULT_MEMBERS;

  // setMembers compat wrapper
  const setMembers: React.Dispatch<React.SetStateAction<FamilyMember[]>> = value => {
    if (isIsolatedDemo) {
      setIsolatedMembers(value);
    } else {
      const newMembers = typeof value === 'function' ? value(members) : value;
      memberRepository.bulkAdd(newMembers);
    }
  };

  return (
    <HouseholdContext.Provider
      value={{
        members,
        setMembers,
        addMember,
        editMember,
        togglePrivacy,
        removeMember,
        primaryCoupleIds: isIsolatedDemo ? isolatedCoupleIds : primaryCoupleIds,
        setPrimaryCouple,
        clearPrimaryCouple,
        twinningPair: isIsolatedDemo ? isolatedTwinningPair : twinningPair,
        setTwinningPair,
        clearTwinningPair,
      }}
    >
      {children}
    </HouseholdContext.Provider>
  );
};

export const useHousehold = () => {
  const context = useContext(HouseholdContext);
  if (context === undefined) {
    throw new Error('useHousehold must be used within a HouseholdProvider');
  }
  return context;
};
