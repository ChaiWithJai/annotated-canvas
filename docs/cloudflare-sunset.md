# Cloudflare Sunset Inventory

Date: 2026-05-02

This document records the Cloudflare state at project sunset and final teardown.

## Action Taken

Production deploy mutation from GitHub was disabled first:

```bash
gh variable set CLOUDFLARE_DEPLOY_ENABLED --repo ChaiWithJai/annotated-canvas --body false
gh variable get CLOUDFLARE_DEPLOY_ENABLED --repo ChaiWithJai/annotated-canvas
```

Observed value after the change:

```text
false
```

After owner instruction to fully shut down Cloudflare, the live resources were deleted on 2026-05-02.

## Cloudflare Account

Wrangler authenticated as `jaybhagat841@gmail.com` against account `2cae9fab2f7e6170185b99f8b68d19b7`.

## Live Public Resources

| Resource | Name / URL | State |
| --- | --- | --- |
| Pages project | `annotated-canvas` | Deleted |
| Pages domain | `https://annotated-canvas.pages.dev` | Deleted / no app service |
| Worker | `annotated-canvas-api` | Deleted |
| Worker URL | `https://annotated-canvas-api.jaybhagat841.workers.dev` | Deleted / no app service |
| D1 database | `annotated_canvas` | Deleted |
| KV namespace | `SESSION_KV` | Deleted |
| R2 bucket | `annotated-canvas-media` | Emptied and deleted |
| Queue | `annotated-canvas-jobs` | Deleted |
| Dead-letter queue | `annotated-canvas-dlq` | Deleted |

## Resource IDs

| Binding | Cloudflare resource | ID |
| --- | --- | --- |
| `DB` | D1 `annotated_canvas` | `84bcbb47-3471-4a78-a99d-1f02c19bb2d9` |
| `SESSION_KV` | Workers KV namespace | `46ef271ad63242ea86c3a657f05fa556` |
| `JOBS` | Queue `annotated-canvas-jobs` | `caa0c1e31bda443ea5feff7c62d38aaf` |
| Dead-letter queue | Queue `annotated-canvas-dlq` | `7e6c6fca4b334f22a3b972a99a44fedc` |
| `MEDIA_BUCKET` | R2 `annotated-canvas-media` | name-only binding |

## Secret State

Worker secret inventory before Worker deletion:

```text
[]
```

Repository-level GitHub secrets visible by name:

```text
[]
```

The GitHub Cloudflare deploy variable was also removed after teardown.

Missing/unused auth configuration:

- `VITE_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `X_CLIENT_ID`
- `X_CLIENT_SECRET`

## Teardown Commands Run

```bash
npm exec -- wrangler pages project delete annotated-canvas --yes
npm exec -- wrangler queues consumer remove annotated-canvas-jobs annotated-canvas-api
npm exec -- wrangler delete annotated-canvas-api --config apps/api/wrangler.production.jsonc --force
npm exec -- wrangler d1 delete annotated_canvas --skip-confirmation
npm exec -- wrangler kv namespace delete --namespace-id 46ef271ad63242ea86c3a657f05fa556 --skip-confirmation
npm exec -- wrangler queues delete annotated-canvas-jobs
npm exec -- wrangler queues delete annotated-canvas-dlq
npm exec -- wrangler r2 object delete annotated-canvas-media/audio-commentary/upl_4b3cc552-6aeb-416b-9519-28b05fcd76da.webm --remote
npm exec -- wrangler r2 object delete annotated-canvas-media/audio-commentary/upl_6e6a762c-9e41-49c8-aa41-3fffe4bcb3d5.webm --remote
npm exec -- wrangler r2 object delete annotated-canvas-media/audio-commentary/upl_8024957a-1465-4623-9386-c0d8aee52a1b.webm --remote
npm exec -- wrangler r2 bucket delete annotated-canvas-media
```

GitHub cleanup:

```bash
gh secret delete CLOUDFLARE_ACCOUNT_ID --repo ChaiWithJai/annotated-canvas
gh secret delete CLOUDFLARE_API_TOKEN --repo ChaiWithJai/annotated-canvas
gh secret delete CLOUDFLARE_ACCOUNT_ID --repo ChaiWithJai/annotated-canvas --env production
gh secret delete CLOUDFLARE_API_TOKEN --repo ChaiWithJai/annotated-canvas --env production
gh variable delete CLOUDFLARE_DEPLOY_ENABLED --repo ChaiWithJai/annotated-canvas
```

## Final Verification

Final checks after teardown:

```bash
npm exec -- wrangler pages project list
npm exec -- wrangler deployments list --config apps/api/wrangler.production.jsonc
npm exec -- wrangler d1 list
npm exec -- wrangler kv namespace list
npm exec -- wrangler queues list
npm exec -- wrangler r2 bucket list
gh secret list --repo ChaiWithJai/annotated-canvas
gh secret list --repo ChaiWithJai/annotated-canvas --env production
gh variable list --repo ChaiWithJai/annotated-canvas
```

Observed results:

- Pages project list returned no `annotated-canvas` project.
- Worker deployment lookup returned `This Worker does not exist on your account.`
- D1 list returned `[]`.
- KV namespace list returned no namespaces.
- Queue list returned no queues.
- R2 bucket list returned no buckets.
- GitHub Cloudflare secret and variable lists returned no Cloudflare entries.
- `https://annotated-canvas.pages.dev` returned Cloudflare `530`.
- `https://annotated-canvas-api.jaybhagat841.workers.dev/api/health` returned Cloudflare `404`.

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
