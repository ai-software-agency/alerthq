# alerthq

Alert definitions, unified.

Open-source, plugin-based CLI and TypeScript library that pulls alert definitions (not events/firings) from multiple cloud providers, normalizes them into a common schema, stores versioned state, and provides drift detection, tagging, manual entries, and export.

Read-only aggregator — never creates, modifies, or deletes alerts in any provider.

## Packages

| Package | Description |
|---------|-------------|
| `@alerthq/core` | Domain types, plugin interfaces, config/plugin loading, core functions |
| `@alerthq/cli` | CLI commands powered by `@alerthq/core` |
| `@alerthq/storage-sqlite` | SQLite storage backend |
| `@alerthq/storage-postgresql` | PostgreSQL storage backend |
| `@alerthq/provider-aws-cloudwatch` | AWS CloudWatch alert provider |
| `@alerthq/provider-elastic` | Elastic Watcher + Kibana Rules provider |
| `@alerthq/provider-mongodb-atlas` | MongoDB Atlas alert provider |
| `@alerthq/provider-azure-monitor` | Azure Monitor alert provider |

## Quick Start

```bash
npx alerthq init
npx alerthq sync
npx alerthq list
```

## Commands

| Command | Description |
|---------|-------------|
| `init` | Interactive setup — generate alerthq.config.yml |
| `test` | Test connections to storage and all providers |
| `sync` | Sync alert definitions from providers |
| `list` | List alert definitions with filters |
| `show` | Show detailed information for a single alert |
| `diff` | Show differences between two sync versions |
| `versions` | List sync history |
| `add` | Add a manual alert definition |
| `remove` | Remove a manual alert definition |
| `tag` | Set an overlay tag on an alert (key=value) |
| `export` | Export alerts to CSV or JSON |
| `stats` | Show summary statistics for alerts |

## AI Agent Discovery

```bash
npx alerthq --llm-help
```

Outputs structured JSON with all commands, options, examples, and configuration — designed for AI agents to discover and use alerthq programmatically.

## Development

```bash
pnpm install
pnpm build
pnpm test
pnpm lint
```

## License

MIT
