import { describe, it, expect } from 'vitest';
import { AtlasProviderAdapter } from '../src/adapter.js';

describe('AtlasProviderAdapter.initialize', () => {
  it('throws when publicKey is missing', async () => {
    const adapter = new AtlasProviderAdapter();
    await expect(
      adapter.initialize({ privateKey: 'pk', projectIds: ['p1'] }),
    ).rejects.toThrow('[mongodb-atlas] config.publicKey is required');
  });

  it('throws when privateKey is missing', async () => {
    const adapter = new AtlasProviderAdapter();
    await expect(
      adapter.initialize({ publicKey: 'pub', projectIds: ['p1'] }),
    ).rejects.toThrow('[mongodb-atlas] config.privateKey is required');
  });

  it('throws when projectIds is empty', async () => {
    const adapter = new AtlasProviderAdapter();
    await expect(
      adapter.initialize({ publicKey: 'pub', privateKey: 'pk', projectIds: [] }),
    ).rejects.toThrow('[mongodb-atlas] config.projectIds is required');
  });

  it('throws when a projectId is not a string', async () => {
    const adapter = new AtlasProviderAdapter();
    await expect(
      adapter.initialize({ publicKey: 'pub', privateKey: 'pk', projectIds: [42] }),
    ).rejects.toThrow('each projectId must be a string');
  });

  it('succeeds with valid config', async () => {
    const adapter = new AtlasProviderAdapter();
    await expect(
      adapter.initialize({ publicKey: 'pub', privateKey: 'pk', projectIds: ['p1'] }),
    ).resolves.toBeUndefined();
  });
});
