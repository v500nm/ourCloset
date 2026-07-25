import { Header } from '@/components/layout/header';
import { TabBar } from '@/components/layout/tabBar';
import { Footer } from '@/components/layout/Footer';
import { LandingHero } from '@/components/landing/LandingHero';
import { LandingBentoGrid } from '@/components/landing/LandingBentoGrid';
import { LandingTimelineShowcase } from '@/components/landing/LandingTimelineShowcase';
import { LandingPricing } from '@/components/landing/LandingPricing';
import { LandingCTA } from '@/components/landing/LandingCTA';

export default function SplashPage() {
  return (
    <div className="min-h-screen flex flex-col bg-raw-silk text-charcoal-thread">
      {/* Visible Responsive Top Header */}
      <Header />

      {/* Main Promotional Landing Showcase */}
      <main className="flex-grow pt-28 md:pt-32 pb-24 md:pb-0">
        <LandingHero />
        <LandingBentoGrid />
        <LandingTimelineShowcase />
        <LandingPricing />
        <LandingCTA />
      </main>

      {/* Footer */}
      <Footer />

      {/* Mobile Bottom Navigation Bar */}
      <TabBar />
    </div>
  );
}
