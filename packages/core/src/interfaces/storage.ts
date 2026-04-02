import type { AlertDefinition } from '../types/alert.js';
import type { SyncRun } from '../types/sync-run.js';

/**
 * Storage backend interface.
 *
 * Implementations persist sync runs, alert definitions (versioned),
 * and overlay tags. Both SQLite and PostgreSQL backends implement
 * this interface with identical logical schema.
 */
export interface StorageProvider {
  /** Storage backend name (e.g. `'sqlite'`). */
  readonly name: string;

  /**
   * Initialize the storage backend (run migrations, open connections, etc.).
   * Called once during bootstrap.
   */
  initialize(config: Record<string, unknown>): Promise<void>;

  /**
   * Optional cleanup hook. Called during `Context.dispose()`.
   * Use to close database connections, release pools, etc.
   */
  dispose?(): Promise<void>;

  // ---- Sync runs ----

  /** Persist a new sync run record. */
  createSyncRun(run: SyncRun): Promise<void>;

  /** Get the most recent sync run, or `null` if none exist. */
  getLatestSyncRun(): Promise<SyncRun | null>;

  /** Get a specific sync run by version, or `null` if not found. */
  getSyncRun(version: number): Promise<SyncRun | null>;

  /** List sync runs in reverse chronological order. */
  listSyncRuns(limit?: number): Promise<SyncRun[]>;

  // ---- Alert definitions ----

  /** Save a batch of alert definitions for a given version. */
  saveAlertDefinitions(version: number, alerts: AlertDefinition[]): Promise<void>;

  /** Get all alert definitions for a given version. */
  getAlertDefinitions(version: number): Promise<AlertDefinition[]>;

  /** Remove a single alert definition by ID and version. Returns `true` if found and removed. */
  removeAlertDefinition(version: number, alertId: string): Promise<boolean>;

  /** Find alerts whose ID starts with the given prefix (for short-ID matching). */
  findAlertsByIdPrefix(version: number, prefix: string): Promise<AlertDefinition[]>;

  // ---- Drift detection ----

  /**
   * Compare two versions and return added, removed, and modified alerts.
   *
   * - **Added**: present in `toVersion` but not in `fromVersion`
   * - **Removed**: present in `fromVersion` but not in `toVersion`
   * - **Modified**: present in both but with different `configHash`
   */
  getChanges(
    fromVersion: number,
    toVersion: number,
  ): Promise<{
    added: AlertDefinition[];
    removed: AlertDefinition[];
    modified: Array<{ before: AlertDefinition; after: AlertDefinition }>;
  }>;

  // ---- Overlay tags ----

  /** Set an overlay tag on an alert (upsert). */
  setOverlayTag(alertId: string, key: string, value: string): Promise<void>;

  /** Remove an overlay tag. Returns `true` if the tag existed. */
  removeOverlayTag(alertId: string, key: string): Promise<boolean>;

  /** Get all overlay tags for a given alert. */
  getOverlayTags(alertId: string): Promise<Record<string, string>>;
}

/**
 * Factory function that creates a new {@link StorageProvider} instance.
 * Each storage plugin default-exports a factory of this type.
 */
export type StorageFactory = () => StorageProvider;
