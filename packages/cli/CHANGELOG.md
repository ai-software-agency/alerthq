# @alerthq/cli

## 1.0.0

### Minor Changes

- 5b7b7a9: Initial release: unified CLI for cloud alert definitions with sync, diff, tag, and export. Includes providers for AWS CloudWatch, Datadog, GCP Monitoring, Grafana, Elastic, MongoDB Atlas, and Azure Monitor. Storage backends for SQLite and PostgreSQL. Retry resilience, config validation via Zod, graceful shutdown, and comprehensive test coverage.

### Patch Changes

- Updated dependencies [5b7b7a9]
  - @alerthq/core@1.0.0
  - @alerthq/storage-sqlite@1.0.0
  - @alerthq/storage-postgresql@1.0.0
  - @alerthq/provider-aws-cloudwatch@1.0.0
  - @alerthq/provider-elastic@1.0.0
  - @alerthq/provider-mongodb-atlas@1.0.0
  - @alerthq/provider-azure-monitor@1.0.0
  - @alerthq/provider-datadog@1.0.0
  - @alerthq/provider-gcp-monitoring@1.0.0
  - @alerthq/provider-grafana@1.0.0
