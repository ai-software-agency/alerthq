import type { Command } from 'commander';
import { CLI_COMMANDS } from '@alerthq/core';
import type { CliCommand } from '@alerthq/core';

/**
 * Look up a command's canonical definition by name.
 * Throws if not found (means canonical/cli.ts and the command file are out of sync).
 */
export function getCommandDef(name: string): CliCommand {
  const def = CLI_COMMANDS.find((c) => c.name === name);
  if (!def) {
    throw new Error(`No canonical definition for command '${name}'. Add it to canonical/cli.ts.`);
  }
  return def;
}

/**
 * Apply canonical description and options to a commander command.
 */
export function applyCanonical(cmd: ReturnType<Command['command']>, def: CliCommand): void {
  cmd.description(def.description);
  if (def.options) {
    for (const opt of def.options) {
      if (opt.defaultValue !== undefined) {
        cmd.option(opt.flags, opt.description, opt.defaultValue);
      } else {
        cmd.option(opt.flags, opt.description);
      }
    }
  }
}
