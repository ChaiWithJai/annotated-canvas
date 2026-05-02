# Cloudflare Sunset Inventory

Date: 2026-05-02

This document records the Cloudflare state at project sunset. It is intentionally non-destructive. The production deployment is frozen from GitHub, but Cloudflare resources are left in place for audit, rollback, and owner-controlled deletion.

## Action Taken

Production deploy mutation from GitHub was disabled:

```bash
gh variable set CLOUDFLARE_DEPLOY_ENABLED --repo ChaiWithJai/annotated-canvas --body false
gh variable get CLOUDFLARE_DEPLOY_ENABLED --repo ChaiWithJai/annotated-canvas
```

Observed value after the change:

```text
false
```

## Cloudflare Account

Wrangler authenticated as `jaybhagat841@gmail.com` against account `2cae9fab2f7e6170185b99f8b68d19b7`.

## Live Public Resources

| Resource | Name / URL | State |
| --- | --- | --- |
| Pages project | `annotated-canvas` | Present |
| Pages domain | `https://annotated-canvas.pages.dev` | Present |
| Worker | `annotated-canvas-api` | Present |
| Worker URL | `https://annotated-canvas-api.jaybhagat841.workers.dev` | Present |
| D1 database | `annotated_canvas` | Present |
| KV namespace | `SESSION_KV` | Present |
| R2 bucket | `annotated-canvas-media` | Present |
| Queue | `annotated-canvas-jobs` | Present |
| Dead-letter queue | `annotated-canvas-dlq` | Present |

## Resource IDs

| Binding | Cloudflare resource | ID |
| --- | --- | --- |
| `DB` | D1 `annotated_canvas` | `84bcbb47-3471-4a78-a99d-1f02c19bb2d9` |
| `SESSION_KV` | Workers KV namespace | `46ef271ad63242ea86c3a657f05fa556` |
| `JOBS` | Queue `annotated-canvas-jobs` | `caa0c1e31bda443ea5feff7c62d38aaf` |
| Dead-letter queue | Queue `annotated-canvas-dlq` | `7e6c6fca4b334f22a3b972a99a44fedc` |
| `MEDIA_BUCKET` | R2 `annotated-canvas-media` | name-only binding |

## Secret State

Worker secret inventory at sunset:

```text
[]
```

Repository-level GitHub secrets visible by name:

```text
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_API_TOKEN
```

Missing/unused auth configuration:

- `VITE_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `X_CLIENT_ID`
- `X_CLIENT_SECRET`

## Why Resources Were Not Deleted

Deletion is irreversible for useful audit artifacts and may destroy evidence that explains the project outcome. The safe sunset action is to freeze deployment first, write the inventory, close work as not planned, and let the account owner decide whether to remove Cloudflare resources later.

## Optional Owner Teardown Commands

Run these only after exporting the right account credentials and confirming the archive is no longer needed.

```bash
npm exec -- wrangler pages project delete annotated-canvas
npm exec -- wrangler delete annotated-canvas-api --config apps/api/wrangler.production.jsonc
npm exec -- wrangler d1 delete annotated_canvas
npm exec -- wrangler kv namespace delete --namespace-id 46ef271ad63242ea86c3a657f05fa556
npm exec -- wrangler queues delete annotated-canvas-jobs
npm exec -- wrangler queues delete annotated-canvas-dlq
npm exec -- wrangler r2 bucket delete annotated-canvas-media
```

Before running teardown, also remove or rotate GitHub secrets:

```bash
gh secret delete CLOUDFLARE_ACCOUNT_ID --repo ChaiWithJai/annotated-canvas
gh secret delete CLOUDFLARE_API_TOKEN --repo ChaiWithJai/annotated-canvas
```

## Revival Checklist

If the project is revived, do not start by adding more UI. Start with:

1. Choose one production auth strategy.
2. Install required provider/Clerk secrets.
3. Prove web sign-in on `https://annotated-canvas.pages.dev`.
4. Prove extension handoff from an unpacked Chrome extension.
5. Re-enable deploys only after a successful production smoke:

```bash
gh variable set CLOUDFLARE_DEPLOY_ENABLED --repo ChaiWithJai/annotated-canvas --body true
```
