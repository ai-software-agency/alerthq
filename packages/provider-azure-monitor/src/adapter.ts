import { DefaultAzureCredential } from '@azure/identity';
import { MonitorClient } from '@azure/arm-monitor';
import type { ProviderAdapter, AlertDefinition } from '@alerthq/core';
import { logger } from '@alerthq/core';
import type {
  AzureMonitorProviderConfig,
  AzureMetricAlertResource,
  AzureActivityLogAlertResource,
  AzureScheduledQueryRuleResource,
} from './types.js';
import {
  mapMetricAlert,
  mapActivityLogAlert,
  mapScheduledQueryRule,
} from './mapper.js';

export class AzureMonitorProviderAdapter implements ProviderAdapter {
  readonly name = 'azure-monitor';

  private config!: AzureMonitorProviderConfig;
  private credential!: DefaultAzureCredential;

  async initialize(config: Record<string, unknown>): Promise<void> {
    this.config = this.validateConfig(config);
    this.credential = new DefaultAzureCredential();
  }

  async fetchAlerts(): Promise<AlertDefinition[]> {
    const alerts: AlertDefinition[] = [];

    for (const subscriptionId of this.config.subscriptionIds) {
      const client = new MonitorClient(this.credential, subscriptionId);
      const subAlerts = await this.fetchSubscriptionAlerts(client, subscriptionId);
      alerts.push(...subAlerts);
    }

    logger.info(
      `[azure-monitor] Fetched ${alerts.length} alerts total across ${this.config.subscriptionIds.length} subscriptions`,
    );
    return alerts;
  }

  async testConnection(): Promise<boolean> {
    try {
      const subscriptionId = this.config.subscriptionIds[0];
      if (!subscriptionId) return false;

      const client = new MonitorClient(this.credential, subscriptionId);
      // Try listing metric alerts with a small page to verify access
      const iter = client.metricAlerts.listBySubscription();
      await iter.next();
      return true;
    } catch {
      return false;
    }
  }

  // ── private ────────────────────────────────────────────────

  private validateConfig(config: Record<string, unknown>): AzureMonitorProviderConfig {
    if (
      !config.subscriptionIds ||
      !Array.isArray(config.subscriptionIds) ||
      config.subscriptionIds.length === 0
    ) {
      throw new Error(
        '[azure-monitor] config.subscriptionIds is required and must be a non-empty array of strings',
      );
    }

    for (const id of config.subscriptionIds) {
      if (typeof id !== 'string') {
        throw new Error('[azure-monitor] each subscriptionId must be a string');
      }
    }

    return {
      subscriptionIds: config.subscriptionIds as string[],
    };
  }

  private async fetchSubscriptionAlerts(
    client: MonitorClient,
    subscriptionId: string,
  ): Promise<AlertDefinition[]> {
    const alerts: AlertDefinition[] = [];

    // Fetch metric alerts
    try {
      for await (const resource of client.metricAlerts.listBySubscription()) {
        const typed = resource as unknown as AzureMetricAlertResource;
        alerts.push(mapMetricAlert(typed));
      }
    } catch (err) {
      logger.info(
        `[azure-monitor] Failed to fetch metric alerts for subscription ${subscriptionId}: ${String(err)}`,
      );
    }

    // Fetch activity log alerts
    try {
      for await (const resource of client.activityLogAlerts.listBySubscriptionId()) {
        const typed = resource as unknown as AzureActivityLogAlertResource;
        alerts.push(mapActivityLogAlert(typed));
      }
    } catch (err) {
      logger.info(
        `[azure-monitor] Failed to fetch activity log alerts for subscription ${subscriptionId}: ${String(err)}`,
      );
    }

    // Fetch scheduled query rules
    try {
      for await (const resource of client.scheduledQueryRules.listBySubscription()) {
        const typed = resource as unknown as AzureScheduledQueryRuleResource;
        alerts.push(mapScheduledQueryRule(typed));
      }
    } catch (err) {
      logger.info(
        `[azure-monitor] Failed to fetch scheduled query rules for subscription ${subscriptionId}: ${String(err)}`,
      );
    }

    logger.info(
      `[azure-monitor] Fetched ${alerts.length} alerts for subscription ${subscriptionId}`,
    );
    return alerts;
  }
}
