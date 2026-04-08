# @alerthq/provider-elastic

Elastic Watcher + Kibana Rules alert provider for [alerthq](https://github.com/edrv/alerthq).

## Supported Alert Types

| Alert Type | API Source | Notes |
|------------|-----------|-------|
| Elasticsearch Watchers | `POST /_watcher/_query/watches` via `@elastic/elasticsearch` | All watcher types (compare, script, array_compare, always, never) |
| Kibana Alerting Rules | `GET /api/alerting/rules/_find` via Kibana REST API | All rule types (metrics, logs, uptime, APM, etc.) |

Kibana rules are only fetched when `kibanaUrl` is configured.

## Authentication

Two authentication models are supported:

- **Basic auth** — username and password
- **API key** — a base64-encoded API key

The same credentials are used for both Elasticsearch and Kibana (if configured).

## Configuration

Add to your `alerthq.yaml`:

```yaml
providers:
  elastic:
    enabled: true
    url: https://my-cluster.es.example.com:9200
    kibanaUrl: https://my-cluster.kb.example.com:5601  # optional
    auth:
      type: basic
      username: elastic
      password: changeme
    # Or use API key auth:
    # auth:
    #   type: apiKey
    #   apiKey: base64encodedkey
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `url` | `string` | Yes | — | Elasticsearch cluster URL |
| `kibanaUrl` | `string` | No | — | Kibana URL (enables Kibana rule fetching) |
| `auth.type` | `'basic' \| 'apiKey'` | Yes | — | Authentication type |
| `auth.username` | `string` | If basic | — | Elasticsearch username |
| `auth.password` | `string` | If basic | — | Elasticsearch password |
| `auth.apiKey` | `string` | If apiKey | — | Base64-encoded API key |
| `watcherPageSize` | `number` | No | `100` | Page size for watcher queries |
| `kibanaPageSize` | `number` | No | `100` | Page size for Kibana rule queries |

## Required Permissions

**Elasticsearch:** The user/API key needs the `manage_watcher` or `monitor_watcher` cluster privilege to query watches.

**Kibana:** The user/API key needs the `read` privilege for the Alerting feature in the relevant Kibana space(s).

## Field Mapping

### Watchers

| AlertDefinition Field | Source |
|-----------------------|--------|
| `id` | `generateAlertId('elastic-watcher', _id)` |
| `source` | `'elastic-watcher'` |
| `sourceId` | `_id` (watch ID) |
| `name` | `_id` (watches have no separate name field) |
| `description` | Empty string |
| `enabled` | `status.state.active` |
| `severity` | `'unknown'` (watchers have no native severity) |
| `conditionSummary` | Built from `condition` block (compare, script, always, etc.) |
| `notificationTargets` | Extracted from `actions` (email, webhook, slack, pagerduty, logging, index) |
| `tags` | Empty (watchers have no native tags) |
| `lastModifiedAt` | `null` (not available from watcher API) |

### Kibana Rules

| AlertDefinition Field | Source |
|-----------------------|--------|
| `id` | `generateAlertId('elastic-kibana', id)` |
| `source` | `'elastic-kibana'` |
| `sourceId` | `id` (Kibana rule UUID) |
| `name` | `name` |
| `enabled` | `enabled` |
| `severity` | `'unknown'` (Kibana rules have no unified severity field) |
| `conditionSummary` | Built from `rule_type_id` + `params` (criteria, threshold, index) |
| `notificationTargets` | Extracted from `actions` by `actionTypeId` (email, slack, pagerduty, webhook, server-log) |
| `tags` | Kibana tags converted to `{ tagName: 'true' }` record |
| `lastModifiedAt` | `updatedAt` |

## Limitations

- Watcher severity is always `'unknown'` — Elasticsearch watchers have no native severity concept.
- Watcher names use the `_id` field since watchers have no dedicated name.
- Watcher `lastModifiedAt` is not available from the query API.
- Kibana rules require a separate `kibanaUrl` and do not use the Elasticsearch SDK.

## License

MIT
