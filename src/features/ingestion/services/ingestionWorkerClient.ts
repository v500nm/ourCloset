/**
 * Ingestion Worker Client
 * Provides typed promise-based interface to the Ingestion Web Worker.
 * Gracefully executes locally on main thread if Worker is unsupported (e.g., SSR or tests).
 */

import {
  IngestionStage,
  WorkerOutgoingMessage,
  WorkerProgressMessage,
  WorkerSuccessMessage,
} from '../workers/ingestionWorker';
import { CulturalStyle } from '@/types/taxonomy.types';
import { PaletteExtractionResult, extractOklchPalette } from '../pipeline/paletteExtractor';
import { TagSuggestionResult, suggestGarmentTags } from '../pipeline/tagSuggester';
import { preprocessImage } from '../pipeline/preprocessor';
import { segmentAndTrimGarment } from '../pipeline/segmenter';

export interface IngestionOptions {
  preferredStyle?: CulturalStyle;
  userHint?: string;
  onProgress?: (stage: IngestionStage, percent: number, message: string) => void;
  signal?: AbortSignal;
}

export interface IngestionPipelineOutput {
  processedDataUrl: string;
  byteSize: number;
  palette: PaletteExtractionResult;
  suggestedTags: TagSuggestionResult;
  originalWidth: number;
  originalHeight: number;
  durationMs: number;
}

export class IngestionWorkerClient {
  private worker: Worker | null = null;

  /**
   * Spawns or retrieves dedicated Web Worker.
   */
  private getWorker(): Worker | null {
    if (typeof window === 'undefined' || typeof Worker === 'undefined') {
      return null;
    }
    if (!this.worker) {
      try {
        this.worker = new Worker(
          new URL('../workers/ingestionWorker.ts', import.meta.url),
          { type: 'module' }
        );
      } catch {
        // Some bundlers or environments may restrict inline worker modules
        this.worker = null;
      }
    }
    return this.worker;
  }

  /**
   * Executes the full ingestion pipeline off the main thread.
   */
  async processGarment(
    file: File | Blob,
    options: IngestionOptions = {}
  ): Promise<IngestionPipelineOutput> {
    if (options.signal?.aborted) {
      throw new DOMException('Ingestion aborted by user', 'AbortError');
    }

    const startTime = Date.now();
    const buffer = await file.arrayBuffer();
    const mimeType = file.type || 'image/jpeg';
    const worker = this.getWorker();

    // In-thread fallback if Worker is not available (SSR / Node / test runner)
    if (!worker) {
      return this.processLocally(file, options, startTime);
    }

    return new Promise<IngestionPipelineOutput>((resolve, reject) => {
      let isSettled = false;

      // Handle external cancellation signal
      if (options.signal) {
        options.signal.addEventListener('abort', () => {
          if (!isSettled) {
            isSettled = true;
            worker.postMessage({ type: 'CANCEL' });
            reject(new DOMException('Ingestion aborted by user', 'AbortError'));
          }
        });
      }

      worker.onmessage = (e: MessageEvent<WorkerOutgoingMessage>) => {
        const msg = e.data;

        if (msg.type === 'STAGE_PROGRESS') {
          options.onProgress?.(msg.stage, msg.percent, msg.message);
        } else if (msg.type === 'SUCCESS') {
          isSettled = true;
          resolve(msg.payload);
        } else if (msg.type === 'ERROR') {
          isSettled = true;
          reject(new Error(msg.error));
        }
      };

      worker.onerror = (err) => {
        if (!isSettled) {
          isSettled = true;
          reject(new Error(`Ingestion worker error: ${err.message}`));
        }
      };

      // Transfer buffer ownership for zero-copy efficiency per ADR-006
      worker.postMessage(
        {
          type: 'PROCESS_IMAGE',
          buffer,
          mimeType,
          preferredStyle: options.preferredStyle,
          userHint: options.userHint,
        },
        [buffer]
      );
    });
  }

  /**
   * Local in-thread execution fallback for Node/Vitest environments.
   */
  private async processLocally(
    file: File | Blob,
    options: IngestionOptions,
    startTime: number
  ): Promise<IngestionPipelineOutput> {
    if (options.signal?.aborted) {
      throw new DOMException('Ingestion aborted by user', 'AbortError');
    }

    options.onProgress?.('DECODE', 20, 'Calibrating canvas...');
    const preprocessed = await preprocessImage(file, { maxDimension: 1024 });

    options.onProgress?.('SEGMENT', 50, 'Segmenting foreground silhouette...');
    let segmentation;
    if (preprocessed.imageData) {
      segmentation = await segmentAndTrimGarment(preprocessed.imageData, {
        padding: 16,
        quality: 0.82,
      });
    } else {
      segmentation = {
        trimmedDataUrl: preprocessed.dataUrl,
        boundingBox: { x: 0, y: 0, width: preprocessed.width, height: preprocessed.height },
        originalDimensions: { width: preprocessed.width, height: preprocessed.height },
        byteSize: 32000,
        isAlgorithmicFallback: true,
        aspectRatio: preprocessed.height / preprocessed.width,
        imageData: { width: 100, height: 100, data: new Uint8ClampedArray(40000) },
      };
    }

    options.onProgress?.('PALETTE', 75, 'Extracting OKLCH palette...');
    const palette = extractOklchPalette(segmentation.imageData, { k: 4, maxSamples: 3000 });

    options.onProgress?.('SUGGEST_TAGS', 90, 'Synthesizing tags...');
    const suggestedTags = suggestGarmentTags({
      aspectRatio: segmentation.aspectRatio,
      boundingBox: segmentation.boundingBox,
      palette,
      preferredCulturalStyle: options.preferredStyle,
      userHint: options.userHint,
    });

    options.onProgress?.('COMPLETE', 100, 'Ingestion complete.');

    return {
      processedDataUrl: segmentation.trimmedDataUrl,
      byteSize: segmentation.byteSize,
      palette,
      suggestedTags,
      originalWidth: preprocessed.originalWidth,
      originalHeight: preprocessed.originalHeight,
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * Terminates active worker instance.
   */
  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}

export const ingestionWorkerClient = new IngestionWorkerClient();
