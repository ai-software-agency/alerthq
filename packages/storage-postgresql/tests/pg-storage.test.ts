import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { StorageProvider, AlertDefinition, SyncRun } from '@alerthq/core';

/**
 * PostgreSQL storage tests using a mocked pg.Pool.
 *
 * These validate the storage provider's SQL logic and data mapping without
 * requiring a running PostgreSQL instance. For full integration tests, set up
 * a test database (e.g. via testcontainers) and remove the mocks.
 */

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
    lastModifiedAt: '2026-01-01T00:00:00.000Z',
    discoveredAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeMockPool() {
  const queryResults: Array<{ rows: unknown[] }> = [];
  let queryIndex = 0;

  const mockClient = {
    query: vi.fn(async () => {
      return queryResults[queryIndex++] ?? { rows: [], rowCount: 0 };
    }),
    release: vi.fn(),
  };

  const pool = {
    query: vi.fn(async () => {
      return queryResults[queryIndex++] ?? { rows: [], rowCount: 0 };
    }),
    connect: vi.fn(async () => mockClient),
    end: vi.fn(),
  };

  return {
    pool,
    mockClient,
    pushResult(rows: unknown[]) {
      queryResults.push({ rows });
    },
    resetIndex() {
      queryIndex = 0;
    },
  };
}

vi.mock('pg', () => {
  return {
    default: {
      Pool: vi.fn(),
    },
  };
});

describe('PostgresStorageProvider', () => {
  describe('interface contract', () => {
    it('default export is a factory function', async () => {
      const mod = await import('../src/index.js');
      expect(typeof mod.default).toBe('function');
    });

    it('factory returns an object with required StorageProvider methods', async () => {
      const mod = await import('../src/index.js');
      const instance = mod.default();
      expect(typeof instance.initialize).toBe('function');
      expect(typeof instance.createSyncRun).toBe('function');
      expect(typeof instance.getLatestSyncRun).toBe('function');
      expect(typeof instance.getSyncRun).toBe('function');
      expect(typeof instance.listSyncRuns).toBe('function');
      expect(typeof instance.saveAlertDefinitions).toBe('function');
      expect(typeof instance.getAlertDefinitions).toBe('function');
      expect(typeof instance.removeAlertDefinition).toBe('function');
      expect(typeof instance.findAlertsByIdPrefix).toBe('function');
      expect(typeof instance.getChanges).toBe('function');
      expect(typeof instance.setOverlayTag).toBe('function');
      expect(typeof instance.removeOverlayTag).toBe('function');
      expect(typeof instance.getOverlayTags).toBe('function');
      expect(typeof instance.dispose).toBe('function');
    });

    it('has name "postgresql"', async () => {
      const mod = await import('../src/index.js');
      const instance = mod.default();
      expect(instance.name).toBe('postgresql');
    });
  });

  describe('data mapping', () => {
    it('toSyncRun maps snake_case rows to camelCase SyncRun', async () => {
      const { default: factory } = await import('../src/index.js');
      const instance = factory();

      const pgMock = await import('pg');
      const mockPool = makeMockPool();
      (pgMock.default.Pool as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockPool.pool);

      mockPool.pushResult([]); // CREATE TABLE _migrations
      mockPool.pushResult([]); // SELECT version FROM _migrations
      mockPool.pushResult([]); // BEGIN
      mockPool.pushResult([]); // migration SQL
      mockPool.pushResult([]); // INSERT _migrations
      mockPool.pushResult([]); // COMMIT

      await instance.initialize({ connectionString: 'postgresql://localhost/test' });

      mockPool.pushResult([
        {
          version: 1,
          name: 'Sync 2026-01-01',
          description: 'Test sync',
          created_at: '2026-01-01T00:00:00.000Z',
          provider_status: { 'aws-cloudwatch': 'success' },
        },
      ]);

      const run = await instance.getLatestSyncRun();
      expect(run).not.toBeNull();
      expect(run!.version).toBe(1);
      expect(run!.name).toBe('Sync 2026-01-01');
      expect(run!.providerStatus).toEqual({ 'aws-cloudwatch': 'success' });
    });

    it('toAlert maps JSONB columns that pg already parsed as objects', async () => {
      const { default: factory } = await import('../src/index.js');
      const instance = factory();

      const pgMock = await import('pg');
      const mockPool = makeMockPool();
      (pgMock.default.Pool as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockPool.pool);

      // Initialize
      for (let i = 0; i < 6; i++) mockPool.pushResult([]);
      await instance.initialize({ connectionString: 'postgresql://localhost/test' });

      mockPool.pushResult([
        {
          id: 'abc123def456',
          version: 1,
          source: 'aws-cloudwatch',
          source_id: 'arn:aws:cloudwatch:us-east-1:123:alarm:MyAlarm',
          name: 'CPU High',
          description: 'CPU usage above 80%',
          enabled: true,
          severity: 'warning',
          condition_summary: 'CPUUtilization GreaterThanThreshold 80',
          notification_targets: ['arn:aws:sns:us-east-1:123:alerts'],
          tags: { env: 'prod' },
          owner: 'platform-team',
          raw_config: { MetricName: 'CPUUtilization', Threshold: 80 },
          config_hash: 'aabbccdd',
          last_modified_at: '2026-01-01T00:00:00.000Z',
          discovered_at: '2026-01-01T00:00:00.000Z',
        },
      ]);

      const alerts = await instance.getAlertDefinitions(1);
      expect(alerts).toHaveLength(1);
      expect(alerts[0]!.id).toBe('abc123def456');
      expect(alerts[0]!.sourceId).toBe('arn:aws:cloudwatch:us-east-1:123:alarm:MyAlarm');
      expect(alerts[0]!.notificationTargets).toEqual(['arn:aws:sns:us-east-1:123:alerts']);
      expect(alerts[0]!.tags).toEqual({ env: 'prod' });
      expect(alerts[0]!.rawConfig).toEqual({ MetricName: 'CPUUtilization', Threshold: 80 });
    });

    it('toAlert handles JSON string columns (fallback path)', async () => {
      const { default: factory } = await import('../src/index.js');
      const instance = factory();

      const pgMock = await import('pg');
      const mockPool = makeMockPool();
      (pgMock.default.Pool as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockPool.pool);

      for (let i = 0; i < 6; i++) mockPool.pushResult([]);
      await instance.initialize({ connectionString: 'postgresql://localhost/test' });

      mockPool.pushResult([
        {
          id: 'abc123def456',
          version: 1,
          source: 'aws-cloudwatch',
          source_id: 'arn',
          name: 'Test',
          description: '',
          enabled: true,
          severity: 'info',
          condition_summary: '',
          notification_targets: '["target1"]',
          tags: '{"k":"v"}',
          owner: '',
          raw_config: '{"a":1}',
          config_hash: 'hash',
          last_modified_at: null,
          discovered_at: '2026-01-01T00:00:00.000Z',
        },
      ]);

      const alerts = await instance.getAlertDefinitions(1);
      expect(alerts[0]!.notificationTargets).toEqual(['target1']);
      expect(alerts[0]!.tags).toEqual({ k: 'v' });
      expect(alerts[0]!.rawConfig).toEqual({ a: 1 });
    });

    it('toSyncRun handles Date objects from pg driver', async () => {
      const { default: factory } = await import('../src/index.js');
      const instance = factory();

      const pgMock = await import('pg');
      const mockPool = makeMockPool();
      (pgMock.default.Pool as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockPool.pool);

      for (let i = 0; i < 6; i++) mockPool.pushResult([]);
      await instance.initialize({ connectionString: 'postgresql://localhost/test' });

      const dateObj = new Date('2026-03-15T10:00:00.000Z');
      mockPool.pushResult([
        {
          version: 5,
          name: 'Run 5',
          description: 'Test',
          created_at: dateObj,
          provider_status: '{}',
        },
      ]);

      const run = await instance.getLatestSyncRun();
      expect(run!.createdAt).toBe('2026-03-15T10:00:00.000Z');
      expect(run!.providerStatus).toEqual({});
    });
  });

  describe('getChanges version 0 guard', () => {
    it('throws when fromVersion is 0', async () => {
      const { default: factory } = await import('../src/index.js');
      const instance = factory();

      const pgMock = await import('pg');
      const mockPool = makeMockPool();
      (pgMock.default.Pool as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockPool.pool);

      for (let i = 0; i < 6; i++) mockPool.pushResult([]);
      await instance.initialize({ connectionString: 'postgresql://localhost/test' });

      await expect(instance.getChanges(0, 1)).rejects.toThrow(
        'getChanges does not operate on version 0',
      );
    });

    it('throws when toVersion is 0', async () => {
      const { default: factory } = await import('../src/index.js');
      const instance = factory();

      const pgMock = await import('pg');
      const mockPool = makeMockPool();
      (pgMock.default.Pool as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockPool.pool);

      for (let i = 0; i < 6; i++) mockPool.pushResult([]);
      await instance.initialize({ connectionString: 'postgresql://localhost/test' });

      await expect(instance.getChanges(1, 0)).rejects.toThrow(
        'getChanges does not operate on version 0',
      );
    });
  });

  describe('config', () => {
    it('supports connectionString config', async () => {
      const { default: factory } = await import('../src/index.js');
      const instance = factory();

      const pgMock = await import('pg');
      const mockPool = makeMockPool();
      const PoolCtor = pgMock.default.Pool as unknown as ReturnType<typeof vi.fn>;
      PoolCtor.mockReturnValue(mockPool.pool);

      for (let i = 0; i < 6; i++) mockPool.pushResult([]);
      await instance.initialize({ connectionString: 'postgresql://user:pass@host/db' });

      expect(PoolCtor).toHaveBeenCalledWith({
        connectionString: 'postgresql://user:pass@host/db',
      });
    });

    it('supports individual connection params', async () => {
      const { default: factory } = await import('../src/index.js');
      const instance = factory();

      const pgMock = await import('pg');
      const mockPool = makeMockPool();
      const PoolCtor = pgMock.default.Pool as unknown as ReturnType<typeof vi.fn>;
      PoolCtor.mockReturnValue(mockPool.pool);

      for (let i = 0; i < 6; i++) mockPool.pushResult([]);
      await instance.initialize({
        host: 'db.example.com',
        port: 5433,
        database: 'mydb',
        username: 'admin',
        password: 'secret',
      });

      expect(PoolCtor).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'db.example.com',
          port: 5433,
          database: 'mydb',
          user: 'admin',
          password: 'secret',
        }),
      );
    });
  });

  describe('dispose', () => {
    it('calls pool.end()', async () => {
      const { default: factory } = await import('../src/index.js');
      const instance = factory();

      const pgMock = await import('pg');
      const mockPool = makeMockPool();
      (pgMock.default.Pool as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockPool.pool);

      for (let i = 0; i < 6; i++) mockPool.pushResult([]);
      await instance.initialize({ connectionString: 'postgresql://localhost/test' });

      await instance.dispose!();
      expect(mockPool.pool.end).toHaveBeenCalled();
    });
  });
});
