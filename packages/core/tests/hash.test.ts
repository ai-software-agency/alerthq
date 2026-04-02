import { describe, it, expect } from 'vitest';
import { hashConfig } from '../src/utils/hash.js';

describe('hashConfig', () => {
  it('produces a valid SHA-256 hex digest', () => {
    const hash = hashConfig({ key: 'value' });
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic — same input produces same hash', () => {
    const config = { metric: 'CPUUtilization', threshold: 80 };
    const hash1 = hashConfig(config);
    const hash2 = hashConfig(config);
    expect(hash1).toBe(hash2);
  });

  it('produces the same hash regardless of key insertion order', () => {
    const config1 = { a: 1, b: 2, c: 3 };
    const config2 = { c: 3, a: 1, b: 2 };
    expect(hashConfig(config1)).toBe(hashConfig(config2));
  });

  it('produces different hashes for different configs', () => {
    const hash1 = hashConfig({ threshold: 80 });
    const hash2 = hashConfig({ threshold: 90 });
    expect(hash1).not.toBe(hash2);
  });

  it('handles nested objects with stable key ordering', () => {
    const config1 = { outer: { b: 2, a: 1 } };
    const config2 = { outer: { a: 1, b: 2 } };
    expect(hashConfig(config1)).toBe(hashConfig(config2));
  });

  it('handles arrays (order-sensitive)', () => {
    const hash1 = hashConfig({ items: [1, 2, 3] });
    const hash2 = hashConfig({ items: [3, 2, 1] });
    expect(hash1).not.toBe(hash2);
  });

  it('handles empty objects', () => {
    const hash = hashConfig({});
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});
