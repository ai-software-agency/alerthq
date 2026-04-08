import type { ProviderFactory } from '@alerthq/core';
import { AzureMonitorProviderAdapter } from './adapter.js';

export { AzureMonitorProviderAdapter } from './adapter.js';
export type { AzureMonitorProviderConfig } from './types.js';
export { azureMonitorConfigSchema as configSchema } from './schema.js';

const createAzureMonitorProvider: ProviderFactory = () => new AzureMonitorProviderAdapter();

export default createAzureMonitorProvider;
