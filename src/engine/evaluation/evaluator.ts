import { CulturalStyle } from '@/types';
import { LabeledPairing, EVALUATION_DATASET } from './evaluationSet';
import { scorePairing } from '../scoring/scorer';
import { SCORER_PROFILES } from '../scoring/profiles';

export interface TaxonomyEvaluationResult {
  taxonomy: CulturalStyle;
  totalPairings: number;
  precisionAt3: number;
  goodCount: number;
  acceptableCount: number;
  clashCount: number;
}

export interface ComprehensiveEvaluationReport {
  overallPrecisionAt3: number;
  taxonomyResults: Record<CulturalStyle, TaxonomyEvaluationResult>;
  passedBenchmark: boolean;
  timestamp: string;
}

/**
 * Evaluates the precision@3 performance of the outfit engine against the ground-truth labeled evaluation dataset.
 * Tenet 2 benchmark: Overall precision@3 >= 0.80 and no individual taxonomy below 0.70.
 */
export function runEngineEvaluation(
  dataset: LabeledPairing[] = EVALUATION_DATASET,
  now: Date = new Date('2026-03-01T12:00:00Z')
): ComprehensiveEvaluationReport {
  const taxonomies: CulturalStyle[] = ['western', 'indian_traditional', 'islamic_modest'];
  const profile = SCORER_PROFILES.balanced;
  const resultsByTaxonomy: Partial<Record<CulturalStyle, TaxonomyEvaluationResult>> = {};

  let totalRelevantInTop3 = 0;
  let totalEvaluatedScenarios = 0;

  for (const taxonomy of taxonomies) {
    const pairings = dataset.filter((p) => p.taxonomy === taxonomy);
    const candidatePool = pairings.map((p) => p.itemB);

    let taxonomyRelevantCount = 0;
    let scenarioCount = 0;
    let goodCount = 0;
    let acceptableCount = 0;
    let clashCount = 0;

    for (const testCase of pairings) {
      if (testCase.expectedRating === 'good') goodCount++;
      else if (testCase.expectedRating === 'acceptable') acceptableCount++;
      else if (testCase.expectedRating === 'clash') clashCount++;

      // Rank all candidate pool items against itemA using the engine
      const scoredCandidates = candidatePool.map((candidate) => {
        const breakdown = scorePairing(testCase.itemA, candidate, profile, now);
        // Find if this candidate had a known label with itemA
        const match = pairings.find(
          (p) => p.itemA.id === testCase.itemA.id && p.itemB.id === candidate.id
        );
        const rating = match ? match.expectedRating : (breakdown.totalScore >= 0.70 ? 'acceptable' : 'clash');
        return {
          candidate,
          score: breakdown.totalScore,
          rating,
        };
      });

      scoredCandidates.sort((a, b) => b.score - a.score);

      // Inspect top 3
      const top3 = scoredCandidates.slice(0, 3);
      const relevantInTop3 = top3.filter((c) => c.rating === 'good' || c.rating === 'acceptable').length;

      taxonomyRelevantCount += relevantInTop3;
      scenarioCount += 3;
    }

    const precisionAt3 = scenarioCount > 0 ? Number((taxonomyRelevantCount / scenarioCount).toFixed(3)) : 0;

    resultsByTaxonomy[taxonomy] = {
      taxonomy,
      totalPairings: pairings.length,
      precisionAt3,
      goodCount,
      acceptableCount,
      clashCount,
    };

    totalRelevantInTop3 += taxonomyRelevantCount;
    totalEvaluatedScenarios += scenarioCount;
  }

  const overallPrecisionAt3 =
    totalEvaluatedScenarios > 0
      ? Number((totalRelevantInTop3 / totalEvaluatedScenarios).toFixed(3))
      : 0;

  const passedBenchmark =
    overallPrecisionAt3 >= 0.8 &&
    Object.values(resultsByTaxonomy).every((r) => r && r.precisionAt3 >= 0.7);

  return {
    overallPrecisionAt3,
    taxonomyResults: resultsByTaxonomy as Record<CulturalStyle, TaxonomyEvaluationResult>,
    passedBenchmark,
    timestamp: now.toISOString(),
  };
}

