import { Metadata } from 'next';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Terms of Service | ourCloset',
  description: 'Terms of Service for ourCloset wardrobe coordination app.',
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen flex flex-col bg-raw-silk text-charcoal-thread overflow-x-hidden">
      <Header />
      <main className="flex-grow pt-32 pb-16 px-6 md:px-12 max-w-4xl mx-auto">
        <h1 className="font-display font-bold text-4xl text-primary mb-4">Terms of Service</h1>
        <p className="text-xs text-on-surface-variant mb-12 font-mono">Last Updated: July 2026</p>

        <div className="space-y-8 text-on-surface-variant leading-relaxed text-sm md:text-base font-body">
          
          <section>
            <h2 className="font-display font-bold text-xl text-primary mb-3">1. Agreement to Terms</h2>
            <p>
              By accessing and using this application hosted at **ourcloset.adnan-mangaonkar.com**, you agree to be bound by these Terms of Service. 
              If you do not agree to these terms, please do not use the app.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-xl text-primary mb-3">2. Description of Service</h2>
            <p>
              ourCloset provides automated local outfit suggestions, coordination pairing, capsule travel planning, and laundry status logs. 
              The application leverages client-side WebAssembly modeling for zero-key local AI execution. All local database structures reside within your browser storage.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-xl text-primary mb-3">3. User Responsibility & Data Ownership</h2>
            <p>
              You own all clothing images, category tags, and wardrobe data you store in ourCloset. 
              Since ourCloset utilizes local-first browser databases (IndexedDB), you are responsible for maintaining your device security and browser cache. 
              Clearing browser cache or application data may delete local wardrobe items unless synced to an account.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-xl text-primary mb-3">4. Intellectual Property</h2>
            <p>
              All software codebase, algorithms, design systems, scrollytelling animations, and custom typography assets displayed or built on this website are the intellectual property of Adnan Shafiq Mangaonkar.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-xl text-primary mb-3">5. Disclaimer of Warranties</h2>
            <p>
              This application is provided &quot;as is&quot; and &quot;as available&quot;. While we strive to support cross-cultural wardrobe algorithms, we make no representations or warranties of any kind regarding accuracy or coordination results.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-xl text-primary mb-3">6. Contact Information</h2>
            <p>
              For inquiries regarding licensing, custom enterprise deployments, or portfolio integrations, contact Adnan Shafiq Mangaonkar at: <a href="mailto:adnans0307@gmail.com" className="text-primary hover:underline font-mono">adnans0307@gmail.com</a>.
            </p>
          </section>

        </div>
      </main>
      <Footer />
    </div>
  );
}
