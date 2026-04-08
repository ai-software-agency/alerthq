import type { AlertDefinition, Severity } from '@alerthq/core';
import { generateAlertId, hashConfig } from '@alerthq/core';
import type { protos } from '@google-cloud/monitoring';

type IAlertPolicy = protos.google.monitoring.v3.IAlertPolicy;

const PROVIDER_NAME = 'gcp-monitoring';

/** Map GCP AlertPolicy severity enum to alerthq Severity. */
export function mapGcpSeverity(severity: string | number | null | undefined): Severity {
  if (severity === null || severity === undefined) return 'unknown';

  const s = String(severity);
  if (s === 'CRITICAL' || s === '1') return 'critical';
  if (s === 'ERROR' || s === '2') return 'warning';
  if (s === 'WARNING' || s === '3') return 'info';
  return 'unknown';
}

/** Build a human-readable condition summary from alert policy conditions. */
export function buildConditionSummary(
  conditions: IAlertPolicy['conditions'],
  combiner: IAlertPolicy['combiner'],
): string {
  if (!conditions || conditions.length === 0) {
    return 'No conditions defined';
  }

  const combinerStr =
    combiner === 'AND' || combiner === 1
      ? ' AND '
      : combiner === 'OR' || combiner === 2
        ? ' OR '
        : ' AND ';

  const parts = conditions.map((c) => {
    const name = c.displayName ?? '';

    if (c.conditionThreshold) {
      const t = c.conditionThreshold;
      const filter = t.filter ?? '';
      const comparison = t.comparison != null ? String(t.comparison) : '?';
      const threshold = t.thresholdValue ?? '?';
      return `${name}: ${filter} ${comparison} ${threshold}`.trim();
    }

    if (c.conditionAbsent) {
      const filter = c.conditionAbsent.filter ?? '';
      return `${name}: absent(${filter})`.trim();
    }

    if (c.conditionMatchedLog) {
      const filter = c.conditionMatchedLog.filter ?? '';
      return `${name}: log_match(${filter})`.trim();
    }

    return name || 'unknown condition';
  });

  return parts.join(combinerStr);
}

/**
 * Convert a GCP Timestamp-like value to an ISO 8601 string.
 * Handles both `{ seconds, nanos }` and string representations.
 */
function timestampToIso(ts: unknown): string | null {
  if (!ts) return null;

  if (typeof ts === 'string') return ts;

  if (typeof ts === 'object' && ts !== null) {
    const obj = ts as Record<string, unknown>;
    if (obj.seconds != null) {
      const ms = Number(obj.seconds) * 1000 + Math.floor(Number(obj.nanos ?? 0) / 1_000_000);
      return new Date(ms).toISOString();
    }
  }

  return null;
}

/**
 * Map a GCP AlertPolicy to a normalized AlertDefinition.
 *
 * @param policy - The raw GCP AlertPolicy object.
 * @param channelMap - Map of notification channel resource names to display names.
 */
export function mapAlertPolicyToAlertDefinition(
  policy: IAlertPolicy,
  channelMap: Map<string, string>,
): AlertDefinition {
  const sourceId = policy.name ?? '';

  const notificationTargets = (policy.notificationChannels ?? []).map((ch) => {
    return channelMap.get(ch) ?? ch;
  });

  const rawConfig: Record<string, unknown> = { ...policy } as Record<string, unknown>;

  return {
    id: generateAlertId(PROVIDER_NAME, sourceId),
    version: 0,
    source: PROVIDER_NAME,
    sourceId,
    name: policy.displayName ?? '',
    description: policy.documentation?.content ?? '',
    enabled: policy.enabled?.value !== false,
    severity: mapGcpSeverity(policy.severity as string | number | null | undefined),
    conditionSummary: buildConditionSummary(policy.conditions, policy.combiner),
    notificationTargets,
    tags: (policy.userLabels as Record<string, string>) ?? {},
    owner:
      policy.mutationRecord?.mutatedBy ??
      policy.creationRecord?.mutatedBy ??
      '',
    rawConfig,
    configHash: hashConfig(rawConfig),
    lastModifiedAt: timestampToIso(policy.mutationRecord?.mutateTime),
    discoveredAt: new Date().toISOString(),
  };
}
