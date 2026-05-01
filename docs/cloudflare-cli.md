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
npm run cf:setup:production -- --apply --resources --pages
git diff apps/api/wrangler.production.jsonc
gh api --method PUT repos/ChaiWithJai/annotated-canvas/environments/production
printf '%s' "$CLOUDFLARE_ACCOUNT_ID" | gh secret set CLOUDFLARE_ACCOUNT_ID --env production --body-file -
printf '%s' "$CLOUDFLARE_API_TOKEN" | gh secret set CLOUDFLARE_API_TOKEN --env production --body-file -
gh variable set CLOUDFLARE_DEPLOY_ENABLED --body false
```

Omit `--pages` when the Cloudflare Pages project already exists. If D1 and KV were created outside this script, update `apps/api/wrangler.production.jsonc` with those IDs before enabling the GitHub deploy gate.

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

Cloudflare also supports native Git integrations for Workers Builds and Pages. We can connect this repo in the Cloudflare dashboard later, but the first MVP deploy should still go through GitHub Actions because this repo needs one ordered gate for tests, remote D1 migrations, Worker deploy, web build with the deployed Worker URL, and Pages deploy.

To wire the GitHub production environment and enable the deploy gate from the CLI, export a scoped Cloudflare account ID/token first:

```bash
export CLOUDFLARE_ACCOUNT_ID=...
export CLOUDFLARE_API_TOKEN=...
npm run cf:setup:production -- --apply --github
```

When `--github` is present, the script creates or reuses the GitHub `production` environment, stores Cloudflare credentials there, and enables the repository-level `CLOUDFLARE_DEPLOY_ENABLED` gate. For a more conservative rollout, run the explicit `gh` commands above, keep `CLOUDFLARE_DEPLOY_ENABLED=false`, confirm required reviewers on the `production` environment, then set the gate to `true` only when the account owner approves the first deploy-from-main. Use `CLOUDFLARE_GITHUB_ENVIRONMENT=...` to target a different GitHub environment.

## Required Cloudflare API Token

Create a custom Cloudflare user API token scoped to the single production account. Cloudflare's GitHub Actions documentation requires `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` for non-interactive Wrangler deploys, and Cloudflare recommends scoping tokens down to only the account and zone resources needed.

Required account permissions for this MVP workflow:

| Scope | Permission | Why |
| --- | --- | --- |
| Account | Account Settings: Read | Lets Wrangler resolve account-level settings during deploy. |
| Account | Workers Scripts: Edit | Deploys `annotated-canvas-api` and its bindings. |
| Account | Cloudflare Pages: Edit | Deploys the `annotated-canvas` Pages project. |
| Account | D1: Edit | Applies production D1 migrations. |
| Account | Workers KV Storage: Edit | Reads and manages the production `SESSION_KV` binding. |
| Account | Queues: Edit | Deploys Worker queue producer/consumer bindings. |
| User | User Details: Read | Lets Wrangler identify the token user. |
| User | Memberships: Read | Lets Wrangler verify account membership for user tokens. |

Do not include zone resources for the current `workers.dev` and `pages.dev` deployment. Add `Zone > Workers Routes: Edit` only when a custom domain route is introduced, scoped to that one zone. Add `Account > Workers R2 Storage: Edit` only after R2 is enabled and the production `MEDIA_BUCKET` binding is restored. Durable Object migrations are carried by the Worker deploy; Cloudflare does not expose a separate Durable Objects API-token permission in the current permission table.

Store the token only in the GitHub `production` environment:

```bash
gh api --method PUT repos/ChaiWithJai/annotated-canvas/environments/production
printf '%s' "$CLOUDFLARE_ACCOUNT_ID" | gh secret set CLOUDFLARE_ACCOUNT_ID --env production --body-file -
printf '%s' "$CLOUDFLARE_API_TOKEN" | gh secret set CLOUDFLARE_API_TOKEN --env production --body-file -
gh variable set CLOUDFLARE_DEPLOY_ENABLED --body false
gh secret list --env production
gh variable get CLOUDFLARE_DEPLOY_ENABLED
```

After the production environment has required reviewers and the owner approves deploy-from-main:

```bash
gh variable set CLOUDFLARE_DEPLOY_ENABLED --body true
gh workflow run "CI and Deploy" --ref main -f deploy_production=true
```

`cloudflare_production_preflight` now reports whether the deploy gate, trigger, and visible secret names are ready. The production job repeats the same preflight inside the GitHub `production` environment and fails before any Wrangler command if `CLOUDFLARE_ACCOUNT_ID` or `CLOUDFLARE_API_TOKEN` is missing.

Resource creation and production config patching still need Cloudflare API access through Wrangler. Use this when the target account is available from the CLI:

```bash
npm run cf:setup:production -- --apply --resources --pages
```

Production deploys should normally happen by pushing or merging to `main` after the production config IDs, GitHub environment secrets, and deploy variable are present. The GitHub job deploys the Worker, builds the web client with `VITE_API_BASE_URL` set to the deployed Worker URL, and deploys `dist/web` to Cloudflare Pages. Local deploy remains a fallback and uses the same Worker URL handoff when Wrangler returns a `.workers.dev` URL:

```bash
npm run cf:deploy:production
```

The first production setup created D1 `84bcbb47-3471-4a78-a99d-1f02c19bb2d9`, KV `46ef271ad63242ea86c3a657f05fa556`, Queues `annotated-canvas-jobs` and `annotated-canvas-dlq`, Worker `annotated-canvas-api`, and Pages project `annotated-canvas`. The live URLs are `https://annotated-canvas-api.jaybhagat841.workers.dev` and `https://annotated-canvas.pages.dev`. R2 returned Cloudflare API code `10042` because R2 is not enabled for the account; production omits the R2 binding until the audio-commentary storage issue is completed.

## Dependency Handoff Gates

Full gate sequencing is in `output/reports/gas-town/dependency-gate-map.md`. For the CLI lane, the highest priority external gate is proving deploy-from-main through GitHub Actions:

```bash
export CLOUDFLARE_ACCOUNT_ID=...
export CLOUDFLARE_API_TOKEN=...
npm run cf:setup:production -- --apply --github
gh workflow run "CI and Deploy" --ref main -f deploy_production=true
```

This is HITL-required because the token value and approval to enable `CLOUDFLARE_DEPLOY_ENABLED=true` must come from the account owner. Without those credentials, engineers can still run dry runs, verify workflow conditions, update docs, and confirm the latest verification job status. Keep the repository variable at `false` until the secrets are present and the first production deploy has an assigned reviewer.

Auth and media gates are separate:

- Google callback URL: `https://annotated-canvas-api.jaybhagat841.workers.dev/api/auth/google/callback`.
- X callback URL: `https://annotated-canvas-api.jaybhagat841.workers.dev/api/auth/x/callback`.
- R2 bucket name, if enabled: `annotated-canvas-media`.
- Worker binding to restore after storage exists: `MEDIA_BUCKET`.

OAuth provider secret names are `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `X_CLIENT_ID`, and `X_CLIENT_SECRET`. Do not restore the production R2 binding until R2 is enabled or an alternate storage path has been chosen.

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
- Cloudflare API token permissions: https://developers.cloudflare.com/fundamentals/api/reference/permissions/
- Cloudflare GitHub Actions authentication: https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/
