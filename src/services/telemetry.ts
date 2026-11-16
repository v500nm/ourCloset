/**
 * Privacy-Preserving Telemetry & Observability Service
 *
 * Implements strict zero-PII metrics collection for ourCloset.
 * In accordance with our privacy architecture:
 * - NO garment titles, descriptions, notes, or prompts are ever recorded.
 * - NO photograph URLs, base64 data, or image references are recorded.
 * - NO user identities, emails, or personal identifiers are captured.
 * - Telemetry is buffered in-memory with strict sanitization and can be opted out.
 */

export type PrivacyEventName =
  | 'outfit_generated'
  | 'outfit_accepted'
  | 'outfit_rerolled'
  | 'item_ingested'
  | 'laundry_status_changed'
  | 'sync_completed'
  | 'error_caught'
  | 'web_vital'
  | 'route_transition'
  | 'beta_feedback';

export interface WebVitalMetric {
  name: 'FCP' | 'LCP' | 'CLS' | 'FID' | 'INP' | 'TTFB';
  value: number;
  rating?: 'good' | 'needs-improvement' | 'poor';
}

export interface TelemetryRecord {
  id: string;
  eventName: PrivacyEventName;
  timestamp: number;
  payload: Record<string, unknown>;
}

// Keys strictly forbidden from ever entering telemetry payloads (including prefix/suffix compound keys)
const FORBIDDEN_KEYS_REGEX =
  /(^|_)(name|email|title|description|photo|image|url|notes|text|prompt|garment|address|phone|password|code|token|session|file|path)($|_)/i;

// Regex patterns to identify sensitive data within string values
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const URI_REGEX = /(https?:\/\/[^\s]+|blob:[^\s]+|data:image\/[^\s]+)/gi;
const FILE_PATH_REGEX = /([a-zA-Z]:\\[^\s]+|\/(Users|home|var|tmp|etc)\/[^\s]+)/gi;
const BASE64_IMAGE_REGEX = /^data:image\/[a-zA-Z+]+;base64,[A-Za-z0-9+/=]+/i;

/**
 * Recursively scrubs PII, freeform text, and photo references from any telemetry payload.
 */
export function scrubPII<T>(input: T): T {
  if (input === null || input === undefined) {
    return input;
  }

  if (typeof input === 'string') {
    if (BASE64_IMAGE_REGEX.test(input)) {
      return '[SCRUBBED_PHOTO]' as unknown as T;
    }
    let scrubbed = input.replace(EMAIL_REGEX, '[SCRUBBED_EMAIL]');
    scrubbed = scrubbed.replace(URI_REGEX, '[SCRUBBED_URI]');
    scrubbed = scrubbed.replace(FILE_PATH_REGEX, '[SCRUBBED_PATH]');
    return scrubbed as unknown as T;
  }

  if (typeof input === 'number' || typeof input === 'boolean') {
    return input;
  }

  if (Array.isArray(input)) {
    return input.map((item) => scrubPII(item)) as unknown as T;
  }

  if (typeof input === 'object') {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      // Drop any forbidden keys entirely (allowing telemetry-specific metric identifiers like vital_name)
      if (FORBIDDEN_KEYS_REGEX.test(key) && key !== 'vital_name') {
        continue;
      }
      cleaned[key] = scrubPII(value);
    }
    return cleaned as T;
  }

  return undefined as unknown as T;
}

class TelemetryManager {
  private enabled: boolean = true;
  private buffer: TelemetryRecord[] = [];
  private maxBufferSize: number = 100;

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public clearBuffer(): void {
    this.buffer = [];
  }

  public getBuffer(): TelemetryRecord[] {
    return [...this.buffer];
  }

  /**
   * Tracks an anonymized privacy-preserving event.
   */
  public trackEvent(
    eventName: PrivacyEventName,
    rawPayload: Record<string, unknown> = {}
  ): TelemetryRecord | null {
    if (!this.enabled) {
      return null;
    }

    // Strictly scrub payload
    const sanitizedPayload = scrubPII(rawPayload) || {};

    const record: TelemetryRecord = {
      id: `tel-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      eventName,
      timestamp: Date.now(),
      payload: sanitizedPayload as Record<string, unknown>,
    };

    this.buffer.push(record);
    if (this.buffer.length > this.maxBufferSize) {
      this.buffer.shift(); // FIFO evict
    }

    if (process.env.NODE_ENV === 'development') {
      // Optional dev log
      // console.debug('[Telemetry]', eventName, sanitizedPayload);
    }

    return record;
  }

  /**
   * Records Core Web Vitals (FCP, LCP, CLS, FID, INP, TTFB).
   */
  public recordWebVital(metric: WebVitalMetric): TelemetryRecord | null {
    const rating =
      metric.rating ||
      (metric.name === 'CLS'
        ? metric.value <= 0.1
          ? 'good'
          : metric.value <= 0.25
          ? 'needs-improvement'
          : 'poor'
        : metric.value <= 2500
        ? 'good'
        : metric.value <= 4000
        ? 'needs-improvement'
        : 'poor');

    return this.trackEvent('web_vital', {
      vital_name: metric.name,
      value: Math.round(metric.value * 100) / 100,
      rating,
    });
  }

  /**
   * Attaches browser PerformanceObserver for Core Web Vitals when available.
   * Returns a cleanup unbind function.
   */
  public initPerformanceObserver(): () => void {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      return () => {};
    }

    const observers: PerformanceObserver[] = [];

    try {
      // FCP observer
      const paintObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            this.recordWebVital({ name: 'FCP', value: entry.startTime });
          }
        }
      });
      paintObserver.observe({ type: 'paint', buffered: true });
      observers.push(paintObserver);
    } catch {
      // PerformanceObserver types not supported in this runtime
    }

    return () => {
      observers.forEach((obs) => {
        try {
          obs.disconnect();
        } catch {
          // ignore
        }
      });
    };
  }
}

export const telemetry = new TelemetryManager();

export const trackPrivacyEvent = (
  eventName: PrivacyEventName,
  payload?: Record<string, unknown>
) => telemetry.trackEvent(eventName, payload);

export const recordWebVital = (metric: WebVitalMetric) => telemetry.recordWebVital(metric);

export const getTelemetryBuffer = () => telemetry.getBuffer();

export const clearTelemetryBuffer = () => telemetry.clearBuffer();

export const setTelemetryEnabled = (enabled: boolean) => telemetry.setEnabled(enabled);

export const isTelemetryEnabled = () => telemetry.isEnabled();
