/**
 * Configuration for the Datadog provider adapter.
 */
export interface DatadogProviderConfig {
  /** Datadog API key. */
  apiKey: string;

  /** Datadog Application key. */
  appKey: string;

  /**
   * Datadog site (e.g. `datadoghq.com`, `datadoghq.eu`, `us5.datadoghq.com`).
   * Defaults to `datadoghq.com`.
   */
  site?: string;
}
