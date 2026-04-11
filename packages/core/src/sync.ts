import type { Context } from './types/config.js';
import type { AlertDefinition } from './types/alert.js';
import type { SyncRun } from './types/sync-run.js';
import { logger } from './utils/logger.js';

/** Options for the {@link sync} function. */
export interface SyncOptions {
  /** Sync only a specific provider (by config key). */
  provider?: string;

  /** Human-readable name for this sync run. Defaults to `"Sync <timestamp>"`. */
  name?: string;

  /** Optional description / context for this sync run. */
  description?: string;

  /** AbortSignal to cancel the sync run early (e.g. on SIGINT). */
  signal?: AbortSignal;
}

/**
 * Fetch alert definitions from all (or one) providers, compare against the
 * latest stored version, and persist a new version if changes are detected.
 *
 * If no changes are detected (identical `(id, configHash)` set), no version
 * is created and `null` is returned.
 *
 * Partial failures are tolerated: if one provider errors, the run continues
 * and the `providerStatus` records the outcome per provider.
 *
 * @param ctx - Runtime context from {@link bootstrap}.
 * @param opts - Optional sync configuration.
 * @returns The new {@link SyncRun} if changes were found, or `null` if identical.
 */
export async function sync(ctx: Context, opts?: SyncOptions): Promise<SyncRun | null> {
  const { storage, providers } = ctx;

  const providerEntries = opts?.provider
    ? Object.entries(providers).filter(([name]) => name === opts.provider)
    : Object.entries(providers);

  if (opts?.provider && providerEntries.length === 0) {
    throw new Error(`Provider '${opts.provider}' is not configured or not enabled`);
  }

  const allAlerts: AlertDefinition[] = [];
  const providerStatus: Record<string, 'success' | 'error' | 'skipped'> = {};

  for (const [name] of Object.entries(providers)) {
    if (!providerEntries.some(([n]) => n === name)) {
      providerStatus[name] = 'skipped';
    }
  }

  for (const [name, adapter] of providerEntries) {
    if (opts?.signal?.aborted) {
      throw opts.signal.reason ?? new Error('Sync aborted');
    }

    try {
      logger.info(`Fetching alerts from ${name}...`);
      const alerts = await adapter.fetchAlerts();
      allAlerts.push(...alerts);
      providerStatus[name] = 'success';
      logger.info(`Fetched ${alerts.length} alerts from ${name}`);
    } catch (err) {
      providerStatus[name] = 'error';
      logger.error(`Failed to fetch from ${name}: ${(err as Error).message}`);
    }
  }

  if (opts?.signal?.aborted) {
    throw opts.signal.reason ?? new Error('Sync aborted');
  }

  const latestRun = await storage.getLatestSyncRun();

  if (opts?.provider && latestRun) {
    const targetedSources = new Set(providerEntries.flatMap(([, a]) => [...a.sources]));
    const previousAlerts = await storage.getAlertDefinitions(latestRun.version);
    allAlerts.push(...previousAlerts.filter((a) => !targetedSources.has(a.source)));
  }

  if (latestRun) {
    const latestAlerts = await storage.getAlertDefinitions(latestRun.version);
    if (isSameAlertSet(latestAlerts, allAlerts)) {
      logger.info('No changes detected');
      return null;
    }
  }

  const newVersion = latestRun ? latestRun.version + 1 : 1;
  const now = new Date().toISOString();
  const runName = opts?.name ?? `Sync ${now.replace('T', ' ').slice(0, 16)}`;

  const run: SyncRun = {
    version: newVersion,
    name: runName,
    description: opts?.description ?? '',
    createdAt: now,
    providerStatus,
  };

  await storage.createSyncRun(run);
  await storage.saveAlertDefinitions(newVersion, allAlerts);

  logger.info(`Created version ${newVersion}: ${runName}`);
  return run;
}

/**
 * Compare two alert sets by `(id, configHash)` pairs.
 * Order-independent.
 */
function isSameAlertSet(a: AlertDefinition[], b: AlertDefinition[]): boolean {
  if (a.length !== b.length) return false;

  const setA = new Set(a.map((alert) => `${alert.id}:${alert.configHash}`));
  return b.every((alert) => setA.has(`${alert.id}:${alert.configHash}`));
}
