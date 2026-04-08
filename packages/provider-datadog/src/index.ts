import type { ProviderFactory } from '@alerthq/core';
import { DatadogAdapter } from './adapter.js';

export { DatadogAdapter } from './adapter.js';
export { DatadogApiClient } from './client.js';
export { mapMonitorToAlertDefinition } from './mapper.js';
export type { DatadogProviderConfig } from './types.js';
export { datadogConfigSchema as configSchema } from './schema.js';

/**
 * Factory function — default export as required by the plugin contract.
 */
const createProvider: ProviderFactory = () => new DatadogAdapter();
export default createProvider;
