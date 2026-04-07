/** MongoDB Atlas Alert Configuration types. */

export interface AtlasAlertConfigListResponse {
  results: AtlasAlertConfig[];
  totalCount: number;
  links?: AtlasLink[];
}

export interface AtlasLink {
  rel: string;
  href: string;
}

export interface AtlasAlertConfig {
  id: string;
  groupId: string;
  eventTypeName: string;
  enabled: boolean;
  created: string;
  updated: string;
  matchers: AtlasMatcher[];
  metricThreshold?: AtlasMetricThreshold;
  threshold?: AtlasThreshold;
  notifications: AtlasNotification[];
  typeName?: string;
  [key: string]: unknown;
}

export interface AtlasMatcher {
  fieldName: string;
  operator: string;
  value: string;
}

export interface AtlasMetricThreshold {
  metricName: string;
  operator: string;
  threshold: number;
  units: string;
  mode?: string;
}

export interface AtlasThreshold {
  operator: string;
  threshold: number;
  units?: string;
}

export interface AtlasNotification {
  typeName: string;
  intervalMin?: number;
  delayMin?: number;
  emailEnabled?: boolean;
  smsEnabled?: boolean;
  emailAddress?: string;
  mobileNumber?: string;
  channelName?: string;
  apiToken?: string;
  teamId?: string;
  teamName?: string;
  webhookUrl?: string;
  microsoftTeamsWebhookUrl?: string;
  datadogApiKey?: string;
  datadogRegion?: string;
  opsGenieApiKey?: string;
  victorOpsApiKey?: string;
  victorOpsRoutingKey?: string;
  roles?: string[];
  [key: string]: unknown;
}

/** Provider config shape. */
export interface AtlasProviderConfig {
  publicKey: string;
  privateKey: string;
  projectIds: string[];
  baseUrl?: string;
  pageSize?: number;
}

/** Digest auth challenge parsed fields. */
export interface DigestChallenge {
  realm: string;
  nonce: string;
  qop?: string;
  opaque?: string;
  algorithm?: string;
}
