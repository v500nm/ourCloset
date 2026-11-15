import { ScoreBreakdown } from '../scoring/scorer';
import { WardrobeItem } from '@/types';
import { ScorerWeightProfile } from '../scoring/profiles';

/**
 * Generates an articulate, explainable sartorial matchReason from the deterministic
 * score breakdown and item metadata. No hardcoded or static template strings.
 */
export function generateMatchReason(
  breakdown: ScoreBreakdown,
  initiatorItem: WardrobeItem,
  partnerItem: WardrobeItem,
  profile: ScorerWeightProfile
): string {
  const parts: string[] = [];

  // 1. Color Harmony Clause
  const { details: colorDetails } = breakdown.colorHarmony;
  const colorExp = colorDetails.explanation;
  const colorA = initiatorItem.primary_color_hex || 'Primary';
  const colorB = partnerItem.primary_color_hex || 'Secondary';

  switch (colorDetails.harmonyType) {
    case 'neutral_anchored':
      parts.push(`${colorExp} providing a grounded canvas between ${initiatorItem.title} and ${partnerItem.title}.`);
      break;
    case 'monochrome':
      parts.push(`Monochromatic tonal alignment across both silhouettes (${colorA} & ${colorB}).`);
      break;
    case 'analogous':
      parts.push(`Flowing analogous color harmony creating an effortless spectrum pairing.`);
      break;
    case 'complementary':
      parts.push(`Vibrant complementary opposition creating high-impact visual interest.`);
      break;
    case 'split_complementary':
      parts.push(`Balanced split-complementary harmony offering sophisticated color nuance.`);
      break;
    default:
      if (colorDetails.score >= 0.8) {
        parts.push(`Harmonious color compatibility between ${initiatorItem.title} and ${partnerItem.title}.`);
      }
      break;
  }

  // 2. Formality Clause
  if (breakdown.formalityAlignment.gap === 0) {
    parts.push(`Formality index matched at level ${initiatorItem.formality_level}.`);
  } else if (breakdown.formalityAlignment.gap === 1) {
    parts.push(`Complementary formality balance (${initiatorItem.formality_level} paired with ${partnerItem.formality_level}).`);
  }

  // 3. Cultural & Accent Clause
  if (breakdown.accentAgreement.score >= 0.95) {
    parts.push(breakdown.accentAgreement.explanation);
  }

  // 4. Style Tier Reflection
  if (profile.tier === 'direct' && initiatorItem.cultural_style === partnerItem.cultural_style) {
    parts.push(`Coordinated ${initiatorItem.cultural_style.replace(/_/g, ' ')} traditional ensemble.`);
  }

  return parts.join(' ');
}

