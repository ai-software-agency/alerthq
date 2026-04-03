import type { MetricAlarm, Tag } from '@aws-sdk/client-cloudwatch';

/**
 * A CloudWatch alarm enriched with its resource tags.
 */
export interface CloudWatchAlarmWithTags {
  alarm: MetricAlarm;
  tags: Record<string, string>;
}

/**
 * Configuration for the AWS CloudWatch provider adapter.
 */
export interface CloudWatchProviderConfig {
  /** AWS regions to scan for alarms (e.g. `['us-east-1', 'eu-west-1']`). */
  regions: string[];

  /**
   * Optional AWS credentials override.
   * When omitted the default credential chain is used.
   */
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
  };
}

/**
 * Convert an array of AWS SDK Tag objects to a plain record.
 */
export function tagsToRecord(tags: Tag[] | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  if (!tags) return result;
  for (const tag of tags) {
    if (tag.Key != null && tag.Value != null) {
      result[tag.Key] = tag.Value;
    }
  }
  return result;
}
