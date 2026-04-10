import type { Command } from 'commander';
import { createInterface } from 'node:readline/promises';
import { readFile, writeFile, appendFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import dotenv from 'dotenv';
import { META } from '@alerthq/core';
import { getCommandDef } from '../utils/canonical.js';

/**
 * Maps each provider's config field (from META.providers[].configFields)
 * to the environment variable name that holds its value.
 */
const PROVIDER_FIELD_ENV: Record<string, Record<string, string>> = {
  'aws-cloudwatch': {
    regions: 'AWS_REGION',
    'credentials.accessKeyId': 'AWS_ACCESS_KEY_ID',
    'credentials.secretAccessKey': 'AWS_SECRET_ACCESS_KEY',
    'credentials.sessionToken': 'AWS_SESSION_TOKEN',
  },
  elastic: {
    url: 'ELASTIC_URL',
    kibanaUrl: 'ELASTIC_KIBANA_URL',
    'auth.username': 'ELASTIC_USERNAME',
    'auth.password': 'ELASTIC_PASSWORD',
    'auth.apiKey': 'ELASTIC_API_KEY',
  },
  'mongodb-atlas': {
    publicKey: 'ATLAS_PUBLIC_KEY',
    privateKey: 'ATLAS_PRIVATE_KEY',
    projectIds: 'ATLAS_PROJECT_ID',
  },
  'azure-monitor': {
    subscriptionIds: 'AZURE_SUBSCRIPTION_ID',
  },
  datadog: {
    apiKey: 'DD_API_KEY',
    appKey: 'DD_APP_KEY',
    site: 'DD_SITE',
  },
  'gcp-monitoring': {
    projectId: 'GCP_PROJECT_ID',
    keyFilename: 'GCP_KEY_FILENAME',
    'credentials.client_email': 'GCP_CLIENT_EMAIL',
    'credentials.private_key': 'GCP_PRIVATE_KEY',
  },
  grafana: {
    url: 'GRAFANA_URL',
    apiKey: 'GRAFANA_API_KEY',
    'basicAuth.username': 'GRAFANA_USERNAME',
    'basicAuth.password': 'GRAFANA_PASSWORD',
  },
};

const SENSITIVE_FIELDS = new Set([
  'credentials.accessKeyId',
  'credentials.secretAccessKey',
  'credentials.sessionToken',
  'credentials.private_key',
  'auth.password',
  'auth.apiKey',
  'privateKey',
  'apiKey',
  'appKey',
  'basicAuth.password',
]);

type AuthChoice = 'apiKey' | 'basic' | 'none';

function maskValue(value: string): string {
  if (value.length <= 8) return '****';
  return value.slice(0, 4) + '***' + value.slice(-4);
}

function displayValue(fieldName: string, value: string): string {
  return SENSITIVE_FIELDS.has(fieldName) ? maskValue(value) : value;
}

async function promptChoice(
  rl: ReturnType<typeof createInterface>,
  label: string,
  options: { key: string; label: string }[],
  defaultIndex: number = 0,
): Promise<string> {
  console.log(`\n${label}`);
  options.forEach((o, i) => console.log(`  ${i + 1}. ${o.label}`));
  const answer = await rl.question(`Choose [1-${options.length}] (default: ${defaultIndex + 1}): `);
  const idx = parseInt(answer, 10) - 1;
  const pick = options[Number.isNaN(idx) || idx < 0 || idx >= options.length ? defaultIndex : idx];
  return pick!.key;
}

async function promptAuthType(
  rl: ReturnType<typeof createInterface>,
  providerName: string,
): Promise<AuthChoice> {
  if (providerName === 'elastic') {
    return (await promptChoice(rl, 'Elastic auth type:', [
      { key: 'apiKey', label: 'API key' },
      { key: 'basic', label: 'Basic (username + password)' },
    ])) as AuthChoice;
  }
  if (providerName === 'grafana') {
    return (await promptChoice(rl, 'Grafana auth type:', [
      { key: 'apiKey', label: 'API key / service account token' },
      { key: 'basic', label: 'Basic auth (username + password)' },
      { key: 'none', label: 'None (anonymous access)' },
    ])) as AuthChoice;
  }
  return 'none';
}

function isFieldRelevant(providerName: string, fieldName: string, authChoice: AuthChoice): boolean {
  if (providerName === 'elastic') {
    if (fieldName === 'auth.type') return false;
    if (authChoice === 'apiKey')
      return !fieldName.startsWith('auth.username') && !fieldName.startsWith('auth.password');
    if (authChoice === 'basic') return fieldName !== 'auth.apiKey';
  }
  if (providerName === 'grafana') {
    if (authChoice === 'apiKey') return !fieldName.startsWith('basicAuth.');
    if (authChoice === 'basic') return fieldName !== 'apiKey';
    if (authChoice === 'none') return fieldName !== 'apiKey' && !fieldName.startsWith('basicAuth.');
  }
  return true;
}

function isArrayField(fieldType: string): boolean {
  return fieldType.endsWith('[]');
}

async function promptField(
  rl: ReturnType<typeof createInterface>,
  providerName: string,
  fieldName: string,
  description: string,
  required: boolean,
  fieldType: string,
  newEnvVars: Map<string, string>,
): Promise<string | undefined> {
  const envMap = PROVIDER_FIELD_ENV[providerName] ?? {};
  const envVar = envMap[fieldName];
  if (!envVar) return undefined;

  const existing = process.env[envVar];

  if (existing) {
    console.log(`  ${envVar} (${description}): ${displayValue(fieldName, existing)}  [from .env]`);
    return existing;
  }

  if (required) {
    const hint = isArrayField(fieldType) ? ' (comma-separated)' : '';
    const value = await rl.question(`  ${envVar} (${description})${hint}: `);
    if (value.trim()) {
      newEnvVars.set(envVar, value.trim());
      process.env[envVar] = value.trim();
      return value.trim();
    }
    console.log(`    ⚠ Required field left empty — you must set ${envVar} in .env before running.`);
    return undefined;
  }

  const configure = await rl.question(`  Configure ${fieldName}? (y/N): `);
  if (configure.trim().toLowerCase() === 'y') {
    const value = await rl.question(`  ${envVar} (${description}): `);
    if (value.trim()) {
      newEnvVars.set(envVar, value.trim());
      process.env[envVar] = value.trim();
      return value.trim();
    }
  }
  return undefined;
}

function buildProviderYaml(
  providerName: string,
  authChoice: AuthChoice,
  collectedValues: Map<string, string | undefined>,
): string[] {
  const lines: string[] = [];
  const envMap = PROVIDER_FIELD_ENV[providerName] ?? {};

  lines.push(`  ${providerName}:`);
  lines.push('    enabled: true');

  const provider = META.providers.find((p) => p.name === providerName);
  if (!provider) return lines;

  for (const field of provider.configFields) {
    if (!isFieldRelevant(providerName, field.name, authChoice)) continue;
    if (field.name === 'auth.type') continue;

    const envVar = envMap[field.name];
    if (!envVar) continue;

    const value = collectedValues.get(field.name);
    if (!value && !field.required) continue;

    const yamlPath = field.name.split('.');
    const indent = '    ';

    if (isArrayField(field.type)) {
      emitNestedKey(lines, indent, yamlPath);
      lines.push(`${indent}${'  '.repeat(yamlPath.length - 1)}  - \${${envVar}}`);
    } else {
      emitNestedValue(lines, indent, yamlPath, `\${${envVar}}`);
    }
  }

  if (providerName === 'elastic') {
    insertAuthType(lines, authChoice);
  }

  return lines;
}

function emitNestedKey(lines: string[], baseIndent: string, path: string[]): void {
  for (let i = 0; i < path.length; i++) {
    const key = path[i]!;
    const indent = baseIndent + '  '.repeat(i);
    const existing = lines.findIndex((l) => l.trimEnd() === `${indent}${key}:`);
    if (existing === -1) {
      lines.push(`${indent}${key}:`);
    }
  }
}

function emitNestedValue(lines: string[], baseIndent: string, path: string[], value: string): void {
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i]!;
    const indent = baseIndent + '  '.repeat(i);
    const existing = lines.findIndex((l) => l.trimEnd() === `${indent}${key}:`);
    if (existing === -1) {
      lines.push(`${indent}${key}:`);
    }
  }
  const lastKey = path[path.length - 1]!;
  const finalIndent = baseIndent + '  '.repeat(path.length - 1);
  lines.push(`${finalIndent}${lastKey}: ${value}`);
}

function insertAuthType(lines: string[], authChoice: AuthChoice): void {
  const authLineIdx = lines.findIndex((l) => l.trimEnd() === '      auth:');
  if (authLineIdx === -1) {
    const enabledIdx = lines.findIndex((l) => l.includes('enabled: true'));
    if (enabledIdx !== -1) {
      lines.splice(enabledIdx + 1, 0, '    auth:', `      type: ${authChoice}`);
    }
  } else {
    lines.splice(authLineIdx + 1, 0, `      type: ${authChoice}`);
  }
}

export function registerInit(program: Command): void {
  program
    .command('init')
    .description(getCommandDef('init').description)
    .action(async () => {
      const envPath = resolve(process.cwd(), '.env');
      if (existsSync(envPath)) {
        dotenv.config({ path: envPath });
      }

      const rl = createInterface({ input: process.stdin, output: process.stdout });

      try {
        console.log('Welcome to alerthq setup!\n');

        // ── Storage ──────────────────────────────────────────
        const storageBackends = META.storageBackends;
        console.log('Available storage backends:');
        storageBackends.forEach((s, i) => console.log(`  ${i + 1}. ${s.name}`));
        const storageAnswer = await rl.question(
          `\nChoose storage [1-${storageBackends.length}] (default: 1): `,
        );
        const storageIndex = parseInt(storageAnswer, 10) - 1;
        const storagePick =
          storageBackends[
            Number.isNaN(storageIndex) || storageIndex < 0 || storageIndex >= storageBackends.length
              ? 0
              : storageIndex
          ]!;

        let storageEnvVars: Map<string, string> = new Map();
        if (storagePick.name === 'postgresql') {
          const existing = process.env['DATABASE_URL'];
          if (existing) {
            console.log(`\n  DATABASE_URL: ${maskValue(existing)}  [from .env]`);
          } else {
            const val = await rl.question('\n  DATABASE_URL (PostgreSQL connection string): ');
            if (val.trim()) {
              storageEnvVars.set('DATABASE_URL', val.trim());
              process.env['DATABASE_URL'] = val.trim();
            }
          }
        }

        // ── Providers ────────────────────────────────────────
        const providers = META.providers;
        console.log('\nAvailable alert providers:');
        providers.forEach((p, i) => console.log(`  ${i + 1}. ${p.name}`));
        const providerAnswer = await rl.question(
          '\nEnter provider numbers (comma-separated, e.g. 1,3): ',
        );
        const selectedIndices = providerAnswer
          .split(',')
          .map((s) => parseInt(s.trim(), 10) - 1)
          .filter((i) => i >= 0 && i < providers.length);

        const selectedProviders = selectedIndices.map((i) => providers[i]!);

        if (selectedProviders.length === 0) {
          console.log('\nNo providers selected. You can add them later in alerthq.config.yml.');
        }

        // ── Per-provider interactive config ──────────────────
        const newEnvVars = new Map<string, string>(storageEnvVars);
        const providerConfigs: { name: string; yaml: string[] }[] = [];

        for (const prov of selectedProviders) {
          console.log(`\n───── Configuring ${prov.name} ─────`);

          const needsAuthPrompt = prov.name === 'elastic' || prov.name === 'grafana';
          const authChoice: AuthChoice = needsAuthPrompt
            ? await promptAuthType(rl, prov.name)
            : 'none';

          const collectedValues = new Map<string, string | undefined>();

          for (const field of prov.configFields) {
            if (!isFieldRelevant(prov.name, field.name, authChoice)) continue;
            if (field.name === 'auth.type') continue;

            const value = await promptField(
              rl,
              prov.name,
              field.name,
              field.description,
              field.required,
              field.type,
              newEnvVars,
            );
            collectedValues.set(field.name, value);
          }

          const yaml = buildProviderYaml(prov.name, authChoice, collectedValues);
          providerConfigs.push({ name: prov.name, yaml });
        }

        // ── Write .env ───────────────────────────────────────
        if (newEnvVars.size > 0) {
          const existingEnv = existsSync(envPath) ? await readFile(envPath, 'utf-8') : '';
          const existingKeys = new Set(
            existingEnv
              .split('\n')
              .filter((l) => l.includes('=') && !l.startsWith('#'))
              .map((l) => l.split('=')[0]!.trim()),
          );

          const toAppend = [...newEnvVars]
            .filter(([k]) => !existingKeys.has(k))
            .map(([k, v]) => `${k}=${v}`);

          if (toAppend.length > 0) {
            const suffix = existingEnv.endsWith('\n') ? '' : '\n';
            await appendFile(envPath, suffix + toAppend.join('\n') + '\n');
            console.log(`\nAppended ${toAppend.length} new variable(s) to .env`);
          }
        }

        // ── Build and write config YAML ──────────────────────
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

        if (providerConfigs.length > 0) {
          for (const pc of providerConfigs) {
            lines.push(...pc.yaml);
          }
        } else {
          lines.push('  # Add providers here, e.g.:');
          lines.push('  # aws-cloudwatch:');
          lines.push('  #   enabled: true');
          lines.push('  #   regions:');
          lines.push('  #     - us-east-1');
        }

        const configContent = lines.join('\n') + '\n';
        const configPath = resolve(process.cwd(), 'alerthq.config.yml');
        await writeFile(configPath, configContent, 'utf-8');
        console.log(`\nWrote ${configPath}`);

        // ── Install instructions ─────────────────────────────
        const packagesToInstall: string[] = [storagePick.package];
        for (const prov of selectedProviders) {
          packagesToInstall.push(prov.package);
        }

        console.log('\nInstall required packages:');
        console.log(`  pnpm add ${packagesToInstall.join(' ')}`);

        console.log('\nDone! Run `alerthq test` to verify your connections.');
      } finally {
        rl.close();
      }
    });
}
