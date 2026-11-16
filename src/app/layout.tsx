import './globals.css';
import type { Metadata, Viewport } from 'next';
import { SmoothScrollProvider } from '@/components/providers/SmoothScrollProvider';
import { HouseholdProvider } from '@/providers/HouseholdProvider';
import { WardrobeProvider } from '@/providers/WardrobeProvider';
import { AuthProvider } from '@/providers/AuthProvider';
import { SyncBootstrap } from '@/components/providers/SyncBootstrap';
import { PWAInstallPrompt } from '@/components/ui/PWAInstallPrompt';
import { PortfolioEcosystem } from '@/components/ui/PortfolioEcosystem';

const siteUrl = 'https://ourcloset.adnan-mangaonkar.com';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    template: '%s | ourCloset',
    default: 'ourCloset — Zero-Key AI Wardrobe Coordination',
  },
  description:
    'Couple & Family wardrobe coordination engine across Western, Indian Traditional, and Islamic-Modest dress codes. Runs entirely client-side with 100% data privacy.',
  keywords: [
    'wardrobe coordinator',
    'couple clothing match app',
    'multi-cultural dress code planner',
    'local AI outfit matcher',
    'Indian traditional outfit planner',
    'Islamic modest wear matching',
    'software engineer Mumbai',
    'Adnan Mangaonkar Consulting',
  ],
  authors: [{ name: 'Adnan Shafiq Mangaonkar' }],
  creator: 'Adnan Shafiq Mangaonkar',
  publisher: 'Adnan Shafiq Mangaonkar Consulting',
  manifest: '/manifest.json',
  alternates: {
    canonical: '/',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'ourCloset',
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/favicon.svg',
    apple: [
      { url: '/icons/apple-touch-icon.svg', sizes: '180x180', type: 'image/svg+xml' },
    ],
    other: [
      {
        rel: 'mask-icon',
        url: '/icons/icon-maskable.svg',
        color: '#B8935A',
      },
    ],
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    title: 'ourCloset — Zero-Key AI Wardrobe Coordination',
    description: 'Couple & Family wardrobe coordination engine. 100% in-browser WASM AI.',
    siteName: 'ourCloset',
    images: [
      {
        url: '/icons/icon.svg',
        width: 512,
        height: 512,
        alt: 'ourCloset App Icon',
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: '#FAF8F5',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="light" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "ourCloset",
              operatingSystem: "Web",
              applicationCategory: "LifestyleApplication",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
              },
            }),
          }}
        />
        
        {/* Structured Local & Geo SEO Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              'name': 'ourCloset',
              'url': siteUrl,
              'applicationCategory': 'LifestyleApplication',
              'operatingSystem': 'All',
              'description': 'Couple & Family wardrobe coordination engine across Western, Indian Traditional, and Islamic-Modest dress codes. Runs entirely client-side with 100% data privacy.',
              'offers': {
                '@type': 'Offer',
                'price': '0',
                'priceCurrency': 'USD'
              },
              'author': {
                '@type': 'Person',
                'name': 'Adnan Shafiq Mangaonkar',
                'url': 'https://adnan-mangaonkar.com',
                'address': {
                  '@type': 'PostalAddress',
                  'addressLocality': 'Mumbai',
                  'addressRegion': 'Maharashtra',
                  'addressCountry': 'IN'
                }
              }
            })
          }}
        />
      
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "ourCloset",
              url: "https://ourcloset.adnan-mangaonkar.com",
              potentialAction: {
                "@type": "SearchAction",
                target: "https://ourcloset.adnan-mangaonkar.com/?q={search_term_string}",
                "query-input": "required name=search_term_string"
              }
            }),
          }}
        />
      </head>
      <body className="bg-raw-silk text-charcoal-thread min-h-screen flex flex-col font-body text-body-md antialiased overflow-x-hidden" suppressHydrationWarning>
        <AuthProvider>
          <SyncBootstrap />
          <HouseholdProvider>
            <WardrobeProvider>
              <SmoothScrollProvider>
                {children}
                <PWAInstallPrompt />
                <PortfolioEcosystem />
              </SmoothScrollProvider>
            </WardrobeProvider>
          </HouseholdProvider>
        </AuthProvider>

        {/* Register Service Worker */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) {
                      console.log('ServiceWorker registration successful with scope: ', registration.scope);
                    },
                    function(err) {
                      console.log('ServiceWorker registration failed: ', err);
                    }
                  );
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}

