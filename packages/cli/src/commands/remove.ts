import type { Command } from 'commander';
import { removeManualAlert } from '@alerthq/core';
import { withContext } from '../utils/output.js';
import { getCommandDef } from '../utils/canonical.js';

export function registerRemove(program: Command): void {
  program
    .command('remove <id>')
    .description(getCommandDef('remove').description)
    .action(async (idOrPrefix: string) => {
      await withContext(async (ctx) => {
        const removed = await removeManualAlert(ctx, idOrPrefix);
        if (removed) {
          console.log(`Removed alert ${idOrPrefix}`);
        }
      });
    });
}
