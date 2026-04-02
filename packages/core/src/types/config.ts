import type { ProviderAdapter } from '../interfaces/provider.js';
import type { StorageProvider } from '../interfaces/storage.js';

/** Configuration for a single alert provider. */
export interface ProviderConfig {
  /** Whether the provider is active. Defaults to `true`. */
  enabled?: boolean;

  /**
   * Explicit package name for third-party providers.
   * Omit for built-in providers (convention-based resolution).
   */
  package?: string;

  /** Provider-specific configuration (passed to `initialize()`). */
  [key: string]: unknown;
}

/** Storage section of the alerthq config file. */
export interface StorageConfig {
  /** Storage backend name (e.g. `'sqlite'`, `'postgresql'`). */
  provider: string;

  /** Provider-specific configuration keyed by provider name. */
  [key: string]: unknown;
}

/** Top-level alerthq configuration (parsed from YAML). */
export interface AlerthqConfig {
  /** Storage backend configuration. */
  storage: StorageConfig;

  /** Alert provider configurations, keyed by provider name. */
  providers: Record<string, ProviderConfig>;
}

/**
 * Runtime context returned by {@link bootstrap}.
 *
 * Holds the resolved config, initialized storage, and all active providers.
 * Call `dispose()` when done to clean up resources.
 */
export interface Context {
  /** Resolved and validated configuration. */
  config: AlerthqConfig;

  /** Initialized storage backend. */
  storage: StorageProvider;

  /** Initialized alert providers, keyed by provider name. */
  providers: Record<string, ProviderAdapter>;

  /** Dispose all plugins (storage + providers). */
  dispose(): Promise<void>;
}
