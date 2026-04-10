import { describe, it, expect } from 'vitest';
import {
  mapMetricAlert,
  mapActivityLogAlert,
  mapScheduledQueryRule,
  mapSeverity,
  summarizeMetricCriteria,
  summarizeActivityLogCondition,
  summarizeScheduledQueryCriteria,
} from '../src/mapper.js';
import type {
  AzureMetricAlertResource,
  AzureActivityLogAlertResource,
  AzureScheduledQueryRuleResource,
} from '../src/types.js';

// ── Metric Alert fixtures ───────────────────────────────────

const metricFixture1: AzureMetricAlertResource = {
  id: '/subscriptions/sub-001/resourceGroups/rg-prod/providers/Microsoft.Insights/metricAlerts/high-cpu-alert',
  name: 'high-cpu-alert',
  type: 'Microsoft.Insights/metricAlerts',
  location: 'global',
  tags: { environment: 'production', team: 'platform' },
  properties: {
    description: 'Alert when CPU exceeds 90%',
    severity: 0,
    enabled: true,
    scopes: [
      '/subscriptions/sub-001/resourceGroups/rg-prod/providers/Microsoft.Compute/virtualMachines/vm-web-01',
    ],
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria',
      allOf: [
        {
          name: 'cpu-check',
          metricName: 'Percentage CPU',
          metricNamespace: 'Microsoft.Compute/virtualMachines',
          operator: 'GreaterThan',
          threshold: 90,
          timeAggregation: 'Average',
          criterionType: 'StaticThresholdCriterion',
        },
      ],
    },
    actions: [
      {
        actionGroupId:
          '/subscriptions/sub-001/resourceGroups/rg-prod/providers/Microsoft.Insights/actionGroups/ops-team',
      },
    ],
    evaluationFrequency: 'PT5M',
    windowSize: 'PT15M',
  },
  systemData: {
    lastModifiedAt: '2025-03-15T10:30:00Z',
    lastModifiedBy: 'admin@example.com',
    lastModifiedByType: 'User',
  },
};

const metricFixture2: AzureMetricAlertResource = {
  id: '/subscriptions/sub-001/resourceGroups/rg-prod/providers/Microsoft.Insights/metricAlerts/memory-low',
  name: 'memory-low',
  type: 'Microsoft.Insights/metricAlerts',
  location: 'global',
  tags: {},
  properties: {
    description: 'Available memory below 500MB',
    severity: 2,
    enabled: false,
    criteria: {
      allOf: [
        {
          metricName: 'Available Memory Bytes',
          metricNamespace: 'Microsoft.Compute/virtualMachines',
          operator: 'LessThan',
          threshold: 524288000,
          timeAggregation: 'Average',
        },
      ],
    },
    actions: [
      {
        actionGroupId:
          '/subscriptions/sub-001/resourceGroups/rg-prod/providers/Microsoft.Insights/actionGroups/devs',
      },
      {
        actionGroupId:
          '/subscriptions/sub-001/resourceGroups/rg-prod/providers/Microsoft.Insights/actionGroups/ops-team',
      },
    ],
  },
  systemData: {
    lastModifiedAt: '2025-02-01T08:00:00Z',
  },
};

// ── Activity Log Alert fixtures ─────────────────────────────

const activityLogFixture1: AzureActivityLogAlertResource = {
  id: '/subscriptions/sub-001/resourceGroups/rg-prod/providers/Microsoft.Insights/activityLogAlerts/service-health-alert',
  name: 'service-health-alert',
  type: 'Microsoft.Insights/activityLogAlerts',
  location: 'global',
  tags: { purpose: 'health-monitoring' },
  properties: {
    description: 'Alert on Azure service health incidents',
    enabled: true,
    scopes: ['/subscriptions/sub-001'],
    condition: {
      allOf: [
        { field: 'category', equals: 'ServiceHealth' },
        { field: 'properties.incidentType', equals: 'Incident' },
      ],
    },
    actions: {
      actionGroups: [
        {
          actionGroupId:
            '/subscriptions/sub-001/resourceGroups/rg-prod/providers/Microsoft.Insights/actionGroups/infra-team',
        },
      ],
    },
  },
  systemData: {
    lastModifiedAt: '2025-01-10T16:00:00Z',
  },
};

const activityLogFixture2: AzureActivityLogAlertResource = {
  id: '/subscriptions/sub-001/resourceGroups/rg-prod/providers/Microsoft.Insights/activityLogAlerts/vm-delete-alert',
  name: 'vm-delete-alert',
  type: 'Microsoft.Insights/activityLogAlerts',
  location: 'global',
  properties: {
    description: 'Alert on VM deletion',
    enabled: true,
    scopes: ['/subscriptions/sub-001'],
    condition: {
      allOf: [
        { field: 'category', equals: 'Administrative' },
        { field: 'operationName', equals: 'Microsoft.Compute/virtualMachines/delete' },
        { field: 'status', containsAny: ['Succeeded', 'Failed'] },
      ],
    },
    actions: {
      actionGroups: [
        {
          actionGroupId:
            '/subscriptions/sub-001/resourceGroups/rg-prod/providers/Microsoft.Insights/actionGroups/security-team',
        },
      ],
    },
  },
};

// ── Scheduled Query Rule fixtures ───────────────────────────

const queryRuleFixture1: AzureScheduledQueryRuleResource = {
  id: '/subscriptions/sub-001/resourceGroups/rg-prod/providers/Microsoft.Insights/scheduledQueryRules/error-rate-rule',
  name: 'error-rate-rule',
  type: 'Microsoft.Insights/scheduledQueryRules',
  location: 'eastus',
  tags: { app: 'web-api' },
  properties: {
    displayName: 'High Error Rate',
    description: 'Alert when error rate exceeds 5%',
    severity: 1,
    enabled: true,
    scopes: [
      '/subscriptions/sub-001/resourceGroups/rg-prod/providers/Microsoft.OperationalInsights/workspaces/logs-ws',
    ],
    criteria: {
      allOf: [
        {
          query:
            'requests | where resultCode >= 500 | summarize errorCount = count() by bin(timestamp, 5m)',
          timeAggregation: 'Count',
          operator: 'GreaterThan',
          threshold: 50,
          failingPeriods: {
            numberOfEvaluationPeriods: 4,
            minFailingPeriodsToAlert: 3,
          },
        },
      ],
    },
    actions: {
      actionGroups: [
        '/subscriptions/sub-001/resourceGroups/rg-prod/providers/Microsoft.Insights/actionGroups/dev-team',
      ],
    },
    evaluationFrequency: 'PT5M',
    windowSize: 'PT20M',
  },
  systemData: {
    lastModifiedAt: '2025-03-20T09:15:00Z',
  },
};

const queryRuleFixture2: AzureScheduledQueryRuleResource = {
  id: '/subscriptions/sub-002/resourceGroups/rg-staging/providers/Microsoft.Insights/scheduledQueryRules/slow-queries',
  name: 'slow-queries',
  type: 'Microsoft.Insights/scheduledQueryRules',
  location: 'westus2',
  tags: {},
  properties: {
    description: 'Slow database queries detection',
    severity: 3,
    enabled: true,
    criteria: {
      allOf: [
        {
          query: 'dependencies | where duration > 5000',
          timeAggregation: 'Count',
          metricMeasureColumn: 'duration',
          operator: 'GreaterThan',
          threshold: 10,
        },
      ],
    },
    actions: {
      actionGroups: [
        '/subscriptions/sub-002/resourceGroups/rg-staging/providers/Microsoft.Insights/actionGroups/dba-team',
      ],
    },
  },
  systemData: {
    lastModifiedAt: '2025-04-01T12:00:00Z',
  },
};

// ── Tests ───────────────────────────────────────────────────

describe('mapSeverity', () => {
  it('maps Sev0 to critical', () => {
    expect(mapSeverity(0)).toBe('critical');
  });

  it('maps Sev1 to critical', () => {
    expect(mapSeverity(1)).toBe('critical');
  });

  it('maps Sev2 to warning', () => {
    expect(mapSeverity(2)).toBe('warning');
  });

  it('maps Sev3 to info', () => {
    expect(mapSeverity(3)).toBe('info');
  });

  it('maps Sev4 to info', () => {
    expect(mapSeverity(4)).toBe('info');
  });

  it('maps undefined to unknown', () => {
    expect(mapSeverity(undefined)).toBe('unknown');
  });
});

describe('mapMetricAlert', () => {
  it('maps a Sev0 CPU metric alert with one action group', () => {
    const alert = mapMetricAlert(metricFixture1);
    expect(alert.source).toBe('azure-metric-alert');
    expect(alert.sourceId).toBe(metricFixture1.id);
    expect(alert.name).toBe('high-cpu-alert');
    expect(alert.description).toBe('Alert when CPU exceeds 90%');
    expect(alert.enabled).toBe(true);
    expect(alert.severity).toBe('critical');
    expect(alert.conditionSummary).toContain('Percentage CPU');
    expect(alert.conditionSummary).toContain('GreaterThan');
    expect(alert.conditionSummary).toContain('90');
    expect(alert.notificationTargets).toContain('actionGroup:ops-team');
    expect(alert.tags).toEqual({ environment: 'production', team: 'platform' });
    expect(alert.lastModifiedAt).toBe('2025-03-15T10:30:00Z');
    expect(alert.id).toBeTruthy();
    expect(alert.configHash).toBeTruthy();
  });

  it('maps a Sev2 disabled memory alert with two action groups', () => {
    const alert = mapMetricAlert(metricFixture2);
    expect(alert.name).toBe('memory-low');
    expect(alert.enabled).toBe(false);
    expect(alert.severity).toBe('warning');
    expect(alert.conditionSummary).toContain('Available Memory Bytes');
    expect(alert.conditionSummary).toContain('LessThan');
    expect(alert.notificationTargets).toHaveLength(2);
    expect(alert.notificationTargets).toContain('actionGroup:devs');
    expect(alert.notificationTargets).toContain('actionGroup:ops-team');
  });
});

describe('mapActivityLogAlert', () => {
  it('maps a service health activity log alert', () => {
    const alert = mapActivityLogAlert(activityLogFixture1);
    expect(alert.source).toBe('azure-activity-log-alert');
    expect(alert.name).toBe('service-health-alert');
    expect(alert.enabled).toBe(true);
    expect(alert.severity).toBe('unknown');
    expect(alert.conditionSummary).toContain('category == ServiceHealth');
    expect(alert.conditionSummary).toContain('properties.incidentType == Incident');
    expect(alert.notificationTargets).toContain('actionGroup:infra-team');
    expect(alert.tags).toEqual({ purpose: 'health-monitoring' });
    expect(alert.lastModifiedAt).toBe('2025-01-10T16:00:00Z');
  });

  it('maps a VM deletion alert with containsAny condition', () => {
    const alert = mapActivityLogAlert(activityLogFixture2);
    expect(alert.name).toBe('vm-delete-alert');
    expect(alert.conditionSummary).toContain('category == Administrative');
    expect(alert.conditionSummary).toContain(
      'operationName == Microsoft.Compute/virtualMachines/delete',
    );
    expect(alert.conditionSummary).toContain('status in [Succeeded, Failed]');
    expect(alert.notificationTargets).toContain('actionGroup:security-team');
    expect(alert.lastModifiedAt).toBeNull();
  });
});

describe('mapScheduledQueryRule', () => {
  it('maps a Sev1 error rate scheduled query rule with failingPeriods', () => {
    const alert = mapScheduledQueryRule(queryRuleFixture1);
    expect(alert.source).toBe('azure-scheduled-query-rule');
    expect(alert.name).toBe('High Error Rate');
    expect(alert.description).toBe('Alert when error rate exceeds 5%');
    expect(alert.enabled).toBe(true);
    expect(alert.severity).toBe('critical');
    expect(alert.conditionSummary).toContain('query:');
    expect(alert.conditionSummary).toContain('Count');
    expect(alert.conditionSummary).toContain('GreaterThan 50');
    expect(alert.conditionSummary).toContain('failing 3/4');
    expect(alert.notificationTargets).toContain('actionGroup:dev-team');
    expect(alert.tags).toEqual({ app: 'web-api' });
    expect(alert.lastModifiedAt).toBe('2025-03-20T09:15:00Z');
  });

  it('maps a Sev3 slow queries rule with metricMeasureColumn', () => {
    const alert = mapScheduledQueryRule(queryRuleFixture2);
    expect(alert.name).toBe('slow-queries');
    expect(alert.severity).toBe('info');
    expect(alert.conditionSummary).toContain('column: duration');
    expect(alert.conditionSummary).toContain('GreaterThan 10');
    expect(alert.notificationTargets).toContain('actionGroup:dba-team');
    expect(alert.lastModifiedAt).toBe('2025-04-01T12:00:00Z');
  });
});

describe('summarizeMetricCriteria', () => {
  it('returns "No criteria defined" when criteria is empty', () => {
    const resource = {
      ...metricFixture1,
      properties: { ...metricFixture1.properties, criteria: { allOf: [] } },
    };
    expect(summarizeMetricCriteria(resource)).toBe('No criteria defined');
  });
});

describe('summarizeActivityLogCondition', () => {
  it('returns "No conditions defined" when conditions are empty', () => {
    const resource = {
      ...activityLogFixture1,
      properties: { ...activityLogFixture1.properties, condition: { allOf: [] } },
    };
    expect(summarizeActivityLogCondition(resource)).toBe('No conditions defined');
  });
});

describe('summarizeScheduledQueryCriteria', () => {
  it('returns "No criteria defined" when criteria is empty', () => {
    const resource = {
      ...queryRuleFixture1,
      properties: { ...queryRuleFixture1.properties, criteria: { allOf: [] } },
    };
    expect(summarizeScheduledQueryCriteria(resource)).toBe('No criteria defined');
  });
});
