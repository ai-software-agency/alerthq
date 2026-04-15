# @alerthq/provider-aws-cloudwatch

AWS CloudWatch alert provider for [alerthq](https://github.com/edrv/alerthq).

## Supported Alert Types

| Alert Type    | API Source                                        | Notes                                          |
| ------------- | ------------------------------------------------- | ---------------------------------------------- |
| Metric Alarms | `DescribeAlarms` via `@aws-sdk/client-cloudwatch` | Includes standard and anomaly detection alarms |

Composite alarms are not currently fetched (they use a separate API call).

## Authentication

Uses the standard AWS credential chain. Credentials are resolved in this order:

1. Explicit credentials in config (`accessKeyId`, `secretAccessKey`, optional `sessionToken`)
2. Environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)
3. Shared credentials file (`~/.aws/credentials`)
4. IAM role (EC2 instance profile, ECS task role, Lambda execution role)

## Configuration

Add to your `alerthq.yaml`:

```yaml
providers:
  aws-cloudwatch:
    enabled: true
    regions:
      - us-east-1
      - eu-west-1
    # Optional: explicit credentials (omit to use default chain)
    # credentials:
    #   accessKeyId: AKIA...
    #   secretAccessKey: ...
    #   sessionToken: ...
```

| Field                         | Type       | Required | Default | Description                                   |
| ----------------------------- | ---------- | -------- | ------- | --------------------------------------------- |
| `regions`                     | `string[]` | Yes      | —       | AWS regions to scan for alarms                |
| `credentials.accessKeyId`     | `string`   | No       | —       | AWS access key ID                             |
| `credentials.secretAccessKey` | `string`   | No       | —       | AWS secret access key                         |
| `credentials.sessionToken`    | `string`   | No       | —       | AWS session token (for temporary credentials) |

## Required Permissions

Minimum IAM policy for read-only access:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["cloudwatch:DescribeAlarms", "cloudwatch:ListTagsForResource"],
      "Resource": "*"
    }
  ]
}
```

`ListTagsForResource` is optional — if denied, alarms are still fetched but without tag enrichment.

## Field Mapping

| AlertDefinition Field | Source                                                                                    |
| --------------------- | ----------------------------------------------------------------------------------------- |
| `id`                  | `generateAlertId('aws-cloudwatch', AlarmArn)`                                             |
| `sourceId`            | `AlarmArn`                                                                                |
| `name`                | `AlarmName`                                                                               |
| `description`         | `AlarmDescription`                                                                        |
| `enabled`             | Always `true` (CloudWatch alarms cannot be disabled)                                      |
| `severity`            | From `severity` tag if present, otherwise `'warning'`                                     |
| `conditionSummary`    | Built from `MetricName`, `ComparisonOperator`, `Threshold`, `Period`, `EvaluationPeriods` |
| `notificationTargets` | Deduplicated union of `OKActions`, `AlarmActions`, `InsufficientDataActions`              |
| `tags`                | Resource tags via `ListTagsForResource`                                                   |
| `owner`               | From `owner` tag if present                                                               |
| `lastModifiedAt`      | `AlarmConfigurationUpdatedTimestamp`                                                      |

## Limitations

- Only fetches metric alarms; composite alarms are not yet supported.
- Severity is inferred from resource tags (`severity` key) — CloudWatch has no native severity field.
- Multi-region scanning is sequential per region.
- Tag enrichment requires one API call per alarm, which may be slow for large alarm counts.

## License

MIT
