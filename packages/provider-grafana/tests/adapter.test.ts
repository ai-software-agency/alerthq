import { describe, it, expect } from 'vitest';
import { GrafanaAdapter } from '../src/adapter.js';

describe('GrafanaAdapter.initialize', () => {
  it('throws on empty config', async () => {
    const adapter = new GrafanaAdapter();
    await expect(adapter.initialize({})).rejects.toThrow();
  });

  it('throws on missing url', async () => {
    const adapter = new GrafanaAdapter();
    await expect(adapter.initialize({ apiKey: 'tok123' })).rejects.toThrow();
  });

  it('throws on invalid url', async () => {
    const adapter = new GrafanaAdapter();
    await expect(
      adapter.initialize({ url: 'not-a-url', apiKey: 'tok123' }),
    ).rejects.toThrow('[grafana] url must be a valid URL');
  });

  it('accepts valid config with url + apiKey', async () => {
    const adapter = new GrafanaAdapter();
    await expect(
      adapter.initialize({ url: 'https://grafana.example.com', apiKey: 'tok123' }),
    ).resolves.toBeUndefined();
  });

  it('accepts valid config with url + basicAuth', async () => {
    const adapter = new GrafanaAdapter();
    await expect(
      adapter.initialize({
        url: 'https://grafana.example.com',
        basicAuth: { username: 'admin', password: 'secret' },
      }),
    ).resolves.toBeUndefined();
  });

  it('accepts valid config with url only (no auth)', async () => {
    const adapter = new GrafanaAdapter();
    await expect(
      adapter.initialize({ url: 'https://grafana.example.com' }),
    ).resolves.toBeUndefined();
  });
});
