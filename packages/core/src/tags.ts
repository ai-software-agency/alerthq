import type { Context } from './types/config.js';
import { logger } from './utils/logger.js';

/**
 * Resolve an ID prefix to a single alert across all versions.
 *
 * Checks the latest version and version 0 (manual). Throws if zero
 * or multiple matches are found.
 */
async function resolveAlertByPrefix(ctx: Context, idOrPrefix: string): Promise<string> {
  const { storage } = ctx;

  const latestRun = await storage.getLatestSyncRun();
  const latestVersion = latestRun?.version;

  const allMatches = new Map<string, string>();

  if (latestVersion !== undefined) {
    const matches = await storage.findAlertsByIdPrefix(latestVersion, idOrPrefix);
    for (const m of matches) allMatches.set(m.id, m.name);
  }

  const manualMatches = await storage.findAlertsByIdPrefix(0, idOrPrefix);
  for (const m of manualMatches) allMatches.set(m.id, m.name);

  if (allMatches.size === 0) {
    throw new Error(`No alert found matching '${idOrPrefix}'`);
  }

  if (allMatches.size > 1) {
    const candidates = Array.from(allMatches.entries())
      .map(([id, name]) => `  ${id}  ${name}`)
      .join('\n');
    throw new Error(`Ambiguous ID prefix '${idOrPrefix}'. Candidates:\n${candidates}`);
  }

  return allMatches.keys().next().value!;
}

/**
 * Set an overlay tag on an alert definition.
 *
 * Overlay tags are stored separately and merged on top of provider-discovered
 * tags at read time. The overlay value wins on conflict.
 *
 * @param ctx - Runtime context from {@link bootstrap}.
 * @param idOrPrefix - Full or prefix alert ID.
 * @param key - Tag key.
 * @param value - Tag value.
 * @throws If no match or ambiguous match.
 */
export async function setTag(
  ctx: Context,
  idOrPrefix: string,
  key: string,
  value: string,
): Promise<void> {
  const alertId = await resolveAlertByPrefix(ctx, idOrPrefix);
  await ctx.storage.setOverlayTag(alertId, key, value);
  logger.info(`Set tag ${key}=${value} on alert ${alertId}`);
}

/**
 * Remove an overlay tag from an alert definition.
 *
 * @param ctx - Runtime context from {@link bootstrap}.
 * @param idOrPrefix - Full or prefix alert ID.
 * @param key - Tag key to remove.
 * @returns `true` if the tag existed and was removed.
 * @throws If no match or ambiguous match.
 */
export async function removeTag(ctx: Context, idOrPrefix: string, key: string): Promise<boolean> {
  const alertId = await resolveAlertByPrefix(ctx, idOrPrefix);
  const removed = await ctx.storage.removeOverlayTag(alertId, key);
  if (removed) {
    logger.info(`Removed tag '${key}' from alert ${alertId}`);
  }
  return removed;
}
