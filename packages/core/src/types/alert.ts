/** Alert severity levels. */
export type Severity = 'critical' | 'warning' | 'info' | 'unknown';

/**
 * A normalized alert definition pulled from a cloud provider or created manually.
 *
 * Represents the *definition* of an alert (thresholds, conditions, targets),
 * not a firing or event. Each definition is versioned — the `version` field
 * ties it to the {@link SyncRun} that discovered it (`0` for manual entries).
 */
export interface AlertDefinition {
  /** First 12 characters of `sha256(source + ':' + sourceId)`. */
  id: string;

  /** FK to `sync_runs.version`. `0` indicates a manual entry. */
  version: number;

  /** Provider key (e.g. `'aws-cloudwatch'`) or `'manual'`. */
  source: string;

  /** Provider's native identifier, or a generated UUID for manual alerts. */
  sourceId: string;

  /** Human-readable alert name. */
  name: string;

  /** Alert description. */
  description: string;

  /** Whether the alert is enabled in the source system. */
  enabled: boolean;

  /** Normalized severity level. */
  severity: Severity;

  /** Human-readable summary of the alert condition / threshold. */
  conditionSummary: string;

  /** Deduplicated notification targets (SNS ARNs, email addresses, etc.). */
  notificationTargets: string[];

  /**
   * Merged tag map: provider-discovered tags overlaid with user overlay tags.
   * Overlay tags win on conflict.
   */
  tags: Record<string, string>;

  /** Alert owner (team, user, or empty string). */
  owner: string;

  /** Raw provider configuration stored for reference. */
  rawConfig: Record<string, unknown>;

  /** `sha256(rawConfig)` — used for drift detection. Overlay tags excluded. */
  configHash: string;

  /** Last modification timestamp from the provider, or `null` if unknown. */
  lastModifiedAt: string | null;

  /** ISO 8601 timestamp of when alerthq first discovered this alert. */
  discoveredAt: string;
}
