import type { Context } from './types/config.js';
import { loadConfig } from './loader/config-loader.js';
import { loadStoragePlugin, loadProviderPlugins } from './loader/plugin-loader.js';
import { logger } from './utils/logger.js';

/**
 * Bootstrap the alerthq runtime context.
 *
 * Performs the full startup sequence:
 * 1. Load `.env` via dotenv
 * 2. Parse the YAML config file and resolve `${VAR}` references
 * 3. Validate config against the Zod schema
 * 4. Load and initialize the storage plugin
 * 5. Load and initialize all enabled provider plugins
 * 6. Return a {@link Context} with a `dispose()` method for cleanup
 *
 * @param configPath - Path to the YAML config file (default: `./alerthq.config.yml`).
 * @returns Initialized runtime context.
 * @throws If config is invalid, plugins are missing, or initialization fails.
 */
export async function bootstrap(configPath?: string): Promise<Context> {
  logger.info('Bootstrapping alerthq...');

  const config = await loadConfig(configPath);
  logger.debug('Configuration loaded and validated');

  const storage = await loadStoragePlugin(config);
  const providers = await loadProviderPlugins(config);

  logger.info(
    `Ready: storage=${storage.name}, providers=[${Object.keys(providers).join(', ')}]`,
  );

  return {
    config,
    storage,
    providers,
    async dispose() {
      logger.debug('Disposing plugins...');
      const errors: Error[] = [];

      for (const [name, provider] of Object.entries(providers)) {
        try {
          await provider.dispose?.();
        } catch (err) {
          errors.push(
            new Error(`Failed to dispose provider '${name}': ${(err as Error).message}`),
          );
        }
      }

      try {
        await storage.dispose?.();
      } catch (err) {
        errors.push(
          new Error(`Failed to dispose storage '${storage.name}': ${(err as Error).message}`),
        );
      }

      if (errors.length > 0) {
        logger.warn(`Dispose completed with ${errors.length} error(s)`);
        for (const e of errors) logger.warn(e.message);
      }

      logger.debug('All plugins disposed');
    },
  };
}
