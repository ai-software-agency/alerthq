import type { Command } from 'commander';
import { createInterface } from 'node:readline/promises';
import { addManualAlert } from '@alerthq/core';
import type { Severity, ManualAlertInput } from '@alerthq/core';
import { withContext } from '../utils/output.js';

const VALID_SEVERITIES: Severity[] = ['critical', 'warning', 'info', 'unknown'];

export function registerAdd(program: Command): void {
  program
    .command('add')
    .description('Add a manual alert definition')
    .option('--name <name>', 'Alert name')
    .option('--severity <level>', 'Severity: critical, warning, info, unknown')
    .option('--condition <text>', 'Condition summary')
    .option('--owner <name>', 'Alert owner')
    .action(async (opts: {
      name?: string;
      severity?: string;
      condition?: string;
      owner?: string;
    }) => {
      let name = opts.name;
      let severity = opts.severity as Severity | undefined;
      let condition = opts.condition;
      let owner = opts.owner;

      // Interactive mode if required flags are missing
      if (!name || !severity) {
        const rl = createInterface({ input: process.stdin, output: process.stdout });
        try {
          if (!name) {
            name = await rl.question('Alert name: ');
            if (!name.trim()) {
              throw new Error('Alert name is required');
            }
          }
          if (!severity) {
            const answer = await rl.question(`Severity (${VALID_SEVERITIES.join(', ')}): `);
            severity = answer.trim() as Severity;
          }
          if (condition === undefined) {
            condition = await rl.question('Condition summary (optional): ');
          }
          if (owner === undefined) {
            owner = await rl.question('Owner (optional): ');
          }
        } finally {
          rl.close();
        }
      }

      if (!VALID_SEVERITIES.includes(severity!)) {
        throw new Error(`Invalid severity '${severity}'. Must be one of: ${VALID_SEVERITIES.join(', ')}`);
      }

      await withContext(async (ctx) => {
        const input: ManualAlertInput = {
          name: name!,
          severity: severity!,
          conditionSummary: condition || undefined,
          owner: owner || undefined,
        };

        const alert = await addManualAlert(ctx, input);
        console.log(`Added manual alert: ${alert.name} (${alert.id})`);
      });
    });
}
