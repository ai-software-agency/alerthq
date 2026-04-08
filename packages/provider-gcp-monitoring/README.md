# @alerthq/provider-gcp-monitoring

GCP Cloud Monitoring alert provider for [alerthq](https://github.com/edrv/alerthq).

## Supported Alert Types

| Alert Type | API Source | Notes |
|------------|-----------|-------|
| Metric threshold alerts | `AlertPolicyServiceClient.listAlertPolicies()` via `@google-cloud/monitoring` | Conditions based on metric thresholds (e.g. CPU > 80%) |
| Metric absence alerts | Same API | Conditions that fire when a metric stops reporting |
| Log-based alerts | Same API | Conditions that match log entries (`conditionMatchedLog`) |

## Authentication

Uses Google Application Default Credentials (ADC). Credentials are resolved in this order:

1. Inline `credentials` in config (`client_email` + `private_key`)
2. `keyFilename` pointing to a service account JSON key file
3. `GOOGLE_APPLICATION_CREDENTIALS` environment variable
4. Metadata server (on GCE, Cloud Run, GKE, etc.)
5. `gcloud auth application-default login`

See: [Application Default Credentials documentation](https://cloud.google.com/docs/authentication/application-default-credentials)

## Configuration

Add to your `alerthq.yaml`:

```yaml
providers:
  gcp-monitoring:
    enabled: true
    projectId: my-gcp-project-id
```

With explicit service account key file:

```yaml
providers:
  gcp-monitoring:
    enabled: true
    projectId: my-gcp-project-id
    keyFilename: /path/to/service-account.json
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `projectId` | `string` | Yes | — | GCP project ID to scan for alert policies |
| `keyFilename` | `string` | No | — | Path to a service account JSON key file |
| `credentials` | `object` | No | — | Inline credentials with `client_email` and `private_key` |

## Required Permissions

The authenticated identity needs the **Monitoring Viewer** role (`roles/monitoring.viewer`) on the project. Specifically:

- `monitoring.alertPolicies.list`
- `monitoring.notificationChannelDescriptors.list`

## Field Mapping

| AlertDefinition Field | Source |
|-----------------------|--------|
| `id` | `generateAlertId('gcp-monitoring', policy.name)` |
| `source` | `'gcp-monitoring'` |
| `sourceId` | `policy.name` (full resource name, e.g. `projects/{project}/alertPolicies/{id}`) |
| `name` | `policy.displayName` |
| `description` | `policy.documentation.content` |
| `enabled` | `policy.enabled.value` (BoolValue wrapper, defaults to `true`) |
| `severity` | `policy.severity` mapped: CRITICAL = critical, ERROR = warning, WARNING = info, unset = unknown |
| `conditionSummary` | Built from `policy.conditions` (filter, comparison, threshold) joined by combiner |
| `notificationTargets` | `policy.notificationChannels` resolved to display names via channel lookup |
| `tags` | `policy.userLabels` |
| `owner` | `policy.mutationRecord.mutatedBy` (falls back to `creationRecord.mutatedBy`) |
| `lastModifiedAt` | `policy.mutationRecord.mutateTime` converted to ISO 8601 |

## Limitations

- Only fetches alert policies — uptime check configs use a separate API (`UptimeCheckServiceClient`) and are not included.
- The `severity` field was introduced later in the API; older alert policies may not have it set (mapped to `'unknown'`).
- Notification channel resolution requires the `monitoring.notificationChannelDescriptors.list` permission; if unavailable, raw channel resource names are used as targets.
- The `owner` field uses the last mutator from `mutationRecord`, which may be a service account rather than a human user.

## License

MIT
