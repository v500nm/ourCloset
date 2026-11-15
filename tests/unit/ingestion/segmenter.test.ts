import { describe, it, expect } from 'vitest';
import {
  computeBoundingBox,
  segmentForegroundSaliency,
  segmentAndTrimGarment,
} from '@/features/ingestion/pipeline/segmenter';

describe('Garment Segmentation & Trimming', () => {
  it('correctly calculates tight bounding box from mask', () => {
    const width = 100;
    const height = 100;
    const mask = new Uint8ClampedArray(width * height);

    // Set foreground rectangle from x: 20..60, y: 30..80
    for (let y = 30; y <= 80; y++) {
      for (let x = 20; x <= 60; x++) {
        mask[y * width + x] = 255;
      }
    }

    const bbox = computeBoundingBox(mask, width, height, 0);
    expect(bbox.x).toBe(20);
    expect(bbox.y).toBe(30);
    expect(bbox.width).toBe(41); // 60 - 20 + 1
    expect(bbox.height).toBe(51); // 80 - 30 + 1
  });

  it('adds padding without exceeding image boundaries', () => {
    const width = 100;
    const height = 100;
    const mask = new Uint8ClampedArray(width * height);
    mask[5 * width + 5] = 255;

    const bbox = computeBoundingBox(mask, width, height, 10);
    expect(bbox.x).toBe(0); // Clamped at 0 (5 - 10 < 0)
    expect(bbox.y).toBe(0);
    expect(bbox.width).toBe(16); // 15 - 0 + 1
  });

  it('masks perimeter background while preserving centered garment', () => {
    const width = 40;
    const height = 40;
    const rgba = new Uint8ClampedArray(width * height * 4);

    // Fill entire frame with white background (#FFFFFF)
    for (let i = 0; i < rgba.length; i += 4) {
      rgba[i] = 255;
      rgba[i + 1] = 255;
      rgba[i + 2] = 255;
      rgba[i + 3] = 255;
    }

    // Place dark navy garment in center (x: 15..25, y: 15..25)
    for (let y = 15; y <= 25; y++) {
      for (let x = 15; x <= 25; x++) {
        const idx = (y * width + x) * 4;
        rgba[idx] = 20;
        rgba[idx + 1] = 30;
        rgba[idx + 2] = 70;
        rgba[idx + 3] = 255;
      }
    }

    const mask = segmentForegroundSaliency(rgba, width, height);

    // Center pixel should be foreground
    const centerIdx = 20 * width + 20;
    expect(mask[centerIdx]).toBe(255);

    // Corner pixel should be background
    const cornerIdx = 0 * width + 0;
    expect(mask[cornerIdx]).toBe(0);
  });

  it('executes segmentAndTrimGarment and keeps byte size within 300KB budget', async () => {
    const width = 100;
    const height = 100;
    const rgba = new Uint8ClampedArray(width * height * 4);

    for (let i = 0; i < rgba.length; i += 4) {
      rgba[i] = 240;
      rgba[i + 1] = 240;
      rgba[i + 2] = 240;
      rgba[i + 3] = 255;
    }

    for (let y = 20; y <= 80; y++) {
      for (let x = 20; x <= 80; x++) {
        const idx = (y * width + x) * 4;
        rgba[idx] = 180;
        rgba[idx + 1] = 50;
        rgba[idx + 2] = 40;
        rgba[idx + 3] = 255;
      }
    }

    const result = await segmentAndTrimGarment({ width, height, data: rgba });
    expect(result.trimmedDataUrl).toBeDefined();
    expect(result.byteSize).toBeLessThan(300 * 1024); // Strictly under 300 KB budget
    expect(result.aspectRatio).toBeGreaterThan(0);
  });
});

