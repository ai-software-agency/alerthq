# Architecture

This document describes the internal architecture of alerthq for contributors and integrators.

## Data Flow

```
                         alerthq.config.yml
                                │
                                ▼
                         ┌─────────────┐
                         │  bootstrap   │  loadConfig → resolveEnvVars → validate
                         └──────┬──────┘
                                │
              ┌─────────────────┼─────────────────┐
              ▼                 ▼                 ▼
     ┌────────────────┐ ┌─────────────┐ ┌────────────────┐
     │ Storage Plugin │ │  Provider A │ │  Provider B    │ ... N providers
     │   initialize   │ │  initialize │ │  initialize    │
     └────────┬───────┘ └──────┬──────┘ └────────┬───────┘
              │                │                  │
              │                └──────┬───────────┘
              │                       │
              │                 fetchAlerts()
              │                       │
              │                       ▼
              │            ┌───────────────────┐
              │            │    Normalize to    │
              │            │  AlertDefinition   │
              │            │    (per mapper)    │
              │            └─────────┬─────────┘
              │                      │
              ▼                      ▼
     ┌────────────────────────────────────────┐
     │           sync engine                   │
     │  • create SyncRun (version N)           │
     │  • saveAlertDefinitions(version, [...]) │
     │  • apply overlay tags                   │
     └────────────────┬───────────────────────┘
                      │
                      ▼
     ┌────────────────────────────────────────┐
     │         Versioned Storage               │
     │  (SQLite or PostgreSQL)                 │
     │                                         │
     │  sync_runs │ alert_definitions │ overlay │
     └────────────────┬───────────────────────┘
                      │
         ┌────────────┼────────────┐
         ▼            ▼            ▼
     list/show     diff/drift   export/stats
```

## Package Dependency Graph

```
┌──────────────────────────────────────────────────────┐
│                     @alerthq/cli                      │
│  (Commander CLI — depends on core, discovers plugins) │
└────────────────────────┬─────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────┐
│                    @alerthq/core                      │
│  Domain types, interfaces, config loading, sync,      │
│  canonical data, utilities                            │
└───┬──────────────────────────────────────────────┬───┘
    │                                              │
    ▼                                              ▼
┌──────────────────┐                  ┌──────────────────────┐
│ Storage backends │                  │   Provider adapters  │
│  storage-sqlite  │                  │  provider-aws-cw     │
│  storage-pg      │                  │  provider-datadog    │
└──────────────────┘                  │  provider-elastic    │
                                      │  provider-grafana    │
    All plugins depend on             │  provider-atlas      │
    @alerthq/core for types           │  provider-azure      │
    and interfaces only               │  provider-gcp        │
                                      └──────────────────────┘
```

All packages are ESM TypeScript. Plugins depend on `@alerthq/core` as a peer dependency for types and interfaces.

## Plugin System

Plugins are resolved at runtime via dynamic `import()`. The resolution strategy is:

1. **Convention-based**: Provider name `'datadog'` resolves to `@alerthq/provider-datadog`. Storage name `'sqlite'` resolves to `@alerthq/storage-sqlite`.
2. **Explicit package**: If the provider config includes a `package` field, that value is used instead (supports npm packages and relative paths for third-party plugins).
3. **Multi-strategy import**: The loader tries multiple import paths to handle pnpm strict mode, hoisted layouts, and local development. It tries the package name directly, then with `/index.js`, and finally relative resolution.

### Provider plugin contract

Each provider package must:

- **Default-export** a factory function: `() => ProviderAdapter`
- **Optionally export** a `configSchema` (Zod) for fail-fast validation at load time

```
provider-foo/
  src/
    index.ts        # re-exports factory + configSchema
    adapter.ts      # implements ProviderAdapter
    client.ts       # API client (handles pagination, retries)
    mapper.ts       # raw response → AlertDefinition
    schema.ts       # Zod config schema
    types.ts        # provider-specific types
```

### Storage plugin contract

Each storage package must:

- **Default-export** a factory function: `() => StorageProvider`
- Implement `initialize()` to run migrations and open connections
- Implement `dispose()` to close connections

## Versioning Model

- Each `sync` creates a new `SyncRun` with an auto-incrementing `version` number.
- Version `0` is **reserved** for manual alert entries — these persist across syncs and are never overwritten.
- Alert definitions are stored per-version. The `diff` command compares any two versions to detect **added**, **removed**, and **modified** alerts by comparing `configHash` values.
- **Overlay tags** are stored independently (not version-scoped) and are merged into alert `tags` at read time. User-set overlay tags override provider-discovered tags on conflict.
- If a sync produces no changes from the latest version, no new `SyncRun` is created.

## Canonical Data System

All outward-facing text is driven from a canonical source of truth in `packages/core/src/canonical/`:

| File | Purpose |
|------|---------|
| `meta.ts` | Project metadata: name, description, packages, providers, severities, export formats |
| `cli.ts` | CLI command definitions: name, usage, description, options, examples |
| `generators.ts` | Runtime generators for `--help` text and `--llm-help` JSON |
| `index.ts` | Re-exports all canonical data |

### Surfaces driven by canonical data

- **CLI `--help`** — generated by `generateHelpText()`
- **CLI `--llm-help`** — generated by `generateLlmHelp()`
- **README.md** — must reference all packages and commands from canonical data
- **`packages/cli/package.json` description** — must match `META.npmDescription`
- **`init` command** — uses `META.storageBackends` and `META.providers` for choices

### Drift detection tests

`packages/core/tests/canonical-drift.test.ts` enforces alignment:

- README references all `META.packages` names
- README references all `CLI_COMMANDS` names
- `--help` includes all command names and descriptions
- `--llm-help` includes all providers, storage backends, and commands
- CLI `package.json` description matches `META.npmDescription`

Run `pnpm test` to catch drift before committing.
