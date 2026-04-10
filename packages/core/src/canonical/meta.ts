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
    {
      name: 'aws-cloudwatch',
      package: '@alerthq/provider-aws-cloudwatch',
      description: 'AWS CloudWatch alert provider',
      configFields: [
        { name: 'regions', type: 'string[]', required: true, description: 'AWS regions to scan (e.g. ["us-east-1","eu-west-1"])' },
        { name: 'credentials.accessKeyId', type: 'string', required: false, description: 'AWS access key ID (falls back to SDK credential chain)' },
        { name: 'credentials.secretAccessKey', type: 'string', required: false, description: 'AWS secret access key' },
        { name: 'credentials.sessionToken', type: 'string', required: false, description: 'AWS session token for temporary credentials' },
      ],
    },
    {
      name: 'elastic',
      package: '@alerthq/provider-elastic',
      description: 'Elastic Watcher + Kibana Rules provider',
      configFields: [
        { name: 'url', type: 'string', required: false, description: 'Elasticsearch URL (for Watcher alerts — optional if kibanaUrl is set)' },
        { name: 'kibanaUrl', type: 'string', required: false, description: 'Kibana URL (for Kibana alerting rules — optional if url is set)' },
        { name: 'auth.type', type: '"basic" | "apiKey"', required: true, description: 'Authentication method' },
        { name: 'auth.username', type: 'string', required: false, description: 'Username (when auth.type is "basic")' },
        { name: 'auth.password', type: 'string', required: false, description: 'Password (when auth.type is "basic")' },
        { name: 'auth.apiKey', type: 'string', required: false, description: 'API key (when auth.type is "apiKey")' },
      ],
    },
    {
      name: 'mongodb-atlas',
      package: '@alerthq/provider-mongodb-atlas',
      description: 'MongoDB Atlas alert provider',
      configFields: [
        { name: 'publicKey', type: 'string', required: true, description: 'Atlas API public key' },
        { name: 'privateKey', type: 'string', required: true, description: 'Atlas API private key' },
        { name: 'projectIds', type: 'string[]', required: true, description: 'Atlas project IDs to scan' },
        { name: 'baseUrl', type: 'string', required: false, description: 'Atlas API base URL override' },
        { name: 'pageSize', type: 'number', required: false, description: 'Pagination page size' },
      ],
    },
    {
      name: 'azure-monitor',
      package: '@alerthq/provider-azure-monitor',
      description: 'Azure Monitor alert provider',
      configFields: [
        { name: 'subscriptionIds', type: 'string[]', required: true, description: 'Azure subscription IDs to scan' },
      ],
    },
    {
      name: 'datadog',
      package: '@alerthq/provider-datadog',
      description: 'Datadog alert provider',
      configFields: [
        { name: 'apiKey', type: 'string', required: true, description: 'Datadog API key' },
        { name: 'appKey', type: 'string', required: true, description: 'Datadog Application key' },
        { name: 'site', type: 'string', required: false, description: 'Datadog site (default: datadoghq.com)' },
      ],
    },
    {
      name: 'gcp-monitoring',
      package: '@alerthq/provider-gcp-monitoring',
      description: 'GCP Cloud Monitoring alert provider',
      configFields: [
        { name: 'projectId', type: 'string', required: true, description: 'GCP project ID' },
        { name: 'keyFilename', type: 'string', required: false, description: 'Path to service account JSON key file' },
        { name: 'credentials.client_email', type: 'string', required: false, description: 'Service account email (inline credentials)' },
        { name: 'credentials.private_key', type: 'string', required: false, description: 'Service account private key (inline credentials)' },
      ],
    },
    {
      name: 'grafana',
      package: '@alerthq/provider-grafana',
      description: 'Grafana alert provider',
      configFields: [
        { name: 'url', type: 'string', required: true, description: 'Grafana instance URL' },
        { name: 'apiKey', type: 'string', required: false, description: 'Grafana API key or service account token' },
        { name: 'basicAuth.username', type: 'string', required: false, description: 'Basic auth username' },
        { name: 'basicAuth.password', type: 'string', required: false, description: 'Basic auth password' },
      ],
    },
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
    { name: '@alerthq/provider-datadog', description: 'Datadog alert provider' },
    { name: '@alerthq/provider-gcp-monitoring', description: 'GCP Cloud Monitoring alert provider' },
    { name: '@alerthq/provider-grafana', description: 'Grafana alert provider' },
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
