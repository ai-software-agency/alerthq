# alerthq

[![npm](https://img.shields.io/npm/v/@alerthq/cli.svg)](https://www.npmjs.com/package/@alerthq/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**Alert definitions, unified.**

Open-source, plugin-based CLI and TypeScript library that pulls alert definitions (not events/firings) from multiple cloud providers, normalizes them into a common schema, stores versioned state, and provides drift detection, tagging, manual entries, and export.

Read-only aggregator — never creates, modifies, or deletes alerts in any provider.

## How It Works

alerthq follows a **sync → version → diff** model:

1. **Sync** — fetch alert definitions from every configured provider and normalize them into a common `AlertDefinition` schema.
2. **Version** — store each sync result as an immutable versioned snapshot. Version `0` is reserved for manual entries.
3. **Diff** — compare any two versions to detect added, removed, and modified alerts (drift detection).

Overlay tags and manual alert entries persist across syncs. The tool is strictly read-only — it never creates, modifies, or deletes alerts in any provider.

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  CloudWatch  │  │   Datadog    │  │   Grafana    │  ... more providers
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │
       └────────┬────────┴────────┬────────┘
                │   fetchAlerts   │
                ▼                 ▼
        ┌───────────────────────────────┐
        │     Normalize → common        │
        │     AlertDefinition schema    │
        └───────────────┬───────────────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │   Versioned storage (SQLite   │
        │   or PostgreSQL)              │
        └───────────────┬───────────────┘
                        │
           ┌────────────┼────────────┐
           ▼            ▼            ▼
        list/show    diff/drift   export/stats
```

## Packages

| Package                            | Description                                                            |
| ---------------------------------- | ---------------------------------------------------------------------- |
| `@alerthq/core`                    | Domain types, plugin interfaces, config/plugin loading, core functions |
| `@alerthq/cli`                     | CLI commands powered by `@alerthq/core`                                |
| `@alerthq/storage-sqlite`          | SQLite storage backend                                                 |
| `@alerthq/storage-postgresql`      | PostgreSQL storage backend                                             |
| `@alerthq/provider-aws-cloudwatch` | AWS CloudWatch alert provider                                          |
| `@alerthq/provider-elastic`        | Elastic Watcher + Kibana Rules provider                                |
| `@alerthq/provider-mongodb-atlas`  | MongoDB Atlas alert provider                                           |
| `@alerthq/provider-azure-monitor`  | Azure Monitor alert provider                                           |
| `@alerthq/provider-datadog`        | Datadog alert provider                                                 |
| `@alerthq/provider-gcp-monitoring` | GCP Cloud Monitoring alert provider                                    |
| `@alerthq/provider-grafana`        | Grafana alert provider                                                 |

## Quick Start

```bash
npx alerthq init
npx alerthq sync
npx alerthq list
```

## Commands

| Command    | Description                                     |
| ---------- | ----------------------------------------------- |
| `init`     | Interactive setup — generate alerthq.config.yml |
| `test`     | Test connections to storage and all providers   |
| `sync`     | Sync alert definitions from providers           |
| `list`     | List alert definitions with filters             |
| `show`     | Show detailed information for a single alert    |
| `diff`     | Show differences between two sync versions      |
| `versions` | List sync history                               |
| `add`      | Add a manual alert definition                   |
| `remove`   | Remove a manual alert definition                |
| `tag`      | Set or remove an overlay tag on an alert        |
| `export`   | Export alerts to CSV or JSON                    |
| `stats`    | Show summary statistics for alerts              |

## Configuration Reference

alerthq reads `alerthq.config.yml` from the current working directory. Environment variables are supported via `${VAR}` syntax.

### Full config structure

```yaml
# alerthq.config.yml
storage:
  provider: sqlite # or "postgresql"

  sqlite:
    path: ./alerthq.db # SQLite file path (default: ./alerthq.db)

  # postgresql:
  #   connectionString: ${DATABASE_URL}
  #   ssl: true               # optional

providers:
  aws-cloudwatch:
    enabled: true # optional, defaults to true
    regions:
      - us-east-1
      - eu-west-1
    # credentials:            # optional — falls back to AWS SDK chain
    #   accessKeyId: ${AWS_ACCESS_KEY_ID}
    #   secretAccessKey: ${AWS_SECRET_ACCESS_KEY}

  datadog:
    enabled: true
    apiKey: ${DD_API_KEY}
    appKey: ${DD_APP_KEY}
    # site: datadoghq.eu      # optional, defaults to datadoghq.com

  grafana:
    enabled: true
    url: https://grafana.example.com
    apiKey: ${GRAFANA_API_KEY}

  elastic:
    enabled: true
    url: https://es.example.com:9200
    auth:
      type: basic
      username: ${ES_USER}
      password: ${ES_PASS}

  mongodb-atlas:
    enabled: true
    publicKey: ${ATLAS_PUBLIC_KEY}
    privateKey: ${ATLAS_PRIVATE_KEY}
    projectIds:
      - 64abc123def456

  azure-monitor:
    enabled: true
    subscriptionIds:
      - ${AZURE_SUBSCRIPTION_ID}

  gcp-monitoring:
    enabled: true
    projectId: my-gcp-project
    keyFilename: ./gcp-sa-key.json
```

### Provider config reference

| Provider         | Required Fields                         | Optional Fields                                                                      |
| ---------------- | --------------------------------------- | ------------------------------------------------------------------------------------ |
| `aws-cloudwatch` | `regions`                               | `credentials.accessKeyId`, `credentials.secretAccessKey`, `credentials.sessionToken` |
| `elastic`        | `url`, `auth.type`                      | `kibanaUrl`, `auth.username`, `auth.password`, `auth.apiKey`                         |
| `mongodb-atlas`  | `publicKey`, `privateKey`, `projectIds` | `baseUrl`, `pageSize`                                                                |
| `azure-monitor`  | `subscriptionIds`                       | —                                                                                    |
| `datadog`        | `apiKey`, `appKey`                      | `site`                                                                               |
| `gcp-monitoring` | `projectId`                             | `keyFilename`, `credentials.client_email`, `credentials.private_key`                 |
| `grafana`        | `url`                                   | `apiKey`, `basicAuth.username`, `basicAuth.password`                                 |

## Output Examples

### `alerthq list`

```
┌──────────────┬──────────────────────┬──────────┬───────────┬─────────┐
│ ID           │ Name                 │ Provider │ Severity  │ Enabled │
├──────────────┼──────────────────────┼──────────┼───────────┼─────────┤
│ a1b2c3d4e5f6 │ High CPU Usage       │ datadog  │ critical  │ yes     │
│ f6e5d4c3b2a1 │ Disk Space Low       │ grafana  │ warning   │ yes     │
│ 1a2b3c4d5e6f │ Error Rate Spike     │ aws-cw   │ critical  │ yes     │
│ 6f5e4d3c2b1a │ Memory Pressure      │ azure    │ warning   │ no      │
└──────────────┴──────────────────────┴──────────┴───────────┴─────────┘
4 alerts (3 enabled, 1 disabled)
```

### `alerthq diff`

```
Comparing version 2 → 3

Added (1):
  + [a1b2c3d4e5f6] High CPU Usage (datadog, critical)

Modified (1):
  ~ [f6e5d4c3b2a1] Disk Space Low — threshold changed

Removed (0): none

Summary: 1 added, 0 removed, 1 modified
```

### `alerthq stats`

```
Total alerts: 42
By provider:  aws-cloudwatch=18  datadog=12  grafana=8  elastic=4
By severity:  critical=6  warning=24  info=10  unknown=2
Enabled: 38 / Disabled: 4
Sync versions: 5 (latest: 2025-04-02 14:30 UTC)
```

## AI Agent Discovery

```bash
npx alerthq --llm-help
```

Outputs structured JSON with all commands, options, examples, provider config schemas, the `AlertDefinition` schema, and configuration examples — designed for AI agents to discover and use alerthq programmatically.

## Development

```bash
pnpm install
pnpm build
pnpm test
pnpm lint
```

## License

MIT
