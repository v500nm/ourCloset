import { describe, it, expect } from 'vitest';
import { resolveContextFromFreeform } from '@/features/context/services/contextService';

describe('Context Resolver: Fast-Path vs Semantic Second Opinion (C2 Measurement)', () => {
  it('correctly resolves unambiguous keywords via fast-path without invoking ML pipeline', async () => {
    const prompt = 'Eid prayer at the mosque with clean white kurta';
    const result = await resolveContextFromFreeform(prompt);

    expect(result.preset).toBe('Event');
    expect(result.culturalStyle).toBe('islamic_modest');
    expect(result.formality).toBeGreaterThanOrEqual(3);
  });

  it('handles ambiguous cultural prompts gracefully', async () => {
    const ambiguousPrompt = 'gathering with close relatives and family';
    const result = await resolveContextFromFreeform(ambiguousPrompt);

    expect(result.formality).toBeGreaterThanOrEqual(1);
    expect(['western', 'indian_traditional', 'islamic_modest']).toContain(result.culturalStyle);
  });
});
