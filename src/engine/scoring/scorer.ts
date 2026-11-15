import { WardrobeItem, CulturalStyle } from '@/types';
import { evaluateHexColorHarmony, ColorHarmonyResult } from '../color/harmony';
import { ScorerWeightProfile } from './profiles';
import { evaluateItemRecency, RecencyEvaluationResult } from './recency';

export interface ScoreBreakdown {
  totalScore: number; // [0.0, 1.0]
  colorHarmony: {
    score: number;
    details: ColorHarmonyResult;
  };
  formalityAlignment: {
    score: number;
    gap: number;
    explanation: string;
  };
  styleCompatibility: {
    score: number;
    explanation: string;
  };
  accentAgreement: {
    score: number;
    explanation: string;
  };
  recencyPenalty: {
    penalty: number;
    daysAgo?: number;
    explanation: string;
  };
}

/**
 * Computes cultural style compatibility score between two styles.
 */
export function evaluateStyleCompatibility(styleA: CulturalStyle, styleB: CulturalStyle): { score: number; explanation: string } {
  if (styleA === styleB) {
    return {
      score: 1.0,
      explanation: `Shared ${styleA.replace(/_/g, ' ')} cultural lineage`,
    };
  }

  // Western & Islamic-Modest cross-cultural pairing (e.g., western trench + linen abaya)
  if (
    (styleA === 'western' && styleB === 'islamic_modest') ||
    (styleA === 'islamic_modest' && styleB === 'western')
  ) {
    return {
      score: 0.85,
      explanation: 'Contemporary fusion between Western tailoring and Modest silhouettes',
    };
  }

  // Western & Indian Traditional festive pairing (e.g., Bandhgala with tailored trousers)
  if (
    (styleA === 'western' && styleB === 'indian_traditional') ||
    (styleA === 'indian_traditional' && styleB === 'western')
  ) {
    return {
      score: 0.82,
      explanation: 'Indo-Western formal crossover',
    };
  }

  // Indian Traditional & Islamic Modest (e.g., Lucknowi Chikankari with Hijab / Dupatta)
  if (
    (styleA === 'indian_traditional' && styleB === 'islamic_modest') ||
    (styleA === 'islamic_modest' && styleB === 'indian_traditional')
  ) {
    return {
      score: 0.90,
      explanation: 'Regal South Asian & Modest festive coordination',
    };
  }

  return {
    score: 0.60,
    explanation: 'Cross-cultural contrast',
  };
}

/**
 * Evaluates metal hardware and leather tone harmony.
 */
export function evaluateAccentAgreement(itemA: WardrobeItem, itemB: WardrobeItem): { score: number; explanation: string } {
  const metalA = itemA.hardware_metal_color;
  const metalB = itemB.hardware_metal_color;
  const leatherA = itemA.leather_tone;
  const leatherB = itemB.leather_tone;

  // Metal agreement check
  let metalScore = 0.85;
  let metalText = 'Neutral hardware';
  if (metalA && metalB) {
    if (metalA === metalB) {
      metalScore = 1.0;
      metalText = `Coordinated ${metalA} hardware accents`;
    } else {
      // Gold vs Silver clash penalty
      metalScore = 0.45;
      metalText = `Mismatched hardware (${metalA} vs ${metalB})`;
    }
  }

  // Leather tone check
  let leatherScore = 0.85;
  let leatherText = 'Neutral leather';
  if (leatherA && leatherB) {
    if (leatherA === leatherB) {
      leatherScore = 1.0;
      leatherText = `Matching ${leatherA} leather tones`;
    } else {
      // Black leather with tan shoes penalty
      leatherScore = 0.40;
      leatherText = `Clashing leather tones (${leatherA} with ${leatherB})`;
    }
  }

  const score = Number(((metalScore + leatherScore) / 2).toFixed(2));
  return {
    score,
    explanation: `${metalText}; ${leatherText}`,
  };
}

/**
 * Evaluates lookback recency penalty.
 * If an item was worn recently (e.g., within 14 days of `now`), applies a gentle penalty
 * to encourage wardrobe rotation without hard-blocking.
 */
/**
 * Evaluates lookback recency penalty delegating to the unified recency engine.
 */
export function evaluateRecencyPenalty(
  item: WardrobeItem,
  now: Date
): RecencyEvaluationResult {
  return evaluateItemRecency(item, now);
}

/**
 * Pure evaluation function computing complete breakdown between an outfit pairing.
 */
export function scorePairing(
  itemA: WardrobeItem,
  itemB: WardrobeItem,
  profile: ScorerWeightProfile,
  now: Date
): ScoreBreakdown {
  // 1. Color Harmony
  const hexA = itemA.primary_color_hex || '#2B2B2B';
  const hexB = itemB.primary_color_hex || '#FFFFFF';
  const colorResult = evaluateHexColorHarmony(hexA, hexB);

  // 2. Formality Alignment
  const formalityGap = Math.abs(itemA.formality_level - itemB.formality_level);
  let formalityScore = 1.0;
  let formalityExplanation = 'Identical formality index';
  if (formalityGap === 1) {
    formalityScore = 0.85;
    formalityExplanation = 'Harmonious adjacent formality (±1 band)';
  } else if (formalityGap > 1) {
    formalityScore = Math.max(0.1, 1.0 - formalityGap * 0.35);
    formalityExplanation = `Formality divergence (${itemA.formality_level} vs ${itemB.formality_level})`;
  }

  // 3. Cultural Style Compatibility
  const styleResult = evaluateStyleCompatibility(itemA.cultural_style, itemB.cultural_style);

  // 4. Accent Agreement (Metals & Leathers)
  const accentResult = evaluateAccentAgreement(itemA, itemB);

  // 5. Recency Penalty
  const recencyA = evaluateRecencyPenalty(itemA, now);
  const recencyB = evaluateRecencyPenalty(itemB, now);
  const combinedRecencyPenalty = Math.max(recencyA.penalty, recencyB.penalty);

  // Weighted aggregate sum
  const { weights } = profile;
  const rawTotal =
    colorResult.score * weights.colorHarmony +
    formalityScore * weights.formalityAlignment +
    styleResult.score * weights.styleCompatibility +
    accentResult.score * weights.accentAgreement -
    combinedRecencyPenalty * weights.recencyPenalty;

  const totalScore = Math.max(0, Math.min(1, Number(rawTotal.toFixed(3))));

  return {
    totalScore,
    colorHarmony: {
      score: colorResult.score,
      details: colorResult,
    },
    formalityAlignment: {
      score: formalityScore,
      gap: formalityGap,
      explanation: formalityExplanation,
    },
    styleCompatibility: {
      score: styleResult.score,
      explanation: styleResult.explanation,
    },
    accentAgreement: {
      score: accentResult.score,
      explanation: accentResult.explanation,
    },
    recencyPenalty: {
      penalty: combinedRecencyPenalty,
      daysAgo: recencyA.daysAgo ?? recencyB.daysAgo,
      explanation: recencyA.penalty > 0 ? recencyA.explanation : recencyB.explanation,
    },
  };
}

