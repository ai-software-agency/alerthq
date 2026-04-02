import { describe, it, expect, vi } from 'vitest';
import { withRetry } from '../src/utils/retry.js';

describe('withRetry', () => {
  it('returns the value on first success', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await withRetry(fn, { retries: 3, baseDelay: 1 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries and succeeds after transient failures', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValue('recovered');

    const result = await withRetry(fn, { retries: 3, baseDelay: 1 });
    expect(result).toBe('recovered');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('throws the last error after exhausting retries', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('persistent failure'));

    await expect(withRetry(fn, { retries: 2, baseDelay: 1 })).rejects.toThrow(
      'persistent failure',
    );
    expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it('uses default retries (3) when not specified', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'));

    await expect(withRetry(fn, { baseDelay: 1 })).rejects.toThrow('always fails');
    expect(fn).toHaveBeenCalledTimes(4); // initial + 3 retries
  });

  it('applies exponential backoff between retries', async () => {
    const timestamps: number[] = [];
    const fn = vi.fn().mockImplementation(() => {
      timestamps.push(Date.now());
      if (timestamps.length < 3) return Promise.reject(new Error('not yet'));
      return Promise.resolve('done');
    });

    await withRetry(fn, { retries: 3, baseDelay: 50 });

    expect(timestamps.length).toBe(3);
    // First retry delay should be ~50ms, second ~100ms
    const delay1 = timestamps[1]! - timestamps[0]!;
    const delay2 = timestamps[2]! - timestamps[1]!;
    expect(delay1).toBeGreaterThanOrEqual(30);
    expect(delay2).toBeGreaterThanOrEqual(60);
  });

  it('works with zero retries (no retry attempt)', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('immediate'));

    await expect(withRetry(fn, { retries: 0, baseDelay: 1 })).rejects.toThrow('immediate');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
