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

    storageBackends: META.storageBackends.map((s) => ({
      name: s.name,
      package: s.package,
    })),

    providers: META.providers.map((p) => ({
      name: p.name,
      package: p.package,
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
      'storage:',
      "  provider: 'sqlite'",
      '  sqlite:',
      "    path: './alerthq.db'",
      '',
      'providers:',
      '  aws-cloudwatch:',
      '    enabled: true',
    ].join('\n'),
  };
}
