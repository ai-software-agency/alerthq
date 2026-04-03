import type { Command } from 'commander';
import { formatTable } from '@alerthq/core';
import { withContext, VERSION_COLUMNS } from '../utils/output.js';

export function registerVersions(program: Command): void {
  program
    .command('versions')
    .description('List sync history')
    .option('--limit <n>', 'Maximum number of versions to show', '20')
    .action(async (opts: { limit: string }) => {
      await withContext(async (ctx) => {
        const limit = parseInt(opts.limit, 10);
        const runs = await ctx.storage.listSyncRuns(limit);

        // For each run, query the alert count
        const rows = await Promise.all(
          runs.map(async (run) => {
            const alerts = await ctx.storage.getAlertDefinitions(run.version);
            return {
              version: String(run.version),
              name: run.name,
              description: run.description || '-',
              createdAt: run.createdAt,
              alertCount: String(alerts.length),
            };
          }),
        );

        console.log(formatTable(rows, [...VERSION_COLUMNS]));
      });
    });
}
