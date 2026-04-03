import type { ProviderFactory } from '@alerthq/core';
import { ElasticProviderAdapter } from './adapter.js';

export { ElasticProviderAdapter } from './adapter.js';
export type { ElasticProviderConfig, ElasticAuth } from './types.js';

const createElasticProvider: ProviderFactory = () => new ElasticProviderAdapter();

export default createElasticProvider;
