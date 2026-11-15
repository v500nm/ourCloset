/**
 * Ingestion Web Worker (Off-Main-Thread Execution)
 * Per ADR-006:
 * - Executes decode, segmentation, trimming, OKLCH palette extraction, and tag suggestion.
 * - Emits staged progress events for smooth UI responsiveness.
 * - Keeps main UI thread free (Interaction to Next Paint INP < 200ms).
 */

import { preprocessImage } from '../pipeline/preprocessor';
import { segmentAndTrimGarment } from '../pipeline/segmenter';
import { extractOklchPalette, PaletteExtractionResult } from '../pipeline/paletteExtractor';
import { suggestGarmentTags, TagSuggestionResult } from '../pipeline/tagSuggester';
import { CulturalStyle } from '@/types/taxonomy.types';

export type IngestionStage =
  | 'DECODE'
  | 'SEGMENT'
  | 'TRIM'
  | 'ENCODE'
  | 'PALETTE'
  | 'SUGGEST_TAGS'
  | 'COMPLETE';

export interface WorkerProgressMessage {
  type: 'STAGE_PROGRESS';
  stage: IngestionStage;
  percent: number;
  message: string;
}

export interface WorkerSuccessMessage {
  type: 'SUCCESS';
  payload: {
    processedDataUrl: string;
    byteSize: number;
    palette: PaletteExtractionResult;
    suggestedTags: TagSuggestionResult;
    originalWidth: number;
    originalHeight: number;
    durationMs: number;
  };
}

export interface WorkerErrorMessage {
  type: 'ERROR';
  error: string;
}

export type WorkerOutgoingMessage =
  | WorkerProgressMessage
  | WorkerSuccessMessage
  | WorkerErrorMessage;

export interface IngestionWorkerInput {
  type: 'PROCESS_IMAGE';
  buffer: ArrayBuffer;
  mimeType: string;
  preferredStyle?: CulturalStyle;
  userHint?: string;
}

// In dedicated worker context
if (typeof self !== 'undefined' && typeof window === 'undefined') {
  let isCancelled = false;

  self.onmessage = async (e: MessageEvent<IngestionWorkerInput | { type: 'CANCEL' }>) => {
    if (e.data.type === 'CANCEL') {
      isCancelled = true;
      return;
    }

    if (e.data.type === 'PROCESS_IMAGE') {
      isCancelled = false;
      const startTime = Date.now();

      const postProgress = (stage: IngestionStage, percent: number, message: string) => {
        if (isCancelled) return;
        self.postMessage({
          type: 'STAGE_PROGRESS',
          stage,
          percent,
          message,
        } as WorkerProgressMessage);
      };

      try {
        const { buffer, mimeType, preferredStyle, userHint } = e.data;

        // Stage 1: Decode & Preprocess
        postProgress('DECODE', 15, 'Calibrating canvas & correcting EXIF orientation...');
        if (isCancelled) return;

        const blob = new Blob([buffer], { type: mimeType });
        const preprocessed = await preprocessImage(blob, { maxDimension: 1024 });

        // Stage 2: Segment Foreground
        postProgress('SEGMENT', 40, 'Removing background via client-side saliency...');
        if (isCancelled) return;

        // Stage 3 & 4: Trim and WebP Encode
        postProgress('TRIM', 60, 'Trimming to garment silhouette & encoding WebP...');
        if (isCancelled) return;

        let segmentation;
        if (preprocessed.imageData) {
          segmentation = await segmentAndTrimGarment(preprocessed.imageData, {
            padding: 16,
            quality: 0.82,
          });
        } else {
          // Fallback if imageData unavailable
          segmentation = {
            trimmedDataUrl: preprocessed.dataUrl,
            boundingBox: { x: 0, y: 0, width: preprocessed.width, height: preprocessed.height },
            originalDimensions: { width: preprocessed.width, height: preprocessed.height },
            byteSize: 35000,
            isAlgorithmicFallback: true,
            aspectRatio: preprocessed.height / preprocessed.width,
            imageData: { width: 100, height: 100, data: new Uint8ClampedArray(40000) },
          };
        }

        // Stage 5: OKLCH Palette Extraction
        postProgress('PALETTE', 80, 'Extracting OKLCH silk & fabric color coordinates...');
        if (isCancelled) return;

        const palette = extractOklchPalette(segmentation.imageData, {
          k: 4,
          maxSamples: 4000,
        });

        // Stage 6: Cultural Tag Suggestion
        postProgress('SUGGEST_TAGS', 95, 'Synthesizing cultural taxonomy & formality index...');
        if (isCancelled) return;

        const suggestedTags = suggestGarmentTags({
          aspectRatio: segmentation.aspectRatio,
          boundingBox: segmentation.boundingBox,
          palette,
          preferredCulturalStyle: preferredStyle,
          userHint,
        });

        postProgress('COMPLETE', 100, 'Ingestion pipeline finished.');

        const durationMs = Date.now() - startTime;

        self.postMessage({
          type: 'SUCCESS',
          payload: {
            processedDataUrl: segmentation.trimmedDataUrl,
            byteSize: segmentation.byteSize,
            palette,
            suggestedTags,
            originalWidth: preprocessed.originalWidth,
            originalHeight: preprocessed.originalHeight,
            durationMs,
          },
        } as WorkerSuccessMessage);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown worker error';
        self.postMessage({
          type: 'ERROR',
          error: message,
        } as WorkerErrorMessage);
      }
    }
  };
}

