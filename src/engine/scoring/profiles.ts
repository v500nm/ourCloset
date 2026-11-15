export type TwinningTier = 'subtle' | 'balanced' | 'direct';

export interface ScorerWeightProfile {
  tier: TwinningTier;
  label: string;
  description: string;
  weights: {
    colorHarmony: number;
    formalityAlignment: number;
    styleCompatibility: number;
    accentAgreement: number;
    recencyPenalty: number;
  };
}

export const SCORER_PROFILES: Record<TwinningTier, ScorerWeightProfile> = {
  subtle: {
    tier: 'subtle',
    label: 'Subtle Harmony',
    description: 'Accessories & metal accents harmonize without direct color duplication.',
    weights: {
      colorHarmony: 0.45,
      formalityAlignment: 0.15,
      styleCompatibility: 0.15,
      accentAgreement: 0.20,
      recencyPenalty: 0.05,
    },
  },
  balanced: {
    tier: 'balanced',
    label: 'Balanced Co-Op',
    description: 'Formality index matched within ±1 band with complementary palette weight.',
    weights: {
      colorHarmony: 0.35,
      formalityAlignment: 0.30,
      styleCompatibility: 0.20,
      accentAgreement: 0.10,
      recencyPenalty: 0.05,
    },
  },
  direct: {
    tier: 'direct',
    label: 'Direct Twinning',
    description: 'Identical cultural style & exact colorway pairing for festive events.',
    weights: {
      colorHarmony: 0.25,
      formalityAlignment: 0.30,
      styleCompatibility: 0.35,
      accentAgreement: 0.05,
      recencyPenalty: 0.05,
    },
  },
};

