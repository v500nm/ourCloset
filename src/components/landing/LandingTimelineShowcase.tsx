'use client';

import React, { useState, useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { Card, SpecLabel, TwinSwatch } from '@/components';

/**
 * Stacked Timeline & Asymmetric Focus Patterns per user structural layout specifications.
 */
export const LandingTimelineShowcase: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();
  const [activeDeckIndex, setActiveDeckIndex] = useState(0);
  
  const sectionRef = useRef<HTMLElement>(null);
  // Adjusted offset: start tracking when the top of the section enters the bottom 90% of screen, 
  // stop when bottom of section hits top of screen.
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start 90%", "end start"]
  });

  // Dominant image zooms aggressively from 1 to 1.3
  const zoom = useTransform(scrollYProgress, [0, 0.4, 0.8], [1, 1.15, 1.25]);
  
  // Flanking thumbnails slide in smoothly (responsive offsets)
  const partnerThumbX = useTransform(scrollYProgress, [0.1, 0.5], [30, 0]);
  const childThumbX = useTransform(scrollYProgress, [0.2, 0.6], [40, 0]);
  const thumbOpacity = useTransform(scrollYProgress, [0.1, 0.5], [0, 1]);
  
  // Carousel overlay slides in from bottom right
  const carouselX = useTransform(scrollYProgress, [0.3, 0.7], [30, 0]);
  const carouselY = useTransform(scrollYProgress, [0.3, 0.7], [30, 0]);
  const carouselRotate = useTransform(scrollYProgress, [0.3, 0.7], [5, 0]);

  const slideInRight1 = useTransform(scrollYProgress, [0.5, 0.7], [40, 0]);
  const slideInRight2 = useTransform(scrollYProgress, [0.55, 0.75], [40, 0]);
  const slideInRight3 = useTransform(scrollYProgress, [0.6, 0.8], [40, 0]);
  const opacityCards = useTransform(scrollYProgress, [0.5, 0.75], [0, 1]);

  const deckAlternatives = [
    { title: 'Oxford Button-Down Shirt', category: 'Shirt', cpw: '$0.85', image: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=400&auto=format&fit=crop&q=80' },
    { title: 'Oatmeal Linen Resort Shirt', category: 'Shirt', cpw: '$1.10', image: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=400&auto=format&fit=crop&q=80' },
    { title: 'Silk Satin Evening Shirt', category: 'Shirt', cpw: '$2.50', image: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400&auto=format&fit=crop&q=80' },
  ];

  return (
    <section ref={sectionRef} className="py-16 bg-raw-silk overflow-hidden">
      <div className="max-w-container mx-auto px-margin-mobile md:px-margin-desktop space-y-16">
        {/* Section 1: Asymmetric Focus & Carousel Overlay */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left (Span 6): Asymmetric Focus Pattern */}
          <div className="lg:col-span-6 space-y-6">
            <SpecLabel className="text-secondary">Pattern 03 • Asymmetric Focus Layout</SpecLabel>
            <h2 className="font-display text-3xl sm:text-4xl text-primary">
              Dominant primary frame flanked by matching layer thumbnails.
            </h2>
            <p className="text-body-sm text-on-surface-variant font-body">
              One large dominant frame features the primary user’s outfit, flanked by smaller connected thumbnail slots for the partner’s or children’s matching layers.
            </p>

            {/* Asymmetric Focus Component */}
            <div className="grid grid-cols-3 gap-4 pt-2">
              {/* Dominant Primary Frame (Span 2) */}
              <Card className="col-span-2 p-0 overflow-hidden torn-swatch border-secondary/40 relative">
                <div className="aspect-[3/4] bg-surface-container overflow-hidden relative">
                  <motion.img
                    style={shouldReduceMotion ? {} : { scale: zoom }}
                    src="https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600&auto=format&fit=crop&q=80"
                    alt="Dominant Garment"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 bg-primary/90 text-on-primary px-2 py-0.5 rounded text-[10px] font-mono uppercase">
                    Primary Garment
                  </div>
                </div>
                <div className="p-3 bg-surface-container-lowest">
                  <div className="font-display text-xs font-bold text-primary">Zari Silk Sherwani Set</div>
                  <div className="text-[10px] text-on-surface-variant font-mono">Formality 5 • Indian Traditional</div>
                </div>
              </Card>

              {/* Flanking Partner & Children Thumbnails (Span 1) */}
              <div className="col-span-1 space-y-3 overflow-hidden p-2 -m-2">
                <motion.div
                  style={shouldReduceMotion ? {} : { x: partnerThumbX, opacity: thumbOpacity }}
                  className="p-2 bg-surface-container rounded border border-secondary/30 relative"
                >
                  <div className="aspect-square bg-surface-container-high rounded overflow-hidden mb-1">
                    <img
                      src="https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=200&auto=format&fit=crop&q=80"
                      alt="Partner Match"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="text-[9px] font-bold text-primary truncate">Spouse Abaya</div>
                  <div className="text-[8px] text-secondary font-mono">MATCHED</div>
                </motion.div>

                <motion.div
                  style={shouldReduceMotion ? {} : { x: childThumbX, opacity: thumbOpacity }}
                  className="p-2 bg-surface-container rounded border border-outline-variant/30"
                >
                  <div className="aspect-square bg-surface-container-high rounded overflow-hidden mb-1">
                    <img
                      src="https://images.unsplash.com/photo-1609357605129-26f69add5d6e?w=200&auto=format&fit=crop&q=80"
                      alt="Child Match"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="text-[9px] font-bold text-primary truncate">Elder Son Kurta</div>
                  <div className="text-[8px] text-on-surface-variant font-mono">MATCHED</div>
                </motion.div>
              </div>
            </div>
          </div>

          {/* Right (Span 6): Carousel / Card Deck Overlay */}
          <div className="lg:col-span-6 space-y-6">
            <SpecLabel className="text-secondary">Pattern 04 • Card Deck Overlay</SpecLabel>
            <h2 className="font-display text-3xl sm:text-4xl text-primary">
              Swipe through alternative combinations in real time.
            </h2>
            <p className="text-body-sm text-on-surface-variant font-body">
              Stacks individual clothing item cards that users can swipe through or expand to see how alternative tops match a partner’s pre-selected bottom.
            </p>

            {/* Interactive Card Deck Component */}
            <motion.div style={shouldReduceMotion ? {} : { x: carouselX, y: carouselY, rotate: carouselRotate }}>
            <Card className="p-6 bg-surface-container-lowest border-outline-variant/30 relative shadow-2xl">
              <div className="flex justify-between items-center mb-4">
                <span className="spec-label text-primary/60 text-[10px]">SWIPE DECK ALTERNATIVES</span>
                <span className="spec-label text-secondary font-mono text-xs">
                  {activeDeckIndex + 1} of {deckAlternatives.length}
                </span>
              </div>

              <motion.div
                key={activeDeckIndex}
                initial={shouldReduceMotion ? false : { opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="p-4 bg-surface-container rounded border border-secondary/40 flex items-center gap-4 mb-4"
              >
                <div className="w-20 h-24 bg-surface-container-high rounded overflow-hidden flex-shrink-0">
                  <img
                    src={deckAlternatives[activeDeckIndex].image}
                    alt={deckAlternatives[activeDeckIndex].title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-grow">
                  <div className="spec-label text-primary/60 text-[10px]">
                    CPW: {deckAlternatives[activeDeckIndex].cpw}
                  </div>
                  <h4 className="font-display text-body-md text-primary font-bold">
                    {deckAlternatives[activeDeckIndex].title}
                  </h4>
                  <p className="text-xs text-on-surface-variant font-mono mt-1">
                    Category: {deckAlternatives[activeDeckIndex].category}
                  </p>
                </div>
              </motion.div>

              <div className="flex gap-3">
                <button
                  onClick={() =>
                    setActiveDeckIndex((prev) => (prev > 0 ? prev - 1 : deckAlternatives.length - 1))
                  }
                  className="flex-1 py-2.5 rounded border border-outline-variant/40 bg-surface text-primary spec-label text-xs uppercase hover:bg-surface-container-highest transition-colors flex items-center justify-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">arrow_back</span>
                  Previous
                </button>
                <button
                  onClick={() =>
                    setActiveDeckIndex((prev) => (prev < deckAlternatives.length - 1 ? prev + 1 : 0))
                  }
                  className="flex-1 py-2.5 rounded bg-secondary text-on-secondary spec-label text-xs uppercase hover:bg-primary transition-colors flex items-center justify-center gap-1 hard-shadow"
                >
                  Next Alternative
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>
            </Card>
            </motion.div>
          </div>
        </div>

        <div className="stitching-border-full" />

        {/* Section 2: Stacked Timeline / Story Pattern */}
        <div className="space-y-8">
          <div className="text-center max-w-xl mx-auto">
            <SpecLabel className="text-secondary block mb-1">Pattern 05 • Stacked Timeline</SpecLabel>
            <h2 className="font-display text-3xl sm:text-4xl text-primary">
              Multi-day event & trip outfit story schedule.
            </h2>
            <p className="text-body-sm text-on-surface-variant font-body mt-2">
              Arranges horizontal rows chronologically, ideal for organizing family outfit schedules for multi-day trips or festive wedding seasons.
            </p>
          </div>

          <div className="space-y-4 max-w-4xl mx-auto">
            {[
              { day: 'DAY 01', event: 'Sarah & Tariq Sangeet Night', outfit: 'Zari Silk Sherwani + Dusk Mauve Abaya', formality: '5/5', status: 'LOCKED', anim: slideInRight1 },
              { day: 'DAY 02', event: 'Quarterly Executive Review', outfit: 'Tailored Navy Wool Suit + Oatmeal Linen Blazer', formality: '4/5', status: 'SYNCED', anim: slideInRight2 },
              { day: 'DAY 03', event: 'Casual Family Brunch', outfit: 'Oxford Button-Down + Selvedge Denim', formality: '2/5', status: 'READY', anim: slideInRight3 },
            ].map((item, idx) => (
              <motion.div key={idx} style={shouldReduceMotion ? {} : { x: item.anim, opacity: opacityCards }}>
                <Card className="p-5 flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-outline-variant/30">
                  <div className="flex items-center gap-4">
                    <div className="px-3 py-2 rounded bg-secondary-container text-on-secondary-container font-mono font-bold text-xs">
                      {item.day}
                    </div>
                    <div>
                      <h4 className="font-display text-body-md text-primary font-bold">{item.event}</h4>
                      <p className="text-xs text-on-surface-variant font-body mt-0.5">{item.outfit}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-mono">
                    <span className="text-primary/60">Formality {item.formality}</span>
                    <span className="spec-label bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded text-[10px]">
                      {item.status}
                    </span>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
