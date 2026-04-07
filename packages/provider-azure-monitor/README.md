# @alerthq/provider-azure-monitor

Azure Monitor alert provider for [alerthq](https://github.com/edrv/alerthq).

## Supported Alert Types

| Alert Type | API Source | Notes |
|------------|-----------|-------|
| Metric Alerts | `metricAlerts.listBySubscription()` via `@azure/arm-monitor` | Standard and dynamic threshold metric alerts |
| Activity Log Alerts | `activityLogAlerts.listBySubscriptionId()` via `@azure/arm-monitor` | Service health, resource health, administrative alerts |
| Scheduled Query Rules | `scheduledQueryRules.listBySubscription()` via `@azure/arm-monitor` | Log search alerts (KQL-based) |

## Authentication

Uses Azure `DefaultAzureCredential` from `@azure/identity`, which tries credentials in this order:

1. Environment variables (`AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_CLIENT_SECRET`)
2. Managed Identity (on Azure VMs, App Service, Functions, etc.)
3. Azure CLI (`az login`)
4. Azure PowerShell
5. Visual Studio Code Azure Account extension

See: [DefaultAzureCredential documentation](https://learn.microsoft.com/en-us/javascript/api/@azure/identity/defaultazurecredential)

## Configuration

Add to your `alerthq.yaml`:

```yaml
providers:
  azure-monitor:
    enabled: true
    subscriptionIds:
      - 12345678-1234-1234-1234-123456789abc
      - 87654321-4321-4321-4321-cba987654321
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `subscriptionIds` | `string[]` | Yes | — | Azure subscription IDs to scan for alerts |

## Required Permissions

The authenticated identity needs the **Reader** role (or equivalent) on each subscription. Specifically:

- `Microsoft.Insights/metricAlerts/read`
- `Microsoft.Insights/activityLogAlerts/read`
- `Microsoft.Insights/scheduledQueryRules/read`

The built-in **Monitoring Reader** role covers all three.

## Field Mapping

### Metric Alerts

| AlertDefinition Field | Source |
|-----------------------|--------|
| `id` | `generateAlertId('azure-metric-alert', resource.id)` |
| `source` | `'azure-metric-alert'` |
| `sourceId` | `resource.id` (full Azure resource ID) |
| `name` | `resource.name` |
| `description` | `properties.description` |
| `enabled` | `properties.enabled` |
| `severity` | `properties.severity` mapped: 0-1 = critical, 2 = warning, 3-4 = info |
| `conditionSummary` | Built from `criteria.allOf` (metricNamespace, metricName, timeAggregation, operator, threshold) |
| `notificationTargets` | Action group IDs extracted as `actionGroup:<name>` |
| `tags` | Azure resource tags |
| `lastModifiedAt` | `systemData.lastModifiedAt` |

### Activity Log Alerts

| AlertDefinition Field | Source |
|-----------------------|--------|
| `id` | `generateAlertId('azure-activity-log-alert', resource.id)` |
| `source` | `'azure-activity-log-alert'` |
| `severity` | `'unknown'` (activity log alerts have no severity) |
| `conditionSummary` | Built from `condition.allOf` (field == value, field in [...]) |
| `notificationTargets` | Action group IDs from `actions.actionGroups` |

### Scheduled Query Rules

| AlertDefinition Field | Source |
|-----------------------|--------|
| `id` | `generateAlertId('azure-scheduled-query-rule', resource.id)` |
| `source` | `'azure-scheduled-query-rule'` |
| `name` | `properties.displayName` (falls back to `resource.name`) |
| `severity` | `properties.severity` mapped same as metric alerts |
| `conditionSummary` | Built from `criteria.allOf` (query, timeAggregation, operator, threshold, failingPeriods) |
| `notificationTargets` | Action group IDs from `actions.actionGroups` |

## Limitations

- Each alert type uses a different `source` prefix (`azure-metric-alert`, `azure-activity-log-alert`, `azure-scheduled-query-rule`), not a single `azure-monitor` source.
- Activity log alerts have no native severity — always mapped to `'unknown'`.
- Owner is always empty — Azure resource `systemData.createdBy` is not mapped to `owner`.
- If listing a particular alert type fails for a subscription (insufficient permissions), that type is skipped and the others still proceed.

## License

MIT
