import { bootstrap, logger } from '@alerthq/core';
import type { Context } from '@alerthq/core';

/**
 * Wrap a CLI command handler with bootstrap/dispose lifecycle, signal
 * handling, and error handling.
 *
 * Registers SIGINT/SIGTERM handlers that call `dispose()` before exiting,
 * ensuring database connections and SDK clients are cleaned up even on
 * Ctrl+C during long-running operations like `sync`.
 */
export async function withContext(fn: (ctx: Context) => Promise<void>): Promise<void> {
  let ctx: Context | undefined;

  const onSignal = async () => {
    logger.warn('Received shutdown signal, cleaning up...');
    await ctx?.dispose();
    process.exit(1);
  };
  process.on('SIGINT', onSignal);
  process.on('SIGTERM', onSignal);

  try {
    ctx = await bootstrap();
    await fn(ctx);
  } catch (err) {
    logger.error((err as Error).message);
    process.exitCode = 1;
  } finally {
    process.removeListener('SIGINT', onSignal);
    process.removeListener('SIGTERM', onSignal);
    await ctx?.dispose();
  }
}

/** Standard columns for the alert list table. */
export const ALERT_LIST_COLUMNS = [
  'id',
  'source',
  'name',
  'severity',
  'enabled',
  'owner',
] as const;

/** Standard columns for the sync run (versions) table. */
export const VERSION_COLUMNS = [
  'version',
  'name',
  'description',
  'createdAt',
  'alertCount',
] as const;

/** Standard columns for the diff table. */
export const DIFF_COLUMNS = [
  'change',
  'id',
  'name',
  'source',
  'severity',
] as const;

/** Standard columns for the connection test table. */
export const CONNECTION_TEST_COLUMNS = [
  'name',
  'status',
  'error',
] as const;
