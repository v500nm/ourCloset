import { ContextPreset, CulturalStyle, ActiveMode, EventSubContext } from '@/types';

export type { ContextPreset, CulturalStyle, ActiveMode, EventSubContext };

export interface ContextAttributes {
  label: string;
  preset?: ContextPreset;
  subPreset?: EventSubContext;
  formality: number; // 1-5
  warmth: 'low' | 'neutral' | 'high';
  modesty: 'low' | 'medium' | 'high';
  culturalStyle: CulturalStyle;
  confidence?: number;
  matchReason?: string;
}

export interface ContextState {
  mode: ActiveMode;
  preset: ContextPreset;
  subPreset?: EventSubContext;
  freeformText: string;
  resolvedContext: ContextAttributes | null;
}
