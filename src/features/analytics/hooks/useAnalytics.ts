'use client';

import { useState, useEffect } from 'react';
import { MatrixCoverageCell, DeclutterNudgeItem } from '../types/analytics.types';
import { fetchGapAnalysisMatrix, fetchDeclutterNudges } from '../services/analyticsService';

export function useAnalytics() {
  const [matrix, setMatrix] = useState<MatrixCoverageCell[]>([]);
  const [nudges, setNudges] = useState<DeclutterNudgeItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchGapAnalysisMatrix(), fetchDeclutterNudges()]).then(([m, n]) => {
      setMatrix(m);
      setNudges(n);
      setLoading(false);
    });
  }, []);

  return { matrix, nudges, loading };
}
