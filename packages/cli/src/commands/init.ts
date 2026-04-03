import type { Command } from 'commander';
import { createInterface } from 'node:readline/promises';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { getCommandDef } from '../utils/canonical.js';

const KNOWN_PROVIDERS: Record<string, { package: string; envVars: string[] }> = {
  'aws-cloudwatch': {
    package: '@alerthq/provider-aws-cloudwatch',
    envVars: ['AWS_REGION', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'],
  },
  datadog: {
    package: '@alerthq/provider-datadog',
    envVars: ['DD_API_KEY', 'DD_APP_KEY'],
  },
  pagerduty: {
    package: '@alerthq/provider-pagerduty',
    envVars: ['PAGERDUTY_API_KEY'],
  },
  grafana: {
    package: '@alerthq/provider-grafana',
    envVars: ['GRAFANA_URL', 'GRAFANA_API_KEY'],
  },
};

const STORAGE_OPTIONS: Record<string, { package: string; envVars: string[] }> = {
  sqlite: {
    package: '@alerthq/storage-sqlite',
    envVars: [],
  },
  postgresql: {
    package: '@alerthq/storage-postgresql',
    envVars: ['DATABASE_URL'],
  },
};

export function registerInit(program: Command): void {
  program
    .command('init')
    .description(getCommandDef('init').description)
    .action(async () => {
      const rl = createInterface({ input: process.stdin, output: process.stdout });

      try {
        console.log('Welcome to alerthq setup!\n');

        // Choose storage
        const storageKeys = Object.keys(STORAGE_OPTIONS);
        console.log('Available storage backends:');
        storageKeys.forEach((key, i) => console.log(`  ${i + 1}. ${key}`));
        const storageAnswer = await rl.question(`\nChoose storage [1-${storageKeys.length}] (default: 1): `);
        const storageIndex = parseInt(storageAnswer, 10) - 1;
        const storageKey = storageKeys[Number.isNaN(storageIndex) || storageIndex < 0 || storageIndex >= storageKeys.length ? 0 : storageIndex]!;
        const storageInfo = STORAGE_OPTIONS[storageKey]!;

        // Choose providers
        const providerKeys = Object.keys(KNOWN_PROVIDERS);
        console.log('\nAvailable alert providers:');
        providerKeys.forEach((key, i) => console.log(`  ${i + 1}. ${key}`));
        const providerAnswer = await rl.question('\nEnter provider numbers (comma-separated, e.g. 1,3): ');
        const selectedIndices = providerAnswer
          .split(',')
          .map((s) => parseInt(s.trim(), 10) - 1)
          .filter((i) => i >= 0 && i < providerKeys.length);

        const selectedProviders = selectedIndices.map((i) => providerKeys[i]!);

        if (selectedProviders.length === 0) {
          console.log('\nNo providers selected. You can add them later in alerthq.config.yml.');
        }

        // Build config YAML
        const lines: string[] = [];
        lines.push('storage:');
        lines.push(`  provider: ${storageKey}`);
        if (storageKey === 'sqlite') {
          lines.push('  sqlite:');
          lines.push('    path: ./alerthq.db');
        } else if (storageKey === 'postgresql') {
          lines.push('  postgresql:');
          lines.push('    url: ${DATABASE_URL}');
        }
        lines.push('');
        lines.push('providers:');
        for (const prov of selectedProviders) {
          lines.push(`  ${prov}:`);
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
        const packagesToInstall = [storageInfo.package];
        const allEnvVars = [...storageInfo.envVars];
        for (const prov of selectedProviders) {
          const info = KNOWN_PROVIDERS[prov]!;
          packagesToInstall.push(info.package);
          allEnvVars.push(...info.envVars);
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
