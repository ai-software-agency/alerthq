import { v4 as uuidv4 } from 'uuid';
import type { Context } from './types/config.js';
import type { AlertDefinition, Severity } from './types/alert.js';
import { generateAlertId } from './utils/id.js';
import { hashConfig } from './utils/hash.js';
import { logger } from './utils/logger.js';

/**
 * Get all alert definitions for a given version, merged with manual alerts
 * (version 0) and overlay tags.
 *
 * If no version is specified, the latest sync version is used. Manual alerts
 * are always included regardless of version. Overlay tags are merged on top
 * of provider-discovered tags (overlay wins on conflict).
 *
 * @param ctx - Runtime context from {@link bootstrap}.
 * @param version - Specific version number, or omit for latest.
 * @returns Array of alert definitions with merged tags.
 */
export async function getAlerts(ctx: Context, version?: number): Promise<AlertDefinition[]> {
  const { storage } = ctx;

  let targetVersion = version;
  if (targetVersion === undefined) {
    const latestRun = await storage.getLatestSyncRun();
    targetVersion = latestRun?.version;
  }

  const alerts: AlertDefinition[] = [];

  if (targetVersion !== undefined) {
    const versionAlerts = await storage.getAlertDefinitions(targetVersion);
    alerts.push(...versionAlerts);
  }

  const manualAlerts = await storage.getAlertDefinitions(0);
  alerts.push(...manualAlerts);

  for (const alert of alerts) {
    const overlayTags = await storage.getOverlayTags(alert.id);
    alert.tags = { ...alert.tags, ...overlayTags };
  }

  return alerts;
}

/** Input for creating a manual alert. */
export interface ManualAlertInput {
  /** Alert name (required). */
  name: string;

  /** Alert description. */
  description?: string;

  /** Severity level (required). */
  severity: Severity;

  /** Condition summary. */
  conditionSummary?: string;

  /** Alert owner. */
  owner?: string;

  /** Initial tags. */
  tags?: Record<string, string>;
}

/**
 * Add a manual alert definition (stored at version 0).
 *
 * Generates a UUID as the sourceId, computes a deterministic ID via
 * `generateAlertId('manual', uuid)`, and persists to version 0.
 *
 * @param ctx - Runtime context from {@link bootstrap}.
 * @param input - Manual alert fields.
 * @returns The created alert definition.
 */
export async function addManualAlert(
  ctx: Context,
  input: ManualAlertInput,
): Promise<AlertDefinition> {
  const { storage } = ctx;
  const sourceId = uuidv4();
  const id = generateAlertId('manual', sourceId);
  const now = new Date().toISOString();

  const alert: AlertDefinition = {
    id,
    version: 0,
    source: 'manual',
    sourceId,
    name: input.name,
    description: input.description ?? '',
    enabled: true,
    severity: input.severity,
    conditionSummary: input.conditionSummary ?? '',
    notificationTargets: [],
    tags: input.tags ?? {},
    owner: input.owner ?? '',
    rawConfig: {},
    configHash: hashConfig({}),
    lastModifiedAt: null,
    discoveredAt: now,
  };

  await storage.saveAlertDefinitions(0, [alert]);
  logger.info(`Added manual alert: ${alert.name} (${alert.id})`);

  return alert;
}

/**
 * Remove a manual alert definition by ID or short-ID prefix.
 *
 * Only version 0 (manual) alerts can be removed. Uses prefix matching:
 * - 1 match → remove it
 * - 0 matches → throw "not found"
 * - 2+ matches → throw listing ambiguous candidates
 *
 * @param ctx - Runtime context from {@link bootstrap}.
 * @param idOrPrefix - Full or prefix alert ID.
 * @returns `true` if the alert was found and removed.
 * @throws If no match or ambiguous match.
 */
export async function removeManualAlert(ctx: Context, idOrPrefix: string): Promise<boolean> {
  const { storage } = ctx;

  const matches = await storage.findAlertsByIdPrefix(0, idOrPrefix);

  if (matches.length === 0) {
    throw new Error(`No manual alert found matching '${idOrPrefix}'`);
  }

  if (matches.length > 1) {
    const candidates = matches.map((a) => `  ${a.id}  ${a.name}`).join('\n');
    throw new Error(`Ambiguous ID prefix '${idOrPrefix}'. Candidates:\n${candidates}`);
  }

  const alert = matches[0]!;
  const removed = await storage.removeAlertDefinition(0, alert.id);
  if (removed) {
    logger.info(`Removed manual alert: ${alert.name} (${alert.id})`);
  }
  return removed;
}
