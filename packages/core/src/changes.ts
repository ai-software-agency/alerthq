import type { Context } from './types/config.js';
import type { AlertDefinition } from './types/alert.js';

/** Result of comparing two sync versions. */
export interface ChangesResult {
  /** Alerts present in `toVersion` but not in `fromVersion`. */
  added: AlertDefinition[];

  /** Alerts present in `fromVersion` but not in `toVersion`. */
  removed: AlertDefinition[];

  /** Alerts present in both versions but with different `configHash`. */
  modified: Array<{ before: AlertDefinition; after: AlertDefinition }>;
}

/**
 * Get the differences between two sync versions.
 *
 * Delegates entirely to the storage backend's `getChanges()` query.
 * Version 0 (manual alerts) is excluded from drift detection.
 *
 * @param ctx - Runtime context from {@link bootstrap}.
 * @param from - Source version number.
 * @param to - Target version number.
 * @returns Object with `added`, `removed`, and `modified` arrays.
 */
export async function getChanges(ctx: Context, from: number, to: number): Promise<ChangesResult> {
  return ctx.storage.getChanges(from, to);
}
