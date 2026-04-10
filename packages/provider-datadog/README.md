# @alerthq/provider-datadog

Datadog alert provider for [alerthq](https://github.com/edrv/alerthq).

## Supported Alert Types

| Alert Type                | API Source                                                        | Notes                                                                                                           |
| ------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| All Datadog monitor types | `v1.MonitorsApi.listMonitors()` via `@datadog/datadog-api-client` | Includes metric, log, anomaly, composite, forecast, outlier, APM, process, network, event, synthetics, and more |

## Authentication

Requires a Datadog API key and Application key:

1. **API Key** — authenticates API requests (`DD-API-KEY` header)
2. **Application Key** — scopes access to your organization (`DD-APPLICATION-KEY` header)

Both can be created in the Datadog organization settings under **API Keys** and **Application Keys**.

## Configuration

Add to your `alerthq.yaml`:

```yaml
providers:
  datadog:
    enabled: true
    apiKey: ${DD_API_KEY}
    appKey: ${DD_APP_KEY}
    # Optional: Datadog site (defaults to datadoghq.com)
    # site: datadoghq.eu
```

| Field    | Type     | Required | Default         | Description                                                               |
| -------- | -------- | -------- | --------------- | ------------------------------------------------------------------------- |
| `apiKey` | `string` | Yes      | —               | Datadog API key                                                           |
| `appKey` | `string` | Yes      | —               | Datadog Application key                                                   |
| `site`   | `string` | No       | `datadoghq.com` | Datadog site (`datadoghq.com`, `datadoghq.eu`, `us5.datadoghq.com`, etc.) |

## Required Permissions

The API key and Application key need the `monitors_read` scope (read-only access to monitors). No write permissions are required.

## Field Mapping

| AlertDefinition Field | Source                                                                                |
| --------------------- | ------------------------------------------------------------------------------------- |
| `id`                  | `generateAlertId('datadog', String(monitor.id))`                                      |
| `sourceId`            | `String(monitor.id)`                                                                  |
| `name`                | `monitor.name`                                                                        |
| `description`         | `monitor.message`                                                                     |
| `enabled`             | Always `true`                                                                         |
| `severity`            | From `monitor.priority`: P1/P2 → critical, P3 → warning, P4/P5 → info, null → unknown |
| `conditionSummary`    | `"${monitor.type}: ${monitor.query}"`                                                 |
| `notificationTargets` | @-mentions extracted from `monitor.message`                                           |
| `tags`                | `monitor.tags` split on `:` into key/value pairs                                      |
| `owner`               | `monitor.creator.handle`                                                              |
| `lastModifiedAt`      | `monitor.modified`                                                                    |

## Limitations

- **Severity from priority**: Not all Datadog monitors have a priority set. When unset, severity defaults to `unknown`.
- **Notification targets**: Extracted by parsing @-mentions from the message text, which may miss targets configured through Datadog integrations that don't appear in the message.
- **Enabled state**: Datadog monitors can be muted but not disabled. All monitors are reported as `enabled: true`.
- **Pagination**: Uses offset-based pagination with a page size of 1000. Very large monitor counts are handled automatically.

## License

MIT
