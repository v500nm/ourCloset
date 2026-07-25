import { ContextAttributes, ContextPreset, EventSubContext } from '../types/context.types';
import { cosineSimilarity } from '@/utils';

export const CONTEXT_TEMPLATES: (ContextAttributes & { keywords: string[] })[] = [
  {
    label: 'office_formal',
    preset: 'Office',
    formality: 4,
    warmth: 'neutral',
    modesty: 'medium',
    culturalStyle: 'western',
    keywords: ['office', 'formal', 'meeting', 'executive', 'business', 'corporate', 'work'],
  },
  {
    label: 'casual_weekend',
    preset: 'Casual',
    formality: 2,
    warmth: 'neutral',
    modesty: 'low',
    culturalStyle: 'western',
    keywords: ['casual', 'weekend', 'coffee', 'walk', 'park', 'brunch', 'easy'],
  },
  {
    label: 'sangeet_festive',
    preset: 'Event',
    subPreset: 'Sangeet',
    formality: 5,
    warmth: 'high',
    modesty: 'medium',
    culturalStyle: 'indian_traditional',
    keywords: ['sangeet', 'festive', 'dance', 'colorful', 'wedding', 'traditional', 'mehendi'],
  },
  {
    label: 'eid_gathering_modest',
    preset: 'Event',
    subPreset: 'Eid',
    formality: 4,
    warmth: 'high',
    modesty: 'high',
    culturalStyle: 'islamic_modest',
    keywords: ['eid', 'modest', 'family', 'festive', 'prayer', 'celebration', 'abaya'],
  },
  {
    label: 'beach_cocktail_modest',
    preset: 'Event',
    subPreset: 'Gala',
    formality: 3,
    warmth: 'high',
    modesty: 'high',
    culturalStyle: 'islamic_modest',
    keywords: ['beach', 'sunset', 'cocktail', 'pastel', 'modest', 'coastal', 'breeze'],
  },
];

export async function resolveContextFromPreset(
  preset: ContextPreset,
  subPreset?: EventSubContext
): Promise<ContextAttributes> {
  const found = CONTEXT_TEMPLATES.find(
    (t) => t.preset === preset && (subPreset ? t.subPreset === subPreset : true)
  );

  if (found) return found;

  return {
    label: `${preset.toLowerCase()}_default`,
    preset,
    subPreset,
    formality: preset === 'Event' ? 4 : preset === 'Office' ? 4 : 2,
    warmth: 'neutral',
    modesty: 'medium',
    culturalStyle: 'western',
  };
}

export async function resolveContextFromFreeform(userText: string): Promise<ContextAttributes> {
  const query = userText.toLowerCase();
  
  let bestMatch = CONTEXT_TEMPLATES[0];
  let maxScore = -1;

  for (const template of CONTEXT_TEMPLATES) {
    let score = 0;
    for (const kw of template.keywords) {
      if (query.includes(kw)) {
        score += 2;
      }
    }
    if (score > maxScore) {
      maxScore = score;
      bestMatch = template;
    }
  }

  return {
    ...bestMatch,
    label: `matched_${bestMatch.label}`,
  };
}
