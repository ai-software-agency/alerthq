# @alerthq/provider-mongodb-atlas

MongoDB Atlas alert provider for [alerthq](https://github.com/edrv/alerthq).

## Supported Alert Types

| Alert Type           | API Source                                          | Notes                                                        |
| -------------------- | --------------------------------------------------- | ------------------------------------------------------------ |
| Alert Configurations | `GET /api/atlas/v2/groups/{projectId}/alertConfigs` | Includes metric threshold, threshold, and event-based alerts |

All Atlas alert configuration types are fetched, including host, replica set, sharded cluster, and user-defined alerts.

## Authentication

Uses MongoDB Atlas **programmatic API keys** with HTTP Digest authentication.

1. Go to your Atlas organization or project settings
2. Create an API key with the appropriate permissions
3. Note the public key and private key

See: [Atlas API Keys documentation](https://www.mongodb.com/docs/atlas/configure-api-access/)

## Configuration

Add to your `alerthq.yaml`:

```yaml
providers:
  mongodb-atlas:
    enabled: true
    publicKey: your-public-key
    privateKey: your-private-key
    projectIds:
      - 60c7abcd1234567890abcdef
      - 60c7abcd1234567890abcdeg
    # baseUrl: https://cloud.mongodb.com  # optional, for private cloud
    # pageSize: 100                       # optional
```

| Field        | Type       | Required | Default                     | Description                       |
| ------------ | ---------- | -------- | --------------------------- | --------------------------------- |
| `publicKey`  | `string`   | Yes      | —                           | Atlas API public key              |
| `privateKey` | `string`   | Yes      | —                           | Atlas API private key             |
| `projectIds` | `string[]` | Yes      | —                           | Atlas project (group) IDs to scan |
| `baseUrl`    | `string`   | No       | `https://cloud.mongodb.com` | Atlas API base URL                |
| `pageSize`   | `number`   | No       | `100`                       | Number of alerts per API page     |

## Required Permissions

The API key needs the **Project Read Only** role (or higher) on each project listed in `projectIds`.

Minimum required permission: `GROUP_READ_ONLY`

## Field Mapping

| AlertDefinition Field | Source                                                                                                                                                   |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                  | `generateAlertId('mongodb-atlas', id)`                                                                                                                   |
| `sourceId`            | `id` (alert config ID)                                                                                                                                   |
| `name`                | Built from `eventTypeName` + `metricThreshold.metricName`                                                                                                |
| `description`         | Empty string (Atlas alert configs have no description)                                                                                                   |
| `enabled`             | `enabled`                                                                                                                                                |
| `severity`            | `'unknown'` (Atlas has no native severity field)                                                                                                         |
| `conditionSummary`    | Built from `metricThreshold` (metric, operator, threshold, units), `threshold`, and `matchers`                                                           |
| `notificationTargets` | Extracted from `notifications` array by type (EMAIL, SMS, SLACK, WEBHOOK, PAGER_DUTY, DATADOG, OPS_GENIE, VICTOR_OPS, MICROSOFT_TEAMS, TEAM, GROUP, ORG) |
| `tags`                | Empty (Atlas alert configs have no native tags)                                                                                                          |
| `owner`               | Empty string                                                                                                                                             |
| `lastModifiedAt`      | `updated` timestamp                                                                                                                                      |

## Limitations

- Severity is always `'unknown'` — Atlas alert configurations have no native severity concept.
- Description is always empty — the API does not provide a description field.
- Tags are not available — Atlas uses a different labeling model not exposed on alert configs.
- Digest authentication requires two HTTP requests per API call (challenge + authenticated request).

## License

MIT
