'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [showIOSGuide, setShowIOSGuide] = useState<boolean>(false);

  // Service Worker Update State
  const [showUpdatePrompt, setShowUpdatePrompt] = useState<boolean>(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    // 1. Check if running as installed standalone app
    if (
      typeof window !== 'undefined' &&
      (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone)
    ) {
      setIsStandalone(true);
      return;
    }

    // 2. Detect iOS environment
    const isIOSDevice =
      typeof navigator !== 'undefined' &&
      (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) &&
      !(window as any).MSStream;

    if (isIOSDevice) {
      setIsIOS(true);
      // Check if user has permanently dismissed prompt
      const dismissed = localStorage.getItem('ourcloset_ios_prompt_dismissed');
      if (!dismissed) {
        setShowPrompt(true);
      }
    }

    // 3. Android / Chromium BeforeInstallPrompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    window.addEventListener('appinstalled', () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
      setIsStandalone(true);
    });

    // 4. Service Worker Update Detection
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (!reg) return;

        if (reg.waiting) {
          setWaitingWorker(reg.waiting);
          setShowUpdatePrompt(true);
        }

        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setWaitingWorker(newWorker);
              setShowUpdatePrompt(true);
            }
          });
        });
      });

      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }

    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
      setDeferredPrompt(null);
    } else {
      setIsMinimized(true);
    }
  };

  const handleDismiss = () => {
    setIsMinimized(true);
    if (isIOS) {
      localStorage.setItem('ourcloset_ios_prompt_dismissed', 'true');
    }
  };

  const handleUpdate = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    }
    setShowUpdatePrompt(false);
  };

  return (
    <>
      {/* Service Worker Version Update Prompt */}
      <AnimatePresence>
        {showUpdatePrompt && (
          <motion.div
            key="sw-update-banner"
            role="alert"
            aria-live="polite"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="fixed top-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50 p-4 bg-primary text-on-primary border border-secondary/40 rounded-xl shadow-2xl flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-secondary text-2xl">system_update</span>
              <div>
                <p className="font-display font-bold text-sm">Update Available</p>
                <p className="text-xs text-on-primary/80">A new version of ourCloset is ready.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleUpdate}
                className="px-3 py-1.5 rounded-lg bg-secondary text-on-secondary text-xs font-mono font-bold hover:bg-secondary/90 transition-colors"
              >
                Update
              </button>
              <button
                onClick={() => setShowUpdatePrompt(false)}
                className="p-1 text-on-primary/70 hover:text-on-primary transition-colors"
                aria-label="Dismiss update notification"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PWA Install Prompt Banner / Minimized Pill */}
      {!isStandalone && showPrompt && (deferredPrompt || isIOS) && (
        <AnimatePresence mode="wait">
          {isMinimized ? (
            <motion.button
              key="minimized-pill"
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setIsMinimized(false);
                if (isIOS) setShowIOSGuide(true);
              }}
              className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3.5 py-2.5 bg-primary text-on-primary rounded-full shadow-2xl border border-secondary/50 cursor-pointer font-mono text-xs font-bold tracking-wide backdrop-blur-md group"
              title="Install ourCloset App"
              aria-label="Expand App Install Prompt"
            >
              <span className="w-2 h-2 rounded-full bg-secondary animate-ping" />
              <span className="material-symbols-outlined text-sm text-secondary group-hover:rotate-12 transition-transform">
                download
              </span>
              <span>Install App</span>
            </motion.button>
          ) : (
            <motion.div
              key="expanded-banner"
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50 p-4 bg-surface-container-lowest border border-secondary/40 rounded-2xl shadow-2xl backdrop-blur-md"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-on-primary shrink-0 shadow-md">
                  <span className="material-symbols-outlined text-2xl">checkroom</span>
                </div>

                <div className="flex-grow min-w-0">
                  <h4 className="font-display font-bold text-sm text-primary">
                    {isIOS ? 'Install ourCloset on iOS' : 'Install ourCloset App'}
                  </h4>
                  <p className="text-xs text-on-surface-variant font-body mt-0.5">
                    {isIOS
                      ? 'Add to home screen for full-screen offline access and instant wardrobe twinning.'
                      : 'Add to home screen for fast local access, zero latency, and instant outfit matching.'}
                  </p>

                  {/* iOS Step-by-Step Instructions */}
                  {isIOS && showIOSGuide ? (
                    <div className="mt-3 p-3 bg-surface-container rounded-lg border border-outline-variant/30 space-y-2 text-xs font-mono text-primary">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-secondary text-base">ios_share</span>
                        <span>1. Tap Safari&apos;s <strong>Share</strong> button</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-secondary text-base">add_box</span>
                        <span>2. Select <strong>Add to Home Screen</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-secondary text-base">check_circle</span>
                        <span>3. Tap <strong>Add</strong> at top right</span>
                      </div>
                    </div>
                  ) : null}

                  <div className="flex items-center gap-2 mt-3">
                    <Button onClick={handleInstallClick} className="hard-shadow text-xs py-1.5 px-3">
                      <span className="material-symbols-outlined text-sm">
                        {isIOS ? 'help_outline' : 'download'}
                      </span>
                      {isIOS ? (showIOSGuide ? 'Instructions Open' : 'How to Install') : 'Install App'}
                    </Button>
                    <button
                      onClick={handleDismiss}
                      className="px-3 py-1.5 rounded-lg text-xs font-mono text-on-surface-variant hover:bg-surface-container transition-colors"
                    >
                      Not now
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleDismiss}
                  className="text-on-surface-variant hover:text-primary p-1 rounded-full hover:bg-surface-container transition-colors shrink-0"
                  aria-label="Minimize install prompt"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </>
  );
};
