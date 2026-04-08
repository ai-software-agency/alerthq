import { client, v1 } from '@datadog/datadog-api-client';
import { logger, withRetry } from '@alerthq/core';
import type { DatadogProviderConfig } from './types.js';

const PAGE_SIZE = 1000;

/**
 * Thin wrapper around the Datadog Monitors API that handles pagination
 * and retry logic.
 */
export class DatadogApiClient {
  private monitorsApi!: v1.MonitorsApi;

  /**
   * Configure the Datadog API client with credentials and optional site.
   */
  init(config: DatadogProviderConfig): void {
    const configuration = client.createConfiguration({
      authMethods: {
        apiKeyAuth: config.apiKey,
        appKeyAuth: config.appKey,
      },
    });

    if (config.site) {
      configuration.setServerVariables({ site: config.site });
    }

    this.monitorsApi = new v1.MonitorsApi(configuration);
  }

  /**
   * Paginate through all monitors using offset-based pagination.
   * Keeps incrementing `page` until the returned array is empty
   * or smaller than `pageSize`.
   */
  async fetchMonitors(): Promise<v1.Monitor[]> {
    const allMonitors: v1.Monitor[] = [];
    let page = 0;

    while (true) {
      logger.debug(`[datadog] fetching monitors page=${page} pageSize=${PAGE_SIZE}`);

      const monitors = await withRetry(
        () => this.monitorsApi.listMonitors({ page, pageSize: PAGE_SIZE }),
        { retries: 3, baseDelay: 500 },
      );

      if (!monitors || monitors.length === 0) {
        break;
      }

      allMonitors.push(...monitors);

      if (monitors.length < PAGE_SIZE) {
        break;
      }

      page++;
    }

    logger.info(`[datadog] fetched ${allMonitors.length} monitors`);
    return allMonitors;
  }

  /**
   * Connectivity test: fetch a single monitor to verify credentials.
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.monitorsApi.listMonitors({ pageSize: 1 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * No-op — the Datadog SDK does not maintain persistent connections.
   */
  dispose(): void {
    // no-op
  }
}
