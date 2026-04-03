/** Azure Monitor alert resource types. */

export interface AzureMetricAlertResource {
  id: string;
  name: string;
  type: string;
  location: string;
  tags?: Record<string, string>;
  properties: {
    description?: string;
    severity?: number;
    enabled?: boolean;
    scopes?: string[];
    criteria?: AzureMetricCriteria;
    actions?: AzureActionGroup[];
    autoMitigate?: boolean;
    evaluationFrequency?: string;
    windowSize?: string;
    targetResourceType?: string;
    targetResourceRegion?: string;
  };
  systemData?: AzureSystemData;
}

export interface AzureMetricCriteria {
  'odata.type'?: string;
  allOf?: AzureMetricCriterion[];
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

export interface AzureActivityLogAlertResource {
  id: string;
  name: string;
  type: string;
  location: string;
  tags?: Record<string, string>;
  properties: {
    description?: string;
    enabled?: boolean;
    scopes?: string[];
    condition?: AzureActivityLogCondition;
    actions?: {
      actionGroups?: AzureActionGroupReference[];
    };
  };
  systemData?: AzureSystemData;
}

export interface AzureActivityLogCondition {
  allOf?: AzureActivityLogLeafCondition[];
}

export interface AzureActivityLogLeafCondition {
  field?: string;
  equals?: string;
  containsAny?: string[];
  [key: string]: unknown;
}

export interface AzureScheduledQueryRuleResource {
  id: string;
  name: string;
  type: string;
  location: string;
  tags?: Record<string, string>;
  properties: {
    description?: string;
    severity?: number;
    enabled?: boolean;
    scopes?: string[];
    criteria?: AzureScheduledQueryCriteria;
    actions?: {
      actionGroups?: string[];
      customProperties?: Record<string, string>;
    };
    evaluationFrequency?: string;
    windowSize?: string;
    targetResourceTypes?: string[];
    displayName?: string;
  };
  systemData?: AzureSystemData;
}

export interface AzureScheduledQueryCriteria {
  allOf?: AzureScheduledQueryCondition[];
}

export interface AzureScheduledQueryCondition {
  query?: string;
  timeAggregation?: string;
  metricMeasureColumn?: string;
  operator?: string;
  threshold?: number;
  dimensions?: AzureDimension[];
  failingPeriods?: {
    numberOfEvaluationPeriods?: number;
    minFailingPeriodsToAlert?: number;
  };
  [key: string]: unknown;
}

export interface AzureDimension {
  name: string;
  operator: string;
  values: string[];
}

export interface AzureActionGroup {
  actionGroupId?: string;
  webHookProperties?: Record<string, string>;
}

export interface AzureActionGroupReference {
  actionGroupId: string;
  webhookProperties?: Record<string, string>;
}

export interface AzureSystemData {
  createdBy?: string;
  createdByType?: string;
  createdAt?: string;
  lastModifiedBy?: string;
  lastModifiedByType?: string;
  lastModifiedAt?: string;
}

/** Provider config shape. */
export interface AzureMonitorProviderConfig {
  subscriptionIds: string[];
}
