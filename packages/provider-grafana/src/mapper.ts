import type { AlertDefinition, Severity } from '@alerthq/core';
import { generateAlertId, hashConfig } from '@alerthq/core';
import type { GrafanaAlertRule, GrafanaContactPoint } from './types.js';

const PROVIDER_NAME = 'grafana';
const VALID_SEVERITIES = new Set<string>(['critical', 'warning', 'info']);

/**
 * Map a Grafana alert rule to an AlertDefinition.
 */
export function mapAlertRuleToAlertDefinition(
  rule: GrafanaAlertRule,
  _contactPoints: GrafanaContactPoint[],
): AlertDefinition {
  const sourceId = rule.uid;
  const raw = rule as unknown as Record<string, unknown>;

  return {
    id: generateAlertId(PROVIDER_NAME, sourceId),
    version: 0,
    source: PROVIDER_NAME,
    sourceId,
    name: rule.title,
    description: rule.annotations?.description ?? rule.annotations?.summary ?? '',
    enabled: !rule.isPaused,
    severity: mapSeverityLabel(rule.labels),
    conditionSummary: buildConditionSummary(rule),
    notificationTargets: extractNotificationTargets(rule),
    tags: rule.labels ?? {},
    owner: '',
    rawConfig: raw,
    configHash: hashConfig(raw),
    lastModifiedAt: rule.updated || null,
    discoveredAt: new Date().toISOString(),
  };
}

/**
 * Map a severity label value to a normalized Severity.
 */
export function mapSeverityLabel(labels: Record<string, string> | undefined): Severity {
  const raw = labels?.severity;
  if (raw && VALID_SEVERITIES.has(raw)) return raw as Severity;
  return 'unknown';
}

/**
 * Build a human-readable condition summary from a Grafana alert rule.
 */
export function buildConditionSummary(rule: GrafanaAlertRule): string {
  const parts: string[] = [];

  const conditionQuery = rule.data?.find((q) => q.refId === rule.condition);
  if (conditionQuery?.model?.type === 'classic_conditions') {
    const conditions = conditionQuery.model.conditions as
      | Array<{
          evaluator?: { type?: string; params?: number[] };
          query?: { params?: string[] };
          reducer?: { type?: string };
        }>
      | undefined;

    if (conditions && conditions.length > 0) {
      for (const c of conditions) {
        const evalType = c.evaluator?.type ?? '';
        const evalParams = c.evaluator?.params?.join(', ') ?? '';
        const queryRef = c.query?.params?.[0] ?? '';
        const reducer = c.reducer?.type ?? '';
        parts.push(`${queryRef} ${reducer} ${evalType} ${evalParams}`.trim());
      }
    } else {
      parts.push(`Condition ${rule.condition}`);
    }
  } else {
    parts.push(`Condition ${rule.condition}`);
  }

  if (rule.for) {
    parts.push(`for ${rule.for}`);
  }

  return parts.join('; ');
}

/**
 * Extract notification targets from rule notification_settings.
 */
function extractNotificationTargets(rule: GrafanaAlertRule): string[] {
  const targets: string[] = [];

  if (rule.notification_settings?.receiver) {
    targets.push(rule.notification_settings.receiver);
  }

  return targets;
}
