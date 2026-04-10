import type { AlertDefinition, Severity } from '@alerthq/core';
import { generateAlertId, hashConfig } from '@alerthq/core';
import type {
  AzureMetricAlertResource,
  AzureActivityLogAlertResource,
  AzureScheduledQueryRuleResource,
} from './types.js';

/**
 * Map Azure severity number to alerthq Severity.
 * Sev0/1 -> critical, Sev2 -> warning, Sev3/4 -> info
 */
export function mapSeverity(sev?: number): Severity {
  if (sev === undefined || sev === null) return 'unknown';
  if (sev <= 1) return 'critical';
  if (sev === 2) return 'warning';
  if (sev <= 4) return 'info';
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
 */
export function mapMetricAlert(resource: AzureMetricAlertResource): AlertDefinition {
  const source = 'azure-metric-alert';
  const sourceId = resource.id;
  const raw = resource as unknown as Record<string, unknown>;

  const actionGroupIds = (resource.properties.actions ?? [])
    .map((a) => a.actionGroupId)
    .filter((id): id is string => !!id);

  return {
    id: generateAlertId(source, sourceId),
    version: 0,
    source,
    sourceId,
    name: resource.name,
    description: resource.properties.description ?? '',
    enabled: resource.properties.enabled ?? true,
    severity: mapSeverity(resource.properties.severity),
    conditionSummary: summarizeMetricCriteria(resource),
    notificationTargets: extractActionGroupNames(actionGroupIds),
    tags: resource.tags ?? {},
    owner: '',
    rawConfig: raw,
    configHash: hashConfig(raw),
    lastModifiedAt: resource.systemData?.lastModifiedAt ?? null,
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
  const sourceId = resource.id;
  const raw = resource as unknown as Record<string, unknown>;

  const actionGroupIds = (resource.properties.actions?.actionGroups ?? []).map(
    (a) => a.actionGroupId,
  );

  return {
    id: generateAlertId(source, sourceId),
    version: 0,
    source,
    sourceId,
    name: resource.name,
    description: resource.properties.description ?? '',
    enabled: resource.properties.enabled ?? true,
    severity: 'unknown',
    conditionSummary: summarizeActivityLogCondition(resource),
    notificationTargets: extractActionGroupNames(actionGroupIds),
    tags: resource.tags ?? {},
    owner: '',
    rawConfig: raw,
    configHash: hashConfig(raw),
    lastModifiedAt: resource.systemData?.lastModifiedAt ?? null,
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
      if (c.field && c.containsAny) {
        return `${c.field} in [${c.containsAny.join(', ')}]`;
      }
      return c.field ?? 'unknown condition';
    })
    .join(' AND ');
}

// ── Scheduled Query Rules ───────────────────────────────────

/**
 * Map an Azure scheduled query rule resource to an AlertDefinition.
 */
export function mapScheduledQueryRule(resource: AzureScheduledQueryRuleResource): AlertDefinition {
  const source = 'azure-scheduled-query-rule';
  const sourceId = resource.id;
  const raw = resource as unknown as Record<string, unknown>;

  const actionGroupIds = resource.properties.actions?.actionGroups ?? [];

  return {
    id: generateAlertId(source, sourceId),
    version: 0,
    source,
    sourceId,
    name: resource.properties.displayName ?? resource.name,
    description: resource.properties.description ?? '',
    enabled: resource.properties.enabled ?? true,
    severity: mapSeverity(resource.properties.severity),
    conditionSummary: summarizeScheduledQueryCriteria(resource),
    notificationTargets: extractActionGroupNames(actionGroupIds),
    tags: resource.tags ?? {},
    owner: '',
    rawConfig: raw,
    configHash: hashConfig(raw),
    lastModifiedAt: resource.systemData?.lastModifiedAt ?? null,
    discoveredAt: new Date().toISOString(),
  };
}

/**
 * Build condition summary from scheduled query rule criteria.
 */
export function summarizeScheduledQueryCriteria(resource: AzureScheduledQueryRuleResource): string {
  const criteria = resource.properties.criteria;
  if (!criteria?.allOf || criteria.allOf.length === 0) {
    return 'No criteria defined';
  }

  return criteria.allOf
    .map((c) => {
      const parts: string[] = [];
      if (c.query) {
        const shortQuery = c.query.length > 80 ? c.query.slice(0, 77) + '...' : c.query;
        parts.push(`query: "${shortQuery}"`);
      }
      if (c.timeAggregation) parts.push(c.timeAggregation);
      if (c.metricMeasureColumn) parts.push(`column: ${c.metricMeasureColumn}`);
      if (c.operator && c.threshold !== undefined) {
        parts.push(`${c.operator} ${c.threshold}`);
      }
      if (c.failingPeriods) {
        parts.push(
          `failing ${c.failingPeriods.minFailingPeriodsToAlert}/${c.failingPeriods.numberOfEvaluationPeriods}`,
        );
      }
      return parts.join(' ') || 'unknown criterion';
    })
    .join(' AND ');
}
