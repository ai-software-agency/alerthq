import {
  CloudWatchClient,
  DescribeAlarmsCommand,
  ListTagsForResourceCommand,
  type MetricAlarm,
} from '@aws-sdk/client-cloudwatch';
import { withRetry, logger } from '@alerthq/core';
import type { CloudWatchProviderConfig, CloudWatchAlarmWithTags } from './types.js';
import { tagsToRecord } from './types.js';

/**
 * Thin wrapper around the AWS CloudWatch SDK that handles pagination,
 * multi-region fan-out, and tag enrichment with retry.
 */
export class CloudWatchApiClient {
  private clients: Map<string, CloudWatchClient> = new Map();

  /**
   * Initialise SDK clients for each configured region.
   */
  init(config: CloudWatchProviderConfig): void {
    this.clients.clear();
    for (const region of config.regions) {
      this.clients.set(
        region,
        new CloudWatchClient({
          region,
          ...(config.credentials ? { credentials: config.credentials } : {}),
        }),
      );
    }
  }

  /**
   * Describe all metric alarms across every configured region, paginating
   * through NextToken automatically.
   */
  async describeAllAlarms(): Promise<MetricAlarm[]> {
    const allAlarms: MetricAlarm[] = [];

    for (const [, client] of this.clients) {
      let nextToken: string | undefined;
      do {
        const response = await withRetry(
          () =>
            client.send(
              new DescribeAlarmsCommand({
                NextToken: nextToken,
              }),
            ),
          { retries: 3, baseDelay: 500 },
        );
        if (response.MetricAlarms) {
          allAlarms.push(...response.MetricAlarms);
        }
        nextToken = response.NextToken;
      } while (nextToken);
    }

    return allAlarms;
  }

  /**
   * Enrich alarms with their resource tags.
   * Each ListTagsForResource call is wrapped with retry to handle throttling.
   */
  async enrichWithTags(alarms: MetricAlarm[]): Promise<CloudWatchAlarmWithTags[]> {
    const results: CloudWatchAlarmWithTags[] = [];

    for (const alarm of alarms) {
      if (!alarm.AlarmArn) {
        results.push({ alarm, tags: {} });
        continue;
      }

      // Determine the region from the ARN (arn:aws:cloudwatch:<region>:...)
      const arnParts = alarm.AlarmArn.split(':');
      const region = arnParts[3];
      const client = this.clients.get(region);

      if (!client) {
        results.push({ alarm, tags: {} });
        continue;
      }

      try {
        const tagResponse = await withRetry(
          () =>
            client.send(
              new ListTagsForResourceCommand({
                ResourceARN: alarm.AlarmArn,
              }),
            ),
          { retries: 3, baseDelay: 500 },
        );
        results.push({ alarm, tags: tagsToRecord(tagResponse.Tags) });
      } catch {
        // If tags fail (permissions etc), proceed without them
        results.push({ alarm, tags: {} });
      }
    }

    return results;
  }

  /**
   * Connectivity test: DescribeAlarms with MaxRecords 1 on every configured region.
   * Returns `false` if any region is unreachable.
   */
  async testConnection(): Promise<boolean> {
    if (this.clients.size === 0) {
      logger.debug('[aws-cloudwatch] No region clients configured');
      return false;
    }

    for (const [region, client] of this.clients) {
      try {
        await client.send(
          new DescribeAlarmsCommand({ MaxRecords: 1 }),
        );
      } catch (err) {
        logger.debug(`[aws-cloudwatch] Connection test failed for region ${region}: ${String(err)}`);
        return false;
      }
    }
    return true;
  }

  /**
   * Dispose all SDK clients.
   */
  dispose(): void {
    for (const [, client] of this.clients) {
      client.destroy();
    }
    this.clients.clear();
  }
}
