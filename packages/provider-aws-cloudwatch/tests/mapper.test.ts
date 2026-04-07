import { describe, it, expect } from 'vitest';
import { mapAlarmToAlertDefinition } from '../src/mapper.js';
import type { CloudWatchAlarmWithTags } from '../src/types.js';
import type { MetricAlarm } from '@aws-sdk/client-cloudwatch';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeAlarm(overrides: Partial<MetricAlarm> = {}): MetricAlarm {
  return {
    AlarmName: 'HighCPUUtilization',
    AlarmArn: 'arn:aws:cloudwatch:us-east-1:123456789012:alarm:HighCPUUtilization',
    AlarmDescription: 'Fires when CPU exceeds 80%',
    MetricName: 'CPUUtilization',
    Namespace: 'AWS/EC2',
    ComparisonOperator: 'GreaterThanThreshold',
    Threshold: 80,
    Period: 300,
    EvaluationPeriods: 3,
    DatapointsToAlarm: 2,
    AlarmActions: ['arn:aws:sns:us-east-1:123456789012:alerts'],
    OKActions: ['arn:aws:sns:us-east-1:123456789012:ok-alerts'],
    InsufficientDataActions: [],
    AlarmConfigurationUpdatedTimestamp: new Date('2025-06-15T10:30:00Z'),
    ...overrides,
  };
}

function makeEntry(
  alarmOverrides: Partial<MetricAlarm> = {},
  tags: Record<string, string> = {},
): CloudWatchAlarmWithTags {
  return { alarm: makeAlarm(alarmOverrides), tags };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('mapAlarmToAlertDefinition', () => {
  it('maps basic alarm fields correctly', () => {
    const result = mapAlarmToAlertDefinition(makeEntry());

    expect(result.source).toBe('aws-cloudwatch');
    expect(result.sourceId).toBe(
      'arn:aws:cloudwatch:us-east-1:123456789012:alarm:HighCPUUtilization',
    );
    expect(result.name).toBe('HighCPUUtilization');
    expect(result.description).toBe('Fires when CPU exceeds 80%');
    expect(result.enabled).toBe(true);
    expect(result.version).toBe(0);
  });

  it('generates a deterministic 12-char id', () => {
    const a = mapAlarmToAlertDefinition(makeEntry());
    const b = mapAlarmToAlertDefinition(makeEntry());
    expect(a.id).toBe(b.id);
    expect(a.id).toHaveLength(12);
    expect(a.id).toMatch(/^[0-9a-f]{12}$/);
  });

  it('produces correct conditionSummary', () => {
    const result = mapAlarmToAlertDefinition(makeEntry());
    expect(result.conditionSummary).toBe(
      'CPUUtilization GreaterThanThreshold 80 for 300s (3 of 2 datapoints)',
    );
  });

  it('deduplicates notification targets across action arrays', () => {
    const sharedArn = 'arn:aws:sns:us-east-1:123456789012:alerts';
    const result = mapAlarmToAlertDefinition(
      makeEntry({
        AlarmActions: [sharedArn],
        OKActions: [sharedArn],
        InsufficientDataActions: [sharedArn],
      }),
    );
    expect(result.notificationTargets).toEqual([sharedArn]);
  });

  it('merges distinct notification targets', () => {
    const result = mapAlarmToAlertDefinition(
      makeEntry({
        AlarmActions: ['arn:aws:sns:us-east-1:123456789012:alarm-topic'],
        OKActions: ['arn:aws:sns:us-east-1:123456789012:ok-topic'],
        InsufficientDataActions: ['arn:aws:sns:us-east-1:123456789012:nodata-topic'],
      }),
    );
    expect(result.notificationTargets).toHaveLength(3);
  });

  it('defaults severity to warning when no tag present', () => {
    const result = mapAlarmToAlertDefinition(makeEntry({}, {}));
    expect(result.severity).toBe('warning');
  });

  it('uses severity tag when present and valid', () => {
    const result = mapAlarmToAlertDefinition(makeEntry({}, { severity: 'critical' }));
    expect(result.severity).toBe('critical');
  });

  it('ignores invalid severity tag and defaults to warning', () => {
    const result = mapAlarmToAlertDefinition(makeEntry({}, { severity: 'banana' }));
    expect(result.severity).toBe('warning');
  });

  it('sets tags from ListTagsForResource', () => {
    const tags = { environment: 'production', team: 'platform' };
    const result = mapAlarmToAlertDefinition(makeEntry({}, tags));
    expect(result.tags).toEqual(tags);
  });

  it('sets owner from tags.owner', () => {
    const result = mapAlarmToAlertDefinition(makeEntry({}, { owner: 'sre-team' }));
    expect(result.owner).toBe('sre-team');
  });

  it('defaults owner to empty string when no tag', () => {
    const result = mapAlarmToAlertDefinition(makeEntry());
    expect(result.owner).toBe('');
  });

  it('includes lastModifiedAt as ISO string', () => {
    const result = mapAlarmToAlertDefinition(makeEntry());
    expect(result.lastModifiedAt).toBe('2025-06-15T10:30:00.000Z');
  });

  it('sets lastModifiedAt to null when timestamp missing', () => {
    const result = mapAlarmToAlertDefinition(
      makeEntry({ AlarmConfigurationUpdatedTimestamp: undefined }),
    );
    expect(result.lastModifiedAt).toBeNull();
  });

  it('sets discoveredAt to a valid ISO timestamp', () => {
    const before = new Date().toISOString();
    const result = mapAlarmToAlertDefinition(makeEntry());
    const after = new Date().toISOString();
    expect(result.discoveredAt >= before).toBe(true);
    expect(result.discoveredAt <= after).toBe(true);
  });

  it('produces a configHash that is a sha256 hex string', () => {
    const result = mapAlarmToAlertDefinition(makeEntry());
    expect(result.configHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produces consistent configHash for identical alarms', () => {
    const a = mapAlarmToAlertDefinition(makeEntry());
    const b = mapAlarmToAlertDefinition(makeEntry());
    expect(a.configHash).toBe(b.configHash);
  });

  it('produces different configHash for different thresholds', () => {
    const a = mapAlarmToAlertDefinition(makeEntry({ Threshold: 80 }));
    const b = mapAlarmToAlertDefinition(makeEntry({ Threshold: 90 }));
    expect(a.configHash).not.toBe(b.configHash);
  });

  it('handles alarm with empty / undefined optional fields', () => {
    const result = mapAlarmToAlertDefinition(
      makeEntry({
        AlarmName: undefined,
        AlarmDescription: undefined,
        AlarmArn: undefined,
        OKActions: undefined,
        AlarmActions: undefined,
        InsufficientDataActions: undefined,
        MetricName: undefined,
        ComparisonOperator: undefined,
        Threshold: undefined,
        Period: undefined,
        EvaluationPeriods: undefined,
        DatapointsToAlarm: undefined,
      }),
    );
    expect(result.name).toBe('');
    expect(result.sourceId).toBe('');
    expect(result.notificationTargets).toEqual([]);
    expect(result.conditionSummary).toBe('Unknown ? ? for ?s (? of ? datapoints)');
  });
});
