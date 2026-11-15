import { describe, it, expect } from 'vitest';
import { ingestionWorkerClient } from '@/features/ingestion/services/ingestionWorkerClient';
import { saveWardrobeItem } from '@/features/ingestion/services/ingestionService';
import { wardrobeRepository } from '@/data/repositories/wardrobeRepository';
import { blobRepository } from '@/data/repositories/blobRepository';
import { IngestionItem } from '@/features/ingestion/types/ingestion.types';

describe('Ingestion Pipeline Failure Paths & Offline Guarantees', () => {
  it('respects user cancellation via AbortSignal', async () => {
    const controller = new AbortController();
    const fakeFile = new File(['mock_image_bytes'], 'test.jpg', { type: 'image/jpeg' });

    // Cancel immediately before or during run
    controller.abort();

    await expect(
      ingestionWorkerClient.processGarment(fakeFile, { signal: controller.signal })
    ).rejects.toThrow();
  });

  it('runs 100% offline with zero network requests (Tenet 1)', async () => {
    // Intercept window.fetch if called to verify no outbound requests occur
    let fetchCalled = false;
    const originalFetch = global.fetch;
    global.fetch = async () => {
      fetchCalled = true;
      throw new Error('Network disabled: Tenet 1 violation');
    };

    try {
      const fakeFile = new File(['test_photo_data'], 'garment.jpg', { type: 'image/jpeg' });
      const result = await ingestionWorkerClient.processGarment(fakeFile);

      expect(result).toBeDefined();
      expect(result.processedDataUrl).toBeDefined();
      expect(fetchCalled).toBe(false); // Verified no network was contacted
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('saves ingested garment and persists blob to IndexedDB', async () => {
    const testId = `TEST-ITEM-${Date.now()}`;
    const mockItem: IngestionItem = {
      imageFile: new File([], 'shirt.jpg'),
      title: 'Midnight Raw Silk Kurta',
      processedImageUrl: 'data:image/webp;base64,mockWebpDataString',
      autoTags: {
        category: 'traditional_combo',
        culturalStyle: 'indian_traditional',
        primaryColorHex: '#18181B',
        secondaryColorHex: '#D4AF37',
        hardwareMetalColor: 'gold',
        leatherTone: null,
        formalityLevel: 4,
        confidence: 0.92,
      },
      status: 'review',
    };

    const saved = await saveWardrobeItem(mockItem);
    expect(saved.id).toBeDefined();

    const storedItem = await wardrobeRepository.getById(saved.id);
    expect(storedItem).toBeDefined();
    expect(storedItem?.title).toBe('Midnight Raw Silk Kurta');
    expect(storedItem?.cultural_style).toBe('indian_traditional');
    expect(storedItem?.primary_color_hex).toBe('#18181B');

    const storedBlob = await blobRepository.getBlob(saved.id);
    expect(storedBlob).toBeDefined();
    expect(storedBlob?.mimeType).toBe('image/webp');
  });
});

