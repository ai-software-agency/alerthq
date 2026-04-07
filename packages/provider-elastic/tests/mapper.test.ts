import { describe, it, expect } from 'vitest';
import {
  mapWatcher,
  mapKibanaRule,
  summarizeWatcherCondition,
  extractWatcherTargets,
  summarizeKibanaCondition,
  extractKibanaTargets,
} from '../src/mapper.js';
import type { WatchRecord, KibanaRule } from '../src/types.js';

// ── Watcher fixtures ────────────────────────────────────────

const watcherFixture1: WatchRecord = {
  _id: 'cpu-high-watch',
  watch: {
    trigger: { schedule: { interval: '5m' } },
    input: {
      search: {
        request: {
          indices: ['metrics-*'],
          body: { query: { range: { 'system.cpu.total.pct': { gte: 0.9 } } } },
        },
      },
    },
    condition: {
      compare: {
        'ctx.payload.hits.total': { gte: 1 },
      },
    },
    actions: {
      notify_ops: {
        email: { to: ['ops@example.com', 'oncall@example.com'], subject: 'CPU High' },
      },
      log_it: {
        logging: { text: 'CPU alert triggered' },
      },
    },
  },
  status: {
    state: { active: true },
  },
};

const watcherFixture2: WatchRecord = {
  _id: 'disk-space-watch',
  watch: {
    trigger: { schedule: { interval: '10m' } },
    condition: {
      script: { source: 'return ctx.payload.aggregations.disk.value > 85' },
    },
    actions: {
      slack_alert: {
        slack: { message: { to: ['#alerts'] } },
      },
      pd_alert: {
        pagerduty: { event: { description: 'Disk usage > 85%' } },
      },
    },
  },
  status: {
    state: { active: false },
  },
};

const watcherFixture3: WatchRecord = {
  _id: 'always-watch',
  watch: {
    condition: { always: {} },
    actions: {
      webhook_hook: {
        webhook: { url: 'https://hooks.example.com/alert' },
      },
    },
  },
  status: {
    state: { active: true },
  },
};

// ── Kibana rule fixtures ────────────────────────────────────

const kibanaFixture1: KibanaRule = {
  id: 'rule-abc-123',
  name: 'High Error Rate',
  consumer: 'alerts',
  enabled: true,
  tags: ['production', 'backend'],
  rule_type_id: 'metrics.alert.threshold',
  params: {
    criteria: [
      { metric: 'error_rate', comparator: '>', threshold: [5] },
    ],
    index: ['logs-*'],
  },
  actions: [
    { id: 'action-1', group: 'threshold', actionTypeId: '.email', params: { to: ['dev@example.com'] } },
    { id: 'action-2', group: 'threshold', actionTypeId: '.slack', params: { channel: '#alerts' } },
  ],
  updatedAt: '2025-03-15T10:30:00Z',
  createdAt: '2025-01-01T00:00:00Z',
  schedule: { interval: '1m' },
};

const kibanaFixture2: KibanaRule = {
  id: 'rule-def-456',
  name: 'Uptime Monitor',
  consumer: 'uptime',
  enabled: false,
  tags: ['infra'],
  rule_type_id: 'xpack.uptime.alerts.monitorStatus',
  params: {
    numTimes: 3,
    timerangeCount: 5,
    timerangeUnit: 'm',
  },
  actions: [
    { id: 'action-3', group: 'xpack.uptime.alerts.actionGroups.monitorStatus', actionTypeId: '.pagerduty', params: {} },
  ],
  updatedAt: '2025-02-20T08:00:00Z',
  createdAt: '2024-12-01T00:00:00Z',
  schedule: { interval: '5m' },
};

const kibanaFixture3: KibanaRule = {
  id: 'rule-ghi-789',
  name: 'Log Threshold Alert',
  consumer: 'logs',
  enabled: true,
  tags: [],
  rule_type_id: 'logs.alert.document.count',
  params: {
    criteria: [
      { field: 'log.level', condition: 'is', value: 'error' },
    ],
    threshold: 100,
    index: ['filebeat-*'],
  },
  actions: [
    { id: 'action-4', group: 'threshold', actionTypeId: '.webhook', params: { url: 'https://hooks.example.com' } },
    { id: 'action-5', group: 'threshold', actionTypeId: '.server-log', params: {} },
  ],
  updatedAt: '2025-04-01T12:00:00Z',
  createdAt: '2025-03-01T00:00:00Z',
  schedule: { interval: '1m' },
};

// ── Tests ───────────────────────────────────────────────────

describe('mapWatcher', () => {
  it('maps a compare-condition watcher with email + logging actions', () => {
    const alert = mapWatcher(watcherFixture1);
    expect(alert.source).toBe('elastic-watcher');
    expect(alert.sourceId).toBe('cpu-high-watch');
    expect(alert.name).toBe('cpu-high-watch');
    expect(alert.enabled).toBe(true);
    expect(alert.conditionSummary).toContain('ctx.payload.hits.total');
    expect(alert.conditionSummary).toContain('gte');
    expect(alert.notificationTargets).toContain('ops@example.com');
    expect(alert.notificationTargets).toContain('oncall@example.com');
    expect(alert.notificationTargets).toContain('logging:log_it');
    expect(alert.id).toBeTruthy();
    expect(alert.configHash).toBeTruthy();
  });

  it('maps a script-condition watcher with slack + pagerduty', () => {
    const alert = mapWatcher(watcherFixture2);
    expect(alert.source).toBe('elastic-watcher');
    expect(alert.sourceId).toBe('disk-space-watch');
    expect(alert.enabled).toBe(false);
    expect(alert.conditionSummary).toContain('script:');
    expect(alert.conditionSummary).toContain('ctx.payload.aggregations.disk.value > 85');
    expect(alert.notificationTargets).toContain('slack:slack_alert');
    expect(alert.notificationTargets).toContain('pagerduty:pd_alert');
  });

  it('maps an always-condition watcher with webhook', () => {
    const alert = mapWatcher(watcherFixture3);
    expect(alert.conditionSummary).toBe('always');
    expect(alert.notificationTargets).toContain('webhook:https://hooks.example.com/alert');
  });
});

describe('summarizeWatcherCondition', () => {
  it('returns "No condition" for undefined', () => {
    expect(summarizeWatcherCondition(undefined)).toBe('No condition');
  });

  it('handles never condition', () => {
    expect(summarizeWatcherCondition({ never: {} })).toBe('never');
  });
});

describe('extractWatcherTargets', () => {
  it('deduplicates targets', () => {
    const actions = {
      a1: { email: { to: 'dup@test.com' } },
      a2: { email: { to: 'dup@test.com' } },
    };
    const targets = extractWatcherTargets(actions);
    expect(targets.filter((t) => t === 'dup@test.com')).toHaveLength(1);
  });
});

describe('mapKibanaRule', () => {
  it('maps an enabled threshold rule with email and slack actions', () => {
    const alert = mapKibanaRule(kibanaFixture1);
    expect(alert.source).toBe('elastic-kibana');
    expect(alert.sourceId).toBe('rule-abc-123');
    expect(alert.name).toBe('High Error Rate');
    expect(alert.enabled).toBe(true);
    expect(alert.conditionSummary).toContain('metrics.alert.threshold');
    expect(alert.conditionSummary).toContain('error_rate');
    expect(alert.notificationTargets).toContain('dev@example.com');
    expect(alert.notificationTargets).toContain('slack:action-2');
    expect(alert.lastModifiedAt).toBe('2025-03-15T10:30:00Z');
    expect(alert.tags).toEqual({ production: 'true', backend: 'true' });
  });

  it('maps a disabled uptime rule with pagerduty', () => {
    const alert = mapKibanaRule(kibanaFixture2);
    expect(alert.source).toBe('elastic-kibana');
    expect(alert.name).toBe('Uptime Monitor');
    expect(alert.enabled).toBe(false);
    expect(alert.conditionSummary).toContain('xpack.uptime.alerts.monitorStatus');
    expect(alert.notificationTargets).toContain('pagerduty:action-3');
  });

  it('maps a log threshold rule with webhook and server-log actions', () => {
    const alert = mapKibanaRule(kibanaFixture3);
    expect(alert.name).toBe('Log Threshold Alert');
    expect(alert.enabled).toBe(true);
    expect(alert.conditionSummary).toContain('logs.alert.document.count');
    expect(alert.conditionSummary).toContain('threshold: 100');
    expect(alert.conditionSummary).toContain('index: filebeat-*');
    expect(alert.notificationTargets).toContain('webhook:action-4');
    expect(alert.notificationTargets).toContain('server-log:action-5');
    expect(alert.tags).toEqual({});
  });
});

describe('summarizeKibanaCondition', () => {
  it('includes rule type id and criteria details', () => {
    const summary = summarizeKibanaCondition('metrics.alert.threshold', {
      criteria: [{ metric: 'cpu', comparator: '>=', threshold: [90] }],
    });
    expect(summary).toContain('metrics.alert.threshold');
    expect(summary).toContain('cpu');
    expect(summary).toContain('>=');
  });
});

describe('extractKibanaTargets', () => {
  it('returns unique targets with type prefixes', () => {
    const targets = extractKibanaTargets([
      { id: 'a1', group: 'g', actionTypeId: '.email', params: { to: ['x@y.com'] } },
      { id: 'a2', group: 'g', actionTypeId: '.custom-type', params: {} },
    ]);
    expect(targets).toContain('x@y.com');
    expect(targets).toContain('.custom-type:a2');
  });
});
