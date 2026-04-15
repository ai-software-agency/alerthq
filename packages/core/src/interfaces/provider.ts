import type { ZodType } from 'zod';
import type { AlertDefinition } from '../types/alert.js';

/**
 * Adapter interface for alert providers.
 *
 * Each provider plugin implements this interface to fetch alert definitions
 * from a specific cloud service. The adapter is read-only — it never creates,
 * modifies, or deletes alerts in the source system.
 */
export interface ProviderAdapter {
  /** Unique provider name (e.g. `'aws-cloudwatch'`). */
  readonly name: string;

  /** Alert source values this provider emits (used for single-provider sync merge). */
  readonly sources: readonly string[];

  /**
   * Initialize the adapter with provider-specific configuration.
   * Called once during bootstrap. Should validate config and set up clients.
   */
  initialize(config: Record<string, unknown>): Promise<void>;

  /**
   * Fetch all alert definitions from the provider.
   * Handles pagination internally. Returns normalized definitions.
   */
  fetchAlerts(): Promise<AlertDefinition[]>;

  /**
   * Test whether the provider connection is healthy.
   * @returns `true` if the connection succeeds, `false` otherwise.
   */
  testConnection(): Promise<boolean>;

  /**
   * Optional cleanup hook. Called during `Context.dispose()`.
   * Use to close connections, release resources, etc.
   */
  dispose?(): Promise<void>;
}

/**
 * Factory function that creates a new {@link ProviderAdapter} instance.
 * Each provider plugin default-exports a factory of this type.
 */
export type ProviderFactory = () => ProviderAdapter;

/**
 * Shape of a provider plugin module after dynamic import.
 * The `configSchema` export is optional — when present the plugin loader
 * validates provider config at load time for fail-fast behavior.
 */
export interface ProviderModule {
  default: ProviderFactory;
  configSchema?: ZodType;
}
