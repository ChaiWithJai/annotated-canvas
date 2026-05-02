# Annotated Canvas Sunset Postmortem

## Incident Metadata

- Incident ID: `AC-SUNSET-2026-05-02`
- Date: 2026-05-02
- Severity: `SEV-2 delivery failure`
- Class: governance near-miss with direct product impact
- Status: sunset and archived
- Customer impact: `direct`

## Executive Summary

Annotated Canvas reached a deployed MVP but did not reach a credible full bounty submission. The web client, Chrome extension scaffold, REST API, D1-backed feed/permalink/comment/claim flows, R2-backed audio upload path, and Cloudflare deploy pipeline were implemented. The project failed at the final delivery bar because production authentication remained unconfigured and the experience repeatedly exposed incomplete auth states to reviewers.

The decisive failure was not one missing secret. It was that the project continued to accumulate implementation and documentation while the highest-risk external dependency, real production sign-in with Google/X or Clerk, remained unresolved. That created a mismatch between the shipped surface and the claim we wanted to make.

On 2026-05-02 the production deploy gate was disabled by setting `CLOUDFLARE_DEPLOY_ENABLED=false`. Cloudflare resources were inventoried and left in place for audit and recovery. No Cloudflare data or production resources were deleted in this shutdown pass.

## Customer / Business Impact

Customer-facing effects:

- Visitors could browse the public web client and feed.
- Reviewers could see source-linked annotations, claims, comments, and extension install guidance.
- Reviewers could not complete real production sign-in because the Clerk/provider configuration was not installed.
- Earlier production builds showed active Google/X sign-in buttons even when production sign-in was not usable.

Business/system risk:

- The product could not honestly claim full bounty compliance.
- The team risked spending more time producing docs, screenshots, and issue choreography than resolving the core external account gate.
- The live Cloudflare deployment could continue changing on pushes to `main` until the deploy gate was disabled.

No data deletion was performed. The system remains available as an archived MVP unless the owner separately chooses to delete Cloudflare resources.

## Detection and Timeline

| Time | Event | Evidence |
| --- | --- | --- |
| 2026-05-01 | Production Cloudflare resources and deploy pipeline were created. | `docs/cloudflare-cli.md`; D1 `84bcbb47-3471-4a78-a99d-1f02c19bb2d9`; KV `46ef271ad63242ea86c3a657f05fa556`; Worker `annotated-canvas-api`; Pages `annotated-canvas`. |
| 2026-05-02 | OAuth work was changed toward Clerk. | Commit `b365523 Use Clerk for production auth`. |
| 2026-05-02 | Legacy OAuth callback without state returned `oauth_state_required` in production. | Fixed by commit `f8e7ed2 Guard legacy OAuth routes in Clerk mode`; `apps/api/src/app.ts:246`. |
| 2026-05-02 | Production signup still showed active provider buttons without Clerk client configuration. | Fixed by commit `d266521 Hide auth buttons until Clerk is configured`; `apps/web/src/api.ts:101`; `apps/web/src/App.tsx:157`. |
| 2026-05-02T18:39:37Z | Project sunset was accepted. | This document. |
| 2026-05-02T18:39:37Z | Production mutation was frozen. | GitHub variable `CLOUDFLARE_DEPLOY_ENABLED=false`. |

## Thread of Execution

Reviewer sign-in path:

1. Web signup renders provider actions from `apps/web/src/App.tsx`.
2. Auth start calls `startAuth` in `apps/web/src/api.ts:95`.
3. If Clerk client config is missing, the client now throws `clerk_client_not_configured` at `apps/web/src/api.ts:101`.
4. The Worker runs in `AUTH_MODE=clerk` from `apps/api/wrangler.production.jsonc`.
5. Legacy provider routes fail closed through `clerkSetupError` at `apps/api/src/app.ts:246`.
6. Stale legacy callbacks redirect to `/signup?auth_error=clerk_required` through `legacyOAuthCallbackRedirect` at `apps/api/src/app.ts:254`.

Capture and publish path:

1. Extension side panel reads pending capture/current tab context in `apps/extension/src/sidepanel/SidePanel.tsx:86`.
2. It validates media ranges before publish in `apps/extension/src/sidepanel/SidePanel.tsx:158`.
3. Web composer creates text or time-range annotations in `apps/web/src/App.tsx:479`.
4. API validates/persists annotations through `apps/api/src/app.ts` and the D1 repository.
5. Feed, permalink, comments, and claims render in the public web client.

Cloudflare deploy path:

1. GitHub Actions runs verify, then Cloudflare preflight.
2. Deployment only proceeds when `CLOUDFLARE_DEPLOY_ENABLED=true`.
3. On sunset, the gate was changed to `false`, leaving verification active while disabling production mutation.

## Root Cause Analysis

| Surface | Problem | Evidence anchors | Code-smell label | Code Complete challenge class | Counter-signal |
| --- | --- | --- | --- | --- | --- |
| Auth | External identity setup was treated as an implementation task even though it required account/provider ownership. | Open issues #24 and #50; no Worker secrets from `wrangler secret list`; no repo secret `VITE_CLERK_PUBLISHABLE_KEY`. | Hidden external dependency | Integration boundary | The code now fails closed and no longer exposes active dead buttons. |
| UX | The UI allowed reviewers to click sign-in buttons for a deployment that could not sign in. | `apps/web/src/api.ts:101`; `apps/web/src/App.tsx:157`; commit `d266521`. | False affordance | State modeling | The production signup page now shows `Sign-in setup pending`. |
| Delivery governance | The project kept expanding docs/issues/subagents while the P0 auth gate remained unresolved. | Open issues #21, #24, #50; submission packet disclosed auth blocker. | Work-in-progress inflation | Requirements triage | The open blockers were publicly tracked and labeled. |
| Cloudflare operations | Deploy-from-main remained enabled after the project was no longer pursuing submission. | GitHub variable was `true`; changed to `false` during sunset. | Unsafe default after abandonment | Release control | CI verification remains intact without mutating production. |

## Stochastic Lens

The project had high semantic drift risk: "auth is implemented", "auth is configured", and "reviewer can sign in" sounded similar but represented different system states. Each round of changes reduced one symptom while leaving the external configuration dependency unresolved.

The same drift appeared in the bounty packet. A feature could be locally scaffolded, tested through contracts, or deployed to Cloudflare, but the bounty required a user-complete experience. The correct unit of truth was the reviewer journey, not the number of closed issues.

## Inversion Lens

How to guarantee this failure happens again:

- Keep building feature surfaces while a P0 external credential gate is unresolved.
- Let UI buttons represent intent instead of verified capability.
- Treat a screenshot, issue comment, or docs packet as equivalent to a working user journey.
- Keep production deploy mutation enabled after the project is no longer actively maintained.
- Avoid a single hard "submit/no-submit" checkpoint with owner sign-off.

Controls that prevent that path:

- Require provider credentials and a successful production sign-in smoke before any auth-dependent bounty claim.
- Hide or disable incomplete capabilities by default.
- Make issue closure depend on user-journey proof, not implementation presence.
- Freeze deploy gates when a project is sunset.
- Keep a Cloudflare resource inventory and teardown runbook separate from destructive deletion.

## Mitigations + Corrective Actions

Patches already landed:

| Change | Why | Evidence |
| --- | --- | --- |
| Clerk-mode legacy OAuth routes now fail closed or redirect. | Prevent raw `oauth_state_required` from stale provider routes. | Commit `f8e7ed2`; `apps/api/src/app.ts:246`. |
| No-Clerk web client hides live Google/X buttons. | Prevent a dead production action from appearing actionable. | Commit `d266521`; `apps/web/src/api.ts:101`; `apps/web/src/App.tsx:157`. |
| Production deploy gate disabled. | Prevent accidental Cloudflare mutation after sunset. | GitHub variable `CLOUDFLARE_DEPLOY_ENABLED=false`. |

Remaining actions if the project is ever revived:

| Action | Owner | Status | Due date |
| --- | --- | --- | --- |
| Choose Clerk or direct OAuth as the only auth strategy. | Product/engineering owner | Not planned | None |
| Install production auth secrets and prove sign-in from web and extension. | Account owner | Not planned | None |
| Run a full cold-traffic reviewer smoke in Chrome from the public site through extension publish and return. | Engineering owner | Not planned | None |
| Decide whether to delete Cloudflare resources or preserve the archive. | Account owner | Pending owner decision | None |

## Governance RFC: Sunset Controls

- Status: accepted for archive
- Date: 2026-05-02
- Owner: repository owner
- Related incidents: `AC-SUNSET-2026-05-02`

### Problem Statement

[PM COMMENT] The project reached "deployed MVP" but not "bounty-ready product". The governance failure was allowing those states to blur.

[PRE-MORTEM] If the project is revived without a hard external-credential checkpoint, it will repeat the same loop: more UI/docs, same incomplete sign-in.

### Goals / Non-Goals

Goals:

- Freeze production mutation.
- Preserve enough evidence for audit and learning.
- Close or clearly mark open work as not planned.
- Keep a reversible Cloudflare inventory.

Non-goals:

- Do not claim bounty completion.
- Do not delete production resources without separate owner confirmation.
- Do not keep filing implementation tickets after the sunset decision.

### Proposed Decision

- Treat Annotated Canvas as archived.
- Keep the public Cloudflare deployment available only as an evidence artifact.
- Disable deploy-from-main by setting `CLOUDFLARE_DEPLOY_ENABLED=false`.
- Close open bounty/auth/marketing issues as not planned with a link to this postmortem.

[PM COMMENT] The closure criterion is clarity, not another build.

[PRE-MORTEM] If open issues remain active, the project will look alive and invite more partial fixes.

### SDLC Guardrails

- CI checks may continue to run, but production deploys must remain gated off.
- Any revival must start with an auth strategy decision and production sign-in proof.
- A revived bounty submission must include a fresh demo recording and a fresh checklist against `bounty.txt`.
- Any destructive Cloudflare cleanup must be executed from a separate, explicit teardown issue.

[PRE-MORTEM] Advisory controls will fail under delivery pressure. The deploy gate must remain machine-enforced.

### Success Metrics

- `CLOUDFLARE_DEPLOY_ENABLED=false`.
- All open issues closed or explicitly marked archived/not planned.
- Postmortem committed to `main`.
- No new Cloudflare deployments after the sunset commit unless explicitly reactivated.

## Evidence Provenance

- Latest main before sunset: `d266521 Hide auth buttons until Clerk is configured`.
- Auth route guard: `apps/api/src/app.ts:246`.
- Legacy callback redirect: `apps/api/src/app.ts:254`.
- Client auth config guard: `apps/web/src/api.ts:101`.
- Signup auth error copy: `apps/web/src/App.tsx:157`.
- Web composer: `apps/web/src/App.tsx:479`.
- Extension capture read: `apps/extension/src/sidepanel/SidePanel.tsx:86`.
- Extension 90-second validation: `apps/extension/src/sidepanel/SidePanel.tsx:158`.
- Production Worker config: `apps/api/wrangler.production.jsonc`.
- Cloudflare inventory: `docs/cloudflare-sunset.md`.
