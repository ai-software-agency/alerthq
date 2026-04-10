import { describe, it, expect } from 'vitest';
import {
  mapAtlasAlertConfig,
  buildName,
  buildConditionSummary,
  extractNotificationTargets,
} from '../src/mapper.js';
import type { AtlasAlertConfig } from '../src/types.js';

// ── Fixtures ────────────────────────────────────────────────

const fixture1: AtlasAlertConfig = {
  id: '6501a1b2c3d4e5f6a7b8c9d0',
  groupId: 'proj-001',
  eventTypeName: 'OUTSIDE_METRIC_THRESHOLD',
  enabled: true,
  created: '2024-09-01T00:00:00Z',
  updated: '2025-03-10T14:30:00Z',
  matchers: [{ fieldName: 'HOSTNAME', operator: 'EQUALS', value: 'cluster0-shard-00-00' }],
  metricThreshold: {
    metricName: 'NORMALIZED_SYSTEM_CPU_USER',
    operator: 'GREATER_THAN',
    threshold: 80,
    units: 'RAW',
    mode: 'AVERAGE',
  },
  notifications: [
    { typeName: 'EMAIL', emailAddress: 'dba@example.com', intervalMin: 15 },
    { typeName: 'SLACK', channelName: '#mongo-alerts' },
  ],
};

const fixture2: AtlasAlertConfig = {
  id: '6501a1b2c3d4e5f6a7b8c9d1',
  groupId: 'proj-002',
  eventTypeName: 'REPLICATION_OPLOG_WINDOW_RUNNING_OUT',
  enabled: false,
  created: '2024-06-15T00:00:00Z',
  updated: '2025-01-20T08:00:00Z',
  matchers: [],
  threshold: {
    operator: 'LESS_THAN',
    threshold: 1,
    units: 'HOURS',
  },
  notifications: [
    { typeName: 'PAGER_DUTY' },
    { typeName: 'GROUP', roles: ['GROUP_OWNER', 'GROUP_CLUSTER_MANAGER'] },
  ],
};

const fixture3: AtlasAlertConfig = {
  id: '6501a1b2c3d4e5f6a7b8c9d2',
  groupId: 'proj-001',
  eventTypeName: 'OUTSIDE_METRIC_THRESHOLD',
  enabled: true,
  created: '2024-11-01T00:00:00Z',
  updated: '2025-02-28T12:00:00Z',
  matchers: [
    { fieldName: 'CLUSTER_NAME', operator: 'STARTS_WITH', value: 'prod-' },
    { fieldName: 'REPLICA_SET_NAME', operator: 'EQUALS', value: 'rs0' },
  ],
  metricThreshold: {
    metricName: 'DISK_PARTITION_SPACE_USED_DATA',
    operator: 'GREATER_THAN',
    threshold: 90,
    units: 'RAW',
  },
  notifications: [
    { typeName: 'WEBHOOK', webhookUrl: 'https://hooks.example.com/atlas' },
    { typeName: 'TEAM', teamName: 'Platform Engineering', teamId: 'team-123' },
    { typeName: 'OPS_GENIE' },
  ],
};

// ── Tests ───────────────────────────────────────────────────

describe('mapAtlasAlertConfig', () => {
  it('maps a CPU metric threshold alert with email and slack notifications', () => {
    const alert = mapAtlasAlertConfig(fixture1);
    expect(alert.source).toBe('mongodb-atlas');
    expect(alert.sourceId).toBe('6501a1b2c3d4e5f6a7b8c9d0');
    expect(alert.name).toBe('OUTSIDE_METRIC_THRESHOLD - NORMALIZED_SYSTEM_CPU_USER');
    expect(alert.enabled).toBe(true);
    expect(alert.conditionSummary).toContain('NORMALIZED_SYSTEM_CPU_USER');
    expect(alert.conditionSummary).toContain('GREATER_THAN');
    expect(alert.conditionSummary).toContain('80');
    expect(alert.conditionSummary).toContain('HOSTNAME EQUALS cluster0-shard-00-00');
    expect(alert.notificationTargets).toContain('dba@example.com');
    expect(alert.notificationTargets).toContain('slack:#mongo-alerts');
    expect(alert.lastModifiedAt).toBe('2025-03-10T14:30:00Z');
    expect(alert.id).toBeTruthy();
    expect(alert.configHash).toBeTruthy();
  });

  it('maps an oplog alert with threshold, pagerduty, and group notifications', () => {
    const alert = mapAtlasAlertConfig(fixture2);
    expect(alert.source).toBe('mongodb-atlas');
    expect(alert.name).toBe('REPLICATION_OPLOG_WINDOW_RUNNING_OUT');
    expect(alert.enabled).toBe(false);
    expect(alert.conditionSummary).toContain('LESS_THAN');
    expect(alert.conditionSummary).toContain('1');
    expect(alert.conditionSummary).toContain('HOURS');
    expect(alert.notificationTargets).toContain('pagerduty:configured');
    expect(alert.notificationTargets).toContain('group:GROUP_OWNER,GROUP_CLUSTER_MANAGER');
  });

  it('maps a disk space alert with webhook, team, and opsgenie notifications', () => {
    const alert = mapAtlasAlertConfig(fixture3);
    expect(alert.name).toBe('OUTSIDE_METRIC_THRESHOLD - DISK_PARTITION_SPACE_USED_DATA');
    expect(alert.enabled).toBe(true);
    expect(alert.conditionSummary).toContain('DISK_PARTITION_SPACE_USED_DATA GREATER_THAN 90');
    expect(alert.conditionSummary).toContain('CLUSTER_NAME STARTS_WITH prod-');
    expect(alert.conditionSummary).toContain('REPLICA_SET_NAME EQUALS rs0');
    expect(alert.notificationTargets).toContain('webhook:https://hooks.example.com/atlas');
    expect(alert.notificationTargets).toContain('team:Platform Engineering');
    expect(alert.notificationTargets).toContain('opsgenie:configured');
    expect(alert.lastModifiedAt).toBe('2025-02-28T12:00:00Z');
  });
});

describe('buildName', () => {
  it('combines eventTypeName and metricName', () => {
    expect(buildName(fixture1)).toBe('OUTSIDE_METRIC_THRESHOLD - NORMALIZED_SYSTEM_CPU_USER');
  });

  it('uses only eventTypeName when no metric threshold', () => {
    expect(buildName(fixture2)).toBe('REPLICATION_OPLOG_WINDOW_RUNNING_OUT');
  });
});

describe('buildConditionSummary', () => {
  it('includes metric threshold with mode', () => {
    const summary = buildConditionSummary(fixture1);
    expect(summary).toContain('mode: AVERAGE');
  });

  it('includes plain threshold with units', () => {
    const summary = buildConditionSummary(fixture2);
    expect(summary).toBe('LESS_THAN 1 HOURS');
  });

  it('includes multiple matchers', () => {
    const summary = buildConditionSummary(fixture3);
    expect(summary).toContain('CLUSTER_NAME STARTS_WITH prod-');
    expect(summary).toContain('REPLICA_SET_NAME EQUALS rs0');
  });
});

describe('extractNotificationTargets', () => {
  it('handles all notification types correctly', () => {
    const targets = extractNotificationTargets(fixture3);
    expect(targets).toHaveLength(3);
    expect(targets).toContain('webhook:https://hooks.example.com/atlas');
    expect(targets).toContain('team:Platform Engineering');
    expect(targets).toContain('opsgenie:configured');
  });

  it('deduplicates identical targets', () => {
    const config: AtlasAlertConfig = {
      ...fixture1,
      notifications: [
        { typeName: 'EMAIL', emailAddress: 'dup@test.com' },
        { typeName: 'EMAIL', emailAddress: 'dup@test.com' },
      ],
    };
    const targets = extractNotificationTargets(config);
    expect(targets.filter((t) => t === 'dup@test.com')).toHaveLength(1);
  });
});
