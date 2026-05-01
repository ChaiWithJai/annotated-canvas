# Deployment DevOps Plan

This plan takes the Cloudflare MVP from local Wrangler development to production deployments through GitHub Actions. It assumes the public API Worker remains `annotated-canvas-api` and that the web and extension builds are verified in CI before any Worker deployment is allowed.

## Production Target

- Runtime: Cloudflare Workers, configured locally by `apps/api/wrangler.jsonc` and in production by `apps/api/wrangler.production.jsonc`.
- Data plane: D1 for relational source of truth, KV for short-lived state and caches, R2 for user-owned media and generated assets, Queues plus a dead-letter queue for background jobs, Durable Objects for coordinated counters.
- Deployment source: merges to `main`.
- CI source: every pull request and every push to `main`.
- GitHub environment: `production`, with required reviewer protection enabled before production secrets can be used.

## GitHub Actions Workflow

The workflow in `.github/workflows/ci.yml` has two jobs:

1. `verify` runs on pull requests and pushes to `main`.
2. `deploy-production` runs only after `verify` passes on a push to `main`.

Verification commands:

```bash
npm ci
npm run typecheck
npm test
npm run test:workers
npm run build
```

Production deployment commands:

```bash
npm run cf:migrate:production
npm exec -- wrangler deploy --config apps/api/wrangler.production.jsonc
```

Keep migrations in the deploy job only after the test/build gate. For schema changes, prefer expand-and-contract migrations: deploy additive D1 changes first, deploy compatible code second, and remove old columns or constraints in a later release after the old code path is gone.

## Required GitHub Secrets

Set these in the GitHub `production` environment, not only at repository level:

| Secret | Purpose |
| --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | Account scope for Wrangler deploys and D1 migrations. |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token used by CI. |

The Cloudflare API token should be narrowly scoped. Minimum practical permissions:

- Workers Scripts: Edit
- Workers Routes: Edit, if production uses custom routes
- Account Settings: Read
- D1: Edit
- Workers KV Storage: Edit
- R2: Edit
- Queues: Edit
- Durable Objects: Edit, when applying Durable Object migrations through Worker deploys

Do not put application secrets in `vars` inside `wrangler.jsonc`. Use Wrangler secrets for sensitive values:

```bash
npm exec -- wrangler secret put SESSION_SECRET --config apps/api/wrangler.production.jsonc
npm exec -- wrangler secret put OAUTH_CLIENT_SECRET --config apps/api/wrangler.production.jsonc
```

## Required Cloudflare Resources

Create production resources before enabling the `main` deploy job:

```bash
npm exec -- wrangler d1 create annotated_canvas
npm exec -- wrangler kv namespace create SESSION_KV
npm exec -- wrangler r2 bucket create annotated-canvas-media
npm exec -- wrangler queues create annotated-canvas-jobs
npm exec -- wrangler queues create annotated-canvas-dlq
```

Then update `apps/api/wrangler.production.jsonc` with the generated identifiers:

- `d1_databases[].database_id` for `annotated_canvas`
- `kv_namespaces[].id` for `SESSION_KV`
- preview/staging IDs under `env.preview` or `env.staging` when those environments are added

The local Wrangler file intentionally uses demo values. Production deploys use `apps/api/wrangler.production.jsonc`, which intentionally contains placeholder IDs until Cloudflare resources are created.

## Local And Remote D1 Migrations

Local development:

```bash
npm run cf:migrate:local
npm run cf:dev
```

Remote production:

```bash
npm run cf:migrate:production
```

Operational rules:

- Every schema change gets a numbered SQL file in `apps/api/migrations`.
- CI must run API tests and Worker runtime tests before remote migrations.
- Remote migrations should be backward compatible with the currently deployed Worker.
- Destructive migrations require a separate issue, data backup/export, and an explicit production approval.
- Seed/demo migrations stay in `apps/api/migrations` for local development. Production migrations use `apps/api/migrations/production` and must not seed demo users or demo annotations.

## Queues, R2, KV, And Durable Objects

Queues:

- Producer binding: `JOBS`
- Primary queue: `annotated-canvas-jobs`
- Dead-letter queue: `annotated-canvas-dlq`
- Consumers must be idempotent because Cloudflare Queues can deliver messages more than once.
- Message payloads should include `job_id`, domain id, job type, and schema version.

KV:

- Binding: `SESSION_KV`
- Use only for OAuth state, extension handoff state, feature flags, and cacheable read models.
- Do not use KV as source of truth for publishes, claims, follows, or moderation state.

R2:

- Binding: `MEDIA_BUCKET`
- Bucket: `annotated-canvas-media`
- Store user-owned audio, generated Open Graph images, and optional snapshots.
- Do not copy or transcode third-party source media into R2.

Durable Objects:

- Binding: `ENGAGEMENT_COUNTERS`
- Class: `EngagementCounter`
- Keep object IDs scoped to the smallest coordination unit, such as one annotation, not a global counter.

## Preview And Staging Environments

Initial gate:

- Pull requests run `verify` only.
- No production deploy occurs from pull requests.

Recommended next step:

- Add `env.preview` to `apps/api/wrangler.jsonc` with separate D1, KV, R2, Queue, and Durable Object resources.
- Add a `deploy-preview` job for pull requests after `verify`, targeting the preview Wrangler environment.
- Use a GitHub `preview` environment with lower-risk secrets and no production resource IDs.
- Keep preview D1 disposable; run migrations from scratch or reset it regularly.

Recommended production-like staging:

- Add `env.staging` with durable resources and production-like settings.
- Deploy `main` to staging first.
- Run smoke tests against staging `/api/health`, publish, feed, permalink, and claim paths.
- Promote the same commit to production after staging passes.

## Rollback Strategy

Code rollback:

```bash
npm exec -- wrangler rollback --config apps/api/wrangler.production.jsonc
```

If rollback by Wrangler version is unavailable or insufficient, revert the bad commit and merge the revert to `main`; the deploy workflow will redeploy the previous compatible code.

Data rollback:

- D1 has no casual "undo" for applied migrations. Treat schema rollback as a forward fix unless a tested restore plan exists.
- Before destructive migrations, export or snapshot the affected production data and record the restore command in the migration issue.
- Queue messages already delivered may be retried; rollback code must remain idempotent against existing `queue_idempotency_keys`.

Resource rollback:

- Keep old KV keys and R2 object formats readable for at least one release after deploying a new format.
- Do not delete queues, buckets, KV namespaces, or D1 databases as part of automated rollback.

## Deployment Gates Aligned With The Testing Trophy

Static gate:

- `npm run typecheck`
- Wrangler type generation should be run locally after binding changes: `npm run cf:types`

Unit gate:

- `npm run test:contracts`
- Covered contract examples: clip references, annotation create, claim create, engagement payloads.

Integration gate:

- `npm run test:api`
- API behavior must cover publish, feed, permalink, claim, engagement, idempotency, and validation failures.

Worker runtime gate:

- `npm run test:workers`
- This catches workerd-specific runtime issues before Wrangler deploy.

Build gate:

- `npm run build`
- Builds contracts, web, and extension artifacts.

Manual production approval gate:

- Required GitHub environment reviewer for `production`.
- Reviewer checks migration safety, Cloudflare resource IDs, and whether the release touches P95 trust paths.

Post-deploy smoke gate:

- `GET /api/health`
- Publish annotation with idempotency key.
- Replay same publish request and verify the same annotation is returned.
- Load feed and permalink.
- File a claim and verify content is not automatically removed.
- Enqueue a duplicate background job and verify no duplicate side effects.

## Current Blockers Before First Production Deploy

- `apps/api/wrangler.production.jsonc` needs production `database_id` and KV namespace `id` values.
- Production Cloudflare resources must be created in the target account.
- `APP_ORIGIN`, `SERVICE_MODE`, and `AUTH_MODE` have production-safe values in `apps/api/wrangler.production.jsonc`, but the final origin must be updated after the public web hostname is chosen.
- Preview/staging environments are not yet configured in Wrangler.
- Remote migration execution uses `apps/api/migrations/production`, so `0002_seed_demo.sql` is not part of production deployment.
