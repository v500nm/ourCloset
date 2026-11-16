'use client';

import React, { useState, useRef } from 'react';
import { WardrobeItem, CulturalStyle, ItemCategory, FormalityLevel, HardwareMetalColor, LeatherTone, SeasonTag, PrivacyTier } from '@/types';
import { Button, Card } from '@/components';
import { ingestionWorkerClient, type IngestionPipelineOutput } from '../services/ingestionWorkerClient';
import { saveWardrobeItem } from '../services/ingestionService';
import { IngestionItem } from '../types/ingestion.types';
import { trackPrivacyEvent } from '@/services/telemetry';

interface IngestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: WardrobeItem) => void;
  preferredStyle?: CulturalStyle;
}

/**
 * A bulk-intake entry together with the user's edits to the pipeline's suggestions.
 * Suggestions are only suggestions: every `edited*` field overrides what the model proposed.
 */
export interface IngestionQueueItem {
  id?: string;
  file: File;
  fileName?: string;
  status?: 'queued' | 'processing' | 'done' | 'error';
  output?: IngestionPipelineOutput;
  processedItem?: IngestionItem;
  previewUrl?: string;
  byteSize?: number;
  confidence?: number;
  explanation?: string;
  error?: string;
  editedTitle?: string;
  editedCategory?: ItemCategory;
  editedCulturalStyle?: CulturalStyle;
  editedFormalityLevel?: FormalityLevel;
  editedPrimaryColor?: string;
  editedSecondaryColor?: string | null;
  editedHardwareMetal?: HardwareMetalColor | null;
  editedLeatherTone?: LeatherTone | null;
  editedSeasonTags?: SeasonTag[];
  editedPrivacyTier?: PrivacyTier;
}

export const IngestionModal: React.FC<IngestionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  preferredStyle = 'western',
}) => {
  const [step, setStep] = useState<'upload' | 'processing' | 'review'>('upload');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [progressMessage, setProgressMessage] = useState<string>('');
  const [activeStage, setActiveStage] = useState<string>('DECODE');

  // Queue for bulk ingestion
  const [queue, setQueue] = useState<IngestionQueueItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  // Review state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ItemCategory>('shirt');
  const [culturalStyle, setCulturalStyle] = useState<CulturalStyle>(preferredStyle);
  const [formalityLevel, setFormalityLevel] = useState<number>(3);
  const [primaryColor, setPrimaryColor] = useState<string>('#3E2723');
  const [secondaryColor, setSecondaryColor] = useState<string>('#D7CCC8');
  const [previewImage, setPreviewImage] = useState<string>('');
  const [confidence, setConfidence] = useState<number>(0.85);
  const [explanation, setExplanation] = useState<string>('');
  const [byteSize, setByteSize] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  if (!isOpen) return null;

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    const initialQueue: IngestionQueueItem[] = fileList.map((f) => ({ file: f }));
    setQueue(initialQueue);
    setCurrentIndex(0);

    await processQueueItem(0, initialQueue);
  };

  const processQueueItem = async (index: number, currentQueue: IngestionQueueItem[]) => {
    if (index >= currentQueue.length) {
      onClose();
      return;
    }

    const current = currentQueue[index];
    setStep('processing');
    setProgressPercent(10);
    setProgressMessage('Calibrating canvas & reading EXIF...');
    setActiveStage('DECODE');

    abortControllerRef.current = new AbortController();

    try {
      const output = await ingestionWorkerClient.processGarment(current.file, {
        preferredStyle: culturalStyle,
        signal: abortControllerRef.current.signal,
        onProgress: (stage, percent, message) => {
          setActiveStage(stage);
          setProgressPercent(percent);
          setProgressMessage(message);
        },
      });

      const processed: IngestionItem = {
        imageFile: current.file,
        title: output.suggestedTags.suggestedTitle,
        processedImageUrl: output.processedDataUrl,
        autoTags: {
          category: output.suggestedTags.category,
          culturalStyle: output.suggestedTags.culturalStyle,
          primaryColorHex: output.palette.primaryColorHex,
          secondaryColorHex: output.palette.secondaryColorHex,
          hardwareMetalColor: output.palette.hardwareMetalColor,
          leatherTone: output.palette.leatherTone,
          formalityLevel: output.suggestedTags.formalityLevel,
          confidence: output.suggestedTags.confidence,
        },
        status: 'review',
      };

      // Populate review state
      setTitle(output.suggestedTags.suggestedTitle);
      setCategory(output.suggestedTags.category);
      setCulturalStyle(output.suggestedTags.culturalStyle);
      setFormalityLevel(output.suggestedTags.formalityLevel);
      setPrimaryColor(output.palette.primaryColorHex);
      setSecondaryColor(output.palette.secondaryColorHex || '#E0E0E0');
      setPreviewImage(output.processedDataUrl);
      setConfidence(output.suggestedTags.confidence);
      setExplanation(output.suggestedTags.explanation);
      setByteSize(output.byteSize);

      setStep('review');
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // User cancelled
        setStep('upload');
      } else {
        console.error('Ingestion processing failed:', err);
        // Fallback to manual entry with local image url
        const objectUrl = URL.createObjectURL(current.file);
        setPreviewImage(objectUrl);
        setTitle('Custom Garment');
        setStep('review');
      }
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setStep('upload');
    onClose();
  };

  const handleFinalSave = async () => {
    const currentQueued = queue[currentIndex];
    const itemToSave: IngestionItem = {
      imageFile: currentQueued?.file || new File([], 'garment.jpg'),
      title: title || 'New Garment',
      processedImageUrl: previewImage,
      autoTags: {
        category,
        culturalStyle,
        primaryColorHex: primaryColor,
        secondaryColorHex: secondaryColor,
        hardwareMetalColor: null,
        leatherTone: null,
        formalityLevel: formalityLevel as 1 | 2 | 3 | 4 | 5,
        confidence,
      },
      userCorrectedTags: {
        category,
        culturalStyle,
        primaryColorHex: primaryColor,
        secondaryColorHex: secondaryColor,
        formalityLevel: formalityLevel as 1 | 2 | 3 | 4 | 5,
      },
      status: 'saved',
    };

    // Save to local-first database
    const saved = await saveWardrobeItem(itemToSave);

    const fullWardrobeItem: WardrobeItem = {
      id: saved.id,
      user_id: 'user-current',
      title: title || 'New Garment',
      category,
      cultural_style: culturalStyle,
      primary_color_hex: primaryColor,
      secondary_color_hex: secondaryColor,
      formality_level: formalityLevel as 1 | 2 | 3 | 4 | 5,
      image_url: previewImage,
      season_tags: ['all-season'],
      wear_count: 0,
      laundry_status: 'CLEAN',
      privacy_tier: 'PUBLIC',
      created_at: new Date().toISOString(),
    };

    onSave(fullWardrobeItem);
    try {
      trackPrivacyEvent('item_ingested', {
        category,
        formality: formalityLevel,
        success: true,
      });
    } catch {
      // Telemetry failure should never block UI
    }

    // If more items in queue, proceed to next
    const nextIdx = currentIndex + 1;
    if (nextIdx < queue.length) {
      setCurrentIndex(nextIdx);
      await processQueueItem(nextIdx, queue);
    } else {
      onClose();
      setStep('upload');
      setQueue([]);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 ink-overlay backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ingestion-modal-title"
    >
      <Card className="w-full max-w-xl bg-surface relative p-6 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-dashed border-outline-variant">
          <div>
            <span className="spec-label text-primary/60 text-xs block">
              Tenet 1: Device-First Privacy (Zero Photo Sync)
            </span>
            <h3 id="ingestion-modal-title" className="font-display text-headline-md text-primary">
              {queue.length > 1
                ? `Ingest Garment (${currentIndex + 1} of ${queue.length})`
                : 'Ingest Wardrobe Garment'}
            </h3>
          </div>
          <button
            onClick={handleCancel}
            className="text-on-surface-variant hover:text-primary p-1 rounded transition-colors"
            aria-label="Close modal"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* STEP 1: UPLOAD / CAMERA */}
        {step === 'upload' && (
          <div className="text-center py-6 space-y-6">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-primary/20 hover:border-secondary rounded-xl p-8 cursor-pointer transition-all bg-surface-container/30 hover:bg-surface-container/50 group"
            >
              <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-surface-container flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-3xl">add_a_photo</span>
              </div>
              <h4 className="font-display text-title-md text-primary mb-1">
                Select Garment Photo or Take Picture
              </h4>
              <p className="text-body-sm text-on-surface-variant font-body max-w-sm mx-auto">
                Background is removed automatically using WebAssembly & WebGPU inside your browser.
                Photos never leave your device.
              </p>
              <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded bg-secondary/10 text-secondary text-xs font-mono">
                <span className="material-symbols-outlined text-xs">offline_pin</span>
                <span>Offline Capable • Bulk Ingestion Enabled</span>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFilesSelected(e.target.files)}
            />

            <div className="flex gap-3 justify-center">
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="w-full justify-center"
              >
                Choose Photo(s)
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: STAGED PROCESSING */}
        {step === 'processing' && (
          <div className="text-center py-10 space-y-6">
            <div className="relative w-20 h-20 mx-auto">
              <div className="w-20 h-20 border-4 border-secondary/20 border-t-secondary rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center font-mono text-xs font-bold text-primary">
                {progressPercent}%
              </div>
            </div>

            <div className="space-y-2 max-w-md mx-auto">
              <span className="spec-label text-secondary font-mono text-xs uppercase tracking-wider block">
                STAGE: {activeStage}
              </span>
              <p className="font-display text-title-md text-primary">
                {progressMessage || 'Processing Garment...'}
              </p>
              <div className="w-full bg-surface-container rounded-full h-2 overflow-hidden mt-3">
                <div
                  className="bg-secondary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <div className="pt-4 border-t border-dashed border-outline-variant/40 flex justify-between items-center text-xs text-on-surface-variant font-mono">
              <span>Web Worker Isolation</span>
              <button
                onClick={handleCancel}
                className="text-red-700 hover:underline cursor-pointer"
              >
                Cancel Ingestion
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: REVIEW & EDIT */}
        {step === 'review' && (
          <div className="space-y-5">
            {/* Cutout Preview and Quality Tag */}
            <div className="flex items-center gap-4 bg-surface-container-lowest p-3 rounded-lg border border-outline-variant/30">
              {previewImage && (
                <div className="w-24 h-28 bg-surface-container rounded overflow-hidden flex items-center justify-center p-1 border border-outline-variant/20 flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewImage}
                    alt="Segmented Garment Cutout"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              )}
              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded text-xs font-mono font-medium">
                    <span className="material-symbols-outlined text-xs">verified</span>
                    {Math.round(confidence * 100)}% Confidence
                  </span>
                  {byteSize > 0 && (
                    <span className="text-xs font-mono text-on-surface-variant">
                      {Math.round(byteSize / 1024)} KB WebP
                    </span>
                  )}
                </div>
                <p className="text-xs text-on-surface-variant truncate font-body">
                  {explanation || 'Cultural silhouette and color harmony classified.'}
                </p>
                <div className="flex items-center gap-3 pt-1">
                  <div className="flex items-center gap-1.5 text-xs font-mono text-primary/80">
                    <span>Primary:</span>
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-5 h-5 rounded cursor-pointer border-0 p-0"
                    />
                    <span className="text-xs">{primaryColor}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-mono text-primary/80">
                    <span>Secondary:</span>
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-5 h-5 rounded cursor-pointer border-0 p-0"
                    />
                    <span className="text-xs">{secondaryColor}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="spec-label block text-primary/70 mb-1">Garment Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-surface-container/50 border-b-2 border-primary/20 p-2 text-primary focus:border-secondary focus:outline-none rounded text-sm font-medium"
              />
            </div>

            {/* Category and Cultural Style */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="spec-label block text-primary/70 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ItemCategory)}
                  className="w-full bg-surface-container p-2 rounded text-sm text-primary border border-outline-variant focus:outline-none"
                >
                  <option value="shirt">Shirt</option>
                  <option value="tshirt">T-Shirt</option>
                  <option value="pants">Pants / Trousers</option>
                  <option value="jeans">Jeans / Denim</option>
                  <option value="suit">Suit / Tailored Blazer</option>
                  <option value="traditional_combo">Traditional Combo (Kurta/Sherwani/Abaya)</option>
                  <option value="footwear">Footwear / Shoes</option>
                  <option value="belt">Belt</option>
                  <option value="watch">Watch</option>
                  <option value="accessory">Accessory</option>
                </select>
              </div>

              <div>
                <label className="spec-label block text-primary/70 mb-1">Cultural Style</label>
                <select
                  value={culturalStyle}
                  onChange={(e) => setCulturalStyle(e.target.value as CulturalStyle)}
                  className="w-full bg-surface-container p-2 rounded text-sm text-primary border border-outline-variant focus:outline-none"
                >
                  <option value="western">Western</option>
                  <option value="indian_traditional">Indian Traditional</option>
                  <option value="islamic_modest">Islamic-Modest</option>
                </select>
              </div>
            </div>

            {/* Formality Level Slider */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="spec-label text-primary/70">Formality Level</label>
                <span className="font-mono text-xs font-semibold text-secondary">
                  Band {formalityLevel} / 5
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                value={formalityLevel}
                onChange={(e) => setFormalityLevel(Number(e.target.value))}
                className="w-full accent-secondary cursor-pointer"
              />
              <div className="flex justify-between text-xs text-on-surface-variant font-mono mt-0.5">
                <span>1 (Casual)</span>
                <span>3 (Smart Casual)</span>
                <span>5 (Black Tie / Wedding)</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-3">
              <Button
                variant="outline"
                onClick={handleCancel}
                className="flex-1 justify-center"
              >
                Discard
              </Button>
              <Button
                onClick={handleFinalSave}
                className="flex-1 justify-center"
              >
                {queue.length > 1 && currentIndex + 1 < queue.length
                  ? `Save & Next (${currentIndex + 1}/${queue.length})`
                  : 'Confirm & Save to Closet'}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
