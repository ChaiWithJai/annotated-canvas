# Bounty Gap Audit

Source: `bounty.txt`, captured from the April 30, 2026 Annotated bounty thread.

This audit is intentionally reviewer-facing: it separates what works now from what is deployed with limitations, what is blocked by human-owned credentials or platform switches, and what is not yet implemented. It should be read together with `docs/submission-packet.md`.

## Status Legend

- **Working now**: implemented and backed by local or production evidence.
- **Deployed but limited**: public URL exists, but the feature is demo/fallback/partial and must not be presented as complete.
- **Blocked by human credentials/secrets**: repo work can continue, but final proof needs external account setup, secrets, or platform enablement.
- **Not yet implemented**: missing product/code/policy work remains.

## Current State

- The repository is public: `https://github.com/ChaiWithJai/annotated-canvas`.
- Production is live through local Wrangler deployment:
  - Web: `https://annotated-canvas.pages.dev`
  - API health: `https://annotated-canvas-api.jaybhagat841.workers.dev/api/health`
- GitHub Actions verification is green after PR #31, but deploy-from-main is still gated off because Cloudflare GitHub secrets and `CLOUDFLARE_DEPLOY_ENABLED=true` are not installed.
- The Chrome extension builds to `dist/extension`, loads unpacked locally, opens as an MV3 side panel, saves an API base URL, and has local current-tab publish evidence.
- PR #31 fixed the inert sign-in UI and deployed the safer production state: Google/X buttons now surface `auth_not_configured` instead of doing nothing or minting fake production sessions.
- Real OAuth provider exchange, production extension p95 smoke, durable recorded-audio storage, and owned-media 240p policy remain open.

## Bounty Requirement Matrix

| Bounty requirement | Status bucket | Current evidence | Remaining gap | Delivery issue |
| --- | --- | --- | --- | --- |
| Sidebar Chrome extension | Working now | `dist/extension` loads unpacked; side panel opens; local publish proof in #30. | Production API-base publish and p95 capture evidence. | #30, #23 |
| Highlight and clip media from any website | Deployed but limited | Current-tab URL/title, selected-text path, and media time-range controls exist. | Exact selected text and real media `currentTime` must be proven against production payloads. | #23, #30 |
| Add commentary and annotations | Deployed but limited | Text commentary publishes; public annotation/comment/claim smoke exists. | Recorded audio commentary is not durably stored in production. | #26 |
| Landing page linking back to original source | Working now | Public permalink exists and API returns canonical Pages `permalink_url`. | Continue to verify every created annotation carries `source_url`. | #21, #28 |
| Public social feed | Working now | Public feed and profile routes return `200`; production annotation/comment smoke exists. | Final packet should use fresh proof immediately before external submission. | #28 |
| Follow and engage with annotations | Working now | Comments and engagement paths are implemented; follow UI was wired to API before PR #31 merge. | Include follow/comment proof in final demo, not only local tests. | #23, closed #25 |
| Account via X or Google | Blocked by human credentials/secrets | Production now fails closed with visible not-configured messages when provider secrets are absent. | Google/X apps, client secrets, token exchange, user/session creation, extension handoff. | #24 |
| URL input or current page | Deployed but limited | Web URL composer and extension current-page capture exist. | Production extension publish and exact payload evidence still required. | #23, #30 |
| Prompt for start/end or text section | Deployed but limited | UI/API support text quote and media start/end; API rejects invalid duration. | Browser proof must show user-entered values are the values sent and stored. | #23, #30 |
| Max clip size 90 seconds | Working now | Contract/API tests reject media over 90 seconds; browser plan records client-side proof requirement. | p95 proof that extension blocks before production network request. | #30 |
| Downgrade clip to 240p / below 480p | Not yet implemented | Current MVP keeps third-party media source-linked by reference and avoids copying third-party bytes. | Human product/legal decision and owned-upload processing rule are required. | #26 |
| Text or recorded audio commentary | Deployed but limited | Text works; audio upload endpoint returns an intent when R2 is unavailable. | R2 or alternate storage, finalize semantics, permalink playback/loading proof. | #26 |
| Users can leave comments | Working now | Public smoke created `cmt_73c82db2-d4db-4661-b92e-84b12b4e74e7`. | Re-run before final submission if the seed data changes. | closed #25, #28 |
| File a claim | Working now | Public smoke created `claim_36899790-f89f-4add-9744-046b5b46c3f3` and annotation remained public. | Final demo should explain claim is notice intake, not automatic takedown. | closed #27, #28 |
| All content links to original source | Working now | Third-party clip contracts require `source_url`; permalink shows original source link. | Keep this invariant in extension p95 evidence. | #21, #23 |
| Submit to annotated.lovable.app | Deployed but limited | Reviewer packet has live URLs, demo script, and honest blocker list. | Human decision to submit with disclosed gaps or wait for #22/#24/#26/#30. | #28 |

## Issue Acceptance Criteria

### #21 Bounty Gap Audit And Submission Readiness

- [ ] Gap audit and submission packet use the same status buckets.
- [ ] Every open bounty gap links to a child issue or explicit product decision.
- [ ] Final submission language distinguishes live MVP evidence from unfinished bounty-critical criteria.
- [ ] Close only after #22/#23/#24/#26/#28/#30 are completed or deliberately disclosed by the submitter.

Learning notes:

- **Developer/user must understand**: a live MVP is not the same thing as a complete bounty claim.
- **Pitfall**: marking a feature complete because a route or button exists, without payload-level proof.
- **p50 test**: reviewer can load public web/API URLs and follow the demo script.
- **p95 test**: every bounty-critical limitation is either closed with evidence or called out in the submission text.

### #22 Cloudflare CLI Production Setup And Deployment

- [ ] Production resources and smoke evidence remain documented.
- [ ] GitHub `production` environment has `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`.
- [ ] Repository variable `CLOUDFLARE_DEPLOY_ENABLED=true` is set only after secrets are ready.
- [ ] GitHub Actions deploy-from-main runs instead of skipping and post-deploy smoke passes.

Learning notes:

- **Developer/user must understand**: local Wrangler deployment proves the app can run; GitHub deploy-from-main proves repeatable release control.
- **Pitfall**: enabling the deploy gate before production IDs/secrets are installed.
- **p50 test**: `GET /api/health`, web root, feed, profile, permalink, comment, and claim work after local deploy.
- **p95 test**: the same smoke passes from the commit deployed by GitHub Actions.

### #23 Complete Extension And Web Capture Journey

- [ ] Web URL capture and extension current-page capture both produce valid annotation payloads.
- [ ] Selected text is preserved from browser selection to side panel, request payload, and stored annotation.
- [ ] Media start/end/duration are preserved from real page state to payload and stored annotation.
- [ ] API/source-link invariants are tested at contract and browser boundaries.

Learning notes:

- **Developer/user must understand**: the feature is the exact captured evidence, not just a form with fields.
- **Pitfall**: timecode fields can display one value while publish sends a fallback.
- **p50 test**: one normal annotation publishes successfully from web or extension.
- **p95 test**: exact quote, exact media seconds, invalid duration rejection, and source URL are reconciled across UI, network, and API result.

### #24 Real X/Google Auth And Extension Handoff

- [ ] Google and X client IDs/secrets are installed outside the repo.
- [ ] Provider callbacks exchange codes for tokens and create/load users.
- [ ] Production sessions use secure cookies and KV/D1-backed lookup.
- [ ] Extension token handoff requires an authenticated web session.
- [ ] Tests cover missing provider config, invalid state, replayed state, logout, and anonymous extension-token rejection.

Learning notes:

- **Developer/user must understand**: the current production state is honest failure, not account creation.
- **Pitfall**: demo OAuth or fake sessions must never run in production OAuth mode.
- **p50 test**: unauthenticated user sees a clear sign-in state and provider start route behavior.
- **p95 test**: invalid/replayed state fails, logout invalidates session, and extension-token cannot be minted anonymously.

### #26 Audio Commentary And 240p Media Policy

- [ ] Recorded audio has durable storage or an approved alternate path.
- [ ] Upload/finalize metadata prevents arbitrary asset IDs from being published as audio commentary.
- [ ] Production permalink can load or reference recorded audio commentary.
- [ ] Third-party clips remain source-linked by reference unless an explicit rights-safe owned-upload path is approved.
- [ ] Owned-video 240p/sub-480p enforcement is implemented or explicitly excluded from the submission.

Learning notes:

- **Developer/user must understand**: source-linked third-party timestamps are safer than copying media bytes.
- **Pitfall**: claiming 240p compliance for third-party references when no owned media is transcoded.
- **p50 test**: text commentary and audio upload intent behavior are clear.
- **p95 test**: oversized/unsupported audio is rejected, finalized audio persists, and owned-video rendition policy is enforceable.

### #28 Final Bounty Submission Package

- [ ] Public URLs, demo routes, extension install steps, and smoke IDs are current.
- [ ] Demo script covers sign-in state, URL/current-page capture, text/media commentary, feed, follow/comment, claim filing, and source links.
- [ ] Known limitations are copied into the external submission.
- [ ] Human submitter approves whether to post with disclosed gaps or wait.

Learning notes:

- **Developer/user must understand**: the packet is a reviewer script plus a truth-in-advertising checklist.
- **Pitfall**: hiding OAuth/audio/240p/extension p95 gaps inside implementation detail.
- **p50 test**: reviewer can run the demo without reading the code.
- **p95 test**: reviewer can reproduce the highest-risk claims using issue-linked evidence.

### #30 Local Chrome Extension Install And Bounty Smoke Verification

- [ ] Rebuilt `dist/extension` loads unpacked after PR #31.
- [ ] Settings saves production Worker API base without source edits.
- [ ] Production publish from a real tab creates an annotation visible through API/feed/permalink.
- [ ] Selected-text context menu proof preserves the exact quote.
- [ ] Real video/audio proof preserves exact start/end/duration.
- [ ] >90-second range is blocked in the browser before any production publish request.
- [ ] Audio/microphone behavior is tested or explicitly tied back to #26.

Learning notes:

- **Developer/user must understand**: unpacked extension proof is browser-specific and cannot be replaced by normal web tests.
- **Pitfall**: loading the source extension folder instead of `dist/extension`, or forgetting to reload after rebuild.
- **p50 test**: side panel opens, saves API base, captures current tab, publishes one annotation.
- **p95 test**: context menu selection, media current time, network suppression on invalid duration, and audio fallback are evidenced.

## Remaining Blockers

- **#22**: GitHub deploy-from-main needs Cloudflare account ID/API token and the deploy gate enabled.
- **#24**: Google/X OAuth needs provider apps, secrets, token exchange, user/session persistence, and extension handoff proof.
- **#26**: R2 is not enabled, audio storage is fallback-only, and owned-media 240p policy is undecided.
- **#30/#23**: production extension p95 smoke evidence is not yet recorded.
- **#28**: external submission should wait for these gates or explicitly disclose them.
