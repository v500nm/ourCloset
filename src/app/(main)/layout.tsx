import { Header } from '@/components/layout/header';
import { TabBar } from '@/components/layout/tabBar';

/**
 * Main app shell layout — used for all authenticated tab screens.
 * Desktop: Header (ink-bottle) at top.
 * Mobile: TabBar at bottom + padding-bottom for safe area.
 * Matches appFlow.md §1 Top-Level Navigation Map.
 */
export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-raw-silk text-charcoal-thread">
      <Header />
      <main className="flex-grow w-full max-w-container mx-auto px-margin-mobile md:px-margin-desktop pt-28 md:pt-32 pb-24 md:pb-12">
        {children}
      </main>
      <TabBar />
    </div>
  );
}
