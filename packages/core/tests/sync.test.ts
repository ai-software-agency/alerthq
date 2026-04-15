import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sync } from '../src/sync.js';
import type { Context } from '../src/types/config.js';
import type { StorageProvider } from '../src/interfaces/storage.js';
import type { ProviderAdapter } from '../src/interfaces/provider.js';
import type { AlertDefinition } from '../src/types/alert.js';
import type { SyncRun } from '../src/types/sync-run.js';
import { setLogger } from '../src/utils/logger.js';

function makeAlert(overrides: Partial<AlertDefinition> = {}): AlertDefinition {
  return {
    id: 'alert-001',
    version: 0,
    source: 'test-provider',
    sourceId: 'src-001',
    name: 'Test Alert',
    description: '',
    enabled: true,
    severity: 'warning',
    conditionSummary: 'cpu > 80%',
    notificationTargets: [],
    tags: {},
    owner: '',
    rawConfig: {},
    configHash: 'abc123',
    lastModifiedAt: null,
    discoveredAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeStorage(overrides: Partial<StorageProvider> = {}): StorageProvider {
  return {
    name: 'mock-storage',
    initialize: vi.fn().mockResolvedValue(undefined),
    createSyncRun: vi.fn().mockResolvedValue(undefined),
    getLatestSyncRun: vi.fn().mockResolvedValue(null),
    getSyncRun: vi.fn().mockResolvedValue(null),
    listSyncRuns: vi.fn().mockResolvedValue([]),
    saveAlertDefinitions: vi.fn().mockResolvedValue(undefined),
    getAlertDefinitions: vi.fn().mockResolvedValue([]),
    removeAlertDefinition: vi.fn().mockResolvedValue(false),
    findAlertsByIdPrefix: vi.fn().mockResolvedValue([]),
    getChanges: vi.fn().mockResolvedValue({ added: [], removed: [], modified: [] }),
    setOverlayTag: vi.fn().mockResolvedValue(undefined),
    removeOverlayTag: vi.fn().mockResolvedValue(false),
    getOverlayTags: vi.fn().mockResolvedValue({}),
    ...overrides,
  };
}

function makeProvider(name: string, alerts: AlertDefinition[] = []): ProviderAdapter {
  return {
    name,
    sources: sources ?? [name],
    initialize: vi.fn().mockResolvedValue(undefined),
    fetchAlerts: vi.fn().mockResolvedValue(alerts),
    testConnection: vi.fn().mockResolvedValue(true),
  };
}

function makeContext(
  storage: StorageProvider,
  providers: Record<string, ProviderAdapter>,
): Context {
  return {
    config: { storage: { provider: 'mock' }, providers: {} },
    storage,
    providers,
    dispose: vi.fn().mockResolvedValue(undefined),
  };
}

beforeEach(() => {
  setLogger({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  });
});

describe('sync', () => {
  it('creates a new version when changes are detected', async () => {
    const alert = makeAlert();
    const storage = makeStorage();
    const provider = makeProvider('test', [alert]);
    const ctx = makeContext(storage, { test: provider });

    const result = await sync(ctx);

    expect(result).not.toBeNull();
    expect(result!.version).toBe(1);
    expect(result!.providerStatus).toEqual({ test: 'success' });
    expect(storage.createSyncRun).toHaveBeenCalledOnce();
    expect(storage.saveAlertDefinitions).toHaveBeenCalledWith(1, [alert]);
  });

  it('returns null when no changes since last sync', async () => {
    const alert = makeAlert();
    const latestRun: SyncRun = {
      version: 3,
      name: 'Sync',
      description: '',
      createdAt: '2025-01-01T00:00:00.000Z',
      providerStatus: { test: 'success' },
    };
    const storage = makeStorage({
      getLatestSyncRun: vi.fn().mockResolvedValue(latestRun),
      getAlertDefinitions: vi.fn().mockResolvedValue([alert]),
    });
    const provider = makeProvider('test', [alert]);
    const ctx = makeContext(storage, { test: provider });

    const result = await sync(ctx);

    expect(result).toBeNull();
    expect(storage.createSyncRun).not.toHaveBeenCalled();
  });

  it('handles partial failure: one provider errors, others succeed', async () => {
    const alert = makeAlert({ source: 'good-provider' });
    const good = makeProvider('good', [alert]);
    const bad: ProviderAdapter = {
      name: 'bad',
      sources: ['bad'],
      initialize: vi.fn().mockResolvedValue(undefined),
      fetchAlerts: vi.fn().mockRejectedValue(new Error('connection refused')),
      testConnection: vi.fn().mockResolvedValue(false),
    };
    const storage = makeStorage();
    const ctx = makeContext(storage, { good, bad });

    const result = await sync(ctx);

    expect(result).not.toBeNull();
    expect(result!.providerStatus.good).toBe('success');
    expect(result!.providerStatus.bad).toBe('error');
    expect(storage.saveAlertDefinitions).toHaveBeenCalledWith(1, [alert]);
  });

  it('filters to a single provider when opts.provider is set', async () => {
    const alertA = makeAlert({ id: 'a', source: 'alpha' });
    const alertB = makeAlert({ id: 'b', source: 'beta' });
    const alpha = makeProvider('alpha', [alertA]);
    const beta = makeProvider('beta', [alertB]);
    const storage = makeStorage();
    const ctx = makeContext(storage, { alpha, beta });

    const result = await sync(ctx, { provider: 'alpha' });

    expect(result).not.toBeNull();
    expect(result!.providerStatus.alpha).toBe('success');
    expect(result!.providerStatus.beta).toBe('skipped');
    expect(beta.fetchAlerts).not.toHaveBeenCalled();
  });

  it('throws when opts.provider refers to an unconfigured provider', async () => {
    const storage = makeStorage();
    const ctx = makeContext(storage, {});

    await expect(sync(ctx, { provider: 'nonexistent' })).rejects.toThrow(
      "Provider 'nonexistent' is not configured or not enabled",
    );
  });

  it('respects signal.aborted before fetching', async () => {
    const controller = new AbortController();
    controller.abort(new Error('cancelled'));

    const provider = makeProvider('test', []);
    const storage = makeStorage();
    const ctx = makeContext(storage, { test: provider });

    await expect(sync(ctx, { signal: controller.signal })).rejects.toThrow('cancelled');
    expect(provider.fetchAlerts).not.toHaveBeenCalled();
  });

  it('single-provider sync carries forward alerts from other providers', async () => {
    const awsAlert = makeAlert({ id: 'aws-1', source: 'aws-cloudwatch', configHash: 'h1' });
    const azureAlert = makeAlert({ id: 'az-1', source: 'azure-metric-alert', configHash: 'h2' });
    const latestRun: SyncRun = {
      version: 1,
      name: 'Sync',
      description: '',
      createdAt: '2025-01-01T00:00:00.000Z',
      providerStatus: { 'aws-cloudwatch': 'success', 'azure-monitor': 'success' },
    };

    const freshAzureAlert = makeAlert({ id: 'az-1', source: 'azure-metric-alert', configHash: 'h2-updated' });
    const storage = makeStorage({
      getLatestSyncRun: vi.fn().mockResolvedValue(latestRun),
      getAlertDefinitions: vi.fn().mockResolvedValue([awsAlert, azureAlert]),
    });
    const azure = makeProvider('azure-monitor', [freshAzureAlert], [
      'azure-metric-alert', 'azure-activity-log-alert', 'azure-scheduled-query-rule',
    ]);
    const aws = makeProvider('aws-cloudwatch', []);
    const ctx = makeContext(storage, { 'aws-cloudwatch': aws, 'azure-monitor': azure });

    const result = await sync(ctx, { provider: 'azure-monitor' });

    expect(result).not.toBeNull();
    expect(aws.fetchAlerts).not.toHaveBeenCalled();

    const savedAlerts = (storage.saveAlertDefinitions as ReturnType<typeof vi.fn>).mock.calls[0]![1] as AlertDefinition[];
    expect(savedAlerts).toHaveLength(2);
    expect(savedAlerts.find((a) => a.id === 'aws-1')).toBeTruthy();
    expect(savedAlerts.find((a) => a.id === 'az-1')?.configHash).toBe('h2-updated');
  });

  it('single-provider sync drops deleted alerts from targeted provider', async () => {
    const awsAlert = makeAlert({ id: 'aws-1', source: 'aws-cloudwatch', configHash: 'h1' });
    const azureAlert1 = makeAlert({ id: 'az-1', source: 'azure-metric-alert', configHash: 'h2' });
    const azureAlert2 = makeAlert({ id: 'az-2', source: 'azure-activity-log-alert', configHash: 'h3' });
    const latestRun: SyncRun = {
      version: 1,
      name: 'Sync',
      description: '',
      createdAt: '2025-01-01T00:00:00.000Z',
      providerStatus: { 'aws-cloudwatch': 'success', 'azure-monitor': 'success' },
    };

    const storage = makeStorage({
      getLatestSyncRun: vi.fn().mockResolvedValue(latestRun),
      getAlertDefinitions: vi.fn().mockResolvedValue([awsAlert, azureAlert1, azureAlert2]),
    });
    const azure = makeProvider('azure-monitor', [azureAlert1], [
      'azure-metric-alert', 'azure-activity-log-alert', 'azure-scheduled-query-rule',
    ]);
    const aws = makeProvider('aws-cloudwatch', []);
    const ctx = makeContext(storage, { 'aws-cloudwatch': aws, 'azure-monitor': azure });

    const result = await sync(ctx, { provider: 'azure-monitor' });

    expect(result).not.toBeNull();
    const savedAlerts = (storage.saveAlertDefinitions as ReturnType<typeof vi.fn>).mock.calls[0]![1] as AlertDefinition[];
    expect(savedAlerts).toHaveLength(2);
    expect(savedAlerts.find((a) => a.id === 'aws-1')).toBeTruthy();
    expect(savedAlerts.find((a) => a.id === 'az-1')).toBeTruthy();
    expect(savedAlerts.find((a) => a.id === 'az-2')).toBeUndefined();
  });

  it('no-change detection works with merged set', async () => {
    const awsAlert = makeAlert({ id: 'aws-1', source: 'aws-cloudwatch', configHash: 'h1' });
    const azureAlert = makeAlert({ id: 'az-1', source: 'azure-metric-alert', configHash: 'h2' });
    const latestRun: SyncRun = {
      version: 1,
      name: 'Sync',
      description: '',
      createdAt: '2025-01-01T00:00:00.000Z',
      providerStatus: { 'aws-cloudwatch': 'success', 'azure-monitor': 'success' },
    };

    const storage = makeStorage({
      getLatestSyncRun: vi.fn().mockResolvedValue(latestRun),
      getAlertDefinitions: vi.fn().mockResolvedValue([awsAlert, azureAlert]),
    });
    const azure = makeProvider('azure-monitor', [azureAlert], [
      'azure-metric-alert', 'azure-activity-log-alert', 'azure-scheduled-query-rule',
    ]);
    const aws = makeProvider('aws-cloudwatch', []);
    const ctx = makeContext(storage, { 'aws-cloudwatch': aws, 'azure-monitor': azure });

    const result = await sync(ctx, { provider: 'azure-monitor' });

    expect(result).toBeNull();
    expect(storage.createSyncRun).not.toHaveBeenCalled();
  });

  it('full sync replaces everything without carry-forward', async () => {
    const oldAlert = makeAlert({ id: 'old-1', source: 'aws-cloudwatch', configHash: 'h-old' });
    const newAlert = makeAlert({ id: 'new-1', source: 'aws-cloudwatch', configHash: 'h-new' });
    const latestRun: SyncRun = {
      version: 1,
      name: 'Sync',
      description: '',
      createdAt: '2025-01-01T00:00:00.000Z',
      providerStatus: { 'aws-cloudwatch': 'success' },
    };

    const storage = makeStorage({
      getLatestSyncRun: vi.fn().mockResolvedValue(latestRun),
      getAlertDefinitions: vi.fn().mockResolvedValue([oldAlert]),
    });
    const aws = makeProvider('aws-cloudwatch', [newAlert]);
    const ctx = makeContext(storage, { 'aws-cloudwatch': aws });

    const result = await sync(ctx);

    expect(result).not.toBeNull();
    const savedAlerts = (storage.saveAlertDefinitions as ReturnType<typeof vi.fn>).mock.calls[0]![1] as AlertDefinition[];
    expect(savedAlerts).toHaveLength(1);
    expect(savedAlerts[0]!.id).toBe('new-1');
  });
});
