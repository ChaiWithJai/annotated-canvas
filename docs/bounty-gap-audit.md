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
- Production is live through GitHub Actions deploy-from-main. Run `25216210247` completed successfully from head SHA `afa7e3dda7645c875785546f904798e449339ec2`.
  - Web: `https://annotated-canvas.pages.dev`
  - API health: `https://annotated-canvas-api.jaybhagat841.workers.dev/api/health`
  - Approved public smoke annotation: `https://annotated-canvas.pages.dev/a/ann_d586ad40-058a-42c1-b6d7-8e0e691cfae4`
- Issue #22 is closed. Cloudflare deployment plumbing is no longer a bounty blocker.
- The deployed MVP has smoke for health, feed, profile, permalink, source link, 60-second media metadata, comments/claim intake, and signed-out/auth-not-configured behavior.
- The Chrome extension builds to `dist/extension`, loads unpacked locally, opens as an MV3 side panel, saves an API base URL, and has merged production p95 evidence from #43.
- Issues #23, #30, and #38 are closed. Current-tab capture, exact selected text, exact media seconds, >90-second no-network rejection, and reviewer journey/Krug evidence are no longer bounty blockers.
- Real OAuth provider exchange, durable recorded-audio storage, and owned-media 240p policy remain open.

## Evidence Split

- **Working deployed MVP**: public Pages/Worker URLs, feed/profile/permalink routes, source-linked public annotation, comments/claim intake from earlier smoke, text commentary, web URL composer, extension p95 capture proof, and API/extension-side 90-second validation.
- **API-level smoke**: the approved smoke annotation `ann_d586ad40-058a-42c1-b6d7-8e0e691cfae4` proves the production API can store and serve a source-linked 60-second annotation.
- **Extension p95 proof**: PR #43 records selected-text, media-time, current-tab publish, over-90 no-network rejection, stored API reads, public permalinks, and audio upload fallback.
- **Reviewer journey proof**: #38 records the marketing/feed/signup/local-extension/capture/return loop plus Krug guardrails before demo filming.
- **Human/platform blockers**: #24 needs real Google/X provider credentials and token exchange; #26 needs durable audio storage and a 240p/sub-480p owned-media decision.

## Bounty Requirement Matrix

| Bounty requirement | Status bucket | Current evidence | Remaining gap | Delivery issue |
| --- | --- | --- | --- | --- |
| Sidebar Chrome extension | Working now | `dist/extension` loads unpacked; side panel opens; production p95 evidence from PR #43 proves API-base persistence, current-tab publish, selected text, media time, and over-90 no-network rejection. | Chrome Web Store distribution remains out of scope for MVP; reviewers load unpacked. | closed #30, closed #23 |
| Highlight and clip media from any website | Working now for text/video references | Current-tab URL/title, selected-text path, media time-range controls, API-level smoke, and extension p95 selected-text/media-time proof exist. | Durable recorded audio and owned-video processing remain separate media work. | closed #23, closed #30, #26 |
| Add commentary and annotations | Deployed but limited | Text commentary publishes; approved public annotation exists; earlier comment/claim smoke exists. | Recorded audio commentary is not durably stored in production. | #26 |
| Landing page linking back to original source | Working now | Approved public permalink `ann_d586ad40-058a-42c1-b6d7-8e0e691cfae4` returns the canonical Pages `permalink_url` and source link. | Continue to verify every created annotation carries `source_url`. | #21, #28 |
| Public social feed | Working now | Public feed includes the approved smoke annotation; profile route returns `200`. | Final packet should use fresh proof immediately before external submission. | #28 |
| Follow and engage with annotations | Working now | Comments and engagement paths are implemented; follow UI was wired to API before PR #31 merge. | Include follow/comment proof in final demo, not only local tests. | #28, closed #25 |
| Account via X or Google | Blocked by human credentials/secrets | Production now fails closed with visible not-configured messages when provider secrets are absent. | Google/X apps, client secrets, token exchange, user/session creation, extension handoff. | #24 |
| URL input or current page | Working now | Web URL composer is tested; extension current-page capture has production p95 proof. | Final demo should show both paths clearly. | #28, closed #23, closed #30 |
| Prompt for start/end or text section | Working now | UI/API support text quote and media start/end; extension p95 proves selected quote and exact media seconds. | Final demo should reuse the p95 evidence links. | #28, closed #23, closed #30 |
| Max clip size 90 seconds | Working now | Contract/API tests reject media over 90 seconds; extension p95 shows no production `POST /api/annotations` for a 91-second range. | None for MVP. | closed #30 |
| Downgrade clip to 240p / below 480p | Not yet implemented | Current MVP keeps third-party media source-linked by reference and now rejects upload/storage fields on third-party media contracts. | Human product/legal decision and owned-upload processing rule are required. | #26 |
| Text or recorded audio commentary | Deployed but limited | Text works; audio upload endpoint returns an intent when R2 is unavailable; API rejects audio commentary with no `audio_asset_id`. | R2 or alternate storage, upload size/type rejection, finalize semantics, permalink playback/loading proof. | #26 |
| Users can leave comments | Working now | Public smoke created `cmt_73c82db2-d4db-4661-b92e-84b12b4e74e7`. | Re-run before final submission if the seed data changes. | closed #25, #28 |
| File a claim | Working now | Public smoke created `claim_36899790-f89f-4add-9744-046b5b46c3f3` and annotation remained public. | Final demo should explain claim is notice intake, not automatic takedown. | closed #27, #28 |
| All content links to original source | Working now | Third-party clip contracts require `source_url`; permalink shows original source link; extension p95 stores original source metadata. | Keep this invariant in final demo. | #21, #28 |
| Submit to annotated.lovable.app | Deployed but limited | Reviewer packet has live URLs, demo script, approved smoke annotation, p95 extension evidence, and honest blocker list. | Human decision to submit with #24/#26 disclosed or wait for those gates. | #28 |

## Issue Acceptance Criteria

### #21 Bounty Gap Audit And Submission Readiness

- [ ] Gap audit and submission packet use the same status buckets.
- [ ] Every open bounty gap links to a child issue or explicit product decision.
- [ ] Final submission language distinguishes live MVP evidence from unfinished bounty-critical criteria.
- [ ] Close only after #24/#26/#28 are completed or deliberately disclosed by the submitter.

Learning notes:

- **Developer/user must understand**: a live MVP is not the same thing as a complete bounty claim.
- **Pitfall**: marking a feature complete because a route or button exists, without payload-level proof.
- **p50 test**: reviewer can load public web/API URLs and follow the demo script.
- **p95 test**: every bounty-critical limitation is either closed with evidence or called out in the submission text.

### Closed #22 Cloudflare CLI Production Setup And Deployment

- [x] Production resources and smoke evidence remain documented.
- [x] GitHub `production` environment has `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`.
- [x] Repository variable `CLOUDFLARE_DEPLOY_ENABLED=true` is set after secrets are ready.
- [x] GitHub Actions deploy-from-main runs instead of skipping and post-deploy smoke passes.

Learning notes:

- **Developer/user must understand**: local Wrangler deployment proved the app could run; GitHub deploy-from-main now proves repeatable release control.
- **Pitfall**: a successful Worker deploy can still fail evidence collection if the CI parser expects the wrong log shape.
- **p50 test**: `GET /api/health`, web root, feed, profile, permalink, comment, and claim work after deploy.
- **p95 test**: latest run `25216210247` applied remote D1 migrations, deployed the Worker, built the web app against the deployed Worker URL, deployed Pages, and passed public smoke from the deployed commit.

### Closed #23 Complete Extension And Web Capture Journey

- [x] Web URL capture and extension current-page capture both produce valid annotation payloads.
- [x] Selected text is preserved from browser selection to side panel, request payload, and stored annotation.
- [x] Media start/end/duration are preserved from real page state to payload and stored annotation.
- [x] API/source-link invariants are tested at contract and browser boundaries.

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

- [x] Annotation contract/API reject audio commentary missing an `audio_asset_id`.
- [x] Third-party clip contracts reject upload/storage fields unless the payload is an owned `kind=upload`.
- [ ] Recorded audio has durable storage or an approved alternate path.
- [ ] Upload/finalize metadata prevents arbitrary asset IDs from being published as audio commentary.
- [ ] Production permalink can load or reference recorded audio commentary.
- [ ] Third-party clips remain source-linked by reference unless an explicit rights-safe owned-upload path is approved.
- [ ] Owned-video 240p/sub-480p enforcement is implemented or explicitly excluded from the submission.
- [ ] Oversized audio and unsupported audio content types are rejected before storage.
- [ ] `POST /api/uploads/owned-video` stops being intent-only before any owned-video demo is claimed as 240p compliant.

Learning notes:

- **Developer/user must understand**: source-linked third-party timestamps are safer than copying media bytes.
- **Pitfall**: claiming 240p compliance for third-party references when no owned media is transcoded.
- **p50 test**: text commentary, missing-audio-asset rejection, and audio upload intent behavior are clear.
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

### Closed #30 Local Chrome Extension Install And Bounty Smoke Verification

- [x] Rebuilt `dist/extension` loads unpacked after PR #31.
- [x] Settings saves production Worker API base without source edits.
- [x] Production publish from a real tab creates an annotation visible through API/feed/permalink.
- [x] Selected-text proof preserves the exact quote.
- [x] Real media proof preserves exact start/end/duration.
- [x] >90-second range is blocked in the browser before any production publish request.
- [x] Audio upload fallback is tested and explicitly tied back to #26.

Learning notes:

- **Developer/user must understand**: unpacked extension proof is browser-specific and cannot be replaced by normal web tests.
- **Pitfall**: loading the source extension folder instead of `dist/extension`, or forgetting to reload after rebuild.
- **p50 test**: side panel opens, saves API base, captures current tab, publishes one annotation.
- **p95 test**: context menu selection, media current time, network suppression on invalid duration, and audio fallback are evidenced.

### Closed #38 Reviewer Journey Happy/Sad Paths And Krug Pass

- [x] Marketing, feed, signup, local extension install, capture, publish, feed return, comment, follow/engage, and claim steps are documented as one reviewer journey.
- [x] The web app exposes the local unpacked-extension path because Chrome Web Store distribution is not part of the MVP.
- [x] Auth, extension install, wrong API URL, no selection, over-90 media, audio/R2, and claim-submission recovery states have clear copy and test evidence.
- [x] The final demo script follows the same happy/sad paths without requiring improvisation.

Learning notes:

- **Developer/user must understand**: the reviewer journey is itself a product surface, not a documentation footnote.
- **Pitfall**: a live route or working endpoint can still fail the bounty if the user cannot discover and complete the job.
- **p50 test**: reviewer can discover, install/use, publish, and return to the feed using one script.
- **p95 test**: auth blockers, unpacked-extension constraints, invalid ranges, audio limitations, and claim behavior are understandable at the point of action.

## Remaining Blockers

- **#24**: Google/X OAuth needs provider apps, secrets, token exchange, user/session persistence, and extension handoff proof.
- **#26**: R2 is not enabled, audio storage is fallback-only, and owned-media 240p policy is undecided.
- **#28**: external submission should disclose #24/#26 or wait for those gates.
