# @alerthq/storage-sqlite

SQLite storage backend for alerthq. Zero-configuration — just point to a file path and go.

## Installation

```bash
pnpm add @alerthq/storage-sqlite
```

## Configuration

```yaml
# alerthq.config.yml
storage:
  provider: sqlite
  sqlite:
    path: ./alerthq.db # default if omitted
```

| Field  | Type     | Required | Default        | Description                      |
| ------ | -------- | -------- | -------------- | -------------------------------- |
| `path` | `string` | No       | `./alerthq.db` | Path to the SQLite database file |

The file is created automatically if it doesn't exist.

## Tables

The `initialize()` method runs migrations automatically on first use. Three tables are created:

### `sync_runs`

Stores sync operation history.

| Column            | Type                  | Description                       |
| ----------------- | --------------------- | --------------------------------- |
| `version`         | `INTEGER PRIMARY KEY` | Auto-incrementing version number  |
| `name`            | `TEXT NOT NULL`       | Sync run name                     |
| `description`     | `TEXT NOT NULL`       | Optional description              |
| `created_at`      | `TEXT NOT NULL`       | ISO 8601 timestamp                |
| `provider_status` | `TEXT NOT NULL`       | JSON object — per-provider status |

A seed row with `version = 0` is inserted for manual alert entries.

### `alert_definitions`

Stores versioned alert snapshots.

| Column                 | Type               | Description                                 |
| ---------------------- | ------------------ | ------------------------------------------- |
| `id`                   | `TEXT NOT NULL`    | Alert ID (sha256-based)                     |
| `version`              | `INTEGER NOT NULL` | FK to `sync_runs.version`                   |
| `source`               | `TEXT NOT NULL`    | Provider key or `"manual"`                  |
| `source_id`            | `TEXT NOT NULL`    | Provider's native identifier                |
| `name`                 | `TEXT NOT NULL`    | Alert name                                  |
| `description`          | `TEXT NOT NULL`    | Alert description                           |
| `enabled`              | `INTEGER NOT NULL` | 1 = enabled, 0 = disabled                   |
| `severity`             | `TEXT NOT NULL`    | `critical`, `warning`, `info`, or `unknown` |
| `condition_summary`    | `TEXT NOT NULL`    | Condition / threshold text                  |
| `notification_targets` | `TEXT NOT NULL`    | JSON array of targets                       |
| `tags`                 | `TEXT NOT NULL`    | JSON object of tags                         |
| `owner`                | `TEXT NOT NULL`    | Owner string                                |
| `raw_config`           | `TEXT NOT NULL`    | JSON object of raw config                   |
| `config_hash`          | `TEXT NOT NULL`    | SHA-256 hash for drift detection            |
| `last_modified_at`     | `TEXT`             | Provider last-modified timestamp            |
| `discovered_at`        | `TEXT NOT NULL`    | ISO 8601 discovery timestamp                |

Primary key: `(id, version)`.

### `overlay_tags`

User-defined tags that persist across sync versions.

| Column     | Type            | Description |
| ---------- | --------------- | ----------- |
| `alert_id` | `TEXT NOT NULL` | Alert ID    |
| `key`      | `TEXT NOT NULL` | Tag key     |
| `value`    | `TEXT NOT NULL` | Tag value   |

Primary key: `(alert_id, key)`.

## Auto-Migration

Migrations run automatically when `initialize()` is called during bootstrap. No manual migration step is needed. The SQLite database uses WAL (Write-Ahead Logging) mode for better concurrent read performance.

## License

MIT
