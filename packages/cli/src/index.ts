#!/usr/bin/env node

import { Command } from 'commander';
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

const program = new Command();

program
  .name('alerthq')
  .description('CLI for alerthq — sync, list, diff, tag, and export alert definitions')
  .version('0.0.0');

registerInit(program);
registerTest(program);
registerSync(program);
registerList(program);
registerShow(program);
registerDiff(program);
registerVersions(program);
registerAdd(program);
registerRemove(program);
registerTag(program);
registerExport(program);
registerStats(program);

program.parse();
