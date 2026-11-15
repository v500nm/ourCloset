import { test, expect } from '@playwright/test';

/**
 * Tenet 1 Network Privacy Assertion Suite
 *
 * Enforces Tenet 1: Device-First Privacy.
 * "No photos leave the device. No model inference requires an external server.
 * Offline by default; sync is an opt-in luxury."
 *
 * During page visits, outfit generation, and garment ingestion, no outgoing network
 * requests may leave for any host except:
 *  1. Localhost / App origin
 *  2. Model CDN (Hugging Face / Xenova for client-side ONNX weights)
 *  3. Open-Meteo (weather forecast API)
 */

const ALLOWED_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  'api.open-meteo.com',
  'open-meteo.com',
  'huggingface.co',
  'cdn-lfs.huggingface.co',
  'cdn.jsdelivr.net',
  'xenova.github.io',
]);

function isHostAllowed(urlString: string, appHost: string): boolean {
  try {
    // Ignore internal browser schemes (data:, blob:)
    if (urlString.startsWith('data:') || urlString.startsWith('blob:') || urlString.startsWith('about:')) {
      return true;
    }
    const url = new URL(urlString);
    const hostname = url.hostname.toLowerCase();

    if (hostname === appHost || hostname === 'localhost' || hostname === '127.0.0.1') {
      return true;
    }

    if (ALLOWED_HOSTS.has(hostname)) {
      return true;
    }

    // Allow subdomains of Hugging Face CDN
    if (hostname.endsWith('.huggingface.co')) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

test.describe('Tenet 1: Device-First Network Privacy Enforcement', () => {
  test('strictly limits outbound network traffic across primary user flows', async ({ page, baseURL }) => {
    const appUrl = new URL(baseURL || 'http://localhost:3000');
    const appHost = appUrl.hostname.toLowerCase();

    const unexpectedRequests: { url: string; method: string; resourceType: string }[] = [];

    // Intercept all network requests made by the page
    page.on('request', (request) => {
      const reqUrl = request.url();
      if (!isHostAllowed(reqUrl, appHost)) {
        unexpectedRequests.push({
          url: reqUrl,
          method: request.method(),
          resourceType: request.resourceType(),
        });
      }
    });

    // 1. Visit landing page
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // 2. Visit Outfit Generation (/today)
    await page.goto('/today');
    await page.waitForLoadState('networkidle');

    // Attempt outfit generation interactions if interactive elements exist
    const generateBtn = page.getByRole('button', { name: /generate|refresh|re-generate|shuffle/i }).first();
    if (await generateBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await generateBtn.click();
      await page.waitForTimeout(500);
    }

    // 3. Visit Wardrobe / Closet (/closet)
    await page.goto('/closet');
    await page.waitForLoadState('networkidle');

    // 4. Visit Demo flow (/demo)
    await page.goto('/demo');
    await page.waitForLoadState('networkidle');

    // Verify zero unauthorized third-party outgoing requests occurred
    if (unexpectedRequests.length > 0) {
      console.error('Privacy Tenet 1 Violations Detected:', unexpectedRequests);
    }

    expect(
      unexpectedRequests,
      `Expected 0 external requests outside allowed whitelist (App, Model CDN, Open-Meteo), but found: ${JSON.stringify(
        unexpectedRequests,
        null,
        2
      )}`
    ).toHaveLength(0);
  });
});

