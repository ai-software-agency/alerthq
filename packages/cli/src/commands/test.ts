import type { Command } from 'commander';
import { testConnections, formatTable, setLogger } from '@alerthq/core';
import { withContext, CONNECTION_TEST_COLUMNS } from '../utils/output.js';
import { getCommandDef, applyCanonical } from '../utils/canonical.js';

export function registerTest(program: Command): void {
  const def = getCommandDef('test');
  const cmd = program.command('test');
  applyCanonical(cmd, def);

  cmd.action(async (opts: { provider?: string; verbose?: boolean }) => {
    if (opts.verbose) {
      process.env['ALERTHQ_LOG_LEVEL'] = 'debug';
      setLogger();
    }

    await withContext(async (ctx) => {
      const results = await testConnections(ctx, opts.provider);

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
