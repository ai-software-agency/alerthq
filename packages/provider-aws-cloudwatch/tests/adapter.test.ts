import { describe, it, expect } from 'vitest';
import { CloudWatchAdapter } from '../src/adapter.js';

describe('CloudWatchAdapter.initialize', () => {
  it('throws when regions is missing', async () => {
    const adapter = new CloudWatchAdapter();
    await expect(adapter.initialize({})).rejects.toThrow(
      'non-empty "regions" array',
    );
  });

  it('throws when regions is an empty array', async () => {
    const adapter = new CloudWatchAdapter();
    await expect(adapter.initialize({ regions: [] })).rejects.toThrow(
      'non-empty "regions" array',
    );
  });

  it('throws when regions contains a non-string', async () => {
    const adapter = new CloudWatchAdapter();
    await expect(adapter.initialize({ regions: [123] })).rejects.toThrow(
      'Invalid region value',
    );
  });

  it('succeeds with valid regions', async () => {
    const adapter = new CloudWatchAdapter();
    await expect(
      adapter.initialize({ regions: ['us-east-1'] }),
    ).resolves.toBeUndefined();
  });
});
