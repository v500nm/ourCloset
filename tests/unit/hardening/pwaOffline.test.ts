import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PWAInstallPrompt } from '@/components/ui/PWAInstallPrompt';

describe('PWA App Shell Pre-caching and Install Hardening', () => {
  const swPath = path.resolve(process.cwd(), 'public/sw.js');
  const offlineHtmlPath = path.resolve(process.cwd(), 'public/offline.html');
  const manifestPath = path.resolve(process.cwd(), 'public/manifest.json');

  it('service worker precaches all core app shell routes and assets', () => {
    const swContent = fs.readFileSync(swPath, 'utf8');

    // Route precaching
    expect(swContent).toContain("'/today'");
    expect(swContent).toContain("'/closet'");
    expect(swContent).toContain("'/laundry'");
    expect(swContent).toContain("'/history'");
    expect(swContent).toContain("'/trip'");
    expect(swContent).toContain("'/offline.html'");
    expect(swContent).toContain("'/manifest.json'");

    // skipWaiting mechanism
    expect(swContent).toContain('SKIP_WAITING');

    // Navigation and offline fallback
    expect(swContent).toContain("event.request.mode === 'navigate'");
    expect(swContent).toContain("caches.match('/offline.html')");
  });

  it('offline fallback HTML provides atelier-themed offline shell with quick route access', () => {
    const offlineHtml = fs.readFileSync(offlineHtmlPath, 'utf8');

    expect(offlineHtml).toContain("You're Offline");
    expect(offlineHtml).toContain('href="/today"');
    expect(offlineHtml).toContain('href="/closet"');
    expect(offlineHtml).toContain('href="/laundry"');
    expect(offlineHtml).toContain('Offline App Shell');
  });

  it('manifest.json specifies standalone mode and valid icons', () => {
    const manifestContent = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    expect(manifestContent.display).toBe('standalone');
    expect(manifestContent.start_url).toBe('/');
    expect(manifestContent.icons.length).toBeGreaterThanOrEqual(1);
  });
});

