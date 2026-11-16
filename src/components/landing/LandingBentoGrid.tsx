'use client';

import React, { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { Card, SpecLabel, TwinSwatch } from '@/components';

/**
 * Bento Box / Grid Layout — Packs mixed, rounded rectangular cards together
 * per user layout pattern specification.
 */
export const LandingBentoGrid: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  
  // Adjusted offset so animations trigger more smoothly when centered
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start 85%", "end start"]
  });

  // Scale up and fade in as it enters, then hold (responsive offsets)
  const opacity = useTransform(scrollYProgress, [0, 0.4, 0.8, 1], [0, 1, 1, 0]);
  const yOffsetFast = useTransform(scrollYProgress, [0, 0.5], [40, 0]);
  const yOffsetSlow = useTransform(scrollYProgress, [0, 0.6], [60, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [0.92, 1]);
  
  // Deep transforms for inner bento card content (responsive X offsets)
  const splitLeftX = useTransform(scrollYProgress, [0.1, 0.5], [-20, 0]);
  const splitRightX = useTransform(scrollYProgress, [0.1, 0.5], [20, 0]);
  const logItem1X = useTransform(scrollYProgress, [0.3, 0.6], [25, 0]);
  const logItem2X = useTransform(scrollYProgress, [0.4, 0.7], [25, 0]);
  const iconScale = useTransform(scrollYProgress, [0.3, 0.6], [0.8, 1]);

  return (
    <section ref={sectionRef} className="py-16 bg-surface-container-low/50 border-y border-dashed border-outline-variant/40 overflow-hidden">
      <div className="max-w-container mx-auto px-margin-mobile md:px-margin-desktop space-y-12">
        {/* Section Header */}
        <motion.div
          style={shouldReduceMotion ? {} : { opacity, y: yOffsetFast }}
          className="text-center max-w-2xl mx-auto"
        >
          <SpecLabel className="text-secondary block mb-2">Architectural Principles</SpecLabel>
          <h2 className="font-display text-3xl sm:text-4xl text-primary">
            Designed for real cupboards, multicultural events, and shared households.
          </h2>
          <div className="stitching-border w-16 mx-auto mt-4" />
        </motion.div>

        {/* Bento Grid Container */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Tile 1 (Span 2): Split-Pane Outfit Matcher */}
          <motion.div style={shouldReduceMotion ? {} : { opacity, y: yOffsetFast, scale }} className="md:col-span-2">
            <Card className="p-6 h-full flex flex-col justify-between torn-swatch bg-surface-container-lowest border-secondary/30">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <SpecLabel className="text-secondary">Pattern 01 • Split-Pane Matcher</SpecLabel>
                  <TwinSwatch colorA="#1E293B" colorB="#B8935A" />
                </div>
                <h3 className="font-display text-2xl text-primary mb-2">
                  Side-by-side couple outfit coordination
                </h3>
                <p className="text-body-sm text-on-surface-variant font-body mb-6 max-w-lg">
                  Divides the canvas vertically down the middle to verify color harmony and formality indices between partners before stepping out.
                </p>
              </div>

              {/* Visual Split-Pane Mock */}
              <div className="grid grid-cols-2 gap-4 bg-surface-container p-4 rounded border border-outline-variant/30 overflow-hidden">
                <motion.div
                  style={shouldReduceMotion ? {} : { x: splitLeftX }}
                  className="p-3 bg-surface rounded border border-outline-variant/20"
                >
                  <div className="spec-label text-[10px] text-primary/60 mb-1">Husband Wardrobe</div>
                  <div className="font-display text-xs font-bold text-primary">Tailored Navy Suit</div>
                  <div className="text-[10px] text-on-surface-variant font-mono mt-0.5">Formality 5/5</div>
                </motion.div>
                <motion.div
                  style={shouldReduceMotion ? {} : { x: splitRightX }}
                  className="p-3 bg-surface rounded border border-secondary/40"
                >
                  <div className="spec-label text-[10px] text-secondary mb-1">Wife Wardrobe</div>
                  <div className="font-display text-xs font-bold text-primary">Dusk Mauve Abaya</div>
                  <div className="text-[10px] text-on-surface-variant font-mono mt-0.5">Formality 4/5</div>
                </motion.div>
              </div>
            </Card>
          </motion.div>

          {/* Tile 2 (Span 1): Zero-Key Local AI Engine */}
          <motion.div style={shouldReduceMotion ? {} : { opacity, y: yOffsetSlow, scale }}>
            <Card className="p-6 h-full flex flex-col justify-between bg-primary-container text-on-primary border-none">
              <div>
                <motion.div
                  style={shouldReduceMotion ? {} : { scale: iconScale }}
                  className="w-10 h-10 rounded bg-primary flex items-center justify-center text-on-primary mb-4 origin-left"
                >
                  <span className="material-symbols-outlined">memory</span>
                </motion.div>
                <SpecLabel className="text-on-primary-container block mb-1">Zero Paid API Keys</SpecLabel>
                <h3 className="font-display text-xl text-on-primary mb-2">
                  Client-side WASM AI Engine
                </h3>
                <p className="text-xs text-on-primary-container font-body leading-relaxed">
                  Background removal via `@imgly/background-removal` and semantic embeddings run 100% inside your browser. No external API keys or subscription fees required.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-primary-fixed-variant/40 spec-label text-[10px] text-on-primary-container font-mono">
                LOCAL INFERENCE: ACTIVE
              </div>
            </Card>
          </motion.div>

          {/* Tile 3 (Span 1): Family Hierarchy Roster */}
          <motion.div style={shouldReduceMotion ? {} : { opacity, y: yOffsetFast, scale }}>
            <Card className="p-6 h-full flex flex-col justify-between">
              <div>
                <motion.div
                  style={shouldReduceMotion ? {} : { scale: iconScale }}
                  className="w-10 h-10 rounded bg-surface-container flex items-center justify-center text-primary mb-4 origin-left"
                >
                  <span className="material-symbols-outlined">family_restroom</span>
                </motion.div>
                <SpecLabel className="text-primary/60 block mb-1">Multi-Member Roster</SpecLabel>
                <h3 className="font-display text-xl text-primary mb-2">
                  Family Hierarchy Management
                </h3>
                <p className="text-xs text-on-surface-variant font-body leading-relaxed mb-4">
                  Configure hierarchy roles (Head of Household, Spouse, Children, In-Laws) with custom titles for multi-generational festive events.
                </p>
              </div>
              <div className="p-3 bg-surface-container rounded border border-outline-variant/30 text-xs font-mono text-primary flex items-center justify-between">
                <span>Roster Capacity:</span>
                <span className="font-bold">UNLIMITED</span>
              </div>
            </Card>
          </motion.div>

          {/* Tile 4 (Span 2): Stacked Story & IndexedDB Memory */}
          <motion.div style={shouldReduceMotion ? {} : { opacity, y: yOffsetSlow, scale }} className="md:col-span-2">
            <Card className="p-6 h-full flex flex-col justify-between torn-swatch bg-surface-container-lowest">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <SpecLabel className="text-primary/60">Pattern 02 • Prompt Learning Engine</SpecLabel>
                  <span className="spec-label text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded text-[10px]">
                    INDEXEDDB MEMORY
                  </span>
                </div>
                <h3 className="font-display text-2xl text-primary mb-2">
                  Local prompt memory that learns your style
                </h3>
                <p className="text-body-sm text-on-surface-variant font-body mb-6 max-w-xl">
                  Every search prompt, mood description, and locked outfit choice is stored in local IndexedDB. The zero-key NLP parser calculates cosine similarity to continuously improve suggestions over time.
                </p>
              </div>

              {/* Stacked Learning Log Mock */}
              <div className="space-y-2 font-mono text-xs overflow-hidden">
                <motion.div
                  style={shouldReduceMotion ? {} : { x: logItem1X }}
                  className="p-2.5 bg-surface-container rounded border border-outline-variant/20 flex justify-between items-center text-primary"
                >
                  <span>Prompt: &quot;sunset beach cocktail, pastel modest&quot;</span>
                  <span className="text-emerald-700 font-bold">92% Match</span>
                </motion.div>
                <motion.div
                  style={shouldReduceMotion ? {} : { x: logItem2X }}
                  className="p-2.5 bg-surface-container rounded border border-outline-variant/20 flex justify-between items-center text-primary"
                >
                  <span>Prompt: &quot;Sarah &amp; Tariq Sangeet Night&quot;</span>
                  <span className="text-emerald-700 font-bold">98% Match</span>
                </motion.div>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
