import type { Command } from 'commander';
import { sync } from '@alerthq/core';
import { withContext } from '../utils/output.js';

export function registerSync(program: Command): void {
  program
    .command('sync')
    .description('Sync alert definitions from providers')
    .option('--provider <name>', 'Sync only a specific provider')
    .option('--name <name>', 'Name for this sync run')
    .option('--description <text>', 'Description for this sync run')
    .action(async (opts: { provider?: string; name?: string; description?: string }) => {
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
