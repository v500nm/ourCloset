import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ClosetPage from '@/app/(main)/closet/page';
import TodayPage from '@/app/(main)/today/page';
import { TwinningMatchResults } from '@/features/twinning/components/TwinningMatchResults';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => ({
    get: (key: string) => (key === 'quickstart' ? 'true' : null),
  }),
}));

// Mock wardrobe items for ClosetPage
let mockClosetItems: any[] = [];
let mockLoadSampleWardrobe = vi.fn().mockResolvedValue(undefined);

vi.mock('@/features/ingestion', () => ({
  useWardrobeItems: () => ({
    items: mockClosetItems,
    allItems: mockClosetItems,
    selectedStyle: 'western',
    setSelectedStyle: vi.fn(),
    selectedCategory: 'all',
    setSelectedCategory: vi.fn(),
    updateItemLaundryStatus: vi.fn(),
    addItem: vi.fn(),
    removeItem: vi.fn(),
    loadSampleWardrobe: mockLoadSampleWardrobe,
    loading: false,
  }),
  CategoryFilter: () => React.createElement('div', { 'data-testid': 'category-filter' }),
  ClosetGrid: () => React.createElement('div', { 'data-testid': 'closet-grid' }),
  CulturalFilter: () => React.createElement('div', { 'data-testid': 'cultural-filter' }),
  HangerRail: () => React.createElement('div', { 'data-testid': 'hanger-rail' }),
  IngestionModal: () => null,
}));

// Mock WardrobeProvider for TodayPage
let mockTodayWardrobeItems: any[] = [];
vi.mock('@/providers/WardrobeProvider', () => ({
  useWardrobe: () => ({
    items: mockTodayWardrobeItems,
    loadSampleWardrobe: mockLoadSampleWardrobe,
    isLoading: false,
    markItemsDirty: vi.fn(),
  }),
}));

vi.mock('@/providers/HouseholdProvider', () => ({
  useHousehold: () => ({
    members: [{ id: 'm-adnan', name: 'Adnan', role: 'Husband' }],
  }),
}));

vi.mock('@/features/context', () => ({
  useContextResolver: () => ({
    mode: { type: 'solo', memberIds: ['m-adnan'] },
    setMode: vi.fn(),
    selectedPreset: 'Office',
    selectedSubPreset: 'Review',
    resolvePreset: vi.fn(),
    resolveFreeform: vi.fn(),
    resolvedContext: { label: 'Office Review' },
    loading: false,
  }),
  ModeSelector: () => React.createElement('div', { 'data-testid': 'mode-selector' }),
  ContextPresets: () => React.createElement('div', { 'data-testid': 'context-presets' }),
  FreeformInput: () => React.createElement('div', { 'data-testid': 'freeform-input' }),
}));

vi.mock('@/features/twinning/hooks/useTwinning', () => ({
  useTwinning: () => ({
    tiers: [],
    selectedTier: 'balanced',
    setSelectedTier: vi.fn(),
    status: 'PENDING',
    rerolls: 2,
    loading: false,
    handleAccept: vi.fn(),
    handleReroll: vi.fn(),
  }),
}));

describe('Phase 7 Onboarding Time-to-First-Outfit (< 5 mins)', () => {
  it('displays prominent 1-click Quick-Start Wardrobe action in /closet when empty', () => {
    mockClosetItems = [];
    const html = renderToStaticMarkup(React.createElement(ClosetPage));

    expect(html).toContain('data-testid="closet-empty-state"');
    expect(html).toContain('data-testid="quick-start-wardrobe-btn"');
    expect(html).toContain('Quick-Start Wardrobe (1-Click to First Outfit)');
    expect(html).toContain('Your Closet is Pristine');
  });

  it('displays onboarding empty banner in /today when closet is empty', () => {
    mockTodayWardrobeItems = [];
    const html = renderToStaticMarkup(React.createElement(TodayPage));

    expect(html).toContain('data-testid="today-empty-closet-banner"');
    expect(html).toContain('data-testid="today-quickstart-btn"');
    expect(html).toContain('Quick-Start &amp; Generate First Outfit (1-Click)');
  });

  it('provides quick-start recovery action inside TwinningMatchResults when no tiers are available', () => {
    const html = renderToStaticMarkup(
      React.createElement(TwinningMatchResults, {
        activeMode: { type: 'solo', memberIds: ['m-adnan'] },
      })
    );

    expect(html).toContain('data-testid="twinning-empty-state"');
    expect(html).toContain('data-testid="twinning-quickstart-btn"');
    expect(html).toContain('Quick-Start Wardrobe');
  });
});
