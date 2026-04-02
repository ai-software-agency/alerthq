import type { ProviderAdapter } from '../interfaces/provider.js';
import type { StorageProvider } from '../interfaces/storage.js';
import type { AlerthqConfig, ProviderConfig } from '../types/config.js';
import { logger } from '../utils/logger.js';

const REQUIRED_STORAGE_METHODS = [
  'initialize',
  'createSyncRun',
  'getLatestSyncRun',
  'getSyncRun',
  'listSyncRuns',
  'saveAlertDefinitions',
  'getAlertDefinitions',
  'removeAlertDefinition',
  'findAlertsByIdPrefix',
  'getChanges',
  'setOverlayTag',
  'removeOverlayTag',
  'getOverlayTags',
] as const;

const REQUIRED_PROVIDER_METHODS = ['initialize', 'fetchAlerts', 'testConnection'] as const;

/**
 * Resolve a short provider/storage name to a package specifier.
 *
 * - `'sqlite'` → `'@alerthq/storage-sqlite'`
 * - `'aws-cloudwatch'` → `'@alerthq/provider-aws-cloudwatch'`
 * - Explicit `package` field is returned as-is (for third-party/local plugins).
 */
function resolveStoragePackage(providerName: string): string {
  return `@alerthq/storage-${providerName}`;
}

function resolveProviderPackage(providerName: string, config: ProviderConfig): string {
  if (config.package) {
    return config.package;
  }
  return `@alerthq/provider-${providerName}`;
}

/**
 * Dynamically import a module and return its default export.
 *
 * @throws With an actionable install message if the import fails.
 */
async function importPlugin(packageName: string): Promise<unknown> {
  try {
    const mod = await import(packageName);
    return mod.default ?? mod;
  } catch {
    throw new Error(
      `Plugin '${packageName}' not found.\nInstall it with: pnpm add ${packageName}`,
    );
  }
}

/**
 * Duck-type check that an object has the required properties (string `name` + methods).
 *
 * @throws With a clear message listing which methods are missing.
 */
function validatePlugin(
  obj: unknown,
  requiredMethods: readonly string[],
  pluginType: string,
  packageName: string,
): void {
  if (typeof obj !== 'object' || obj === null) {
    throw new Error(
      `Plugin '${packageName}' factory did not return an object. ` +
        `Expected a ${pluginType} instance.`,
    );
  }

  const instance = obj as Record<string, unknown>;

  if (typeof instance['name'] !== 'string' || instance['name'].length === 0) {
    throw new Error(
      `Plugin '${packageName}' is missing a 'name' property (expected a non-empty string).`,
    );
  }

  const missing = requiredMethods.filter((method) => typeof instance[method] !== 'function');
  if (missing.length > 0) {
    throw new Error(
      `Plugin '${packageName}' is missing required methods: ${missing.join(', ')}. ` +
        `Expected a valid ${pluginType} implementation.`,
    );
  }
}

/**
 * Load and initialize the storage plugin specified in the config.
 *
 * Resolution: `storage.provider: 'sqlite'` → `import('@alerthq/storage-sqlite')`.
 * The imported module must default-export a factory function returning a
 * {@link StorageProvider}.
 *
 * @param config - Resolved alerthq configuration.
 * @returns Initialized storage provider.
 * @throws If the plugin cannot be found, is invalid, or fails to initialize.
 */
export async function loadStoragePlugin(config: AlerthqConfig): Promise<StorageProvider> {
  const providerName = config.storage.provider;
  const packageName = resolveStoragePackage(providerName);

  logger.debug(`Loading storage plugin: ${packageName}`);

  const factory = await importPlugin(packageName);

  if (typeof factory !== 'function') {
    throw new Error(
      `Plugin '${packageName}' does not export a factory function as its default export.`,
    );
  }

  const instance = (factory as () => unknown)();
  validatePlugin(instance, REQUIRED_STORAGE_METHODS, 'StorageProvider', packageName);

  const storage = instance as StorageProvider;
  const storageConfig = (config.storage[providerName] as Record<string, unknown>) ?? {};
  await storage.initialize(storageConfig);

  logger.info(`Storage plugin loaded: ${storage.name}`);
  return storage;
}

/**
 * Load and initialize all enabled provider plugins from the config.
 *
 * Each provider entry is resolved by convention (`'aws-cloudwatch'` →
 * `'@alerthq/provider-aws-cloudwatch'`) or by explicit `package` field.
 * Providers with `enabled: false` are skipped.
 *
 * @param config - Resolved alerthq configuration.
 * @returns Map of provider name → initialized adapter.
 * @throws If any enabled plugin cannot be found, is invalid, or fails to initialize.
 */
export async function loadProviderPlugins(
  config: AlerthqConfig,
): Promise<Record<string, ProviderAdapter>> {
  const providers: Record<string, ProviderAdapter> = {};

  for (const [name, providerConfig] of Object.entries(config.providers)) {
    if (providerConfig.enabled === false) {
      logger.debug(`Skipping disabled provider: ${name}`);
      continue;
    }

    const packageName = resolveProviderPackage(name, providerConfig);
    logger.debug(`Loading provider plugin: ${packageName}`);

    const factory = await importPlugin(packageName);

    if (typeof factory !== 'function') {
      throw new Error(
        `Plugin '${packageName}' does not export a factory function as its default export.`,
      );
    }

    const instance = (factory as () => unknown)();
    validatePlugin(instance, REQUIRED_PROVIDER_METHODS, 'ProviderAdapter', packageName);

    const adapter = instance as ProviderAdapter;

    const { enabled: _, package: _pkg, ...pluginConfig } = providerConfig;
    await adapter.initialize(pluginConfig as Record<string, unknown>);

    logger.info(`Provider plugin loaded: ${adapter.name}`);
    providers[name] = adapter;
  }

  return providers;
}
