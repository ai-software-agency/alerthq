import type { ProviderFactory } from '@alerthq/core';
import { CloudWatchAdapter } from './adapter.js';

export { CloudWatchAdapter } from './adapter.js';
export { CloudWatchApiClient } from './client.js';
export { mapAlarmToAlertDefinition } from './mapper.js';
export type { CloudWatchProviderConfig, CloudWatchAlarmWithTags } from './types.js';
export { tagsToRecord } from './types.js';
export { cloudwatchConfigSchema as configSchema } from './schema.js';

/**
 * Factory function — default export as required by the plugin contract.
 */
const createProvider: ProviderFactory = () => new CloudWatchAdapter();
export default createProvider;
