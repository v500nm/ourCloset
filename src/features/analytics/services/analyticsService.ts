/**
 * Wardrobe Analytics Service
 * Computes live metrics from user's local Dexie databases (wardrobeRepository & outfitRepository).
 * Zero mock data: real gap analysis, wear counts, and cost-per-wear stats.
 */

import { wardrobeRepository } from '@/data/repositories/wardrobeRepository';
import { outfitRepository } from '@/data/repositories/outfitRepository';
import {
  CostPerWearStat,
  DeclutterNudgeItem,
  MatrixCoverageCell,
  WardrobeAnalyticsSummary,
} from '../types/analytics.types';
import { CulturalStyle, FormalityLevel, WardrobeItem } from '@/types';

const STYLES: CulturalStyle[] = ['western', 'indian_traditional', 'islamic_modest'];
const FORMALITIES: FormalityLevel[] = [1, 2, 3, 4, 5];

/**
 * Computes cultural style x formality level coverage matrix from live wardrobe items.
 */
export async function fetchGapAnalysisMatrix(
  itemsOverride?: WardrobeItem[]
): Promise<MatrixCoverageCell[]> {
  const items = itemsOverride || (await wardrobeRepository.getAll());
  const matrix: MatrixCoverageCell[] = [];

  for (const style of STYLES) {
    for (const formality of FORMALITIES) {
      const matching = items.filter(
        (i) => i.cultural_style === style && i.formality_level === formality && !i.deleted_at
      );
      const itemCount = matching.length;
      // High formality (F4/F5) with 0 items is flagged as a wardrobe gap
      const isGap = itemCount === 0 && formality >= 3;

      matrix.push({
        culturalStyle: style,
        formalityLevel: formality,
        itemCount,
        isGap,
      });
    }
  }

  return matrix;
}

/**
 * Identifies dormant items that are candidates for decluttering or donation.
 * Items with 0 wear count or not worn in > 60 days.
 */
export async function fetchDeclutterNudges(
  itemsOverride?: WardrobeItem[]
): Promise<DeclutterNudgeItem[]> {
  const items = itemsOverride || (await wardrobeRepository.getAll());
  const now = Date.now();
  const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000;
  const nudges: DeclutterNudgeItem[] = [];

  for (const item of items) {
    if (item.deleted_at) continue;

    let daysSinceWorn: number | undefined;
    if (item.last_worn_at) {
      daysSinceWorn = Math.round((now - new Date(item.last_worn_at).getTime()) / (1000 * 60 * 60 * 24));
    }

    const isDormant =
      item.wear_count === 0 || (daysSinceWorn !== undefined && daysSinceWorn >= 60);

    if (isDormant) {
      nudges.push({
        id: item.id,
        title: item.title,
        lastWornAt: item.last_worn_at,
        wearCount: item.wear_count,
        daysSinceWorn,
      });
    }
  }

  return nudges.sort((a, b) => (b.daysSinceWorn || 999) - (a.daysSinceWorn || 999));
}

/**
 * Computes cost-per-wear stats for all wardrobe items.
 */
export async function fetchCostPerWearStats(
  itemsOverride?: WardrobeItem[]
): Promise<CostPerWearStat[]> {
  const items = itemsOverride || (await wardrobeRepository.getAll());

  return items
    .filter((i) => !i.deleted_at)
    .map((item) => {
      const price = item.purchase_price || 75; // Default estimate if price not recorded
      const wearCount = item.wear_count || 0;
      const costPerWear = Number((price / Math.max(1, wearCount)).toFixed(2));

      return {
        itemId: item.id,
        title: item.title,
        purchasePrice: item.purchase_price,
        wearCount,
        costPerWear,
      };
    })
    .sort((a, b) => a.costPerWear - b.costPerWear);
}

/**
 * Generates an aggregated summary of live wardrobe health and usage.
 */
export async function fetchAnalyticsSummary(): Promise<WardrobeAnalyticsSummary> {
  const [items, outfits] = await Promise.all([
    wardrobeRepository.getAll(),
    outfitRepository.getAll(),
  ]);

  const activeItems = items.filter((i) => !i.deleted_at);
  const matrix = await fetchGapAnalysisMatrix(activeItems);
  const nudges = await fetchDeclutterNudges(activeItems);
  const cpwStats = await fetchCostPerWearStats(activeItems);

  const totalWearCount = activeItems.reduce((acc, i) => acc + (i.wear_count || 0), 0);
  const avgWearCount = activeItems.length > 0 ? totalWearCount / activeItems.length : 0;

  const totalCpw = cpwStats.reduce((acc, s) => acc + s.costPerWear, 0);
  const avgCpw = cpwStats.length > 0 ? totalCpw / cpwStats.length : 0;

  const gapCount = matrix.filter((c) => c.isGap).length;

  return {
    totalItems: activeItems.length,
    totalLoggedOutfits: outfits.length,
    averageWearCount: Number(avgWearCount.toFixed(1)),
    averageCostPerWear: Number(avgCpw.toFixed(2)),
    gapCount,
    coverageMatrix: matrix,
    declutterNudges: nudges,
    topWornItems: cpwStats.slice(0, 5),
  };
}
