import type { ProviderFactory } from '@alerthq/core';
import { GcpMonitoringAdapter } from './adapter.js';

export { GcpMonitoringAdapter } from './adapter.js';
export { GcpMonitoringApiClient } from './client.js';
export { mapAlertPolicyToAlertDefinition } from './mapper.js';
export type { GcpMonitoringProviderConfig } from './types.js';
export { gcpMonitoringConfigSchema as configSchema } from './schema.js';

const createProvider: ProviderFactory = () => new GcpMonitoringAdapter();
export default createProvider;
