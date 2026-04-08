import monitoring from '@google-cloud/monitoring';
import type { protos } from '@google-cloud/monitoring';
import { logger, withRetry } from '@alerthq/core';
import type { GcpMonitoringProviderConfig } from './types.js';

type IAlertPolicy = protos.google.monitoring.v3.IAlertPolicy;

/**
 * Thin wrapper around the GCP Cloud Monitoring SDK that handles
 * alert policy listing, notification channel resolution, and retry.
 */
export class GcpMonitoringApiClient {
  private alertClient!: InstanceType<typeof monitoring.AlertPolicyServiceClient>;
  private channelClient!: InstanceType<typeof monitoring.NotificationChannelServiceClient>;
  private projectId!: string;

  /**
   * Initialise SDK clients with optional credentials.
   */
  init(config: GcpMonitoringProviderConfig): void {
    this.projectId = config.projectId;

    const clientOpts: {
      keyFilename?: string;
      credentials?: { client_email: string; private_key: string };
    } = {};
    if (config.keyFilename) {
      clientOpts.keyFilename = config.keyFilename;
    }
    if (config.credentials) {
      clientOpts.credentials = config.credentials;
    }

    this.alertClient = new monitoring.AlertPolicyServiceClient(clientOpts);
    this.channelClient = new monitoring.NotificationChannelServiceClient(clientOpts);
  }

  /**
   * Fetch all alert policies for the configured project.
   * SDK auto-pagination returns `[policies, request, response]`.
   */
  async fetchAlertPolicies(): Promise<IAlertPolicy[]> {
    const projectName = `projects/${this.projectId}`;

    const [policies] = await withRetry(
      () => this.alertClient.listAlertPolicies({ name: projectName }),
      { retries: 3, baseDelay: 500 },
    );

    logger.info(`[gcp-monitoring] Fetched ${policies.length} alert policies`);
    return policies;
  }

  /**
   * Fetch all notification channels and return a map of
   * channel resource name -> display name.
   */
  async fetchNotificationChannels(): Promise<Map<string, string>> {
    const projectName = `projects/${this.projectId}`;

    const [channels] = await withRetry(
      () => this.channelClient.listNotificationChannels({ name: projectName }),
      { retries: 3, baseDelay: 500 },
    );

    const channelMap = new Map<string, string>();
    for (const ch of channels) {
      if (ch.name) {
        channelMap.set(ch.name, ch.displayName ?? ch.name);
      }
    }

    logger.debug(`[gcp-monitoring] Resolved ${channelMap.size} notification channels`);
    return channelMap;
  }

  /**
   * Quick connectivity test: list alert policies with page size 1.
   */
  async testConnection(): Promise<boolean> {
    try {
      const projectName = `projects/${this.projectId}`;
      await this.alertClient.listAlertPolicies({
        name: projectName,
        pageSize: 1,
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Close SDK clients if the SDK supports it.
   */
  async dispose(): Promise<void> {
    try {
      await this.alertClient.close();
    } catch {
      // SDK may not support close — ignore
    }
    try {
      await this.channelClient.close();
    } catch {
      // SDK may not support close — ignore
    }
  }
}
