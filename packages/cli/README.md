# @alerthq/cli

Command-line interface for alerthq — sync, diff, tag, and export cloud alert definitions.

## Installation

```bash
# Global install
npm i -g @alerthq/cli

# Or run without installing
npx alerthq

# Or in a monorepo / project
pnpm add @alerthq/cli
```

## Commands

### `init`

Interactive setup — generates an `alerthq.config.yml` file.

```bash
alerthq init
```

Walks through storage backend selection and provider configuration. Outputs the config file and lists required package installs and environment variables.

### `test`

Test connections to storage and all configured providers.

```bash
alerthq test
```

Returns a pass/fail result for each configured component.

### `sync [options]`

Sync alert definitions from providers. Each sync creates a new versioned snapshot.

```bash
alerthq sync
alerthq sync --provider aws-cloudwatch
alerthq sync --name "Deploy v2.3"
```

| Option | Description |
|--------|-------------|
| `--provider <name>` | Sync only a specific provider |
| `--name <name>` | Name for this sync run |
| `--description <text>` | Description for this sync run |

### `list [options]`

List alert definitions with filters.

```bash
alerthq list
alerthq list --severity critical
alerthq list --provider aws-cloudwatch --format json
alerthq list --tag env=production
```

| Option | Description | Default |
|--------|-------------|---------|
| `--provider <name>` | Filter by provider | — |
| `--severity <level>` | Filter by severity | — |
| `--tag <key=value>` | Filter by tag (key=value) | — |
| `--owner <name>` | Filter by owner | — |
| `--enabled` | Show only enabled alerts | — |
| `--disabled` | Show only disabled alerts | — |
| `--format <fmt>` | Output format: table, json, csv | `table` |

### `show <id>`

Show detailed information for a single alert. Supports prefix matching.

```bash
alerthq show abc123
alerthq show abc       # prefix match
```

### `diff [options]`

Show differences between two sync versions (drift detection).

```bash
alerthq diff
alerthq diff --from 1 --to 3
```

| Option | Description | Default |
|--------|-------------|---------|
| `--from <version>` | Source version number | — |
| `--to <version>` | Target version number | — |
| `--format <fmt>` | Output format: table, json | `table` |

When called without options, compares the latest two versions.

### `versions [options]`

List sync history.

```bash
alerthq versions
alerthq versions --limit 5
```

| Option | Description | Default |
|--------|-------------|---------|
| `--limit <n>` | Maximum number of versions to show | `20` |

### `add [options]`

Add a manual alert definition. Runs interactively if no options are provided.

```bash
alerthq add --name "CPU High" --severity critical --condition "CPU > 90%"
alerthq add                    # interactive mode
```

| Option | Description |
|--------|-------------|
| `--name <name>` | Alert name |
| `--severity <level>` | Severity: critical, warning, info, unknown |
| `--condition <text>` | Condition summary |
| `--owner <name>` | Alert owner |

### `remove <id>`

Remove a manual alert definition.

```bash
alerthq remove abc123
```

### `tag <id> <key=value>`

Set or remove an overlay tag on an alert. Tags persist across syncs.

```bash
alerthq tag abc123 env=production
alerthq tag abc team=backend
alerthq tag abc123 env --remove
```

| Option | Description |
|--------|-------------|
| `--remove` | Remove the tag key instead of setting it |

### `export [options]`

Export alerts to CSV or JSON.

```bash
alerthq export --format json
alerthq export --output alerts.csv
alerthq export --format json --severity critical
```

| Option | Description | Default |
|--------|-------------|---------|
| `--format <fmt>` | Output format: csv, json | `csv` |
| `--output <path>` | Write to file instead of stdout | — |
| `--provider <name>` | Filter by provider | — |
| `--severity <level>` | Filter by severity | — |

### `stats`

Show summary statistics for alerts.

```bash
alerthq stats
```

Displays total alert count, breakdown by provider, breakdown by severity, enabled/disabled ratio, and sync version count.

## Global Options

| Option | Description |
|--------|-------------|
| `-V, --version` | Output the version number |
| `-h, --help` | Display help for command |
| `--llm-help` | Output structured JSON for AI agents |

## Config File

alerthq looks for `alerthq.config.yml` in the current working directory. See the [root README](../../README.md#configuration-reference) for full config reference.

## Environment Variables

Config values support `${VAR}` substitution. Common variables by provider:

| Provider | Environment Variables |
|----------|----------------------|
| `aws-cloudwatch` | `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` |
| `elastic` | `ALERTHQ_ELASTIC_USERNAME`, `ALERTHQ_ELASTIC_PASSWORD` |
| `mongodb-atlas` | `ALERTHQ_ATLAS_PUBLIC_KEY`, `ALERTHQ_ATLAS_PRIVATE_KEY` |
| `datadog` | `DD_API_KEY`, `DD_APP_KEY` |
| `gcp-monitoring` | `GOOGLE_APPLICATION_CREDENTIALS` |
| `grafana` | `GRAFANA_URL`, `GRAFANA_API_KEY` |
| `postgresql` (storage) | `DATABASE_URL` |

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Error (config invalid, provider failed, etc.) |

## License

MIT
