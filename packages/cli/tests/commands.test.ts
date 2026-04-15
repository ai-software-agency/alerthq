import { describe, it, expect } from 'vitest';
import { Command } from 'commander';
import { CLI_COMMANDS } from '@alerthq/core';
import { registerInit } from '../src/commands/init.js';
import { registerTest } from '../src/commands/test.js';
import { registerSync } from '../src/commands/sync.js';
import { registerList } from '../src/commands/list.js';
import { registerShow } from '../src/commands/show.js';
import { registerDiff } from '../src/commands/diff.js';
import { registerVersions } from '../src/commands/versions.js';
import { registerAdd } from '../src/commands/add.js';
import { registerRemove } from '../src/commands/remove.js';
import { registerTag } from '../src/commands/tag.js';
import { registerExport } from '../src/commands/export.js';
import { registerStats } from '../src/commands/stats.js';
import { registerEnable } from '../src/commands/enable.js';
import { registerDisable } from '../src/commands/disable.js';

const registrations: Record<string, (program: Command) => void> = {
  init: registerInit,
  test: registerTest,
  sync: registerSync,
  list: registerList,
  show: registerShow,
  diff: registerDiff,
  versions: registerVersions,
  add: registerAdd,
  remove: registerRemove,
  tag: registerTag,
  export: registerExport,
  stats: registerStats,
  enable: registerEnable,
  disable: registerDisable,
};

describe('CLI command registration', () => {
  it('registers all 14 commands without error', () => {
    const program = new Command();
    program.exitOverride();

    for (const cmd of CLI_COMMANDS) {
      const register = registrations[cmd.name];
      expect(register, `missing registration for '${cmd.name}'`).toBeDefined();
      register(program);
    }

    expect(program.commands.length).toBe(CLI_COMMANDS.length);
  });

  it('every registered command has a description from canonical data', () => {
    const program = new Command();
    program.exitOverride();

    for (const cmd of CLI_COMMANDS) {
      registrations[cmd.name](program);
    }

    for (const sub of program.commands) {
      const canonical = CLI_COMMANDS.find((c) => c.name === sub.name());
      expect(canonical, `no canonical entry for '${sub.name()}'`).toBeDefined();
      expect(sub.description()).toBe(canonical!.description);
    }
  });

  it('all canonical command names are unique', () => {
    const names = CLI_COMMANDS.map((c) => c.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('each canonical command has at least one example', () => {
    for (const cmd of CLI_COMMANDS) {
      if (cmd.examples) {
        expect(cmd.examples.length).toBeGreaterThan(0);
      }
    }
  });
});
