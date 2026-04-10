import { describe, it, expect } from 'vitest';
import { GcpMonitoringAdapter } from '../src/adapter.js';

describe('GcpMonitoringAdapter.initialize', () => {
  it('throws on empty config', async () => {
    const adapter = new GcpMonitoringAdapter();
    await expect(adapter.initialize({})).rejects.toThrow('[gcp-monitoring]');
  });

  it('throws on missing projectId', async () => {
    const adapter = new GcpMonitoringAdapter();
    await expect(adapter.initialize({ projectId: '' })).rejects.toThrow('projectId is required');
  });

  it('throws when projectId is not a string', async () => {
    const adapter = new GcpMonitoringAdapter();
    await expect(adapter.initialize({ projectId: 123 })).rejects.toThrow('[gcp-monitoring]');
  });

  it('accepts valid config with projectId', async () => {
    const adapter = new GcpMonitoringAdapter();
    await expect(adapter.initialize({ projectId: 'my-gcp-project' })).resolves.toBeUndefined();
  });

  it('accepts config with optional keyFilename', async () => {
    const adapter = new GcpMonitoringAdapter();
    await expect(
      adapter.initialize({
        projectId: 'my-gcp-project',
        keyFilename: '/path/to/service-account.json',
      }),
    ).resolves.toBeUndefined();
  });

  it('accepts config with optional credentials', async () => {
    const adapter = new GcpMonitoringAdapter();
    await expect(
      adapter.initialize({
        projectId: 'my-gcp-project',
        credentials: {
          client_email: 'sa@project.iam.gserviceaccount.com',
          private_key: '-----BEGIN PRIVATE KEY-----\nfake\n-----END PRIVATE KEY-----\n',
        },
      }),
    ).resolves.toBeUndefined();
  });
});
