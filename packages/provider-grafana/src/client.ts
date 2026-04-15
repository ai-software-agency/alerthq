import { withRetry, logger } from '@alerthq/core';
import type { GrafanaProviderConfig, GrafanaAlertRule, GrafanaContactPoint } from './types.js';

export class GrafanaApiClient {
  private baseUrl = '';
  private headers: Record<string, string> = {};

  init(config: GrafanaProviderConfig): void {
    this.baseUrl = config.url.replace(/\/+$/, '');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (config.apiKey) {
      headers['Authorization'] = `Bearer ${config.apiKey}`;
    } else if (config.basicAuth) {
      const encoded = btoa(`${config.basicAuth.username}:${config.basicAuth.password}`);
      headers['Authorization'] = `Basic ${encoded}`;
    }

    this.headers = headers;
  }

  async fetchAlertRules(): Promise<GrafanaAlertRule[]> {
    const url = `${this.baseUrl}/api/v1/provisioning/alert-rules`;
    logger.debug(`[grafana] Fetching alert rules from ${url}`);

    return withRetry(async () => {
      const resp = await fetch(url, { headers: this.headers });
      if (!resp.ok) {
        throw new Error(`[grafana] Failed to fetch alert rules: ${resp.status} ${resp.statusText}`);
      }
      return (await resp.json()) as GrafanaAlertRule[];
    });
  }

  async fetchContactPoints(): Promise<GrafanaContactPoint[]> {
    const url = `${this.baseUrl}/api/v1/provisioning/contact-points`;
    logger.debug(`[grafana] Fetching contact points from ${url}`);

    return withRetry(async () => {
      const resp = await fetch(url, { headers: this.headers });
      if (!resp.ok) {
        throw new Error(
          `[grafana] Failed to fetch contact points: ${resp.status} ${resp.statusText}`,
        );
      }
      return (await resp.json()) as GrafanaContactPoint[];
    });
  }

  async testConnection(): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/api/health`;
      const resp = await fetch(url, { headers: this.headers });
      if (!resp.ok) {
        logger.debug(`[grafana] Health check failed: ${resp.status} ${resp.statusText}`);
      }
      return resp.ok;
    } catch (err) {
      logger.debug(`[grafana] Connection test failed: ${String(err)}`);
      return false;
    }
  }

  dispose(): void {
    // No persistent connections to clean up
  }
}
