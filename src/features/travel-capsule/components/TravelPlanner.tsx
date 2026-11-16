'use client';

import React from 'react';
import { useTravelPlanner } from '../hooks/useTravelPlanner';
import { Button, Card } from '@/components';
import { ItemCard } from '@/features/ingestion';
import { MotionText, MotionContainer } from '@/components/ui/motionText';

export const TravelPlanner: React.FC = () => {
  const {
    params,
    setParams,
    result,
    activeTab,
    setActiveTab,
    loading,
    runPlanner,
    toggleChecklist,
  } = useTravelPlanner();

  return (
    <div className="space-y-8">
      {/* Top action bar */}
      <div className="flex justify-between items-center">
        <MotionContainer staggerChildren={0.1}>
          <MotionText as="h2" className="font-display text-headline-md text-primary">Travel Planner</MotionText>
          <MotionText as="p" className="text-body-sm text-on-surface-variant">Configure your capsule wardrobe for upcoming journeys.</MotionText>
        </MotionContainer>
        <Button onClick={runPlanner} disabled={loading}>
          <span className="material-symbols-outlined text-[18px]">bookmark</span>
          Save Plan
        </Button>
      </div>

      <div className="stitching-border-full" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Journey Parameters & Forecast */}
        <div className="space-y-6">
          <Card className="p-6">
            <span className="spec-label text-primary/70 mb-4 block uppercase tracking-wider">
              <span className="material-symbols-outlined text-sm align-middle mr-1">tune</span>
              Journey Parameters
            </span>

            <div className="space-y-4">
              <div>
                <label className="spec-label text-primary/60 block mb-1">Destination</label>
                <input
                  type="text"
                  value={params.destination}
                  onChange={(e) => setParams({ ...params, destination: e.target.value })}
                  className="w-full bg-surface-container border-b-2 border-primary/20 p-2 text-sm text-primary font-body focus:outline-none focus:border-secondary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="spec-label text-primary/60 block mb-1">Duration (Days)</label>
                  <input
                    type="number"
                    value={params.durationDays}
                    onChange={(e) => setParams({ ...params, durationDays: Number(e.target.value) })}
                    className="w-full bg-surface-container border-b-2 border-primary/20 p-2 text-sm text-primary font-body focus:outline-none focus:border-secondary"
                  />
                </div>
                <div>
                  <label className="spec-label text-primary/60 block mb-1">Season</label>
                  <select
                    value={params.season}
                    onChange={(e) => setParams({ ...params, season: e.target.value as any })}
                    className="w-full bg-surface-container border border-outline-variant p-2 text-sm text-primary focus:outline-none"
                  >
                    <option value="Spring">Spring</option>
                    <option value="Summer">Summer</option>
                    <option value="Autumn">Autumn</option>
                    <option value="Winter">Winter</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="spec-label text-primary/60 block mb-2">Cultural Context</label>
                <div className="space-y-2">
                  {[
                    { id: 'western', label: 'Western / Cosmopolitan' },
                    { id: 'indian_traditional', label: 'Indian Traditional' },
                    { id: 'islamic_modest', label: 'Islamic-Modest' },
                  ].map((c) => (
                    <label key={c.id} className="flex items-center gap-2 text-xs text-primary font-body cursor-pointer">
                      <input
                        type="radio"
                        name="culturalContext"
                        checked={params.culturalContext === c.id}
                        onChange={() => setParams({ ...params, culturalContext: c.id as any })}
                        className="accent-secondary"
                      />
                      {c.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* Forecast Simulation Widget */}
          <Card className="p-6 bg-surface-container-low">
            <span className="spec-label text-primary/70 mb-4 block uppercase tracking-wider">
              <span className="material-symbols-outlined text-sm align-middle mr-1">cloud</span>
              Forecast Simulation (Open-Meteo)
            </span>

            <div className="bg-surface p-4 rounded mb-4">
              <div className="text-4xl font-display text-primary font-bold">68°</div>
              <div className="spec-label text-primary/60 text-[10px] uppercase mt-1">
                {params.destination.toUpperCase()} (AVG)
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
              <div className="p-2 bg-surface rounded">
                <span className="material-symbols-outlined text-primary/60 text-sm block">water_drop</span>
                <span className="block text-[10px] text-primary/60">MON</span>
                <span className="font-bold text-primary">65°</span>
              </div>
              <div className="p-2 bg-surface rounded">
                <span className="material-symbols-outlined text-amber-600 text-sm block">wb_sunny</span>
                <span className="block text-[10px] text-primary/60">TUE</span>
                <span className="font-bold text-primary">72°</span>
              </div>
              <div className="p-2 bg-surface rounded">
                <span className="material-symbols-outlined text-primary/60 text-sm block">cloud</span>
                <span className="block text-[10px] text-primary/60">WED</span>
                <span className="font-bold text-primary">68°</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Capsule Generator & Results */}
        <div className="md:col-span-2 space-y-6">
          <Card className="p-6 bg-primary-container text-on-primary border-none">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-display text-headline-md text-on-primary font-bold">Capsule Generator</h3>
                <p className="text-xs text-on-primary-container mt-1 font-body">
                  AI compiling minimal items for maximum combinations based on forecast.
                </p>
              </div>
              <Button variant="primary" onClick={runPlanner} disabled={loading}>
                {loading ? 'Generating...' : 'GENERATE'}
                <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
              </Button>
            </div>
          </Card>

          {/* Result Tabs */}
          <div className="flex gap-4 border-b border-outline-variant/30 pb-2">
            <button
              onClick={() => setActiveTab('capsule')}
              className={`spec-label pb-1 ${
                activeTab === 'capsule'
                  ? 'text-primary border-b-2 border-secondary font-bold'
                  : 'text-on-surface-variant'
              }`}
            >
              Core Capsule
            </button>
            <button
              onClick={() => setActiveTab('combinations')}
              className={`spec-label pb-1 ${
                activeTab === 'combinations'
                  ? 'text-primary border-b-2 border-secondary font-bold'
                  : 'text-on-surface-variant'
              }`}
            >
              Combinations
            </button>
            <button
              onClick={() => setActiveTab('checklist')}
              className={`spec-label pb-1 ${
                activeTab === 'checklist'
                  ? 'text-primary border-b-2 border-secondary font-bold'
                  : 'text-on-surface-variant'
              }`}
            >
              Checklist ({result?.packingChecklist.filter((c) => c.packed).length || 0}/
              {result?.packingChecklist.length || 0})
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'capsule' && (
            <div className="space-y-6">
              {result ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {result.coreItems.map((item) => (
                    <ItemCard key={item.id} item={item} />
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center bg-surface-container-lowest torn-swatch border border-outline-variant/30">
                  <p className="spec-label text-primary/60">Tap &quot;Generate&quot; to compile your travel capsule.</p>
                </div>
              )}

              {/* Efficiency Score Banner */}
              <Card className="p-6 flex items-center justify-between border-dashed border-secondary/40">
                <div>
                  <h4 className="font-display text-body-md text-primary font-bold">Efficiency Score</h4>
                  <p className="text-xs text-on-surface-variant">Minimal packing weight for a carry-on suitcase.</p>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-display text-secondary font-bold">
                    {result ? result.distinctOutfitCount : 24}
                  </div>
                  <div className="spec-label text-primary/60 text-[10px]">DISTINCT OUTFITS</div>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'combinations' && (
            <div className="space-y-4">
              {result?.validCombinations && result.validCombinations.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {result.validCombinations.map((combo) => (
                    <Card key={combo.id} className="p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="spec-label text-secondary font-mono text-xs uppercase font-bold">
                          {combo.id}
                        </span>
                        <span className="spec-label text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded text-[10px] font-mono">
                          {Math.round(combo.score * 100)}% Match
                        </span>
                      </div>
                      <div className="flex gap-2 items-center overflow-x-auto py-1">
                        {combo.items.map((item) => (
                          <div
                            key={item.id}
                            className="w-16 h-18 bg-surface-container rounded p-1 flex-shrink-0 text-center"
                            title={item.title}
                          >
                            <span className="spec-label text-[9px] block text-primary/70 truncate">
                              {item.title}
                            </span>
                            <span className="spec-label text-[9px] text-secondary font-mono block">
                              {item.category}
                            </span>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-on-surface-variant font-body">{combo.reason}</p>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center bg-surface-container-lowest torn-swatch border border-outline-variant/30">
                  <p className="spec-label text-primary/60">
                    {result ? 'No combinations generated.' : 'Tap "GENERATE" to compile combinations.'}
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'checklist' && result && (
            <Card className="p-6 space-y-3">
              <h4 className="spec-label text-primary font-bold mb-2">Packing Checklist</h4>
              {result.packingChecklist.map(({ item, packed }) => (
                <label
                  key={item.id}
                  className="flex items-center gap-3 p-3 bg-surface-container rounded border border-outline-variant/30 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={packed}
                    onChange={() => toggleChecklist(item.id)}
                    className="w-5 h-5 accent-secondary"
                  />
                  <span className={`text-sm font-body ${packed ? 'line-through text-on-surface-variant' : 'text-primary'}`}>
                    {item.title} ({item.category})
                  </span>
                </label>
              ))}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
