import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import RootErrorPage from '@/app/error';
import GlobalError from '@/app/global-error';
import MainAppError from '@/app/(main)/error';

// Mock telemetry
vi.mock('@/services/telemetry', () => ({
  trackPrivacyEvent: vi.fn(),
}));

describe('Error Boundaries & Reset Actions', () => {
  const sampleError = new Error('Vector computation matrix mismatch');
  (sampleError as any).digest = 'CRASH-49102';

  it('renders root ErrorPage with atelier fault styling and reset action', () => {
    const resetFn = vi.fn();
    const html = renderToStaticMarkup(
      React.createElement(RootErrorPage, { error: sampleError, reset: resetFn })
    );

    expect(html).toContain('data-testid="root-error-boundary"');
    expect(html).toContain('500');
    expect(html).toContain('Twinning Engine Fault');
    expect(html).toContain('Re-align Interface');
    expect(html).toContain('Return to Core');
  });

  it('renders GlobalError shell with standalone html, body, and reset trigger', () => {
    const resetFn = vi.fn();
    const html = renderToStaticMarkup(
      React.createElement(GlobalError, { error: sampleError, reset: resetFn })
    );

    expect(html).toContain('data-testid="global-error-boundary"');
    expect(html).toContain('<html');
    expect(html).toContain('<body');
    expect(html).toContain('Atelier Core Fault');
    expect(html).toContain('CRASH-49102');
    expect(html).toContain('Re-align Atelier Shell');
    expect(html).toContain('Return to Core');
  });

  it('renders route-level MainAppError with workspace fault and reset action', () => {
    const resetFn = vi.fn();
    const html = renderToStaticMarkup(
      React.createElement(MainAppError, { error: sampleError, reset: resetFn })
    );

    expect(html).toContain('data-testid="main-error-boundary"');
    expect(html).toContain('Atelier Workspace Temporary Halt');
    expect(html).toContain('Section Coordination Interrupted');
    expect(html).toContain('CRASH-49102');
    expect(html).toContain('Re-render Workspace');
  });
});
