'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { FamilyHierarchyRole, HouseholdRole } from '@/types';
import { memberRepository } from '@/data/repositories/memberRepository';
import { householdRepository } from '@/data/repositories/householdRepository';

export interface FamilyMember {
  id: string;
  name: string;
  role: HouseholdRole;
  hierarchyRole: FamilyHierarchyRole;
  customRoleLabel?: string;
  closetCount: number;
  privacyTier: 'PUBLIC' | 'PRIVATE';
  joinedAt: string;
}

interface HouseholdContextProps {
  members: FamilyMember[];
  setMembers: React.Dispatch<React.SetStateAction<FamilyMember[]>>;
  addMember: (member: FamilyMember) => void;
  togglePrivacy: (id: string) => void;
  removeMember: (id: string) => void;
  primaryCoupleIds: [string, string] | null;
  setPrimaryCouple: (id1: string, id2: string) => void;
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
    initialMembers && initialMembers.length >= 2 ? [initialMembers[0].id, initialMembers[1].id] : ['m-adnan', 'm-']
  );

  // Production live query from IndexedDB
  const liveMembers = useLiveQuery(
    () => (isIsolatedDemo ? Promise.resolve(isolatedMembers) : memberRepository.getAll()),
    [isIsolatedDemo]
  );

  const [primaryCoupleIds, setPrimaryCoupleIdsState] = useState<[string, string] | null>(
    isIsolatedDemo ? isolatedCoupleIds : null
  );

  useEffect(() => {
    if (isIsolatedDemo) return;

    const initHousehold = async () => {
      const count = await memberRepository.count();
      if (count === 0) {
        await memberRepository.bulkAdd(DEFAULT_MEMBERS);
        await householdRepository.setPrimaryCoupleIds(['m-adnan', 'm-']);
        setPrimaryCoupleIdsState(['m-adnan', 'm-']);
      } else {
        const couple = await householdRepository.getPrimaryCoupleIds();
        setPrimaryCoupleIdsState(couple || ['m-adnan', 'm-']);
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
    } else {
      memberRepository.remove(id);
    }
  };

  const setPrimaryCouple = (id1: string, id2: string) => {
    const couple: [string, string] = [id1, id2];
    if (isIsolatedDemo) {
      setIsolatedCoupleIds(couple);
    } else {
      setPrimaryCoupleIdsState(couple);
      householdRepository.setPrimaryCoupleIds(couple);
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
        togglePrivacy,
        removeMember,
        primaryCoupleIds: isIsolatedDemo ? isolatedCoupleIds : primaryCoupleIds,
        setPrimaryCouple,
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
