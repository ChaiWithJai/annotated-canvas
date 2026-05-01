# Annotated Canvas Bounty Submission Packet

Reviewer-facing packet for the Annotated MVP bounty described in `bounty.txt`.

## Reviewer Stance

This packet should be submitted as an honest live-MVP packet, not as a claim that every bounty criterion is fully closed. The canonical gap audit is `docs/bounty-gap-audit.md`.

Status buckets used below:

- **Working now**: implemented and backed by local or production evidence.
- **Deployed but limited**: public URL exists, but the feature is demo/fallback/partial.
- **Blocked by human credentials/secrets**: external account setup or secrets are required before final proof.
- **Not yet implemented**: product/code/policy work remains.

## Current Submission Status

- **Working deployed MVP**: GitHub Actions deploy-from-main is proven by run `25216210247` from `main` at `afa7e3dda7645c875785546f904798e449339ec2`; the public Pages and Worker URLs are live; the feed, profile, permalink, source-link, comment/claim intake, text commentary, web URL composer, and 90-second validation have production or regression evidence.
- **Approved API-level smoke**: `ann_d586ad40-058a-42c1-b6d7-8e0e691cfae4` is the stable public smoke annotation for the production API and web permalink.
- **Extension p95 complete**: #30 and #23 are closed after PR #43. The unpacked extension p95 smoke proved production API-base persistence, current-tab publish, exact selected-text capture, exact media-time payload seconds, >90-second no-network rejection, stored API reads, and public permalinks.
- **Auth blocker**: #24 still needs real Google/X apps, secrets, token exchange, user/session creation, and extension handoff. Production correctly fails closed with `auth_not_configured` today.
- **Audio/240p blocker**: #26 still needs durable recorded-audio storage plus an explicit owned-media 240p/sub-480p policy. Third-party media remains source-linked by reference, and audio upload currently stops at `intent-created`.
- **Final submission requirement**: the human submitter can submit now with the #24/#26 limitations disclosed, or wait for real OAuth and durable audio/media processing before claiming full bounty coverage.

## Submission Links

Fill these in immediately before posting to `https://annotated.lovable.app`.

| Item | Value |
| --- | --- |
| Public web URL | `https://annotated-canvas.pages.dev` |
| Public API base URL | `https://annotated-canvas-api.jaybhagat841.workers.dev` |
| Public API health URL | `https://annotated-canvas-api.jaybhagat841.workers.dev/api/health` |
| Reviewer home URL | `https://annotated-canvas.pages.dev/home` |
| Public feed URL | `https://annotated-canvas.pages.dev/` |
| Public annotation permalink | `https://annotated-canvas.pages.dev/a/ann_d586ad40-058a-42c1-b6d7-8e0e691cfae4` |
| Extension p95 selected-text permalink | `https://annotated-canvas.pages.dev/a/ann_c6fa89cc-9c1a-4a73-9e37-d6bd08a20ae6` |
| Extension p95 media-time permalink | `https://annotated-canvas.pages.dev/a/ann_e537cae5-15f0-4dff-808b-219e134a801e` |
| Public profile URL | `https://annotated-canvas.pages.dev/u/mira` |
| Source repository | `https://github.com/ChaiWithJai/annotated-canvas` |
| Extension p95 evidence summary | `https://raw.githubusercontent.com/ChaiWithJai/annotated-canvas/afa7e3dda7645c875785546f904798e449339ec2/docs/audit-assets/extension-smoke-p95/summary.json` |
| Local web URL | `http://127.0.0.1:5173` |
| Local API URL | `http://localhost:8787` |
| Local API health check | `http://localhost:8787/api/health` |
| Chrome extension artifact | `dist/extension` after `npm run build:extension` |

Public demo routes:

- Reviewer home: `https://annotated-canvas.pages.dev/home`
- Feed: `https://annotated-canvas.pages.dev/`
- Profile: `https://annotated-canvas.pages.dev/u/mira`
- Annotation permalink: `https://annotated-canvas.pages.dev/a/ann_d586ad40-058a-42c1-b6d7-8e0e691cfae4`
- Extension selected-text permalink: `https://annotated-canvas.pages.dev/a/ann_c6fa89cc-9c1a-4a73-9e37-d6bd08a20ae6`
- Extension media-time permalink: `https://annotated-canvas.pages.dev/a/ann_e537cae5-15f0-4dff-808b-219e134a801e`
- Removed annotation state: `https://annotated-canvas.pages.dev/a/removed`

Local demo routes:

- Feed: `http://127.0.0.1:5173/`
- Profile: `http://127.0.0.1:5173/u/mira`
- Annotation permalink: `http://127.0.0.1:5173/a/ann_video_minimalism`
- Removed annotation state: `http://127.0.0.1:5173/a/removed`
- Empty feed state: `http://127.0.0.1:5173/empty`

## Local Reviewer Setup

Prerequisites: Node 24, npm, Google Chrome 116 or newer.

```bash
npm install
npm run dev:api
npm run dev:web
npm run build:extension
```

Optional local D1 setup:

```bash
npm run cf:migrate:local
```

Smoke check:

```bash
curl http://localhost:8787/api/health
```

Expected service name: `annotated-canvas-api`.

## Chrome Extension Install Steps

1. Run `npm run build:extension` from the repository root.
2. Open Chrome to `chrome://extensions`.
3. Enable `Developer mode`.
4. Click `Load unpacked`.
5. Select the generated `dist/extension` folder.
6. Open an article, video, podcast page, or another source page.
7. Open the Annotated Canvas side panel from the extension icon.
8. In Settings, set `API URL` to `https://annotated-canvas-api.jaybhagat841.workers.dev` for production proof, then click `Save settings`.
9. Use the capture controls to create a text selection or time-range annotation with commentary.
10. Click `Publish annotation`, then use the Published tab to copy the returned annotation id/permalink.
11. After rebuilding, return to `chrome://extensions` and reload the extension card.

## Demo Script

Target length: 8-10 minutes.

1. Open `https://annotated-canvas.pages.dev/home` and show the reviewer path into the feed and extension install guide.
2. Show the public feed at `https://annotated-canvas.pages.dev/`, including URL composer, source-domain labels, engagement counts, and `File a claim`.
3. Open `https://annotated-canvas.pages.dev/u/mira` and show the creator profile and annotation list.
4. Open `https://annotated-canvas.pages.dev/a/ann_d586ad40-058a-42c1-b6d7-8e0e691cfae4` and show the stable smoke permalink, original source link, commentary, and 60-second clip metadata.
5. Show production auth failing closed until provider secrets exist:

   ```bash
   curl "https://annotated-canvas-api.jaybhagat841.workers.dev/api/auth/google/start?return_to=https://annotated-canvas.pages.dev/"
   curl "https://annotated-canvas-api.jaybhagat841.workers.dev/api/auth/x/start?return_to=https://annotated-canvas.pages.dev/"
   ```

6. Load the unpacked Chrome extension from `dist/extension`.
7. In Settings, save the production Worker URL.
8. For a text source, select text, add text commentary, publish, and show the selected-text permalink `ann_c6fa89cc-9c1a-4a73-9e37-d6bd08a20ae6` as evidence of exact quote preservation.
9. For a media source, enter a start and end time no more than 90 seconds apart, publish, and show the media-time permalink `ann_e537cae5-15f0-4dff-808b-219e134a801e` as evidence of exact stored seconds.
10. Enter an over-90 range and show the side panel blocks publish before any production `POST /api/annotations`.
11. Return to the web client and show the new annotation in feed/permalink form.
12. Add or show comments and engagement on an annotation.
13. Click `File a claim`, submit a notice, and show that the claim is recorded without automatically removing the annotation.
14. Open the original source link from the annotation and confirm the content links back to the source.
15. Disclose the remaining blockers: real Google/X OAuth credentials and durable audio/owned-media processing.

API publish fallback for reviewers who want payload-level proof:

```bash
curl -X POST http://localhost:8787/api/annotations \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: local-demo-annotation-001" \
  -d '{
    "clip": {
      "kind": "video",
      "source": {
        "source_url": "https://www.youtube.com/watch?v=annotated-demo&t=263s",
        "source_domain": "youtube.com",
        "title": "Minimalist Design Theory: A Comprehensive Guide",
        "author_name": "Design Systems Lab"
      },
      "media": {
        "start_seconds": 263,
        "end_seconds": 310,
        "duration_seconds": 47
      }
    },
    "commentary": {
      "kind": "text",
      "text": "This is the moment where restraint stops being aesthetic and becomes an operating constraint."
    },
    "visibility": "public",
    "client_context": {
      "surface": "extension",
      "capture_method": "media-timecode"
    }
  }'
```

Claim filing fallback:

```bash
curl -X POST http://localhost:8787/api/claims \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: local-demo-claim-001" \
  -d '{
    "annotation_id": "ann_video_minimalism",
    "claimant_name": "Rights Team",
    "claimant_email": "rights@example.com",
    "relationship": "copyright-owner",
    "reason": "I want this annotation reviewed for attribution and usage boundaries.",
    "requested_action": "review"
  }'
```

## Acceptance Mapping To `bounty.txt`

| Bounty item | Reviewer evidence | Current status |
| --- | --- | --- |
| Sidebar Chrome extension | MV3 side panel loaded from `dist/extension`; settings saved the production API base; p95 smoke published current-tab, selected-text, and media-time annotations. | **Working now** with merged p95 evidence from #43. |
| Highlight and clip text/audio/video from any website | Current-tab context, selected text, media time-range UI/API payloads, approved production API-level smoke, and extension p95 selected-text/media-time proof. | **Working now for text/video references**; recorded audio remains limited until #26. |
| Add commentary and annotations | Text commentary publish path and API contract. | **Deployed but limited**; recorded audio is fallback-only until #26. |
| Landing page links back to original source | Approved annotation permalink includes source metadata and original source link. | **Working now** with public permalink smoke `ann_d586ad40-058a-42c1-b6d7-8e0e691cfae4`. |
| Public social feed | Feed route and API feed path. | **Working now** with public Worker and Pages smoke. |
| Users can follow and engage | Feed/profile engagement, follow route, comments, and counts. | **Working now**; include fresh follow/comment proof in final demo. |
| Account via X or Google | Sign-in buttons call the API and production fails closed when secrets are absent. | **Blocked by human credentials/secrets**; real provider exchange remains #24. |
| User can enter URL or use current page | Web URL composer is present/tested; extension current-page capture p95 proof is merged. | **Working now** for MVP capture paths. |
| Prompt for start/end or text section | Extension capture controls, selected-text context, and exact UI-to-payload media seconds are evidenced. | **Working now** with p95 extension proof. |
| Max clip size 90 seconds | Contracts/API reject over-90 media references; extension p95 smoke shows over-90 publish blocked before network. | **Working now**. |
| Downgrade clip to 240p or below 480p | Third-party media is source-linked by reference; owned uploads need processing policy. | **Not yet implemented**; product/legal decision remains #26. |
| Text or recorded audio commentary | Text commentary works; audio upload endpoint returns an intent without R2. | **Deployed but limited**; durable audio storage/finalize remains #26. |
| Users can leave comments | Comment resources and claim/feed docs reflect local completion. | **Working now**; public smoke created `cmt_73c82db2-d4db-4661-b92e-84b12b4e74e7`. |
| File a claim button | Claim button/modal and `POST /api/claims` notice intake. | **Working now**; public smoke created `claim_36899790-f89f-4add-9744-046b5b46c3f3` and annotation remained public. |
| All content links to original source | `source_url` required for third-party clips. | **Working now** for third-party contracts/API. |
| Submit to annotated.lovable.app | Packet, URLs, demo script, approved smoke annotation, and checklist. | **Deployed but limited**; external submission needs final disclosure or completion of open gates. |

## Open-Issue Acceptance Notes

These notes are the reviewer handoff for the remaining open tickets plus recently closed evidence gates. The longer form lives in `docs/bounty-gap-audit.md`.

| Issue | Close only when | Learning note | p50 evidence | p95 evidence |
| --- | --- | --- | --- | --- |
| #21 Bounty readiness | The status buckets are current and every gap is closed or explicitly disclosed. | A live MVP is not a complete bounty claim. | Public URLs and demo script work. | No bounty-critical limitation is hidden. |
| Closed #22 Cloudflare deployment | Closed after GitHub Actions deploy-from-main and public smoke passed; latest proof is run `25216210247`. | Local Wrangler proved capability; CI deploy now proves repeatability. | Public web/API smoke works. | GitHub-deployed smoke passed from head SHA `afa7e3dda7645c875785546f904798e449339ec2`. |
| Closed #23 Capture journey | Closed after PR #43 merged and deploy run `25216210247` passed. | Functional fields are not proof unless payloads match user intent. | One normal annotation publishes. | Exact quote/timecode/source integrity are proven. |
| #24 OAuth | Google/X provider exchange, sessions, and extension handoff work with real credentials. | Honest not-configured failure is safer than fake account creation. | Signed-out and provider-start behavior is visible. | Invalid/replayed state, logout, and anonymous extension-token rejection are tested. |
| #26 Audio/240p | Recorded audio persists and owned-media 240p/sub-480p policy is implemented or explicitly excluded. | Third-party references and owned media processing are different rights surfaces. | Text commentary and audio intent behavior are clear. | Stored audio, upload validation, and owned-video rendition policy are enforceable. |
| #28 Submission package | The external post uses current URLs, smoke IDs, and known limitations. | The packet is a reviewer script plus truth-in-advertising checklist. | Reviewer can run the demo without reading code. | Reviewer can reproduce highest-risk claims from linked evidence. |
| Closed #30 Extension smoke | Closed after PR #43 merged and deploy run `25216210247` passed. | MV3 side-panel proof must happen in Chrome, not only in unit tests. | Side panel saves API base and publishes one annotation. | Selected text, media current time, over-90 no-network rejection, and audio fallback are evidenced. |
| Closed #38 Reviewer journey | Closed after the happy/sad path and Krug pass landed. | Reviewer onboarding is a product surface, not a doc appendix. | Reviewer can discover, install/use, publish, and return to the feed from one script. | Auth, extension install, invalid range, audio/R2, and claim recovery states are understandable at the point of action. |

## Current Open GitHub Issues

Open issue snapshot for `ChaiWithJai/annotated-canvas`:

- #21 `Epic: Bounty gap audit and submission readiness`
- #24 `Epic: Real X/Google auth and extension handoff`
- #26 `Epic: Audio commentary and 240p media policy`
- #28 `Task: Prepare final bounty submission package`

Recently completed issue evidence relevant to the packet:

- #22 `Epic: Cloudflare CLI production setup and deployment`
- #25 `Epic: Public feed, comments, follows, and engagement parity`
- #27 `Task: Harden claim filing into a reviewable notice workflow`
- #30 `Task: Local Chrome extension install and bounty smoke verification`
- #23 `Epic: Complete extension and web capture journey`
- #38 `P0: Codify reviewer journey happy/sad paths and Krug pass before demo video`

Local Chrome evidence recorded in #30:

- `dist/extension` loaded unpacked in Chrome Developer Mode.
- Extension ID: `knpgndejanjcgnfognmebiieingaimkl`.
- Side panel opened from the pinned toolbar action.
- Settings saved `http://localhost:8787`.
- Current-page capture on `http://127.0.0.1:5173/` published into the local Worker API.
- `GET /api/feed` returned `ann_e496763a-fb93-457b-a3f7-a6659d4f3e9d` with the expected active-tab source and commentary.

Production extension p50/p95 proof recorded in PR #43:

- p50 current-tab publish: `ann_a7093956-675f-4580-9d1f-5c85f3d8dff2`, permalink `https://annotated-canvas.pages.dev/a/ann_a7093956-675f-4580-9d1f-5c85f3d8dff2`.
- p95 selected text: `ann_c6fa89cc-9c1a-4a73-9e37-d6bd08a20ae6` stores the exact quote `This domain is for use in documentation examples without needing permission. Avoid use in operations.`.
- p95 media time: `ann_e537cae5-15f0-4dff-808b-219e134a801e` stores UI-entered `00:00:05` to `00:00:52` as `start_seconds=5`, `end_seconds=52`, `duration_seconds=47`.
- p95 over-90 rejection: `00:00:00` to `00:01:31` showed `Clip length must be 90 seconds or less.` with `postCountAfterClick=0`.
- p95 audio/R2 limitation: production `POST /api/uploads/audio-commentary` returns `upload.status: "intent-created"`; durable storage remains #26.
- Evidence summary: `https://raw.githubusercontent.com/ChaiWithJai/annotated-canvas/afa7e3dda7645c875785546f904798e449339ec2/docs/audit-assets/extension-smoke-p95/summary.json`.

Production smoke evidence recorded on May 1, 2026:

- GitHub Actions run `25216210247` completed successfully from `main` at `afa7e3dda7645c875785546f904798e449339ec2`.
- The run passed typecheck, unit/integration tests, Worker runtime tests, build, Cloudflare production preflight, remote D1 migrations, Worker deploy, production web build, and Pages deploy.
- `GET https://annotated-canvas-api.jaybhagat841.workers.dev/api/health` returned `200` with `ok: true`, `service: annotated-canvas-api`, and `mode: production`.
- `GET https://annotated-canvas.pages.dev/`, `/home`, `/u/mira`, and `/a/ann_d586ad40-058a-42c1-b6d7-8e0e691cfae4` returned `200`.
- `GET /api/annotations/ann_d586ad40-058a-42c1-b6d7-8e0e691cfae4` returns canonical `permalink_url: https://annotated-canvas.pages.dev/a/ann_d586ad40-058a-42c1-b6d7-8e0e691cfae4`.
- `GET /api/feed` includes `ann_d586ad40-058a-42c1-b6d7-8e0e691cfae4`.
- `GET /api/me` from the Pages origin returned `401 authentication_required`, which is the expected signed-out state.
- Google and X auth start endpoints returned `503 auth_not_configured`, listing the missing provider client IDs/secrets.
- Earlier production API smoke created comment `cmt_73c82db2-d4db-4661-b92e-84b12b4e74e7`, claim notice `claim_36899790-f89f-4add-9744-046b5b46c3f3`, and `POST /api/uploads/audio-commentary` returned `status: intent-created`.
- Important boundary: extension p95 is now recorded, but it does not make real Google/X OAuth or durable audio/owned-media processing complete.

## Known Blockers Before External Submission

- Real Google/X OAuth needs provider client IDs/secrets, callback configuration, token exchange, and production-safe sessions. Tracked by #24.
- Audio commentary recording/finalize and 240p owned-media policy remain unresolved. Tracked by #26.
- R2 is not enabled in the Cloudflare account yet. Production omits the R2 binding, so audio upload storage remains blocked by #26.
- Chrome Web Store distribution is not part of the local MVP; reviewers load `dist/extension` unpacked.
- Human submission to `https://annotated.lovable.app` remains #28.

Submission language to use if posting before all blockers close:

> Annotated Canvas is live as a source-linked MVP with GitHub-deployed public Pages/Worker URLs, public feed, permalinks, comments, claim filing, text commentary, web URL capture, API-level and extension-level 90-second validation, and unpacked Chrome extension p95 proof for current-tab, selected-text, and media-time capture. The remaining disclosed gaps are real Google/X OAuth credentials and token exchange, durable recorded-audio storage, and owned-media 240p processing policy.

Dependency gate map: `output/reports/gas-town/dependency-gate-map.md`.

External inputs required before this packet can claim full bounty coverage:

- Google OAuth app credentials for `https://annotated-canvas-api.jaybhagat841.workers.dev/api/auth/google/callback`.
- X OAuth app credentials for `https://annotated-canvas-api.jaybhagat841.workers.dev/api/auth/x/callback`.
- R2 enablement for bucket `annotated-canvas-media`, or an approved alternate storage path for recorded audio commentary.
- Product/legal decision for third-party reference-only media versus owned-video 240p/sub-480p processing.

## Final Submission Checklist

- [x] Public web URL is live and replaces the placeholder above.
- [x] Public API health URL returns OK and replaces the placeholder above.
- [x] GitHub Actions deploy-from-main is proven by run `25216210247`.
- [x] Public feed, profile, permalink, removed state, and claim flow are smoke-tested.
- [x] Approved public smoke annotation is current: `ann_d586ad40-058a-42c1-b6d7-8e0e691cfae4`.
- [x] Chrome extension builds with `npm run build:extension`.
- [x] Unpacked extension loads from `dist/extension` and side panel opens in Chrome.
- [x] Extension Settings saves the production Worker URL and publishes through that API base without source edits.
- [x] Current-page capture publishes exact selected text and media time ranges.
- [x] Selected-text proof includes exact quote preservation in the production payload and stored annotation.
- [x] Real media-time proof includes seeded side-panel fields and exact production payload media seconds.
- [x] URL-input capture composer publishes with the original `source_url` in the web flow.
- [x] Media duration over 90 seconds is rejected.
- [x] Browser p95 proof shows over-90-second extension publish is blocked before any production network request.
- [x] Every public annotation links back to its original source.
- [x] Comments and engagement are demonstrated on a public annotation.
- [x] `File a claim` records a notice and does not automatically remove content.
- [x] Audio commentary limitation is documented with upload evidence and the production `intent-created` fallback.
- [ ] Demo Google and X auth behavior is documented, or production OAuth is fully configured.
- [x] Reviewer journey happy/sad paths and Krug pass from #38 are merged before filming.
- [ ] Known limitations are copied into the bounty submission without hiding bounty-critical gaps.
- [ ] Submission is posted to `https://annotated.lovable.app`.
