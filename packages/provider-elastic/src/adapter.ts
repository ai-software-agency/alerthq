import { Client } from '@elastic/elasticsearch';
import type { ProviderAdapter, AlertDefinition } from '@alerthq/core';
import { withRetry, logger } from '@alerthq/core';
import type {
  ElasticProviderConfig,
  WatcherQueryResponse,
  KibanaRulesFindResponse,
} from './types.js';
import { mapWatcher, mapKibanaRule } from './mapper.js';

const DEFAULT_WATCHER_PAGE_SIZE = 100;
const DEFAULT_KIBANA_PAGE_SIZE = 100;

export class ElasticProviderAdapter implements ProviderAdapter {
  readonly name = 'elastic';

  private client: Client | undefined;
  private config!: ElasticProviderConfig;

  async initialize(config: Record<string, unknown>): Promise<void> {
    this.config = this.validateConfig(config);
    if (this.config.url) {
      this.client = this.createClient(this.config);
    }
  }

  async fetchAlerts(): Promise<AlertDefinition[]> {
    const alerts: AlertDefinition[] = [];

    if (this.client) {
      const watchers = await this.fetchWatchers();
      alerts.push(...watchers);
    }

    if (this.config.kibanaUrl) {
      const kibanaRules = await this.fetchKibanaRules();
      alerts.push(...kibanaRules);
    }

    logger.info(`[elastic] Fetched ${alerts.length} alerts total`);
    return alerts;
  }

  async testConnection(): Promise<boolean> {
    if (this.client) {
      try {
        logger.debug(`[elastic] Pinging Elasticsearch at ${this.config.url}`);
        const resp = await this.client.ping();
        const esOk =
          resp === true || (resp as unknown as { statusCode: number }).statusCode === 200;
        if (!esOk) {
          logger.debug(
            `[elastic] Elasticsearch ping returned non-OK response: ${JSON.stringify(resp)}`,
          );
          return false;
        }
      } catch (err) {
        logger.debug(
          `[elastic] Elasticsearch ping failed at ${this.config.url}: ${(err as Error).message ?? String(err)}`,
        );
        return false;
      }
    }

    if (this.config.kibanaUrl) {
      try {
        logger.debug(`[elastic] Checking Kibana alerting API at ${this.config.kibanaUrl}`);
        const headers: Record<string, string> = { 'kbn-xsrf': 'true' };
        if (this.config.auth.type === 'basic') {
          const cred = Buffer.from(
            `${this.config.auth.username}:${this.config.auth.password}`,
          ).toString('base64');
          headers['Authorization'] = `Basic ${cred}`;
        } else {
          headers['Authorization'] = `ApiKey ${this.config.auth.apiKey}`;
        }
        const url = `${this.config.kibanaUrl}/api/alerting/rules/_find?page=1&per_page=1`;
        const resp = await fetch(url, { headers });
        if (!resp.ok) {
          const body = await resp.text().catch(() => '');
          logger.debug(
            `[elastic] Kibana alerting API failed: ${resp.status} ${resp.statusText} — ${body}`,
          );
          return false;
        }
      } catch (err) {
        logger.debug(`[elastic] Kibana connection failed: ${String(err)}`);
        return false;
      }
    }

    return true;
  }

  async dispose(): Promise<void> {
    if (this.client) {
      await this.client.close();
    }
  }

  // ── private ────────────────────────────────────────────────

  private validateConfig(config: Record<string, unknown>): ElasticProviderConfig {
    const hasUrl = config.url && typeof config.url === 'string';
    const hasKibanaUrl = config.kibanaUrl && typeof config.kibanaUrl === 'string';

    if (!hasUrl && !hasKibanaUrl) {
      throw new Error('[elastic] at least one of config.url or config.kibanaUrl is required');
    }

    if (config.url && typeof config.url !== 'string') {
      throw new Error('[elastic] config.url must be a string');
    }
    if (config.kibanaUrl && typeof config.kibanaUrl !== 'string') {
      throw new Error('[elastic] config.kibanaUrl must be a string');
    }

    if (!config.auth || typeof config.auth !== 'object') {
      throw new Error('[elastic] config.auth is required');
    }

    const auth = config.auth as Record<string, unknown>;

    if (auth.type === 'basic') {
      if (!auth.username || !auth.password) {
        throw new Error('[elastic] basic auth requires username and password');
      }
    } else if (auth.type === 'apiKey') {
      if (!auth.apiKey) {
        throw new Error('[elastic] apiKey auth requires apiKey');
      }
    } else {
      throw new Error('[elastic] config.auth.type must be "basic" or "apiKey"');
    }

    return {
      url: hasUrl ? (config.url as string) : undefined,
      kibanaUrl: hasKibanaUrl ? (config.kibanaUrl as string) : undefined,
      auth: auth as ElasticProviderConfig['auth'],
      watcherPageSize:
        typeof config.watcherPageSize === 'number'
          ? config.watcherPageSize
          : DEFAULT_WATCHER_PAGE_SIZE,
      kibanaPageSize:
        typeof config.kibanaPageSize === 'number'
          ? config.kibanaPageSize
          : DEFAULT_KIBANA_PAGE_SIZE,
    };
  }

  private createClient(config: ElasticProviderConfig): Client {
    const auth =
      config.auth.type === 'basic'
        ? { username: config.auth.username, password: config.auth.password }
        : { apiKey: config.auth.apiKey };

    return new Client({
      node: config.url!,
      auth,
    });
  }

  private async fetchWatchers(): Promise<AlertDefinition[]> {
    const pageSize = this.config.watcherPageSize ?? DEFAULT_WATCHER_PAGE_SIZE;
    const alerts: AlertDefinition[] = [];
    let from = 0;

    while (true) {
      const body = await withRetry(async () => {
        const resp = await this.client!.transport.request({
          method: 'POST',
          path: '/_watcher/_query/watches',
          body: { from, size: pageSize },
        });
        return resp as unknown as WatcherQueryResponse;
      });

      for (const watch of body.watches) {
        alerts.push(mapWatcher(watch));
      }

      from += body.watches.length;
      if (from >= body.count || body.watches.length === 0) break;
    }

    logger.info(`[elastic] Fetched ${alerts.length} watchers`);
    return alerts;
  }

  private async fetchKibanaRules(): Promise<AlertDefinition[]> {
    const kibanaUrl = this.config.kibanaUrl!;
    const pageSize = this.config.kibanaPageSize ?? DEFAULT_KIBANA_PAGE_SIZE;
    const alerts: AlertDefinition[] = [];
    let page = 1;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'kbn-xsrf': 'true',
    };

    if (this.config.auth.type === 'basic') {
      const cred = Buffer.from(
        `${this.config.auth.username}:${this.config.auth.password}`,
      ).toString('base64');
      headers['Authorization'] = `Basic ${cred}`;
    } else {
      headers['Authorization'] = `ApiKey ${this.config.auth.apiKey}`;
    }

    while (true) {
      const url = `${kibanaUrl}/api/alerting/rules/_find?page=${page}&per_page=${pageSize}`;

      const body = await withRetry(async () => {
        const resp = await fetch(url, { headers });
        if (!resp.ok) {
          throw new Error(`[elastic] Kibana API error: ${resp.status} ${resp.statusText}`);
        }
        return (await resp.json()) as KibanaRulesFindResponse;
      });

      for (const rule of body.data) {
        alerts.push(mapKibanaRule(rule));
      }

      if (page * pageSize >= body.total || body.data.length === 0) break;
      page++;
    }

    logger.info(`[elastic] Fetched ${alerts.length} Kibana rules`);
    return alerts;
  }
}
