/** Elasticsearch Watcher API types. */

export interface WatcherQueryResponse {
  count: number;
  watches: WatchRecord[];
}

export interface WatchRecord {
  _id: string;
  watch: WatchDefinition;
  status: WatchStatus;
}

export interface WatchDefinition {
  trigger?: Record<string, unknown>;
  input?: Record<string, unknown>;
  condition?: Record<string, unknown>;
  actions?: Record<string, WatchAction>;
  metadata?: Record<string, unknown>;
  throttle_period_in_millis?: number;
}

export interface WatchAction {
  email?: { to: string | string[]; subject?: string };
  webhook?: { url?: string; host?: string; port?: number; path?: string };
  slack?: { message?: { to?: string[] } };
  pagerduty?: { event?: { description?: string } };
  logging?: { text?: string };
  index?: { index?: string };
  [key: string]: unknown;
}

export interface WatchStatus {
  state: { active: boolean };
  last_checked?: string;
  last_met_condition?: string;
  actions?: Record<string, { ack: { state: string } }>;
}

/** Kibana Alerting Rules API types. */

export interface KibanaRulesFindResponse {
  page: number;
  per_page: number;
  total: number;
  data: KibanaRule[];
}

export interface KibanaRule {
  id: string;
  name: string;
  consumer: string;
  enabled: boolean;
  tags: string[];
  rule_type_id: string;
  params: Record<string, unknown>;
  actions: KibanaRuleAction[];
  updatedAt: string;
  createdAt: string;
  schedule: { interval: string };
  throttle?: string | null;
  notify_when?: string;
  [key: string]: unknown;
}

export interface KibanaRuleAction {
  id: string;
  group: string;
  actionTypeId: string;
  params: Record<string, unknown>;
}

/** Provider config shape. */
export interface ElasticProviderConfig {
  url: string;
  kibanaUrl?: string;
  auth: ElasticAuth;
  watcherPageSize?: number;
  kibanaPageSize?: number;
}

export type ElasticAuth =
  | { type: 'basic'; username: string; password: string }
  | { type: 'apiKey'; apiKey: string };
