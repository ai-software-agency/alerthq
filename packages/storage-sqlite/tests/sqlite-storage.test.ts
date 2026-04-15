import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { StorageProvider, AlertDefinition, SyncRun } from '@alerthq/core';
import factory from '../src/index.js';

function makeAlert(overrides: Partial<AlertDefinition> = {}): AlertDefinition {
  return {
    id: 'abc123def456',
    version: 1,
    source: 'aws-cloudwatch',
    sourceId: 'arn:aws:cloudwatch:us-east-1:123:alarm:MyAlarm',
    name: 'CPU High',
    description: 'CPU usage above 80%',
    enabled: true,
    severity: 'warning',
    conditionSummary: 'CPUUtilization GreaterThanThreshold 80',
    notificationTargets: ['arn:aws:sns:us-east-1:123:alerts'],
    tags: { env: 'prod' },
    owner: 'platform-team',
    rawConfig: { MetricName: 'CPUUtilization', Threshold: 80 },
    configHash: 'aabbccdd',
    lastModifiedAt: '2026-01-01T00:00:00Z',
    discoveredAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('SqliteStorageProvider', () => {
  let storage: StorageProvider;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'alerthq-test-'));
    storage = factory();
    await storage.initialize({ path: join(tempDir, 'test.db') });
  });

  afterEach(async () => {
    await storage.dispose?.();
    rmSync(tempDir, { recursive: true, force: true });
  });

  // ---- Migration idempotency ----

  it('can initialize twice without error (migration idempotency)', async () => {
    const storage2 = factory();
    await storage2.initialize({ path: join(tempDir, 'test.db') });
    await storage2.dispose?.();
  });

  it('bootstraps with version 0 manual sync run', async () => {
    const run = await storage.getSyncRun(0);
    expect(run).not.toBeNull();
    expect(run!.name).toBe('manual');
    expect(run!.description).toBe('Manual alert entries');
  });

  // ---- Sync runs ----

  it('creates and retrieves a sync run', async () => {
    const run: SyncRun = {
      version: 1,
      name: 'Sync 2026-01-01',
      description: 'Test sync',
      createdAt: '2026-01-01T00:00:00Z',
      providerStatus: { 'aws-cloudwatch': 'success' },
    };
    await storage.createSyncRun(run);
    const retrieved = await storage.getSyncRun(1);
    expect(retrieved).toEqual(run);
  });

  it('getLatestSyncRun returns most recent (excludes version 0)', async () => {
    expect(await storage.getLatestSyncRun()).toBeNull();

    await storage.createSyncRun({
      version: 1,
      name: 'Run 1',
      description: '',
      createdAt: '2026-01-01T00:00:00Z',
      providerStatus: {},
    });
    await storage.createSyncRun({
      version: 2,
      name: 'Run 2',
      description: '',
      createdAt: '2026-01-02T00:00:00Z',
      providerStatus: {},
    });

    const latest = await storage.getLatestSyncRun();
    expect(latest!.version).toBe(2);
    expect(latest!.name).toBe('Run 2');
  });

  it('listSyncRuns returns in reverse order with limit', async () => {
    for (let i = 1; i <= 5; i++) {
      await storage.createSyncRun({
        version: i,
        name: `Run ${i}`,
        description: '',
        createdAt: `2026-01-0${i}T00:00:00Z`,
        providerStatus: {},
      });
    }

    const all = await storage.listSyncRuns();
    expect(all).toHaveLength(5);
    expect(all[0]!.version).toBe(5);

    const limited = await storage.listSyncRuns(3);
    expect(limited).toHaveLength(3);
    expect(limited[0]!.version).toBe(5);
    expect(limited[2]!.version).toBe(3);
  });

  // ---- Alert definitions CRUD ----

  it('saves and retrieves alert definitions', async () => {
    await storage.createSyncRun({
      version: 1,
      name: 'Run 1',
      description: '',
      createdAt: '2026-01-01T00:00:00Z',
      providerStatus: {},
    });

    const alert = makeAlert({ version: 1 });
    await storage.saveAlertDefinitions(1, [alert]);

    const alerts = await storage.getAlertDefinitions(1);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toEqual(alert);
  });

  it('removes an alert definition', async () => {
    const alert = makeAlert({ version: 0, source: 'manual' });
    await storage.saveAlertDefinitions(0, [alert]);

    const removed = await storage.removeAlertDefinition(0, alert.id);
    expect(removed).toBe(true);

    const remaining = await storage.getAlertDefinitions(0);
    expect(remaining).toHaveLength(0);
  });

  it('removeAlertDefinition returns false for non-existent', async () => {
    const removed = await storage.removeAlertDefinition(0, 'nonexistent');
    expect(removed).toBe(false);
  });

  // ---- findAlertsByIdPrefix ----

  it('findAlertsByIdPrefix returns exact match', async () => {
    await storage.createSyncRun({
      version: 1,
      name: 'Run 1',
      description: '',
      createdAt: '2026-01-01T00:00:00Z',
      providerStatus: {},
    });

    const alert = makeAlert({ id: 'abc123def456', version: 1 });
    await storage.saveAlertDefinitions(1, [alert]);

    const matches = await storage.findAlertsByIdPrefix(1, 'abc123def456');
    expect(matches).toHaveLength(1);
  });

  it('findAlertsByIdPrefix returns prefix matches', async () => {
    await storage.createSyncRun({
      version: 1,
      name: 'Run 1',
      description: '',
      createdAt: '2026-01-01T00:00:00Z',
      providerStatus: {},
    });

    await storage.saveAlertDefinitions(1, [
      makeAlert({ id: 'abc123000001', version: 1, name: 'Alert 1' }),
      makeAlert({ id: 'abc123000002', version: 1, name: 'Alert 2' }),
      makeAlert({ id: 'xyz999000001', version: 1, name: 'Alert 3' }),
    ]);

    const matches = await storage.findAlertsByIdPrefix(1, 'abc1');
    expect(matches).toHaveLength(2);
  });

  it('findAlertsByIdPrefix returns empty for no match', async () => {
    const matches = await storage.findAlertsByIdPrefix(0, 'zzz');
    expect(matches).toHaveLength(0);
  });

  // ---- getChanges (drift detection) ----

  it('detects added alerts', async () => {
    await storage.createSyncRun({
      version: 1,
      name: 'R1',
      description: '',
      createdAt: '2026-01-01T00:00:00Z',
      providerStatus: {},
    });
    await storage.createSyncRun({
      version: 2,
      name: 'R2',
      description: '',
      createdAt: '2026-01-02T00:00:00Z',
      providerStatus: {},
    });

    await storage.saveAlertDefinitions(1, []);
    await storage.saveAlertDefinitions(2, [makeAlert({ id: 'new111111111', version: 2 })]);

    const changes = await storage.getChanges(1, 2);
    expect(changes.added).toHaveLength(1);
    expect(changes.added[0]!.id).toBe('new111111111');
    expect(changes.removed).toHaveLength(0);
    expect(changes.modified).toHaveLength(0);
  });

  it('detects removed alerts', async () => {
    await storage.createSyncRun({
      version: 1,
      name: 'R1',
      description: '',
      createdAt: '2026-01-01T00:00:00Z',
      providerStatus: {},
    });
    await storage.createSyncRun({
      version: 2,
      name: 'R2',
      description: '',
      createdAt: '2026-01-02T00:00:00Z',
      providerStatus: {},
    });

    await storage.saveAlertDefinitions(1, [makeAlert({ id: 'gone11111111', version: 1 })]);
    await storage.saveAlertDefinitions(2, []);

    const changes = await storage.getChanges(1, 2);
    expect(changes.added).toHaveLength(0);
    expect(changes.removed).toHaveLength(1);
    expect(changes.removed[0]!.id).toBe('gone11111111');
    expect(changes.modified).toHaveLength(0);
  });

  it('detects modified alerts (different configHash)', async () => {
    await storage.createSyncRun({
      version: 1,
      name: 'R1',
      description: '',
      createdAt: '2026-01-01T00:00:00Z',
      providerStatus: {},
    });
    await storage.createSyncRun({
      version: 2,
      name: 'R2',
      description: '',
      createdAt: '2026-01-02T00:00:00Z',
      providerStatus: {},
    });

    await storage.saveAlertDefinitions(1, [
      makeAlert({ id: 'mod111111111', version: 1, configHash: 'hash_v1', name: 'Before' }),
    ]);
    await storage.saveAlertDefinitions(2, [
      makeAlert({ id: 'mod111111111', version: 2, configHash: 'hash_v2', name: 'After' }),
    ]);

    const changes = await storage.getChanges(1, 2);
    expect(changes.added).toHaveLength(0);
    expect(changes.removed).toHaveLength(0);
    expect(changes.modified).toHaveLength(1);
    expect(changes.modified[0]!.before.name).toBe('Before');
    expect(changes.modified[0]!.after.name).toBe('After');
  });

  it('ignores unchanged alerts (same configHash)', async () => {
    await storage.createSyncRun({
      version: 1,
      name: 'R1',
      description: '',
      createdAt: '2026-01-01T00:00:00Z',
      providerStatus: {},
    });
    await storage.createSyncRun({
      version: 2,
      name: 'R2',
      description: '',
      createdAt: '2026-01-02T00:00:00Z',
      providerStatus: {},
    });

    const alert = makeAlert({ id: 'same11111111', configHash: 'same_hash' });
    await storage.saveAlertDefinitions(1, [{ ...alert, version: 1 }]);
    await storage.saveAlertDefinitions(2, [{ ...alert, version: 2 }]);

    const changes = await storage.getChanges(1, 2);
    expect(changes.added).toHaveLength(0);
    expect(changes.removed).toHaveLength(0);
    expect(changes.modified).toHaveLength(0);
  });

  // ---- Overlay tags ----

  it('sets and retrieves overlay tags', async () => {
    await storage.setOverlayTag('abc123', 'team', 'platform');
    await storage.setOverlayTag('abc123', 'env', 'prod');

    const tags = await storage.getOverlayTags('abc123');
    expect(tags).toEqual({ team: 'platform', env: 'prod' });
  });

  it('upserts overlay tags', async () => {
    await storage.setOverlayTag('abc123', 'team', 'old');
    await storage.setOverlayTag('abc123', 'team', 'new');

    const tags = await storage.getOverlayTags('abc123');
    expect(tags).toEqual({ team: 'new' });
  });

  it('removes overlay tags', async () => {
    await storage.setOverlayTag('abc123', 'team', 'platform');
    const removed = await storage.removeOverlayTag('abc123', 'team');
    expect(removed).toBe(true);

    const tags = await storage.getOverlayTags('abc123');
    expect(tags).toEqual({});
  });

  it('removeOverlayTag returns false for non-existent', async () => {
    const removed = await storage.removeOverlayTag('abc123', 'nope');
    expect(removed).toBe(false);
  });

  it('getOverlayTags returns empty for unknown alert', async () => {
    const tags = await storage.getOverlayTags('unknown');
    expect(tags).toEqual({});
  });

  // ---- Overlay tag merge at read time (integration) ----

  it('overlay tags merge on top of provider tags', async () => {
    await storage.createSyncRun({
      version: 1,
      name: 'R1',
      description: '',
      createdAt: '2026-01-01T00:00:00Z',
      providerStatus: {},
    });

    const alert = makeAlert({
      id: 'tagtest11111',
      version: 1,
      tags: { env: 'staging', team: 'original' },
    });
    await storage.saveAlertDefinitions(1, [alert]);

    await storage.setOverlayTag('tagtest11111', 'team', 'override');
    await storage.setOverlayTag('tagtest11111', 'extra', 'new');

    const alerts = await storage.getAlertDefinitions(1);
    const overlayTags = await storage.getOverlayTags('tagtest11111');

    const merged = { ...alerts[0]!.tags, ...overlayTags };
    expect(merged).toEqual({ env: 'staging', team: 'override', extra: 'new' });
  });
});
