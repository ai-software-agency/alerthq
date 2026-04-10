import type { ProviderAdapter, AlertDefinition } from '@alerthq/core';
import { withRetry, logger } from '@alerthq/core';
import type { AtlasProviderConfig, AtlasAlertConfigListResponse } from './types.js';
import { DigestAuthClient } from './client.js';
import { mapAtlasAlertConfig } from './mapper.js';

const DEFAULT_BASE_URL = 'https://cloud.mongodb.com';
const DEFAULT_PAGE_SIZE = 100;

export class AtlasProviderAdapter implements ProviderAdapter {
  readonly name = 'mongodb-atlas';

  private config!: AtlasProviderConfig;
  private client!: DigestAuthClient;

  async initialize(config: Record<string, unknown>): Promise<void> {
    this.config = this.validateConfig(config);
    this.client = new DigestAuthClient(this.config.publicKey, this.config.privateKey);
  }

  async fetchAlerts(): Promise<AlertDefinition[]> {
    const alerts: AlertDefinition[] = [];

    for (const projectId of this.config.projectIds) {
      const projectAlerts = await this.fetchProjectAlerts(projectId);
      alerts.push(...projectAlerts);
    }

    logger.info(`[mongodb-atlas] Fetched ${alerts.length} alerts total across ${this.config.projectIds.length} projects`);
    return alerts;
  }

  async testConnection(): Promise<boolean> {
    try {
      const baseUrl = this.config.baseUrl ?? DEFAULT_BASE_URL;
      const projectId = this.config.projectIds[0];
      if (!projectId) {
        logger.debug('[mongodb-atlas] No project IDs configured');
        return false;
      }

      const url = `${baseUrl}/api/atlas/v2/groups/${projectId}/alertConfigs?pageNum=1&itemsPerPage=1`;
      const resp = await this.client.fetch(url);
      if (!resp.ok) {
        logger.debug(`[mongodb-atlas] API returned ${resp.status} ${resp.statusText}`);
      }
      return resp.ok;
    } catch (err) {
      logger.debug(`[mongodb-atlas] Connection test failed: ${String(err)}`);
      return false;
    }
  }

  // ── private ────────────────────────────────────────────────

  private validateConfig(config: Record<string, unknown>): AtlasProviderConfig {
    if (!config.publicKey || typeof config.publicKey !== 'string') {
      throw new Error('[mongodb-atlas] config.publicKey is required and must be a string');
    }
    if (!config.privateKey || typeof config.privateKey !== 'string') {
      throw new Error('[mongodb-atlas] config.privateKey is required and must be a string');
    }
    if (!config.projectIds || !Array.isArray(config.projectIds) || config.projectIds.length === 0) {
      throw new Error('[mongodb-atlas] config.projectIds is required and must be a non-empty array of strings');
    }

    for (const id of config.projectIds) {
      if (typeof id !== 'string') {
        throw new Error('[mongodb-atlas] each projectId must be a string');
      }
    }

    return {
      publicKey: config.publicKey as string,
      privateKey: config.privateKey as string,
      projectIds: config.projectIds as string[],
      baseUrl: (config.baseUrl as string) ?? DEFAULT_BASE_URL,
      pageSize: typeof config.pageSize === 'number' ? config.pageSize : DEFAULT_PAGE_SIZE,
    };
  }

  private async fetchProjectAlerts(projectId: string): Promise<AlertDefinition[]> {
    const baseUrl = this.config.baseUrl ?? DEFAULT_BASE_URL;
    const pageSize = this.config.pageSize ?? DEFAULT_PAGE_SIZE;
    const alerts: AlertDefinition[] = [];
    let pageNum = 1;

    while (true) {
      const url = `${baseUrl}/api/atlas/v2/groups/${projectId}/alertConfigs?pageNum=${pageNum}&itemsPerPage=${pageSize}`;

      const body = await withRetry(async () => {
        const resp = await this.client.fetch(url);
        if (!resp.ok) {
          throw new Error(
            `[mongodb-atlas] Atlas API error: ${resp.status} ${resp.statusText} for project ${projectId}`,
          );
        }
        return (await resp.json()) as AtlasAlertConfigListResponse;
      });

      for (const config of body.results) {
        alerts.push(mapAtlasAlertConfig(config));
      }

      if (pageNum * pageSize >= body.totalCount || body.results.length === 0) break;
      pageNum++;
    }

    logger.info(`[mongodb-atlas] Fetched ${alerts.length} alerts for project ${projectId}`);
    return alerts;
  }
}
