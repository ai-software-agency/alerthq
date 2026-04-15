import type { Command } from 'commander';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseDocument } from 'yaml';
import { META } from '@alerthq/core';
import { getCommandDef } from '../utils/canonical.js';

const CONFIG_FILENAME = 'alerthq.config.yml';

export function registerDisable(program: Command): void {
  program
    .command('disable <provider>')
    .description(getCommandDef('disable').description)
    .action(async (providerName: string) => {
      const known = META.providers.map((p) => p.name);
      if (!known.includes(providerName)) {
        throw new Error(
          `Unknown provider '${providerName}'. Known providers: ${known.join(', ')}`,
        );
      }

      const configPath = resolve(process.cwd(), CONFIG_FILENAME);

      let raw: string;
      try {
        raw = await readFile(configPath, 'utf-8');
      } catch {
        throw new Error(
          `Config file not found at ${configPath}. Run \`alerthq init\` first.`,
        );
      }

      const doc = parseDocument(raw);
      const existing = doc.getIn(['providers', providerName]);

      if (existing === undefined) {
        throw new Error(
          `Provider '${providerName}' is not configured. Run \`alerthq enable ${providerName}\` first.`,
        );
      }

      const enabled = doc.getIn(['providers', providerName, 'enabled']);
      if (enabled === false) {
        console.log(`Provider '${providerName}' is already disabled.`);
        return;
      }

      doc.setIn(['providers', providerName, 'enabled'], false);
      await writeFile(configPath, doc.toString(), 'utf-8');
      console.log(`Disabled provider '${providerName}' in ${CONFIG_FILENAME}`);
    });
}
