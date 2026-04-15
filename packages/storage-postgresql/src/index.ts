import pg from 'pg';
import type { StorageProvider, StorageFactory, AlertDefinition, SyncRun } from '@alerthq/core';

const { Pool } = pg;

const MIGRATIONS: Array<{ version: number; sql: string }> = [
  {
    version: 1,
    sql: `
      CREATE TABLE sync_runs (
        version INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        name TEXT NOT NULL DEFAULT '',
        description TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL,
        provider_status JSONB NOT NULL DEFAULT '{}'
      );

      CREATE TABLE alert_definitions (
        id TEXT NOT NULL,
        version INTEGER NOT NULL,
        source TEXT NOT NULL,
        source_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        enabled BOOLEAN NOT NULL,
        severity TEXT NOT NULL,
        condition_summary TEXT DEFAULT '',
        notification_targets JSONB DEFAULT '[]',
        tags JSONB DEFAULT '{}',
        owner TEXT DEFAULT '',
        raw_config JSONB DEFAULT '{}',
        config_hash TEXT NOT NULL,
        last_modified_at TIMESTAMPTZ,
        discovered_at TIMESTAMPTZ NOT NULL,
        PRIMARY KEY (id, version),
        FOREIGN KEY (version) REFERENCES sync_runs(version)
      );

      CREATE TABLE overlay_tags (
        alert_id TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        PRIMARY KEY (alert_id, key)
      );

      CREATE INDEX idx_alerts_version ON alert_definitions(version);
      CREATE INDEX idx_alerts_source ON alert_definitions(source);

      INSERT INTO sync_runs OVERRIDING SYSTEM VALUE
      VALUES (0, 'manual', 'Manual alert entries', NOW(), '{}');
    `,
  },
];

class PostgresStorageProvider implements StorageProvider {
  readonly name = 'postgresql';
  private pool!: pg.Pool;

  async initialize(config: Record<string, unknown>): Promise<void> {
    const connectionString = config['connectionString'] as string | undefined;

    if (connectionString) {
      this.pool = new Pool({ connectionString });
    } else {
      this.pool = new Pool({
        host: (config['host'] as string) ?? 'localhost',
        port: (config['port'] as number) ?? 5432,
        database: (config['database'] as string) ?? 'alerthq',
        user: (config['username'] as string) ?? undefined,
        password: (config['password'] as string) ?? undefined,
        ssl: (config['ssl'] as boolean | pg.ConnectionConfig['ssl']) ?? undefined,
      });
    }

    await this.runMigrations();
  }

  async dispose(): Promise<void> {
    await this.pool.end();
  }

  private async runMigrations(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        version INTEGER PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL
      );
    `);

    const { rows } = await this.pool.query<{ version: number }>('SELECT version FROM _migrations');
    const applied = new Set(rows.map((r) => r.version));

    for (const migration of MIGRATIONS) {
      if (!applied.has(migration.version)) {
        const client = await this.pool.connect();
        try {
          await client.query('BEGIN');
          await client.query(migration.sql);
          await client.query('INSERT INTO _migrations (version, applied_at) VALUES ($1, NOW())', [
            migration.version,
          ]);
          await client.query('COMMIT');
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        } finally {
          client.release();
        }
      }
    }
  }

  // ---- Sync runs ----

  async createSyncRun(run: SyncRun): Promise<void> {
    await this.pool.query(
      `INSERT INTO sync_runs OVERRIDING SYSTEM VALUE
       VALUES ($1, $2, $3, $4, $5)`,
      [run.version, run.name, run.description, run.createdAt, JSON.stringify(run.providerStatus)],
    );
  }

  async getLatestSyncRun(): Promise<SyncRun | null> {
    const { rows } = await this.pool.query<RawSyncRun>(
      'SELECT * FROM sync_runs WHERE version > 0 ORDER BY version DESC LIMIT 1',
    );
    return rows.length > 0 ? toSyncRun(rows[0]) : null;
  }

  async getSyncRun(version: number): Promise<SyncRun | null> {
    const { rows } = await this.pool.query<RawSyncRun>(
      'SELECT * FROM sync_runs WHERE version = $1',
      [version],
    );
    return rows.length > 0 ? toSyncRun(rows[0]) : null;
  }

  async listSyncRuns(limit?: number, offset?: number): Promise<SyncRun[]> {
    if (limit !== undefined && offset !== undefined) {
      const { rows } = await this.pool.query<RawSyncRun>(
        'SELECT * FROM sync_runs WHERE version > 0 ORDER BY version DESC LIMIT $1 OFFSET $2',
        [limit, offset],
      );
      return rows.map(toSyncRun);
    }
    if (limit !== undefined) {
      const { rows } = await this.pool.query<RawSyncRun>(
        'SELECT * FROM sync_runs WHERE version > 0 ORDER BY version DESC LIMIT $1',
        [limit],
      );
      return rows.map(toSyncRun);
    }
    const { rows } = await this.pool.query<RawSyncRun>(
      'SELECT * FROM sync_runs WHERE version > 0 ORDER BY version DESC',
    );
    return rows.map(toSyncRun);
  }

  // ---- Alert definitions ----

  async saveAlertDefinitions(version: number, alerts: AlertDefinition[]): Promise<void> {
    if (alerts.length === 0) return;

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      for (const a of alerts) {
        await client.query(
          `INSERT INTO alert_definitions
           (id, version, source, source_id, name, description, enabled, severity,
            condition_summary, notification_targets, tags, owner, raw_config,
            config_hash, last_modified_at, discovered_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
           ON CONFLICT (id, version) DO UPDATE SET
            source = EXCLUDED.source,
            source_id = EXCLUDED.source_id,
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            enabled = EXCLUDED.enabled,
            severity = EXCLUDED.severity,
            condition_summary = EXCLUDED.condition_summary,
            notification_targets = EXCLUDED.notification_targets,
            tags = EXCLUDED.tags,
            owner = EXCLUDED.owner,
            raw_config = EXCLUDED.raw_config,
            config_hash = EXCLUDED.config_hash,
            last_modified_at = EXCLUDED.last_modified_at,
            discovered_at = EXCLUDED.discovered_at`,
          [
            a.id,
            version,
            a.source,
            a.sourceId,
            a.name,
            a.description,
            a.enabled,
            a.severity,
            a.conditionSummary,
            JSON.stringify(a.notificationTargets),
            JSON.stringify(a.tags),
            a.owner,
            JSON.stringify(a.rawConfig),
            a.configHash,
            a.lastModifiedAt,
            a.discoveredAt,
          ],
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getAlertDefinitions(
    version: number,
    opts?: { limit?: number; offset?: number },
  ): Promise<AlertDefinition[]> {
    if (opts?.limit !== undefined && opts.offset !== undefined) {
      const { rows } = await this.pool.query<RawAlert>(
        'SELECT * FROM alert_definitions WHERE version = $1 LIMIT $2 OFFSET $3',
        [version, opts.limit, opts.offset],
      );
      return rows.map(toAlert);
    }
    if (opts?.limit !== undefined) {
      const { rows } = await this.pool.query<RawAlert>(
        'SELECT * FROM alert_definitions WHERE version = $1 LIMIT $2',
        [version, opts.limit],
      );
      return rows.map(toAlert);
    }
    const { rows } = await this.pool.query<RawAlert>(
      'SELECT * FROM alert_definitions WHERE version = $1',
      [version],
    );
    return rows.map(toAlert);
  }

  async removeAlertDefinition(version: number, alertId: string): Promise<boolean> {
    const result = await this.pool.query(
      'DELETE FROM alert_definitions WHERE version = $1 AND id = $2',
      [version, alertId],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async findAlertsByIdPrefix(version: number, prefix: string): Promise<AlertDefinition[]> {
    const { rows } = await this.pool.query<RawAlert>(
      'SELECT * FROM alert_definitions WHERE version = $1 AND id LIKE $2',
      [version, prefix + '%'],
    );
    return rows.map(toAlert);
  }

  // ---- Drift detection ----

  async getChanges(
    fromVersion: number,
    toVersion: number,
  ): Promise<{
    added: AlertDefinition[];
    removed: AlertDefinition[];
    modified: Array<{ before: AlertDefinition; after: AlertDefinition }>;
  }> {
    if (fromVersion === 0 || toVersion === 0) {
      throw new Error('getChanges does not operate on version 0 (manual alerts)');
    }

    const { rows: addedRows } = await this.pool.query<RawAlert>(
      `SELECT * FROM alert_definitions
       WHERE version = $1 AND id NOT IN (SELECT id FROM alert_definitions WHERE version = $2)`,
      [toVersion, fromVersion],
    );
    const added = addedRows.map(toAlert);

    const { rows: removedRows } = await this.pool.query<RawAlert>(
      `SELECT * FROM alert_definitions
       WHERE version = $1 AND id NOT IN (SELECT id FROM alert_definitions WHERE version = $2)`,
      [fromVersion, toVersion],
    );
    const removed = removedRows.map(toAlert);

    const { rows: modifiedRows } = await this.pool.query<RawAlert & RawAlertPrefixed>(
      `SELECT a.*, b.id as b_id, b.version as b_version, b.source as b_source,
              b.source_id as b_source_id, b.name as b_name, b.description as b_description,
              b.enabled as b_enabled, b.severity as b_severity,
              b.condition_summary as b_condition_summary,
              b.notification_targets as b_notification_targets, b.tags as b_tags,
              b.owner as b_owner, b.raw_config as b_raw_config,
              b.config_hash as b_config_hash, b.last_modified_at as b_last_modified_at,
              b.discovered_at as b_discovered_at
       FROM alert_definitions a
       JOIN alert_definitions b ON a.id = b.id
       WHERE a.version = $1 AND b.version = $2 AND a.config_hash != b.config_hash`,
      [fromVersion, toVersion],
    );

    const modified = modifiedRows.map((row) => ({
      before: toAlert(row),
      after: toAlert({
        id: row.b_id,
        version: row.b_version,
        source: row.b_source,
        source_id: row.b_source_id,
        name: row.b_name,
        description: row.b_description,
        enabled: row.b_enabled,
        severity: row.b_severity,
        condition_summary: row.b_condition_summary,
        notification_targets: row.b_notification_targets,
        tags: row.b_tags,
        owner: row.b_owner,
        raw_config: row.b_raw_config,
        config_hash: row.b_config_hash,
        last_modified_at: row.b_last_modified_at,
        discovered_at: row.b_discovered_at,
      }),
    }));

    return { added, removed, modified };
  }

  // ---- Overlay tags ----

  async setOverlayTag(alertId: string, key: string, value: string): Promise<void> {
    await this.pool.query(
      `INSERT INTO overlay_tags (alert_id, key, value) VALUES ($1, $2, $3)
       ON CONFLICT (alert_id, key) DO UPDATE SET value = EXCLUDED.value`,
      [alertId, key, value],
    );
  }

  async removeOverlayTag(alertId: string, key: string): Promise<boolean> {
    const result = await this.pool.query(
      'DELETE FROM overlay_tags WHERE alert_id = $1 AND key = $2',
      [alertId, key],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async getOverlayTags(alertId: string): Promise<Record<string, string>> {
    const { rows } = await this.pool.query<{ key: string; value: string }>(
      'SELECT key, value FROM overlay_tags WHERE alert_id = $1',
      [alertId],
    );
    const tags: Record<string, string> = {};
    for (const row of rows) {
      tags[row.key] = row.value;
    }
    return tags;
  }
}

// ---- Raw DB row types ----

interface RawSyncRun {
  version: number;
  name: string;
  description: string;
  created_at: string;
  provider_status: Record<string, string> | string;
}

interface RawAlert {
  id: string;
  version: number;
  source: string;
  source_id: string;
  name: string;
  description: string;
  enabled: boolean;
  severity: string;
  condition_summary: string;
  notification_targets: string[] | string;
  tags: Record<string, string> | string;
  owner: string;
  raw_config: Record<string, unknown> | string;
  config_hash: string;
  last_modified_at: string | null;
  discovered_at: string;
}

interface RawAlertPrefixed {
  b_id: string;
  b_version: number;
  b_source: string;
  b_source_id: string;
  b_name: string;
  b_description: string;
  b_enabled: boolean;
  b_severity: string;
  b_condition_summary: string;
  b_notification_targets: string[] | string;
  b_tags: Record<string, string> | string;
  b_owner: string;
  b_raw_config: Record<string, unknown> | string;
  b_config_hash: string;
  b_last_modified_at: string | null;
  b_discovered_at: string;
}

function toSyncRun(row: RawSyncRun): SyncRun {
  const providerStatus =
    typeof row.provider_status === 'string' ? JSON.parse(row.provider_status) : row.provider_status;
  const createdAtRaw: unknown = row.created_at;
  return {
    version: row.version,
    name: row.name,
    description: row.description,
    createdAt: createdAtRaw instanceof Date ? createdAtRaw.toISOString() : String(row.created_at),
    providerStatus,
  };
}

function toAlert(row: RawAlert): AlertDefinition {
  const notificationTargets =
    typeof row.notification_targets === 'string'
      ? JSON.parse(row.notification_targets)
      : row.notification_targets;
  const tags = typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags;
  const rawConfig =
    typeof row.raw_config === 'string' ? JSON.parse(row.raw_config) : row.raw_config;

  const lastModifiedAtRaw: unknown = row.last_modified_at;
  const lastModifiedAt =
    lastModifiedAtRaw instanceof Date ? lastModifiedAtRaw.toISOString() : row.last_modified_at;
  const discoveredAtRaw: unknown = row.discovered_at;
  const discoveredAt =
    discoveredAtRaw instanceof Date ? discoveredAtRaw.toISOString() : String(row.discovered_at);

  return {
    id: row.id,
    version: row.version,
    source: row.source,
    sourceId: row.source_id,
    name: row.name,
    description: row.description,
    enabled: row.enabled,
    severity: row.severity as AlertDefinition['severity'],
    conditionSummary: row.condition_summary,
    notificationTargets,
    tags,
    owner: row.owner,
    rawConfig,
    configHash: row.config_hash,
    lastModifiedAt,
    discoveredAt,
  };
}

const factory: StorageFactory = () => new PostgresStorageProvider();
export default factory;
