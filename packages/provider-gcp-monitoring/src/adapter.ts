import type { ProviderAdapter, AlertDefinition } from '@alerthq/core';
import { logger } from '@alerthq/core';
import { gcpMonitoringConfigSchema } from './schema.js';
import { GcpMonitoringApiClient } from './client.js';
import { mapAlertPolicyToAlertDefinition } from './mapper.js';

/**
 * ProviderAdapter implementation for GCP Cloud Monitoring.
 *
 * Fetches alert policies and notification channels from a GCP project,
 * then maps them to the normalized AlertDefinition schema.
 */
export class GcpMonitoringAdapter implements ProviderAdapter {
  readonly name = 'gcp-monitoring';
  readonly sources = ['gcp-monitoring'] as const;

  private apiClient = new GcpMonitoringApiClient();

  /**
   * Validate configuration and initialise SDK clients.
   */
  async initialize(config: Record<string, unknown>): Promise<void> {
    const result = gcpMonitoringConfigSchema.safeParse(config);
    if (!result.success) {
      throw new Error(
        `[gcp-monitoring] Invalid config: ${result.error.issues.map((i) => i.message).join('; ')}`,
      );
    }

    this.apiClient.init(result.data);
    logger.info(`[gcp-monitoring] Initialized for project ${result.data.projectId}`);
  }

  /**
   * Fetch all alert policies and map them to AlertDefinitions.
   */
  async fetchAlerts(): Promise<AlertDefinition[]> {
    const channelMap = await this.apiClient.fetchNotificationChannels();
    const policies = await this.apiClient.fetchAlertPolicies();

    const alerts = policies.map((policy) =>
      mapAlertPolicyToAlertDefinition(policy, channelMap),
    );

    logger.info(`[gcp-monitoring] Mapped ${alerts.length} alert definitions`);
    return alerts;
  }

  /**
   * Quick connectivity test against the configured project.
   */
  async testConnection(): Promise<boolean> {
    return this.apiClient.testConnection();
  }

  /**
   * Release SDK clients.
   */
  async dispose(): Promise<void> {
    await this.apiClient.dispose();
  }
}
