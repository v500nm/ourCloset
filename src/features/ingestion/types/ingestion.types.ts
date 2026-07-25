/** TDD §3 — Ingestion Pipeline types. */

export type ItemCategory = 'top' | 'bottom' | 'one_piece' | 'outerwear' | 'footwear' | 'watch' | 'belt' | 'accessory';
export type CulturalStyle = 'western' | 'indian_traditional' | 'islamic_modest';
export type HardwareMetalColor = 'gold' | 'silver' | 'rose_gold' | 'black';
export type LeatherTone = 'black' | 'tan' | 'dark_brown';

export interface AutoTagResult {
  category: ItemCategory | null;
  culturalStyle: CulturalStyle | null;
  primaryColorHex: string | null;
  secondaryColorHex: string | null;
  hardwareMetalColor: HardwareMetalColor | null;
  leatherTone: LeatherTone | null;
  formalityLevel: number | null;
  confidence: number;
}

export interface IngestionItem {
  imageFile: File;
  processedImageUrl?: string;
  autoTags: AutoTagResult;
  userCorrectedTags?: Partial<AutoTagResult>;
  status: 'queued' | 'processing' | 'review' | 'saved';
}
