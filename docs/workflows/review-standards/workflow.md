# Review Standards

Systematically verify all recently edited files against the project's coding standards in [CONTRIBUTING.md](../../../CONTRIBUTING.md). Use tools (Grep, Read, linters) to actually check — do not self-report from memory.

## Step 1: Identify Changed Files

Determine which files were edited in this session. If unclear, ask the user or run `git diff --name-only` to find recently modified files.

## Step 2: ESM Compliance

For each edited `.ts` file:

- **Grep** for relative imports missing `.js` extensions:
  ```
  Pattern: from '\./[^']*(?<!\.js)'
  ```
- **Grep** for type-only symbols imported without `import type`:
  - Read the file, identify imports used only in type positions
- Report any violations with file path and line number.

## Step 3: Naming Audit

- **File names** — verify all new/renamed files are kebab-case (`plugin-loader.ts`, not `pluginLoader.ts`)
- **Read** each edited file and check:
  - Interfaces/types are PascalCase
  - Classes are PascalCase
  - Functions are camelCase
  - Module-level constants are UPPER_SNAKE_CASE

## Step 4: Error Handling

For each edited `.ts` file:

- **Grep** for empty catch blocks: `catch\s*(\{|\()` followed by `}`
- **Grep** for `throw new Error(` in plugin packages — verify message starts with `[provider-id]` or `[module-id]`
- **Grep** for API/SDK calls not wrapped in `withRetry` (check `client.ts` files especially)

## Step 5: Logging

For each edited `.ts` file:

- **Grep** for `console\.` — any match is a violation (must use `logger` from `@alerthq/core`)
- If `logger` is used, verify it's imported from `@alerthq/core`
- Verify log messages in plugins are prefixed with `[provider-id]`

## Step 6: Exports

For each edited package:

- **Read** `src/index.ts` — verify barrel export pattern, default export is a factory function
- **Read** `package.json` — verify `exports["."]` includes `"default"` key
- Verify `"type": "module"` is set
- For provider packages (`packages/provider-*`): verify `configSchema` is exported from `src/index.ts` (re-exported from `schema.ts`) — the plugin loader requires this for fail-fast config validation

## Step 7: Testing

For each edited source file:

- Check if a corresponding test exists in `tests/<module>.test.ts`
- For provider packages: verify both `tests/mapper.test.ts` and `tests/adapter.test.ts` exist
  - `adapter.test.ts` must test `initialize()` validation (empty config, missing fields, valid config)
- If test exists, verify:
  - Explicit imports from vitest (`import { describe, it, expect } from 'vitest'`)
  - Source imports use `.js` extensions
  - No `any` type assertions in fixtures
  - No SDK mocking (only in integration tests)

## Step 8: Canonical Data

- If `README.md` was edited directly, flag as violation — must come from canonical data
- If CLI `.description()` or `.option()` strings were edited directly, flag as violation
- If `packages/cli/package.json` `"description"` was changed, verify it matches `META.npmDescription`

## Step 9: Formatting

- **Run lints** on all edited files
- Report any lint errors or warnings introduced

## Output Format

Present findings as a checklist:

```
Standards Review:
- [PASS] ESM compliance — all imports correct
- [FAIL] Logging — console.log found in src/client.ts:42
- [PASS] Naming — all conventions followed
- [PASS] Error handling — no violations
...
```

For each FAIL, include the file path, line number, and what needs to change.
