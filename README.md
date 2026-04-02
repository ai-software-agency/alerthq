# alerthq

An open-source, plugin-based CLI tool and TypeScript library that pulls alert **definitions** (not events/firings) from multiple cloud providers, normalizes them into a common schema, stores versioned state, and provides drift detection, tagging, manual entries, and export capabilities.

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

## Development

```bash
pnpm install
pnpm build
pnpm test
pnpm lint
```

## License

MIT
