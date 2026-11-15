/**
 * Hybrid Logical Clock (HLC) Implementation
 * Per ADR-003: Conflict Resolution using Hybrid Logical Clocks (HLC)
 *
 * Combines physical wall-clock time with a monotonically increasing logical counter
 * and unique client node ID: (millis, counter, nodeId).
 *
 * Guarantees monotonic ordering across devices without relying on synchronized wall clocks.
 */

export interface HybridLogicalClock {
  millis: number;
  counter: number;
  nodeId: string;
}

export const HLC_MILLIS_PAD = 15;
export const HLC_COUNTER_PAD = 5;

/**
 * Serializes an HLC tuple into a zero-padded string format:
 * "<15-digit-millis>:<5-digit-counter>:<nodeId>"
 * This guarantees that lexicographical string comparison exactly mirrors HLC logical ordering.
 */
export function toHlcString(hlc: HybridLogicalClock): string {
  const millisStr = Math.floor(hlc.millis).toString().padStart(HLC_MILLIS_PAD, '0');
  const counterStr = Math.floor(hlc.counter).toString().padStart(HLC_COUNTER_PAD, '0');
  return `${millisStr}:${counterStr}:${hlc.nodeId}`;
}

/**
 * Deserializes an HLC string back into a HybridLogicalClock object.
 */
export function parseHlcString(str: string): HybridLogicalClock {
  if (!str || typeof str !== 'string') {
    throw new Error(`Invalid HLC string: expected non-empty string, got "${str}"`);
  }

  const parts = str.split(':');
  if (parts.length < 3) {
    throw new Error(`Invalid HLC format "${str}": expected at least 3 colon-separated segments`);
  }

  const millis = parseInt(parts[0], 10);
  const counter = parseInt(parts[1], 10);
  // Support nodeIds that may contain colons if necessary by joining remainder
  const nodeId = parts.slice(2).join(':');

  if (Number.isNaN(millis) || Number.isNaN(counter) || !nodeId) {
    throw new Error(`Failed to parse HLC string "${str}": invalid components`);
  }

  return { millis, counter, nodeId };
}

/**
 * Type guard for HLC string format.
 */
export function isHlcString(val: unknown): val is string {
  if (typeof val !== 'string') return false;
  const parts = val.split(':');
  if (parts.length < 3) return false;
  const m = parseInt(parts[0], 10);
  const c = parseInt(parts[1], 10);
  return !Number.isNaN(m) && !Number.isNaN(c) && parts[2].length > 0;
}

/**
 * Compares two HLCs (either HybridLogicalClock objects or serialized strings).
 * Returns:
 *   -1 if a < b
 *    1 if a > b
 *    0 if a === b
 */
export function compareHlc(
  a: HybridLogicalClock | string,
  b: HybridLogicalClock | string
): number {
  const clockA = typeof a === 'string' ? parseHlcString(a) : a;
  const clockB = typeof b === 'string' ? parseHlcString(b) : b;

  if (clockA.millis < clockB.millis) return -1;
  if (clockA.millis > clockB.millis) return 1;

  if (clockA.counter < clockB.counter) return -1;
  if (clockA.counter > clockB.counter) return 1;

  if (clockA.nodeId < clockB.nodeId) return -1;
  if (clockA.nodeId > clockB.nodeId) return 1;

  return 0;
}

/**
 * Deterministically generates or retrieves the persistent client node ID.
 */
let cachedNodeId: string | null = null;

export function getDeviceId(): string {
  if (cachedNodeId) return cachedNodeId;

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = window.localStorage.getItem('ourcloset_device_node_id');
      if (stored) {
        cachedNodeId = stored;
        return stored;
      }
      const generated =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `node_${Math.random().toString(36).slice(2, 11)}`;
      window.localStorage.setItem('ourcloset_device_node_id', generated);
      cachedNodeId = generated;
      return generated;
    } catch {
      // Fallback if localStorage access fails (e.g. private browsing restrictions)
    }
  }

  cachedNodeId =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `node_${Math.random().toString(36).slice(2, 11)}`;
  return cachedNodeId;
}

/**
 * Hybrid Logical Clock state manager
 */
export class HlcClock {
  private millis: number;
  private counter: number;
  private readonly nodeId: string;
  private readonly getPhysicalTime: () => number;

  constructor(options?: {
    nodeId?: string;
    initialMillis?: number;
    initialCounter?: number;
    getPhysicalTime?: () => number;
  }) {
    this.nodeId = options?.nodeId || getDeviceId();
    this.getPhysicalTime = options?.getPhysicalTime || (() => Date.now());
    this.millis = options?.initialMillis ?? 0;
    this.counter = options?.initialCounter ?? 0;
  }

  public getNodeId(): string {
    return this.nodeId;
  }

  public getState(): HybridLogicalClock {
    return {
      millis: this.millis,
      counter: this.counter,
      nodeId: this.nodeId,
    };
  }

  public getStateString(): string {
    return toHlcString(this.getState());
  }

  /**
   * Generates a new timestamp for a local mutation.
   * Monotonically advances the clock even if physical time rewinds or stays identical.
   */
  public now(): HybridLogicalClock {
    const pt = this.getPhysicalTime();
    const lLast = this.millis;
    const lNew = Math.max(lLast, pt);

    let cNew: number;
    if (lNew === lLast) {
      cNew = this.counter + 1;
    } else {
      cNew = 0;
    }

    this.millis = lNew;
    this.counter = cNew;

    return {
      millis: this.millis,
      counter: this.counter,
      nodeId: this.nodeId,
    };
  }

  /**
   * Generates a new timestamp string for a local mutation.
   */
  public nowString(): string {
    return toHlcString(this.now());
  }

  /**
   * Progresses the local clock upon receiving a remote HLC timestamp.
   * Ensures future local events occur strictly after any received remote events.
   */
  public receive(remote: HybridLogicalClock | string): HybridLogicalClock {
    const remoteHlc = typeof remote === 'string' ? parseHlcString(remote) : remote;
    const pt = this.getPhysicalTime();
    const lLast = this.millis;
    const lRemote = remoteHlc.millis;
    const lNew = Math.max(lLast, lRemote, pt);

    let cNew: number;
    if (lNew === lLast && lNew === lRemote) {
      cNew = Math.max(this.counter, remoteHlc.counter) + 1;
    } else if (lNew === lLast) {
      cNew = this.counter + 1;
    } else if (lNew === lRemote) {
      cNew = remoteHlc.counter + 1;
    } else {
      cNew = 0;
    }

    this.millis = lNew;
    this.counter = cNew;

    return {
      millis: this.millis,
      counter: this.counter,
      nodeId: this.nodeId,
    };
  }
}

/**
 * Default global clock instance for the local client.
 */
export const defaultHlc = new HlcClock();
