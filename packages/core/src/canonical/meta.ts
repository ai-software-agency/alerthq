/**
 * Single source of truth for all alerthq project metadata.
 *
 * Every outward-facing surface (CLI help, README, npm description,
 * --llm-help, package.json) should derive from this object.
 */
export const META = {
  name: 'alerthq',
  npmName: '@alerthq/cli',
  tagline: 'Alert definitions, unified.',

  description:
    'Open-source, plugin-based CLI and TypeScript library that pulls alert definitions ' +
    '(not events/firings) from multiple cloud providers, normalizes them into a common schema, ' +
    'stores versioned state, and provides drift detection, tagging, manual entries, and export.',

  npmDescription:
    'Unified CLI for cloud alert definitions — sync, diff, tag, export. ' +
    'AI agent? Run: npx alerthq --llm-help',

  readOnly:
    'Read-only aggregator — never creates, modifies, or deletes alerts in any provider.',

  storageBackends: [
    { name: 'sqlite', package: '@alerthq/storage-sqlite', description: 'SQLite storage backend' },
    { name: 'postgresql', package: '@alerthq/storage-postgresql', description: 'PostgreSQL storage backend' },
  ],

  providers: [
    { name: 'aws-cloudwatch', package: '@alerthq/provider-aws-cloudwatch', description: 'AWS CloudWatch alert provider' },
    { name: 'elastic', package: '@alerthq/provider-elastic', description: 'Elastic Watcher + Kibana Rules provider' },
    { name: 'mongodb-atlas', package: '@alerthq/provider-mongodb-atlas', description: 'MongoDB Atlas alert provider' },
    { name: 'azure-monitor', package: '@alerthq/provider-azure-monitor', description: 'Azure Monitor alert provider' },
  ],

  packages: [
    { name: '@alerthq/core', description: 'Domain types, plugin interfaces, config/plugin loading, core functions' },
    { name: '@alerthq/cli', description: 'CLI commands powered by @alerthq/core' },
    { name: '@alerthq/storage-sqlite', description: 'SQLite storage backend' },
    { name: '@alerthq/storage-postgresql', description: 'PostgreSQL storage backend' },
    { name: '@alerthq/provider-aws-cloudwatch', description: 'AWS CloudWatch alert provider' },
    { name: '@alerthq/provider-elastic', description: 'Elastic Watcher + Kibana Rules provider' },
    { name: '@alerthq/provider-mongodb-atlas', description: 'MongoDB Atlas alert provider' },
    { name: '@alerthq/provider-azure-monitor', description: 'Azure Monitor alert provider' },
  ],

  quickStart: [
    'npx alerthq init',
    'npx alerthq sync',
    'npx alerthq list',
  ],

  severities: ['critical', 'warning', 'info', 'unknown'] as const,

  exportFormats: ['json', 'csv'] as const,

  listFormats: ['table', 'json', 'csv'] as const,

  readmeSpec: {
    audience: 'Developers and SREs who manage alerts across multiple cloud providers',
    tone: 'Technical, concise, practical',
    sections: [
      { name: 'header', notes: 'Project name + tagline + npmDescription' },
      { name: 'description', notes: 'META.description + META.readOnly' },
      { name: 'packages', notes: 'Table from META.packages' },
      { name: 'quick-start', notes: 'From META.quickStart' },
      { name: 'commands', notes: 'Generated from CLI_COMMANDS — name, usage, description' },
      { name: 'llm-help', notes: 'Mention --llm-help for AI agent discovery' },
      { name: 'development', notes: 'pnpm install, build, test, lint' },
      { name: 'license', notes: 'MIT' },
    ],
  },
} as const;
