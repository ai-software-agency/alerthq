import type { Context } from './types/config.js';
import { logger } from './utils/logger.js';

/** Result of testing a single connection. */
export interface ConnectionTestResult {
  /** Plugin name (e.g. `'storage:sqlite'` or `'aws-cloudwatch'`). */
  name: string;

  /** Whether the connection test passed. */
  ok: boolean;

  /** Error message if the test failed. */
  error?: string;
}

/**
 * Test connectivity to the storage backend and all enabled providers.
 *
 * Each connection is tested independently — a failure in one does not
 * prevent testing the others. Storage is tested as `'storage:<name>'`.
 *
 * @param ctx - Runtime context from {@link bootstrap}.
 * @returns Array of test results for storage and all providers.
 */
export async function testConnections(ctx: Context): Promise<ConnectionTestResult[]> {
  const { storage, providers } = ctx;
  const results: ConnectionTestResult[] = [];

  // Test storage — StorageProvider doesn't mandate testConnection,
  // so we probe for it at runtime.
  const storageName = `storage:${storage.name}`;
  try {
    const storageAny = storage as unknown as Record<string, unknown>;
    if (typeof storageAny['testConnection'] === 'function') {
      const ok = await (storageAny['testConnection'] as () => Promise<boolean>)();
      results.push({ name: storageName, ok });
    } else {
      results.push({ name: storageName, ok: true });
    }
  } catch (err) {
    results.push({ name: storageName, ok: false, error: (err as Error).message });
  }
  logger.info(`${storageName}: ${results[results.length - 1]!.ok ? 'OK' : 'FAILED'}`);

  // Test each provider
  for (const [name, adapter] of Object.entries(providers)) {
    try {
      const ok = await adapter.testConnection();
      results.push({ name, ok });
    } catch (err) {
      results.push({ name, ok: false, error: (err as Error).message });
    }
    logger.info(`${name}: ${results[results.length - 1]!.ok ? 'OK' : 'FAILED'}`);
  }

  return results;
}
