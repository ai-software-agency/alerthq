import type { ProviderAdapter, AlertDefinition } from '@alerthq/core';
import { DatadogApiClient } from './client.js';
import { mapMonitorToAlertDefinition } from './mapper.js';
import { datadogConfigSchema } from './schema.js';

/**
 * ProviderAdapter implementation for Datadog.
 *
 * Fetches all monitor definitions from the Datadog Monitors API and maps
 * them to the normalized AlertDefinition schema.
 */
export class DatadogAdapter implements ProviderAdapter {
  readonly name = 'datadog';

  private apiClient = new DatadogApiClient();

  /**
   * Validate configuration and initialise the Datadog API client.
   */
  async initialize(config: Record<string, unknown>): Promise<void> {
    const result = datadogConfigSchema.safeParse(config);
    if (!result.success) {
      throw new Error(
        `[datadog] invalid config: ${result.error.issues.map((i) => i.message).join('; ')}`,
      );
    }
    this.apiClient.init(result.data);
  }

  /**
   * Fetch all Datadog monitors and map them to AlertDefinitions.
   */
  async fetchAlerts(): Promise<AlertDefinition[]> {
    const monitors = await this.apiClient.fetchMonitors();
    return monitors.map(mapMonitorToAlertDefinition);
  }

  /**
   * Quick connectivity test against the Datadog API.
   */
  async testConnection(): Promise<boolean> {
    return this.apiClient.testConnection();
  }

  /**
   * Release resources (no-op for Datadog).
   */
  async dispose(): Promise<void> {
    this.apiClient.dispose();
  }
}
