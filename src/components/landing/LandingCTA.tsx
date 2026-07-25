'use client';

import React from 'react';
import Link from 'next/link';
import { Button, Card, SpecLabel } from '@/components';

export const LandingCTA: React.FC = () => {
  return (
    <section className="py-16 bg-primary-container text-on-primary">
      <div className="max-w-container mx-auto px-margin-mobile md:px-margin-desktop">
        <Card className="p-8 md:p-12 bg-primary border border-secondary/40 text-center max-w-4xl mx-auto space-y-6 hard-shadow">
          <SpecLabel className="text-on-primary-container block">ZERO-KEY ATELIER EXPERIENCE</SpecLabel>
          
          <h2 className="font-display text-3xl sm:text-5xl text-on-primary max-w-2xl mx-auto leading-tight">
            Ready to elevate your shared household wardrobe?
          </h2>

          <p className="text-body-md text-on-primary-container max-w-xl mx-auto font-body">
            Join couples and multicultural households managing daily wardrobe pairing, event coordination, and laundry availability — zero paid API keys needed.
          </p>

          <div className="pt-4 flex justify-center gap-4 flex-wrap">
            <Link href="/setup">
              <Button className="hard-shadow bg-secondary text-on-secondary hover:bg-surface-bright">
                Initialize Household Setup
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </Button>
            </Link>
            <Link href="/today">
              <Button variant="outline" className="border-on-primary-container text-on-primary hover:bg-primary-container">
                Launch Today Engine
              </Button>
            </Link>
          </div>

          <div className="pt-8 border-t border-primary-fixed-variant/20 flex flex-wrap justify-between items-center text-xs font-mono text-on-primary-container gap-4">
            <div>ourCloset • Zero-Key AI Wardrobe Coordination</div>
            <div className="flex gap-4">
              <Link href="/today" className="hover:underline">Today</Link>
              <Link href="/closet" className="hover:underline">Closet</Link>
              <Link href="/laundry" className="hover:underline">Laundry</Link>
              <Link href="/history" className="hover:underline">History</Link>
              <Link href="/trip" className="hover:underline">Trip</Link>
              <Link href="/setup" className="hover:underline">Setup</Link>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
};
