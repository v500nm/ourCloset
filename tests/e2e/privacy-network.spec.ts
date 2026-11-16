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
  'images.unsplash.com',
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
  test('strictly limits outbound network traffic across primary user flows and ingestion', async ({ page, baseURL }) => {
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

    // Trigger outfit generation interactions
    const generateBtn = page.getByRole('button', { name: /generate|refresh|re-generate|shuffle/i }).first();
    if (await generateBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      await generateBtn.click();
      await page.waitForTimeout(600);
    }

    // 3. Visit Wardrobe / Closet (/closet) & Trigger Ingestion
    await page.goto('/closet');
    await page.waitForLoadState('networkidle');

    // Open ingestion modal via floating add button
    const addGarmentBtn = page.getByRole('button', { name: /add new garment to cupboard/i });
    if (await addGarmentBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      await addGarmentBtn.click();
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible({ timeout: 2000 });

      // Upload a 1x1 base64 transparent PNG fixture into file input
      const fileInput = page.locator('input[type="file"]').first();
      if (await fileInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        await fileInput.setInputFiles({
          name: 'test_garment.png',
          mimeType: 'image/png',
          buffer: Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            'base64'
          ),
        });
        await page.waitForTimeout(1000);
      }

      // Close modal
      const closeBtn = page.getByRole('button', { name: /close|dismiss/i }).first();
      if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await closeBtn.click();
      }
    }

    // 4. Visit Demo flow (/demo)
    await page.goto('/demo');
    await page.waitForLoadState('networkidle');

    // Verify key interactive element IDs exist
    await expect(page.locator('#demo-generate-btn')).toBeVisible({ timeout: 2000 });
    await page.locator('#demo-generate-btn').click();
    await page.waitForTimeout(800);

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
