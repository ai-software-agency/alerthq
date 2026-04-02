import { createHash } from 'node:crypto';

/**
 * Produce a deterministic SHA-256 hash of a configuration object.
 *
 * Keys are sorted recursively to ensure identical objects with different
 * key insertion order produce the same hash. Used for drift detection
 * via `configHash` on {@link AlertDefinition}.
 *
 * @param config - The raw configuration object to hash.
 * @returns Full SHA-256 hex digest.
 */
export function hashConfig(config: Record<string, unknown>): string {
  const normalized = stableStringify(config);
  return createHash('sha256').update(normalized).digest('hex');
}

/**
 * JSON.stringify with deterministic key ordering (deep).
 */
function stableStringify(value: unknown): string {
  if (value === null || value === undefined) {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return '[' + value.map((item) => stableStringify(item)).join(',') + ']';
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    const entries = keys.map((key) => JSON.stringify(key) + ':' + stableStringify(obj[key]));
    return '{' + entries.join(',') + '}';
  }

  return JSON.stringify(value);
}
