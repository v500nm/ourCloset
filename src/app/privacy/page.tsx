import { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Privacy Policy | ourCloset',
  description: 'Privacy Policy for ourCloset wardrobe coordination app.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-raw-silk text-charcoal-thread overflow-x-hidden">
      <Header />
      <main className="flex-grow pt-32 pb-16 px-6 md:px-12 max-w-4xl mx-auto">
        <h1 className="font-display font-bold text-4xl text-primary mb-4">Privacy Policy</h1>
        <p className="text-xs text-on-surface-variant mb-12 font-mono">Last Updated: July 2026</p>

        <div className="space-y-8 text-on-surface-variant leading-relaxed text-sm md:text-base font-body">
          
          <section>
            <h2 className="font-display font-bold text-xl text-primary mb-3">1. Local-First Data Privacy</h2>
            <p>
              At ourCloset (ourcloset.adnan-mangaonkar.com), we prioritize the privacy of your personal closet and wardrobe details. 
              By design, your digitized clothing items, category tags, color data, and family settings are stored locally in your web browser using IndexedDB. 
              We do not upload your wardrobe photographs or personal descriptions to external servers for AI processing.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-xl text-primary mb-3">2. Zero-Key AI Processing</h2>
            <p>
              Our background removal tools and outfit coordination recommendations run 100% client-side via WebAssembly (WASM). 
              No third-party AI APIs (such as OpenAI, Anthropic, or Google Cloud Vision) are invoked to process your clothing, keeping your visual wardrobe entirely private to your device.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-xl text-primary mb-3">3. Shared Household Sync</h2>
            <p>
              If you actively opt to pair your closet with a partner or household member, only those items you mark explicitly as **Public** are queried during cross-member twinning matching. 
              Items marked as **Private** remain strictly invisible to your partner.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-xl text-primary mb-3">4. Security</h2>
            <p>
              Your local browser storage is secure. We use Row-Level Security (RLS) policies for cloud-synced accounts to ensure that no unauthorized users can fetch or query your closet data.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-xl text-primary mb-3">5. Contact</h2>
            <p>
              If you have questions regarding data deletion, export (JSON), or local encryption, please reach out to Adnan Shafiq Mangaonkar at: <a href="mailto:adnans0307@gmail.com" className="text-primary hover:underline font-mono">adnans0307@gmail.com</a>.
            </p>
          </section>

        </div>
      </main>
      <Footer />
    </div>
  );
}
