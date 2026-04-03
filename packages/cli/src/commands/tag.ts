import type { Command } from 'commander';
import { setTag, removeTag } from '@alerthq/core';
import { withContext } from '../utils/output.js';
import { getCommandDef } from '../utils/canonical.js';

export function registerTag(program: Command): void {
  program
    .command('tag <id> <keyvalue>')
    .description(getCommandDef('tag').description)
    .option('--remove', 'Remove the tag instead of setting it')
    .action(async (idOrPrefix: string, keyvalue: string, opts: { remove?: boolean }) => {
      if (opts.remove) {
        await withContext(async (ctx) => {
          await removeTag(ctx, idOrPrefix, keyvalue);
          console.log(`Removed tag '${keyvalue}' from alert ${idOrPrefix}`);
        });
        return;
      }

      const eqIndex = keyvalue.indexOf('=');
      if (eqIndex <= 0) {
        throw new Error(`Invalid tag format '${keyvalue}'. Expected key=value.`);
      }

      const key = keyvalue.slice(0, eqIndex);
      const value = keyvalue.slice(eqIndex + 1);

      await withContext(async (ctx) => {
        await setTag(ctx, idOrPrefix, key, value);
        console.log(`Set tag ${key}=${value} on alert ${idOrPrefix}`);
      });
    });
}
