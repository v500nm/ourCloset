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

  useEffect(() => {
    // Check if running as installed standalone app
    if (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone) {
      setIsStandalone(true);
      return;
    }

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

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
      setDeferredPrompt(null);
    } else {
      // User cancelled browser dialog -> minimize to bottom right pill
      setIsMinimized(true);
    }
  };

  const handleDismiss = () => {
    // Settle into small bottom-right corner widget instead of destroying
    setIsMinimized(true);
  };

  if (isStandalone || !showPrompt || !deferredPrompt) {
    return null;
  }

  return (
    <AnimatePresence mode="wait">
      {isMinimized ? (
        // Small compact pill settled on right bottom corner
        <motion.button
          key="minimized-pill"
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 20 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsMinimized(false)}
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
        // Full expanded prompt banner
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
              <h4 className="font-display font-bold text-sm text-primary">Install ourCloset App</h4>
              <p className="text-xs text-on-surface-variant font-body mt-0.5">
                Add to home screen for fast local access, zero latency, and instant outfit matching.
              </p>

              <div className="flex items-center gap-2 mt-3">
                <Button onClick={handleInstallClick} className="hard-shadow text-xs py-1.5 px-3">
                  <span className="material-symbols-outlined text-sm">download</span>
                  Install App
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
  );
};
