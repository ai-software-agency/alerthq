import type { Command } from 'commander';
import { createInterface } from 'node:readline/promises';
import { addManualAlert, META } from '@alerthq/core';
import type { Severity, ManualAlertInput } from '@alerthq/core';
import { withContext } from '../utils/output.js';
import { getCommandDef, applyCanonical } from '../utils/canonical.js';

const VALID_SEVERITIES: Severity[] = [...META.severities];

export function registerAdd(program: Command): void {
  const def = getCommandDef('add');
  const cmd = program.command('add');
  applyCanonical(cmd, def);

  cmd.action(async (opts: {
    name?: string;
    severity?: string;
    condition?: string;
    owner?: string;
  }) => {
    let name = opts.name;
    let severity = opts.severity as Severity | undefined;
    let condition = opts.condition;
    let owner = opts.owner;

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
