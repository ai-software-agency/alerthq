import type { Command } from 'commander';
import { writeFile } from 'node:fs/promises';
import { getAlerts, formatCsv, formatJson } from '@alerthq/core';
import type { AlertDefinition } from '@alerthq/core';
import { withContext } from '../utils/output.js';
import { getCommandDef, applyCanonical } from '../utils/canonical.js';

const EXPORT_CSV_COLUMNS = [
  'id',
  'version',
  'source',
  'sourceId',
  'name',
  'description',
  'enabled',
  'severity',
  'conditionSummary',
  'notificationTargets',
  'tags',
  'owner',
  'configHash',
  'lastModifiedAt',
  'discoveredAt',
] as const;

export function registerExport(program: Command): void {
  const def = getCommandDef('export');
  const cmd = program.command('export');
  applyCanonical(cmd, def);

  cmd.action(
    async (opts: { format: string; output?: string; provider?: string; severity?: string }) => {
      await withContext(async (ctx) => {
        let alerts = await getAlerts(ctx);

        if (opts.provider) {
          alerts = alerts.filter((a) => a.source === opts.provider);
        }
        if (opts.severity) {
          alerts = alerts.filter((a) => a.severity === opts.severity);
        }

        let content: string;

        if (opts.format === 'json') {
          content = formatJson(alerts);
        } else {
          const rows = alerts.map((a: AlertDefinition) => ({
            id: a.id,
            version: String(a.version),
            source: a.source,
            sourceId: a.sourceId,
            name: a.name,
            description: a.description,
            enabled: String(a.enabled),
            severity: a.severity,
            conditionSummary: a.conditionSummary,
            notificationTargets: a.notificationTargets.join('; '),
            tags: Object.entries(a.tags)
              .map(([k, v]) => `${k}=${v}`)
              .join('; '),
            owner: a.owner,
            configHash: a.configHash,
            lastModifiedAt: a.lastModifiedAt ?? '',
            discoveredAt: a.discoveredAt,
          }));
          content = formatCsv(rows, [...EXPORT_CSV_COLUMNS]);
        }

        if (opts.output) {
          await writeFile(opts.output, content, 'utf-8');
          console.log(`Exported ${alerts.length} alerts to ${opts.output}`);
        } else {
          console.log(content);
        }
      });
    },
  );
}
