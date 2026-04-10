import { describe, it, expect, vi } from 'vitest';
import type { PluginImportFn } from '../src/loader/plugin-loader.js';
import { loadStoragePlugin, loadProviderPlugins } from '../src/loader/plugin-loader.js';

describe('plugin loader validation', () => {
  it('rejects a storage plugin missing required methods', async () => {
    const fakeImport: PluginImportFn = async () => ({
      factory: () => ({
        name: 'bad',
        initialize: vi.fn(),
      }),
    });

    const config = {
      storage: { provider: 'badplugin' },
      providers: {},
    };

    await expect(loadStoragePlugin(config, fakeImport)).rejects.toThrow(
      /missing required methods/,
    );
  });

  it('rejects a plugin that does not export a factory function', async () => {
    const fakeImport: PluginImportFn = async () => ({
      factory: 'not a function',
    });

    const config = {
      storage: { provider: 'notafunc' },
      providers: {},
    };

    await expect(loadStoragePlugin(config, fakeImport)).rejects.toThrow(
      /does not export a factory function/,
    );
  });

  it('rejects a plugin whose factory returns a non-object', async () => {
    const fakeImport: PluginImportFn = async () => ({
      factory: () => null,
    });

    const config = {
      storage: { provider: 'returnsnull' },
      providers: {},
    };

    await expect(loadStoragePlugin(config, fakeImport)).rejects.toThrow(
      /did not return an object/,
    );
  });

  it('rejects a plugin with empty name', async () => {
    const fakeImport: PluginImportFn = async () => ({
      factory: () => ({
        name: '',
        initialize: vi.fn(),
      }),
    });

    const config = {
      storage: { provider: 'emptyname' },
      providers: {},
    };

    await expect(loadStoragePlugin(config, fakeImport)).rejects.toThrow(
      /missing a 'name' property/,
    );
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

    const fakeImport: PluginImportFn = async () => ({
      factory: () => mockStorage,
    });

    const config = {
      storage: { provider: 'validstorage', validstorage: { path: './test.db' } },
      providers: {},
    };

    const result = await loadStoragePlugin(config, fakeImport);
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

    const fakeImport: PluginImportFn = async () => ({
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

    const result = await loadProviderPlugins(config, fakeImport);
    expect(result['custom']!.name).toBe('custom-provider');
    expect(mockAdapter.initialize).toHaveBeenCalledWith({ apiKey: 'test-key' });
  });
});
