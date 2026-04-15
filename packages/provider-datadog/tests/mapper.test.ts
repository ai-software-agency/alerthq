import { describe, it, expect } from 'vitest';
import {
  mapMonitorToAlertDefinition,
  mapPriority,
  extractNotificationTargets,
  tagsToRecord,
} from '../src/mapper.js';
import type { v1 } from '@datadog/datadog-api-client';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeMonitor(overrides: Partial<v1.Monitor> = {}): v1.Monitor {
  return {
    id: 12345678,
    name: 'High CPU on web hosts',
    type: 'metric alert' as v1.MonitorType,
    query: 'avg(last_5m):avg:system.cpu.user{env:prod} > 80',
    message: 'CPU is high on {{host.name}}. @slack-alerts @pagerduty-oncall @ops@example.com',
    tags: ['env:prod', 'team:sre', 'service:web'],
    priority: 2,
    options: {},
    modified: new Date('2025-09-10T14:30:00Z'),
    created: new Date('2025-01-05T08:00:00Z'),
    creator: { email: 'admin@example.com', handle: 'admin@example.com', name: 'Admin' },
    overallState: 'OK' as v1.MonitorOverallStates,
    deleted: undefined,
    ...overrides,
  } as v1.Monitor;
}

// ---------------------------------------------------------------------------
// mapMonitorToAlertDefinition
// ---------------------------------------------------------------------------

describe('mapMonitorToAlertDefinition', () => {
  it('maps basic fields correctly', () => {
    const result = mapMonitorToAlertDefinition(makeMonitor());

    expect(result.source).toBe('datadog');
    expect(result.sourceId).toBe('12345678');
    expect(result.name).toBe('High CPU on web hosts');
    expect(result.description).toBe(
      'CPU is high on {{host.name}}. @slack-alerts @pagerduty-oncall @ops@example.com',
    );
    expect(result.enabled).toBe(true);
    expect(result.version).toBe(0);
  });

  it('generates a deterministic 12-char hex id', () => {
    const a = mapMonitorToAlertDefinition(makeMonitor());
    const b = mapMonitorToAlertDefinition(makeMonitor());
    expect(a.id).toBe(b.id);
    expect(a.id).toHaveLength(12);
    expect(a.id).toMatch(/^[0-9a-f]{12}$/);
  });

  it('maps priority to severity (P1 → critical)', () => {
    const result = mapMonitorToAlertDefinition(makeMonitor({ priority: 1 }));
    expect(result.severity).toBe('critical');
  });

  it('maps priority to severity (P2 → critical)', () => {
    const result = mapMonitorToAlertDefinition(makeMonitor({ priority: 2 }));
    expect(result.severity).toBe('critical');
  });

  it('maps priority to severity (P3 → warning)', () => {
    const result = mapMonitorToAlertDefinition(makeMonitor({ priority: 3 }));
    expect(result.severity).toBe('warning');
  });

  it('maps priority to severity (P4 → info)', () => {
    const result = mapMonitorToAlertDefinition(makeMonitor({ priority: 4 }));
    expect(result.severity).toBe('info');
  });

  it('maps priority to severity (P5 → info)', () => {
    const result = mapMonitorToAlertDefinition(makeMonitor({ priority: 5 }));
    expect(result.severity).toBe('info');
  });

  it('maps null priority to unknown severity', () => {
    const result = mapMonitorToAlertDefinition(makeMonitor({ priority: undefined }));
    expect(result.severity).toBe('unknown');
  });

  it('builds conditionSummary from type + query', () => {
    const result = mapMonitorToAlertDefinition(makeMonitor());
    expect(result.conditionSummary).toBe(
      'metric alert: avg(last_5m):avg:system.cpu.user{env:prod} > 80',
    );
  });

  it('extracts notification targets from message', () => {
    const result = mapMonitorToAlertDefinition(makeMonitor());
    expect(result.notificationTargets).toEqual([
      '@slack-alerts',
      '@pagerduty-oncall',
      '@ops@example.com',
    ]);
  });

  it('converts tags array to Record (key:value splitting)', () => {
    const result = mapMonitorToAlertDefinition(makeMonitor());
    expect(result.tags).toEqual({
      env: 'prod',
      team: 'sre',
      service: 'web',
    });
  });

  it('sets owner from creator.handle', () => {
    const result = mapMonitorToAlertDefinition(makeMonitor());
    expect(result.owner).toBe('admin@example.com');
  });

  it('defaults owner to empty string when creator is missing', () => {
    const result = mapMonitorToAlertDefinition(makeMonitor({ creator: undefined }));
    expect(result.owner).toBe('');
  });

  it('produces a configHash that is a sha256 hex string', () => {
    const result = mapMonitorToAlertDefinition(makeMonitor());
    expect(result.configHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produces consistent configHash for identical monitors', () => {
    const a = mapMonitorToAlertDefinition(makeMonitor());
    const b = mapMonitorToAlertDefinition(makeMonitor());
    expect(a.configHash).toBe(b.configHash);
  });

  it('produces different configHash for different queries', () => {
    const a = mapMonitorToAlertDefinition(makeMonitor({ query: 'avg:cpu{*} > 80' }));
    const b = mapMonitorToAlertDefinition(makeMonitor({ query: 'avg:cpu{*} > 90' }));
    expect(a.configHash).not.toBe(b.configHash);
  });

  it('includes lastModifiedAt as ISO string', () => {
    const result = mapMonitorToAlertDefinition(makeMonitor());
    expect(result.lastModifiedAt).toBe('2025-09-10T14:30:00.000Z');
  });

  it('sets lastModifiedAt to null when modified is missing', () => {
    const result = mapMonitorToAlertDefinition(makeMonitor({ modified: undefined }));
    expect(result.lastModifiedAt).toBeNull();
  });

  it('sets discoveredAt to a valid ISO timestamp', () => {
    const before = new Date().toISOString();
    const result = mapMonitorToAlertDefinition(makeMonitor());
    const after = new Date().toISOString();
    expect(result.discoveredAt >= before).toBe(true);
    expect(result.discoveredAt <= after).toBe(true);
  });

  it('handles missing/undefined optional fields gracefully', () => {
    const result = mapMonitorToAlertDefinition(
      makeMonitor({
        id: undefined,
        name: undefined,
        message: undefined,
        tags: undefined,
        priority: undefined,
        modified: undefined,
        creator: undefined,
      }),
    );
    expect(result.sourceId).toBe('');
    expect(result.name).toBe('');
    expect(result.description).toBe('');
    expect(result.severity).toBe('unknown');
    expect(result.notificationTargets).toEqual([]);
    expect(result.tags).toEqual({});
    expect(result.owner).toBe('');
    expect(result.lastModifiedAt).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// mapPriority
// ---------------------------------------------------------------------------

describe('mapPriority', () => {
  it('returns critical for P1', () => expect(mapPriority(1)).toBe('critical'));
  it('returns critical for P2', () => expect(mapPriority(2)).toBe('critical'));
  it('returns warning for P3', () => expect(mapPriority(3)).toBe('warning'));
  it('returns info for P4', () => expect(mapPriority(4)).toBe('info'));
  it('returns info for P5', () => expect(mapPriority(5)).toBe('info'));
  it('returns unknown for null', () => expect(mapPriority(null)).toBe('unknown'));
  it('returns unknown for undefined', () => expect(mapPriority(undefined)).toBe('unknown'));
});

// ---------------------------------------------------------------------------
// extractNotificationTargets
// ---------------------------------------------------------------------------

describe('extractNotificationTargets', () => {
  it('extracts @slack mentions', () => {
    expect(extractNotificationTargets('Alert! @slack-team-channel')).toEqual([
      '@slack-team-channel',
    ]);
  });

  it('extracts multiple mentions', () => {
    expect(extractNotificationTargets('@slack-alerts @pagerduty-oncall @ops@example.com')).toEqual([
      '@slack-alerts',
      '@pagerduty-oncall',
      '@ops@example.com',
    ]);
  });

  it('returns empty array for empty message', () => {
    expect(extractNotificationTargets('')).toEqual([]);
  });

  it('returns empty array for undefined message', () => {
    expect(extractNotificationTargets(undefined)).toEqual([]);
  });

  it('returns empty array when no mentions present', () => {
    expect(extractNotificationTargets('No mentions here')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// tagsToRecord
// ---------------------------------------------------------------------------

describe('tagsToRecord', () => {
  it('splits key:value tags', () => {
    expect(tagsToRecord(['env:prod', 'team:sre'])).toEqual({ env: 'prod', team: 'sre' });
  });

  it('handles tags without colon as empty-string values', () => {
    expect(tagsToRecord(['standalone'])).toEqual({ standalone: '' });
  });

  it('handles tags with multiple colons', () => {
    expect(tagsToRecord(['url:https://example.com'])).toEqual({
      url: 'https://example.com',
    });
  });

  it('returns empty object for undefined', () => {
    expect(tagsToRecord(undefined)).toEqual({});
  });

  it('returns empty object for empty array', () => {
    expect(tagsToRecord([])).toEqual({});
  });
});
