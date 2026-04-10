import { describe, it, expect } from 'vitest';
import { ElasticProviderAdapter } from '../src/adapter.js';

describe('ElasticProviderAdapter.initialize', () => {
  it('throws when neither url nor kibanaUrl is provided', async () => {
    const adapter = new ElasticProviderAdapter();
    await expect(
      adapter.initialize({ auth: { type: 'basic', username: 'u', password: 'p' } }),
    ).rejects.toThrow('at least one of config.url or config.kibanaUrl is required');
  });

  it('accepts config with only url', async () => {
    const adapter = new ElasticProviderAdapter();
    await expect(
      adapter.initialize({
        url: 'http://localhost:9200',
        auth: { type: 'apiKey', apiKey: 'test-key' },
      }),
    ).resolves.toBeUndefined();
  });

  it('accepts config with only kibanaUrl', async () => {
    const adapter = new ElasticProviderAdapter();
    await expect(
      adapter.initialize({
        kibanaUrl: 'http://localhost:5601',
        auth: { type: 'apiKey', apiKey: 'test-key' },
      }),
    ).resolves.toBeUndefined();
  });

  it('accepts config with both url and kibanaUrl', async () => {
    const adapter = new ElasticProviderAdapter();
    await expect(
      adapter.initialize({
        url: 'http://localhost:9200',
        kibanaUrl: 'http://localhost:5601',
        auth: { type: 'apiKey', apiKey: 'test-key' },
      }),
    ).resolves.toBeUndefined();
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
