import { describe, it, expect } from 'vitest';
import { ElasticProviderAdapter } from '../src/adapter.js';

describe('ElasticProviderAdapter.initialize', () => {
  it('throws when url is missing', async () => {
    const adapter = new ElasticProviderAdapter();
    await expect(
      adapter.initialize({ auth: { type: 'basic', username: 'u', password: 'p' } }),
    ).rejects.toThrow('[elastic] config.url is required');
  });

  it('throws when auth is missing', async () => {
    const adapter = new ElasticProviderAdapter();
    await expect(
      adapter.initialize({ url: 'http://localhost:9200' }),
    ).rejects.toThrow('[elastic] config.auth is required');
  });

  it('throws when auth type is invalid', async () => {
    const adapter = new ElasticProviderAdapter();
    await expect(
      adapter.initialize({ url: 'http://localhost:9200', auth: { type: 'oauth' } }),
    ).rejects.toThrow('must be "basic" or "apiKey"');
  });

  it('throws when basic auth missing username', async () => {
    const adapter = new ElasticProviderAdapter();
    await expect(
      adapter.initialize({
        url: 'http://localhost:9200',
        auth: { type: 'basic', password: 'p' },
      }),
    ).rejects.toThrow('username and password');
  });

  it('throws when apiKey auth missing apiKey', async () => {
    const adapter = new ElasticProviderAdapter();
    await expect(
      adapter.initialize({
        url: 'http://localhost:9200',
        auth: { type: 'apiKey' },
      }),
    ).rejects.toThrow('apiKey auth requires apiKey');
  });
});
