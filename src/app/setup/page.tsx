'use client';

import { HouseholdSetup, AccountDataManagement } from '@/features/household';
import { MotionText, MotionContainer } from '@/components/ui/motionText';
import { Header } from '@/components/layout/header';

export default function SetupPage() {
  return (
    <div className="min-h-screen flex flex-col bg-raw-silk text-charcoal-thread">
      <Header />
      <main className="flex-grow w-full max-w-container mx-auto px-margin-mobile md:px-margin-desktop pt-28 md:pt-32 pb-24 md:pb-12">
        <MotionContainer staggerChildren={0.15}>
          {/* Header Section */}
          <div className="flex justify-between items-center mb-8 pb-4 border-b border-dashed border-outline-variant">
            <MotionText as="h1" className="font-display text-display-lg text-primary">ourCloset</MotionText>
            <MotionText as="span" className="spec-label text-primary/40">SETUP PHASE</MotionText>
          </div>

          <div className="mb-8">
            <MotionText as="h2" className="font-display text-display-lg-mobile md:text-display-lg text-primary">
              Household Setup
            </MotionText>
            <MotionText as="p" className="text-body-md text-on-surface-variant mt-2 font-body max-w-md">
              Configure your shared workshop to coordinate outfits, manage inventory, and seamlessly align your wardrobes.
            </MotionText>
          </div>

          <HouseholdSetup />
          <AccountDataManagement />
        </MotionContainer>
      </main>
    </div>
  );
}
