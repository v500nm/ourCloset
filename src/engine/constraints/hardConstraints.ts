import { WardrobeItem, FormalityLevel, CulturalStyle } from '@/types';

export interface WeatherCondition {
  temperatureCelsius: number;
  apparentTemperatureCelsius?: number;
  isRaining?: boolean;
  precipitationProbability?: number;
  weatherCode?: number;
}

export interface EngineContext {
  targetFormality: FormalityLevel; // 1 to 5
  culturalStyle?: CulturalStyle;
  isPartnerEvaluation?: boolean; // If true, exclude PRIVATE items
  modestyFloor?: boolean; // If true, enforce high modesty standards (e.g. Islamic-modest, formal Indian)
  weather?: WeatherCondition;
}

export interface ConstraintEvaluation {
  passed: boolean;
  reason?: string;
}

/**
 * Validates a single wardrobe item against all hard constraints.
 * If any hard constraint fails, the item is strictly removed before scoring.
 */
export function evaluateHardConstraints(
  item: WardrobeItem,
  context: EngineContext
): ConstraintEvaluation {
  // 1. Laundry Availability Constraint: Item MUST be CLEAN
  if (item.laundry_status !== 'CLEAN') {
    return {
      passed: false,
      reason: `Item is not clean (current status: ${item.laundry_status})`,
    };
  }

  // 2. Formality Band Constraint: |item.formality_level - targetFormality| <= 1
  const formalityGap = Math.abs(item.formality_level - context.targetFormality);
  if (formalityGap > 1) {
    return {
      passed: false,
      reason: `Formality level ${item.formality_level} exceeds target band ${context.targetFormality} ± 1`,
    };
  }

  // 3. Privacy Constraint: Partner cannot view or wear PRIVATE tier garments
  if (context.isPartnerEvaluation && item.privacy_tier === 'PRIVATE') {
    return {
      passed: false,
      reason: 'Item is marked PRIVATE and excluded from partner twinning',
    };
  }

  // 4. Modesty Floor: When active, item cultural style or category must satisfy modesty
  if (context.modestyFloor) {
    // If context demands strict modest coverage (e.g. jummah, nikah, temple pooja),
    // nightwear or ultra-casual garments are disqualified
    if (item.category === 'nightwear' || (item.formality_level < 3 && item.category === 'tshirt')) {
      return {
        passed: false,
        reason: 'Item does not meet the event modesty floor requirement',
      };
    }
  }

  // 5. Weather Exclusions
  if (context.weather) {
    const { temperatureCelsius, isRaining, precipitationProbability = 0 } = context.weather;
    const isWet = isRaining || precipitationProbability >= 40;

    // Rain / precipitation >= 40%: Suede, delicate pure silks excluded
    if (isWet) {
      if (item.fabric_type === 'silk') {
        return {
          passed: false,
          reason: 'Delicate silk fabric excluded due to rain risk (>= 40% precipitation)',
        };
      }
      if (item.fabric_type === 'linen' && item.category === 'pants' && item.formality_level >= 3) {
        return {
          passed: false,
          reason: 'Pure linen trousers excluded in wet conditions',
        };
      }
    }

    // Cold temperatures (< 15°C): Exclude pure sheer chiffon/georgette
    if (temperatureCelsius < 15) {
      if (item.fabric_type === 'chiffon' || item.fabric_type === 'georgette') {
        return {
          passed: false,
          reason: 'Lightweight sheer chiffon/georgette excluded in cold temperatures (< 15°C)',
        };
      }
    }

    // Heat (> 28°C): Exclude heavy wool and heavy formal multi-piece suits
    if (temperatureCelsius > 28) {
      if (item.fabric_type === 'wool' || (item.category === 'suit' && item.formality_level >= 4)) {
        return {
          passed: false,
          reason: 'Heavy wool / formal layered suit excluded in high heat (> 28°C)',
        };
      }
    }
  }

  return { passed: true };
}

/**
 * Filters an entire wardrobe candidate list through the hard constraint pipeline.
 */
export function filterCandidates(
  items: WardrobeItem[],
  context: EngineContext
): WardrobeItem[] {
  return items.filter((item) => evaluateHardConstraints(item, context).passed);
}

