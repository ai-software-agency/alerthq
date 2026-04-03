# Contributing to alerthq

## Documentation: Single Source of Truth

All outward-facing text — CLI `--help`, README, npm descriptions, `--llm-help` — is driven from **canonical data** in `packages/core/src/canonical/`.

**Never edit these surfaces directly.** Update the canonical source, then regenerate.

### Canonical files

| File | Contains |
|------|----------|
| `packages/core/src/canonical/meta.ts` | Project name, descriptions, packages, providers, severities |
| `packages/core/src/canonical/cli.ts` | All CLI command definitions (name, usage, description, options, examples) |
| `packages/core/src/canonical/generators.ts` | `generateHelpText()` and `generateLlmHelp()` functions |

### Workflow for documentation changes

1. Edit the canonical file (`meta.ts` or `cli.ts`)
2. Update `README.md` to reflect the change
3. If you changed `META.npmDescription`, update `packages/cli/package.json` `"description"` to match
4. Run `pnpm test` — drift tests will catch anything out of sync

### Adding a new CLI command

1. Add the command definition to `CLI_COMMANDS` in `packages/core/src/canonical/cli.ts`
2. Create the command file in `packages/cli/src/commands/`
3. Use `getCommandDef()` and `applyCanonical()` from `utils/canonical.ts` for description/options
4. Register it in `packages/cli/src/index.ts`
5. Add the command to the README commands table
6. Run `pnpm test` to verify drift tests pass

## Development

```bash
pnpm install
pnpm build
pnpm test
pnpm lint
```

## Code Style

- ESM TypeScript (`"type": "module"`)
- All packages built with tsup
- Tests with vitest
- Lint with eslint + prettier
