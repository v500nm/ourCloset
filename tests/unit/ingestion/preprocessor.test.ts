import { describe, it, expect } from 'vitest';
import {
  calculateTargetDimensions,
  extractExifOrientation,
} from '@/features/ingestion/pipeline/preprocessor';

describe('Ingestion Preprocessor', () => {
  describe('calculateTargetDimensions', () => {
    it('preserves dimensions already within the 1024px ceiling', () => {
      const result = calculateTargetDimensions(800, 600, 1024);
      expect(result.width).toBe(800);
      expect(result.height).toBe(600);
    });

    it('downscales wide landscape photos preserving aspect ratio', () => {
      const result = calculateTargetDimensions(4000, 3000, 1024);
      expect(result.width).toBe(1024);
      expect(result.height).toBe(768);
    });

    it('downscales tall portrait photos preserving aspect ratio', () => {
      const result = calculateTargetDimensions(2000, 4000, 1024);
      expect(result.width).toBe(512);
      expect(result.height).toBe(1024);
    });

    it('handles square images at max bounds', () => {
      const result = calculateTargetDimensions(2048, 2048, 1024);
      expect(result.width).toBe(1024);
      expect(result.height).toBe(1024);
    });
  });

  describe('extractExifOrientation', () => {
    it('returns default orientation 1 for empty or non-JPEG buffers', () => {
      const emptyBuffer = new ArrayBuffer(0);
      expect(extractExifOrientation(emptyBuffer)).toBe(1);

      const randomBuffer = new Uint8Array([0x00, 0x01, 0x02, 0x03]).buffer;
      expect(extractExifOrientation(randomBuffer)).toBe(1);
    });

    it('returns 1 for JPEG without EXIF APP1 marker', () => {
      // JPEG SOI (0xFFD8) followed by EOI (0xFFD9)
      const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]).buffer;
      expect(extractExifOrientation(jpeg)).toBe(1);
    });
  });
});

