'use client';

import React, { useState, useEffect } from 'react';
import { ContextAttributes } from '../types/context.types';
import { Button } from '@/components';
import { getLearnedSuggestions, logPromptSelection } from '@/services/localLearningEngine';

interface FreeformInputProps {
  onGenerate: (text: string) => void;
  resolvedContext?: ContextAttributes | null;
  loading?: boolean;
  overrideText?: string;
}

export const FreeformInput: React.FC<FreeformInputProps> = ({
  onGenerate,
  resolvedContext,
  loading = false,
  overrideText,
}) => {
  const [text, setText] = useState('sunset beach cocktail, pastel modest vibes');
  const [learnedConfidence, setLearnedConfidence] = useState(60);
  const [boostedCats, setBoostedCats] = useState<string[]>([]);

  useEffect(() => {
    if (text.trim()) {
      getLearnedSuggestions(text).then((res) => {
        setLearnedConfidence(res.confidenceScore);
        setBoostedCats(res.boostedCategories);
      });
    }
  }, [text]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      // Log prompt to local learning engine in IndexedDB
      logPromptSelection({
        promptText: text,
        moodKeywords: text.toLowerCase().split(/\s+/),
        eventContext: resolvedContext?.label || 'Custom Prompt',
        lockedItemIds: ['SU-NVY-01', 'TC-GLD-01'],
      });
      onGenerate(text);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="relative bg-surface-container-lowest p-6 torn-swatch hard-shadow border border-outline-variant/20 mb-8 space-y-4"
    >
      <div className="flex justify-between items-center">
        <label
          htmlFor="nlp-input"
          className="spec-label text-primary/70 block uppercase tracking-wider"
        >
          Describe the vibe (Zero-Key Local NLP + IndexedDB Memory)
        </label>
        <span className="spec-label text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded text-[10px]">
          Local Learning Confidence: {learnedConfidence}%
        </span>
      </div>

      <div className="relative">
        <input
          id="demo-input-field"
          type="text"
          suppressHydrationWarning
          value={overrideText !== undefined ? overrideText : text}
          onChange={(e) => setText(e.target.value)}
          placeholder="sunset beach cocktail, pastel modest vibes"
          className="w-full bg-transparent border-0 border-b-2 border-primary/20 pb-3 pl-0 pr-12 text-primary font-body text-body-md focus:ring-0 focus:border-secondary transition-colors placeholder:text-outline/50"
        />
        <button
          type="button"
          suppressHydrationWarning
          aria-label="Voice input"
          className="absolute right-0 bottom-2 text-primary/60 hover:text-secondary transition-colors focus:outline-none"
        >
          <span className="material-symbols-outlined">mic</span>
        </button>
      </div>

      {boostedCats.length > 0 && (
        <div className="text-xs font-mono text-primary/60 flex items-center gap-1.5 pt-1">
          <span className="material-symbols-outlined text-sm text-secondary">psychology</span>
          <span>Learned Category Weights: {boostedCats.join(', ')}</span>
        </div>
      )}

      {resolvedContext && (
        <div className="p-3 bg-secondary-container/30 border border-secondary/30 rounded flex items-center justify-between text-xs text-on-secondary-container">
          <span>
            Matched Template: <strong>{resolvedContext.label}</strong> (Formality {resolvedContext.formality}/5)
          </span>
          <span className="spec-label text-secondary font-mono">{resolvedContext.culturalStyle}</span>
        </div>
      )}

      <div className="pt-2 flex justify-end">
        <Button id="demo-generate-btn" type="submit" disabled={loading}>
          {loading ? 'Processing WASM & Learning...' : 'Generate Looks'}
          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </Button>
      </div>
    </form>
  );
};
