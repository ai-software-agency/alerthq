import type { Command } from 'commander';
import { sync } from '@alerthq/core';
import { withContext } from '../utils/output.js';
import { getCommandDef, applyCanonical } from '../utils/canonical.js';

export function registerSync(program: Command): void {
  const def = getCommandDef('sync');
  const cmd = program.command('sync');
  applyCanonical(cmd, def);

  cmd.action(async (opts: { provider?: string; name?: string; description?: string }) => {
    await withContext(async (ctx) => {
      const result = await sync(ctx, {
        provider: opts.provider,
        name: opts.name,
        description: opts.description,
      });

      if (result) {
        console.log(`Synced version ${result.version}: ${result.name}`);
        for (const [provider, status] of Object.entries(result.providerStatus)) {
          console.log(`  ${provider}: ${status}`);
        }
      } else {
        console.log('No changes detected');
      }
    });
  });
}
