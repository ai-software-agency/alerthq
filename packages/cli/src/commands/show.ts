import type { Command } from 'commander';
import { formatJson } from '@alerthq/core';
import type { AlertDefinition } from '@alerthq/core';
import { withContext } from '../utils/output.js';

export function registerShow(program: Command): void {
  program
    .command('show <id>')
    .description('Show detailed information for a single alert')
    .action(async (idOrPrefix: string) => {
      await withContext(async (ctx) => {
        // Find alert by prefix across latest + manual
        const latestRun = await ctx.storage.getLatestSyncRun();
        const latestVersion = latestRun?.version;

        const allMatches: Map<string, AlertDefinition> = new Map();

        if (latestVersion !== undefined) {
          const matches = await ctx.storage.findAlertsByIdPrefix(latestVersion, idOrPrefix);
          for (const m of matches) allMatches.set(m.id, m);
        }

        const manualMatches = await ctx.storage.findAlertsByIdPrefix(0, idOrPrefix);
        for (const m of manualMatches) allMatches.set(m.id, m);

        if (allMatches.size === 0) {
          throw new Error(`No alert found matching '${idOrPrefix}'`);
        }

        if (allMatches.size > 1) {
          const candidates = Array.from(allMatches.values())
            .map((a) => `  ${a.id}  ${a.name}`)
            .join('\n');
          throw new Error(`Ambiguous ID prefix '${idOrPrefix}'. Candidates:\n${candidates}`);
        }

        const alert = allMatches.values().next().value!;

        // Apply overlay tags
        const overlayTags = await ctx.storage.getOverlayTags(alert.id);
        alert.tags = { ...alert.tags, ...overlayTags };

        // Print full detail
        console.log(`ID:              ${alert.id}`);
        console.log(`Name:            ${alert.name}`);
        console.log(`Source:          ${alert.source}`);
        console.log(`Source ID:       ${alert.sourceId}`);
        console.log(`Version:         ${alert.version}`);
        console.log(`Severity:        ${alert.severity}`);
        console.log(`Enabled:         ${alert.enabled}`);
        console.log(`Owner:           ${alert.owner || '(none)'}`);
        console.log(`Condition:       ${alert.conditionSummary || '(none)'}`);
        console.log(`Description:     ${alert.description || '(none)'}`);
        console.log(`Config Hash:     ${alert.configHash}`);
        console.log(`Last Modified:   ${alert.lastModifiedAt ?? '(unknown)'}`);
        console.log(`Discovered At:   ${alert.discoveredAt}`);

        if (alert.notificationTargets.length > 0) {
          console.log(`Notifications:`);
          for (const target of alert.notificationTargets) {
            console.log(`  - ${target}`);
          }
        } else {
          console.log(`Notifications:   (none)`);
        }

        if (Object.keys(alert.tags).length > 0) {
          console.log(`Tags:`);
          for (const [key, value] of Object.entries(alert.tags)) {
            console.log(`  ${key}: ${value}`);
          }
        } else {
          console.log(`Tags:            (none)`);
        }

        console.log(`\nRaw Config:`);
        console.log(formatJson(alert.rawConfig));
      });
    });
}
