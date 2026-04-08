import { describe, it, expect } from 'vitest';
import {
  mapAlertRuleToAlertDefinition,
  mapSeverityLabel,
  buildConditionSummary,
} from '../src/mapper.js';
import type { GrafanaAlertRule, GrafanaContactPoint } from '../src/types.js';

// ── Fixtures ────────────────────────────────────────────────

const contactPoints: GrafanaContactPoint[] = [
  {
    uid: 'cp-1',
    name: 'email-receiver',
    type: 'email',
    settings: { addresses: 'ops@example.com' },
    disableResolveMessage: false,
  },
  {
    uid: 'cp-2',
    name: 'slack-receiver',
    type: 'slack',
    settings: { url: 'https://hooks.slack.com/xxx' },
    disableResolveMessage: false,
  },
];

const basicRule: GrafanaAlertRule = {
  id: 1,
  uid: 'rule-abc-123',
  orgID: 1,
  folderUID: 'folder-1',
  ruleGroup: 'API',
  title: 'High CPU Usage',
  condition: 'B',
  data: [
    {
      refId: 'A',
      queryType: '',
      relativeTimeRange: { from: 600, to: 0 },
      datasourceUid: 'prometheus',
      model: { expr: 'up', refId: 'A' },
    },
    {
      refId: 'B',
      queryType: '',
      relativeTimeRange: { from: 600, to: 0 },
      datasourceUid: '-100',
      model: {
        type: 'classic_conditions',
        conditions: [
          {
            evaluator: { params: [6], type: 'gt' },
            operator: { type: 'and' },
            query: { params: ['A'] },
            reducer: { params: [], type: 'last' },
            type: 'query',
          },
        ],
      },
    },
  ],
  updated: '2024-01-15T10:30:00Z',
  noDataState: 'OK',
  execErrState: 'OK',
  for: '5m',
  annotations: {
    summary: 'CPU is high',
    description: 'Alert fires when CPU usage exceeds threshold',
  },
  labels: {
    severity: 'critical',
    team: 'platform',
  },
  isPaused: false,
  notification_settings: {
    receiver: 'email-receiver',
    group_by: ['alertname'],
    mute_time_intervals: [],
  },
  provenance: '',
};

const pausedRule: GrafanaAlertRule = {
  id: 2,
  uid: 'rule-def-456',
  orgID: 1,
  folderUID: 'folder-2',
  ruleGroup: 'Infra',
  title: 'Disk Space Low',
  condition: 'C',
  data: [
    {
      refId: 'C',
      queryType: '',
      relativeTimeRange: { from: 300, to: 0 },
      datasourceUid: 'prometheus',
      model: { expr: 'disk_free', refId: 'C' },
    },
  ],
  updated: '2024-02-20T08:00:00Z',
  noDataState: 'Alerting',
  execErrState: 'Alerting',
  for: '10m',
  annotations: {
    summary: 'Disk space is running low',
  },
  labels: {
    severity: 'warning',
  },
  isPaused: true,
  provenance: '',
};

const minimalRule: GrafanaAlertRule = {
  id: 3,
  uid: 'rule-ghi-789',
  orgID: 1,
  folderUID: 'folder-3',
  ruleGroup: 'Misc',
  title: 'Minimal Alert',
  condition: 'A',
  data: [],
  updated: '',
  noDataState: 'OK',
  execErrState: 'OK',
  for: '',
  annotations: {},
  labels: {},
  isPaused: false,
  provenance: '',
};

// ── Tests ───────────────────────────────────────────────────

describe('mapAlertRuleToAlertDefinition', () => {
  it('maps basic fields (title→name, uid→sourceId, source=grafana)', () => {
    const alert = mapAlertRuleToAlertDefinition(basicRule, contactPoints);
    expect(alert.source).toBe('grafana');
    expect(alert.sourceId).toBe('rule-abc-123');
    expect(alert.name).toBe('High CPU Usage');
  });

  it('generates a deterministic 12-char hex id', () => {
    const alert = mapAlertRuleToAlertDefinition(basicRule, contactPoints);
    expect(alert.id).toMatch(/^[0-9a-f]{12}$/);

    const alert2 = mapAlertRuleToAlertDefinition(basicRule, contactPoints);
    expect(alert.id).toBe(alert2.id);
  });

  it('maps severity label: critical', () => {
    const alert = mapAlertRuleToAlertDefinition(basicRule, contactPoints);
    expect(alert.severity).toBe('critical');
  });

  it('maps severity label: warning', () => {
    const alert = mapAlertRuleToAlertDefinition(pausedRule, contactPoints);
    expect(alert.severity).toBe('warning');
  });

  it('maps severity to unknown when label is missing', () => {
    const alert = mapAlertRuleToAlertDefinition(minimalRule, contactPoints);
    expect(alert.severity).toBe('unknown');
  });

  it('sets enabled from !isPaused', () => {
    const enabledAlert = mapAlertRuleToAlertDefinition(basicRule, contactPoints);
    expect(enabledAlert.enabled).toBe(true);

    const pausedAlert = mapAlertRuleToAlertDefinition(pausedRule, contactPoints);
    expect(pausedAlert.enabled).toBe(false);
  });

  it('builds conditionSummary with classic_conditions detail', () => {
    const alert = mapAlertRuleToAlertDefinition(basicRule, contactPoints);
    expect(alert.conditionSummary).toContain('A');
    expect(alert.conditionSummary).toContain('gt');
    expect(alert.conditionSummary).toContain('last');
    expect(alert.conditionSummary).toContain('for 5m');
  });

  it('uses annotations.description for description', () => {
    const alert = mapAlertRuleToAlertDefinition(basicRule, contactPoints);
    expect(alert.description).toBe('Alert fires when CPU usage exceeds threshold');
  });

  it('falls back to annotations.summary when description is missing', () => {
    const alert = mapAlertRuleToAlertDefinition(pausedRule, contactPoints);
    expect(alert.description).toBe('Disk space is running low');
  });

  it('extracts notification targets from notification_settings.receiver', () => {
    const alert = mapAlertRuleToAlertDefinition(basicRule, contactPoints);
    expect(alert.notificationTargets).toContain('email-receiver');
  });

  it('returns empty notification targets when no receiver set', () => {
    const alert = mapAlertRuleToAlertDefinition(minimalRule, contactPoints);
    expect(alert.notificationTargets).toEqual([]);
  });

  it('uses labels as tags', () => {
    const alert = mapAlertRuleToAlertDefinition(basicRule, contactPoints);
    expect(alert.tags).toEqual({ severity: 'critical', team: 'platform' });
  });

  it('owner is empty string', () => {
    const alert = mapAlertRuleToAlertDefinition(basicRule, contactPoints);
    expect(alert.owner).toBe('');
  });

  it('handles missing/empty fields gracefully', () => {
    const alert = mapAlertRuleToAlertDefinition(minimalRule, contactPoints);
    expect(alert.description).toBe('');
    expect(alert.tags).toEqual({});
    expect(alert.notificationTargets).toEqual([]);
  });

  it('produces a configHash', () => {
    const alert = mapAlertRuleToAlertDefinition(basicRule, contactPoints);
    expect(alert.configHash).toBeTruthy();
    expect(typeof alert.configHash).toBe('string');
  });

  it('sets lastModifiedAt from updated field', () => {
    const alert = mapAlertRuleToAlertDefinition(basicRule, contactPoints);
    expect(alert.lastModifiedAt).toBe('2024-01-15T10:30:00Z');
  });

  it('sets lastModifiedAt to null when updated is empty', () => {
    const alert = mapAlertRuleToAlertDefinition(minimalRule, contactPoints);
    expect(alert.lastModifiedAt).toBeNull();
  });

  it('sets discoveredAt to a valid ISO string', () => {
    const alert = mapAlertRuleToAlertDefinition(basicRule, contactPoints);
    expect(() => new Date(alert.discoveredAt)).not.toThrow();
    expect(new Date(alert.discoveredAt).toISOString()).toBe(alert.discoveredAt);
  });
});

describe('mapSeverityLabel', () => {
  it('returns critical for severity=critical', () => {
    expect(mapSeverityLabel({ severity: 'critical' })).toBe('critical');
  });

  it('returns warning for severity=warning', () => {
    expect(mapSeverityLabel({ severity: 'warning' })).toBe('warning');
  });

  it('returns info for severity=info', () => {
    expect(mapSeverityLabel({ severity: 'info' })).toBe('info');
  });

  it('returns unknown for unrecognized severity', () => {
    expect(mapSeverityLabel({ severity: 'high' })).toBe('unknown');
  });

  it('returns unknown for missing labels', () => {
    expect(mapSeverityLabel(undefined)).toBe('unknown');
  });

  it('returns unknown for empty labels', () => {
    expect(mapSeverityLabel({})).toBe('unknown');
  });
});

describe('buildConditionSummary', () => {
  it('includes classic_conditions evaluator details', () => {
    const summary = buildConditionSummary(basicRule);
    expect(summary).toContain('A');
    expect(summary).toContain('last');
    expect(summary).toContain('gt');
    expect(summary).toContain('6');
    expect(summary).toContain('for 5m');
  });

  it('falls back to condition ref when no classic_conditions', () => {
    const summary = buildConditionSummary(pausedRule);
    expect(summary).toContain('Condition C');
    expect(summary).toContain('for 10m');
  });

  it('handles empty data array', () => {
    const summary = buildConditionSummary(minimalRule);
    expect(summary).toContain('Condition A');
  });

  it('omits "for" clause when for is empty', () => {
    const summary = buildConditionSummary(minimalRule);
    expect(summary).not.toContain('for ');
  });
});
