import { describe, it, expect } from 'vitest';
import { suggestGarmentTags } from '@/features/ingestion/pipeline/tagSuggester';
import { PaletteExtractionResult } from '@/features/ingestion/pipeline/paletteExtractor';
import { hexToOklch, rgbToOklab } from '@/engine/color/oklch';

function mockPalette(primaryHex: string, secondaryHex?: string): PaletteExtractionResult {
  const oklch = hexToOklch(primaryHex);
  const oklab = rgbToOklab({ r: 50, g: 50, b: 50 });
  return {
    primaryColorHex: primaryHex,
    secondaryColorHex: secondaryHex ?? null,
    clusters: [
      {
        hex: primaryHex,
        oklch,
        oklab,
        rgb: { r: 50, g: 50, b: 50 },
        weight: 0.8,
        pixelCount: 800,
      },
    ],
    hardwareMetalColor: null,
    leatherTone: null,
    isMonochrome: !secondaryHex,
  };
}

describe('Cultural Tag Suggester', () => {
  it('suggests jeans for indigo hue with elongated vertical silhouette', () => {
    const palette = mockPalette('#1E3A8A'); // Indigo / Navy
    const result = suggestGarmentTags({
      aspectRatio: 2.1,
      boundingBox: { width: 300, height: 630 },
      palette,
      preferredCulturalStyle: 'western',
    });

    expect(result.category).toBe('jeans');
    expect(result.culturalStyle).toBe('western');
    expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    expect(result.explanation).toContain('denim');
  });

  it('suggests Indian Traditional piece when rich saffron / turmeric colors are detected', () => {
    const palette = mockPalette('#D97706'); // Saffron amber
    const result = suggestGarmentTags({
      aspectRatio: 1.8,
      boundingBox: { width: 400, height: 720 },
      palette,
      preferredCulturalStyle: 'indian_traditional',
    });

    expect(result.culturalStyle).toBe('indian_traditional');
    expect(result.category).toBe('traditional_combo');
    expect(result.suggestedTitle).toMatch(/Kurta|Sherwani/i);
  });

  it('suggests Islamic Modest full-length attire for high aspect ratio silhouettes', () => {
    const palette = mockPalette('#18181B'); // Black
    const result = suggestGarmentTags({
      aspectRatio: 2.8,
      boundingBox: { width: 300, height: 840 },
      palette,
      preferredCulturalStyle: 'islamic_modest',
    });

    expect(result.culturalStyle).toBe('islamic_modest');
    expect(result.category).toBe('traditional_combo');
    expect(result.suggestedTitle).toMatch(/Abaya|Thobe/i);
    expect(result.formalityLevel).toBeGreaterThanOrEqual(4);
  });

  it('suggests footwear for wide horizontal silhouette profile', () => {
    const palette = mockPalette('#2B1B17'); // Dark leather brown
    const result = suggestGarmentTags({
      aspectRatio: 0.55,
      boundingBox: { width: 450, height: 247 },
      palette,
    });

    expect(result.category).toBe('footwear');
    expect(result.confidence).toBeGreaterThan(0.85);
  });

  it('estimates high formality for dark tailored suits', () => {
    const palette = mockPalette('#1F2937'); // Charcoal
    const result = suggestGarmentTags({
      aspectRatio: 1.25,
      boundingBox: { width: 400, height: 500 },
      palette,
    });

    expect(result.category).toBe('suit');
    expect(result.formalityLevel).toBeGreaterThanOrEqual(4);
  });
});

