import type { Command } from 'commander';
import { getAlerts, formatTable, formatCsv, formatJson } from '@alerthq/core';
import type { AlertDefinition } from '@alerthq/core';
import { withContext, ALERT_LIST_COLUMNS } from '../utils/output.js';
import { getCommandDef, applyCanonical } from '../utils/canonical.js';

export function registerList(program: Command): void {
  const def = getCommandDef('list');
  const cmd = program.command('list');
  applyCanonical(cmd, def);

  cmd.action(async (opts: {
    provider?: string;
    severity?: string;
    tag?: string;
    owner?: string;
    enabled?: boolean;
    disabled?: boolean;
    format: string;
  }) => {
    await withContext(async (ctx) => {
      let alerts = await getAlerts(ctx);

      if (opts.provider) {
        alerts = alerts.filter((a) => a.source === opts.provider);
      }
      if (opts.severity) {
        alerts = alerts.filter((a) => a.severity === opts.severity);
      }
      if (opts.tag) {
        const eqIndex = opts.tag.indexOf('=');
        if (eqIndex > 0) {
          const tagKey = opts.tag.slice(0, eqIndex);
          const tagValue = opts.tag.slice(eqIndex + 1);
          alerts = alerts.filter((a) => a.tags[tagKey] === tagValue);
        }
      }
      if (opts.owner) {
        alerts = alerts.filter((a) => a.owner === opts.owner);
      }
      if (opts.enabled) {
        alerts = alerts.filter((a) => a.enabled);
      }
      if (opts.disabled) {
        alerts = alerts.filter((a) => !a.enabled);
      }

      const rows = alerts.map((a: AlertDefinition) => ({
        id: a.id,
        source: a.source,
        name: a.name,
        severity: a.severity,
        enabled: String(a.enabled),
        owner: a.owner || '-',
      }));

      switch (opts.format) {
        case 'json':
          console.log(formatJson(alerts));
          break;
        case 'csv':
          console.log(formatCsv(rows, [...ALERT_LIST_COLUMNS]));
          break;
        default:
          console.log(formatTable(rows, [...ALERT_LIST_COLUMNS]));
          break;
      }
    });
  });
}
