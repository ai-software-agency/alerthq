import { describe, it, expect, vi } from 'vitest';

describe('plugin loader validation', () => {
  /**
   * We test the duck-type validation by directly importing the module
   * and exercising its public API with mock dynamic imports.
   */

  it('rejects a storage plugin missing required methods', async () => {
    // Mock a plugin that's missing methods
    vi.doMock('@alerthq/storage-badplugin', () => ({
      default: () => ({
        name: 'bad',
        initialize: vi.fn(),
        // missing all other required methods
      }),
    }));

    const { loadStoragePlugin } = await import('../src/loader/plugin-loader.js');

    const config = {
      storage: { provider: 'badplugin' },
      providers: {},
    };

    await expect(loadStoragePlugin(config)).rejects.toThrow(/missing required methods/);

    vi.doUnmock('@alerthq/storage-badplugin');
  });

  it('rejects a plugin that does not export a factory function', async () => {
    vi.doMock('@alerthq/storage-notafunc', () => ({
      default: 'not a function',
    }));

    const { loadStoragePlugin } = await import('../src/loader/plugin-loader.js');

    const config = {
      storage: { provider: 'notafunc' },
      providers: {},
    };

    await expect(loadStoragePlugin(config)).rejects.toThrow(/does not export a factory function/);

    vi.doUnmock('@alerthq/storage-notafunc');
  });

  it('rejects a plugin whose factory returns a non-object', async () => {
    vi.doMock('@alerthq/storage-returnsnull', () => ({
      default: () => null,
    }));

    const { loadStoragePlugin } = await import('../src/loader/plugin-loader.js');

    const config = {
      storage: { provider: 'returnsnull' },
      providers: {},
    };

    await expect(loadStoragePlugin(config)).rejects.toThrow(/did not return an object/);

    vi.doUnmock('@alerthq/storage-returnsnull');
  });

  it('rejects a plugin with empty name', async () => {
    vi.doMock('@alerthq/storage-emptyname', () => ({
      default: () => ({
        name: '',
        initialize: vi.fn(),
      }),
    }));

    const { loadStoragePlugin } = await import('../src/loader/plugin-loader.js');

    const config = {
      storage: { provider: 'emptyname' },
      providers: {},
    };

    await expect(loadStoragePlugin(config)).rejects.toThrow(/missing a 'name' property/);

    vi.doUnmock('@alerthq/storage-emptyname');
  });

  it('throws an actionable message when plugin is not installed', async () => {
    const { loadStoragePlugin } = await import('../src/loader/plugin-loader.js');

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

    vi.doMock('@alerthq/storage-validstorage', () => ({
      default: () => mockStorage,
    }));

    const { loadStoragePlugin } = await import('../src/loader/plugin-loader.js');

    const config = {
      storage: { provider: 'validstorage', validstorage: { path: './test.db' } },
      providers: {},
    };

    const result = await loadStoragePlugin(config);
    expect(result.name).toBe('test-storage');
    expect(mockStorage.initialize).toHaveBeenCalledWith({ path: './test.db' });

    vi.doUnmock('@alerthq/storage-validstorage');
  });

  it('skips disabled providers', async () => {
    const { loadProviderPlugins } = await import('../src/loader/plugin-loader.js');

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

    vi.doMock('my-custom-provider', () => ({
      default: () => mockAdapter,
    }));

    const { loadProviderPlugins } = await import('../src/loader/plugin-loader.js');

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

    vi.doUnmock('my-custom-provider');
  });
});
