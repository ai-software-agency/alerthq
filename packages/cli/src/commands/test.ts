import type { Command } from 'commander';
import { testConnections, formatTable } from '@alerthq/core';
import { withContext, CONNECTION_TEST_COLUMNS } from '../utils/output.js';

export function registerTest(program: Command): void {
  program
    .command('test')
    .description('Test connections to storage and all providers')
    .action(async () => {
      await withContext(async (ctx) => {
        const results = await testConnections(ctx);

        const rows = results.map((r) => ({
          name: r.name,
          status: r.ok ? 'PASS' : 'FAIL',
          error: r.error ?? '',
        }));

        console.log(formatTable(rows, [...CONNECTION_TEST_COLUMNS]));

        const failed = results.filter((r) => !r.ok);
        if (failed.length > 0) {
          process.exitCode = 1;
        }
      });
    });
}
