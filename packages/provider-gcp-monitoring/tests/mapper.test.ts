import { describe, it, expect } from 'vitest';
import {
  mapAlertPolicyToAlertDefinition,
  mapGcpSeverity,
  buildConditionSummary,
} from '../src/mapper.js';
import type { protos } from '@google-cloud/monitoring';

type IAlertPolicy = protos.google.monitoring.v3.IAlertPolicy;

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makePolicy(overrides: Partial<IAlertPolicy> = {}): IAlertPolicy {
  return {
    name: 'projects/my-project/alertPolicies/abc123',
    displayName: 'High CPU Alert',
    documentation: { content: 'Alert fires when CPU exceeds threshold', mimeType: 'text/markdown' },
    enabled: { value: true },
    severity: 'CRITICAL',
    conditions: [
      {
        displayName: 'CPU > 80%',
        name: 'projects/my-project/alertPolicies/abc123/conditions/cond1',
        conditionThreshold: {
          filter: 'metric.type="compute.googleapis.com/instance/cpu/utilization"',
          comparison: 'COMPARISON_GT',
          thresholdValue: 0.8,
          duration: { seconds: 300 },
          aggregations: [],
        },
      },
    ],
    combiner: 'AND',
    notificationChannels: [
      'projects/my-project/notificationChannels/ch1',
      'projects/my-project/notificationChannels/ch2',
    ],
    userLabels: { environment: 'production', team: 'platform' },
    mutationRecord: {
      mutateTime: { seconds: 1718451000, nanos: 0 },
      mutatedBy: 'user@example.com',
    },
    creationRecord: {
      mutateTime: { seconds: 1718000000, nanos: 0 },
      mutatedBy: 'creator@example.com',
    },
    ...overrides,
  };
}

function makeChannelMap(): Map<string, string> {
  const map = new Map<string, string>();
  map.set('projects/my-project/notificationChannels/ch1', '#alerts-critical');
  map.set('projects/my-project/notificationChannels/ch2', 'oncall-email@example.com');
  return map;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('mapGcpSeverity', () => {
  it('maps CRITICAL to critical', () => {
    expect(mapGcpSeverity('CRITICAL')).toBe('critical');
  });

  it('maps ERROR to warning', () => {
    expect(mapGcpSeverity('ERROR')).toBe('warning');
  });

  it('maps WARNING to info', () => {
    expect(mapGcpSeverity('WARNING')).toBe('info');
  });

  it('maps null to unknown', () => {
    expect(mapGcpSeverity(null)).toBe('unknown');
  });

  it('maps undefined to unknown', () => {
    expect(mapGcpSeverity(undefined)).toBe('unknown');
  });

  it('maps numeric enum 1 (CRITICAL) to critical', () => {
    expect(mapGcpSeverity(1)).toBe('critical');
  });

  it('maps numeric enum 2 (ERROR) to warning', () => {
    expect(mapGcpSeverity(2)).toBe('warning');
  });

  it('maps numeric enum 3 (WARNING) to info', () => {
    expect(mapGcpSeverity(3)).toBe('info');
  });

  it('maps unrecognized string to unknown', () => {
    expect(mapGcpSeverity('DEBUG')).toBe('unknown');
  });
});

describe('buildConditionSummary', () => {
  it('builds summary for threshold condition', () => {
    const policy = makePolicy();
    const result = buildConditionSummary(policy.conditions, policy.combiner);
    expect(result).toContain('CPU > 80%');
    expect(result).toContain('compute.googleapis.com/instance/cpu/utilization');
    expect(result).toContain('COMPARISON_GT');
    expect(result).toContain('0.8');
  });

  it('builds summary for absent condition', () => {
    const result = buildConditionSummary(
      [
        {
          displayName: 'Metric absent',
          conditionAbsent: {
            filter: 'metric.type="custom.googleapis.com/my_metric"',
            duration: { seconds: 600 },
          },
        },
      ],
      'AND',
    );
    expect(result).toContain('absent(');
    expect(result).toContain('custom.googleapis.com/my_metric');
  });

  it('builds summary for log-match condition', () => {
    const result = buildConditionSummary(
      [
        {
          displayName: 'Error logs',
          conditionMatchedLog: {
            filter: 'severity >= ERROR',
          },
        },
      ],
      'AND',
    );
    expect(result).toContain('log_match(');
    expect(result).toContain('severity >= ERROR');
  });

  it('joins multiple conditions with combiner', () => {
    const result = buildConditionSummary(
      [
        {
          displayName: 'Cond A',
          conditionThreshold: {
            filter: 'metric_a',
            comparison: 'GT',
            thresholdValue: 10,
          },
        },
        {
          displayName: 'Cond B',
          conditionThreshold: {
            filter: 'metric_b',
            comparison: 'LT',
            thresholdValue: 5,
          },
        },
      ],
      'OR',
    );
    expect(result).toContain(' OR ');
  });

  it('returns "No conditions defined" for empty conditions', () => {
    expect(buildConditionSummary([], 'AND')).toBe('No conditions defined');
    expect(buildConditionSummary(null, 'AND')).toBe('No conditions defined');
    expect(buildConditionSummary(undefined, 'AND')).toBe('No conditions defined');
  });
});

describe('mapAlertPolicyToAlertDefinition', () => {
  it('maps basic fields correctly', () => {
    const result = mapAlertPolicyToAlertDefinition(makePolicy(), makeChannelMap());

    expect(result.source).toBe('gcp-monitoring');
    expect(result.sourceId).toBe('projects/my-project/alertPolicies/abc123');
    expect(result.name).toBe('High CPU Alert');
    expect(result.description).toBe('Alert fires when CPU exceeds threshold');
    expect(result.enabled).toBe(true);
    expect(result.version).toBe(0);
  });

  it('generates a deterministic 12-char hex id', () => {
    const a = mapAlertPolicyToAlertDefinition(makePolicy(), makeChannelMap());
    const b = mapAlertPolicyToAlertDefinition(makePolicy(), makeChannelMap());
    expect(a.id).toBe(b.id);
    expect(a.id).toHaveLength(12);
    expect(a.id).toMatch(/^[0-9a-f]{12}$/);
  });

  it('maps severity CRITICAL to critical', () => {
    const result = mapAlertPolicyToAlertDefinition(
      makePolicy({ severity: 'CRITICAL' }),
      makeChannelMap(),
    );
    expect(result.severity).toBe('critical');
  });

  it('maps severity ERROR to warning', () => {
    const result = mapAlertPolicyToAlertDefinition(
      makePolicy({ severity: 'ERROR' }),
      makeChannelMap(),
    );
    expect(result.severity).toBe('warning');
  });

  it('maps severity WARNING to info', () => {
    const result = mapAlertPolicyToAlertDefinition(
      makePolicy({ severity: 'WARNING' }),
      makeChannelMap(),
    );
    expect(result.severity).toBe('info');
  });

  it('maps missing severity to unknown', () => {
    const result = mapAlertPolicyToAlertDefinition(
      makePolicy({ severity: undefined }),
      makeChannelMap(),
    );
    expect(result.severity).toBe('unknown');
  });

  it('resolves notification channels through channelMap', () => {
    const result = mapAlertPolicyToAlertDefinition(makePolicy(), makeChannelMap());
    expect(result.notificationTargets).toEqual(['#alerts-critical', 'oncall-email@example.com']);
  });

  it('falls back to raw channel name when not in channelMap', () => {
    const result = mapAlertPolicyToAlertDefinition(makePolicy(), new Map());
    expect(result.notificationTargets).toEqual([
      'projects/my-project/notificationChannels/ch1',
      'projects/my-project/notificationChannels/ch2',
    ]);
  });

  it('uses userLabels as tags', () => {
    const result = mapAlertPolicyToAlertDefinition(makePolicy(), makeChannelMap());
    expect(result.tags).toEqual({ environment: 'production', team: 'platform' });
  });

  it('sets owner from mutationRecord.mutatedBy', () => {
    const result = mapAlertPolicyToAlertDefinition(makePolicy(), makeChannelMap());
    expect(result.owner).toBe('user@example.com');
  });

  it('falls back to creationRecord.mutatedBy for owner', () => {
    const result = mapAlertPolicyToAlertDefinition(
      makePolicy({ mutationRecord: undefined }),
      makeChannelMap(),
    );
    expect(result.owner).toBe('creator@example.com');
  });

  it('defaults owner to empty string when no records', () => {
    const result = mapAlertPolicyToAlertDefinition(
      makePolicy({ mutationRecord: undefined, creationRecord: undefined }),
      makeChannelMap(),
    );
    expect(result.owner).toBe('');
  });

  it('handles enabled BoolValue wrapper (true)', () => {
    const result = mapAlertPolicyToAlertDefinition(
      makePolicy({ enabled: { value: true } }),
      makeChannelMap(),
    );
    expect(result.enabled).toBe(true);
  });

  it('handles enabled BoolValue wrapper (false)', () => {
    const result = mapAlertPolicyToAlertDefinition(
      makePolicy({ enabled: { value: false } }),
      makeChannelMap(),
    );
    expect(result.enabled).toBe(false);
  });

  it('defaults enabled to true when missing', () => {
    const result = mapAlertPolicyToAlertDefinition(
      makePolicy({ enabled: undefined }),
      makeChannelMap(),
    );
    expect(result.enabled).toBe(true);
  });

  it('converts mutationRecord.mutateTime to ISO string', () => {
    const result = mapAlertPolicyToAlertDefinition(makePolicy(), makeChannelMap());
    expect(result.lastModifiedAt).toBe(new Date(1718451000 * 1000).toISOString());
  });

  it('sets lastModifiedAt to null when mutationRecord is missing', () => {
    const result = mapAlertPolicyToAlertDefinition(
      makePolicy({ mutationRecord: undefined }),
      makeChannelMap(),
    );
    expect(result.lastModifiedAt).toBeNull();
  });

  it('sets discoveredAt to a valid ISO timestamp', () => {
    const before = new Date().toISOString();
    const result = mapAlertPolicyToAlertDefinition(makePolicy(), makeChannelMap());
    const after = new Date().toISOString();
    expect(result.discoveredAt >= before).toBe(true);
    expect(result.discoveredAt <= after).toBe(true);
  });

  it('produces a configHash that is a sha256 hex string', () => {
    const result = mapAlertPolicyToAlertDefinition(makePolicy(), makeChannelMap());
    expect(result.configHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produces consistent configHash for identical policies', () => {
    const a = mapAlertPolicyToAlertDefinition(makePolicy(), makeChannelMap());
    const b = mapAlertPolicyToAlertDefinition(makePolicy(), makeChannelMap());
    expect(a.configHash).toBe(b.configHash);
  });

  it('produces different configHash for different policies', () => {
    const a = mapAlertPolicyToAlertDefinition(
      makePolicy({ displayName: 'Alert A' }),
      makeChannelMap(),
    );
    const b = mapAlertPolicyToAlertDefinition(
      makePolicy({ displayName: 'Alert B' }),
      makeChannelMap(),
    );
    expect(a.configHash).not.toBe(b.configHash);
  });

  it('handles missing/null optional fields gracefully', () => {
    const result = mapAlertPolicyToAlertDefinition(
      makePolicy({
        name: undefined,
        displayName: undefined,
        documentation: undefined,
        enabled: undefined,
        severity: undefined,
        conditions: undefined,
        notificationChannels: undefined,
        userLabels: undefined,
        mutationRecord: undefined,
        creationRecord: undefined,
      }),
      makeChannelMap(),
    );

    expect(result.sourceId).toBe('');
    expect(result.name).toBe('');
    expect(result.description).toBe('');
    expect(result.enabled).toBe(true);
    expect(result.severity).toBe('unknown');
    expect(result.conditionSummary).toBe('No conditions defined');
    expect(result.notificationTargets).toEqual([]);
    expect(result.tags).toEqual({});
    expect(result.owner).toBe('');
    expect(result.lastModifiedAt).toBeNull();
  });

  it('handles empty notification channels array', () => {
    const result = mapAlertPolicyToAlertDefinition(
      makePolicy({ notificationChannels: [] }),
      makeChannelMap(),
    );
    expect(result.notificationTargets).toEqual([]);
  });
});
