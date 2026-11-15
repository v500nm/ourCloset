import { describe, it, expect, beforeEach } from 'vitest';
import {
  evaluateItemRecency,
  isIdenticalOutfitRepeated,
} from '@/engine/scoring/recency';
import { outfitRepository } from '@/data/repositories/outfitRepository';
import { OutfitHistory, WardrobeItem } from '@/types';

function createMockItem(id: string, lastWornAt?: string): WardrobeItem {
  return {
    id,
    user_id: 'user-test',
    title: `Item ${id}`,
    category: 'shirt',
    cultural_style: 'western',
    formality_level: 3,
    image_url: 'https://example.com/img.jpg',
    laundry_status: 'CLEAN',
    privacy_tier: 'PUBLIC',
    season_tags: ['all-season'],
    wear_count: 3,
    last_worn_at: lastWornAt,
    created_at: new Date().toISOString(),
  };
}

describe('No-Repeat Guard & Recency Scoring', () => {
  const baseNow = new Date('2026-11-15T12:00:00Z');

  describe('evaluateItemRecency', () => {
    it('returns zero penalty for never-worn items', () => {
      const item = createMockItem('item-fresh');
      const result = evaluateItemRecency(item, baseNow);
      expect(result.penalty).toBe(0);
      expect(result.explanation).toContain('fresh rotation');
    });

    it('returns zero penalty for items worn 15 days ago (clear of 14-day window)', () => {
      const item = createMockItem('item-old', '2026-10-31T12:00:00Z'); // 15 days ago
      const result = evaluateItemRecency(item, baseNow);
      expect(result.penalty).toBe(0);
      expect(result.daysAgo).toBe(15);
      expect(result.explanation).toContain('clear of 14-day lookback guard');
    });

    it('applies the strongest penalty (0.45 - 0.50) for items worn within 3 days', () => {
      const itemWornYesterday = createMockItem('item-yesterday', '2026-11-14T12:00:00Z'); // 1 day ago
      const result = evaluateItemRecency(itemWornYesterday, baseNow);
      expect(result.penalty).toBeGreaterThanOrEqual(0.45);
      expect(result.penalty).toBeLessThanOrEqual(0.50);
      expect(result.daysAgo).toBe(1);
      expect(result.explanation).toContain('high recency penalty');
    });

    it('tapers off penalty smoothly between day 4 and day 14', () => {
      const day4Item = createMockItem('item-4', '2026-11-11T12:00:00Z'); // 4 days ago
      const day8Item = createMockItem('item-8', '2026-11-07T12:00:00Z'); // 8 days ago
      const day12Item = createMockItem('item-12', '2026-11-03T12:00:00Z'); // 12 days ago

      const res4 = evaluateItemRecency(day4Item, baseNow);
      const res8 = evaluateItemRecency(day8Item, baseNow);
      const res12 = evaluateItemRecency(day12Item, baseNow);

      expect(res4.penalty).toBeGreaterThan(res8.penalty);
      expect(res8.penalty).toBeGreaterThan(res12.penalty);
      expect(res12.penalty).toBeGreaterThan(0);
    });

    it('cross-references external recent outfit logs', () => {
      const item = createMockItem('item-logged');
      const recentLogs: OutfitHistory[] = [
        {
          id: 'log-1',
          worn_by: 'Self',
          worn_at: '2026-11-14T08:00:00Z', // 1 day ago
          item_ids: ['item-logged', 'item-pants'],
          event_context: 'Office',
          created_at: new Date().toISOString(),
        },
      ];

      const result = evaluateItemRecency(item, baseNow, recentLogs);
      expect(result.penalty).toBeGreaterThanOrEqual(0.45);
      expect(result.daysAgo).toBe(1);
    });
  });

  describe('isIdenticalOutfitRepeated', () => {
    const candidateIds = ['item-top-1', 'item-bottom-1', 'item-shoes-1'];
    const mockLogs: OutfitHistory[] = [
      {
        id: 'log-wedding',
        worn_by: 'Self',
        worn_at: '2026-11-10T18:00:00Z', // 5 days ago
        item_ids: ['item-bottom-1', 'item-top-1', 'item-shoes-1'], // Same items, different order
        event_context: 'Wedding',
        created_at: new Date().toISOString(),
      },
    ];

    it('hard-blocks repeating identical outfit for the same event category within 30 days', () => {
      const check = isIdenticalOutfitRepeated(candidateIds, mockLogs, 'Wedding', baseNow, 30);
      expect(check.isRepeated).toBe(true);
      expect(check.reason).toContain('Identical outfit was already worn');
    });

    it('allows outfit when one item is swapped', () => {
      const modifiedIds = ['item-top-1', 'item-bottom-2', 'item-shoes-1'];
      const check = isIdenticalOutfitRepeated(modifiedIds, mockLogs, 'Wedding', baseNow, 30);
      expect(check.isRepeated).toBe(false);
    });

    it('allows outfit if worn more than 30 days ago', () => {
      const oldLogs: OutfitHistory[] = [
        {
          id: 'log-old',
          worn_by: 'Self',
          worn_at: '2026-09-01T18:00:00Z', // 75 days ago
          item_ids: ['item-top-1', 'item-bottom-1', 'item-shoes-1'],
          event_context: 'Wedding',
          created_at: new Date().toISOString(),
        },
      ];
      const check = isIdenticalOutfitRepeated(candidateIds, oldLogs, 'Wedding', baseNow, 30);
      expect(check.isRepeated).toBe(false);
    });
  });

  describe('outfitRepository integration', () => {
    beforeEach(async () => {
      await outfitRepository.clear();
    });

    it('retrieves outfits logged in the last N days', async () => {
      await outfitRepository.logOutfit({
        worn_by: 'Self',
        worn_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        item_ids: ['top-1', 'bot-1'],
        event_context: 'Casual',
      });

      await outfitRepository.logOutfit({
        worn_by: 'Self',
        worn_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(), // 20 days ago
        item_ids: ['top-2', 'bot-2'],
        event_context: 'Gala',
      });

      const last14Days = await outfitRepository.getOutfitsInLastDays(14);
      expect(last14Days.length).toBe(1);
      expect(last14Days[0].item_ids).toEqual(['top-1', 'bot-1']);
    });
  });
});
