import type { AlertDefinition, Severity } from '@alerthq/core';
import { generateAlertId, hashConfig } from '@alerthq/core';
import type {
  AzureMetricAlertResource,
  AzureActivityLogAlertResource,
  AzureScheduledQueryRuleResource,
} from './types.js';

/**
 * Map Azure severity number (or string) to alerthq Severity.
 * Sev0/1 -> critical, Sev2 -> warning, Sev3/4 -> info
 */
export function mapSeverity(sev?: number | string): Severity {
  if (sev === undefined || sev === null) return 'unknown';
  const n = typeof sev === 'string' ? parseInt(sev, 10) : sev;
  if (Number.isNaN(n)) return 'unknown';
  if (n <= 1) return 'critical';
  if (n === 2) return 'warning';
  if (n <= 4) return 'info';
  return 'unknown';
}

/**
 * Extract the short name from an Azure resource ID (last segment).
 */
function extractResourceName(resourceId: string): string {
  const parts = resourceId.split('/');
  return parts[parts.length - 1] ?? resourceId;
}

/**
 * Extract action group names from action group resource IDs.
 */
function extractActionGroupNames(actionGroupIds: string[]): string[] {
  return actionGroupIds.map((id) => {
    const name = extractResourceName(id);
    return `actionGroup:${name}`;
  });
}

// ── Metric Alerts ───────────────────────────────────────────

/**
 * Map an Azure metric alert resource to an AlertDefinition.
 * SDK v7 returns properties flat on the resource (not nested under .properties).
 */
export function mapMetricAlert(resource: AzureMetricAlertResource): AlertDefinition {
  const source = 'azure-metric-alert';
  const sourceId = resource.id ?? '';
  const raw = resource as unknown as Record<string, unknown>;

  const actionGroupIds = (resource.actions ?? [])
    .map((a) => a.actionGroupId)
    .filter((id): id is string => !!id);

  return {
    id: generateAlertId(source, sourceId),
    version: 0,
    source,
    sourceId,
    name: resource.name ?? '',
    description: resource.description ?? '',
    enabled: resource.enabled ?? true,
    severity: mapSeverity(resource.severity),
    conditionSummary: summarizeMetricCriteria(resource),
    notificationTargets: extractActionGroupNames(actionGroupIds),
    tags: resource.tags ?? {},
    owner: '',
    rawConfig: raw,
    configHash: hashConfig(raw),
    lastModifiedAt: resource.lastUpdatedTime?.toISOString() ?? null,
    discoveredAt: new Date().toISOString(),
  };
}

/**
 * Build condition summary from metric alert criteria.
 */
export function summarizeMetricCriteria(resource: AzureMetricAlertResource): string {
  const criteria = resource.properties.criteria;
  if (!criteria?.allOf || criteria.allOf.length === 0) {
    return 'No criteria defined';
  }

  return criteria.allOf
    .map((c) => {
      const parts: string[] = [];
      if (c.metricNamespace) parts.push(c.metricNamespace);
      if (c.metricName) parts.push(c.metricName);
      if (c.timeAggregation) parts.push(c.timeAggregation);
      if (c.operator && c.threshold !== undefined) {
        parts.push(`${c.operator} ${c.threshold}`);
      }
      return parts.join(' ') || 'unknown criterion';
    })
    .join(' AND ');
}

// ── Activity Log Alerts ─────────────────────────────────────

/**
 * Map an Azure activity log alert resource to an AlertDefinition.
 */
export function mapActivityLogAlert(resource: AzureActivityLogAlertResource): AlertDefinition {
  const source = 'azure-activity-log-alert';
  const sourceId = resource.id ?? '';
  const raw = resource as unknown as Record<string, unknown>;

  const actionGroupIds = (resource.properties.actions?.actionGroups ?? []).map(
    (a) => a.actionGroupId,
  );

  return {
    id: generateAlertId(source, sourceId),
    version: 0,
    source,
    sourceId,
    name: resource.name ?? '',
    description: resource.description ?? '',
    enabled: resource.enabled ?? true,
    severity: 'unknown',
    conditionSummary: summarizeActivityLogCondition(resource),
    notificationTargets: extractActionGroupNames(actionGroupIds),
    tags: resource.tags ?? {},
    owner: '',
    rawConfig: raw,
    configHash: hashConfig(raw),
    lastModifiedAt: null,
    discoveredAt: new Date().toISOString(),
  };
}

/**
 * Build condition summary from activity log alert conditions.
 */
export function summarizeActivityLogCondition(resource: AzureActivityLogAlertResource): string {
  const conditions = resource.properties.condition?.allOf;
  if (!conditions || conditions.length === 0) {
    return 'No conditions defined';
  }

  return conditions
    .map((c) => {
      if (c.field && c.equals) {
        return `${c.field} == ${c.equals}`;
      }
      return c.field ?? 'unknown condition';
    })
    .join(' AND ');
}

// ── Scheduled Query Rules ───────────────────────────────────

/**
 * Map an Azure scheduled query rule (LogSearchRuleResource in SDK v7)
 * to an AlertDefinition.
 */
export function mapScheduledQueryRule(resource: AzureScheduledQueryRuleResource): AlertDefinition {
  const source = 'azure-scheduled-query-rule';
  const sourceId = resource.id ?? '';
  const raw = resource as unknown as Record<string, unknown>;

  const actionGroupIds = resource.action?.aznsAction?.actionGroup ?? [];

  return {
    id: generateAlertId(source, sourceId),
    version: 0,
    source,
    sourceId,
    name: resource.displayName ?? resource.name ?? '',
    description: resource.description ?? '',
    enabled: resource.enabled === 'true' || resource.enabled === 'True',
    severity: mapSeverity(resource.action?.severity),
    conditionSummary: summarizeScheduledQueryCriteria(resource),
    notificationTargets: extractActionGroupNames(actionGroupIds),
    tags: resource.tags ?? {},
    owner: '',
    rawConfig: raw,
    configHash: hashConfig(raw),
    lastModifiedAt: resource.lastUpdatedTime?.toISOString() ?? null,
    discoveredAt: new Date().toISOString(),
  };
}

/**
 * Build condition summary from scheduled query rule source + trigger.
 */
export function summarizeScheduledQueryCriteria(resource: AzureScheduledQueryRuleResource): string {
  const criteria = resource.properties.criteria;
  if (!criteria?.allOf || criteria.allOf.length === 0) {
    return 'No criteria defined';
  }

  const trigger = resource.action?.trigger;
  if (trigger?.thresholdOperator && trigger.threshold !== undefined) {
    parts.push(`${trigger.thresholdOperator} ${trigger.threshold}`);
  }

  if (resource.schedule) {
    parts.push(`every ${resource.schedule.frequencyInMinutes}min, window ${resource.schedule.timeWindowInMinutes}min`);
  }

  return parts.join(' ') || 'No criteria defined';
}
