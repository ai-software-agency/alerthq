import { describe, it, expect } from 'vitest';
import { AzureMonitorProviderAdapter } from '../src/adapter.js';

describe('AzureMonitorProviderAdapter.initialize', () => {
  it('throws when subscriptionIds is missing', async () => {
    const adapter = new AzureMonitorProviderAdapter();
    await expect(adapter.initialize({})).rejects.toThrow(
      '[azure-monitor] config.subscriptionIds is required',
    );
  });

  it('throws when subscriptionIds is empty', async () => {
    const adapter = new AzureMonitorProviderAdapter();
    await expect(adapter.initialize({ subscriptionIds: [] })).rejects.toThrow(
      '[azure-monitor] config.subscriptionIds is required',
    );
  });

  it('throws when a subscriptionId is not a string', async () => {
    const adapter = new AzureMonitorProviderAdapter();
    await expect(
      adapter.initialize({ subscriptionIds: [123] }),
    ).rejects.toThrow('each subscriptionId must be a string');
  });
});
