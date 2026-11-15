import { describe, it, expect } from 'vitest';
import { runEngineEvaluation } from '@/engine/evaluation/evaluator';

describe('Tenet 2: Cultural Fluency & Evaluation Benchmark', () => {
  it('achieves precision@3 >= 0.80 overall and >= 0.70 across all three cultural taxonomies', () => {
    const report = runEngineEvaluation();

    console.log(`\n📊 Cultural Fluency Precision@3 Benchmark Results:`);
    console.log(`   - Western Taxonomy:            ${(report.taxonomyResults.western.precisionAt3 * 100).toFixed(1)}%`);
    console.log(`   - Indian Traditional Taxonomy: ${(report.taxonomyResults.indian_traditional.precisionAt3 * 100).toFixed(1)}%`);
    console.log(`   - Islamic-Modest Taxonomy:     ${(report.taxonomyResults.islamic_modest.precisionAt3 * 100).toFixed(1)}%`);
    console.log(`   - Overall Precision@3:         ${(report.overallPrecisionAt3 * 100).toFixed(1)}% (Target: >= 80.0%)\n`);

    expect(report.overallPrecisionAt3).toBeGreaterThanOrEqual(0.8);
    expect(report.taxonomyResults.western.precisionAt3).toBeGreaterThanOrEqual(0.7);
    expect(report.taxonomyResults.indian_traditional.precisionAt3).toBeGreaterThanOrEqual(0.7);
    expect(report.taxonomyResults.islamic_modest.precisionAt3).toBeGreaterThanOrEqual(0.7);
    expect(report.passedBenchmark).toBe(true);
  });
});

