import type { ProviderFactory } from '@alerthq/core';
import { AtlasProviderAdapter } from './adapter.js';

export { AtlasProviderAdapter } from './adapter.js';
export { DigestAuthClient } from './client.js';
export type { AtlasProviderConfig } from './types.js';

const createAtlasProvider: ProviderFactory = () => new AtlasProviderAdapter();

export default createAtlasProvider;
