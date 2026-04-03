import type { AlertDefinition, Severity } from '@alerthq/core';
import { generateAlertId, hashConfig } from '@alerthq/core';
import type { WatchRecord, KibanaRule } from './types.js';

/**
 * Map an Elasticsearch Watcher record to an AlertDefinition.
 */
export function mapWatcher(watch: WatchRecord): AlertDefinition {
  const source = 'elastic-watcher';
  const sourceId = watch._id;
  const raw = watch.watch as unknown as Record<string, unknown>;

  return {
    id: generateAlertId(source, sourceId),
    version: 0,
    source,
    sourceId,
    name: sourceId,
    description: '',
    enabled: watch.status?.state?.active ?? true,
    severity: 'unknown' as Severity,
    conditionSummary: summarizeWatcherCondition(watch.watch.condition),
    notificationTargets: extractWatcherTargets(watch.watch.actions ?? {}),
    tags: {},
    owner: '',
    rawConfig: raw,
    configHash: hashConfig(raw),
    lastModifiedAt: null,
    discoveredAt: new Date().toISOString(),
  };
}

/**
 * Build a human-readable condition summary from a watcher condition block.
 */
export function summarizeWatcherCondition(
  condition?: Record<string, unknown>,
): string {
  if (!condition) return 'No condition';

  if (condition.compare) {
    const compare = condition.compare as Record<string, Record<string, unknown>>;
    const parts: string[] = [];
    for (const [path, ops] of Object.entries(compare)) {
      for (const [op, value] of Object.entries(ops)) {
        parts.push(`${path} ${op} ${String(value)}`);
      }
    }
    return parts.join(' AND ') || 'compare condition';
  }

  if (condition.array_compare) {
    const ac = condition.array_compare as Record<string, Record<string, unknown>>;
    const parts: string[] = [];
    for (const [path, ops] of Object.entries(ac)) {
      for (const [op, value] of Object.entries(ops)) {
        parts.push(`${path} ${op} ${String(value)}`);
      }
    }
    return parts.join(' AND ') || 'array_compare condition';
  }

  if (condition.script) {
    const script = condition.script as Record<string, unknown>;
    const src = script.source ?? script.inline ?? script.id ?? '';
    return `script: ${String(src)}`.slice(0, 120);
  }

  if (condition.always) return 'always';
  if (condition.never) return 'never';

  return `condition: ${Object.keys(condition).join(', ')}`;
}

/**
 * Extract notification targets from watcher actions.
 */
export function extractWatcherTargets(
  actions: Record<string, unknown>,
): string[] {
  const targets: string[] = [];

  for (const [name, action] of Object.entries(actions)) {
    const a = action as Record<string, unknown>;

    if (a.email) {
      const email = a.email as Record<string, unknown>;
      const to = email.to;
      if (Array.isArray(to)) {
        targets.push(...to.map(String));
      } else if (typeof to === 'string') {
        targets.push(to);
      }
    }

    if (a.webhook) {
      const wh = a.webhook as Record<string, unknown>;
      const url = wh.url ?? (wh.host ? `${String(wh.host)}:${String(wh.port ?? 80)}${String(wh.path ?? '')}` : undefined);
      if (url) targets.push(`webhook:${String(url)}`);
    }

    if (a.slack) {
      targets.push(`slack:${name}`);
    }

    if (a.pagerduty) {
      targets.push(`pagerduty:${name}`);
    }

    if (a.logging) {
      targets.push(`logging:${name}`);
    }

    if (a.index) {
      const idx = a.index as Record<string, unknown>;
      targets.push(`index:${String(idx.index ?? name)}`);
    }
  }

  return [...new Set(targets)];
}

/**
 * Map a Kibana Alerting rule to an AlertDefinition.
 */
export function mapKibanaRule(rule: KibanaRule): AlertDefinition {
  const source = 'elastic-kibana';
  const sourceId = rule.id;
  const raw = rule as unknown as Record<string, unknown>;

  return {
    id: generateAlertId(source, sourceId),
    version: 0,
    source,
    sourceId,
    name: rule.name,
    description: '',
    enabled: rule.enabled,
    severity: 'unknown' as Severity,
    conditionSummary: summarizeKibanaCondition(rule.rule_type_id, rule.params),
    notificationTargets: extractKibanaTargets(rule.actions),
    tags: Object.fromEntries(rule.tags.map((t) => [t, 'true'])),
    owner: '',
    rawConfig: raw,
    configHash: hashConfig(raw),
    lastModifiedAt: rule.updatedAt ?? null,
    discoveredAt: new Date().toISOString(),
  };
}

/**
 * Build a human-readable condition summary from Kibana rule type + params.
 */
export function summarizeKibanaCondition(
  ruleTypeId: string,
  params: Record<string, unknown>,
): string {
  const parts: string[] = [`type: ${ruleTypeId}`];

  if (params.criteria && Array.isArray(params.criteria)) {
    for (const criterion of params.criteria) {
      const c = criterion as Record<string, unknown>;
      const metric = c.metric ?? c.field ?? '';
      const comparator = c.comparator ?? c.condition ?? '';
      const threshold = c.threshold ?? c.value ?? '';
      if (metric || comparator || threshold) {
        parts.push(`${String(metric)} ${String(comparator)} ${String(threshold)}`);
      }
    }
  }

  if (params.threshold !== undefined) {
    parts.push(`threshold: ${String(params.threshold)}`);
  }

  if (params.index) {
    parts.push(`index: ${String(Array.isArray(params.index) ? params.index.join(',') : params.index)}`);
  }

  return parts.join('; ');
}

/**
 * Extract notification targets from Kibana rule actions.
 */
export function extractKibanaTargets(actions: KibanaRule['actions']): string[] {
  const targets: string[] = [];

  for (const action of actions) {
    const type = action.actionTypeId;
    const id = action.id;

    if (type === '.email') {
      const to = action.params.to;
      if (Array.isArray(to)) {
        targets.push(...to.map(String));
      } else if (typeof to === 'string') {
        targets.push(to);
      } else {
        targets.push(`email:${id}`);
      }
    } else if (type === '.slack') {
      targets.push(`slack:${id}`);
    } else if (type === '.pagerduty') {
      targets.push(`pagerduty:${id}`);
    } else if (type === '.webhook') {
      targets.push(`webhook:${id}`);
    } else if (type === '.server-log') {
      targets.push(`server-log:${id}`);
    } else {
      targets.push(`${type}:${id}`);
    }
  }

  return [...new Set(targets)];
}
