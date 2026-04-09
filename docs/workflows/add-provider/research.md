# Provider Research Checklist

Before writing any code for a new provider, research and document answers to every section below. Use web search targeting official documentation.

## 1. SDK / API Access

- [ ] Is there an official npm SDK? (e.g. `@datadog/datadog-api-client`, `@google-cloud/monitoring`)
- [ ] What is the latest stable version?
- [ ] If no SDK, what REST API base URL and version should be used?
- [ ] Does the SDK support ESM (`import`) or only CJS (`require`)?

## 2. Authentication

- [ ] What authentication models are supported? (API key, OAuth2, IAM, service account, bearer token, digest, basic auth)
- [ ] Which model is simplest for a read-only integration?
- [ ] What credentials does the user need to provide in config?
- [ ] Is there a default credential chain (like AWS SDK or Azure DefaultCredential)?

## 3. Alert Definition Endpoints

This is the most critical section. We need endpoints that return alert **definitions** (thresholds, conditions, rules) — NOT alert events or firings.

- [ ] List every API endpoint that returns alert definitions
- [ ] For each endpoint: method, path, request params, response shape
- [ ] What alert types does each endpoint cover? (metric, log, anomaly, uptime, SLO, composite, etc.)
- [ ] Are there alert types we should intentionally skip? Why?

## 4. Response Shapes

For each alert type:

- [ ] What is the response JSON structure?
- [ ] Which field is the unique identifier? (this becomes `sourceId`)
- [ ] Which field is the human-readable name? (this becomes `name`)
- [ ] Which field is the description?
- [ ] How is severity represented? Map to: `critical`, `warning`, `info`, `unknown`
- [ ] How is enabled/disabled status represented?
- [ ] What condition/threshold fields exist? (these build `conditionSummary`)
- [ ] What notification target fields exist? (these become `notificationTargets`)
- [ ] Is there a tags/labels field? (these become `tags`)
- [ ] Is there an owner/creator field?
- [ ] Is there a last-modified timestamp?

## 5. Pagination

- [ ] What pagination model is used? (cursor, offset/limit, page number, next token, async iterator)
- [ ] What is the maximum page size?
- [ ] Is there a default page size?
- [ ] How do you detect the last page?

## 6. Rate Limits

- [ ] What are the API rate limits?
- [ ] Are there per-endpoint limits?
- [ ] What HTTP status code indicates rate limiting? (usually 429)
- [ ] Is there a `Retry-After` header?
- [ ] Do we need custom retry tuning beyond the default `withRetry`?

## 7. Required Permissions

- [ ] What is the minimum read-only permission/role/scope needed?
- [ ] Document the exact IAM policy, API scope, or role name
- [ ] Are there any per-resource permissions needed?

## 8. SDK Installation

- [ ] Exact `pnpm add` command with package name
- [ ] Any additional peer dependencies required?
- [ ] Any native/binary dependencies to be aware of?

## Output

After completing this checklist, you should have enough information to write:
- `types.ts` — config interface + API response DTOs
- `client.ts` — which SDK methods or HTTP calls to make
- `mapper.ts` — how to map every field to `AlertDefinition`
- `README.md` — auth, config, permissions, supported alert types
