import { createHash } from 'node:crypto';

/**
 * Generate a short, deterministic alert ID from source and source-native ID.
 *
 * Computes `sha256(source + ':' + sourceId)` and returns the first 12
 * hex characters. This produces a short ID suitable for CLI display
 * while maintaining sufficient uniqueness.
 *
 * @param source - Provider key (e.g. `'aws-cloudwatch'`) or `'manual'`.
 * @param sourceId - Provider's native alert identifier.
 * @returns 12-character hex string.
 */
export function generateAlertId(source: string, sourceId: string): string {
  return createHash('sha256')
    .update(source + ':' + sourceId)
    .digest('hex')
    .slice(0, 12);
}
