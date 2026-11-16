import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  logBetaFeedback,
  getBetaFeedbackHistory,
  clearBetaFeedbackHistory,
} from '@/services/localLearningEngine';
import { telemetry, trackPrivacyEvent, scrubPII } from '@/services/telemetry';
import { TwinningMatchResults } from '@/features/twinning/components/TwinningMatchResults';

// Mock household and wardrobe providers
vi.mock('@/providers/HouseholdProvider', () => ({
  useHousehold: () => ({
    members: [
      { id: 'm-adnan', name: 'Adnan', role: 'Husband' },
      { id: 'm-sarah', name: 'Sarah', role: 'Wife' },
    ],
  }),
}));

vi.mock('@/providers/WardrobeProvider', () => ({
  useWardrobe: () => ({
    markItemsDirty: vi.fn(),
    loadSampleWardrobe: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock('@/features/twinning/hooks/useTwinning', () => ({
  useTwinning: (eventContext: string) => ({
    tiers: [
      {
        tier: 'balanced',
        label: 'Balanced Contrast',
        description: 'Coordinated tones',
        colorWeight: 0.5,
        silhouetteWeight: 0.5,
        partnerOutfit: [
          {
            id: 'partner-item-1',
            title: 'Banarasi Saree',
            category: 'traditional_combo',
            cultural_style: 'indian_traditional',
            formality_level: 5,
          },
        ],
        matchReason: 'Harmonious color contrast',
      },
    ],
    selectedTier: 'balanced',
    setSelectedTier: vi.fn(),
    status: 'PENDING',
    rerolls: 2,
    loading: false,
    handleAccept: vi.fn(),
    handleReroll: vi.fn(),
  }),
}));

describe('Phase 7 Beta Feedback & Telemetry Mechanism', () => {
  beforeEach(async () => {
    await clearBetaFeedbackHistory();
    telemetry.clearBuffer();
  });

  it('stores beta feedback into local learning engine without photo or PII data', async () => {
    const feedback = await logBetaFeedback({
      woreOutfit: true,
      culturalAccuracy: 'authentic',
      feedbackCategory: 'culturally_authentic',
      eventContext: 'Sarah & Tariq Sangeet Night',
      selectedTier: 'balanced',
      lockedItemIds: ['SU-NVY-01', 'partner-item-1'],
    });

    expect(feedback.id).toContain('beta-fb-');
    expect(feedback.woreOutfit).toBe(true);
    expect(feedback.culturalAccuracy).toBe('authentic');

    const history = await getBetaFeedbackHistory();
    expect(history).toHaveLength(1);
    expect(history[0].eventContext).toBe('Sarah & Tariq Sangeet Night');
    expect(history[0].lockedItemIds).toEqual(['SU-NVY-01', 'partner-item-1']);

    // Assert zero photo URL or PII property
    expect(JSON.stringify(history[0])).not.toContain('https://');
    expect(JSON.stringify(history[0])).not.toContain('data:image');
    expect(JSON.stringify(history[0])).not.toContain('email');
  });

  it('records scrubbed beta_feedback telemetry events with zero PII leakage', () => {
    const payload = {
      wore_outfit: true,
      cultural_accuracy: 'authentic',
      feedback_category: 'culturally_authentic',
      selected_tier: 'balanced',
      item_count: 2,
      // Attempt forbidden or sensitive fields
      email: 'user@example.com',
      image: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQE...',
      photo_url: 'https://images.ourcloset.app/garments/suit.jpg',
      user_notes: 'Wore this to family wedding in London',
    };

    trackPrivacyEvent('beta_feedback', payload);

    const buffer = telemetry.getBuffer();
    const event = buffer.find((e) => e.eventName === 'beta_feedback');

    expect(event).toBeDefined();
    expect(event?.payload.wore_outfit).toBe(true);
    expect(event?.payload.cultural_accuracy).toBe('authentic');
    expect(event?.payload.selected_tier).toBe('balanced');

    // Forbidden keys should have been dropped by scrubPII
    expect(event?.payload.email).toBeUndefined();
    expect(event?.payload.image).toBeUndefined();
    expect(event?.payload.photo_url).toBeUndefined();
    expect(event?.payload.user_notes).toBeUndefined();
  });

  it('renders Atelier-styled beta feedback UI actions in TwinningMatchResults', () => {
    const html = renderToStaticMarkup(
      React.createElement(TwinningMatchResults, {
        activeMode: { type: 'couple', memberIds: ['m-adnan', 'm-sarah'] },
        eventContext: 'Sarah & Tariq Sangeet Night',
      })
    );

    expect(html).toContain('data-testid="beta-feedback-section"');
    expect(html).toContain('Beta Household Feedback');
    expect(html).toContain('Zero PII • Local Learning');
    expect(html).toContain('Did you wear this suggested outfit?');
    expect(html).toContain('data-testid="wear-yes-btn"');
    expect(html).toContain('data-testid="wear-no-btn"');
    expect(html).toContain('Cultural Feedback &amp; Fluency:');
    expect(html).toContain('data-testid="cultural-feedback-authentic"');
    expect(html).toContain('data-testid="cultural-feedback-formality_mismatch"');
    expect(html).toContain('data-testid="cultural-feedback-modesty_unmet"');
    expect(html).toContain('data-testid="cultural-feedback-color_clash"');
    expect(html).toContain('data-testid="submit-beta-feedback-btn"');
  });
});
