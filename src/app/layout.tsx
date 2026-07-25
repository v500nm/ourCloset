import './globals.css';
import type { Metadata, Viewport } from 'next';
import { SmoothScrollProvider } from '@/components/providers/SmoothScrollProvider';
import { HouseholdProvider } from '@/providers/HouseholdProvider';
import { WardrobeProvider } from '@/providers/WardrobeProvider';
import { AuthProvider } from '@/providers/AuthProvider';
import { PWAInstallPrompt } from '@/components/ui/PWAInstallPrompt';

export const metadata: Metadata = {
  title: 'ourCloset — Zero-Key AI Wardrobe Coordination',
  description:
    'Couple wardrobe coordination across Western, Indian Traditional, and Islamic-Modest dress codes. Zero paid AI API calls — all inference runs client-side.',
  manifest: '/manifest.json',
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
        {/* Domine (display/serif), Inter (body), JetBrains Mono (spec labels) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Domine:wght@400..700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        {/* Material Symbols for icons */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-raw-silk text-charcoal-thread min-h-screen flex flex-col font-body text-body-md antialiased overflow-x-hidden" suppressHydrationWarning>
        <AuthProvider>
          <HouseholdProvider>
            <WardrobeProvider>
              <SmoothScrollProvider>
                {children}
                <PWAInstallPrompt />
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

