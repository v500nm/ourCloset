import { describe, it, expect } from 'vitest';
import {
  HlcClock,
  toHlcString,
  parseHlcString,
  compareHlc,
  isHlcString,
  HybridLogicalClock,
} from '@/data/sync/hlc';

describe('Hybrid Logical Clock (HLC) Engine', () => {
  it('serializes and parses HLC tuples accurately with roundtrip equivalence', () => {
    const original: HybridLogicalClock = {
      millis: 1731697200000,
      counter: 42,
      nodeId: 'device-alpha-123',
    };

    const serialized = toHlcString(original);
    expect(serialized).toBe('001731697200000:00042:device-alpha-123');
    expect(isHlcString(serialized)).toBe(true);

    const parsed = parseHlcString(serialized);
    expect(parsed).toEqual(original);
  });

  it('handles parsing errors on malformed HLC strings', () => {
    expect(() => parseHlcString('')).toThrow();
    expect(() => parseHlcString('bad-format')).toThrow();
    expect(() => parseHlcString('abc:def:node')).toThrow();
    expect(isHlcString('invalid')).toBe(false);
  });

  it('guarantees string lexicographical sorting matches chronological HLC order', () => {
    const t1 = toHlcString({ millis: 1000, counter: 0, nodeId: 'nodeA' });
    const t2 = toHlcString({ millis: 1000, counter: 1, nodeId: 'nodeA' });
    const t3 = toHlcString({ millis: 1000, counter: 1, nodeId: 'nodeB' });
    const t4 = toHlcString({ millis: 1001, counter: 0, nodeId: 'nodeA' });

    // String comparison
    expect(t1 < t2).toBe(true);
    expect(t2 < t3).toBe(true);
    expect(t3 < t4).toBe(true);

    // compareHlc helper comparison
    expect(compareHlc(t1, t2)).toBe(-1);
    expect(compareHlc(t2, t3)).toBe(-1);
    expect(compareHlc(t3, t4)).toBe(-1);
    expect(compareHlc(t4, t3)).toBe(1);
    expect(compareHlc(t1, t1)).toBe(0);
  });

  it('monotonically advances counter when physical clock does not advance', () => {
    let mockTime = 10000;
    const clock = new HlcClock({
      nodeId: 'test-node',
      getPhysicalTime: () => mockTime,
    });

    const hlc1 = clock.now();
    expect(hlc1.millis).toBe(10000);
    expect(hlc1.counter).toBe(0);

    const hlc2 = clock.now();
    expect(hlc2.millis).toBe(10000);
    expect(hlc2.counter).toBe(1);

    const hlc3 = clock.now();
    expect(hlc3.millis).toBe(10000);
    expect(hlc3.counter).toBe(2);

    expect(compareHlc(hlc1, hlc2)).toBe(-1);
    expect(compareHlc(hlc2, hlc3)).toBe(-1);
  });

  it('resets counter to 0 when physical clock moves forward', () => {
    let mockTime = 10000;
    const clock = new HlcClock({
      nodeId: 'test-node',
      getPhysicalTime: () => mockTime,
    });

    clock.now(); // millis 10000, counter 0
    clock.now(); // millis 10000, counter 1

    mockTime = 10005;
    const hlcNext = clock.now();
    expect(hlcNext.millis).toBe(10005);
    expect(hlcNext.counter).toBe(0);
  });

  it('protects against wall clock backwards drift (clock skew)', () => {
    let mockTime = 50000;
    const clock = new HlcClock({
      nodeId: 'test-node',
      getPhysicalTime: () => mockTime,
    });

    const hlc1 = clock.now();
    expect(hlc1.millis).toBe(50000);

    // Physical clock rewinds by 10 seconds!
    mockTime = 40000;
    const hlc2 = clock.now();

    // HLC must NOT rewind!
    expect(hlc2.millis).toBe(50000);
    expect(hlc2.counter).toBe(1);
    expect(compareHlc(hlc1, hlc2)).toBe(-1);
  });

  it('progresses clock upon receiving a remote HLC', () => {
    let mockTime = 10000;
    const clock = new HlcClock({
      nodeId: 'local-node',
      getPhysicalTime: () => mockTime,
    });

    // Remote clock is ahead
    const remoteHlc: HybridLogicalClock = {
      millis: 12000,
      counter: 5,
      nodeId: 'remote-node',
    };

    const updated = clock.receive(remoteHlc);
    expect(updated.millis).toBe(12000);
    expect(updated.counter).toBe(6);

    // Subsequent local call is strictly after the received remote timestamp
    const nextLocal = clock.now();
    expect(nextLocal.millis).toBe(12000);
    expect(nextLocal.counter).toBe(7);
    expect(compareHlc(remoteHlc, nextLocal)).toBe(-1);
  });

  it('handles receive when local clock is already ahead of remote', () => {
    let mockTime = 20000;
    const clock = new HlcClock({
      nodeId: 'local-node',
      getPhysicalTime: () => mockTime,
    });

    clock.now(); // 20000, counter 0

    const remoteHlc: HybridLogicalClock = {
      millis: 15000,
      counter: 10,
      nodeId: 'remote-node',
    };

    const updated = clock.receive(remoteHlc);
    expect(updated.millis).toBe(20000);
    expect(updated.counter).toBe(1); // advances local counter
  });
});
