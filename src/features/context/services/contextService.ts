import { ContextAttributes, ContextPreset, EventSubContext } from '../types/context.types';
import { CulturalStyle } from '@/types';
import { cosineSimilarity } from '@/utils';
import PipelineSingleton from '@/services/transformers/pipeline';

export interface ContextTemplate extends ContextAttributes {
  keywords: string[];
  anchorDescription: string;
}

export const CONTEXT_TEMPLATES: ContextTemplate[] = [
  /* ---------------- OFFICE ARCHETYPES ---------------- */
  {
    label: 'office_executive_board',
    preset: 'Office',
    formality: 5,
    warmth: 'neutral',
    modesty: 'medium',
    culturalStyle: 'western',
    keywords: [
      'executive',
      'board meeting',
      'boardroom',
      'c-suite',
      'directors',
      'investor pitch',
      'court',
      'deposition',
      'contract signing',
      'annual general meeting',
      'high-stakes',
      'summit',
    ],
    anchorDescription: 'High-stakes executive corporate board meeting in formal dark suit and tie',
  },
  {
    label: 'office_corporate_formal',
    preset: 'Office',
    formality: 4,
    warmth: 'neutral',
    modesty: 'medium',
    culturalStyle: 'western',
    keywords: [
      'office',
      'corporate',
      'work',
      'meeting',
      'client meeting',
      'quarterly',
      'business review',
      'interview',
      'job interview',
      'financial',
      'enterprise',
      'symposium',
      'academic',
    ],
    anchorDescription: 'Professional corporate office environment for client meetings and reviews',
  },
  {
    label: 'office_smart_casual',
    preset: 'Office',
    formality: 3,
    warmth: 'neutral',
    modesty: 'medium',
    culturalStyle: 'western',
    keywords: [
      'smart casual',
      'tech office',
      'startup',
      'creative agency',
      'sprint planning',
      'casual friday',
      'coworking',
      'team lunch',
      'developer',
      'keynote',
      'conference',
    ],
    anchorDescription: 'Smart casual tech office environment with relaxed modern tailoring',
  },
  {
    label: 'office_traditional_ethnic',
    preset: 'Office',
    formality: 3,
    warmth: 'neutral',
    modesty: 'high',
    culturalStyle: 'indian_traditional',
    keywords: [
      'ethnic friday',
      'office kurta',
      'traditional office',
      'ethnic workwear',
      'bandhgala tunic',
      'khadi workwear',
      'fabindia office',
    ],
    anchorDescription: 'Indian traditional smart casual workwear for office and corporate settings',
  },
  {
    label: 'office_modest_corporate',
    preset: 'Office',
    formality: 4,
    warmth: 'neutral',
    modesty: 'high',
    culturalStyle: 'islamic_modest',
    keywords: [
      'corporate abaya',
      'modest office',
      'professional hijab',
      'modest workwear',
      'dubai financial',
      'corporate modest',
      'neutral hijab',
    ],
    anchorDescription: 'Professional corporate modest business wear with tailored abaya and hijab',
  },

  /* ---------------- CASUAL ARCHETYPES ---------------- */
  {
    label: 'casual_weekend_brunch',
    preset: 'Casual',
    formality: 2,
    warmth: 'neutral',
    modesty: 'low',
    culturalStyle: 'western',
    keywords: [
      'brunch',
      'weekend',
      'coffee',
      'cafe',
      'sidewalk cafe',
      'pastries',
      'friends',
      'afternoon tea',
      'bistro',
      'farmers market',
      'coffee date',
      'picnic',
      'botanical garden',
      'barbecue',
      'bbq',
      'golf',
      'golf club',
      'museum',
      'museum exhibition',
    ],
    anchorDescription: 'Relaxed daytime weekend brunch and coffee with friends at outdoor cafes',
  },
  {
    label: 'casual_errands_streetwear',
    preset: 'Casual',
    formality: 1,
    warmth: 'neutral',
    modesty: 'low',
    culturalStyle: 'western',
    keywords: [
      'casual',
      'errands',
      'grocery',
      'shopping',
      'park walk',
      'stroll',
      'sneakers',
      'streetwear',
      'gym',
      'workout',
      'jogging',
      'marathon',
      'record stores',
      'vintage shops',
      'casual outing',
    ],
    anchorDescription: 'Ultra-casual streetwear for daily errands, park strolls, and shopping',
  },
  {
    label: 'casual_desi_comfort',
    preset: 'Casual',
    formality: 2,
    warmth: 'neutral',
    modesty: 'medium',
    culturalStyle: 'indian_traditional',
    keywords: [
      'cotton kurta',
      'casual kurta',
      'chikankari',
      'bazaar',
      'bazaar shopping',
      'chandni chowk',
      'chai stall',
      'desi casual',
      'desi brunch',
      'rehearsal',
      'tailoring appointment',
      'gallery preview',
      'art gallery',
      'makar sankranti',
      'kite flying',
      'temple walk',
      'temple',
      'modest linen kurta',
    ],
    anchorDescription: 'Everyday comfortable Indian traditional cotton kurta and casual attire',
  },
  {
    label: 'casual_modest_daily',
    preset: 'Casual',
    formality: 2,
    warmth: 'neutral',
    modesty: 'high',
    culturalStyle: 'islamic_modest',
    keywords: [
      'casual abaya',
      'flowy abaya',
      'modest street',
      'daily hijab',
      'corniche',
      'modest casual',
      'modest brunch',
      'slip-on abaya',
      'modest hoodie',
      'modest shopping',
      'trunk show',
      'carnival',
      'charity iftar distribution',
      'student casual',
      'high tea',
      'dinner date',
      'silk hijab',
      'garden cafe',
      'grocery errand',
      'errand',
      'stroll',
      'neutral modest outerwear',
      'farmers market stroll',
    ],
    anchorDescription: 'Everyday modest streetwear with casual abaya, relaxed tunic, and scarf',
  },

  /* ---------------- HOUSE & LOUNGE ARCHETYPES ---------------- */
  {
    label: 'house_loungewear',
    preset: 'House',
    formality: 1,
    warmth: 'neutral',
    modesty: 'low',
    culturalStyle: 'western',
    keywords: [
      'house',
      'home',
      'lounging',
      'loungewear',
      'couch',
      'sofa',
      'pajamas',
      'sweatpants',
      'movie marathon',
      'lazy sunday',
      'reading',
      'staying in',
      'relaxing',
      'fireplace',
      'cleaning',
      'study session',
      'breakfast',
    ],
    anchorDescription: 'Comfortable indoor loungewear, pajamas, and relaxed home attire',
  },
  {
    label: 'house_wfh_remote',
    preset: 'House',
    formality: 2,
    warmth: 'neutral',
    modesty: 'medium',
    culturalStyle: 'western',
    keywords: [
      'wfh',
      'work from home',
      'remote day',
      'writing code at my desk',
      'video call from home',
      'desk work',
      'home office',
    ],
    anchorDescription: 'Work from home comfortable attire for remote video meetings and desk work',
  },
  {
    label: 'house_dinner_party',
    preset: 'House',
    formality: 2,
    warmth: 'neutral',
    modesty: 'medium',
    culturalStyle: 'western',
    keywords: [
      'hosting friends at home',
      'dinner party at home',
      'pasta and wine',
      'cooking night',
      'family dinner at home',
    ],
    anchorDescription: 'Hosting close friends and family for an intimate dinner party at home',
  },
  {
    label: 'house_desi_pyjama',
    preset: 'House',
    formality: 1,
    warmth: 'neutral',
    modesty: 'medium',
    culturalStyle: 'indian_traditional',
    keywords: [
      'cotton pyjama kurta',
      'sofa reading',
      'evening chai and pakoras',
      'rainy day in a soft kurta',
      'kurta at home',
    ],
    anchorDescription: 'Soft traditional cotton pyjama kurta for comfortable relaxation at home',
  },
  {
    label: 'house_modest_lounge',
    preset: 'House',
    formality: 1,
    warmth: 'neutral',
    modesty: 'high',
    culturalStyle: 'islamic_modest',
    keywords: [
      'modest loungewear',
      'reading and tea',
      'sehri',
      'pre-dawn',
      'soft pyjamas',
      'baking cookies at home',
      'house abaya',
      'halaqah circle at home',
      'preparing eid sweets',
    ],
    anchorDescription: 'Modest comfortable home loungewear, indoor abayas, and pre-dawn gatherings',
  },

  /* ---------------- EVENT — INDIAN TRADITIONAL ---------------- */
  {
    label: 'event_wedding_sangeet',
    preset: 'Event',
    subPreset: 'Sangeet',
    formality: 5,
    warmth: 'high',
    modesty: 'medium',
    culturalStyle: 'indian_traditional',
    keywords: [
      'sangeet',
      'sangeet night',
      'dance vibes',
      'dance',
      'mehendi',
      'mehndi',
      'henna',
      'cocktail sangeet',
      'choreo',
      'colorful dance',
      'marigold',
    ],
    anchorDescription: 'Indian traditional wedding Sangeet and Mehendi night with vibrant festive dance',
  },
  {
    label: 'event_wedding_haldi',
    preset: 'Event',
    subPreset: 'Wedding',
    formality: 4,
    warmth: 'high',
    modesty: 'medium',
    culturalStyle: 'indian_traditional',
    keywords: ['haldi', 'haldi rasam', 'pithi', 'turmeric', 'yellow theme'],
    anchorDescription: 'Haldi pre-wedding ceremony with auspicious turmeric yellow garments',
  },
  {
    label: 'event_wedding_shaadi_royal',
    preset: 'Event',
    subPreset: 'Wedding',
    formality: 5,
    warmth: 'high',
    modesty: 'high',
    culturalStyle: 'indian_traditional',
    keywords: [
      'shaadi',
      'wedding',
      'baraat',
      'barat',
      'phere',
      'mandap',
      'reception',
      'reception dinner',
      'sherwani',
      'lehenga',
      'gold sherwani',
      'zari',
      'twinning',
      'anand karaj',
      'roka',
      'rajputana',
      'kanchipuram',
      'temple wedding',
    ],
    anchorDescription: 'Royal Indian traditional wedding ceremony, grand baraat, and lavish reception',
  },
  {
    label: 'event_festive_diwali_pooja',
    preset: 'Event',
    subPreset: 'Other',
    formality: 4,
    warmth: 'high',
    modesty: 'high',
    culturalStyle: 'indian_traditional',
    keywords: [
      'diwali',
      'deepavali',
      'laxmi pooja',
      'pooja',
      'puja',
      'mandir',
      'garba',
      'navratri',
      'dandiya',
      'durga puja',
      'ganesh chaturthi',
      'visarjan',
      'onam',
      'sadhya',
      'karwa chauth',
      'bhai dooj',
      'griha pravesh',
      'godh bharai',
      'lohri',
      'dussehra',
      'raksha bandhan',
      'holi',
      'baithak',
      'classical music',
      'evening concert',
      'chhath',
    ],
    anchorDescription: 'Indian traditional religious festival ceremonies, festive pujas, and celebrations',
  },

  /* ---------------- EVENT — ISLAMIC MODEST ---------------- */
  {
    label: 'event_islamic_eid',
    preset: 'Event',
    subPreset: 'Eid',
    formality: 4,
    warmth: 'high',
    modesty: 'high',
    culturalStyle: 'islamic_modest',
    keywords: [
      'eid',
      'eid ul-fitr',
      'eid ul-adha',
      'eid prayer',
      'eid morning',
      'eid feast',
      'eid celebration',
      'eid lunch',
      'iftar',
      'ramadan',
      'ramzan',
      'breaking fast',
      'iftar buffet',
    ],
    anchorDescription: 'Festive Islamic Eid celebrations, morning congregational prayers, and Iftar feasts',
  },
  {
    label: 'event_islamic_nikah_walima',
    preset: 'Event',
    subPreset: 'Wedding',
    formality: 5,
    warmth: 'high',
    modesty: 'high',
    culturalStyle: 'islamic_modest',
    keywords: [
      'nikah',
      'nikaah',
      'walima',
      'waleema',
      'masjid nikah',
      'islamic wedding',
      'bridal shower',
      'kaftan',
      'engagement party',
    ],
    anchorDescription: 'Islamic modest Nikah marriage solemnization in the masjid and grand Walima banquet',
  },
  {
    label: 'event_islamic_jummah_prayer',
    preset: 'Event',
    subPreset: 'Other',
    formality: 3,
    warmth: 'neutral',
    modesty: 'high',
    culturalStyle: 'islamic_modest',
    keywords: [
      'jummah',
      'juma',
      'jumuah',
      'friday prayer',
      'masjid',
      'mosque',
      'taraweeh',
      'khutbah',
      'khatam',
      'milad',
      'aqiqah',
      'thobe',
      'bisht',
    ],
    anchorDescription: 'Friday Jummah congregation prayers, Quran gatherings, and Taraweeh prayers',
  },
  {
    label: 'event_islamic_modest_gala',
    preset: 'Event',
    subPreset: 'Gala',
    formality: 5,
    warmth: 'high',
    modesty: 'high',
    culturalStyle: 'islamic_modest',
    keywords: [
      'modest fashion week',
      'runway exhibition',
      'islamic relief charity',
      'charity foundation',
      'hospitality reception dinner',
    ],
    anchorDescription: 'High-formality modest gala evening, charity fundraisers, and fashion exhibitions',
  },

  /* ---------------- EVENT — WESTERN ---------------- */
  {
    label: 'event_western_black_tie_gala',
    preset: 'Event',
    subPreset: 'Gala',
    formality: 5,
    warmth: 'neutral',
    modesty: 'medium',
    culturalStyle: 'western',
    keywords: [
      'black tie',
      'white tie',
      'gala',
      'charity gala',
      'opera',
      'tuxedo',
      'premiere',
      'award ceremony',
      'red carpet',
    ],
    anchorDescription: 'Formal Western black-tie gala dinner, opera opening, and evening awards banquet',
  },
  {
    label: 'event_western_cocktail_party',
    preset: 'Event',
    subPreset: 'Gala',
    formality: 4,
    warmth: 'neutral',
    modesty: 'low',
    culturalStyle: 'western',
    keywords: [
      'cocktail',
      'cocktail party',
      'rooftop',
      'art gallery opening',
      'michelin star',
      'holiday party',
      'birthday celebration',
      'drinks at a downtown',
      'yacht sunset cocktail',
      'jazz club',
      'new year eve',
      'countdown',
      'thanksgiving',
      'thanksgiving family dinner',
    ],
    anchorDescription: 'Western cocktail soiree, rooftop parties, art gallery openings, and celebration dinners',
  },
  {
    label: 'event_western_wedding',
    preset: 'Event',
    subPreset: 'Wedding',
    formality: 4,
    warmth: 'neutral',
    modesty: 'medium',
    culturalStyle: 'western',
    keywords: [
      'wedding ceremony in the countryside chapel',
      'countryside chapel',
      'church wedding',
      'historic estate',
      'hamptons',
    ],
    anchorDescription: 'Western formal wedding ceremonies and country estate celebrations',
  },

  /* ---------------- TRIP ARCHETYPES ---------------- */
  {
    label: 'trip_beach_resort',
    preset: 'Trip',
    subPreset: 'Other',
    formality: 2,
    warmth: 'high',
    modesty: 'low',
    culturalStyle: 'western',
    keywords: [
      'beach',
      'resort',
      'miami',
      'ocean',
      'coastal',
      'pool deck',
      'road trip',
      'napa valley',
      'wine tasting',
    ],
    anchorDescription: 'Tropical beach vacation and coastal resort holiday',
  },
  {
    label: 'trip_alpine_winter_cabin',
    preset: 'Trip',
    subPreset: 'Other',
    formality: 2,
    warmth: 'low',
    modesty: 'medium',
    culturalStyle: 'western',
    keywords: [
      'ski lodge',
      'swiss alps',
      'alps',
      'winter getaway',
      'snow',
      'hiking boots',
      'camping',
      'redwood forest',
    ],
    anchorDescription: 'Alpine ski lodge winter trip and mountain trekking getaway',
  },
  {
    label: 'trip_city_sightseeing',
    preset: 'Trip',
    subPreset: 'Other',
    formality: 2,
    warmth: 'neutral',
    modesty: 'medium',
    culturalStyle: 'western',
    keywords: [
      'sightseeing',
      'walking tour',
      'paris',
      'flight layover',
      'frankfurt airport',
      'city trip',
      'tourist',
    ],
    anchorDescription: 'International travel, airport layovers, and European city sightseeing tours',
  },
  {
    label: 'trip_heritage_cultural',
    preset: 'Trip',
    subPreset: 'Other',
    formality: 2,
    warmth: 'neutral',
    modesty: 'high',
    culturalStyle: 'indian_traditional',
    keywords: [
      'jaipur',
      'amber fort',
      'palace cultural holiday',
      'kerala backwaters',
      'houseboat',
      'varanasi',
      'ghats',
      'ganga aarti',
      'haridwar',
    ],
    anchorDescription: 'Indian cultural heritage travel, palace explorations, and spiritual journeys',
  },
  {
    label: 'trip_modest_umrah_pilgrimage',
    preset: 'Trip',
    subPreset: 'Other',
    formality: 2,
    warmth: 'neutral',
    modesty: 'high',
    culturalStyle: 'islamic_modest',
    keywords: [
      'umrah',
      'mecca',
      'madinah',
      'ziarat',
      'burkini',
      'istanbul',
      'desert safari',
      'dunes',
      'doha cultural museum',
      'airport travel outfit',
      'winter umrah',
    ],
    anchorDescription: 'Islamic pilgrimages, Umrah journeys, and modest travel getaways',
  },
];

/**
 * Resolves context attributes directly from preset and subPreset selections.
 */
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

/**
 * Fast-path heuristic scoring of a prompt against a context template.
 */
export function evaluatePromptMatchScore(
  userText: string,
  template: ContextTemplate
): { score: number; matchedKeywords: string[] } {
  const query = userText.toLowerCase();
  const matchedKeywords: string[] = [];
  let score = 0;

  for (const kw of template.keywords) {
    const kwLower = kw.toLowerCase();
    // Multi-word phrase exact match gets higher reward
    if (kwLower.includes(' ')) {
      if (query.includes(kwLower)) {
        score += 8;
        matchedKeywords.push(kwLower);
      }
    } else {
      // Word boundary or inclusion match
      const regex = new RegExp(`\\b${kwLower}\\b`, 'i');
      if (regex.test(query)) {
        score += 4;
        matchedKeywords.push(kwLower);
      } else if (query.includes(kwLower)) {
        score += 2;
        matchedKeywords.push(kwLower);
      }
    }
  }

  // Cross-cultural alignment checks
  const isIndianCultural =
    /\b(sangeet|mehendi|mehndi|haldi|shaadi|baraat|phere|anand karaj|kurta|sherwani|lehenga|saree|zari|pooja|puja|diwali|deepavali|garba|dandiya|onam|sadhya|visarjan|chikankari|bandhgala|mundu|veshti|kanchipuram|bhai dooj|karwa chauth|chhath|lohri|dussehra|roka|mandap|desi|ethnic|khadi|sankranti|baithak|ganga|varanasi)\b/i.test(
      query
    );

  const isIslamicCultural =
    /\b(eid|jummah|juma|jumuah|iftar|ramadan|ramzan|sehri|suhoor|taraweeh|tarawih|nikah|nikaah|walima|waleema|abaya|hijab|thobe|kaftan|bisht|halaqah|burkini|ziarat|umrah|mecca|madinah|masjid|mosque|khutbah|khatam|chaand raat|milad|aqiqah|halal|modest|corniche|riyadh|doha)\b/i.test(
      query
    );

  if (template.culturalStyle === 'indian_traditional') {
    if (isIndianCultural) score += 9;
    else if (isIslamicCultural) score -= 6;
  } else if (template.culturalStyle === 'islamic_modest') {
    if (isIslamicCultural) score += 9;
    else if (isIndianCultural) score -= 6;
  } else if (template.culturalStyle === 'western') {
    if (!isIndianCultural && !isIslamicCultural) score += 3;
    else score -= 7; // Suppress western when explicit cultural markers are present
  }

  // Disambiguation: Solitary home lounging vs family gatherings / events
  const isLoungingHome =
    /\b(sofa|couch|pajamas|pyjamas|lounging|loungewear|lazy sunday|reading|movie marathon|staying in|wfh|work from home|house cleaning|baking cookies at home|desk day)\b/i.test(
      query
    );

  if (isLoungingHome && template.preset === 'House') {
    score += 8;
  } else if (isLoungingHome && template.preset === 'Office') {
    score -= 8;
  }

  // Disambiguation: Trip context
  const isTripContext =
    /\b(trip|travel|flight|airport|vacation|getaway|sightseeing|resort|exploration|walking tour|safari|houseboat)\b/i.test(
      query
    );

  if (isTripContext && template.preset === 'Trip') {
    score += 7;
  }

  return { score, matchedKeywords };
}

/**
 * Resolves context attributes from freeform natural language text.
 * Uses Fast Path keyword/token matching with cultural taxonomy awareness,
 * and falls back to or consults lazy MiniLM semantic similarity when ambiguous.
 */
export async function resolveContextFromFreeform(userText: string): Promise<ContextAttributes> {
  const query = userText.trim();
  if (!query) {
    return resolveContextFromPreset('Casual');
  }

  let bestTemplate = CONTEXT_TEMPLATES[0];
  let maxScore = -1;
  let topMatches: { template: ContextTemplate; score: number }[] = [];

  for (const template of CONTEXT_TEMPLATES) {
    const { score } = evaluatePromptMatchScore(query, template);
    if (score > maxScore) {
      maxScore = score;
      bestTemplate = template;
    }
    topMatches.push({ template, score });
  }

  topMatches.sort((a, b) => b.score - a.score);

  // Confidence estimation
  const confidence = Math.min(1.0, Math.max(0.2, maxScore / 14));

  // Second Opinion (Lazy MiniLM): If confidence is low or top two scores are tied/ambiguous
  const isAmbiguous = maxScore < 6 || (topMatches.length > 1 && topMatches[0].score === topMatches[1].score);

  if (isAmbiguous) {
    try {
      const semanticTemplate = await getSemanticBestMatch(query, topMatches.slice(0, 4).map((m) => m.template));
      if (semanticTemplate) {
        bestTemplate = semanticTemplate;
      }
    } catch {
      // Graceful fallback to fast path if transformers pipeline is not loaded or fails
    }
  }

  return {
    ...bestTemplate,
    label: `resolved_${bestTemplate.label}`,
    confidence: Math.round(confidence * 100) / 100,
    matchReason: `Matched ${bestTemplate.culturalStyle} ${bestTemplate.preset} (${bestTemplate.label})`,
  };
}

/**
 * Lazily computes embedding similarity between user text and candidate template anchor descriptions.
 */
async function getSemanticBestMatch(
  query: string,
  candidates: ContextTemplate[]
): Promise<ContextTemplate | null> {
  if (candidates.length === 0) return null;

  try {
    const pipelineInstance = await PipelineSingleton.getInstance();
    const queryOutput = await pipelineInstance(query, { pooling: 'mean', normalize: true });
    const queryVector = Array.from(queryOutput.data as Float32Array);

    let highestCosine = -1;
    let bestCandidate: ContextTemplate | null = null;

    for (const candidate of candidates) {
      const candOutput = await pipelineInstance(candidate.anchorDescription, {
        pooling: 'mean',
        normalize: true,
      });
      const candVector = Array.from(candOutput.data as Float32Array);
      const similarity = cosineSimilarity(queryVector, candVector);

      if (similarity > highestCosine) {
        highestCosine = similarity;
        bestCandidate = candidate;
      }
    }

    return bestCandidate;
  } catch {
    return null;
  }
}
