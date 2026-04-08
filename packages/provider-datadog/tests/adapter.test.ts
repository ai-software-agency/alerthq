import { describe, it, expect } from 'vitest';
import { DatadogAdapter } from '../src/adapter.js';

describe('DatadogAdapter.initialize', () => {
  it('throws on empty config', async () => {
    const adapter = new DatadogAdapter();
    await expect(adapter.initialize({})).rejects.toThrow();
  });

  it('throws on missing apiKey', async () => {
    const adapter = new DatadogAdapter();
    await expect(adapter.initialize({ appKey: 'some-app-key' })).rejects.toThrow();
  });

  it('throws on missing appKey', async () => {
    const adapter = new DatadogAdapter();
    await expect(adapter.initialize({ apiKey: 'some-api-key' })).rejects.toThrow();
  });

  it('throws on empty apiKey', async () => {
    const adapter = new DatadogAdapter();
    await expect(adapter.initialize({ apiKey: '', appKey: 'some-app-key' })).rejects.toThrow(
      '[datadog] apiKey is required',
    );
  });

  it('throws on empty appKey', async () => {
    const adapter = new DatadogAdapter();
    await expect(adapter.initialize({ apiKey: 'some-api-key', appKey: '' })).rejects.toThrow(
      '[datadog] appKey is required',
    );
  });

  it('accepts valid config with apiKey + appKey', async () => {
    const adapter = new DatadogAdapter();
    await expect(
      adapter.initialize({ apiKey: 'dd-api-key-123', appKey: 'dd-app-key-456' }),
    ).resolves.toBeUndefined();
  });

  it('accepts valid config with optional site', async () => {
    const adapter = new DatadogAdapter();
    await expect(
      adapter.initialize({
        apiKey: 'dd-api-key-123',
        appKey: 'dd-app-key-456',
        site: 'datadoghq.eu',
      }),
    ).resolves.toBeUndefined();
  });
});
