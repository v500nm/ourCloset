'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { FamilyHierarchyRole, HouseholdRole } from '@/types';

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

// Initial requested mock data based on prompt
const INITIAL_MEMBERS: FamilyMember[] = [
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
    id: 'm-saniya',
    name: 'Saniya',
    role: 'wife',
    hierarchyRole: 'spouse',
    customRoleLabel: 'Wife',
    closetCount: 38,
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

export const HouseholdProvider: React.FC<{ children: ReactNode, initialMembers?: FamilyMember[] }> = ({ children, initialMembers }) => {
  const [members, setMembers] = useState<FamilyMember[]>(initialMembers || INITIAL_MEMBERS);
  const [primaryCoupleIds, setPrimaryCoupleIds] = useState<[string, string] | null>(
    initialMembers ? (initialMembers.length >= 2 ? [initialMembers[0].id, initialMembers[1].id] : null) : ['m-adnan', 'm-saniya']
  );

  const addMember = (member: FamilyMember) => {
    setMembers((prev) => [...prev, member]);
  };

  const togglePrivacy = (id: string) => {
    setMembers((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, privacyTier: m.privacyTier === 'PUBLIC' ? 'PRIVATE' : 'PUBLIC' } : m
      )
    );
  };

  const removeMember = (id: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
  };

  const setPrimaryCouple = (id1: string, id2: string) => {
    setPrimaryCoupleIds([id1, id2]);
  };

  return (
    <HouseholdContext.Provider value={{ members, setMembers, addMember, togglePrivacy, removeMember, primaryCoupleIds, setPrimaryCouple }}>
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
