'use client';

import React from 'react';
import { Header } from '@/components/layout/header';
import { TabBar } from '@/components/layout/tabBar';

import { motion } from 'motion/react';
import { MotionContainer, MotionText } from '@/components/ui/motionText';
import { Button } from '@/components';
import Link from 'next/link';

export default function ProductPage() {
  return (
    <div className="min-h-screen flex flex-col bg-raw-silk text-charcoal-thread overflow-x-hidden">
      <Header />
      <main className="flex-grow pt-32 pb-24 w-full">
        <MotionContainer staggerChildren={0.15} className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <MotionText as="h1" className="font-display text-5xl md:text-6xl text-primary font-bold mb-6 tracking-tight">
              A Wardrobe Assistant <br />That Respects Your Privacy
            </MotionText>
            <MotionText as="p" className="text-on-surface-variant text-lg">
              ourCloset runs entirely in your browser using WebAssembly (WASM). No cloud servers processing your clothing, no expensive API subscriptions. 
            </MotionText>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-24">
            <motion.div 
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-surface-container rounded-3xl p-8 border border-outline-variant/30 shadow-lg"
            >
              <div className="flex items-center gap-4 mb-6">
                <span className="material-symbols-outlined text-4xl text-secondary">memory</span>
                <h3 className="font-display text-2xl font-bold text-primary">Zero-Key AI Inference</h3>
              </div>
              <p className="text-on-surface-variant mb-4">
                We've built a custom heuristic matching engine that works locally. That means no OpenAI keys, no monthly token limits, and instant outfit generation even when offline.
              </p>
              <ul className="space-y-2 mt-6 font-mono text-sm">
                <li className="flex items-center gap-2"><span className="material-symbols-outlined text-emerald-600 text-lg">check</span> Local Execution</li>
                <li className="flex items-center gap-2"><span className="material-symbols-outlined text-emerald-600 text-lg">check</span> Complete Privacy</li>
                <li className="flex items-center gap-2"><span className="material-symbols-outlined text-emerald-600 text-lg">check</span> Zero Latency</li>
              </ul>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-surface-container rounded-3xl p-8 border border-outline-variant/30 shadow-lg"
            >
              <div className="flex items-center gap-4 mb-6">
                <span className="material-symbols-outlined text-4xl text-secondary">globe_asia</span>
                <h3 className="font-display text-2xl font-bold text-primary">Multicultural Taxonomies</h3>
              </div>
              <p className="text-on-surface-variant mb-4">
                ourCloset understands that your wardrobe isn't just jeans and t-shirts. Our engine natively supports Indian Traditional, Islamic-Modest, and Western dress codes.
              </p>
              <div className="flex flex-wrap gap-2 mt-6">
                <span className="px-3 py-1 bg-surface-container-high rounded-full text-xs font-bold border border-outline-variant/50">Sarees & Kurtas</span>
                <span className="px-3 py-1 bg-surface-container-high rounded-full text-xs font-bold border border-outline-variant/50">Abayas & Thobes</span>
                <span className="px-3 py-1 bg-surface-container-high rounded-full text-xs font-bold border border-outline-variant/50">Suits & Casuals</span>
              </div>
            </motion.div>
          </div>

          <div className="text-center bg-primary text-on-primary rounded-3xl p-12 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
            <h2 className="font-display text-4xl font-bold mb-6">Ready to organize your closet?</h2>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link href="/login" className="w-full sm:w-auto">
                <Button className="bg-secondary text-on-secondary hover:bg-secondary/90 border-none w-full justify-center">
                  Get Started Free
                </Button>
              </Link>
              <Link href="/demo" className="w-full sm:w-auto">
                <Button variant="outline" className="text-white border-white/30 hover:bg-white/10 w-full justify-center">
                  Try Interactive Demo
                </Button>
              </Link>
            </div>
          </div>
        </MotionContainer>
      </main>
      <TabBar />
    </div>
  );
}
