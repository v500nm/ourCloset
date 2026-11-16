import { describe, it, expect } from 'vitest';
import { runEngineEvaluation } from '@/engine/evaluation/evaluator';
import { EVALUATION_DATASET } from '@/engine/evaluation/evaluationSet';

describe('Tenet 2: Cultural Fluency & Evaluation Benchmark', () => {
  it('achieves precision@3 >= 0.80 overall and >= 0.80 across all three cultural taxonomies', () => {
    const report = runEngineEvaluation();

    console.log(`\n📊 Cultural Fluency Precision@3 Benchmark Results:`);
    console.log(`   - Western Taxonomy:            ${(report.taxonomyResults.western.precisionAt3 * 100).toFixed(1)}%`);
    console.log(`   - Indian Traditional Taxonomy: ${(report.taxonomyResults.indian_traditional.precisionAt3 * 100).toFixed(1)}%`);
    console.log(`   - Islamic-Modest Taxonomy:     ${(report.taxonomyResults.islamic_modest.precisionAt3 * 100).toFixed(1)}%`);
    console.log(`   - Overall Precision@3:         ${(report.overallPrecisionAt3 * 100).toFixed(1)}% (Target: >= 80.0%)\n`);

    expect(report.overallPrecisionAt3).toBeGreaterThanOrEqual(0.8);
    expect(report.taxonomyResults.western.precisionAt3).toBeGreaterThanOrEqual(0.8);
    expect(report.taxonomyResults.indian_traditional.precisionAt3).toBeGreaterThanOrEqual(0.8);
    expect(report.taxonomyResults.islamic_modest.precisionAt3).toBeGreaterThanOrEqual(0.8);
    expect(report.passedBenchmark).toBe(true);
  });

  it('validates Phase 7 beta-style scenario benchmarks across all three taxonomies (F-04)', () => {
    const betaCases = EVALUATION_DATASET.filter((p) => p.id.includes('beta'));
    expect(betaCases.length).toBeGreaterThanOrEqual(15);

    // Verify representation across Western, Indian Traditional, and Islamic Modest
    const westernBeta = betaCases.filter((p) => p.taxonomy === 'western');
    const indianBeta = betaCases.filter((p) => p.taxonomy === 'indian_traditional');
    const islamicBeta = betaCases.filter((p) => p.taxonomy === 'islamic_modest');

    expect(westernBeta.length).toBeGreaterThanOrEqual(5);
    expect(indianBeta.length).toBeGreaterThanOrEqual(5);
    expect(islamicBeta.length).toBeGreaterThanOrEqual(5);

    // Evaluate beta dataset through the engine
    const betaReport = runEngineEvaluation(betaCases);

    console.log(`\n🏡 Beta-Style Scenario Benchmark Precision@3 Results (F-04):`);
    console.log(`   - Western Beta:            ${(betaReport.taxonomyResults.western.precisionAt3 * 100).toFixed(1)}%`);
    console.log(`   - Indian Traditional Beta: ${(betaReport.taxonomyResults.indian_traditional.precisionAt3 * 100).toFixed(1)}%`);
    console.log(`   - Islamic-Modest Beta:     ${(betaReport.taxonomyResults.islamic_modest.precisionAt3 * 100).toFixed(1)}%`);
    console.log(`   - Overall Beta P@3:        ${(betaReport.overallPrecisionAt3 * 100).toFixed(1)}%\n`);

    expect(betaReport.taxonomyResults.western.precisionAt3).toBeGreaterThanOrEqual(0.8);
    expect(betaReport.taxonomyResults.indian_traditional.precisionAt3).toBeGreaterThanOrEqual(0.8);
    expect(betaReport.taxonomyResults.islamic_modest.precisionAt3).toBeGreaterThanOrEqual(0.8);
    expect(betaReport.overallPrecisionAt3).toBeGreaterThanOrEqual(0.8);
  });
});

