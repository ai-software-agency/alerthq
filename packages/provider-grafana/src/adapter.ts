import type { ProviderAdapter, AlertDefinition } from '@alerthq/core';
import { logger } from '@alerthq/core';
import { grafanaConfigSchema } from './schema.js';
import { GrafanaApiClient } from './client.js';
import { mapAlertRuleToAlertDefinition } from './mapper.js';

export class GrafanaAdapter implements ProviderAdapter {
  readonly name = 'grafana';
  readonly sources = ['grafana'] as const;

  private apiClient = new GrafanaApiClient();

  async initialize(config: Record<string, unknown>): Promise<void> {
    const validated = grafanaConfigSchema.parse(config);
    this.apiClient.init(validated);
  }

  async fetchAlerts(): Promise<AlertDefinition[]> {
    const contactPoints = await this.apiClient.fetchContactPoints();
    const rules = await this.apiClient.fetchAlertRules();

    const alerts = rules.map((rule) => mapAlertRuleToAlertDefinition(rule, contactPoints));

    logger.info(`[grafana] Fetched ${alerts.length} alert rules`);
    return alerts;
  }

  async testConnection(): Promise<boolean> {
    return this.apiClient.testConnection();
  }

  async dispose(): Promise<void> {
    this.apiClient.dispose();
  }
}
