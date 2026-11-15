import { describe, it, expect } from 'vitest';
import { hexToRgb, hexToOklch } from '@/engine/color/oklch';
import { classifyNeutral } from '@/engine/color/neutral';
import { evaluateHexColorHarmony, getHueDifference } from '@/engine/color/harmony';

describe('OKLCH Color Mathematics and Uniform Perceptual Space', () => {
  it('correctly parses hex colors to RGB', () => {
    expect(hexToRgb('#FFFFFF')).toEqual({ r: 255, g: 255, b: 255 });
    expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
    expect(hexToRgb('#F00')).toEqual({ r: 255, g: 0, b: 0 });
    // Fallback for invalid hex
    expect(hexToRgb('invalid')).toEqual({ r: 35, g: 35, b: 35 });
  });

  it('converts hex strings to OKLCH coordinates', () => {
    const white = hexToOklch('#FFFFFF');
    expect(white.l).toBeGreaterThan(0.99);
    expect(white.c).toBeLessThan(0.005);

    const black = hexToOklch('#000000');
    expect(black.l).toBeLessThan(0.01);
    expect(black.c).toBeLessThan(0.005);

    const emeraldGreen = hexToOklch('#046307');
    expect(emeraldGreen.l).toBeGreaterThan(0.3);
    expect(emeraldGreen.c).toBeGreaterThan(0.1);
    expect(emeraldGreen.h).toBeGreaterThan(120);
    expect(emeraldGreen.h).toBeLessThan(160);
  });

  it('accurately classifies neutral anchors per ADR-004', () => {
    // Pure White
    expect(classifyNeutral(hexToOklch('#FFFFFF')).category).toBe('pure_white');
    // Pure Black
    expect(classifyNeutral(hexToOklch('#0A0A0A')).category).toBe('pure_black');
    // Charcoal
    expect(classifyNeutral(hexToOklch('#2C2C2C')).category).toBe('charcoal');
    // Midnight Navy
    expect(classifyNeutral(hexToOklch('#0A1128')).category).toBe('navy');
    // Cream / Raw Silk
    expect(classifyNeutral(hexToOklch('#FFFDD0')).category).toBe('cream_or_raw_silk');
    expect(classifyNeutral(hexToOklch('#FDFBF7')).isNeutral).toBe(true);
    // Saturated Chromatic Red is NOT neutral
    expect(classifyNeutral(hexToOklch('#FF0000')).isNeutral).toBe(false);
  });

  it('computes minimal circular angular hue distance', () => {
    expect(getHueDifference(10, 30)).toBe(20);
    expect(getHueDifference(350, 10)).toBe(20);
    expect(getHueDifference(0, 180)).toBe(180);
    expect(getHueDifference(10, 200)).toBe(170);
  });

  it('evaluates color harmony relationships correctly', () => {
    // 1. Neutral-Anchored (White + Navy)
    const neutralPair = evaluateHexColorHarmony('#FFFFFF', '#0A1128');
    expect(neutralPair.harmonyType).toBe('neutral_anchored');
    expect(neutralPair.score).toBeGreaterThanOrEqual(0.9);

    // 2. Monochrome
    const monoPair = evaluateHexColorHarmony('#1E3A8A', '#3B82F6');
    expect(monoPair.harmonyType).toBe('monochrome');
    expect(monoPair.score).toBeGreaterThanOrEqual(0.85);

    // 3. Analogous (Green + Teal)
    const analogousPair = evaluateHexColorHarmony('#10B981', '#06B6D4');
    expect(analogousPair.harmonyType).toBe('analogous');
    expect(analogousPair.score).toBeGreaterThanOrEqual(0.88);

    // 4. Complementary (Opposite hues)
    const complementaryPair = evaluateHexColorHarmony('#0047AB', '#D4AF37'); // Cobalt blue and gold
    expect(complementaryPair.score).toBeGreaterThanOrEqual(0.85);

    // 5. Clash (Jarring saturated discordance at non-harmonic angle ~90 deg)
    const clashPair = evaluateHexColorHarmony('#39FF14', '#FF5F1F'); // Neon lime and bright orange
    expect(clashPair.harmonyType).toBe('clash');
    expect(clashPair.score).toBeLessThanOrEqual(0.5);
  });
});
