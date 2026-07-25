'use client';

import React, { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { MotionContainer, MotionText } from '../ui/motionText';
import Link from 'next/link';

const pricingTiers = [
  {
    name: 'Solo',
    price: '$0',
    description: 'Perfect for managing your personal wardrobe.',
    features: ['1 User Profile', 'Solo Outfit Matching', 'Basic Weather Context', 'Standard AI Speed'],
    buttonText: 'Start for free',
    highlighted: false,
  },
  {
    name: 'Couple',
    price: '$15',
    period: '/mo',
    description: 'Coordinate effortlessly with your partner.',
    features: ['2 User Profiles', 'Couple Twinning Logic', 'Shared Household Context', 'Priority AI Processing'],
    buttonText: 'Try Couple Plan',
    highlighted: true,
  },
  {
    name: 'Family',
    price: '$29',
    period: '/mo',
    description: 'Manage the whole family\'s outfits.',
    features: ['Up to 6 Profiles', 'Custom Family Matching', 'Kids & Seasonal Tracking', 'Ultra-Fast Generation'],
    buttonText: 'Try Family Plan',
    highlighted: false,
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
  const rightCardX = useTransform(scrollYProgress, [0.3, 1], [20, 0]);
  
  const innerListOpacity = useTransform(scrollYProgress, [0.5, 0.9], [0, 1]);
  const innerListY = useTransform(scrollYProgress, [0.5, 0.9], [20, 0]);
  const buttonScale = useTransform(scrollYProgress, [0.7, 1], [0.9, 1]);

  return (
    <section ref={sectionRef} className="py-20 relative overflow-hidden" id="pricing">
      <MotionContainer staggerChildren={0.1} className="max-w-6xl mx-auto px-6 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <MotionText as="h2" className="font-display text-4xl md:text-5xl text-primary font-bold mb-4">
            Simple, Transparent Pricing
          </MotionText>
          <MotionText as="p" className="text-on-surface-variant text-lg">
            Choose the plan that fits your household. No hidden fees. Zero cloud lock-in.
          </MotionText>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {pricingTiers.map((tier, idx) => {
            let cardX = leftCardX;
            if (idx === 1) cardX = useTransform(scrollYProgress, [0, 1], [0, 0]); // Middle card doesn't move X
            if (idx === 2) cardX = rightCardX;

            return (
              <motion.div
                key={tier.name}
                style={shouldReduceMotion ? {} : { opacity, y: yOffset, x: cardX }}
                className={`relative rounded-3xl p-8 flex flex-col h-full border ${
                  tier.highlighted 
                    ? 'bg-primary text-on-primary border-primary shadow-2xl scale-105 z-10' 
                    : 'bg-surface border-outline-variant/30 shadow-lg'
                }`}
              >
              {tier.highlighted && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-secondary text-on-secondary px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                  Most Popular
                </div>
              )}
              
              <div className="mb-6">
                <h3 className={`font-display text-2xl font-bold mb-2 ${tier.highlighted ? 'text-white' : 'text-primary'}`}>
                  {tier.name}
                </h3>
                <p className={`text-sm ${tier.highlighted ? 'text-primary-container' : 'text-on-surface-variant'}`}>
                  {tier.description}
                </p>
              </div>

              <div className="mb-8 flex items-baseline">
                <span className={`font-display text-5xl font-bold ${tier.highlighted ? 'text-white' : 'text-primary'}`}>
                  {tier.price}
                </span>
                {tier.period && (
                  <span className={`ml-2 text-sm ${tier.highlighted ? 'text-primary-container' : 'text-on-surface-variant'}`}>
                    {tier.period}
                  </span>
                )}
              </div>

              <motion.ul style={shouldReduceMotion ? {} : { opacity: innerListOpacity, y: innerListY }} className="flex-grow space-y-4 mb-8">
                {tier.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className={`material-symbols-outlined text-[20px] ${tier.highlighted ? 'text-secondary' : 'text-primary'}`}>
                      check_circle
                    </span>
                    <span className={`text-sm ${tier.highlighted ? 'text-white' : 'text-on-surface'}`}>
                      {feature}
                    </span>
                  </li>
                ))}
              </motion.ul>

              <motion.div style={shouldReduceMotion ? {} : { scale: buttonScale }}>
                <Link 
                  href="/login"
                  className={`block w-full py-4 rounded-xl font-bold text-center transition-transform hover:scale-105 ${
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
      </MotionContainer>
    </section>
  );
};
