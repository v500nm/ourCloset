/** TDD §3 — Ingestion Pipeline types. */

import {
  ItemCategory as TaxonomyItemCategory,
  CulturalStyle as TaxonomyCulturalStyle,
  HardwareMetalColor as TaxonomyHardwareMetalColor,
  LeatherTone as TaxonomyLeatherTone,
  FormalityLevel,
} from '@/types/taxonomy.types';

export type ItemCategory = TaxonomyItemCategory;
export type CulturalStyle = TaxonomyCulturalStyle;
export type HardwareMetalColor = TaxonomyHardwareMetalColor;
export type LeatherTone = TaxonomyLeatherTone;

export interface AutoTagResult {
  category: ItemCategory | null;
  culturalStyle: CulturalStyle | null;
  primaryColorHex: string | null;
  secondaryColorHex: string | null;
  hardwareMetalColor: HardwareMetalColor | null;
  leatherTone: LeatherTone | null;
  formalityLevel: FormalityLevel | null;
  confidence: number;
}

export interface IngestionItem {
  imageFile: File;
  title?: string;
  processedImageUrl?: string;
  autoTags: AutoTagResult;
  userCorrectedTags?: Partial<AutoTagResult>;
  status: 'queued' | 'processing' | 'review' | 'saved';
}
