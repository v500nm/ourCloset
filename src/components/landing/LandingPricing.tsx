'use client';

import React, { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { MotionContainer, MotionText } from '../ui/motionText';
import Link from 'next/link';

export interface PricingTier {
  name: string;
  price: string;
  period?: string;
  badge: string;
  description: string;
  features: string[];
  buttonText: string;
  buttonHref: string;
  highlighted: boolean;
  comingSoonNotice?: string;
}

export const pricingTiers: PricingTier[] = [
  {
    name: 'Solo',
    price: '$0',
    period: 'Free Forever',
    badge: 'Free in Beta / Early Access',
    description: 'Private single-user wardrobe with zero cloud dependency.',
    features: [
      '100% Free & Local-First',
      'On-Device Ingestion & Background Removal',
      'Culturally Fluent Outfit Engine',
      'Local Weather & Context Intelligence',
      'Zero Photo or PII Upload',
    ],
    buttonText: 'Start Free in Beta',
    buttonHref: '/closet',
    highlighted: false,
  },
  {
    name: 'Couple',
    price: '$0',
    period: 'Free in Beta',
    badge: 'Free in Beta / Early Access',
    description: 'Coordinate effortlessly with your partner using peer-to-peer twinning.',
    features: [
      '2 User Profiles Included',
      'Couple Twinning Logic & Cross-Wardrobe Harmony',
      'Shared Household Context & Event Matching',
      'Zero-Key Client Features are 100% Free',
      'Pro Cloud Sync Coming Soon',
    ],
    buttonText: 'Try Couple Twinning Free',
    buttonHref: '/today',
    highlighted: true,
    comingSoonNotice: 'Pro Cloud Sync Coming Soon',
  },
  {
    name: 'Family',
    price: '$0',
    period: 'Free in Beta',
    badge: 'Free in Beta / Early Access',
    description: 'Organize outfits and laundry cycles across your entire household.',
    features: [
      'Up to 6 Local Profiles',
      'Multi-Member Closet Organization & Laundry Reset',
      'Multi-Taxonomy Wardrobes (Western, Indian, Islamic)',
      'All Client Features 100% Free & Local',
      'Pro Cloud Sync Coming Soon',
    ],
    buttonText: 'Start Family Beta Free',
    buttonHref: '/closet',
    highlighted: false,
    comingSoonNotice: 'Pro Cloud Sync Coming Soon',
  },
];

export const LandingPricing: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "center center"]
  });

  // Fan out animation based on scroll progress (responsive X offsets to avoid overflow)
  const opacity = useTransform(scrollYProgress, [0, 0.5, 1], [0, 0.5, 1]);
  const yOffset = useTransform(scrollYProgress, [0, 1], [100, 0]);
  const leftCardX = useTransform(scrollYProgress, [0.3, 1], [-20, 0]);
  const middleCardX = useTransform(scrollYProgress, [0, 1], [0, 0]);
  const rightCardX = useTransform(scrollYProgress, [0.3, 1], [20, 0]);
  
  const innerListOpacity = useTransform(scrollYProgress, [0.5, 0.9], [0, 1]);
  const innerListY = useTransform(scrollYProgress, [0.5, 0.9], [20, 0]);
  const buttonScale = useTransform(scrollYProgress, [0.7, 1], [0.9, 1]);

  return (
    <section ref={sectionRef} className="py-20 relative overflow-hidden" id="pricing">
      <MotionContainer staggerChildren={0.1} className="max-w-6xl mx-auto px-6 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/10 border border-secondary/30 text-secondary text-xs font-mono uppercase tracking-wider mb-4">
            <span className="material-symbols-outlined text-sm">verified_user</span>
            Zero-Key Local-First Architecture
          </div>
          <MotionText as="h2" className="font-display text-4xl md:text-5xl text-primary font-bold mb-4">
            Transparent, Beta-Honest Pricing
          </MotionText>
          <MotionText as="p" className="text-on-surface-variant text-lg">
            Zero-key client features are 100% free and local. All ML segmentation and cultural outfit generation run hermetically on your device.
          </MotionText>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {pricingTiers.map((tier, idx) => {
            const cardX = idx === 0 ? leftCardX : idx === 1 ? middleCardX : rightCardX;

            return (
              <motion.div
                key={tier.name}
                data-testid={`pricing-tier-${tier.name.toLowerCase()}`}
                style={shouldReduceMotion ? {} : { opacity, y: yOffset, x: cardX }}
                className={`relative rounded-3xl p-8 flex flex-col h-full border ${
                  tier.highlighted 
                    ? 'bg-primary text-on-primary border-primary shadow-2xl scale-105 z-10' 
                    : 'bg-surface border-outline-variant/30 shadow-lg'
                }`}
              >
              <div className="flex justify-between items-start gap-2 mb-3">
                <span className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-mono uppercase tracking-wider font-semibold ${
                  tier.highlighted ? 'bg-secondary text-on-secondary' : 'bg-surface-container-high text-primary border border-outline-variant/40'
                }`}>
                  {tier.badge}
                </span>
                {tier.highlighted && (
                  <span className="bg-amber-400 text-stone-900 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                    Beta Choice
                  </span>
                )}
              </div>
              
              <div className="mb-4">
                <h3 className={`font-display text-2xl font-bold mb-1 ${tier.highlighted ? 'text-white' : 'text-primary'}`}>
                  {tier.name}
                </h3>
                <p className={`text-sm ${tier.highlighted ? 'text-primary-container' : 'text-on-surface-variant'}`}>
                  {tier.description}
                </p>
              </div>

              <div className="mb-4 flex items-baseline">
                <span className={`font-display text-5xl font-bold ${tier.highlighted ? 'text-white' : 'text-primary'}`}>
                  {tier.price}
                </span>
                {tier.period && (
                  <span className={`ml-2 text-xs uppercase tracking-wider font-mono ${tier.highlighted ? 'text-primary-container' : 'text-on-surface-variant'}`}>
                    • {tier.period}
                  </span>
                )}
              </div>

              {tier.comingSoonNotice && (
                <div className="mb-6 p-2 rounded-lg bg-surface-container/60 border border-secondary/30 text-xs flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-base">cloud_sync</span>
                  <span className={`font-mono font-medium ${tier.highlighted ? 'text-on-primary' : 'text-primary'}`}>
                    {tier.comingSoonNotice}
                  </span>
                </div>
              )}

              <motion.ul style={shouldReduceMotion ? {} : { opacity: innerListOpacity, y: innerListY }} className="flex-grow space-y-3 mb-8">
                {tier.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className={`material-symbols-outlined text-[18px] mt-0.5 ${tier.highlighted ? 'text-secondary' : 'text-primary'}`}>
                      check_circle
                    </span>
                    <span className={`text-sm leading-snug ${tier.highlighted ? 'text-white' : 'text-on-surface'}`}>
                      {feature}
                    </span>
                  </li>
                ))}
              </motion.ul>

              <motion.div style={shouldReduceMotion ? {} : { scale: buttonScale }}>
                <Link 
                  href={tier.buttonHref}
                  className={`block w-full py-3.5 rounded-xl font-bold text-center transition-transform hover:scale-105 ${
                    tier.highlighted
                      ? 'bg-secondary text-on-secondary shadow-md'
                      : 'bg-surface-container text-primary border border-outline-variant/30 hover:bg-primary hover:text-on-primary'
                  }`}
                >
                  {tier.buttonText}
                </Link>
              </motion.div>
            </motion.div>
          )})}
        </div>

        {/* Pricing Transparency & Entitlement Disclosure */}
        <div className="max-w-3xl mx-auto p-6 rounded-2xl bg-surface-container-lowest torn-swatch border border-outline-variant/30 shadow-sm text-center">
          <div className="flex items-center justify-center gap-2 mb-2 text-primary font-display font-semibold text-lg">
            <span className="material-symbols-outlined text-secondary text-xl">handshake</span>
            Our Phase 7 Honest Pricing Pledge
          </div>
          <p className="text-body-sm text-on-surface-variant leading-relaxed">
            We will not advertise tiers that charge for client-side execution. Zero-key client features are <strong>100% free and local</strong>: outfit matching, wardrobe ingestion, cultural rules, and context heuristics run in your browser without requiring credit cards, accounts, or server API tokens. When Pro Cloud Sync launches for encrypted multi-device backups, all local features remain free forever.
          </p>
        </div>
      </MotionContainer>
    </section>
  );
};
