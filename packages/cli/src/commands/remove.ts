import type { Command } from 'commander';
import { removeManualAlert } from '@alerthq/core';
import { withContext } from '../utils/output.js';

export function registerRemove(program: Command): void {
  program
    .command('remove <id>')
    .description('Remove a manual alert definition')
    .action(async (idOrPrefix: string) => {
      await withContext(async (ctx) => {
        const removed = await removeManualAlert(ctx, idOrPrefix);
        if (removed) {
          console.log(`Removed alert ${idOrPrefix}`);
        }
      });
    });
}
