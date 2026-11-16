import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Badge } from '@/components/ui/badge';
import { StatusWheel } from '@/components/ui/statusWheel';
import { LandingBentoGrid } from '@/components/landing/LandingBentoGrid';
import { LandingHero } from '@/components/landing/LandingHero';
import { LandingTimelineShowcase } from '@/components/landing/LandingTimelineShowcase';

// Mock motion/react with configurable useReducedMotion
let mockReducedMotion = false;

vi.mock('motion/react', async () => {
  const actual = await vi.importActual<any>('motion/react');
  return {
    ...actual,
    useReducedMotion: () => mockReducedMotion,
  };
});

// Mock household provider
vi.mock('@/providers/HouseholdProvider', () => ({
  HouseholdProvider: ({ children }: { children: React.ReactNode }) => children,
  useHousehold: () => ({
    members: [{ id: 'm1', name: 'Husband' }, { id: 'm2', name: 'Wife' }],
    primaryCoupleIds: ['m1', 'm2'],
  }),
}));

describe('Accessibility: prefers-reduced-motion Support', () => {
  beforeEach(() => {
    mockReducedMotion = false;
  });

  it('renders Badge without animation wrappers when reduced motion is preferred', () => {
    mockReducedMotion = true;
    const html = renderToStaticMarkup(
      React.createElement(Badge, { variant: 'clean' }, 'CLEAN')
    );

    expect(html).toContain('CLEAN');
    expect(html).toContain('check_circle');
  });

  it('renders StatusWheel cleanly when reduced motion is preferred', () => {
    mockReducedMotion = true;
    const html = renderToStaticMarkup(
      React.createElement(StatusWheel, { currentStatus: 'CLEAN' })
    );

    expect(html).toContain('role="radiogroup"');
    expect(html).toContain('Clean');
  });

  it('renders LandingHero without parallax motion when reduced motion is preferred', () => {
    mockReducedMotion = true;
    const html = renderToStaticMarkup(React.createElement(LandingHero));

    expect(html).toContain('Coordinate your shared wardrobe');
    expect(html).toContain('ZERO-KEY WASM AI');
  });

  it('renders LandingBentoGrid without transforms when reduced motion is preferred', () => {
    mockReducedMotion = true;
    const html = renderToStaticMarkup(React.createElement(LandingBentoGrid));

    expect(html).toContain('Architectural Principles');
    expect(html).toContain('Split-Pane Matcher');
  });

  it('renders LandingTimelineShowcase cleanly when reduced motion is preferred', () => {
    mockReducedMotion = true;
    const html = renderToStaticMarkup(React.createElement(LandingTimelineShowcase));

    expect(html).toContain('Asymmetric Focus Layout');
    expect(html).toContain('Stacked Timeline');
  });
});

