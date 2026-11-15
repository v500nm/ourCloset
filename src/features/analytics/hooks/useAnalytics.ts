'use client';

import { useState, useEffect } from 'react';
import {
  MatrixCoverageCell,
  DeclutterNudgeItem,
  WardrobeAnalyticsSummary,
} from '../types/analytics.types';
import {
  fetchGapAnalysisMatrix,
  fetchDeclutterNudges,
  fetchAnalyticsSummary,
} from '../services/analyticsService';

export function useAnalytics() {
  const [matrix, setMatrix] = useState<MatrixCoverageCell[]>([]);
  const [nudges, setNudges] = useState<DeclutterNudgeItem[]>([]);
  const [summary, setSummary] = useState<WardrobeAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      const [m, n, s] = await Promise.all([
        fetchGapAnalysisMatrix(),
        fetchDeclutterNudges(),
        fetchAnalyticsSummary(),
      ]);
      setMatrix(m);
      setNudges(n);
      setSummary(s);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return { matrix, nudges, summary, loading, refresh };
}
