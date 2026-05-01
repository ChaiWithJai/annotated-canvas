# Gas Town Issue Execution Plan

Generated from open issue bodies and comments.

## Parallel Lanes
- Worker A / Boyle: #24 backend auth hardening; owns API/auth files.
- Worker B / Euler: #24 web sign-in UX; owns web UI/API client files.
- Worker C / Bernoulli: #23/#30 extension p50/p95 proof checklist; owns docs/evidence.
- Worker D / Mencius: #22/#26 dependency gate map; owns docs/evidence.
- Orchestrator: integrate non-overlapping changes, run gates, update GitHub issues, and decide what can close.

## #24 Epic: Real X/Google auth and extension handoff
- Priority: P0
- Status: no-credential slice implemented; external OAuth apps/secrets still required
- Why: Visible sign-in controls are not wired to a credible auth flow; production auth falls back instead of failing closed when provider config is missing.
- Deliverable: No-credential auth hardening plus web sign-in action/status; keep real provider exchange blocked on external secrets.
- Close gate: browser click on sign-in produces a visible network-backed result; production without provider secrets fails clearly; demo mode still works locally; oauth mode does not mint fake sessions.

## #23 Epic: Complete extension and web capture journey
- Priority: P0
- Status: next
- Why: Capture is mostly implemented but still needs browser-level payload proof across selected text and media timecode.
- Deliverable: Browser evidence and issue packet updates after auth slice.
- Close gate: recorded evidence shows exact selected text and exact media range in the API payload from an unpacked extension.

## #30 Task: Local Chrome extension install and bounty smoke verification
- Priority: P0
- Status: next
- Why: Extension reviewer proof remains incomplete against production Worker URL and p95 capture cases.
- Deliverable: Computer Use/Chrome smoke against production API settings, selected text, media current time, over-90 rejection.
- Close gate: reviewer can reproduce install, production API base switch, publish success, and rejection of invalid media range from Chrome.

## #22 Epic: Cloudflare CLI production setup and deployment
- Priority: P0
- Status: blocked_external_secret
- Why: Local Cloudflare deployment is live; GitHub deploy-from-main remains skipped without scoped Cloudflare API token.
- Deliverable: Store production secrets/vars and prove GitHub Actions deploy job runs.
- Close gate: GitHub Actions deploy job runs on main and deploys Worker/Pages after green tests.

## #21 Epic: Bounty gap audit and submission readiness
- Priority: P0
- Status: rollup_open
- Why: Bounty rollup cannot close while #24/#23/#30/#26/#22 remain open.
- Deliverable: Close only after child issues and final submission evidence converge.

## #26 Epic: Audio commentary and 240p media policy
- Priority: P1
- Status: blocked_platform_plus_code
- Why: R2 disabled; audio storage/finalize and 240p owned-media policy incomplete.
- Deliverable: Enable/replace storage, restore binding, implement finalize/tests/policy.
- Close gate: audio asset persists and loads from permalink, and owned-media downscale policy is implemented or explicitly scoped out with a bounty-safe rationale.

## #28 Task: Prepare final bounty submission package
- Priority: P1
- Status: blocked_by_product_gaps
- Why: Packet has live URLs, but sign-in/capture/audio gaps must be fixed or disclosed before external submission.
- Deliverable: Final reviewer script and submission after core gaps are resolved.
