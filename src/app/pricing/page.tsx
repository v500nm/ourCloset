'use client';

import React from 'react';
import { Header } from '@/components/layout/header';
import { TabBar } from '@/components/layout/tabBar';
import { LandingPricing } from '@/components/landing/LandingPricing';

export default function PricingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-raw-silk text-charcoal-thread">
      <Header />
      <main className="flex-grow pt-32 pb-24 px-4 w-full">
        <LandingPricing />
      </main>
      <TabBar />
    </div>
  );
}
