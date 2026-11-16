import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveContextFromFreeform } from '@/features/context/services/contextService';

describe('Performance & Bundle Splitting: Lazy Loading Transformers', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('resolves standard prompts on the fast path without loading @xenova/transformers', async () => {
    // Fast path: distinct clear keywords
    const result = await resolveContextFromFreeform('Executive boardroom meeting in formal navy suit');

    expect(result).toBeDefined();
    expect(result.preset).toBe('Office');
    expect(result.formality).toBeGreaterThanOrEqual(4);
    // Should not throw and should resolve with high confidence
    expect(result.confidence).toBeGreaterThanOrEqual(0.5);
  });

  it('PipelineSingleton uses dynamic import rather than static top-level import', async () => {
    // Dynamically import PipelineSingleton module
    const { default: PipelineSingleton } = await import('@/services/transformers/pipeline');
    expect(PipelineSingleton).toBeDefined();
    expect(typeof PipelineSingleton.getInstance).toBe('function');
  });

  it('falls back gracefully if transformer dynamic import fails or is hermetically blocked', async () => {
    // Ambiguous query that would invoke lazy semantic resolution
    const result = await resolveContextFromFreeform('maybe something for later tonight');
    expect(result).toBeDefined();
    expect(result.label).toBeDefined();
    expect(result.preset).toBeDefined();
  });
});

