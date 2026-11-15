/**
 * Cultural Tag Suggester
 * Rules-plus-heuristic tag suggestion engine.
 * Never silently guesses wrong: provides confidence score and explanation for review.
 */

import {
  CulturalStyle,
  FormalityLevel,
  ItemCategory,
  SeasonTag,
} from '@/types/taxonomy.types';
import { PaletteExtractionResult } from './paletteExtractor';
import { hexToOklch } from '@/engine/color/oklch';
import { classifySartorialNeutral } from '@/engine/color/neutral';

export interface TagSuggestionInput {
  aspectRatio: number; // height / width
  boundingBox: { width: number; height: number };
  palette: PaletteExtractionResult;
  preferredCulturalStyle?: CulturalStyle;
  userHint?: string;
}

export interface TagSuggestionResult {
  category: ItemCategory;
  culturalStyle: CulturalStyle;
  formalityLevel: FormalityLevel;
  seasonTags: SeasonTag[];
  suggestedTitle: string;
  confidence: number; // [0.0, 1.0]
  explanation: string;
}

/**
 * Suggests categories, cultural style, and formality from visual and color properties.
 */
export function suggestGarmentTags(input: TagSuggestionInput): TagSuggestionResult {
  const { aspectRatio, palette, preferredCulturalStyle } = input;
  const primaryOklch = hexToOklch(palette.primaryColorHex);
  const neutralType = classifySartorialNeutral(primaryOklch);
  const isNeutral = neutralType !== 'chromatic';

  let category: ItemCategory = 'shirt';
  let culturalStyle: CulturalStyle = preferredCulturalStyle ?? 'western';
  let formalityLevel: FormalityLevel = 3;
  let seasonTags: SeasonTag[] = ['all-season'];
  let confidence = 0.75;
  const reasons: string[] = [];

  // 1. Check for footwear or accessories based on aspect ratio and dimensions
  if (aspectRatio < 0.75 && input.boundingBox.width > input.boundingBox.height * 1.3) {
    category = 'footwear';
    formalityLevel = isNeutral && (primaryOklch.l < 0.3 || palette.leatherTone === 'black') ? 4 : 2;
    confidence = 0.88;
    reasons.push('Horizontal shoe silhouette profile detected');
  } else if (input.boundingBox.width < 180 && input.boundingBox.height < 180) {
    if (palette.hardwareMetalColor) {
      category = 'watch';
      formalityLevel = 4;
      confidence = 0.85;
      reasons.push('Compact metallic silhouette matches timepiece/watch');
    } else {
      category = 'accessory';
      confidence = 0.78;
      reasons.push('Compact accessory profile detected');
    }
  } else if (aspectRatio > 1.6 && aspectRatio < 2.5) {
    // Trousers / Jeans / Salwar / Churidar
    if (primaryOklch.h >= 200 && primaryOklch.h <= 285 && primaryOklch.c > 0.04) {
      category = 'jeans';
      formalityLevel = 1;
      confidence = 0.89;
      reasons.push('Indigo denim hue with elongated vertical silhouette');
    } else if (culturalStyle === 'indian_traditional' && primaryOklch.l > 0.75) {
      category = 'traditional_combo';
      formalityLevel = 3;
      confidence = 0.82;
      reasons.push('Tapered traditional lower garment / churidar profile');
    } else {
      category = 'pants';
      formalityLevel = isNeutral && primaryOklch.l < 0.4 ? 3 : 2;
      confidence = 0.85;
      reasons.push('Elongated vertical silhouette consistent with trousers');
    }
  } else if (aspectRatio >= 2.5) {
    // Very tall garment: traditional combo, abaya, sherwani, or full one-piece
    if (culturalStyle === 'islamic_modest') {
      category = 'traditional_combo';
      formalityLevel = 4;
      confidence = 0.9;
      reasons.push('Full-length modest silhouette (Abaya/Thobe)');
    } else if (culturalStyle === 'indian_traditional') {
      category = 'traditional_combo';
      formalityLevel = primaryOklch.l < 0.3 || palette.hardwareMetalColor === 'gold' ? 5 : 4;
      confidence = 0.9;
      reasons.push('Full-length traditional drape (Sherwani/Kurta ensemble)');
    } else {
      category = 'suit';
      formalityLevel = 4;
      confidence = 0.82;
      reasons.push('Full-length structured ensemble');
    }
  } else {
    // Aspect ratio between 0.75 and 1.6: Tops, shirts, t-shirts, jackets
    if (isNeutral && primaryOklch.l < 0.35 && aspectRatio > 1.1) {
      category = 'suit';
      formalityLevel = 4;
      confidence = 0.84;
      reasons.push('Structured dark tailored blazer/suit profile');
    } else if (primaryOklch.c > 0.08 && primaryOklch.l > 0.6) {
      category = 'tshirt';
      formalityLevel = 1;
      seasonTags = ['summer'];
      confidence = 0.8;
      reasons.push('Vibrant casual color profile');
    } else {
      category = 'shirt';
      formalityLevel = isNeutral ? 3 : 2;
      confidence = 0.82;
      reasons.push('Standard upper silhouette consistent with collared shirt');
    }
  }

  // 2. Cultural style inference override if traditional indicators exist
  if (
    preferredCulturalStyle === 'indian_traditional' ||
    palette.hardwareMetalColor === 'gold' ||
    (primaryOklch.h >= 15 && primaryOklch.h <= 85 && primaryOklch.c > 0.08) || // Saffron/Turmeric/Amber
    (primaryOklch.h >= 340 && primaryOklch.c > 0.12) // Deep Maroon / Sindoor
  ) {
    if (!preferredCulturalStyle || preferredCulturalStyle === 'indian_traditional') {
      culturalStyle = 'indian_traditional';
      if (category === 'shirt' || (category === 'pants' && aspectRatio < 2.0)) {
        category = 'traditional_combo';
      }
      reasons.push('Rich festive/traditional color palette identified');
    }
  }

  // 3. Formality fine-tuning based on neutrals and dark tones
  if (primaryOklch.l < 0.22 && isNeutral) {
    formalityLevel = Math.min(5, (formalityLevel + 1) as FormalityLevel) as FormalityLevel;
  }

  // 4. Formulate suggested title
  const title = generateSuggestedTitle(category, culturalStyle, palette.primaryColorHex, formalityLevel);

  return {
    category,
    culturalStyle,
    formalityLevel,
    seasonTags,
    suggestedTitle: title,
    confidence: Math.round(confidence * 100) / 100,
    explanation: reasons.join('; '),
  };
}

/**
 * Generates an evocative atelier-styled garment title.
 */
function generateSuggestedTitle(
  category: ItemCategory,
  style: CulturalStyle,
  primaryHex: string,
  formality: FormalityLevel
): string {
  const oklch = hexToOklch(primaryHex);
  const neutral = classifySartorialNeutral(oklch);

  let colorAdjective = 'Custom';
  if (neutral === 'pure_white' || neutral === 'cream_or_raw_silk') colorAdjective = 'Raw Silk / Ivory';
  else if (neutral === 'pure_black') colorAdjective = 'Midnight Black';
  else if (neutral === 'charcoal') colorAdjective = 'Charcoal';
  else if (neutral === 'navy') colorAdjective = 'Deep Navy';
  else if (neutral === 'beige_or_camel') colorAdjective = 'Warm Sand';
  else if (neutral === 'grey') colorAdjective = 'Slate';
  else {
    // Chromatic hues
    const h = oklch.h;
    if (h >= 345 || h < 15) colorAdjective = 'Crimson';
    else if (h >= 15 && h < 45) colorAdjective = 'Saffron Terracotta';
    else if (h >= 45 && h < 85) colorAdjective = 'Amber Gold';
    else if (h >= 85 && h < 165) colorAdjective = 'Forest Emerald';
    else if (h >= 165 && h < 210) colorAdjective = 'Teal';
    else if (h >= 210 && h < 265) colorAdjective = 'Cobalt Blue';
    else if (h >= 265 && h < 315) colorAdjective = 'Royal Plum';
    else colorAdjective = 'Mauve';
  }

  let noun = 'Garment';
  if (style === 'indian_traditional') {
    if (category === 'traditional_combo') noun = formality >= 4 ? 'Embroidered Sherwani' : 'Handloom Kurta';
    else if (category === 'pants') noun = 'Churidar / Trouser';
    else if (category === 'footwear') noun = 'Mojari / Jutti';
    else noun = 'Traditional Piece';
  } else if (style === 'islamic_modest') {
    if (category === 'traditional_combo') noun = formality >= 4 ? 'Tailored Modest Abaya' : 'Linen Thobe';
    else if (category === 'shirt') noun = 'Mandarin Tunic';
    else noun = 'Modest Garment';
  } else {
    // Western
    if (category === 'shirt') noun = formality >= 3 ? 'Oxford Cotton Shirt' : 'Tailored Shirt';
    else if (category === 'tshirt') noun = 'Crewneck Tee';
    else if (category === 'jeans') noun = 'Structured Denim';
    else if (category === 'pants') noun = formality >= 3 ? 'Dress Trousers' : 'Casual Chinos';
    else if (category === 'suit') noun = formality >= 4 ? 'Two-Piece Tailored Suit' : 'Blazer';
    else if (category === 'footwear') noun = formality >= 4 ? 'Oxford Leather Shoes' : 'Derby Footwear';
    else if (category === 'watch') noun = 'Dress Watch';
    else if (category === 'belt') noun = 'Leather Belt';
    else noun = 'Wardrobe Item';
  }

  return `${colorAdjective} ${noun}`;
}
