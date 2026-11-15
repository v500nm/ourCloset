import { describe, it, expect, vi } from 'vitest';
import { resolveContextFromFreeform } from '@/features/context/services/contextService';
import {
  LABELLED_CONTEXT_PROMPTS,
  LabelledContextPrompt,
} from '@/features/context/evaluation/labelledContextPrompts';

// HERMETIC: the resolver's "second opinion" lazily downloads MiniLM (~90 MB) for ambiguous prompts. Left live,
// this benchmark's result depended on the machine's model cache and network (cold CI: timeout / different
// accuracy). Stubbing it out makes the number below the reproducible FAST-PATH accuracy. The semantic layer is
// measured separately (opt-in, see contextSemantic.test.ts).
vi.mock('@/services/transformers/pipeline', () => ({
  default: { getInstance: () => Promise.reject(new Error('model disabled: hermetic unit test')) },
}));

describe('Context Resolver & 150-Prompt Evaluation Benchmark (fast path only)', () => {
  it('contains exactly 150 diverse labelled cultural prompts', () => {
    expect(LABELLED_CONTEXT_PROMPTS).toHaveLength(150);

    const indianCount = LABELLED_CONTEXT_PROMPTS.filter(
      (p) => p.taxonomy === 'indian_traditional'
    ).length;
    const islamicCount = LABELLED_CONTEXT_PROMPTS.filter(
      (p) => p.taxonomy === 'islamic_modest'
    ).length;
    const westernCount = LABELLED_CONTEXT_PROMPTS.filter(
      (p) => p.taxonomy === 'western'
    ).length;

    expect(indianCount).toBe(50);
    expect(islamicCount).toBe(50);
    expect(westernCount).toBe(50);
  });

  it('achieves >= 85% overall accuracy and >= 75% per cultural taxonomy', async () => {
    let correctCount = 0;
    let presetMatchCount = 0;
    let culturalStyleMatchCount = 0;
    let formalityWithinBandCount = 0;

    const taxonomyStats = {
      indian_traditional: { total: 0, correct: 0 },
      islamic_modest: { total: 0, correct: 0 },
      western: { total: 0, correct: 0 },
    };

    const misclassifications: Array<{
      id: string;
      prompt: string;
      expected: { preset: string; style: string; formality: number };
      received: { preset?: string; style: string; formality: number };
      failureReason: string;
    }> = [];

    for (const item of LABELLED_CONTEXT_PROMPTS) {
      const resolved = await resolveContextFromFreeform(item.prompt);

      const presetMatches = resolved.preset === item.expectedPreset;
      const culturalStyleMatches = resolved.culturalStyle === item.expectedCulturalStyle;
      const formalityWithinBand = Math.abs(resolved.formality - item.expectedFormality) <= 1;

      if (presetMatches) presetMatchCount++;
      if (culturalStyleMatches) culturalStyleMatchCount++;
      if (formalityWithinBand) formalityWithinBandCount++;

      const isOverallCorrect = presetMatches && culturalStyleMatches && formalityWithinBand;

      taxonomyStats[item.taxonomy].total++;
      if (isOverallCorrect) {
        correctCount++;
        taxonomyStats[item.taxonomy].correct++;
      } else {
        const reasons: string[] = [];
        if (!presetMatches) reasons.push(`preset (${resolved.preset} != ${item.expectedPreset})`);
        if (!culturalStyleMatches)
          reasons.push(`style (${resolved.culturalStyle} != ${item.expectedCulturalStyle})`);
        if (!formalityWithinBand)
          reasons.push(`formality (${resolved.formality} not in ${item.expectedFormality} ± 1)`);

        misclassifications.push({
          id: item.id,
          prompt: item.prompt,
          expected: {
            preset: item.expectedPreset,
            style: item.expectedCulturalStyle,
            formality: item.expectedFormality,
          },
          received: {
            preset: resolved.preset,
            style: resolved.culturalStyle,
            formality: resolved.formality,
          },
          failureReason: reasons.join(', '),
        });
      }
    }

    const overallAccuracy = (correctCount / LABELLED_CONTEXT_PROMPTS.length) * 100;
    const presetAccuracy = (presetMatchCount / LABELLED_CONTEXT_PROMPTS.length) * 100;
    const culturalAccuracy = (culturalStyleMatchCount / LABELLED_CONTEXT_PROMPTS.length) * 100;
    const formalityAccuracy = (formalityWithinBandCount / LABELLED_CONTEXT_PROMPTS.length) * 100;

    const indianAccuracy =
      (taxonomyStats.indian_traditional.correct / taxonomyStats.indian_traditional.total) * 100;
    const islamicAccuracy =
      (taxonomyStats.islamic_modest.correct / taxonomyStats.islamic_modest.total) * 100;
    const westernAccuracy =
      (taxonomyStats.western.correct / taxonomyStats.western.total) * 100;

    console.log(`\n======================================================`);
    console.log(`📊 CONTEXT RESOLVER 150-PROMPT EVALUATION BENCHMARK`);
    console.log(`======================================================`);
    console.log(`Overall Classification Accuracy: ${overallAccuracy.toFixed(1)}% (Target: >= 85.0%)`);
    console.log(`   - Preset Intent Accuracy:     ${presetAccuracy.toFixed(1)}%`);
    console.log(`   - Cultural Style Accuracy:    ${culturalAccuracy.toFixed(1)}%`);
    console.log(`   - Formality (±1 Band):        ${formalityAccuracy.toFixed(1)}%`);
    console.log(`------------------------------------------------------`);
    console.log(`Taxonomy Breakdown:`);
    console.log(`   - Indian Traditional:         ${indianAccuracy.toFixed(1)}% (50 prompts)`);
    console.log(`   - Islamic-Modest:             ${islamicAccuracy.toFixed(1)}% (50 prompts)`);
    console.log(`   - Western Attire:             ${westernAccuracy.toFixed(1)}% (50 prompts)`);
    console.log(`======================================================\n`);

    if (misclassifications.length > 0) {
      console.log(`Misclassifications (${misclassifications.length}):`);
      misclassifications.forEach((m) => {
        console.log(`   [${m.id}] "${m.prompt}" -> ${m.failureReason}`);
      });
    }

    // Required target bar: >= 85% overall
    expect(overallAccuracy).toBeGreaterThanOrEqual(85.0);
    expect(indianAccuracy).toBeGreaterThanOrEqual(75.0);
    expect(islamicAccuracy).toBeGreaterThanOrEqual(75.0);
    expect(westernAccuracy).toBeGreaterThanOrEqual(75.0);
  });
});
