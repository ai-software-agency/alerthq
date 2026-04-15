import type { AlertDefinition, Severity } from '@alerthq/core';
import { generateAlertId, hashConfig } from '@alerthq/core';
import type { AtlasAlertConfig } from './types.js';

/**
 * Map a MongoDB Atlas alert configuration to an AlertDefinition.
 */
export function mapAtlasAlertConfig(config: AtlasAlertConfig): AlertDefinition {
  const source = 'mongodb-atlas';
  const sourceId = config.id;
  const raw = config as unknown as Record<string, unknown>;

  return {
    id: generateAlertId(source, sourceId),
    version: 0,
    source,
    sourceId,
    name: buildName(config),
    description: '',
    enabled: config.enabled,
    severity: 'unknown' as Severity,
    conditionSummary: buildConditionSummary(config),
    notificationTargets: extractNotificationTargets(config),
    tags: {},
    owner: '',
    rawConfig: raw,
    configHash: hashConfig(raw),
    lastModifiedAt: config.updated ?? null,
    discoveredAt: new Date().toISOString(),
  };
}

/**
 * Build a human-readable name from the event type and metric.
 */
export function buildName(config: AtlasAlertConfig): string {
  const parts: string[] = [config.eventTypeName];

  if (config.metricThreshold?.metricName) {
    parts.push(config.metricThreshold.metricName);
  }

  return parts.join(' - ');
}

/**
 * Build a condition summary from metric threshold, threshold, and matchers.
 */
export function buildConditionSummary(config: AtlasAlertConfig): string {
  const parts: string[] = [];

  if (config.metricThreshold) {
    const mt = config.metricThreshold;
    parts.push(`${mt.metricName} ${mt.operator} ${mt.threshold}${mt.units ? ' ' + mt.units : ''}`);
    if (mt.mode) {
      parts.push(`mode: ${mt.mode}`);
    }
  }

  if (config.threshold) {
    const t = config.threshold;
    parts.push(`${t.operator} ${t.threshold}${t.units ? ' ' + t.units : ''}`);
  }

  if (config.matchers && config.matchers.length > 0) {
    const matcherStr = config.matchers
      .map((m) => `${m.fieldName} ${m.operator} ${m.value}`)
      .join(', ');
    parts.push(`matchers: [${matcherStr}]`);
  }

  if (parts.length === 0) {
    return config.eventTypeName;
  }

  return parts.join('; ');
}

/**
 * Extract notification targets from Atlas notifications.
 */
export function extractNotificationTargets(config: AtlasAlertConfig): string[] {
  const targets: string[] = [];

  for (const notif of config.notifications) {
    switch (notif.typeName) {
      case 'EMAIL':
        if (notif.emailAddress) {
          targets.push(notif.emailAddress);
        }
        break;

      case 'SMS':
        if (notif.mobileNumber) {
          targets.push(`sms:${notif.mobileNumber}`);
        }
        break;

      case 'SLACK':
        if (notif.channelName) {
          targets.push(`slack:${notif.channelName}`);
        }
        break;

      case 'WEBHOOK':
        if (notif.webhookUrl) {
          targets.push(`webhook:${notif.webhookUrl}`);
        } else {
          targets.push('webhook:configured');
        }
        break;

      case 'MICROSOFT_TEAMS':
        if (notif.microsoftTeamsWebhookUrl) {
          targets.push(`teams:${notif.microsoftTeamsWebhookUrl}`);
        } else {
          targets.push('teams:configured');
        }
        break;

      case 'PAGER_DUTY':
        targets.push('pagerduty:configured');
        break;

      case 'DATADOG':
        targets.push(`datadog:${notif.datadogRegion ?? 'US'}`);
        break;

      case 'OPS_GENIE':
        targets.push('opsgenie:configured');
        break;

      case 'VICTOR_OPS':
        if (notif.victorOpsRoutingKey) {
          targets.push(`victorops:${notif.victorOpsRoutingKey}`);
        } else {
          targets.push('victorops:configured');
        }
        break;

      case 'TEAM':
        if (notif.teamName) {
          targets.push(`team:${notif.teamName}`);
        } else if (notif.teamId) {
          targets.push(`team:${notif.teamId}`);
        }
        break;

      case 'GROUP':
      case 'ORG':
        if (notif.roles && notif.roles.length > 0) {
          targets.push(`${notif.typeName.toLowerCase()}:${notif.roles.join(',')}`);
        } else {
          targets.push(`${notif.typeName.toLowerCase()}:all`);
        }
        break;

      default:
        targets.push(`${notif.typeName.toLowerCase()}:configured`);
        break;
    }
  }

  return [...new Set(targets)];
}
