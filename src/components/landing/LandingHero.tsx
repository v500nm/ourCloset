'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { Button, Card, TwinSwatch } from '@/components';
import { MotionText, MotionContainer } from '@/components/ui/motionText';

/**
 * Hero Section — Z-Pattern Layout per user specification.
 * Path: Top Left Brand → Top Right Match Badge → Diagonal down through garment swatches → Bottom Right RSVP CTA.
 */
export const LandingHero: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"]
  });

  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const yLeft = useTransform(scrollYProgress, [0, 1], [0, -40]);
  const yRight = useTransform(scrollYProgress, [0, 1], [0, 40]);
  
  // Deep component transforms (responsive values)
  const cardScale = useTransform(scrollYProgress, [0, 1], [1, 0.96]);
  const cardRotate = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const husbandSwatchX = useTransform(scrollYProgress, [0, 1], [0, -15]);
  const wifeSwatchX = useTransform(scrollYProgress, [0, 1], [0, 15]);
  const matchScoreScale = useTransform(scrollYProgress, [0, 0.3], [1, 1.05]);

  return (
    <section ref={sectionRef} className="relative py-12 md:py-20 overflow-hidden">
      {/* Background ambient stitching accent */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-secondary/5 rounded-full blur-3xl -z-10 pointer-events-none" />

      <div className="max-w-container mx-auto px-margin-mobile md:px-margin-desktop grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Column (Span 7): Z-Start Headline & Value Prop */}
        <motion.div style={shouldReduceMotion ? {} : { opacity, y: yLeft }} className="lg:col-span-7">
          <MotionContainer staggerChildren={0.15} className="space-y-6">
          <MotionText delay={0.1} as="div" className="inline-flex items-center gap-2 px-3 py-1 rounded bg-secondary-container/60 border border-secondary/30 text-on-secondary-container spec-label text-xs">
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
            ZERO-KEY WASM AI • MULTICULTURAL WARDROBE ENGINE
          </MotionText>

          <MotionText delay={0.2} as="h1" className="font-display text-4xl sm:text-5xl lg:text-6xl text-primary leading-[1.1] tracking-tight">
            Coordinate your shared wardrobe with atelier precision.
          </MotionText>

          <MotionText delay={0.3} as="p" className="text-body-md text-on-surface-variant max-w-[55ch] font-body">
            Digitize your local cupboard items across Western, Indian Traditional, and Islamic-Modest dress codes. Generate dual-closet twinning suggestions, lock daily OOTD RSVPs, and track laundry availability — 100% in-browser with zero paid AI keys.
          </MotionText>

          <MotionText delay={0.4} as="div" className="flex flex-wrap gap-4 pt-2">
            <Link href="/setup">
              <Button className="hard-shadow">
                Start Shared Closet
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </Button>
            </Link>
            <Link href="/demo">
              <Button variant="outline">
                Explore Interactive Demo
                <span className="material-symbols-outlined text-[18px]">play_circle</span>
              </Button>
            </Link>
          </MotionText>

          {/* Trust points */}
          <MotionText delay={0.5} as="div" className="pt-4 grid grid-cols-3 gap-4 border-t border-dashed border-outline-variant/40 text-xs font-mono text-primary/70">
            <div>
              <span className="font-bold block text-primary font-display text-base">0 Keys</span>
              <span>Client-side WASM</span>
            </div>
            <div>
              <span className="font-bold block text-primary font-display text-base">3 Taxonomies</span>
              <span>Western / Traditional / Modest</span>
            </div>
            <div>
              <span className="font-bold block text-primary font-display text-base">100% Private</span>
              <span>IndexedDB Local Storage</span>
            </div>
          </MotionText>
          </MotionContainer>
        </motion.div>

        {/* Right Column (Span 5): Z-Pattern Visual Match Widget Card */}
        <motion.div
          style={shouldReduceMotion ? {} : { opacity, y: yRight, scale: cardScale, rotate: cardRotate }}
          initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-5"
        >
          <Card className="p-6 relative bg-surface-container-lowest torn-swatch hard-shadow border border-secondary/40 overflow-hidden">
            {/* Top Right: Z-Path Point 2 Match Score Widget */}
            <motion.div
              style={shouldReduceMotion ? {} : { scale: matchScoreScale }}
              className="flex justify-between items-center mb-6 pb-4 border-b border-dashed border-outline-variant origin-left"
            >
              <div>
                <span className="spec-label text-primary/60 text-[10px] block">LIVE TWINNING ENGINE</span>
                <h3 className="font-display text-headline-md text-primary">98% Match Score</h3>
              </div>
              <div className="px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 font-mono text-xs font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">auto_awesome</span>
                BALANCED CO-OP
              </div>
            </motion.div>

            {/* Z-Path Point 3: Diagonal Garment Swatches (Husband & Wife pairing) */}
            <div className="space-y-4 mb-6">
              {/* Husband Item */}
              <motion.div
                style={shouldReduceMotion ? {} : { x: husbandSwatchX }}
                className="p-3 bg-surface-container rounded border border-outline-variant/30 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-14 bg-surface-container-high rounded overflow-hidden">
                    <img
                      src="https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=200&auto=format&fit=crop&q=80"
                      alt="Navy Wool Suit"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="spec-label text-primary/60 text-[9px]">SU-NVY-01</div>
                    <h4 className="font-display text-xs text-primary font-bold">Navy Wool Suit</h4>
                    <p className="text-[10px] text-on-surface-variant font-mono">Formality 5 • Western</p>
                  </div>
                </div>
                <TwinSwatch colorA="#1E293B" colorB="#B8935A" />
              </motion.div>

              {/* Connecting Seam Line */}
              <div className="relative h-4 flex items-center justify-center">
                <div className="w-full border-b border-dashed border-secondary/40" />
                <span className="absolute bg-surface px-2 text-[10px] font-mono text-secondary">
                  HYBRID COLOR & SILHOUETTE MATCH
                </span>
              </div>

              {/* Wife Item */}
              <motion.div
                style={shouldReduceMotion ? {} : { x: wifeSwatchX }}
                className="p-3 bg-surface-container rounded border border-secondary/30 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-14 bg-surface-container-high rounded overflow-hidden">
                    <img
                      src="https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=200&auto=format&fit=crop&q=80"
                      alt="Embroidered Abaya"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="spec-label text-primary/60 text-[9px]">TC-ABY-03</div>
                    <h4 className="font-display text-xs text-primary font-bold">Embroidered Abaya</h4>
                    <p className="text-[10px] text-on-surface-variant font-mono">Formality 4 • Islamic-Modest</p>
                  </div>
                </div>
                <span className="spec-label text-[10px] bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded">
                  MATCHED
                </span>
              </motion.div>
            </div>

            {/* Z-Path Point 4: Bottom Right RSVP Action */}
            <div className="pt-2">
              <Link href="/today">
                <Button className="w-full justify-center">
                  <span className="material-symbols-outlined text-[18px]">favorite</span>
                  Lock Outfit & Send OOTD RSVP
                </Button>
              </Link>
            </div>
          </Card>
        </motion.div>
      </div>
    </section>
  );
};
