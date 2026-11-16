'use client';

import React, { useEffect } from 'react';
import { Button } from '@/components';
import { trackPrivacyEvent } from '@/services/telemetry';

export default function MainAppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Main App Error Caught:', error);
    try {
      trackPrivacyEvent('error_caught', {
        boundary: 'main_section',
        error_name: error.name,
      });
    } catch {
      // Ignore telemetry failures in error boundary
    }
  }, [error]);

  return (
    <div
      data-testid="main-error-boundary"
      className="p-8 my-8 text-center bg-surface-container-lowest torn-swatch border border-sindoor/30 rounded-xl space-y-6 max-w-lg mx-auto shadow-sm"
    >
      <div className="w-16 h-16 mx-auto rounded-full bg-sindoor/10 border border-sindoor/30 flex items-center justify-center text-sindoor">
        <span className="material-symbols-outlined text-3xl">construction</span>
      </div>

      <div className="space-y-2">
        <span className="spec-label text-sindoor font-mono text-xs uppercase tracking-widest block font-bold">
          Section Coordination Interrupted
        </span>
        <h2 className="text-2xl font-display font-bold text-primary">
          Atelier Workspace Temporary Halt
        </h2>
        <p className="text-sm text-on-surface-variant font-body leading-relaxed max-w-sm mx-auto">
          An unexpected interruption occurred in this wardrobe section. Your local garment data
          remains safely persisted in storage.
        </p>
      </div>

      {error.digest && (
        <p className="font-mono text-[11px] text-on-surface-variant/70">
          Ref: {error.digest}
        </p>
      )}

      <div className="flex gap-4 justify-center pt-2">
        <Button
          onClick={() => reset()}
          className="bg-primary text-on-primary hover:bg-primary/90 px-6 py-2.5 text-xs font-mono uppercase tracking-wider"
        >
          <span className="material-symbols-outlined text-sm">refresh</span>
          Re-render Workspace
        </Button>
      </div>
    </div>
  );
}
