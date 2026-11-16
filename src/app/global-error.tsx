'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log fatal client error
    console.error('Fatal Atelier Shell Error:', error);
  }, [error]);

  return (
    <html lang="en">
      <head>
        <title>Atelier Matrix Error | ourCloset</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body
        style={{
          margin: 0,
          padding: 0,
          backgroundColor: '#FDFBF7',
          color: '#1A1C18',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          data-testid="global-error-boundary"
          style={{
            maxWidth: '480px',
            width: '90%',
            padding: '40px',
            backgroundColor: '#FFFFFF',
            border: '1px solid rgba(186, 26, 26, 0.3)',
            borderRadius: '16px',
            boxShadow: '0 20px 40px rgba(26, 28, 24, 0.08)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              margin: '0 auto 24px',
              borderRadius: '16px',
              backgroundColor: 'rgba(186, 26, 26, 0.08)',
              border: '1px solid rgba(186, 26, 26, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#BA1A1A',
              fontSize: '28px',
              fontWeight: 'bold',
            }}
          >
            !
          </div>

          <p
            style={{
              fontFamily: 'monospace',
              fontSize: '11px',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: '#BA1A1A',
              margin: '0 0 8px',
              fontWeight: 700,
            }}
          >
            Fatal Framework Exception
          </p>

          <h1
            style={{
              fontSize: '32px',
              fontWeight: 700,
              color: '#1A1C18',
              margin: '0 0 16px',
              letterSpacing: '-0.02em',
            }}
          >
            Atelier Core Fault
          </h1>

          <p
            style={{
              fontSize: '14px',
              lineHeight: 1.6,
              color: '#49454E',
              margin: '0 0 28px',
            }}
          >
            The root application layout encountered an unrecoverable exception. The system state
            has been sealed to prevent data corruption.
          </p>

          {error?.digest && (
            <p
              style={{
                fontFamily: 'monospace',
                fontSize: '11px',
                color: '#79747E',
                marginBottom: '24px',
              }}
            >
              Digest: {error.digest}
            </p>
          )}

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => reset()}
              style={{
                padding: '12px 24px',
                backgroundColor: '#BA1A1A',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              Re-align Atelier Shell
            </button>
            <Link
              href="/"
              style={{
                padding: '12px 24px',
                backgroundColor: 'transparent',
                color: '#1A1C18',
                border: '1px solid rgba(26, 28, 24, 0.2)',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                textDecoration: 'none',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              Return to Core
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
