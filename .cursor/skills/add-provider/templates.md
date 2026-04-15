# Provider Package Templates

Use these templates when scaffolding a new provider package. Replace all placeholders:

- `<id>` — kebab-case provider name (e.g. `datadog`, `gcp-monitoring`)
- `<Id>` — PascalCase provider name (e.g. `Datadog`, `GcpMonitoring`)
- `<description>` — one-line description (e.g. `Datadog alert provider`)
- `<sdk-package>` — npm SDK package name (e.g. `@datadog/datadog-api-client`)

---

## package.json

```json
{
  "name": "@alerthq/provider-<id>",
  "version": "0.0.0",
  "type": "module",
  "description": "<description> for alerthq",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "default": "./dist/index.js"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup src/index.ts --format esm --dts",
    "test": "vitest run --passWithNoTests",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src/"
  },
  "dependencies": {
    "<sdk-package>": "^LATEST",
    "zod": "^3.24.0"
  },
  "peerDependencies": {
    "@alerthq/core": "workspace:*"
  },
  "license": "MIT"
}
```

If no SDK is needed (raw HTTP only), omit the `dependencies` block entirely since `fetch` is built into Node 20+.

---

## tsconfig.json

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

---

## vitest.config.ts

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      exclude: ['**/tests/**', '**/dist/**', '**/*.test.ts'],
    },
  },
});
```

---

## src/index.ts

```typescript
import type { ProviderFactory } from '@alerthq/core';
import { <Id>Adapter } from './adapter.js';

export { <Id>Adapter } from './adapter.js';
export { <Id>ApiClient } from './client.js';
export { mapXxxToAlertDefinition } from './mapper.js';
export type { <Id>ProviderConfig } from './types.js';
export { <id>ConfigSchema as configSchema } from './schema.js';

const createProvider: ProviderFactory = () => new <Id>Adapter();
export default createProvider;
```

Adjust the named exports to match actual class/function/type names. The `configSchema` export is required — the plugin loader uses it for fail-fast config validation.

---

## src/types.ts

```typescript
/**
 * Configuration for the <Id> provider adapter.
 */
export interface <Id>ProviderConfig {
  // Add fields the user sets in alerthq.yaml under providers.<id>
  // Examples: apiKey, region, projectId, url, etc.
}

// Add API response DTOs / intermediate types below.
// Model these from the actual API response shapes discovered in research.
```

---

## src/client.ts

```typescript
import { withRetry, logger } from '@alerthq/core';
import type { <Id>ProviderConfig } from './types.js';

export class <Id>ApiClient {
  private config!: <Id>ProviderConfig;

  init(config: <Id>ProviderConfig): void {
    this.config = config;
    // Initialize SDK client or HTTP headers here
  }

  async fetchAlerts(): Promise<NativeAlertType[]> {
    // Paginate through all alerts
    // Wrap each API call with withRetry()
    // Return the full list

    const results: NativeAlertType[] = [];

    // Example pagination loop:
    // let page = 1;
    // while (true) {
    //   const body = await withRetry(async () => { ... });
    //   results.push(...body.data);
    //   if (noMorePages) break;
    //   page++;
    // }

    logger.info(`[<id>] Fetched ${results.length} alerts`);
    return results;
  }

  async testConnection(): Promise<boolean> {
    try {
      // Lightweight API call to verify credentials
      return true;
    } catch {
      return false;
    }
  }

  dispose(): void {
    // Close SDK clients, release resources
  }
}
```

---

## src/mapper.ts

```typescript
import type { AlertDefinition, Severity } from '@alerthq/core';
import { generateAlertId, hashConfig } from '@alerthq/core';

const PROVIDER_NAME = '<id>';

export function mapXxxToAlertDefinition(native: NativeType): AlertDefinition {
  const sourceId = native.id; // unique ID from the provider
  const rawConfig: Record<string, unknown> = { ...native };

  return {
    id: generateAlertId(PROVIDER_NAME, sourceId),
    version: 0,
    source: PROVIDER_NAME,
    sourceId,
    name: native.name ?? '',
    description: native.description ?? '',
    enabled: native.enabled ?? true,
    severity: mapSeverity(native),
    conditionSummary: buildConditionSummary(native),
    notificationTargets: extractNotificationTargets(native),
    tags: native.tags ?? {},
    owner: native.owner ?? '',
    rawConfig,
    configHash: hashConfig(rawConfig),
    lastModifiedAt: native.updatedAt ?? null,
    discoveredAt: new Date().toISOString(),
  };
}

function mapSeverity(native: NativeType): Severity {
  // Map provider-specific severity to: 'critical' | 'warning' | 'info' | 'unknown'
  return 'unknown';
}

function buildConditionSummary(native: NativeType): string {
  // Build a human-readable condition string from threshold/condition fields
  return '';
}

function extractNotificationTargets(native: NativeType): string[] {
  // Extract and deduplicate notification channels/targets
  return [];
}
```

---

## src/adapter.ts

```typescript
import type { ProviderAdapter, AlertDefinition } from '@alerthq/core';
import { <Id>ApiClient } from './client.js';
import { mapXxxToAlertDefinition } from './mapper.js';
import { <id>ConfigSchema } from './schema.js';

export class <Id>Adapter implements ProviderAdapter {
  readonly name = '<id>';

  private apiClient = new <Id>ApiClient();

  async initialize(config: Record<string, unknown>): Promise<void> {
    const validated = <id>ConfigSchema.parse(config);
    this.apiClient.init(validated);
  }

  async fetchAlerts(): Promise<AlertDefinition[]> {
    const natives = await this.apiClient.fetchAlerts();
    return natives.map(mapXxxToAlertDefinition);
  }

  async testConnection(): Promise<boolean> {
    return this.apiClient.testConnection();
  }

  async dispose(): Promise<void> {
    this.apiClient.dispose();
  }
}
```

---

## src/schema.ts

```typescript
import { z } from 'zod';

export const <id>ConfigSchema = z.object({
  // Mirror the fields from <Id>ProviderConfig in types.ts.
  // Example:
  // apiKey: z.string().min(1, '[<id>] apiKey is required'),
  // region: z.string().default('us-east-1'),
});
```

---

## tests/mapper.test.ts

```typescript
import { describe, it, expect } from 'vitest';
import { mapXxxToAlertDefinition } from '../src/mapper.js';

const fixture = {
  // Build a realistic fixture from the provider's API response shape
  id: 'test-alert-001',
  name: 'High CPU Usage',
  description: 'Triggers when CPU exceeds 90%',
  enabled: true,
};

describe('mapXxxToAlertDefinition', () => {
  it('maps name correctly', () => {
    const result = mapXxxToAlertDefinition(fixture);
    expect(result.name).toBe('High CPU Usage');
  });

  it('sets source to provider name', () => {
    const result = mapXxxToAlertDefinition(fixture);
    expect(result.source).toBe('<id>');
  });

  it('generates deterministic id', () => {
    const a = mapXxxToAlertDefinition(fixture);
    const b = mapXxxToAlertDefinition(fixture);
    expect(a.id).toBe(b.id);
  });

  it('produces a configHash for drift detection', () => {
    const result = mapXxxToAlertDefinition(fixture);
    expect(result.configHash).toBeTruthy();
  });
});
```

---

## tests/adapter.test.ts

```typescript
import { describe, it, expect } from 'vitest';
import { <Id>Adapter } from '../src/adapter.js';

describe('<Id>Adapter', () => {
  describe('initialize', () => {
    it('throws on empty config', async () => {
      const adapter = new <Id>Adapter();
      await expect(adapter.initialize({})).rejects.toThrow();
    });

    it('throws on missing required fields', async () => {
      const adapter = new <Id>Adapter();
      await expect(adapter.initialize({ unrelated: 'value' })).rejects.toThrow();
    });

    it('accepts valid config', async () => {
      const adapter = new <Id>Adapter();
      // Provide all required fields from the schema
      await expect(
        adapter.initialize({
          // apiKey: 'test-key',
          // region: 'us-east-1',
        }),
      ).resolves.not.toThrow();
    });
  });
});
```
