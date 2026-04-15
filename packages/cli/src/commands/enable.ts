import type { Command } from 'commander';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseDocument } from 'yaml';
import { META } from '@alerthq/core';
import { getCommandDef } from '../utils/canonical.js';

const CONFIG_FILENAME = 'alerthq.config.yml';

export function registerEnable(program: Command): void {
  program
    .command('enable <provider>')
    .description(getCommandDef('enable').description)
    .action(async (providerName: string) => {
      const providerMeta = META.providers.find((p) => p.name === providerName);
      if (!providerMeta) {
        const known = META.providers.map((p) => p.name).join(', ');
        throw new Error(
          `Unknown provider '${providerName}'. Known providers: ${known}`,
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

      if (existing !== undefined) {
        const enabled = doc.getIn(['providers', providerName, 'enabled']);
        if (enabled !== false) {
          console.log(`Provider '${providerName}' is already enabled.`);
          return;
        }
        doc.setIn(['providers', providerName, 'enabled'], true);
      } else {
        doc.setIn(['providers', providerName], { enabled: true });
      }

      await writeFile(configPath, doc.toString(), 'utf-8');
      console.log(`Enabled provider '${providerName}' in ${CONFIG_FILENAME}`);

      console.log(`\nInstall the package:\n  pnpm add ${providerMeta.package}`);

      const required = providerMeta.configFields.filter((f) => f.required);
      const optional = providerMeta.configFields.filter((f) => !f.required);

      if (required.length > 0) {
        const maxLen = Math.max(...required.map((f) => f.name.length));
        console.log('\nRequired config fields:');
        for (const f of required) {
          console.log(`  ${f.name.padEnd(maxLen + 2)}${f.description}`);
        }
      }

      if (optional.length > 0) {
        const maxLen = Math.max(...optional.map((f) => f.name.length));
        console.log('\nOptional config fields:');
        for (const f of optional) {
          console.log(`  ${f.name.padEnd(maxLen + 2)}${f.description}`);
        }
      }

      if (required.length > 0) {
        console.log(
          `\nAdd these fields under providers.${providerName} in ${CONFIG_FILENAME},` +
            '\nthen run: alerthq test',
        );
      } else {
        console.log('\nRun `alerthq test` to verify the connection.');
      }
    });
}
