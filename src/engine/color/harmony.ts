import { OKLCH, hexToOklch } from './oklch';
import { classifyNeutral } from './neutral';

export type HarmonyType =
  | 'monochrome'
  | 'analogous'
  | 'complementary'
  | 'split_complementary'
  | 'triadic'
  | 'neutral_anchored'
  | 'clash';

export interface ColorHarmonyResult {
  harmonyType: HarmonyType;
  score: number; // [0.0, 1.0]
  hueDifference: number; // degrees [0, 180]
  lightnessContrast: number; // delta L [0, 1]
  explanation: string;
}

/**
 * Calculates the shortest angular distance between two hue angles on a 360-degree color wheel.
 */
export function getHueDifference(h1: number, h2: number): number {
  const diff = Math.abs(h1 - h2) % 360;
  return diff > 180 ? 360 - diff : diff;
}

/**
 * Evaluates sartorial color harmony between two OKLCH coordinates.
 */
export function evaluateColorHarmony(colorA: OKLCH, colorB: OKLCH): ColorHarmonyResult {
  const neutralA = classifyNeutral(colorA);
  const neutralB = classifyNeutral(colorB);
  const deltaL = Math.abs(colorA.l - colorB.l);
  const deltaH = getHueDifference(colorA.h, colorB.h);

  // 1. Both colors are neutral
  if (neutralA.isNeutral && neutralB.isNeutral) {
    // Check contrast: High contrast (e.g., white + black) or subtle tonal layering (charcoal + grey)
    const isHighContrast = deltaL >= 0.45;
    const score = isHighContrast ? 0.98 : 0.90;
    return {
      harmonyType: 'neutral_anchored',
      score,
      hueDifference: deltaH,
      lightnessContrast: deltaL,
      explanation: isHighContrast
        ? 'High-contrast monochrome neutral anchor'
        : 'Tonal neutral layering',
    };
  }

  // 2. One color is neutral, one is chromatic
  if (neutralA.isNeutral || neutralB.isNeutral) {
    const neutralCategory = neutralA.isNeutral ? neutralA.category : neutralB.category;
    // Neutrals provide a grounded canvas for chromatic accents
    return {
      harmonyType: 'neutral_anchored',
      score: 0.92,
      hueDifference: deltaH,
      lightnessContrast: deltaL,
      explanation: `Anchored by ${neutralCategory.replace(/_/g, ' ')}`,
    };
  }

  // 3. Both are chromatic colors: evaluate based on color wheel geometry
  // Monochrome: closely matching hue
  if (deltaH <= 18) {
    // Lightness variation makes monochrome look intentional rather than washed out
    const score = deltaL >= 0.15 ? 0.95 : 0.88;
    return {
      harmonyType: 'monochrome',
      score,
      hueDifference: deltaH,
      lightnessContrast: deltaL,
      explanation: 'Monochromatic tone-on-tone pairing',
    };
  }

  // Analogous: neighbors on the color wheel (e.g., emerald green + teal, saffron yellow + marigold orange)
  if (deltaH > 18 && deltaH <= 60) {
    return {
      harmonyType: 'analogous',
      score: 0.91,
      hueDifference: deltaH,
      lightnessContrast: deltaL,
      explanation: 'Harmonious analogous color wheel neighbors',
    };
  }

  // Complementary: exact or near opposites (e.g., deep sapphire blue + burnt gold zari, forest green + burgundy)
  if (deltaH >= 150 && deltaH <= 210) {
    return {
      harmonyType: 'complementary',
      score: 0.96,
      hueDifference: deltaH,
      lightnessContrast: deltaL,
      explanation: 'High-impact complementary spectrum opposition',
    };
  }

  // Split-Complementary: balanced vibrancy (120-150 deg or 210-240 deg)
  if ((deltaH >= 120 && deltaH < 150) || (deltaH > 210 && deltaH <= 240)) {
    return {
      harmonyType: 'split_complementary',
      score: 0.86,
      hueDifference: deltaH,
      lightnessContrast: deltaL,
      explanation: 'Balanced split-complementary harmony',
    };
  }

  // Triadic: dynamic triad
  if (deltaH >= 105 && deltaH < 120) {
    return {
      harmonyType: 'triadic',
      score: 0.80,
      hueDifference: deltaH,
      lightnessContrast: deltaL,
      explanation: 'Vibrant triadic chord',
    };
  }

  // Clash: awkward non-harmonic angles (45-105 deg with high saturation)
  const isHighSaturation = colorA.c > 0.12 && colorB.c > 0.12;
  const penaltyScore = isHighSaturation ? 0.30 : 0.50;

  return {
    harmonyType: 'clash',
    score: penaltyScore,
    hueDifference: deltaH,
    lightnessContrast: deltaL,
    explanation: 'Discordant non-harmonic hue angle',
  };
}

/**
 * Convenience evaluator from hex strings.
 */
export function evaluateHexColorHarmony(hexA: string, hexB: string): ColorHarmonyResult {
  return evaluateColorHarmony(hexToOklch(hexA), hexToOklch(hexB));
}
