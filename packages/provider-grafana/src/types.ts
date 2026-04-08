/** Provider config shape. */
export interface GrafanaProviderConfig {
  url: string;
  apiKey?: string;
  basicAuth?: { username: string; password: string };
}

/** Grafana unified alerting rule (Grafana 9+ provisioning API). */
export interface GrafanaAlertRule {
  id: number;
  uid: string;
  orgID: number;
  folderUID: string;
  ruleGroup: string;
  title: string;
  condition: string;
  data: GrafanaAlertQuery[];
  updated: string;
  noDataState: string;
  execErrState: string;
  for: string;
  annotations: Record<string, string>;
  labels: Record<string, string>;
  isPaused: boolean;
  notification_settings?: {
    receiver?: string;
    group_by?: string[];
    mute_time_intervals?: string[];
  };
  provenance: string;
}

/** A single query/expression in a Grafana alert rule's data array. */
export interface GrafanaAlertQuery {
  refId: string;
  queryType: string;
  relativeTimeRange: { from: number; to: number };
  datasourceUid: string;
  model: Record<string, unknown>;
}

/** Grafana contact point (provisioning API). */
export interface GrafanaContactPoint {
  uid: string;
  name: string;
  type: string;
  settings: Record<string, unknown>;
  disableResolveMessage: boolean;
}
