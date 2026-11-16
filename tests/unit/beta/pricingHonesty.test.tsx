import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LandingPricing, pricingTiers } from '@/components/landing/LandingPricing';

describe('Phase 7 Pricing Transparency & Honesty', () => {
  it('defines all tiers as $0 and Free in Beta / Early Access', () => {
    expect(pricingTiers).toHaveLength(3);

    for (const tier of pricingTiers) {
      expect(tier.price).toBe('$0');
      expect(tier.badge).toBe('Free in Beta / Early Access');
      expect(tier.buttonText).toBeTruthy();
      expect(tier.buttonHref).toBeTruthy();
    }
  });

  it('marks Couple and Family tiers with Pro Cloud Sync Coming Soon notice', () => {
    const couple = pricingTiers.find((t) => t.name === 'Couple');
    const family = pricingTiers.find((t) => t.name === 'Family');
    const solo = pricingTiers.find((t) => t.name === 'Solo');

    expect(couple?.comingSoonNotice).toBe('Pro Cloud Sync Coming Soon');
    expect(family?.comingSoonNotice).toBe('Pro Cloud Sync Coming Soon');
    expect(solo?.features).toContain('100% Free & Local-First');
  });

  it('renders honest pricing disclosure pledge in the DOM without fake subscription paywalls', () => {
    const html = renderToStaticMarkup(React.createElement(LandingPricing));

    // Transparent heading & pledge
    expect(html).toContain('Transparent, Beta-Honest Pricing');
    expect(html).toContain('Our Phase 7 Honest Pricing Pledge');
    expect(html).toContain('100% free and local');
    expect(html).toContain('Zero-Key Local-First Architecture');

    // Tiers and coming soon labels
    expect(html).toContain('data-testid="pricing-tier-solo"');
    expect(html).toContain('data-testid="pricing-tier-couple"');
    expect(html).toContain('data-testid="pricing-tier-family"');
    expect(html).toContain('Pro Cloud Sync Coming Soon');
    expect(html).toContain('Free in Beta / Early Access');

    // Asserts no deceptive $15/mo or $29/mo pricing promises
    expect(html).not.toContain('$15');
    expect(html).not.toContain('$29');
    expect(html).not.toContain('/mo');
  });
});
