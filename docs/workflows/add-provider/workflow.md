# Add Provider Package

## Overview

Each provider package lives at `packages/provider-<id>/` and follows a strict structure. This workflow walks through the full lifecycle: research, scaffold, implement, document, register, and verify.

Coding standards referenced throughout are in [CONTRIBUTING.md](../../../CONTRIBUTING.md).

## Phase 0: Research

**Do this first — before writing any code.**

Read [research.md](research.md) for the full checklist. Use web search to find:

1. **Official SDK** — Is there an npm package? (e.g. `@aws-sdk/client-cloudwatch`, `@elastic/elasticsearch`)
2. **Authentication** — What auth models are supported? (API keys, OAuth, IAM, digest, tokens)
3. **API endpoints** — Which endpoints return alert *definitions* (not firings/events)?
4. **Alert type taxonomy** — What kinds of alerts exist? (metric, log, anomaly, uptime, etc.)
5. **Response shapes** — What fields come back? What maps to `AlertDefinition`?
6. **Pagination** — Cursor, offset, page number, async iterator?
7. **Rate limits** — Do we need custom `withRetry` tuning?
8. **Required permissions** — Minimum read-only scopes/roles needed?

Document findings before proceeding. This research directly feeds into `types.ts`, `client.ts`, and the README.

## Phase 1: Scaffold

Create the package directory and files from templates in [templates.md](templates.md):

```
packages/provider-<id>/
  package.json
  tsconfig.json
  vitest.config.ts
  README.md
  src/
    index.ts
    adapter.ts
    client.ts
    mapper.ts
    schema.ts
    types.ts
  tests/
    adapter.test.ts
    mapper.test.ts
```

Replace all `<id>`, `<Id>`, `<ID>`, and `<sdk-package>` placeholders.

## Phase 2: Implement

Build out each source file in this order:

### 2a. `src/types.ts`

- Provider config interface (fields the user sets in `alerthq.yaml`)
- API response DTOs / intermediate types (from research)
- Helper type conversions if needed

### 2b. `src/schema.ts`

- Zod schema mirroring the provider config interface from `types.ts`
- Export as a named constant (e.g. `export const datadogConfigSchema = z.object({...})`)
- Use descriptive error messages prefixed with `[<id>]`
- The plugin loader validates config against this schema at load time (fail-fast)
- This is the single source of truth for config validation

### 2c. `src/client.ts`

- SDK initialization or HTTP client setup
- Methods for each API call (one per alert type)
- Internal pagination — callers get all results
- Use `withRetry` from `@alerthq/core` for every API call
- Use `logger` from `@alerthq/core` for debug/info logging

### 2d. `src/mapper.ts`

- One mapping function per alert type: `mapXxxToAlertDefinition(native) => AlertDefinition`
- Use `generateAlertId(providerName, sourceId)` for deterministic IDs
- Use `hashConfig(rawConfig)` for drift detection hashes
- Build a human-readable `conditionSummary`
- Map severity with fallback to `'unknown'`
- Set `source` to the provider's kebab-case name

### 2e. `src/adapter.ts`

- Class implementing `ProviderAdapter` from `@alerthq/core`
- `readonly name = '<id>'` matching the canonical provider name
- `initialize()` — validate config via `configSchema.parse(config)` from `schema.ts`, then instantiate client
- `fetchAlerts()` — call client, map results, return `AlertDefinition[]`
- `testConnection()` — lightweight connectivity check, return boolean
- `dispose()` — cleanup (close connections, release SDK clients)

### 2f. `src/index.ts`

- Default export: `ProviderFactory` function returning a new adapter instance
- Named re-exports: adapter class, client class, mapper functions, types
- Export `configSchema` from `schema.ts` (re-exported as `configSchema`) — the plugin loader uses this for fail-fast validation

## Phase 3: README

Generate a standardized README using the template in [readme-template.md](readme-template.md). Fill in:

- Supported alert types table (from research)
- Authentication section (from research)
- Configuration YAML example + field table (from `types.ts`)
- Required permissions (from research)
- Field mapping table: how each `AlertDefinition` field is sourced
- Limitations (unsupported alert types, known API gaps)

## Phase 4: Register in Canonical

1. Add to `META.providers` in `packages/core/src/canonical/meta.ts`:
   ```typescript
   { name: '<id>', package: '@alerthq/provider-<id>', description: '<Description> alert provider' },
   ```

2. Add to `META.packages` in the same file:
   ```typescript
   { name: '@alerthq/provider-<id>', description: '<Description> alert provider' },
   ```

3. Add as optional peer dependency in `packages/cli/package.json`:
   ```json
   // peerDependencies
   "@alerthq/provider-<id>": "workspace:*"
   ```

4. Mark as optional in `peerDependenciesMeta` in `packages/cli/package.json`:
   ```json
   "@alerthq/provider-<id>": { "optional": true }
   ```

5. Add as devDependency in `packages/cli/package.json` (for build/test resolution):
   ```json
   "@alerthq/provider-<id>": "workspace:*"
   ```

6. Add to the `linked` array in `.changeset/config.json` so version bumps are coordinated.

## Phase 5: Verify

Run these commands and ensure they all pass:

```bash
pnpm install
pnpm build
pnpm typecheck     # full type checking across all packages
pnpm test          # drift tests must pass
pnpm lint
```

If drift tests fail, it means the README or CLI help is out of sync with canonical data. Update accordingly.

## Additional Resources

- [research.md](research.md) — Detailed research checklist
- [templates.md](templates.md) — Boilerplate code for every file
- [readme-template.md](readme-template.md) — Standardized README template
