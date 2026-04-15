#!/usr/bin/env node

import { Command } from 'commander';
import { META, CLI_COMMANDS, generateLlmHelp } from '@alerthq/core';
import { registerInit } from './commands/init.js';
import { registerTest } from './commands/test.js';
import { registerSync } from './commands/sync.js';
import { registerList } from './commands/list.js';
import { registerShow } from './commands/show.js';
import { registerDiff } from './commands/diff.js';
import { registerVersions } from './commands/versions.js';
import { registerAdd } from './commands/add.js';
import { registerRemove } from './commands/remove.js';
import { registerTag } from './commands/tag.js';
import { registerExport } from './commands/export.js';
import { registerStats } from './commands/stats.js';

// Handle --llm-help before commander parses
if (process.argv.includes('--llm-help')) {
  console.log(JSON.stringify(generateLlmHelp(), null, 2));
  process.exit(0);
}

const program = new Command();

const cliMeta = CLI_COMMANDS;

program.name(META.name).description(META.npmDescription).version('0.0.0');

// Map command names to registration functions
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
};

// Register all commands — descriptions come from canonical data
for (const cmd of cliMeta) {
  const register = registrations[cmd.name];
  if (register) {
    register(program);
  }
}

program.parse();
