import type { ProviderAdapter, AlertDefinition } from '@alerthq/core';
import { CloudWatchApiClient } from './client.js';
import { mapAlarmToAlertDefinition } from './mapper.js';
import type { CloudWatchProviderConfig } from './types.js';

/**
 * ProviderAdapter implementation for AWS CloudWatch.
 *
 * Fetches all metric alarms (across configured regions), enriches them with
 * resource tags, and maps them to the normalized AlertDefinition schema.
 */
export class CloudWatchAdapter implements ProviderAdapter {
  readonly name = 'aws-cloudwatch';
  readonly sources = ['aws-cloudwatch'] as const;

  private apiClient = new CloudWatchApiClient();

  /**
   * Validate configuration and initialise regional SDK clients.
   */
  async initialize(config: Record<string, unknown>): Promise<void> {
    const regions = config.regions;

    if (!Array.isArray(regions) || regions.length === 0) {
      throw new Error(
        'CloudWatch provider requires a non-empty "regions" array in config.',
      );
    }

    // Ensure every entry is a string
    for (const r of regions) {
      if (typeof r !== 'string') {
        throw new Error(`Invalid region value: ${String(r)}. Expected a string.`);
      }
    }

    const validated: CloudWatchProviderConfig = {
      regions: regions as string[],
      ...(config.credentials
        ? { credentials: config.credentials as CloudWatchProviderConfig['credentials'] }
        : {}),
    };

    this.apiClient.init(validated);
  }

  /**
   * Fetch all CloudWatch alarms and map them to AlertDefinitions.
   */
  async fetchAlerts(): Promise<AlertDefinition[]> {
    const alarms = await this.apiClient.describeAllAlarms();
    const enriched = await this.apiClient.enrichWithTags(alarms);
    return enriched.map(mapAlarmToAlertDefinition);
  }

  /**
   * Quick connectivity test against the first configured region.
   */
  async testConnection(): Promise<boolean> {
    return this.apiClient.testConnection();
  }

  /**
   * Release SDK clients.
   */
  async dispose(): Promise<void> {
    this.apiClient.dispose();
  }
}
