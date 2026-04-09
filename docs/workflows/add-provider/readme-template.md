# Provider README Template

Use this template for every provider package README. Replace all placeholders and fill in content from research and implementation.

---

```markdown
# @alerthq/provider-<id>

<One-line description> for [alerthq](https://github.com/edrv/alerthq).

## Supported Alert Types

| Alert Type | API Source | Notes |
|------------|-----------|-------|
| <Type 1> | <endpoint or SDK method> | <any caveats> |
| <Type 2> | <endpoint or SDK method> | |

## Authentication

<Describe how to authenticate. Include:>
- Supported auth models (API key, OAuth, IAM, etc.)
- Which model is recommended
- How to generate credentials (link to provider docs)
- Whether a default credential chain is supported

## Configuration

Add to your `alerthq.yaml`:

\`\`\`yaml
providers:
  <id>:
    enabled: true
    <field1>: <example value>
    <field2>: <example value>
\`\`\`

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `<field1>` | `string` | Yes | — | <description> |
| `<field2>` | `string[]` | No | `[]` | <description> |

## Required Permissions

<Minimum read-only permissions needed. Be specific:>
- IAM policy / API scope / role name
- Per-resource vs global permissions
- Link to provider's permission docs

## Field Mapping

How provider-native fields map to the normalized `AlertDefinition` schema:

| AlertDefinition Field | Source |
|-----------------------|--------|
| `id` | `generateAlertId('<id>', <native unique ID field>)` |
| `sourceId` | `<native unique ID field>` |
| `name` | `<native name field>` |
| `description` | `<native description field>` |
| `enabled` | `<native enabled field>` |
| `severity` | `<native severity field>` mapped to critical/warning/info/unknown |
| `conditionSummary` | Built from `<threshold/condition fields>` |
| `notificationTargets` | `<native notification fields>` |
| `tags` | `<native tags/labels field>` |
| `owner` | `<native owner/creator field or empty>` |
| `lastModifiedAt` | `<native timestamp field>` |

## Limitations

- <Any unsupported alert types and why>
- <Known API gaps or quirks>
- <Rate limit considerations>

## License

MIT
```
