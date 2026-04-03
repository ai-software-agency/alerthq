# Claude Code Instructions for alerthq

## Documentation: Single Source of Truth

All outward-facing text (CLI help, README, npm descriptions, --llm-help) is driven from canonical data in `packages/core/src/canonical/`. **Never edit these surfaces directly.**

### Where to make changes

| Want to change… | Edit this file |
|-----------------|---------------|
| CLI command name, description, options, examples | `packages/core/src/canonical/cli.ts` |
| Project description, npm description, tagline | `packages/core/src/canonical/meta.ts` |
| Package list, provider list, storage backends | `packages/core/src/canonical/meta.ts` |
| Severities, export formats | `packages/core/src/canonical/meta.ts` |
| Help text formatting, --llm-help structure | `packages/core/src/canonical/generators.ts` |
| README content | Update canonical data first, then regenerate `README.md` to match |
| CLI package.json description | Must match `META.npmDescription` in `meta.ts` |

### What NOT to edit directly

- `README.md` — regenerate from canonical data after updating `meta.ts` / `cli.ts`
- CLI command `.description()` strings — these come from `getCommandDef()` in canonical
- CLI command `.option()` definitions — these come from `applyCanonical()` in canonical
- `packages/cli/package.json` `"description"` — must match `META.npmDescription`

### Drift tests enforce this

`packages/core/tests/canonical-drift.test.ts` will fail if any surface goes out of sync:
- README must reference all command names and package names
- --help must include all command descriptions
- --llm-help must include all commands, providers, and storage backends
- CLI package.json description must match canonical

Run `pnpm test` to catch drift before committing.

## Project Structure

- **Monorepo**: pnpm 9.15 + Turborepo, ESM TypeScript, Node >= 20
- **`packages/core`**: Domain types, interfaces, config/plugin loading, canonical data
- **`packages/cli`**: Commander-based CLI, commands pull from canonical
- **`packages/storage-*`**: Storage backends (sqlite, postgresql)
- **`packages/provider-*`**: Alert provider adapters (aws-cloudwatch, elastic, mongodb-atlas, azure-monitor)

## Key Patterns

- Plugin resolution uses multi-strategy dynamic `import()` for pnpm strict mode
- All packages need `"default"` in their exports map for CJS resolution compatibility
- CLI commands use `getCommandDef()` + `applyCanonical()` from `utils/canonical.ts`
- `withContext()` wraps bootstrap/dispose lifecycle for all commands
