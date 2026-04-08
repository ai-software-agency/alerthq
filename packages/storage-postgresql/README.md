# @alerthq/storage-postgresql

PostgreSQL storage backend for alerthq. Uses connection pooling and supports SSL.

## Installation

```bash
pnpm add @alerthq/storage-postgresql
```

## Configuration

### Connection string (recommended)

```yaml
# alerthq.config.yml
storage:
  provider: postgresql
  postgresql:
    connectionString: ${DATABASE_URL}
```

### Individual parameters

```yaml
storage:
  provider: postgresql
  postgresql:
    host: localhost
    port: 5432
    database: alerthq
    username: ${PG_USER}
    password: ${PG_PASSWORD}
    ssl: true                # optional, defaults to false
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `connectionString` | `string` | No* | — | PostgreSQL connection URI |
| `host` | `string` | No* | `localhost` | Database host |
| `port` | `number` | No* | `5432` | Database port |
| `database` | `string` | No* | `alerthq` | Database name |
| `username` | `string` | No | — | Database user |
| `password` | `string` | No | — | Database password |
| `ssl` | `boolean` | No | `false` | Enable SSL |

\* Provide either `connectionString` or the individual `host`/`port`/`database` fields.

## Tables

The `initialize()` method runs migrations automatically on first use. Three tables are created:

### `sync_runs`

Stores sync operation history.

| Column | Type | Description |
|--------|------|-------------|
| `version` | `INTEGER PRIMARY KEY` | Auto-incrementing version number |
| `name` | `TEXT NOT NULL` | Sync run name |
| `description` | `TEXT NOT NULL` | Optional description |
| `created_at` | `TIMESTAMPTZ NOT NULL` | Sync timestamp |
| `provider_status` | `JSONB NOT NULL` | Per-provider status object |

A seed row with `version = 0` is inserted for manual alert entries.

### `alert_definitions`

Stores versioned alert snapshots.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `TEXT NOT NULL` | Alert ID (sha256-based) |
| `version` | `INTEGER NOT NULL` | FK to `sync_runs.version` |
| `source` | `TEXT NOT NULL` | Provider key or `"manual"` |
| `source_id` | `TEXT NOT NULL` | Provider's native identifier |
| `name` | `TEXT NOT NULL` | Alert name |
| `description` | `TEXT NOT NULL` | Alert description |
| `enabled` | `BOOLEAN NOT NULL` | Enabled in source system |
| `severity` | `TEXT NOT NULL` | `critical`, `warning`, `info`, or `unknown` |
| `condition_summary` | `TEXT NOT NULL` | Condition / threshold text |
| `notification_targets` | `JSONB NOT NULL` | Array of notification targets |
| `tags` | `JSONB NOT NULL` | Tag key-value map |
| `owner` | `TEXT NOT NULL` | Owner string |
| `raw_config` | `JSONB NOT NULL` | Raw provider configuration |
| `config_hash` | `TEXT NOT NULL` | SHA-256 hash for drift detection |
| `last_modified_at` | `TIMESTAMPTZ` | Provider last-modified timestamp |
| `discovered_at` | `TIMESTAMPTZ NOT NULL` | Discovery timestamp |

Primary key: `(id, version)`.

### `overlay_tags`

User-defined tags that persist across sync versions.

| Column | Type | Description |
|--------|------|-------------|
| `alert_id` | `TEXT NOT NULL` | Alert ID |
| `key` | `TEXT NOT NULL` | Tag key |
| `value` | `TEXT NOT NULL` | Tag value |

Primary key: `(alert_id, key)`.

## Auto-Migration

Migrations run automatically when `initialize()` is called during bootstrap. No manual migration step is needed. The backend uses the `pg` driver with connection pooling.

## License

MIT
