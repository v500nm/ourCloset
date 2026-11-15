import { OKLCH } from './oklch';

export type NeutralCategory =
  | 'pure_white'
  | 'pure_black'
  | 'charcoal'
  | 'navy'
  | 'cream_or_raw_silk'
  | 'beige_or_camel'
  | 'grey'
  | 'not_neutral';

/**
 * Determines whether a color is a sartorial neutral and categorizes it.
 * Per ADR-004:
 * Neutrals have low chroma (C < 0.045) or belong to specific classic staple bands
 * like deep midnight navy (C < 0.08, L < 0.35, H in blue spectrum 220-280).
 */
export function classifyNeutral(color: OKLCH): { isNeutral: boolean; category: NeutralCategory } {
  const { l, c, h } = color;

  // 1. Pure White (extreme lightness and near-zero chroma)
  if (l >= 0.97 && c < 0.02) {
    return { isNeutral: true, category: 'pure_white' };
  }

  // 2. Extreme darkness (Pure Blacks)
  if (l <= 0.18 && c < 0.035) {
    return { isNeutral: true, category: 'pure_black' };
  }

  // 3. Cream, Ivory & Raw Silk (warm high-lightness neutrals with soft golden/yellow undertones)
  if (l >= 0.88 && c < 0.06 && h >= 40 && h <= 120) {
    return { isNeutral: true, category: 'cream_or_raw_silk' };
  }

  // High lightness neutral white fallback
  if (l >= 0.94 && c < 0.04) {
    return { isNeutral: true, category: 'pure_white' };
  }

  // 4. Charcoal / Deep Slate
  if (l > 0.18 && l <= 0.38 && c < 0.04) {
    return { isNeutral: true, category: 'charcoal' };
  }

  // 5. Midnight Navy Staple (dark blue with moderate chroma behaves as neutral anchor)
  if (l <= 0.35 && c < 0.09 && h >= 220 && h <= 280) {
    return { isNeutral: true, category: 'navy' };
  }

  // 6. Beige, Khaki & Camel
  if (l >= 0.50 && l < 0.88 && c < 0.065 && h >= 50 && h <= 100) {
    return { isNeutral: true, category: 'beige_or_camel' };
  }

  // 7. General achromatic grey
  if (c < 0.035) {
    return { isNeutral: true, category: 'grey' };
  }

  return { isNeutral: false, category: 'not_neutral' };
}

export function isNeutralColor(color: OKLCH): boolean {
  return classifyNeutral(color).isNeutral;
}

export function classifySartorialNeutral(color: OKLCH): NeutralCategory | 'chromatic' {
  const result = classifyNeutral(color);
  return result.isNeutral ? result.category : 'chromatic';
}
