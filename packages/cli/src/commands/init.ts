import type { Command } from 'commander';
import { createInterface } from 'node:readline/promises';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { META } from '@alerthq/core';
import { getCommandDef } from '../utils/canonical.js';

const PROVIDER_ENV_HINTS: Record<string, string[]> = {
  'aws-cloudwatch': ['AWS_REGION', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'],
  'elastic': ['ALERTHQ_ELASTIC_USERNAME', 'ALERTHQ_ELASTIC_PASSWORD'],
  'mongodb-atlas': ['ALERTHQ_ATLAS_PUBLIC_KEY', 'ALERTHQ_ATLAS_PRIVATE_KEY'],
  'azure-monitor': [],
};

const STORAGE_ENV_HINTS: Record<string, string[]> = {
  sqlite: [],
  postgresql: ['DATABASE_URL'],
};

export function registerInit(program: Command): void {
  program
    .command('init')
    .description(getCommandDef('init').description)
    .action(async () => {
      const rl = createInterface({ input: process.stdin, output: process.stdout });

      try {
        console.log('Welcome to alerthq setup!\n');

        // Choose storage (from canonical META)
        const storageBackends = META.storageBackends;
        console.log('Available storage backends:');
        storageBackends.forEach((s, i) => console.log(`  ${i + 1}. ${s.name}`));
        const storageAnswer = await rl.question(`\nChoose storage [1-${storageBackends.length}] (default: 1): `);
        const storageIndex = parseInt(storageAnswer, 10) - 1;
        const storagePick = storageBackends[Number.isNaN(storageIndex) || storageIndex < 0 || storageIndex >= storageBackends.length ? 0 : storageIndex]!;

        // Choose providers (from canonical META)
        const providers = META.providers;
        console.log('\nAvailable alert providers:');
        providers.forEach((p, i) => console.log(`  ${i + 1}. ${p.name}`));
        const providerAnswer = await rl.question('\nEnter provider numbers (comma-separated, e.g. 1,3): ');
        const selectedIndices = providerAnswer
          .split(',')
          .map((s) => parseInt(s.trim(), 10) - 1)
          .filter((i) => i >= 0 && i < providers.length);

        const selectedProviders = selectedIndices.map((i) => providers[i]!);

        if (selectedProviders.length === 0) {
          console.log('\nNo providers selected. You can add them later in alerthq.config.yml.');
        }

        // Build config YAML
        const lines: string[] = [];
        lines.push('storage:');
        lines.push(`  provider: ${storagePick.name}`);
        if (storagePick.name === 'sqlite') {
          lines.push('  sqlite:');
          lines.push('    path: ./alerthq.db');
        } else if (storagePick.name === 'postgresql') {
          lines.push('  postgresql:');
          lines.push('    connectionString: ${DATABASE_URL}');
        }
        lines.push('');
        lines.push('providers:');
        for (const prov of selectedProviders) {
          lines.push(`  ${prov.name}:`);
          lines.push('    enabled: true');
        }
        if (selectedProviders.length === 0) {
          lines.push('  # Add providers here, e.g.:');
          lines.push('  # aws-cloudwatch:');
          lines.push('  #   enabled: true');
        }

        const configContent = lines.join('\n') + '\n';
        const configPath = resolve(process.cwd(), 'alerthq.config.yml');
        await writeFile(configPath, configContent, 'utf-8');
        console.log(`\nWrote ${configPath}`);

        // Print install instructions
        const packagesToInstall = [storagePick.package];
        const allEnvVars = [...(STORAGE_ENV_HINTS[storagePick.name] ?? [])];
        for (const prov of selectedProviders) {
          packagesToInstall.push(prov.package);
          allEnvVars.push(...(PROVIDER_ENV_HINTS[prov.name] ?? []));
        }

        console.log('\nInstall required packages:');
        console.log(`  pnpm add ${packagesToInstall.join(' ')}`);

        if (allEnvVars.length > 0) {
          console.log('\nSet the following environment variables (or add to .env):');
          for (const v of allEnvVars) {
            console.log(`  ${v}=...`);
          }
        }

        console.log('\nDone! Run `alerthq test` to verify your connections.');
      } finally {
        rl.close();
      }
    });
}
