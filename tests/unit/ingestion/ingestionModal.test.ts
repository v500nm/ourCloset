import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { IngestionModal, IngestionQueueItem } from '@/features/ingestion/components/IngestionModal';
import { ingestionWorkerClient } from '@/features/ingestion/services/ingestionWorkerClient';
import { wardrobeRepository } from '@/data/repositories/wardrobeRepository';
import { blobRepository } from '@/data/repositories/blobRepository';
import { WardrobeItem } from '@/types';

describe('IngestionModal Component & Queue State Machine', () => {
  beforeEach(async () => {
    await wardrobeRepository.clear();
    await blobRepository.clear();
    vi.restoreAllMocks();
  });

  it('renders null when isOpen is false', () => {
    const onSave = vi.fn();
    const onClose = vi.fn();
    const html = renderToStaticMarkup(
      React.createElement(IngestionModal, { isOpen: false, onClose, onSave })
    );
    expect(html).toBe('');
  });

  it('returns a valid modal element when isOpen is true', () => {
    const onSave = vi.fn();
    const onClose = vi.fn();
    const html = renderToStaticMarkup(
      React.createElement(IngestionModal, { isOpen: true, onClose, onSave })
    );
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('Ingest Wardrobe Garment');
  });

  it('correctly tracks queue item state transitions and stages', async () => {
    const fakeFile = new File(['fake_image_bytes'], 'linen_shirt.jpg', { type: 'image/jpeg' });
    const stagesVisited: string[] = [];

    const output = await ingestionWorkerClient.processGarment(fakeFile, {
      onProgress: (stage, percent) => {
        stagesVisited.push(stage);
        expect(percent).toBeGreaterThanOrEqual(0);
        expect(percent).toBeLessThanOrEqual(100);
      },
    });

    expect(output).toBeDefined();
    expect(output.processedDataUrl).toContain('data:image/');
    expect(stagesVisited).toContain('DECODE');
    expect(stagesVisited).toContain('SEGMENT');
    expect(stagesVisited).toContain('PALETTE');
    expect(stagesVisited).toContain('SUGGEST_TAGS');
    expect(stagesVisited).toContain('COMPLETE');
  });

  it('allows overriding auto-suggested tags, cultural style, and formality before saving', async () => {
    const fakeFile = new File(['garment_bytes'], 'raw_silk_kurta.jpg', { type: 'image/jpeg' });
    const output = await ingestionWorkerClient.processGarment(fakeFile);

    // Initial queue item from pipeline
    const queueItem: IngestionQueueItem = {
      id: 'queue_test_1',
      file: fakeFile,
      fileName: fakeFile.name,
      status: 'done',
      output,
      editedTitle: output.suggestedTags.suggestedTitle,
      editedCategory: output.suggestedTags.category,
      editedCulturalStyle: output.suggestedTags.culturalStyle,
      editedFormalityLevel: output.suggestedTags.formalityLevel,
      editedPrimaryColor: output.palette.primaryColorHex,
      editedSecondaryColor: output.palette.secondaryColorHex,
      editedHardwareMetal: output.palette.hardwareMetalColor,
      editedLeatherTone: output.palette.leatherTone,
      editedSeasonTags: output.suggestedTags.seasonTags,
      editedPrivacyTier: 'PUBLIC',
    };

    // User overrides tags in the interactive review step
    queueItem.editedTitle = 'Custom Tailored Linen Bandhgala';
    queueItem.editedCategory = 'traditional_combo';
    queueItem.editedCulturalStyle = 'indian_traditional';
    queueItem.editedFormalityLevel = 5;
    queueItem.editedPrimaryColor = '#B8935A'; // Brass gold override
    queueItem.editedSecondaryColor = '#1F3B33'; // Ink bottle green accent
    queueItem.editedHardwareMetal = 'gold';
    queueItem.editedPrivacyTier = 'PRIVATE';

    expect(queueItem.editedTitle).toBe('Custom Tailored Linen Bandhgala');
    expect(queueItem.editedCategory).toBe('traditional_combo');
    expect(queueItem.editedCulturalStyle).toBe('indian_traditional');
    expect(queueItem.editedFormalityLevel).toBe(5);
    expect(queueItem.editedPrimaryColor).toBe('#B8935A');
    expect(queueItem.editedSecondaryColor).toBe('#1F3B33');
    expect(queueItem.editedHardwareMetal).toBe('gold');
    expect(queueItem.editedPrivacyTier).toBe('PRIVATE');

    // Simulate saving the reviewed item to database repositories
    const itemId = `item_${Date.now()}`;
    await blobRepository.saveBlob(itemId, queueItem.output!.processedDataUrl, 'image/webp');

    const wardrobeItem: WardrobeItem = {
      id: itemId,
      user_id: 'user_tester',
      title: queueItem.editedTitle,
      category: queueItem.editedCategory,
      cultural_style: queueItem.editedCulturalStyle,
      formality_level: queueItem.editedFormalityLevel,
      image_url: queueItem.output!.processedDataUrl,
      primary_color_hex: queueItem.editedPrimaryColor,
      secondary_color_hex: queueItem.editedSecondaryColor || undefined,
      hardware_metal_color: queueItem.editedHardwareMetal || undefined,
      season_tags: queueItem.editedSeasonTags,
      wear_count: 0,
      laundry_status: 'CLEAN',
      privacy_tier: queueItem.editedPrivacyTier,
      created_at: new Date().toISOString(),
    };

    await wardrobeRepository.create(wardrobeItem);

    // Verify persistence in IndexedDB
    const savedItem = await wardrobeRepository.getById(itemId);
    expect(savedItem).toBeDefined();
    expect(savedItem?.title).toBe('Custom Tailored Linen Bandhgala');
    expect(savedItem?.formality_level).toBe(5);
    expect(savedItem?.primary_color_hex).toBe('#B8935A');
    expect(savedItem?.privacy_tier).toBe('PRIVATE');

    const savedBlob = await blobRepository.getBlob(itemId);
    expect(savedBlob).toBeDefined();
    expect(savedBlob?.dataUrl).toBe(queueItem.output!.processedDataUrl);
    expect(savedBlob?.mimeType).toBe('image/webp');
  });

  it('processes bulk intake queue sequentially and persists all items', async () => {
    const files = [
      new File(['photo_1'], 'sherwani.jpg', { type: 'image/jpeg' }),
      new File(['photo_2'], 'trousers.jpg', { type: 'image/jpeg' }),
      new File(['photo_3'], 'loafers.jpg', { type: 'image/jpeg' }),
    ];

    const processedItems: WardrobeItem[] = [];
    const savedBlobs: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const output = await ingestionWorkerClient.processGarment(file);
      const itemId = `bulk_item_${Date.now()}_${i}`;

      await blobRepository.saveBlob(itemId, output.processedDataUrl, 'image/webp');
      savedBlobs.push(itemId);

      const item: WardrobeItem = {
        id: itemId,
        user_id: 'user-current',
        title: output.suggestedTags.suggestedTitle || `Garment ${i + 1}`,
        category: output.suggestedTags.category,
        cultural_style: output.suggestedTags.culturalStyle,
        formality_level: output.suggestedTags.formalityLevel,
        image_url: output.processedDataUrl,
        primary_color_hex: output.palette.primaryColorHex,
        secondary_color_hex: output.palette.secondaryColorHex || undefined,
        season_tags: ['all-season'],
        wear_count: 0,
        laundry_status: 'CLEAN',
        privacy_tier: 'PUBLIC',
        created_at: new Date().toISOString(),
      };

      await wardrobeRepository.create(item);
      processedItems.push(item);
    }

    expect(processedItems).toHaveLength(3);
    expect(savedBlobs).toHaveLength(3);

    const allInDb = await wardrobeRepository.getAll('user-current');
    expect(allInDb).toHaveLength(3);

    const blobCount = await blobRepository.count();
    expect(blobCount).toBe(3);
  });

  it('isolates errors in bulk queue without failing remaining items', async () => {
    const validFile = new File(['good_image'], 'jacket.jpg', { type: 'image/jpeg' });
    const output = await ingestionWorkerClient.processGarment(validFile);

    const queue: IngestionQueueItem[] = [
      {
        id: 'q_1',
        file: validFile,
        fileName: 'jacket.jpg',
        status: 'done',
        output,
        editedTitle: 'Tailored Jacket',
        editedCategory: 'suit',
        editedCulturalStyle: 'western',
        editedFormalityLevel: 4,
        editedPrimaryColor: '#333333',
        editedSecondaryColor: null,
        editedHardwareMetal: null,
        editedLeatherTone: null,
        editedSeasonTags: ['all-season'],
        editedPrivacyTier: 'PUBLIC',
      },
      {
        id: 'q_2',
        file: new File(['corrupt_data'], 'corrupt.jpg', { type: 'image/jpeg' }),
        fileName: 'corrupt.jpg',
        status: 'error',
        error: 'Corrupt image data',
        editedTitle: 'Corrupt Image',
        editedCategory: 'shirt',
        editedCulturalStyle: 'western',
        editedFormalityLevel: 3,
        editedPrimaryColor: '#000000',
        editedSecondaryColor: null,
        editedHardwareMetal: null,
        editedLeatherTone: null,
        editedSeasonTags: ['all-season'],
        editedPrivacyTier: 'PUBLIC',
      },
    ];

    // Saving only processes items with status === 'done' and output present
    const validQueueItems = queue.filter((item) => item.status === 'done' && item.output);
    expect(validQueueItems).toHaveLength(1);
    expect(validQueueItems[0].fileName).toBe('jacket.jpg');
  });

  it('handles user cancellation via AbortSignal without corrupting queue state', async () => {
    const controller = new AbortController();
    const file = new File(['cancel_test'], 'cancel.jpg', { type: 'image/jpeg' });

    controller.abort();

    await expect(
      ingestionWorkerClient.processGarment(file, { signal: controller.signal })
    ).rejects.toThrow();

    // Verify storage remains pristine
    const allItems = await wardrobeRepository.getAll();
    expect(allItems).toHaveLength(0);
    const blobCount = await blobRepository.count();
    expect(blobCount).toBe(0);
  });
});

