/**
 * Azure Monitor alert resource types.
 *
 * These mirror the flat shape returned by @azure/arm-monitor v7 SDK
 * (properties are top-level on the resource, NOT nested under `.properties`).
 */

export interface AzureMetricAlertResource {
  id?: string;
  name?: string;
  type?: string;
  location: string;
  tags?: Record<string, string>;
  description?: string;
  severity: number;
  enabled: boolean;
  scopes: string[];
  criteria: AzureMetricCriteria;
  autoMitigate?: boolean;
  actions?: AzureMetricAlertAction[];
  evaluationFrequency: string;
  windowSize: string;
  targetResourceType?: string;
  targetResourceRegion?: string;
  lastUpdatedTime?: Date;
}

export interface AzureMetricCriteria {
  odataType?: string;
  allOf?: AzureMetricCriterion[];
  [property: string]: unknown;
}

export interface AzureMetricCriterion {
  name?: string;
  metricName?: string;
  metricNamespace?: string;
  operator?: string;
  threshold?: number;
  timeAggregation?: string;
  dimensions?: AzureDimension[];
  criterionType?: string;
  [key: string]: unknown;
}

export interface AzureMetricAlertAction {
  actionGroupId?: string;
  webHookProperties?: Record<string, string>;
}

export interface AzureActivityLogAlertResource {
  id?: string;
  name?: string;
  type?: string;
  location: string;
  tags?: Record<string, string>;
  scopes?: string[];
  enabled?: boolean;
  condition?: AzureActivityLogCondition;
  actions?: AzureActivityLogAlertActionList;
  description?: string;
}

export interface AzureActivityLogAlertActionList {
  actionGroups?: AzureActivityLogActionGroup[];
}

export interface AzureActivityLogActionGroup {
  actionGroupId: string;
  webhookProperties?: Record<string, string>;
}

export interface AzureActivityLogCondition {
  allOf?: AzureActivityLogLeafCondition[];
}

export interface AzureActivityLogLeafCondition {
  field: string;
  equals: string;
}

/**
 * LogSearchRuleResource — the v7 SDK shape for scheduledQueryRules.
 * This is the older Log Analytics scheduled query rules API.
 */
export interface AzureScheduledQueryRuleResource {
  id?: string;
  name?: string;
  type?: string;
  location: string;
  tags?: Record<string, string>;
  description?: string;
  displayName?: string;
  enabled?: string;
  source: AzureScheduledQuerySource;
  schedule?: AzureScheduledQuerySchedule;
  action: AzureScheduledQueryAction;
  lastUpdatedTime?: Date;
}

export interface AzureScheduledQuerySource {
  query?: string;
  authorizedResources?: string[];
  dataSourceId: string;
  queryType?: string;
}

export interface AzureScheduledQuerySchedule {
  frequencyInMinutes: number;
  timeWindowInMinutes: number;
}

export interface AzureScheduledQueryAction {
  odataType: string;
  severity?: string;
  aznsAction?: AzureAzNsActionGroup;
  throttlingInMin?: number;
  trigger?: AzureScheduledQueryTrigger;
  [key: string]: unknown;
}

export interface AzureAzNsActionGroup {
  actionGroup?: string[];
  emailSubject?: string;
  customWebhookPayload?: string;
}

export interface AzureScheduledQueryTrigger {
  thresholdOperator?: string;
  threshold?: number;
  [key: string]: unknown;
}

export interface AzureDimension {
  name: string;
  operator: string;
  values: string[];
}

/** Provider config shape. */
export interface AzureMonitorProviderConfig {
  subscriptionIds: string[];
}
