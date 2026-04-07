import Database from 'better-sqlite3';
import type { StorageProvider, StorageFactory, AlertDefinition, SyncRun } from '@alerthq/core';

const MIGRATIONS: Array<{ version: number; sql: string }> = [
  {
    version: 1,
    sql: `
      CREATE TABLE sync_runs (
        version INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL DEFAULT '',
        description TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        provider_status TEXT NOT NULL DEFAULT '{}'
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
        notification_targets TEXT DEFAULT '[]',
        tags TEXT DEFAULT '{}',
        owner TEXT DEFAULT '',
        raw_config TEXT DEFAULT '{}',
        config_hash TEXT NOT NULL,
        last_modified_at TEXT,
        discovered_at TEXT NOT NULL,
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

      INSERT INTO sync_runs (version, name, description, created_at, provider_status)
      VALUES (0, 'manual', 'Manual alert entries', datetime('now'), '{}');
    `,
  },
];

class SqliteStorageProvider implements StorageProvider {
  readonly name = 'sqlite';
  private db!: Database.Database;

  async initialize(config: Record<string, unknown>): Promise<void> {
    const path = (config['path'] as string) ?? './alerthq.db';
    this.db = new Database(path);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.runMigrations();
  }

  async dispose(): Promise<void> {
    this.db.close();
  }

  private runMigrations(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS _migrations (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL
      );
    `);

    const applied = new Set(
      this.db
        .prepare('SELECT version FROM _migrations')
        .all()
        .map((row) => (row as { version: number }).version),
    );

    for (const migration of MIGRATIONS) {
      if (!applied.has(migration.version)) {
        this.db.transaction(() => {
          this.db.exec(migration.sql);
          this.db
            .prepare('INSERT INTO _migrations (version, applied_at) VALUES (?, ?)')
            .run(migration.version, new Date().toISOString());
        })();
      }
    }
  }

  // ---- Sync runs ----

  async createSyncRun(run: SyncRun): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO sync_runs (version, name, description, created_at, provider_status)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(
        run.version,
        run.name,
        run.description,
        run.createdAt,
        JSON.stringify(run.providerStatus),
      );
  }

  async getLatestSyncRun(): Promise<SyncRun | null> {
    const row = this.db
      .prepare('SELECT * FROM sync_runs WHERE version > 0 ORDER BY version DESC LIMIT 1')
      .get() as RawSyncRun | undefined;
    return row ? toSyncRun(row) : null;
  }

  async getSyncRun(version: number): Promise<SyncRun | null> {
    const row = this.db
      .prepare('SELECT * FROM sync_runs WHERE version = ?')
      .get(version) as RawSyncRun | undefined;
    return row ? toSyncRun(row) : null;
  }

  async listSyncRuns(limit?: number): Promise<SyncRun[]> {
    const sql = limit
      ? 'SELECT * FROM sync_runs WHERE version > 0 ORDER BY version DESC LIMIT ?'
      : 'SELECT * FROM sync_runs WHERE version > 0 ORDER BY version DESC';
    const rows = (limit ? this.db.prepare(sql).all(limit) : this.db.prepare(sql).all()) as RawSyncRun[];
    return rows.map(toSyncRun);
  }

  // ---- Alert definitions ----

  async saveAlertDefinitions(version: number, alerts: AlertDefinition[]): Promise<void> {
    const stmt = this.db.prepare(
      `INSERT OR REPLACE INTO alert_definitions
       (id, version, source, source_id, name, description, enabled, severity,
        condition_summary, notification_targets, tags, owner, raw_config,
        config_hash, last_modified_at, discovered_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    this.db.transaction(() => {
      for (const a of alerts) {
        stmt.run(
          a.id,
          version,
          a.source,
          a.sourceId,
          a.name,
          a.description,
          a.enabled ? 1 : 0,
          a.severity,
          a.conditionSummary,
          JSON.stringify(a.notificationTargets),
          JSON.stringify(a.tags),
          a.owner,
          JSON.stringify(a.rawConfig),
          a.configHash,
          a.lastModifiedAt,
          a.discoveredAt,
        );
      }
    })();
  }

  async getAlertDefinitions(version: number): Promise<AlertDefinition[]> {
    const rows = this.db
      .prepare('SELECT * FROM alert_definitions WHERE version = ?')
      .all(version) as RawAlert[];
    return rows.map(toAlert);
  }

  async removeAlertDefinition(version: number, alertId: string): Promise<boolean> {
    const result = this.db
      .prepare('DELETE FROM alert_definitions WHERE version = ? AND id = ?')
      .run(version, alertId);
    return result.changes > 0;
  }

  async findAlertsByIdPrefix(version: number, prefix: string): Promise<AlertDefinition[]> {
    const rows = this.db
      .prepare('SELECT * FROM alert_definitions WHERE version = ? AND id LIKE ?')
      .all(version, prefix + '%') as RawAlert[];
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

    const added = (
      this.db
        .prepare(
          `SELECT * FROM alert_definitions
           WHERE version = ? AND id NOT IN (SELECT id FROM alert_definitions WHERE version = ?)`,
        )
        .all(toVersion, fromVersion) as RawAlert[]
    ).map(toAlert);

    const removed = (
      this.db
        .prepare(
          `SELECT * FROM alert_definitions
           WHERE version = ? AND id NOT IN (SELECT id FROM alert_definitions WHERE version = ?)`,
        )
        .all(fromVersion, toVersion) as RawAlert[]
    ).map(toAlert);

    const modifiedRows = this.db
      .prepare(
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
         WHERE a.version = ? AND b.version = ? AND a.config_hash != b.config_hash`,
      )
      .all(fromVersion, toVersion) as Array<RawAlert & RawAlertPrefixed>;

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
    this.db
      .prepare(
        'INSERT OR REPLACE INTO overlay_tags (alert_id, key, value) VALUES (?, ?, ?)',
      )
      .run(alertId, key, value);
  }

  async removeOverlayTag(alertId: string, key: string): Promise<boolean> {
    const result = this.db
      .prepare('DELETE FROM overlay_tags WHERE alert_id = ? AND key = ?')
      .run(alertId, key);
    return result.changes > 0;
  }

  async getOverlayTags(alertId: string): Promise<Record<string, string>> {
    const rows = this.db
      .prepare('SELECT key, value FROM overlay_tags WHERE alert_id = ?')
      .all(alertId) as Array<{ key: string; value: string }>;

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
  provider_status: string;
}

interface RawAlert {
  id: string;
  version: number;
  source: string;
  source_id: string;
  name: string;
  description: string;
  enabled: number;
  severity: string;
  condition_summary: string;
  notification_targets: string;
  tags: string;
  owner: string;
  raw_config: string;
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
  b_enabled: number;
  b_severity: string;
  b_condition_summary: string;
  b_notification_targets: string;
  b_tags: string;
  b_owner: string;
  b_raw_config: string;
  b_config_hash: string;
  b_last_modified_at: string | null;
  b_discovered_at: string;
}

function toSyncRun(row: RawSyncRun): SyncRun {
  return {
    version: row.version,
    name: row.name,
    description: row.description,
    createdAt: row.created_at,
    providerStatus: JSON.parse(row.provider_status),
  };
}

function toAlert(row: RawAlert): AlertDefinition {
  return {
    id: row.id,
    version: row.version,
    source: row.source,
    sourceId: row.source_id,
    name: row.name,
    description: row.description,
    enabled: row.enabled === 1,
    severity: row.severity as AlertDefinition['severity'],
    conditionSummary: row.condition_summary,
    notificationTargets: JSON.parse(row.notification_targets),
    tags: JSON.parse(row.tags),
    owner: row.owner,
    rawConfig: JSON.parse(row.raw_config),
    configHash: row.config_hash,
    lastModifiedAt: row.last_modified_at,
    discoveredAt: row.discovered_at,
  };
}

const factory: StorageFactory = () => new SqliteStorageProvider();
export default factory;
