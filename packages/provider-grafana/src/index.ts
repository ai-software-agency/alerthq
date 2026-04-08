import type { ProviderFactory } from '@alerthq/core';
import { GrafanaAdapter } from './adapter.js';

export { GrafanaAdapter } from './adapter.js';
export { GrafanaApiClient } from './client.js';
export { mapAlertRuleToAlertDefinition } from './mapper.js';
export type { GrafanaProviderConfig, GrafanaAlertRule, GrafanaContactPoint } from './types.js';
export { grafanaConfigSchema as configSchema } from './schema.js';

const createProvider: ProviderFactory = () => new GrafanaAdapter();
export default createProvider;
