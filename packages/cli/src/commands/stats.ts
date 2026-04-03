import type { Command } from 'commander';
import { getAlerts, formatTable } from '@alerthq/core';
import { withContext } from '../utils/output.js';
import { getCommandDef } from '../utils/canonical.js';

export function registerStats(program: Command): void {
  program
    .command('stats')
    .description(getCommandDef('stats').description)
    .action(async () => {
      await withContext(async (ctx) => {
        const alerts = await getAlerts(ctx);

        console.log(`Total alerts: ${alerts.length}\n`);

        // By provider
        const byProvider: Record<string, number> = {};
        for (const a of alerts) {
          byProvider[a.source] = (byProvider[a.source] ?? 0) + 1;
        }
        const providerRows = Object.entries(byProvider)
          .sort(([, a], [, b]) => b - a)
          .map(([provider, count]) => ({ provider, count: String(count) }));
        console.log('By Provider:');
        console.log(formatTable(providerRows, ['provider', 'count']));

        // By severity
        const bySeverity: Record<string, number> = {};
        for (const a of alerts) {
          bySeverity[a.severity] = (bySeverity[a.severity] ?? 0) + 1;
        }
        const severityRows = Object.entries(bySeverity)
          .sort(([, a], [, b]) => b - a)
          .map(([severity, count]) => ({ severity, count: String(count) }));
        console.log('\nBy Severity:');
        console.log(formatTable(severityRows, ['severity', 'count']));

        // Enabled vs disabled
        const enabled = alerts.filter((a) => a.enabled).length;
        const disabled = alerts.length - enabled;
        console.log(`\nEnabled: ${enabled}  Disabled: ${disabled}`);

        // Alerts with no owner
        const noOwner = alerts.filter((a) => !a.owner).length;
        console.log(`No owner: ${noOwner}`);

        // Alerts with no notification targets
        const noTargets = alerts.filter((a) => a.notificationTargets.length === 0).length;
        console.log(`No notification targets: ${noTargets}`);
      });
    });
}
