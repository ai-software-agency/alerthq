# @alerthq/provider-grafana

Grafana alert provider for [alerthq](https://github.com/edrv/alerthq).

## Supported Alert Types

| Alert Type | API Source | Notes |
|------------|-----------|-------|
| Grafana-managed alert rules | `GET /api/v1/provisioning/alert-rules` | Unified alerting (Grafana 9+) |

## Authentication

Three authentication modes are supported:

- **API key / Service account token** — sent as `Authorization: Bearer <token>`
- **Basic auth** — sent as `Authorization: Basic base64(username:password)`
- **No auth** — for unauthenticated local Grafana instances

## Configuration

Add to your `alerthq.yaml`:

```yaml
providers:
  grafana:
    enabled: true
    url: https://grafana.example.com
    apiKey: glsa_xxxxxxxxxxxxxxxxxxxx
    # Or use basic auth:
    # basicAuth:
    #   username: admin
    #   password: changeme
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `url` | `string` | Yes | — | Grafana instance base URL |
| `apiKey` | `string` | No | — | API key or service account token |
| `basicAuth.username` | `string` | No | — | Basic auth username |
| `basicAuth.password` | `string` | No | — | Basic auth password |

## Required Permissions

The API key or service account needs the `alert.rules:read` RBAC scope to fetch alert rule definitions.

For contact point resolution, `alert.notifications:read` is also recommended.

## Field Mapping

| AlertDefinition Field | Source |
|-----------------------|--------|
| `id` | `generateAlertId('grafana', uid)` |
| `source` | `'grafana'` |
| `sourceId` | `uid` |
| `name` | `title` |
| `description` | `annotations.description` (fallback: `annotations.summary`) |
| `enabled` | `!isPaused` |
| `severity` | `labels.severity` (critical/warning/info, fallback: unknown) |
| `conditionSummary` | Built from `condition` + `data` + `for` duration |
| `notificationTargets` | `notification_settings.receiver` |
| `tags` | `labels` |
| `owner` | Empty string (not available from Grafana API) |
| `lastModifiedAt` | `updated` |

## Limitations

- Only fetches **Grafana-managed** alert rules. Data source-managed rules (Mimir/Loki/Cortex ruler rules) are not included.
- **No creator information** — the Grafana provisioning API does not expose who created or last modified a rule, so `owner` is always empty.
- **Severity is inferred from labels** — Grafana has no native severity field; the provider looks for a `severity` label and maps known values (critical, warning, info), defaulting to `unknown`.
- **No pagination** — the provisioning API returns all rules in a single response; very large rule sets may be slow.

## License

MIT
