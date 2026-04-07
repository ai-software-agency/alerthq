import { bootstrap, logger } from '@alerthq/core';
import type { Context } from '@alerthq/core';

/**
 * Wrap a CLI command handler with bootstrap/dispose lifecycle and error handling.
 *
 * Bootstraps the context, passes it to the handler, disposes resources,
 * and exits with code 1 on any error.
 */
export async function withContext(fn: (ctx: Context) => Promise<void>): Promise<void> {
  let ctx: Context | undefined;
  try {
    ctx = await bootstrap();
    await fn(ctx);
  } catch (err) {
    logger.error((err as Error).message);
    process.exitCode = 1;
  } finally {
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
