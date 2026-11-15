/**
 * Ingestion Service
 * Client-Side Ingestion Pipeline conforming to Tenet 1 (Zero photo bytes leave device)
 * Integrates IngestionWorkerClient, PaletteExtractor, TagSuggester, BlobRepository & WardrobeRepository.
 */

import { AutoTagResult, IngestionItem } from '../types/ingestion.types';
import { ingestionWorkerClient, IngestionOptions, IngestionPipelineOutput } from './ingestionWorkerClient';
import { wardrobeRepository } from '@/data/repositories/wardrobeRepository';
import { blobRepository } from '@/data/repositories/blobRepository';
import { WardrobeItem } from '@/types/database.types';

/**
 * Step 1: Client-side background removal & silhouette trimming via Web Worker.
 */
export async function removeBackground(
  imageFile: File,
  options?: IngestionOptions
): Promise<{ dataUrl: string; byteSize: number; output: IngestionPipelineOutput }> {
  const result = await ingestionWorkerClient.processGarment(imageFile, options);
  return {
    dataUrl: result.processedDataUrl,
    byteSize: result.byteSize,
    output: result,
  };
}

/**
 * Step 2: Auto-tag inference from processed garment output.
 */
export async function inferAutoTags(
  pipelineOutput: IngestionPipelineOutput
): Promise<AutoTagResult> {
  const { suggestedTags, palette } = pipelineOutput;

  return {
    category: suggestedTags.category,
    culturalStyle: suggestedTags.culturalStyle,
    primaryColorHex: palette.primaryColorHex,
    secondaryColorHex: palette.secondaryColorHex,
    hardwareMetalColor: palette.hardwareMetalColor,
    leatherTone: palette.leatherTone,
    formalityLevel: suggestedTags.formalityLevel,
    confidence: suggestedTags.confidence,
  };
}

/**
 * Step 3: Local perceptual color feature vector (ADR-004: drops cloud pgvector, uses OKLCH values).
 */
export async function generateEmbeddings(
  pipelineOutput: IngestionPipelineOutput
): Promise<{
  colorEmbedding: number[];
  silhouetteEmbedding: number[];
} | null> {
  const { palette, suggestedTags } = pipelineOutput;
  const primary = palette.clusters[0]?.oklch ?? { l: 0.5, c: 0, h: 0 };
  const secondary = palette.clusters[1]?.oklch ?? { l: 0.5, c: 0, h: 0 };

  // 64-dim normalized perceptual color feature vector based on OKLCH clusters
  const colorVec = new Array(64).fill(0);
  colorVec[0] = primary.l;
  colorVec[1] = primary.c;
  colorVec[2] = primary.h / 360;
  colorVec[3] = secondary.l;
  colorVec[4] = secondary.c;
  colorVec[5] = secondary.h / 360;

  // 128-dim silhouette aspect ratio and shape embedding
  const silhouetteVec = new Array(128).fill(0);
  silhouetteVec[0] = Math.min(1, pipelineOutput.originalWidth / 2000);
  silhouetteVec[1] = Math.min(1, pipelineOutput.originalHeight / 2000);
  silhouetteVec[2] = suggestedTags.formalityLevel / 5;

  return {
    colorEmbedding: colorVec,
    silhouetteEmbedding: silhouetteVec,
  };
}

/**
 * Step 4: Persist processed garment into local-first Dexie repositories (BlobRepo + WardrobeRepo).
 */
export async function saveWardrobeItem(
  item: IngestionItem,
  userId = 'user-current'
): Promise<{ id: string }> {
  const id = `ITEM-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(2, 6)}`;
  let finalImageUrl = item.processedImageUrl || '';

  // If we have a base64 dataUrl, persist it locally into IndexedDB BlobRepository
  if (finalImageUrl.startsWith('data:')) {
    await blobRepository.saveBlob(id, finalImageUrl, 'image/webp');
  }

  const effectiveTags = {
    ...item.autoTags,
    ...item.userCorrectedTags,
  };

  const wardrobeRecord: WardrobeItem = {
    id,
    user_id: userId,
    title: item.title || `${effectiveTags.category ? effectiveTags.category.toUpperCase() : 'Custom'} Garment`,
    category: effectiveTags.category || 'shirt',
    cultural_style: effectiveTags.culturalStyle || 'western',
    primary_color_hex: effectiveTags.primaryColorHex || undefined,
    secondary_color_hex: effectiveTags.secondaryColorHex || undefined,
    hardware_metal_color: effectiveTags.hardwareMetalColor || undefined,
    leather_tone: effectiveTags.leatherTone || undefined,
    formality_level: (effectiveTags.formalityLevel || 3) as 1 | 2 | 3 | 4 | 5,
    image_url: finalImageUrl || 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=600',
    season_tags: ['all-season'],
    wear_count: 0,
    laundry_status: 'CLEAN',
    privacy_tier: 'PUBLIC',
    created_at: new Date().toISOString(),
  };

  await wardrobeRepository.create(wardrobeRecord);

  return { id };
}

/**
 * High-level orchestration for ingesting a garment photo end-to-end.
 */
export async function executeFullIngestion(
  file: File,
  options?: IngestionOptions
): Promise<{
  item: IngestionItem;
  pipelineOutput: IngestionPipelineOutput;
}> {
  const { output } = await removeBackground(file, options);
  const autoTags = await inferAutoTags(output);

  const item: IngestionItem = {
    imageFile: file,
    title: output.suggestedTags.suggestedTitle,
    processedImageUrl: output.processedDataUrl,
    autoTags,
    status: 'review',
  };

  return { item, pipelineOutput: output };
}
