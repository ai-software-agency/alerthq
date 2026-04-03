/**
 * Single source of truth for all CLI command definitions.
 *
 * Each command's name, usage, description, options, and examples are defined
 * here and consumed by both the CLI registration and documentation generators.
 */

export interface CliOption {
  flags: string;
  description: string;
  defaultValue?: string;
}

export interface CliCommand {
  name: string;
  usage: string;
  description: string;
  options?: CliOption[];
  examples?: string[];
}

export const CLI_COMMANDS: readonly CliCommand[] = [
  {
    name: 'init',
    usage: 'init',
    description: 'Interactive setup — generate alerthq.config.yml',
    examples: ['alerthq init'],
  },
  {
    name: 'test',
    usage: 'test',
    description: 'Test connections to storage and all providers',
    examples: ['alerthq test'],
  },
  {
    name: 'sync',
    usage: 'sync [options]',
    description: 'Sync alert definitions from providers',
    options: [
      { flags: '--provider <name>', description: 'Sync only a specific provider' },
      { flags: '--name <name>', description: 'Name for this sync run' },
      { flags: '--description <text>', description: 'Description for this sync run' },
    ],
    examples: [
      'alerthq sync',
      'alerthq sync --provider aws-cloudwatch',
      'alerthq sync --name "Deploy v2.3"',
    ],
  },
  {
    name: 'list',
    usage: 'list [options]',
    description: 'List alert definitions with filters',
    options: [
      { flags: '--provider <name>', description: 'Filter by provider' },
      { flags: '--severity <level>', description: 'Filter by severity' },
      { flags: '--tag <key=value>', description: 'Filter by tag (key=value)' },
      { flags: '--owner <name>', description: 'Filter by owner' },
      { flags: '--enabled', description: 'Show only enabled alerts' },
      { flags: '--disabled', description: 'Show only disabled alerts' },
      { flags: '--format <fmt>', description: 'Output format: table, json, csv', defaultValue: 'table' },
    ],
    examples: [
      'alerthq list',
      'alerthq list --severity critical',
      'alerthq list --provider aws-cloudwatch --format json',
      'alerthq list --tag env=production',
    ],
  },
  {
    name: 'show',
    usage: 'show <id>',
    description: 'Show detailed information for a single alert',
    examples: [
      'alerthq show abc123',
      'alerthq show abc  # prefix match',
    ],
  },
  {
    name: 'diff',
    usage: 'diff [options]',
    description: 'Show differences between two sync versions',
    options: [
      { flags: '--from <version>', description: 'Source version number' },
      { flags: '--to <version>', description: 'Target version number' },
      { flags: '--format <fmt>', description: 'Output format: table, json', defaultValue: 'table' },
    ],
    examples: [
      'alerthq diff',
      'alerthq diff --from 1 --to 3',
    ],
  },
  {
    name: 'versions',
    usage: 'versions [options]',
    description: 'List sync history',
    options: [
      { flags: '--limit <n>', description: 'Maximum number of versions to show', defaultValue: '20' },
    ],
    examples: [
      'alerthq versions',
      'alerthq versions --limit 5',
    ],
  },
  {
    name: 'add',
    usage: 'add [options]',
    description: 'Add a manual alert definition',
    options: [
      { flags: '--name <name>', description: 'Alert name' },
      { flags: '--severity <level>', description: 'Severity: critical, warning, info, unknown' },
      { flags: '--condition <text>', description: 'Condition summary' },
      { flags: '--owner <name>', description: 'Alert owner' },
    ],
    examples: [
      'alerthq add --name "CPU High" --severity critical --condition "CPU > 90%"',
      'alerthq add  # interactive mode',
    ],
  },
  {
    name: 'remove',
    usage: 'remove <id>',
    description: 'Remove a manual alert definition',
    examples: ['alerthq remove abc123'],
  },
  {
    name: 'tag',
    usage: 'tag <id> <key=value>',
    description: 'Set an overlay tag on an alert (key=value)',
    examples: [
      'alerthq tag abc123 env=production',
      'alerthq tag abc team=backend',
    ],
  },
  {
    name: 'export',
    usage: 'export [options]',
    description: 'Export alerts to CSV or JSON',
    options: [
      { flags: '--format <fmt>', description: 'Output format: csv, json', defaultValue: 'csv' },
      { flags: '--output <path>', description: 'Write to file instead of stdout' },
      { flags: '--provider <name>', description: 'Filter by provider' },
      { flags: '--severity <level>', description: 'Filter by severity' },
    ],
    examples: [
      'alerthq export --format json',
      'alerthq export --output alerts.csv',
      'alerthq export --format json --severity critical',
    ],
  },
  {
    name: 'stats',
    usage: 'stats',
    description: 'Show summary statistics for alerts',
    examples: ['alerthq stats'],
  },
] as const;
