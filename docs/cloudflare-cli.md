# Cloudflare GitHub And CLI Setup

This repo treats GitHub Actions as the primary production deployment control plane for Cloudflare. Wrangler is still the implementation CLI used by Actions, and it remains the local tool for validation, D1 migrations, resource bootstrap, and fallback deploys.

## Installed Tooling

- `wrangler` for Workers, D1, KV, R2, Queues, and type generation.
- `@cloudflare/workers-types` for Worker binding types.
- `@cloudflare/vitest-pool-workers` reserved for Worker-runtime integration tests as the service split matures.

## Commands

GitHub-first production setup:

```bash
gh auth status
export CLOUDFLARE_ACCOUNT_ID=...
export CLOUDFLARE_API_TOKEN=...
npm run cf:setup:production -- --apply --github
```

Add `--pages` only when the Cloudflare Pages project should be created from this bootstrap script. If the Pages project is already connected to GitHub in Cloudflare, leave it out and keep the Worker deploy controlled by `.github/workflows/ci.yml`.

Local verification and fallback commands:

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

## GitHub-First Production Bootstrap

Cloudflare production deploys should run from GitHub. GitHub Actions is the control plane for deploying `main`; Wrangler stays in the repo for local verification, resource discovery, migrations, and fallback deploys.

To wire the GitHub production environment and enable the deploy gate from the CLI, export a scoped Cloudflare account ID/token first:

```bash
export CLOUDFLARE_ACCOUNT_ID=...
export CLOUDFLARE_API_TOKEN=...
npm run cf:setup:production -- --apply --github
```

When `--github` is present, the script creates or reuses the GitHub `production` environment, stores Cloudflare credentials there, and enables the repository-level `CLOUDFLARE_DEPLOY_ENABLED` gate. Use `CLOUDFLARE_GITHUB_ENVIRONMENT=...` to target a different GitHub environment. Configure required reviewers for that environment in GitHub repo settings before enabling unattended production deploys.

Resource creation and production config patching still need Cloudflare API access through Wrangler. Use this when the target account is available from the CLI:

```bash
npm run cf:setup:production -- --apply --resources --pages
```

Production deploys should normally happen by pushing or merging to `main` after the production config IDs, GitHub environment secrets, and deploy variable are present. Local deploy remains a fallback:

```bash
npm run cf:deploy:production
```

Local OAuth is optional and mainly useful when an engineer wants an interactive fallback session:

```bash
npm exec -- wrangler login
```

The script does not require local Wrangler auth when it is only wiring GitHub secrets with `--github`. It does require Wrangler auth or token-based access when creating Cloudflare resources, applying migrations, patching production IDs, or doing a fallback local deploy.

## Service Split Rule

The first Worker runs services in-process so local development stays simple. When throughput or ownership requires a split, add internal Workers through Service bindings and keep the public REST routes stable.

## References

- Wrangler configuration: https://developers.cloudflare.com/workers/wrangler/configuration/
- Workers testing with Vitest: https://developers.cloudflare.com/workers/testing/vitest-integration/
- Queues JavaScript APIs: https://developers.cloudflare.com/queues/configuration/javascript-apis/
- Queues dead-letter queues: https://developers.cloudflare.com/queues/configuration/dead-letter-queues/
- D1 Worker API: https://developers.cloudflare.com/d1/worker-api/d1-database/
