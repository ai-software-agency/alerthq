# @alerthq/core

Core library for alerthq. Provides domain types, plugin interfaces, config/plugin loading, and all core functions for syncing, querying, and managing alert definitions.

## Installation

```bash
pnpm add @alerthq/core
```

## Usage

```ts
import { bootstrap, sync, getAlerts, getChanges } from '@alerthq/core';

// Bootstrap loads config, resolves plugins, runs migrations
const ctx = await bootstrap('./alerthq.config.yml');

// Sync fetches alerts from all providers and stores a new version
const run = await sync(ctx);

// Query the latest version
const alerts = await getAlerts(ctx);

// Compare two versions for drift
const diff = await getChanges(ctx, { from: 1, to: 2 });

// Clean up connections
await ctx.dispose();
```

### `withContext` pattern (recommended)

For scripts or CLI commands, use the bootstrap/dispose lifecycle:

```ts
import { bootstrap } from '@alerthq/core';

const ctx = await bootstrap('./alerthq.config.yml');
try {
  // ... do work ...
} finally {
  await ctx.dispose();
}
```

## Exported Functions

| Function              | Signature                                                                      | Description                                 |
| --------------------- | ------------------------------------------------------------------------------ | ------------------------------------------- |
| `bootstrap`           | `(configPath: string) => Promise<Context>`                                     | Load config, resolve and initialize plugins |
| `sync`                | `(ctx: Context, opts?: SyncOptions) => Promise<SyncRun>`                       | Sync alert definitions from providers       |
| `getAlerts`           | `(ctx: Context, opts?) => Promise<AlertDefinition[]>`                          | Get alert definitions for a version         |
| `addManualAlert`      | `(ctx: Context, input: ManualAlertInput) => Promise<AlertDefinition>`          | Add a manual alert definition               |
| `removeManualAlert`   | `(ctx: Context, alertId: string) => Promise<boolean>`                          | Remove a manual alert definition            |
| `getChanges`          | `(ctx: Context, opts?) => Promise<ChangesResult>`                              | Compare two versions (drift detection)      |
| `setTag`              | `(ctx: Context, alertId: string, key: string, value: string) => Promise<void>` | Set an overlay tag on an alert              |
| `removeTag`           | `(ctx: Context, alertId: string, key: string) => Promise<boolean>`             | Remove an overlay tag                       |
| `testConnections`     | `(ctx: Context) => Promise<ConnectionTestResult[]>`                            | Test storage and provider connections       |
| `withRetry`           | `<T>(fn: () => Promise<T>, opts?: RetryOptions) => Promise<T>`                 | Retry with exponential backoff              |
| `generateAlertId`     | `(source: string, sourceId: string) => string`                                 | Generate deterministic alert ID             |
| `hashConfig`          | `(config: Record<string, unknown>) => string`                                  | SHA-256 hash of raw config                  |
| `formatTable`         | `(alerts: AlertDefinition[]) => string`                                        | Format alerts as a table                    |
| `formatCsv`           | `(alerts: AlertDefinition[]) => string`                                        | Format alerts as CSV                        |
| `formatJson`          | `(alerts: AlertDefinition[]) => string`                                        | Format alerts as JSON                       |
| `logger`              | `Logger`                                                                       | Structured logger instance                  |
| `setLogger`           | `(l: Logger) => void`                                                          | Replace the default logger                  |
| `loadConfig`          | `(path: string) => Promise<AlerthqConfig>`                                     | Load and validate config from YAML          |
| `resolveEnvVars`      | `(input: string) => string`                                                    | Resolve `${VAR}` references in strings      |
| `loadStoragePlugin`   | `(name: string) => Promise<StorageFactory>`                                    | Dynamically load a storage plugin           |
| `loadProviderPlugins` | `(config: AlerthqConfig) => Promise<Record<string, ProviderAdapter>>`          | Load and initialize all providers           |
| `alerthqConfigSchema` | `ZodType`                                                                      | Zod schema for config validation            |

### Canonical data exports

| Export               | Description                                              |
| -------------------- | -------------------------------------------------------- |
| `META`               | Project metadata (providers, packages, severities, etc.) |
| `CLI_COMMANDS`       | All CLI command definitions                              |
| `generateHelpText()` | Generate human-readable help text                        |
| `generateLlmHelp()`  | Generate machine-readable JSON for AI agents             |

## Types

### `AlertDefinition`

The normalized representation of an alert from any provider:

```ts
interface AlertDefinition {
  id: string; // sha256(source:sourceId), first 12 chars
  version: number; // sync version (0 = manual)
  source: string; // provider key or "manual"
  sourceId: string; // provider's native ID
  name: string; // alert name
  description: string; // alert description
  enabled: boolean; // enabled in source system
  severity: Severity; // "critical" | "warning" | "info" | "unknown"
  conditionSummary: string; // human-readable condition
  notificationTargets: string[]; // SNS ARNs, emails, etc.
  tags: Record<string, string>; // provider tags + overlay tags
  owner: string; // team or user
  rawConfig: Record<string, unknown>; // raw provider config
  configHash: string; // sha256(rawConfig) for drift detection
  lastModifiedAt: string | null; // last provider modification
  discoveredAt: string; // ISO 8601 first discovery time
}
```

### `SyncRun`

A record of a sync operation:

```ts
interface SyncRun {
  version: number; // auto-incrementing (0 = reserved)
  name: string; // user-provided or auto-generated
  description: string; // optional context
  createdAt: string; // ISO 8601
  providerStatus: Record<string, 'success' | 'error' | 'skipped'>;
}
```

### `AlerthqConfig`

Top-level configuration:

```ts
interface AlerthqConfig {
  storage: StorageConfig;
  providers: Record<string, ProviderConfig>;
}
```

### `Context`

Runtime context returned by `bootstrap`:

```ts
interface Context {
  config: AlerthqConfig;
  storage: StorageProvider;
  providers: Record<string, ProviderAdapter>;
  dispose(): Promise<void>;
}
```

### `Severity`

```ts
type Severity = 'critical' | 'warning' | 'info' | 'unknown';
```

## Plugin Interfaces

### `ProviderAdapter`

Implement this to create a custom alert provider:

```ts
interface ProviderAdapter {
  readonly name: string;
  initialize(config: Record<string, unknown>): Promise<void>;
  fetchAlerts(): Promise<AlertDefinition[]>;
  testConnection(): Promise<boolean>;
  dispose?(): Promise<void>;
}
```

### `StorageProvider`

Implement this for a custom storage backend:

```ts
interface StorageProvider {
  readonly name: string;
  initialize(config: Record<string, unknown>): Promise<void>;
  dispose?(): Promise<void>;

  // Sync runs
  createSyncRun(run: SyncRun): Promise<void>;
  getLatestSyncRun(): Promise<SyncRun | null>;
  getSyncRun(version: number): Promise<SyncRun | null>;
  listSyncRuns(limit?: number, offset?: number): Promise<SyncRun[]>;

  // Alert definitions
  saveAlertDefinitions(version: number, alerts: AlertDefinition[]): Promise<void>;
  getAlertDefinitions(
    version: number,
    opts?: { limit?: number; offset?: number },
  ): Promise<AlertDefinition[]>;
  removeAlertDefinition(version: number, alertId: string): Promise<boolean>;
  findAlertsByIdPrefix(version: number, prefix: string): Promise<AlertDefinition[]>;

  // Drift detection
  getChanges(
    fromVersion: number,
    toVersion: number,
  ): Promise<{
    added: AlertDefinition[];
    removed: AlertDefinition[];
    modified: Array<{ before: AlertDefinition; after: AlertDefinition }>;
  }>;

  // Overlay tags
  setOverlayTag(alertId: string, key: string, value: string): Promise<void>;
  removeOverlayTag(alertId: string, key: string): Promise<boolean>;
  getOverlayTags(alertId: string): Promise<Record<string, string>>;
}
```

## Writing a Custom Provider

Create a package that default-exports a factory function and optionally exports a Zod config schema:

```ts
import type { ProviderAdapter, AlertDefinition } from '@alerthq/core';
import { generateAlertId, hashConfig, withRetry } from '@alerthq/core';
import { z } from 'zod';

export const configSchema = z.object({
  apiUrl: z.string(),
  token: z.string(),
});

class MyProvider implements ProviderAdapter {
  readonly name = 'my-provider';
  private config!: z.infer<typeof configSchema>;

  async initialize(config: Record<string, unknown>): Promise<void> {
    this.config = configSchema.parse(config);
  }

  async fetchAlerts(): Promise<AlertDefinition[]> {
    const raw = await withRetry(() => fetchFromApi(this.config.apiUrl));
    return raw.map((r) => ({
      id: generateAlertId(this.name, r.id),
      version: 0, // set by sync engine
      source: this.name,
      sourceId: String(r.id),
      name: r.name,
      description: r.desc ?? '',
      enabled: r.active,
      severity: mapSeverity(r.level),
      conditionSummary: r.condition,
      notificationTargets: r.channels,
      tags: r.labels ?? {},
      owner: r.owner ?? '',
      rawConfig: r as Record<string, unknown>,
      configHash: hashConfig(r as Record<string, unknown>),
      lastModifiedAt: r.updatedAt ?? null,
      discoveredAt: new Date().toISOString(),
    }));
  }

  async testConnection(): Promise<boolean> {
    try {
      await fetchFromApi(this.config.apiUrl + '/health');
      return true;
    } catch {
      return false;
    }
  }
}

export default (): ProviderAdapter => new MyProvider();
```

Register the provider in `alerthq.config.yml`:

```yaml
providers:
  my-provider:
    enabled: true
    package: './path/to/my-provider' # or npm package name
    apiUrl: https://api.example.com
    token: ${MY_PROVIDER_TOKEN}
```

## License

MIT
