import type { AlertDefinition, Severity } from '@alerthq/core';
import { generateAlertId, hashConfig } from '@alerthq/core';
import type { CloudWatchAlarmWithTags } from './types.js';

const PROVIDER_NAME = 'aws-cloudwatch';

/**
 * Build a human-readable condition summary from alarm fields.
 */
function buildConditionSummary(alarm: Record<string, unknown>): string {
  const metric = (alarm.MetricName as string) ?? 'Unknown';
  const operator = (alarm.ComparisonOperator as string) ?? '?';
  const threshold = alarm.Threshold ?? '?';
  const period = alarm.Period ?? '?';
  const evalPeriods = alarm.EvaluationPeriods ?? '?';
  const datapointsToAlarm = alarm.DatapointsToAlarm ?? evalPeriods;

  return `${metric} ${operator} ${threshold} for ${period}s (${evalPeriods} of ${datapointsToAlarm} datapoints)`;
}

/**
 * Deduplicate and merge notification target arrays.
 */
function deduplicateTargets(
  ...arrays: (string[] | undefined)[]
): string[] {
  const set = new Set<string>();
  for (const arr of arrays) {
    if (arr) {
      for (const item of arr) {
        set.add(item);
      }
    }
  }
  return [...set];
}

/**
 * Map a CloudWatch alarm (with tags) to a normalized AlertDefinition.
 */
export function mapAlarmToAlertDefinition(
  entry: CloudWatchAlarmWithTags,
): AlertDefinition {
  const { alarm, tags } = entry;
  const alarmArn = alarm.AlarmArn ?? '';

  const rawConfig: Record<string, unknown> = { ...alarm };

  const severity: Severity =
    tags.severity &&
    ['critical', 'warning', 'info', 'unknown'].includes(tags.severity)
      ? (tags.severity as Severity)
      : 'warning';

  return {
    id: generateAlertId(PROVIDER_NAME, alarmArn),
    version: 0,
    source: PROVIDER_NAME,
    sourceId: alarmArn,
    name: alarm.AlarmName ?? '',
    description: alarm.AlarmDescription ?? '',
    enabled: true,
    severity,
    conditionSummary: buildConditionSummary(alarm as unknown as Record<string, unknown>),
    notificationTargets: deduplicateTargets(
      alarm.OKActions,
      alarm.AlarmActions,
      alarm.InsufficientDataActions,
    ),
    tags,
    owner: tags.owner ?? '',
    rawConfig,
    configHash: hashConfig(rawConfig),
    lastModifiedAt: alarm.AlarmConfigurationUpdatedTimestamp
      ? alarm.AlarmConfigurationUpdatedTimestamp.toISOString()
      : null,
    discoveredAt: new Date().toISOString(),
  };
}
