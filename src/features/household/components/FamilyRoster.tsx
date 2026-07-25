'use client';

import React, { useState } from 'react';
import { Button, Card, SpecLabel } from '@/components';
import { FamilyHierarchyRole, HouseholdRole, HouseholdType } from '@/types';
import { MotionText, MotionContainer } from '@/components/ui/motionText';
import { useHousehold, FamilyMember } from '@/providers/HouseholdProvider';

export const FamilyRoster: React.FC = () => {
  const { members, addMember, togglePrivacy, primaryCoupleIds, setPrimaryCouple } = useHousehold();

  const [householdType, setHouseholdType] = useState<HouseholdType>('family');
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<HouseholdRole>('family_member');
  const [hierarchyRole, setHierarchyRole] = useState<FamilyHierarchyRole>('elder_child');
  const [customRoleText, setCustomRoleText] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;

    const newMember: FamilyMember = {
      id: `m-${Date.now()}`,
      name: newMemberName,
      role: newMemberRole,
      hierarchyRole,
      customRoleLabel: customRoleText || hierarchyRole.replace('_', ' '),
      closetCount: 0,
      privacyTier: 'PUBLIC',
      joinedAt: new Date().toISOString().split('T')[0],
    };

    addMember(newMember);
    setNewMemberName('');
    setCustomRoleText('');
    setShowAddForm(false);
  };



  return (
    <Card className="p-6 space-y-6">
      {/* Header & Mode Switch */}
      <MotionContainer staggerChildren={0.1} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-dashed border-outline-variant">
        <div>
          <MotionText as="div" className="text-secondary block mb-1 spec-label">Household Roster & Hierarchy Manager</MotionText>
          <MotionText as="h3" className="font-display text-headline-md text-primary">Family Hierarchy & Member Roles</MotionText>
        </div>

        {/* Household Type Selector */}
        <MotionText as="div" className="flex gap-2 bg-surface-container p-1 rounded border border-outline-variant/30">
          <button
            onClick={() => setHouseholdType('couple')}
            className={`px-3 py-1.5 rounded spec-label text-xs uppercase transition-colors ${
              householdType === 'couple'
                ? 'bg-primary text-on-primary font-bold'
                : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            Couple (2)
          </button>
          <button
            onClick={() => setHouseholdType('family')}
            className={`px-3 py-1.5 rounded spec-label text-xs uppercase transition-colors ${
              householdType === 'family'
                ? 'bg-primary text-on-primary font-bold'
                : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            Family (N)
          </button>
        </MotionText>
      </MotionContainer>

      {/* Roster List */}
      <div className="space-y-3">
        <div className="flex justify-between items-center text-xs text-primary/60 font-mono uppercase">
          <span>Active Roster ({members.length} Members)</span>
          <span>Hierarchy & Privacy</span>
        </div>

        {members.map((m) => (
          <div
            key={m.id}
            className="p-4 bg-surface-container rounded border border-outline-variant/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-display font-bold">
                {m.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-display text-body-md text-primary font-bold">{m.name}</h4>
                  <span className="spec-label text-[10px] bg-surface-variant text-on-surface-variant px-2 py-0.5 rounded font-mono uppercase">
                    {m.hierarchyRole.replace('_', ' ')}
                  </span>
                </div>
                <p className="spec-label text-primary/60 text-[10px] mt-0.5">
                  Title: {m.customRoleLabel || m.role} • Joined {m.joinedAt}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="spec-label text-xs text-on-surface-variant font-mono">
                {m.closetCount} Garments
              </span>
              <button
                onClick={() => togglePrivacy(m.id)}
                className={`px-3 py-1 rounded spec-label text-xs transition-colors flex items-center gap-1 ${
                  m.privacyTier === 'PUBLIC'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-surface-variant text-on-surface-variant'
                }`}
              >
                <span className="material-symbols-outlined text-sm">
                  {m.privacyTier === 'PUBLIC' ? 'visibility' : 'lock'}
                </span>
                {m.privacyTier}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Primary Couple Configuration */}
      {householdType === 'couple' && members.length >= 2 && (
        <div className="p-4 bg-surface-container-lowest border-2 border-secondary/20 rounded-xl space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-secondary">favorite</span>
            <h4 className="font-display text-body-md text-primary font-bold">Assign Primary Couple</h4>
          </div>
          <p className="text-xs text-on-surface-variant max-w-sm">
            Select which two family members should be used as the default couple for the quick-match feature on the Today page.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mt-3">
            <select
              value={primaryCoupleIds?.[0] || ''}
              onChange={(e) => {
                if (primaryCoupleIds) {
                  setPrimaryCouple(e.target.value, primaryCoupleIds[1]);
                } else {
                  setPrimaryCouple(e.target.value, members[1]?.id || '');
                }
              }}
              className="flex-1 bg-surface border border-outline-variant p-2 rounded text-sm text-primary font-body focus:outline-none focus:border-secondary"
            >
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <span className="self-center font-bold text-secondary">&</span>
            <select
              value={primaryCoupleIds?.[1] || ''}
              onChange={(e) => {
                if (primaryCoupleIds) {
                  setPrimaryCouple(primaryCoupleIds[0], e.target.value);
                } else {
                  setPrimaryCouple(members[0]?.id || '', e.target.value);
                }
              }}
              className="flex-1 bg-surface border border-outline-variant p-2 rounded text-sm text-primary font-body focus:outline-none focus:border-secondary"
            >
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Add Family Member Action */}
      {!showAddForm ? (
        <Button variant="outline" onClick={() => setShowAddForm(true)} className="w-full justify-center">
          <span className="material-symbols-outlined text-lg">person_add</span>
          Add Family Member to Hierarchy
        </Button>
      ) : (
        <form onSubmit={handleAddMember} className="p-4 bg-surface-container-low rounded border border-secondary/30 space-y-4">
          <div className="flex justify-between items-center border-b border-dashed border-outline-variant pb-2">
            <h4 className="font-display text-body-md text-primary font-bold">New Family Member Profile</h4>
            <button type="button" onClick={() => setShowAddForm(false)} className="text-on-surface-variant hover:text-primary">
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>

          <div>
            <label className="spec-label block text-primary/70 mb-1">Member Name</label>
            <input
              type="text"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              placeholder="e.g. Grandma Fatima / Zain (Son)"
              className="w-full bg-surface border-b-2 border-primary/20 p-2 text-sm text-primary font-body focus:outline-none focus:border-secondary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="spec-label block text-primary/70 mb-1">Family Hierarchy Role</label>
              <select
                value={hierarchyRole}
                onChange={(e) => setHierarchyRole(e.target.value as FamilyHierarchyRole)}
                className="w-full bg-surface p-2 rounded text-sm text-primary border border-outline-variant focus:outline-none"
              >
                <option value="head_of_household">Head of Household</option>
                <option value="spouse">Spouse</option>
                <option value="elder_child">Elder Child</option>
                <option value="younger_child">Younger Child</option>
                <option value="parent_in_law">Parent / In-Law</option>
                <option value="relative">Relative</option>
              </select>
            </div>

            <div>
              <label className="spec-label block text-primary/70 mb-1">Custom Title (Optional)</label>
              <input
                type="text"
                value={customRoleText}
                onChange={(e) => setCustomRoleText(e.target.value)}
                placeholder="e.g. Daughter, In-Law"
                className="w-full bg-surface border border-outline-variant p-2 rounded text-sm text-primary font-body focus:outline-none"
              />
            </div>
          </div>

          <Button type="submit" className="w-full justify-center">
            Save Member to Hierarchy Roster
          </Button>
        </form>
      )}
    </Card>
  );
};
