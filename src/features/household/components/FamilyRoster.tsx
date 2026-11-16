'use client';

import React, { useState } from 'react';
import { Button, Card } from '@/components';
import { FamilyHierarchyRole, HouseholdRole, HouseholdType } from '@/types';
import { MotionText, MotionContainer } from '@/components/ui/motionText';
import { useHousehold, FamilyMember } from '@/providers/HouseholdProvider';

export const FamilyRoster: React.FC = () => {
  const {
    members,
    addMember,
    editMember,
    removeMember,
    togglePrivacy,
    primaryCoupleIds,
    setPrimaryCouple,
    clearPrimaryCouple,
    twinningPair,
    setTwinningPair,
    clearTwinningPair,
  } = useHousehold();

  const [householdType, setHouseholdType] = useState<HouseholdType>('family');
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<HouseholdRole>('family_member');
  const [hierarchyRole, setHierarchyRole] = useState<FamilyHierarchyRole>('elder_child');
  const [customRoleText, setCustomRoleText] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Edit member state
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<HouseholdRole>('family_member');
  const [editHierarchy, setEditHierarchy] = useState<FamilyHierarchyRole>('relative');
  const [editCustomTitle, setEditCustomTitle] = useState('');
  const [editPrivacy, setEditPrivacy] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');

  // Delete confirmation state
  const [memberToDelete, setMemberToDelete] = useState<FamilyMember | null>(null);

  // Custom couple selection state
  const [selectedCoupleP1, setSelectedCoupleP1] = useState<string>('');
  const [selectedCoupleP2, setSelectedCoupleP2] = useState<string>('');

  // Custom twinning pair selection state
  const [selectedTwinInitiator, setSelectedTwinInitiator] = useState<string>('');
  const [selectedTwinPartner, setSelectedTwinPartner] = useState<string>('');

  const handleStartEdit = (m: FamilyMember) => {
    setEditingMember(m);
    setEditName(m.name);
    setEditRole(m.role);
    setEditHierarchy(m.hierarchyRole);
    setEditCustomTitle(m.customRoleLabel || '');
    setEditPrivacy(m.privacyTier);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember || !editName.trim()) return;

    editMember(editingMember.id, {
      name: editName.trim(),
      role: editRole,
      hierarchyRole: editHierarchy,
      customRoleLabel: editCustomTitle.trim() || editHierarchy.replace('_', ' '),
      privacyTier: editPrivacy,
    });

    setEditingMember(null);
  };

  const handleConfirmDelete = () => {
    if (memberToDelete) {
      removeMember(memberToDelete.id);
      setMemberToDelete(null);
    }
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;

    const newMember: FamilyMember = {
      id: `m-${Date.now()}`,
      name: newMemberName.trim(),
      role: newMemberRole,
      hierarchyRole,
      customRoleLabel: customRoleText.trim() || hierarchyRole.replace('_', ' '),
      closetCount: 0,
      privacyTier: 'PUBLIC',
      joinedAt: new Date().toISOString().split('T')[0],
    };

    addMember(newMember);
    setNewMemberName('');
    setCustomRoleText('');
    setShowAddForm(false);
  };

  const handleApplyCouple = () => {
    const p1 = selectedCoupleP1 || primaryCoupleIds?.[0] || members[0]?.id;
    const p2 = selectedCoupleP2 || primaryCoupleIds?.[1] || members[1]?.id;
    if (p1 && p2 && p1 !== p2) {
      setPrimaryCouple(p1, p2);
    }
  };

  const handleApplyTwinning = () => {
    const init = selectedTwinInitiator || twinningPair?.[0] || members[0]?.id;
    const part = selectedTwinPartner || twinningPair?.[1] || members[1]?.id;
    if (init && part && init !== part) {
      setTwinningPair(init, part);
    }
  };

  const isMemberInCouple = (id: string) => {
    return primaryCoupleIds && (primaryCoupleIds[0] === id || primaryCoupleIds[1] === id);
  };

  const isMemberInTwinning = (id: string) => {
    return twinningPair && (twinningPair[0] === id || twinningPair[1] === id);
  };

  const coupleMember1 = members.find((m) => m.id === primaryCoupleIds?.[0]);
  const coupleMember2 = members.find((m) => m.id === primaryCoupleIds?.[1]);

  const twinInitiator = members.find((m) => m.id === twinningPair?.[0]);
  const twinPartner = members.find((m) => m.id === twinningPair?.[1]);

  return (
    <Card className="p-6 space-y-8">
      {/* Header & Mode Switch */}
      <MotionContainer
        staggerChildren={0.1}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-dashed border-outline-variant"
      >
        <div>
          <MotionText as="div" className="text-secondary block mb-1 spec-label">
            Household Settings & Roster Manager
          </MotionText>
          <MotionText as="h3" className="font-display text-headline-md text-primary">
            Family Hierarchy & Coordination Options
          </MotionText>
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
            Couple Mode (2)
          </button>
          <button
            onClick={() => setHouseholdType('family')}
            className={`px-3 py-1.5 rounded spec-label text-xs uppercase transition-colors ${
              householdType === 'family'
                ? 'bg-primary text-on-primary font-bold'
                : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            Family Mode (N)
          </button>
        </MotionText>
      </MotionContainer>

      {/* Roster List */}
      <div className="space-y-3">
        <div className="flex justify-between items-center text-xs text-primary/60 font-mono uppercase">
          <span>Active Roster ({members.length} Members)</span>
          <span>Actions & Status</span>
        </div>

        {members.map((m) => {
          const inCouple = isMemberInCouple(m.id);
          const inTwinning = isMemberInTwinning(m.id);

          return (
            <div
              key={m.id}
              className="p-4 bg-surface-container rounded border border-outline-variant/30 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-secondary/30"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-display font-bold shrink-0">
                  {m.name.charAt(0)}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-display text-body-md text-primary font-bold">{m.name}</h4>
                    <span className="spec-label text-[10px] bg-surface-variant text-on-surface-variant px-2 py-0.5 rounded font-mono uppercase">
                      {m.hierarchyRole.replace('_', ' ')}
                    </span>
                    {inCouple && (
                      <span className="spec-label text-[10px] bg-rose-100 text-rose-800 px-2 py-0.5 rounded font-mono font-bold flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">favorite</span>
                        Couple
                      </span>
                    )}
                    {inTwinning && (
                      <span className="spec-label text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-mono font-bold flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">group</span>
                        Twinning
                      </span>
                    )}
                  </div>
                  <p className="spec-label text-primary/60 text-[10px] mt-0.5">
                    Title: {m.customRoleLabel || m.role} • Joined {m.joinedAt}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:gap-3 self-end md:self-center">
                <span className="spec-label text-xs text-on-surface-variant font-mono mr-1">
                  {m.closetCount} Items
                </span>

                {/* Privacy Toggle */}
                <button
                  type="button"
                  title="Toggle Privacy Tier"
                  onClick={() => togglePrivacy(m.id)}
                  className={`px-2.5 py-1 rounded spec-label text-xs transition-colors flex items-center gap-1 ${
                    m.privacyTier === 'PUBLIC'
                      ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                      : 'bg-surface-variant text-on-surface-variant hover:bg-surface-container-highest'
                  }`}
                >
                  <span className="material-symbols-outlined text-xs">
                    {m.privacyTier === 'PUBLIC' ? 'visibility' : 'lock'}
                  </span>
                  {m.privacyTier}
                </button>

                {/* Edit Button */}
                <button
                  type="button"
                  title="Edit Member"
                  onClick={() => handleStartEdit(m)}
                  className="px-2.5 py-1 bg-surface-variant text-primary rounded spec-label text-xs hover:bg-secondary/20 transition-colors flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-xs">edit</span>
                  Edit
                </button>

                {/* Delete Button */}
                <button
                  type="button"
                  title="Remove Member"
                  onClick={() => setMemberToDelete(m)}
                  className="px-2 py-1 text-red-600 hover:bg-red-50 rounded spec-label text-xs transition-colors flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-xs">delete</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Member Modal / Inline Form */}
      {editingMember && (
        <form
          onSubmit={handleSaveEdit}
          className="p-5 bg-surface-container-low rounded-xl border-2 border-secondary/40 space-y-4 animate-in fade-in"
        >
          <div className="flex justify-between items-center border-b border-dashed border-outline-variant pb-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">manage_accounts</span>
              <h4 className="font-display text-body-md text-primary font-bold">
                Edit Member: {editingMember.name}
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setEditingMember(null)}
              className="text-on-surface-variant hover:text-primary"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="spec-label block text-primary/70 mb-1">Full Name</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                className="w-full bg-surface border border-outline-variant p-2 rounded text-sm text-primary font-body focus:outline-none focus:border-secondary"
              />
            </div>

            <div>
              <label className="spec-label block text-primary/70 mb-1">Household Role</label>
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value as HouseholdRole)}
                className="w-full bg-surface p-2 rounded text-sm text-primary border border-outline-variant focus:outline-none"
              >
                <option value="husband">Husband</option>
                <option value="wife">Wife</option>
                <option value="partner">Partner</option>
                <option value="family_member">Family Member</option>
              </select>
            </div>

            <div>
              <label className="spec-label block text-primary/70 mb-1">Family Hierarchy Role</label>
              <select
                value={editHierarchy}
                onChange={(e) => setEditHierarchy(e.target.value as FamilyHierarchyRole)}
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
              <label className="spec-label block text-primary/70 mb-1">Custom Title / Nickname</label>
              <input
                type="text"
                value={editCustomTitle}
                onChange={(e) => setEditCustomTitle(e.target.value)}
                placeholder="e.g. Brother, Daughter, Mum"
                className="w-full bg-surface border border-outline-variant p-2 rounded text-sm text-primary font-body focus:outline-none focus:border-secondary"
              />
            </div>

            <div>
              <label className="spec-label block text-primary/70 mb-1">Default Privacy Tier</label>
              <select
                value={editPrivacy}
                onChange={(e) => setEditPrivacy(e.target.value as 'PUBLIC' | 'PRIVATE')}
                className="w-full bg-surface p-2 rounded text-sm text-primary border border-outline-variant focus:outline-none"
              >
                <option value="PUBLIC">PUBLIC (Allow Twinning with Partners)</option>
                <option value="PRIVATE">PRIVATE (Keep Items Invisible to Household)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => setEditingMember(null)}>
              Cancel
            </Button>
            <Button type="submit">
              Save Changes
            </Button>
          </div>
        </form>
      )}

      {/* Delete Confirmation Modal */}
      {memberToDelete && (
        <div className="p-5 bg-red-50 border border-red-200 rounded-xl space-y-3 animate-in fade-in">
          <div className="flex items-center gap-2 text-red-700">
            <span className="material-symbols-outlined text-lg">warning</span>
            <h4 className="font-display text-body-md font-bold">Remove Member from Household?</h4>
          </div>
          <p className="text-xs text-red-900">
            Are you sure you want to remove <strong>{memberToDelete.name}</strong> ({memberToDelete.customRoleLabel || memberToDelete.role}) from this household? Their wardrobe settings and coordination pairings will be cleared.
          </p>
          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={() => setMemberToDelete(null)}
              className="px-4 py-1.5 text-xs font-mono font-bold text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              className="px-4 py-1.5 text-xs font-mono font-bold text-white bg-red-600 rounded hover:bg-red-700"
            >
              Confirm Remove
            </button>
          </div>
        </div>
      )}

      {/* Primary Couple Configuration Section */}
      <div className="p-5 bg-surface-container-lowest border border-outline-variant/40 rounded-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-rose-600">favorite</span>
            <div>
              <h4 className="font-display text-body-md text-primary font-bold">Couple Setting</h4>
              <p className="text-xs text-on-surface-variant font-body">
                Assign which two members serve as the primary couple for Today Mode matching.
              </p>
            </div>
          </div>
          {primaryCoupleIds && (
            <button
              type="button"
              onClick={clearPrimaryCouple}
              className="text-xs font-mono text-red-600 hover:underline"
            >
              Clear Couple
            </button>
          )}
        </div>

        {coupleMember1 && coupleMember2 ? (
          <div className="p-3 bg-surface-container rounded-lg flex items-center justify-between text-xs text-primary font-mono">
            <span>
              Active Couple: <strong>{coupleMember1.name}</strong> & <strong>{coupleMember2.name}</strong>
            </span>
            <span className="spec-label text-rose-700 bg-rose-50 px-2 py-0.5 rounded">Configured</span>
          </div>
        ) : (
          <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded font-mono">
            No primary couple currently assigned. Choose two members below:
          </p>
        )}

        {members.length >= 2 && (
          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="spec-label block text-primary/70 mb-1 text-[11px]">Partner 1</label>
                <select
                  value={selectedCoupleP1 || primaryCoupleIds?.[0] || members[0]?.id || ''}
                  onChange={(e) => setSelectedCoupleP1(e.target.value)}
                  className="w-full bg-surface border border-outline-variant p-2 rounded text-sm text-primary font-body focus:outline-none focus:border-secondary"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.customRoleLabel || m.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="spec-label block text-primary/70 mb-1 text-[11px]">Partner 2</label>
                <select
                  value={selectedCoupleP2 || primaryCoupleIds?.[1] || members[1]?.id || ''}
                  onChange={(e) => setSelectedCoupleP2(e.target.value)}
                  className="w-full bg-surface border border-outline-variant p-2 rounded text-sm text-primary font-body focus:outline-none focus:border-secondary"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.customRoleLabel || m.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <Button variant="outline" type="button" onClick={handleApplyCouple} className="w-full justify-center text-xs">
              Save Couple Setting
            </Button>
          </div>
        )}
      </div>

      {/* Twinning Coordination Setting ("Twinning With Whom") */}
      <div className="p-5 bg-surface-container-lowest border border-secondary/30 rounded-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">style</span>
            <div>
              <h4 className="font-display text-body-md text-primary font-bold">Twinning Setting (&ldquo;Twinning with Whom&rdquo;)</h4>
              <p className="text-xs text-on-surface-variant font-body">
                Configure which household member is coordinating with whom during outfit generation.
              </p>
            </div>
          </div>
          {twinningPair && (
            <button
              type="button"
              onClick={clearTwinningPair}
              className="text-xs font-mono text-red-600 hover:underline"
            >
              Reset Twinning
            </button>
          )}
        </div>

        {twinInitiator && twinPartner ? (
          <div className="p-3 bg-secondary/10 rounded-lg flex items-center justify-between text-xs text-primary font-mono">
            <span>
              Active Twinning Pair: <strong>{twinInitiator.name}</strong> (Initiator) ↔ <strong>{twinPartner.name}</strong> (Partner)
            </span>
            <span className="spec-label text-secondary bg-secondary/20 px-2 py-0.5 rounded font-bold">Active Pair</span>
          </div>
        ) : (
          <p className="text-xs text-on-surface-variant bg-surface-container p-2 rounded font-mono">
            Default Twinning: Coordinates Initiator with household partner. Configure an explicit pair below:
          </p>
        )}

        {members.length >= 2 && (
          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="spec-label block text-primary/70 mb-1 text-[11px]">Initiator (Member dressing)</label>
                <select
                  value={selectedTwinInitiator || twinningPair?.[0] || members[0]?.id || ''}
                  onChange={(e) => setSelectedTwinInitiator(e.target.value)}
                  className="w-full bg-surface border border-outline-variant p-2 rounded text-sm text-primary font-body focus:outline-none focus:border-secondary"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.customRoleLabel || m.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="spec-label block text-primary/70 mb-1 text-[11px]">Twin Partner (Matching closet)</label>
                <select
                  value={selectedTwinPartner || twinningPair?.[1] || members[1]?.id || ''}
                  onChange={(e) => setSelectedTwinPartner(e.target.value)}
                  className="w-full bg-surface border border-outline-variant p-2 rounded text-sm text-primary font-body focus:outline-none focus:border-secondary"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.customRoleLabel || m.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button type="button" onClick={handleApplyTwinning} className="flex-1 justify-center text-xs">
                Save Twinning Pair Setting
              </Button>
              {primaryCoupleIds && (
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => {
                    setTwinningPair(primaryCoupleIds[0], primaryCoupleIds[1]);
                  }}
                  className="justify-center text-xs"
                >
                  Sync with Couple
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add Family Member Form */}
      {!showAddForm ? (
        <Button variant="outline" onClick={() => setShowAddForm(true)} className="w-full justify-center">
          <span className="material-symbols-outlined text-lg">person_add</span>
          Add New Member to Household
        </Button>
      ) : (
        <form onSubmit={handleAddMember} className="p-4 bg-surface-container-low rounded-xl border border-secondary/30 space-y-4">
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
              placeholder="e.g. Fatima / Zain / Maya"
              required
              className="w-full bg-surface border-b-2 border-primary/20 p-2 text-sm text-primary font-body focus:outline-none focus:border-secondary"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                placeholder="e.g. Sister, Brother, Grandma"
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
