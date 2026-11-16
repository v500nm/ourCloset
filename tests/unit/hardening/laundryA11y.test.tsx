import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StatusWheel } from '@/components/ui/statusWheel';
import { Badge } from '@/components/ui/badge';
import { LaundryBoard } from '@/features/laundry/components/LaundryBoard';

// Mock useLaundry hook for LaundryBoard
vi.mock('@/features/laundry/hooks/useLaundry', () => ({
  useLaundry: () => ({
    items: [
      {
        id: 'item-1',
        title: 'Linen Kurta',
        fabric_type: 'Linen',
        cultural_style: 'indian_traditional',
        laundry_status: 'DIRTY',
      },
      {
        id: 'item-2',
        title: 'Navy Wool Blazer',
        fabric_type: 'Wool',
        cultural_style: 'western',
        laundry_status: 'CLEAN',
      },
    ],
    activeTab: 'ALL',
    setActiveTab: vi.fn(),
    summary: {
      totalItems: 2,
      dirtyCount: 1,
      washCount: 0,
      dryCleaningCount: 0,
      cleanCount: 1,
      attentionRequiredCount: 1,
    },
    setStatus: vi.fn(),
  }),
}));

describe('Laundry Board Accessibility (WCAG 2.2 AA)', () => {
  describe('StatusWheel Accessibility', () => {
    it('renders with radiogroup role, accessible labels, and visible focus rings', () => {
      const html = renderToStaticMarkup(
        React.createElement(StatusWheel, { currentStatus: 'CLEAN' })
      );

      // Radiogroup semantic container
      expect(html).toContain('role="radiogroup"');
      expect(html).toContain('aria-label="Laundry status selector"');

      // Individual radio options with selection state
      expect(html).toContain('role="radio"');
      expect(html).toContain('aria-checked="true"');
      expect(html).toContain('aria-label="Mark as Clean"');
      expect(html).toContain('aria-label="Mark as Dirty"');

      // Focus-visible ring indicators for keyboard navigation
      expect(html).toContain('focus-visible:ring-2');
      expect(html).toContain('focus-visible:ring-secondary');
    });

    it('renders distinct icons for each status option', () => {
      const html = renderToStaticMarkup(
        React.createElement(StatusWheel, { currentStatus: 'IN_WASH' })
      );

      expect(html).toContain('check_circle');
      expect(html).toContain('cancel');
      expect(html).toContain('water_drop');
      expect(html).toContain('dry_cleaning');
    });
  });

  describe('Color Independence (Non-Color Status Signals)', () => {
    it('combines text badge, color tokens, and distinct icon glyphs for every status', () => {
      const cleanHtml = renderToStaticMarkup(
        React.createElement(Badge, { variant: 'clean' }, 'CLEAN')
      );
      expect(cleanHtml).toContain('CLEAN');
      expect(cleanHtml).toContain('check_circle');

      const dirtyHtml = renderToStaticMarkup(
        React.createElement(Badge, { variant: 'dirty' }, 'DIRTY')
      );
      expect(dirtyHtml).toContain('DIRTY');
      expect(dirtyHtml).toContain('cancel');

      const washHtml = renderToStaticMarkup(
        React.createElement(Badge, { variant: 'wash' }, 'IN WASH')
      );
      expect(washHtml).toContain('IN WASH');
      expect(washHtml).toContain('water_drop');

      const dryHtml = renderToStaticMarkup(
        React.createElement(Badge, { variant: 'dryclean' }, 'AT CLEANERS')
      );
      expect(dryHtml).toContain('AT CLEANERS');
      expect(dryHtml).toContain('dry_cleaning');
    });
  });

  describe('LaundryBoard Keyboard Navigation & Structure', () => {
    it('renders tablist and tabs with aria-selected states and focus rings', () => {
      const html = renderToStaticMarkup(React.createElement(LaundryBoard));

      expect(html).toContain('role="tablist"');
      expect(html).toContain('aria-label="Laundry status filters"');
      expect(html).toContain('role="tab"');
      expect(html).toContain('aria-selected="true"');
      expect(html).toContain('focus-visible:ring-2');
    });

    it('renders garment cards as focusable listitems with keyboard advance instructions', () => {
      const html = renderToStaticMarkup(React.createElement(LaundryBoard));

      expect(html).toContain('role="list"');
      expect(html).toContain('role="listitem"');
      expect(html).toContain('tabindex="0"');
      expect(html).toContain('Press Space or Enter to advance status');
      expect(html).toContain('focus-visible:ring-2');
    });
  });
});

