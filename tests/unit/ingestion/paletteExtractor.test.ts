import { describe, it, expect } from 'vitest';
import { extractOklchPalette } from '@/features/ingestion/pipeline/paletteExtractor';

describe('Perceptual OKLCH Palette Extractor', () => {
  it('extracts primary color from uniform foreground pixels', () => {
    const width = 20;
    const height = 20;
    const data = new Uint8ClampedArray(width * height * 4);

    // Fill with crimson (#DC143C -> R:220, G:20, B:60, A:255)
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 220;
      data[i + 1] = 20;
      data[i + 2] = 60;
      data[i + 3] = 255;
    }

    const result = extractOklchPalette({ data, width, height });
    expect(result.primaryColorHex).toMatch(/^#[0-9A-F]{6}$/i);
    expect(result.isMonochrome).toBe(true);
    expect(result.clusters.length).toBeGreaterThan(0);
  });

  it('ignores background transparent pixels (alpha < 128)', () => {
    const width = 10;
    const height = 10;
    const data = new Uint8ClampedArray(width * height * 4);

    // Half transparent neon green, half opaque navy
    for (let i = 0; i < data.length; i += 4) {
      if (i < data.length / 2) {
        // Transparent green
        data[i] = 0;
        data[i + 1] = 255;
        data[i + 2] = 0;
        data[i + 3] = 0; // Alpha 0
      } else {
        // Opaque Navy
        data[i] = 10;
        data[i + 1] = 25;
        data[i + 2] = 60;
        data[i + 3] = 255;
      }
    }

    const result = extractOklchPalette({ data, width, height });
    // Primary color should be navy, green must be ignored
    const cluster = result.clusters[0];
    expect(cluster.rgb.g).toBeLessThan(100);
    expect(cluster.rgb.b).toBeGreaterThan(30);
  });

  it('detects distinct secondary color when multiple significant colors exist', () => {
    const width = 40;
    const height = 40;
    const data = new Uint8ClampedArray(width * height * 4);

    // 60% Navy (#0A193C) and 40% Gold (#FFD700)
    const split = Math.floor(data.length * 0.6);
    for (let i = 0; i < data.length; i += 4) {
      if (i < split) {
        data[i] = 10;
        data[i + 1] = 25;
        data[i + 2] = 60;
        data[i + 3] = 255;
      } else {
        data[i] = 255;
        data[i + 1] = 215;
        data[i + 2] = 0;
        data[i + 3] = 255;
      }
    }

    const result = extractOklchPalette({ data, width, height });
    expect(result.secondaryColorHex).not.toBeNull();
    expect(result.isMonochrome).toBe(false);
  });

  it('identifies gold hardware metal tone from warm lustrous clusters', () => {
    const width = 10;
    const height = 10;
    const data = new Uint8ClampedArray(width * height * 4);

    // Gold tone (R:212, G:175, B:55)
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 212;
      data[i + 1] = 175;
      data[i + 2] = 55;
      data[i + 3] = 255;
    }

    const result = extractOklchPalette({ data, width, height });
    expect(result.hardwareMetalColor).toBe('gold');
  });
});

