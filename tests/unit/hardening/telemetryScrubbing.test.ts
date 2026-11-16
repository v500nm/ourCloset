import { describe, it, expect, beforeEach } from 'vitest';
import {
  scrubPII,
  trackPrivacyEvent,
  recordWebVital,
  getTelemetryBuffer,
  clearTelemetryBuffer,
  setTelemetryEnabled,
  isTelemetryEnabled,
} from '@/services/telemetry';

describe('Privacy-Preserving Telemetry & Observability', () => {
  beforeEach(() => {
    clearTelemetryBuffer();
    setTelemetryEnabled(true);
  });

  describe('PII Scrubber Engine (scrubPII)', () => {
    it('completely strips forbidden keys from payloads', () => {
      const rawPayload = {
        title: 'Silk Emerald Kurta',
        description: 'Wedding reception outfit worn with gold jutti',
        name: 'Adnan M',
        email: 'adnan@example.com',
        photo: 'https://cdn.example.com/photos/wardrobe-123.jpg',
        image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        notes: 'Private fitting note',
        prompt: 'Generate an outfit for an Islamic Eid prayer',
        garment: 'Velvet Blazer',
        password: 'secret_password_123',
        token: 'jwt_token_here',
        // Allowable non-PII metrics
        item_count: 3,
        tier: 'balanced',
        formality_level: 4,
        cultural_category: 'indian_traditional',
        success: true,
      };

      const cleaned = scrubPII(rawPayload);

      // Forbidden keys must NOT exist in the scrubbed object
      expect(cleaned).not.toHaveProperty('title');
      expect(cleaned).not.toHaveProperty('description');
      expect(cleaned).not.toHaveProperty('name');
      expect(cleaned).not.toHaveProperty('email');
      expect(cleaned).not.toHaveProperty('photo');
      expect(cleaned).not.toHaveProperty('image');
      expect(cleaned).not.toHaveProperty('notes');
      expect(cleaned).not.toHaveProperty('prompt');
      expect(cleaned).not.toHaveProperty('garment');
      expect(cleaned).not.toHaveProperty('password');
      expect(cleaned).not.toHaveProperty('token');

      // Allowable metrics must be preserved
      expect(cleaned).toHaveProperty('item_count', 3);
      expect(cleaned).toHaveProperty('tier', 'balanced');
      expect(cleaned).toHaveProperty('formality_level', 4);
      expect(cleaned).toHaveProperty('cultural_category', 'indian_traditional');
      expect(cleaned).toHaveProperty('success', true);
    });

    it('scrubs email addresses embedded in string values', () => {
      const input = {
        meta: 'User reported issue from user.test@domain.org regarding sync',
      };
      const cleaned = scrubPII(input);
      expect(cleaned.meta).toBe('User reported issue from [SCRUBBED_EMAIL] regarding sync');
    });

    it('scrubs web URLs and base64 images inside nested values', () => {
      const input = {
        status: 'failed',
        details: {
          trace: 'Failed loading resource from https://api.external.com/v1/user/991',
          dataBlob: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD...',
        },
      };
      const cleaned = scrubPII(input);
      expect(cleaned.details.trace).toContain('[SCRUBBED_URI]');
      expect(cleaned.details.dataBlob).toBe('[SCRUBBED_PHOTO]');
    });

    it('scrubs local system file paths', () => {
      const input = {
        stackTrace: 'Error at C:\\Users\\DELL\\AppData\\Local\\Temp\\photo.jpg:24',
      };
      const cleaned = scrubPII(input);
      expect(cleaned.stackTrace).toContain('[SCRUBBED_PATH]');
    });
  });

  describe('Telemetry Buffer & Event Dispatch', () => {
    it('buffers anonymized product metrics', () => {
      const record = trackPrivacyEvent('outfit_generated', {
        item_count: 2,
        tier: 'direct',
      });

      expect(record).toBeDefined();
      expect(record?.eventName).toBe('outfit_generated');
      expect(record?.payload).toEqual({ item_count: 2, tier: 'direct' });

      const buffer = getTelemetryBuffer();
      expect(buffer.length).toBe(1);
      expect(buffer[0].eventName).toBe('outfit_generated');
    });

    it('records Core Web Vitals with rating calculations', () => {
      const fcpRecord = recordWebVital({ name: 'FCP', value: 1200 });
      expect(fcpRecord?.payload.vital_name).toBe('FCP');
      expect(fcpRecord?.payload.rating).toBe('good');

      const poorLcpRecord = recordWebVital({ name: 'LCP', value: 4500 });
      expect(poorLcpRecord?.payload.vital_name).toBe('LCP');
      expect(poorLcpRecord?.payload.rating).toBe('poor');

      const clsRecord = recordWebVital({ name: 'CLS', value: 0.05 });
      expect(clsRecord?.payload.vital_name).toBe('CLS');
      expect(clsRecord?.payload.rating).toBe('good');
    });

    it('disables event recording when telemetry is toggled off', () => {
      setTelemetryEnabled(false);
      expect(isTelemetryEnabled()).toBe(false);

      const record = trackPrivacyEvent('outfit_accepted', { tier: 'subtle' });
      expect(record).toBeNull();
      expect(getTelemetryBuffer().length).toBe(0);
    });

    it('evicts oldest events when buffer reaches capacity ceiling', () => {
      for (let i = 0; i < 110; i++) {
        trackPrivacyEvent('route_transition', { step: i });
      }

      const buffer = getTelemetryBuffer();
      expect(buffer.length).toBe(100);
      // The oldest (0-9) should have been shifted out
      expect(buffer[0].payload.step).toBe(10);
      expect(buffer[buffer.length - 1].payload.step).toBe(109);
    });
  });
});
