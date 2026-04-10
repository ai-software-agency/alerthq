import type { Command } from 'commander';
import { getChanges, formatTable, formatJson } from '@alerthq/core';
import { withContext, DIFF_COLUMNS } from '../utils/output.js';
import { getCommandDef, applyCanonical } from '../utils/canonical.js';

export function registerDiff(program: Command): void {
  const def = getCommandDef('diff');
  const cmd = program.command('diff');
  applyCanonical(cmd, def);

  cmd.action(async (opts: { from?: string; to?: string; format: string }) => {
    await withContext(async (ctx) => {
      const runs = await ctx.storage.listSyncRuns(2);

      let fromVersion: number;
      let toVersion: number;

      if (opts.to !== undefined) {
        toVersion = parseInt(opts.to, 10);
      } else if (runs.length >= 1) {
        toVersion = runs[0]!.version;
      } else {
        throw new Error('No sync versions found. Run `alerthq sync` first.');
      }

      if (opts.from !== undefined) {
        fromVersion = parseInt(opts.from, 10);
      } else if (runs.length >= 2) {
        fromVersion = runs[1]!.version;
      } else {
        throw new Error('Only one version exists. Provide --from explicitly or run another sync.');
      }

      const changes = await getChanges(ctx, fromVersion, toVersion);

      if (opts.format === 'json') {
        console.log(formatJson(changes));
        return;
      }

      const rows: Record<string, string>[] = [];

      for (const a of changes.added) {
        rows.push({
          change: 'added',
          id: a.id,
          name: a.name,
          source: a.source,
          severity: a.severity,
        });
      }
      for (const r of changes.removed) {
        rows.push({
          change: 'removed',
          id: r.id,
          name: r.name,
          source: r.source,
          severity: r.severity,
        });
      }
      for (const m of changes.modified) {
        rows.push({
          change: 'modified',
          id: m.after.id,
          name: m.after.name,
          source: m.after.source,
          severity: m.after.severity,
        });
      }

      console.log(`Diff: version ${fromVersion} -> ${toVersion}`);
      console.log(
        `  Added: ${changes.added.length}  Removed: ${changes.removed.length}  Modified: ${changes.modified.length}\n`,
      );

      if (rows.length === 0) {
        console.log('No changes');
      } else {
        console.log(formatTable(rows, [...DIFF_COLUMNS]));
      }
    });
  });
}
