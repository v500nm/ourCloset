import { describe, it, expect } from 'vitest';
import {
  applyWeeklyReset,
  getMostRecentPassedSundayBoundary,
} from '@/features/laundry/services/laundryReset';
import { WardrobeItem } from '@/types';

const mockItems: WardrobeItem[] = [
  {
    id: 'item-clean',
    user_id: 'user-1',
    title: 'Clean Shirt',
    category: 'shirt',
    cultural_style: 'western',
    formality_level: 3,
    image_url: 'img1.jpg',
    laundry_status: 'CLEAN',
    privacy_tier: 'PUBLIC',
    season_tags: ['all-season'],
    wear_count: 3,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'item-dirty',
    user_id: 'user-1',
    title: 'Dirty Pants',
    category: 'pants',
    cultural_style: 'western',
    formality_level: 3,
    image_url: 'img2.jpg',
    laundry_status: 'DIRTY',
    privacy_tier: 'PUBLIC',
    season_tags: ['all-season'],
    wear_count: 5,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'item-in-wash',
    user_id: 'user-1',
    title: 'Washing Kurta',
    category: 'traditional_combo',
    cultural_style: 'indian_traditional',
    formality_level: 4,
    image_url: 'img3.jpg',
    laundry_status: 'IN_WASH',
    privacy_tier: 'PUBLIC',
    season_tags: ['summer'],
    wear_count: 1,
    created_at: '2026-01-01T00:00:00Z',
  },
];

describe('applyWeeklyReset Pure Function & Sunday Boundary', () => {
  it('correctly calculates the passed Sunday boundary when now is Sunday morning', () => {
    // 2026-02-15 is a Sunday
    const sundayMorning = new Date(2026, 1, 15, 10, 0, 0); // Feb 15, 2026 10:00 AM
    const boundary = getMostRecentPassedSundayBoundary(sundayMorning);

    // EOD has not passed yet, so most recent passed boundary was Feb 8, 2026 23:59:59.999
    expect(boundary.getFullYear()).toBe(2026);
    expect(boundary.getMonth()).toBe(1); // February
    expect(boundary.getDate()).toBe(8);
    expect(boundary.getHours()).toBe(23);
    expect(boundary.getMinutes()).toBe(59);
    expect(boundary.getSeconds()).toBe(59);
  });

  it('correctly calculates boundary when now is Monday morning', () => {
    // 2026-02-16 is Monday
    const mondayMorning = new Date(2026, 1, 16, 8, 0, 0);
    const boundary = getMostRecentPassedSundayBoundary(mondayMorning);

    // Boundary should be yesterday: Sunday Feb 15, 2026 23:59:59.999
    expect(boundary.getDate()).toBe(15);
    expect(boundary.getHours()).toBe(23);
  });

  it('resets dirty items to CLEAN when crossing Sunday boundary on first run', () => {
    const mondayMorning = new Date(2026, 1, 16, 9, 0, 0);
    const result = applyWeeklyReset(mockItems, mondayMorning, null);

    expect(result.resetApplied).toBe(true);
    expect(result.newResetDate.getDate()).toBe(15);

    const dirtyItem = result.items.find(i => i.id === 'item-dirty');
    const cleanItem = result.items.find(i => i.id === 'item-clean');
    const washItem = result.items.find(i => i.id === 'item-in-wash');

    expect(dirtyItem?.laundry_status).toBe('CLEAN');
    expect(cleanItem?.laundry_status).toBe('CLEAN');
    expect(washItem?.laundry_status).toBe('IN_WASH'); // active processes kept intact
  });

  it('does NOT reset if lastReset is already at or after the most recent boundary', () => {
    const mondayMorning = new Date(2026, 1, 16, 9, 0, 0);
    const passedSundayEOD = new Date(2026, 1, 15, 23, 59, 59, 999);

    // Simulated already processed
    const result = applyWeeklyReset(mockItems, mondayMorning, passedSundayEOD);

    expect(result.resetApplied).toBe(false);
    expect(result.items.find(i => i.id === 'item-dirty')?.laundry_status).toBe('DIRTY');
  });

  it('handles Daylight Saving Time transitions gracefully', () => {
    // US DST Spring forward: March 8, 2026 (Sunday)
    const postDstMonday = new Date(2026, 2, 9, 7, 0, 0);
    const boundary = getMostRecentPassedSundayBoundary(postDstMonday);

    expect(boundary.getDate()).toBe(8);
    expect(boundary.getHours()).toBe(23);

    const result = applyWeeklyReset(mockItems, postDstMonday, new Date(2026, 2, 1, 23, 59, 59, 999));
    expect(result.resetApplied).toBe(true);
  });
});

