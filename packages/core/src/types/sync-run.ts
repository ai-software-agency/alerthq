/**
 * A record of a single sync operation.
 *
 * Each sync fetches alert definitions from providers and stores them
 * as a new version. If nothing changed since the last sync, no new
 * `SyncRun` is created.
 */
export interface SyncRun {
  /** Auto-incrementing version number. `0` is reserved for manual entries. */
  version: number;

  /** User-provided name or auto-generated (e.g. `"Sync 2025-04-02 14:30"`). */
  name: string;

  /** Optional context (e.g. `"Post-deploy check"`). Empty string if omitted. */
  description: string;

  /** ISO 8601 timestamp of when the sync ran. */
  createdAt: string;

  /** Per-provider status: `'success'`, `'error'`, or `'skipped'`. */
  providerStatus: Record<string, 'success' | 'error' | 'skipped'>;
}
