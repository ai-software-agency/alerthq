# Contributing to alerthq

This guide is the single source of truth for coding standards, conventions, and contributor workflows in the alerthq monorepo. All tool-specific configs (CLAUDE.md, AGENTS.md, .cursor/) reference this file.

## Project Structure

- **Monorepo**: pnpm 9.15 + Turborepo, ESM TypeScript, Node >= 20
- **`packages/core`**: Domain types, interfaces, config/plugin loading, canonical data
- **`packages/cli`**: Commander-based CLI, commands pull from canonical
- **`packages/storage-*`**: Storage backends (sqlite, postgresql)
- **`packages/provider-*`**: Alert provider adapters (aws-cloudwatch, elastic, mongodb-atlas, azure-monitor, datadog, gcp-monitoring, grafana)

### Key Patterns

- Plugin resolution uses multi-strategy dynamic `import()` for pnpm strict mode
- All packages need `"default"` in their exports map for CJS resolution compatibility
- CLI commands use `getCommandDef()` + `applyCanonical()` from `utils/canonical.ts`
- `withContext()` wraps bootstrap/dispose lifecycle for all commands

## Canonical Data — Single Source of Truth

All outward-facing text (CLI help, README, npm descriptions, `--llm-help`) is driven from canonical data in `packages/core/src/canonical/`. **Never edit these surfaces directly.**

### Where to Make Changes

| Want to change… | Edit this file |
|-----------------|---------------|
| CLI command name, description, options, examples | `packages/core/src/canonical/cli.ts` |
| Project description, npm description, tagline | `packages/core/src/canonical/meta.ts` |
| Package list, provider list, storage backends | `packages/core/src/canonical/meta.ts` |
| Severities, export formats | `packages/core/src/canonical/meta.ts` |
| Help text formatting, --llm-help structure | `packages/core/src/canonical/generators.ts` |
| README content | Update canonical data first, then regenerate `README.md` to match |
| CLI package.json description | Must match `META.npmDescription` in `meta.ts` |

### What NOT to Edit Directly

- `README.md` — regenerate from canonical data after updating `meta.ts` / `cli.ts`
- CLI command `.description()` strings — these come from `getCommandDef()` in canonical
- CLI command `.option()` definitions — these come from `applyCanonical()` in canonical
- `packages/cli/package.json` `"description"` — must match `META.npmDescription`

### Drift Tests

`packages/core/tests/canonical-drift.test.ts` will fail if any surface goes out of sync:
- README must reference all command names and package names
- --help must include all command descriptions
- --llm-help must include all commands, providers, and storage backends
- CLI package.json description must match canonical

Run `pnpm test` to catch drift before committing.

### Adding a New CLI Command

1. Add the command definition to `CLI_COMMANDS` in `packages/core/src/canonical/cli.ts`
2. Create the command file in `packages/cli/src/commands/`
3. Use `getCommandDef()` and `applyCanonical()` from `utils/canonical.ts` for description/options
4. Register it in `packages/cli/src/index.ts`
5. Add the command to the README commands table
6. Run `pnpm test` to verify drift tests pass

## TypeScript Standards

### ESM

- All packages use `"type": "module"` — no CommonJS.
- Relative imports **must** use `.js` extensions (`'./mapper.js'`, not `'./mapper'`).
- `verbatimModuleSyntax` is enabled; use `import type` for type-only imports.

```typescript
// correct
import type { AlertDefinition, Severity } from '@alerthq/core';
import { generateAlertId, hashConfig } from '@alerthq/core';
import { CloudWatchApiClient } from './client.js';

// wrong — missing .js, missing `type` keyword
import { AlertDefinition } from '@alerthq/core';
import { CloudWatchApiClient } from './client';
```

### Naming

| Kind | Convention | Example |
|------|-----------|---------|
| Files | kebab-case | `plugin-loader.ts`, `config-schema.ts` |
| Interfaces / Types | PascalCase | `ProviderAdapter`, `AlertDefinition` |
| Classes | PascalCase | `CloudWatchAdapter`, `SqliteStorageProvider` |
| Functions | camelCase | `fetchAlerts`, `mapAlarmToAlertDefinition` |
| Constants | UPPER_SNAKE | `DEFAULT_PAGE_SIZE`, `PROVIDER_NAME` |

### Error Handling

- Throw `Error` with descriptive messages; prefix with `[module-id]` in plugins.
- Never swallow errors silently — always log or rethrow.
- Use `withRetry` from `@alerthq/core` for retriable I/O (API calls, SDK requests).
- Use `try/finally` to ensure cleanup (`dispose`, connection close).

```typescript
// correct
throw new Error('[mongodb-atlas] config.publicKey is required and must be a string');

// wrong — silent catch
try { await fetchData(); } catch {}
```

### Async

- Use `async`/`await` for all I/O.
- Interface methods return `Promise<T>`.
- Sequential loops where order matters; `withRetry` for retried async work.

### Logging

- Use `logger` from `@alerthq/core` (`debug`, `info`, `warn`, `error`).
- Never use `console.*` directly.
- Prefix log messages with `[provider-id]` or `[module-id]`.

### Exports

- Barrel exports through `index.ts`.
- Plugin packages: default export is a factory function (`ProviderFactory` or `StorageFactory`).
- `package.json` exports must include the `"default"` key for CJS resolution compatibility.

```json
"exports": {
  ".": {
    "types": "./dist/index.d.ts",
    "import": "./dist/index.js",
    "default": "./dist/index.js"
  }
}
```

### Formatting (Prettier)

Single quotes, trailing commas `all`, semicolons, `printWidth` 100, `tabWidth` 2.

## Testing Standards

### Framework

- **Vitest** with `globals: false` — always import `describe`, `it`, `expect` explicitly.
- Each package has its own `vitest.config.ts` with `environment: 'node'`.

### File Structure

- Tests live in `tests/` at the package root.
- Test file naming: `<module>.test.ts` (e.g. `mapper.test.ts`, `config-loader.test.ts`).
- Imports from source use `.js` extensions: `import { mapAlarm } from '../src/mapper.js'`.

### What to Test

- **Mapper functions are the priority** for providers — they are pure functions, easy to test with fixture data.
- Config validation (`validateConfig`) edge cases — missing fields, wrong types.
- Utility functions from core (`generateAlertId`, `hashConfig`, `withRetry`).

### What NOT to Do

- Do not mock cloud SDKs in unit tests — that belongs in integration tests.
- Do not test trivial getters/setters.
- Do not use `any` to bypass type checking in test fixtures; build properly typed objects.

### Fixture Pattern

```typescript
import { describe, it, expect } from 'vitest';
import { mapAlarmToAlertDefinition } from '../src/mapper.js';

const fixture = {
  alarm: { AlarmArn: 'arn:aws:...', AlarmName: 'high-cpu', /* ... */ },
  tags: { severity: 'critical', owner: 'platform-team' },
};

describe('mapAlarmToAlertDefinition', () => {
  it('maps name from AlarmName', () => {
    const result = mapAlarmToAlertDefinition(fixture);
    expect(result.name).toBe('high-cpu');
  });
});
```

## Post-Edit Verification

After editing any `.ts` file, run through this checklist before moving on.

1. **Lint** — run lints on every file you edited and fix any errors you introduced.
2. **Relative imports** — every relative import must end in `.js` (`'./mapper.js'`, not `'./mapper'`).
3. **Type-only imports** — symbols used only as types must use `import type { ... }`.
4. **No console** — never use `console.log/warn/error/debug`. Use `logger` from `@alerthq/core`.
5. **Error prefixes** — in plugin packages, error messages must start with `[provider-id]` or `[module-id]`.
6. **File naming** — new files must be kebab-case (e.g. `config-loader.ts`, not `configLoader.ts`).

### Canonical Guard

If the file being edited is any of these, **STOP and redirect**:

- `README.md` — edit `packages/core/src/canonical/meta.ts` instead
- CLI `.description()` or `.option()` strings — edit `packages/core/src/canonical/cli.ts` instead
- `packages/cli/package.json` `"description"` — must match `META.npmDescription`

## Development

```bash
pnpm install
pnpm build
pnpm test
pnpm lint
```

## Workflows

Detailed multi-step contributor workflows live in `docs/workflows/`:

- **[Add a provider](docs/workflows/add-provider/workflow.md)** — Research, scaffold, implement, document, and register a new alert provider package
- **[Review standards](docs/workflows/review-standards/workflow.md)** — Systematic code review against all standards in this file
