import { CulturalStyle, FormalityLevel } from '@/types';

export interface MatrixCoverageCell {
  culturalStyle: CulturalStyle;
  formalityLevel: FormalityLevel;
  itemCount: number;
  isGap: boolean;
}

export interface DeclutterNudgeItem {
  id: string;
  title: string;
  lastWornAt?: string;
  wearCount: number;
  daysSinceWorn?: number;
}

export interface CostPerWearStat {
  itemId: string;
  title: string;
  purchasePrice?: number;
  wearCount: number;
  costPerWear: number;
}

export interface WardrobeAnalyticsSummary {
  totalItems: number;
  totalLoggedOutfits: number;
  averageWearCount: number;
  averageCostPerWear: number;
  gapCount: number;
  coverageMatrix: MatrixCoverageCell[];
  declutterNudges: DeclutterNudgeItem[];
  topWornItems: CostPerWearStat[];
}
