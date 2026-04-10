/**
 * Generator functions that produce formatted documentation from canonical data.
 *
 * Runtime surfaces (--help, --llm-help) call these directly.
 * Static surfaces (README) use the specs in META to regenerate.
 */

import { META } from './meta.js';
import { CLI_COMMANDS } from './cli.js';
import type { CliCommand } from './cli.js';

/**
 * Generate CLI --help text from canonical command definitions.
 */
export function generateHelpText(): string {
  const lines: string[] = [];

  lines.push(`${META.name} — ${META.tagline}`);
  lines.push('');
  lines.push(META.description);
  lines.push(META.readOnly);
  lines.push('');
  lines.push('Usage: alerthq [options] [command]');
  lines.push('');
  lines.push('Commands:');

  const maxUsage = Math.max(...CLI_COMMANDS.map((c) => c.usage.length));

  for (const cmd of CLI_COMMANDS) {
    lines.push(`  ${cmd.usage.padEnd(maxUsage + 2)}${cmd.description}`);
  }

  lines.push('');
  lines.push('Global Options:');
  lines.push('  -V, --version   Output the version number');
  lines.push('  -h, --help      Display help for command');
  lines.push('  --llm-help      Output structured JSON for AI agents');
  lines.push('');
  lines.push(`Run "alerthq help <command>" for detailed information about a command.`);

  return lines.join('\n');
}

/**
 * Generate structured JSON for AI agent discovery (--llm-help).
 *
 * This is the machine-readable endpoint that lets AI agents understand
 * how to use alerthq without parsing human-readable help text.
 */
export function generateLlmHelp(): Record<string, unknown> {
  return {
    name: META.name,
    description: META.description,
    readOnly: META.readOnly,
    quickStart: META.quickStart,
    severities: [...META.severities],
    exportFormats: [...META.exportFormats],

    architecture:
      'alerthq follows a sync-version-diff model. Each `sync` fetches alert definitions from ' +
      'configured providers, normalizes them into a common AlertDefinition schema, and stores ' +
      'them as a new versioned snapshot. The `diff` command compares any two versions to show ' +
      'added, removed, and modified alerts (drift detection). Overlay tags and manual entries ' +
      'persist across syncs. The tool is strictly read-only — it never creates, modifies, or ' +
      'deletes alerts in any provider.',

    alertDefinitionSchema: [
      { field: 'id', type: 'string', description: 'First 12 chars of sha256(source + ":" + sourceId)' },
      { field: 'version', type: 'number', description: 'FK to sync_runs.version; 0 = manual entry' },
      { field: 'source', type: 'string', description: 'Provider key (e.g. "aws-cloudwatch") or "manual"' },
      { field: 'sourceId', type: 'string', description: "Provider's native identifier or generated UUID" },
      { field: 'name', type: 'string', description: 'Human-readable alert name' },
      { field: 'description', type: 'string', description: 'Alert description' },
      { field: 'enabled', type: 'boolean', description: 'Whether the alert is enabled in the source system' },
      { field: 'severity', type: 'Severity', description: 'Normalized severity: critical | warning | info | unknown' },
      { field: 'conditionSummary', type: 'string', description: 'Human-readable condition / threshold summary' },
      { field: 'notificationTargets', type: 'string[]', description: 'Deduplicated notification targets (SNS ARNs, emails, etc.)' },
      { field: 'tags', type: 'Record<string, string>', description: 'Merged tag map: provider tags + user overlay tags' },
      { field: 'owner', type: 'string', description: 'Alert owner (team, user, or empty string)' },
      { field: 'rawConfig', type: 'Record<string, unknown>', description: 'Raw provider configuration for reference' },
      { field: 'configHash', type: 'string', description: 'sha256(rawConfig) — used for drift detection' },
      { field: 'lastModifiedAt', type: 'string | null', description: 'Last modification timestamp from provider' },
      { field: 'discoveredAt', type: 'string', description: 'ISO 8601 timestamp of first discovery' },
    ],

    storageBackends: META.storageBackends.map((s) => ({
      name: s.name,
      package: s.package,
    })),

    providers: META.providers.map((p) => ({
      name: p.name,
      package: p.package,
      configFields: p.configFields,
    })),

    commands: CLI_COMMANDS.map((cmd: CliCommand) => ({
      name: cmd.name,
      usage: cmd.usage,
      description: cmd.description,
      options: cmd.options?.map((o) => ({
        flags: o.flags,
        description: o.description,
        ...(o.defaultValue !== undefined ? { default: o.defaultValue } : {}),
      })),
      examples: cmd.examples,
    })),

    configExample: [
      '# alerthq.config.yml',
      'storage:',
      '  provider: sqlite',
      '  sqlite:',
      '    path: ./alerthq.db',
      '',
      '  # -- OR PostgreSQL --',
      '  # provider: postgresql',
      '  # postgresql:',
      '  #   connectionString: ${DATABASE_URL}',
      '',
      'providers:',
      '  aws-cloudwatch:',
      '    enabled: true',
      '    regions:',
      '      - us-east-1',
      '      - eu-west-1',
      '    # credentials:              # optional — falls back to AWS SDK chain',
      '    #   accessKeyId: ${AWS_ACCESS_KEY_ID}',
      '    #   secretAccessKey: ${AWS_SECRET_ACCESS_KEY}',
      '',
      '  elastic:',
      '    enabled: true',
      '    # At least one of url or kibanaUrl is required',
      '    # url: ${ELASTIC_URL}              # optional — for Watcher alerts',
      '    kibanaUrl: ${ELASTIC_KIBANA_URL}    # optional — for Kibana alerting rules',
      '    auth:',
      '      type: apiKey',
      '      apiKey: ${ELASTIC_API_KEY}',
      '    # -- OR basic auth --',
      '    # auth:',
      '    #   type: basic',
      '    #   username: ${ELASTIC_USERNAME}',
      '    #   password: ${ELASTIC_PASSWORD}',
      '',
      '  mongodb-atlas:',
      '    enabled: true',
      '    publicKey: ${ATLAS_PUBLIC_KEY}',
      '    privateKey: ${ATLAS_PRIVATE_KEY}',
      '    projectIds:',
      '      - ${ATLAS_PROJECT_ID}',
      '',
      '  azure-monitor:',
      '    enabled: true',
      '    subscriptionIds:',
      '      - ${AZURE_SUBSCRIPTION_ID}',
      '',
      '  datadog:',
      '    enabled: true',
      '    apiKey: ${DD_API_KEY}',
      '    appKey: ${DD_APP_KEY}',
      '    # site: datadoghq.eu       # optional, defaults to datadoghq.com',
      '',
      '  gcp-monitoring:',
      '    enabled: true',
      '    projectId: ${GCP_PROJECT_ID}',
      '    # keyFilename: ./gcp-sa-key.json',
      '',
      '  grafana:',
      '    enabled: true',
      '    url: ${GRAFANA_URL}',
      '    apiKey: ${GRAFANA_API_KEY}',
      '    # -- OR basic auth --',
      '    # basicAuth:',
      '    #   username: ${GRAFANA_USERNAME}',
      '    #   password: ${GRAFANA_PASSWORD}',
    ].join('\n'),
  };
}
