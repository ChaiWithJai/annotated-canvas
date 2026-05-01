# Cloudflare CLI Setup

This repo is prepared for Cloudflare-first local and remote development through Wrangler.

## Installed Tooling

- `wrangler` for Workers, D1, KV, R2, Queues, and type generation.
- `@cloudflare/workers-types` for Worker binding types.
- `@cloudflare/vitest-pool-workers` reserved for Worker-runtime integration tests as the service split matures.

## Commands

```bash
npm install
npm run cf:whoami
npm run cf:types
npm run cf:dev
npm run cf:migrate:local
npm run cf:migrate:remote
npm run cf:queues:create
npm run cf:setup:production
npm run cf:deploy:production
```

`apps/api/wrangler.jsonc` is the source of truth for the public API Worker. It includes D1, KV, R2, Queue, Durable Object, observability, and future service-binding placeholders.

## Resource Model

- `DB`: D1 source of truth for users, sources, clips, annotations, follows, claims, engagement events, and queue idempotency.
- `SESSION_KV`: short-lived OAuth state, extension handoff state, feature flags, and hot read caches.
- `MEDIA_BUCKET`: user-owned audio, generated OG images, and optional snapshots only.
- `JOBS`: feed fanout, claim notices, metadata refresh, and post-publish background jobs.
- `ENGAGEMENT_COUNTERS`: per-annotation coordination where a D1 event log alone is not enough.

## Production Bootstrap

`npm run cf:setup:production` runs `scripts/cloudflare/setup-production.mjs`. By default it performs a dry run and verifies Wrangler authentication. Add `-- --apply` to create or reuse Cloudflare resources and patch `apps/api/wrangler.production.jsonc` with generated D1/KV IDs.

```bash
npm exec -- wrangler login
npm run cf:setup:production -- --apply --pages
```

To deploy after resources are created:

```bash
npm run cf:deploy:production
```

To wire GitHub Actions from the CLI, export a scoped Cloudflare account ID/token first, then let the script set repository secrets and enable the deploy gate:

```bash
export CLOUDFLARE_ACCOUNT_ID=...
export CLOUDFLARE_API_TOKEN=...
npm run cf:setup:production -- --apply --github
```

The script intentionally refuses to proceed until `wrangler whoami` succeeds. This prevents partially configured production files from being committed with placeholder or guessed resource IDs.

## Service Split Rule

The first Worker runs services in-process so local development stays simple. When throughput or ownership requires a split, add internal Workers through Service bindings and keep the public REST routes stable.

## References

- Wrangler configuration: https://developers.cloudflare.com/workers/wrangler/configuration/
- Workers testing with Vitest: https://developers.cloudflare.com/workers/testing/vitest-integration/
- Queues JavaScript APIs: https://developers.cloudflare.com/queues/configuration/javascript-apis/
- Queues dead-letter queues: https://developers.cloudflare.com/queues/configuration/dead-letter-queues/
- D1 Worker API: https://developers.cloudflare.com/d1/worker-api/d1-database/
