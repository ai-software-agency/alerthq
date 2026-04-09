import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  loadStoragePlugin,
  loadProviderPlugins,
  _internal,
} from '../src/loader/plugin-loader.js';

describe('plugin loader validation', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects a storage plugin missing required methods', async () => {
    vi.spyOn(_internal, 'importPluginModule').mockResolvedValue({
      factory: () => ({
        name: 'bad',
        initialize: vi.fn(),
        // missing all other required methods
      }),
    });

    const config = {
      storage: { provider: 'badplugin' },
      providers: {},
    };

    await expect(loadStoragePlugin(config)).rejects.toThrow(/missing required methods/);
  });

  it('rejects a plugin that does not export a factory function', async () => {
    vi.spyOn(_internal, 'importPluginModule').mockResolvedValue({
      factory: 'not a function',
    });

    const config = {
      storage: { provider: 'notafunc' },
      providers: {},
    };

    await expect(loadStoragePlugin(config)).rejects.toThrow(
      /does not export a factory function/,
    );
  });

  it('rejects a plugin whose factory returns a non-object', async () => {
    vi.spyOn(_internal, 'importPluginModule').mockResolvedValue({
      factory: () => null,
    });

    const config = {
      storage: { provider: 'returnsnull' },
      providers: {},
    };

    await expect(loadStoragePlugin(config)).rejects.toThrow(/did not return an object/);
  });

  it('rejects a plugin with empty name', async () => {
    vi.spyOn(_internal, 'importPluginModule').mockResolvedValue({
      factory: () => ({
        name: '',
        initialize: vi.fn(),
      }),
    });

    const config = {
      storage: { provider: 'emptyname' },
      providers: {},
    };

    await expect(loadStoragePlugin(config)).rejects.toThrow(/missing a 'name' property/);
  });

  it('throws an actionable message when plugin is not installed', async () => {
    const config = {
      storage: { provider: 'nonexistent' },
      providers: {},
    };

    await expect(loadStoragePlugin(config)).rejects.toThrow(
      "Plugin '@alerthq/storage-nonexistent' not found",
    );
    await expect(loadStoragePlugin(config)).rejects.toThrow(
      'pnpm add @alerthq/storage-nonexistent',
    );
  });

  it('accepts a valid storage plugin with all required methods', async () => {
    const mockStorage = {
      name: 'test-storage',
      initialize: vi.fn().mockResolvedValue(undefined),
      createSyncRun: vi.fn(),
      getLatestSyncRun: vi.fn(),
      getSyncRun: vi.fn(),
      listSyncRuns: vi.fn(),
      saveAlertDefinitions: vi.fn(),
      getAlertDefinitions: vi.fn(),
      removeAlertDefinition: vi.fn(),
      findAlertsByIdPrefix: vi.fn(),
      getChanges: vi.fn(),
      setOverlayTag: vi.fn(),
      removeOverlayTag: vi.fn(),
      getOverlayTags: vi.fn(),
    };

    vi.spyOn(_internal, 'importPluginModule').mockResolvedValue({
      factory: () => mockStorage,
    });

    const config = {
      storage: { provider: 'validstorage', validstorage: { path: './test.db' } },
      providers: {},
    };

    const result = await loadStoragePlugin(config);
    expect(result.name).toBe('test-storage');
    expect(mockStorage.initialize).toHaveBeenCalledWith({ path: './test.db' });
  });

  it('skips disabled providers', async () => {
    const config = {
      storage: { provider: 'sqlite' },
      providers: {
        disabled: { enabled: false },
      },
    };

    const result = await loadProviderPlugins(config);
    expect(Object.keys(result)).toHaveLength(0);
  });

  it('resolves third-party provider via explicit package field', async () => {
    const mockAdapter = {
      name: 'custom-provider',
      initialize: vi.fn().mockResolvedValue(undefined),
      fetchAlerts: vi.fn().mockResolvedValue([]),
      testConnection: vi.fn().mockResolvedValue(true),
    };

    vi.spyOn(_internal, 'importPluginModule').mockResolvedValue({
      factory: () => mockAdapter,
    });

    const config = {
      storage: { provider: 'sqlite' },
      providers: {
        custom: {
          enabled: true,
          package: 'my-custom-provider',
          apiKey: 'test-key',
        },
      },
    };

    const result = await loadProviderPlugins(config);
    expect(result['custom']!.name).toBe('custom-provider');
    expect(mockAdapter.initialize).toHaveBeenCalledWith({ apiKey: 'test-key' });
  });
});
