import type { AlertDefinition, Severity } from '@alerthq/core';
import { generateAlertId, hashConfig } from '@alerthq/core';
import type { v1 } from '@datadog/datadog-api-client';

const PROVIDER_NAME = 'datadog';

/**
 * Map Datadog monitor priority (1–5) to a normalized severity level.
 * P1/P2 → critical, P3 → warning, P4/P5 → info, null/undefined → unknown.
 */
export function mapPriority(priority: number | null | undefined): Severity {
  if (priority == null) return 'unknown';
  if (priority <= 2) return 'critical';
  if (priority === 3) return 'warning';
  return 'info';
}

const MENTION_RE = /(?:^|\s)(@[a-zA-Z0-9_.+@-]+)/g;

/**
 * Extract @-mention notification targets from a Datadog monitor message.
 * Captures targets like @slack-channel, @pagerduty-service, @user\@email.com.
 */
export function extractNotificationTargets(message: string | undefined): string[] {
  if (!message) return [];
  const targets: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = MENTION_RE.exec(message)) !== null) {
    targets.push(match[1]);
  }
  return targets;
}

/**
 * Convert a Datadog tags array (`['env:prod', 'team:sre', 'standalone']`)
 * to a Record. Tags without `:` get an empty-string value.
 */
export function tagsToRecord(tags: string[] | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  if (!tags) return result;
  for (const tag of tags) {
    const idx = tag.indexOf(':');
    if (idx === -1) {
      result[tag] = '';
    } else {
      result[tag.slice(0, idx)] = tag.slice(idx + 1);
    }
  }
  return result;
}

/**
 * Map a Datadog Monitor to a normalized AlertDefinition.
 */
export function mapMonitorToAlertDefinition(monitor: v1.Monitor): AlertDefinition {
  const sourceId = String(monitor.id ?? '');

  const rawConfig: Record<string, unknown> = { ...monitor };

  return {
    id: generateAlertId(PROVIDER_NAME, sourceId),
    version: 0,
    source: PROVIDER_NAME,
    sourceId,
    name: monitor.name ?? '',
    description: monitor.message ?? '',
    enabled: true,
    severity: mapPriority(monitor.priority),
    conditionSummary: `${String(monitor.type ?? 'unknown')}: ${monitor.query ?? ''}`,
    notificationTargets: extractNotificationTargets(monitor.message),
    tags: tagsToRecord(monitor.tags),
    owner: monitor.creator?.handle ?? '',
    rawConfig,
    configHash: hashConfig(rawConfig),
    lastModifiedAt: monitor.modified ? monitor.modified.toISOString() : null,
    discoveredAt: new Date().toISOString(),
  };
}
