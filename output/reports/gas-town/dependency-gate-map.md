# Dependency Gate Map For #22/#26

Generated May 1, 2026 for Worker D. Scope is documentation/evidence only: Cloudflare deploy-from-main, Google/X OAuth app credentials, R2 or alternate storage, and the 240p owned-media policy.

## Current State

- #22: production is live through local Wrangler proof. Worker, Pages, D1, KV, Queues, and public smoke evidence exist. The GitHub Actions deploy job still skips because `CLOUDFLARE_DEPLOY_ENABLED` is not `true` and the GitHub `production` environment does not yet have Cloudflare credentials.
- #24 dependency: production config has `AUTH_MODE=oauth`, but real provider exchange is not done. Current Worker env typing recognizes `GOOGLE_CLIENT_ID` and `X_CLIENT_ID`; #24 still needs no-credential auth hardening and a final secret-name contract for provider secrets before credentials can close the issue.
- #26: audio upload can return an intent and stores to R2 only when `MEDIA_BUCKET` exists. Production intentionally omits `MEDIA_BUCKET` because `wrangler r2 bucket create annotated-canvas-media --location enam` failed with Cloudflare API code `10042`, meaning R2 is not enabled for the account.
- Submission packet: live URLs and smoke proof exist, but final bounty submission must either finish or disclose real OAuth, exact capture proof, audio storage, and 240p owned-media limitations.

## Sequenced Gates

| Gate | Dependency | Can proceed without credentials | HITL-required input | Done when | Blocks |
| --- | --- | --- | --- | --- | --- |
| 0 | Repo evidence preflight | Keep docs, issue comments, smoke commands, and known-limitations packet current. Verify latest CI run and config names. | None. | The dependency map and issue comments identify exact blockers. | Prevents ambiguous handoffs. |
| 1 | Cloudflare deploy-from-main for #22 | Keep `npm run cf:setup:production -- --github` dry-run docs current. Confirm production config has real D1/KV IDs. Confirm workflow condition still gates on `CLOUDFLARE_DEPLOY_ENABLED`. | Cloudflare account ID and scoped API token. Approval to store both as GitHub `production` environment secrets and set repo variable `CLOUDFLARE_DEPLOY_ENABLED=true`. | A push or manual `gh workflow run "CI and Deploy" --ref main -f deploy_production=true` runs the deploy job instead of skipping, and post-deploy smoke passes. | #22 close. Final submission confidence. |
| 2 | Google/X OAuth apps and secrets for #24 | Worker A/B can finish fail-closed auth behavior, state replay protection, token/profile mocking, session lookup/create, extension-token auth, and tests without provider credentials. Docs can list callback URLs. | Google OAuth app and X OAuth app with client IDs/secrets, authorized callback URLs, approved scopes, and permission to install provider config as Worker/GitHub secrets. | Production `/api/auth/google/start` and `/api/auth/x/start` redirect to providers, callbacks exchange codes, sessions are created, and extension handoff is smoke-tested. | Account-via-X/Google bounty criterion. |
| 3 | R2 enablement or alternate audio storage for #26 | Keep third-party media source-linked. Harden upload validation and metadata/finalize tests in code lanes without production storage. Document truthful `intent-created` fallback. | Enable R2 on the Cloudflare account, or choose an alternate storage provider/path for audio commentary. If R2: approve bucket `annotated-canvas-media` and production binding `MEDIA_BUCKET`. | `POST /api/uploads/audio-commentary` returns `stored` or a real finalized asset path in production, and permalink playback/loading is proven. | Audio commentary storage and #26 close. |
| 4 | 240p owned-media policy for #26 | Document the rights-safe default: third-party media is never copied or transcoded; it is referenced by original source URL plus start/end time. Draft owned-upload acceptance tests and disclosure copy. | Product/legal decision for owned uploads: whether owned video is in MVP, whether originals may be retained, whether the served rendition must be capped at 240p or merely below 480p, and which service enforces that policy. | Submission packet states the final policy, and any owned-video demo either serves only the approved low-resolution rendition or is explicitly out of scope. | 240p/sub-480p bounty criterion. |
| 5 | Final submission gate | Keep the packet honest with current live URLs, smoke IDs, and known limitations. | Human approval to submit with either completed gates or explicit limitations. | `docs/submission-packet.md` matches the real deployed state and is posted to `annotated.lovable.app`. | #28 and #21 rollup. |

## Exact Human Inputs Needed

1. Cloudflare deployment credential handoff:
   - `CLOUDFLARE_ACCOUNT_ID` for the account that owns `annotated-canvas-api`, `annotated-canvas`, `annotated_canvas`, and `SESSION_KV`.
   - A scoped `CLOUDFLARE_API_TOKEN` with Workers Scripts edit, Pages edit, D1 edit, KV edit, Queues edit, R2 edit if R2 will be enabled, Account Settings read, and Durable Objects migration permissions through Worker deploy.
   - Approval to store those values in the GitHub `production` environment and to set repository variable `CLOUDFLARE_DEPLOY_ENABLED=true`.
   - Approval to trigger or wait for the next `main` deploy workflow and run public smoke checks afterward.

2. Google OAuth app handoff:
   - Google OAuth client ID and client secret for production.
   - Authorized redirect URI: `https://annotated-canvas-api.jaybhagat841.workers.dev/api/auth/google/callback`.
   - Approved scopes: `openid email profile`.
   - Confirmation of the production app/homepage URL: `https://annotated-canvas.pages.dev`.

3. X OAuth app handoff:
   - X OAuth client ID and client secret for production.
   - Authorized callback URL: `https://annotated-canvas-api.jaybhagat841.workers.dev/api/auth/x/callback`.
   - Approved scopes matching the route contract: `users.read tweet.read`.
   - Confirmation whether X requires PKCE-only public-client handling or a confidential client secret for this app. #24 must align code and secret names before install.

4. Storage decision:
   - Either enable Cloudflare R2 for the account and approve bucket `annotated-canvas-media`, or name the alternate storage path for recorded audio commentary.
   - Decide whether commentary audio assets are public, signed, or proxied through the Worker.
   - If R2 is enabled, approve restoring the production `MEDIA_BUCKET` binding and running a production deploy.

5. Owned-media 240p policy:
   - Confirm that third-party YouTube/news/podcast/video clips stay reference-only and are not copied into R2/Stream.
   - Decide whether owned video upload is included in the MVP submission.
   - If included, specify the enforcement rule: reject >240p input, store original privately and serve a <=240p rendition, or use another under-480p rule.
   - Provide the disclosure wording for the bounty packet if owned-video processing is not completed before submission.

## Close Criteria By Issue

- #22 can close after deploy-from-main is proven by GitHub Actions and public smoke passes from that deployed commit.
- #24 can close only after no-credential auth hardening lands and real Google/X provider flows are configured and smoke-tested.
- #26 can close only after production audio storage/finalize works and the 240p owned-media policy is implemented or explicitly scoped with accepted disclosure.
- #28/#21 should not close while any bounty-critical gate is unfinished or undisclosed.

## GitHub Comments Posted

- #22 deploy-from-main gate: https://github.com/ChaiWithJai/annotated-canvas/issues/22#issuecomment-4357654808
- #26 R2/audio/240p gate: https://github.com/ChaiWithJai/annotated-canvas/issues/26#issuecomment-4357655205
- #24 cross-lane OAuth dependency note: https://github.com/ChaiWithJai/annotated-canvas/issues/24#issuecomment-4357655497
