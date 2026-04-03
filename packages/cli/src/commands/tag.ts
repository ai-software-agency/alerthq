import type { Command } from 'commander';
import { setTag } from '@alerthq/core';
import { withContext } from '../utils/output.js';

export function registerTag(program: Command): void {
  program
    .command('tag <id> <keyvalue>')
    .description('Set an overlay tag on an alert (key=value)')
    .action(async (idOrPrefix: string, keyvalue: string) => {
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
