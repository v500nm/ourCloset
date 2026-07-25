'use client';

import React, { useState } from 'react';
import { useHouseholdSetup } from '../hooks/useHouseholdSetup';
import { Button, Card } from '@/components';
import { FamilyRoster } from './FamilyRoster';
import { HouseholdRole, HouseholdType } from '@/types';

export const HouseholdSetup: React.FC = () => {
  const {
    householdName,
    setHouseholdName,
    role,
    setRole,
    inviteCode,
    setInviteCode,
    loading,
    handleCreate,
    handleJoin,
  } = useHouseholdSetup();

  const [householdType, setHouseholdType] = useState<HouseholdType>('family');

  return (
    <div className="space-y-10">
      {/* Top Roster Configuration Section */}
      <FamilyRoster />

      {/* Grid: Create & Join Forms + Explainer */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column: Create & Join Forms */}
        <div className="space-y-8">
          {/* Create Household Card */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded bg-secondary-container flex items-center justify-center text-on-secondary-container">
                <span className="material-symbols-outlined">add_home</span>
              </div>
              <div>
                <h3 className="font-display text-headline-md text-primary">Create Household</h3>
                <p className="text-xs text-on-surface-variant font-body">
                  Establish a new shared environment and invite partners or family members.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="spec-label block text-primary/70 mb-1">Household Name</label>
                <input
                  type="text"
                  value={householdName}
                  onChange={(e) => setHouseholdName(e.target.value)}
                  placeholder="e.g. The Smith Residence"
                  className="w-full bg-transparent border-b-2 border-primary/20 pb-2 text-primary focus:border-secondary focus:outline-none font-body text-sm"
                />
              </div>

              <div>
                <label className="spec-label block text-primary/70 mb-2">Household Type</label>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <button
                    type="button"
                    onClick={() => setHouseholdType('couple')}
                    className={`py-2 px-3 rounded spec-label uppercase tracking-wider text-xs border transition-colors ${
                      householdType === 'couple'
                        ? 'border-secondary bg-secondary-container text-on-secondary-container font-bold'
                        : 'border-outline-variant/40 bg-surface-container hover:bg-surface-container-highest text-on-surface-variant'
                    }`}
                  >
                    Couple Mode (2)
                  </button>
                  <button
                    type="button"
                    onClick={() => setHouseholdType('family')}
                    className={`py-2 px-3 rounded spec-label uppercase tracking-wider text-xs border transition-colors ${
                      householdType === 'family'
                        ? 'border-secondary bg-secondary-container text-on-secondary-container font-bold'
                        : 'border-outline-variant/40 bg-surface-container hover:bg-surface-container-highest text-on-surface-variant'
                    }`}
                  >
                    Family Mode (N)
                  </button>
                </div>
              </div>

              <div>
                <label className="spec-label block text-primary/70 mb-2">Your Role</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['husband', 'wife', 'partner', 'family_member'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r as HouseholdRole)}
                      className={`py-2 px-2 rounded spec-label uppercase tracking-wider text-[11px] border transition-colors text-center ${
                        role === r
                          ? 'border-secondary bg-secondary-container text-on-secondary-container font-bold'
                          : 'border-outline-variant/40 bg-surface-container hover:bg-surface-container-highest text-on-surface-variant'
                      }`}
                    >
                      {r.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <Button onClick={handleCreate} disabled={loading} className="w-full justify-center mt-2">
                {loading ? 'Initializing...' : 'Initialize Setup'}
              </Button>
            </div>
          </Card>

          {/* OR Divider */}
          <div className="text-center spec-label text-primary/40 relative">
            <span className="bg-raw-silk px-4 relative z-10">OR</span>
            <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-outline-variant/30 z-0" />
          </div>

          {/* Join Household Card */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded bg-surface-container flex items-center justify-center text-primary">
                <span className="material-symbols-outlined">key</span>
              </div>
              <div>
                <h3 className="font-display text-headline-md text-primary">Join Household</h3>
                <p className="text-xs text-on-surface-variant font-body">
                  Enter an invite code provided by a household member.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="spec-label block text-primary/70 mb-1">Invite Code</label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="XXXX-XXXX"
                  className="w-full bg-transparent border-b-2 border-primary/20 pb-2 text-primary font-mono tracking-widest focus:border-secondary focus:outline-none"
                />
              </div>

              <Button variant="secondary" onClick={handleJoin} disabled={loading} className="w-full justify-center">
                Authenticate Code
              </Button>
            </div>
          </Card>
        </div>

        {/* Right Column: Explainer & Preview */}
        <div className="space-y-8">
          {/* Synergize Your Wardrobes Explainer Card */}
          <Card className="p-6 bg-primary-container text-on-primary border-none">
            <div className="spec-label text-on-primary-container mb-3 flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">favorite</span>
              Partner & Family Bonding
            </div>

            <h3 className="font-display text-display-lg-mobile text-on-primary mb-3">
              Synergize Your Wardrobes
            </h3>
            <p className="text-body-sm text-on-primary-container mb-6 font-body">
              Bonding allows couples and family members to view public inventories, coordinate outfits for weddings or Eid, and manage shared laundry cycles seamlessly.
            </p>

            <div className="space-y-3 pt-3 border-t border-primary-fixed-variant/40">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-on-primary-container text-lg mt-0.5">public</span>
                <div>
                  <div className="spec-label text-on-primary">Public Items</div>
                  <p className="text-xs text-on-primary-container font-body">Visible for outfit coordination</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-on-primary-container text-lg mt-0.5">lock</span>
                <div>
                  <div className="spec-label text-on-primary">Private Items</div>
                  <p className="text-xs text-on-primary-container font-body">Kept strictly in your personal view (Enforced via RLS)</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Twinning Suggestions Preview Card */}
          <Card className="p-6">
            <span className="spec-label text-primary/60 mb-3 block uppercase tracking-wider">Preview Feature</span>
            <h4 className="font-display text-headline-md text-primary mb-4">Twinning Suggestions</h4>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-surface-container rounded border border-outline-variant/30">
                <div className="aspect-[4/3] bg-surface-container-high rounded mb-2 overflow-hidden">
                  <img
                    src="https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=300&auto=format&fit=crop&q=80"
                    alt="Navy Blazer"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="spec-label text-primary text-[10px] uppercase font-bold">Navy Wool Suit</div>
                <div className="text-[10px] text-on-surface-variant font-mono">Husband Inventory</div>
              </div>

              <div className="p-3 bg-surface-container rounded border border-secondary/30 relative">
                <div className="absolute top-2 right-2 bg-secondary text-on-secondary px-2 py-0.5 rounded text-[10px] font-mono">
                  Match
                </div>
                <div className="aspect-[4/3] bg-surface-container-high rounded mb-2 overflow-hidden">
                  <img
                    src="https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=300&auto=format&fit=crop&q=80"
                    alt="Navy Silk Blouse"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="spec-label text-primary text-[10px] uppercase font-bold">Embroidered Abaya</div>
                <div className="text-[10px] text-on-surface-variant font-mono">Wife Inventory</div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
