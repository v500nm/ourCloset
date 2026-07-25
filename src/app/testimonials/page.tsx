'use client';

import React from 'react';
import { Header } from '@/components/layout/header';
import { TabBar } from '@/components/layout/tabBar';

import { motion } from 'motion/react';
import { MotionContainer, MotionText } from '@/components/ui/motionText';

const TESTIMONIALS = [
  {
    name: 'The Smith Family',
    role: 'Couple Plan',
    content: "ourCloset completely changed how we pack for family trips! No more arguing over matching colors. We literally just select 'Trip' and let it generate our twinsies outfits for the week.",
    rating: 5
  },
  {
    name: 'Aisha & Tariq',
    role: 'Family Plan',
    content: "Finally, an app that understands Modest clothing! It's so hard to find an app that lets me categorize my Abayas properly while matching them with my husband's suits.",
    rating: 5
  },
  {
    name: 'Sarah J.',
    role: 'Solo Plan',
    content: "I've tried everything from Cladwell to Whering. ourCloset is faster because it doesn't need to ping a server for every single outfit. The WASM engine is incredibly snappy.",
    rating: 4
  },
  {
    name: 'Michael T.',
    role: 'Couple Plan',
    content: "The laundry tracking feature alone is worth it. It automatically marks our outfits as dirty when we 'lock' them for the day and resets on Sundays. Genius.",
    rating: 5
  }
];

export default function TestimonialsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-raw-silk text-charcoal-thread overflow-x-hidden">
      <Header />
      <main className="flex-grow pt-32 pb-24 w-full">
        <MotionContainer staggerChildren={0.1} className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <MotionText as="h1" className="font-display text-4xl md:text-5xl text-primary font-bold mb-4">
              Loved by Households
            </MotionText>
            <MotionText as="p" className="text-on-surface-variant text-lg">
              See how ourCloset is helping people coordinate outfits and save time every single morning.
            </MotionText>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {TESTIMONIALS.map((t, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="bg-surface-container rounded-2xl p-8 border border-outline-variant/30 shadow-md relative"
              >
                <div className="text-secondary mb-4 flex gap-1">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <span key={i} className="material-symbols-outlined text-lg fill-current">star</span>
                  ))}
                </div>
                <p className="font-body text-lg text-on-surface mb-6 leading-relaxed">
                  "{t.content}"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold font-display">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-primary text-sm">{t.name}</h4>
                    <span className="text-xs text-on-surface-variant font-mono">{t.role}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </MotionContainer>
      </main>
      <TabBar />
    </div>
  );
}
