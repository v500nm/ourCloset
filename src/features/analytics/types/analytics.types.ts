import { CulturalStyle, FormalityLevel } from '@/types';

export interface MatrixCoverageCell {
  culturalStyle: CulturalStyle;
  formalityLevel: FormalityLevel;
  itemCount: number;
}

export interface DeclutterNudgeItem {
  id: string;
  title: string;
  lastWornAt?: string;
  wearCount: number;
}
