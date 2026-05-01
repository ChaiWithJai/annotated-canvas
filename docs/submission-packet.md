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

- **Working deployed MVP**: GitHub Actions deploy-from-main is proven by run `25212955639`; the public Pages and Worker URLs are live; the feed, profile, permalink, source-link, comment/claim intake, text commentary, and API-side 90-second validation have production evidence.
- **Approved API-level smoke**: `ann_d586ad40-058a-42c1-b6d7-8e0e691cfae4` is the current public smoke annotation. It proves the production API and web permalink can serve a source-linked 60-second annotation, not that a real Chrome extension captured selected text or media time from a page.
- **Extension p95 still open**: #30/#23 still need browser evidence for production API-base persistence, exact selected text, exact real media `currentTime`, >90-second no-network rejection, and audio/microphone behavior.
- **Auth blocker**: #24 still needs real Google/X apps, secrets, token exchange, user/session creation, and extension handoff. Production correctly fails closed with `auth_not_configured` today.
- **Audio/240p blocker**: #26 still needs durable recorded-audio storage plus an explicit owned-media 240p/sub-480p policy. Third-party media remains source-linked by reference.
- **Final submission requirement**: the human submitter must either wait for #23/#24/#26/#30 or copy the known-limitations language below into the external `annotated.lovable.app` submission.

## Submission Links

Fill these in immediately before posting to `https://annotated.lovable.app`.

| Item | Value |
| --- | --- |
| Public web URL | `https://annotated-canvas.pages.dev` |
| Public API health URL | `https://annotated-canvas-api.jaybhagat841.workers.dev/api/health` |
| Public feed URL | `https://annotated-canvas.pages.dev/` |
| Public annotation permalink | `https://annotated-canvas.pages.dev/a/ann_d586ad40-058a-42c1-b6d7-8e0e691cfae4` |
| Public profile URL | `https://annotated-canvas.pages.dev/u/mira` |
| Source repository | `https://github.com/ChaiWithJai/annotated-canvas` |
| Local web URL | `http://127.0.0.1:5173` |
| Local API URL | `http://localhost:8787` |
| Local API health check | `http://localhost:8787/api/health` |
| Chrome extension artifact | `dist/extension` after `npm run build:extension` |

Public demo routes:

- Feed: `https://annotated-canvas.pages.dev/`
- Profile: `https://annotated-canvas.pages.dev/u/mira`
- Annotation permalink: `https://annotated-canvas.pages.dev/a/ann_d586ad40-058a-42c1-b6d7-8e0e691cfae4`
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
10. After rebuilding, return to `chrome://extensions` and reload the extension card.

## Demo Script

Target length: 8-10 minutes.

1. Open the public web URL at `https://annotated-canvas.pages.dev/`.
2. Show the public feed, source-domain labels, engagement counts, and `File a claim` button.
3. Open `https://annotated-canvas.pages.dev/u/mira` and show the creator profile and annotation list.
4. Open `https://annotated-canvas.pages.dev/a/ann_d586ad40-058a-42c1-b6d7-8e0e691cfae4` and show the permalink, original source link, commentary, and 60-second clip metadata.
5. Show production auth failing closed until provider secrets exist:

   ```bash
   curl "https://annotated-canvas-api.jaybhagat841.workers.dev/api/auth/google/start?return_to=https://annotated-canvas.pages.dev/"
   curl "https://annotated-canvas-api.jaybhagat841.workers.dev/api/auth/x/start?return_to=https://annotated-canvas.pages.dev/"
   ```

6. Load the unpacked Chrome extension from `dist/extension`.
7. On a source page, open the side panel and demonstrate current-page capture.
8. For a text source, select text and add text commentary.
9. For a media source, enter a start and end time no more than 90 seconds apart and add commentary.
10. Publish or submit the annotation through the local flow under review.
11. Return to the web client and show the annotation in feed/permalink form.
12. Add or show comments and engagement on an annotation.
13. Click `File a claim`, submit a notice, and show that the claim is recorded without automatically removing the annotation.
14. Open the original source link from the annotation and confirm the content links back to the source.
15. Close with the acceptance mapping below and the known blockers list.

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
| Sidebar Chrome extension | MV3 side panel loaded from `dist/extension`; side panel opens on source pages. | **Working now** locally; production p50/p95 browser proof remains #30/#23. |
| Highlight and clip text/audio/video from any website | Current-tab context, selected text, media time-range UI/API payloads, and approved production API-level smoke. | **Deployed but limited**; exact selected-text and real media-time browser proof remain #23/#30. |
| Add commentary and annotations | Text commentary publish path and API contract. | **Deployed but limited**; recorded audio is fallback-only until #26. |
| Landing page links back to original source | Approved annotation permalink includes source metadata and original source link. | **Working now** with public permalink smoke `ann_d586ad40-058a-42c1-b6d7-8e0e691cfae4`. |
| Public social feed | Feed route and API feed path. | **Working now** with public Worker and Pages smoke. |
| Users can follow and engage | Feed/profile engagement, follow route, comments, and counts. | **Working now**; include fresh follow/comment proof in final demo. |
| Account via X or Google | Sign-in buttons call the API and production fails closed when secrets are absent. | **Blocked by human credentials/secrets**; real provider exchange remains #24. |
| User can enter URL or use current page | Web URL flow and extension current-page capture surface. | **Deployed but limited**; production extension payload proof remains #23/#30. |
| Prompt for start/end or text section | Extension capture controls and API validation for media duration. | **Deployed but limited**; exact UI-to-payload verification remains #23/#30. |
| Max clip size 90 seconds | Contracts/API reject over-90-second media references. | **Working now** at contract/API; browser no-network proof remains #30. |
| Downgrade clip to 240p or below 480p | Third-party media is source-linked by reference; owned uploads need processing policy. | **Not yet implemented**; product/legal decision remains #26. |
| Text or recorded audio commentary | Text commentary works; audio upload endpoint returns an intent without R2. | **Deployed but limited**; durable audio storage/finalize remains #26. |
| Users can leave comments | Comment resources and claim/feed docs reflect local completion. | **Working now**; public smoke created `cmt_73c82db2-d4db-4661-b92e-84b12b4e74e7`. |
| File a claim button | Claim button/modal and `POST /api/claims` notice intake. | **Working now**; public smoke created `claim_36899790-f89f-4add-9744-046b5b46c3f3` and annotation remained public. |
| All content links to original source | `source_url` required for third-party clips. | **Working now** for third-party contracts/API. |
| Submit to annotated.lovable.app | Packet, URLs, demo script, approved smoke annotation, and checklist. | **Deployed but limited**; external submission needs final disclosure or completion of open gates. |

## Open-Issue Acceptance Notes

These notes are the reviewer handoff for the six open tickets plus the closed Cloudflare dependency. The longer form lives in `docs/bounty-gap-audit.md`.

| Issue | Close only when | Learning note | p50 evidence | p95 evidence |
| --- | --- | --- | --- | --- |
| #21 Bounty readiness | The status buckets are current and every gap is closed or explicitly disclosed. | A live MVP is not a complete bounty claim. | Public URLs and demo script work. | No bounty-critical limitation is hidden. |
| Closed #22 Cloudflare deployment | Closed after GitHub Actions deploy-from-main and public smoke passed from run `25212955639`. | Local Wrangler proved capability; CI deploy now proves repeatability. | Public web/API smoke works. | GitHub-deployed smoke passed from head SHA `2963f02d37bff4d862e00027f7774688ff9f5e26`. |
| #23 Capture journey | Web URL/current-page, selected text, and media time payloads reconcile with stored annotations. | Functional fields are not proof unless payloads match user intent. | One normal annotation publishes. | Exact quote/timecode/source integrity are proven. |
| #24 OAuth | Google/X provider exchange, sessions, and extension handoff work with real credentials. | Honest not-configured failure is safer than fake account creation. | Signed-out and provider-start behavior is visible. | Invalid/replayed state, logout, and anonymous extension-token rejection are tested. |
| #26 Audio/240p | Recorded audio persists and owned-media 240p/sub-480p policy is implemented or explicitly excluded. | Third-party references and owned media processing are different rights surfaces. | Text commentary and audio intent behavior are clear. | Stored audio, upload validation, and owned-video rendition policy are enforceable. |
| #28 Submission package | The external post uses current URLs, smoke IDs, and known limitations. | The packet is a reviewer script plus truth-in-advertising checklist. | Reviewer can run the demo without reading code. | Reviewer can reproduce highest-risk claims from linked evidence. |
| #30 Extension smoke | Production extension p50 and p95 browser evidence is recorded. | MV3 side-panel proof must happen in Chrome, not only in unit tests. | Side panel saves API base and publishes one annotation. | Selected text, media current time, over-90 no-network rejection, and audio fallback are evidenced. |

## Current Open GitHub Issues

Open issue snapshot for `ChaiWithJai/annotated-canvas`:

- #21 `Epic: Bounty gap audit and submission readiness`
- #23 `Epic: Complete extension and web capture journey`
- #24 `Epic: Real X/Google auth and extension handoff`
- #26 `Epic: Audio commentary and 240p media policy`
- #28 `Task: Prepare final bounty submission package`
- #30 `Task: Local Chrome extension install and bounty smoke verification`

Recently completed issue evidence relevant to the packet:

- #22 `Epic: Cloudflare CLI production setup and deployment`
- #25 `Epic: Public feed, comments, follows, and engagement parity`
- #27 `Task: Harden claim filing into a reviewable notice workflow`

Local Chrome evidence recorded in #30:

- `dist/extension` loaded unpacked in Chrome Developer Mode.
- Extension ID: `knpgndejanjcgnfognmebiieingaimkl`.
- Side panel opened from the pinned toolbar action.
- Settings saved `http://localhost:8787`.
- Current-page capture on `http://127.0.0.1:5173/` published into the local Worker API.
- `GET /api/feed` returned `ann_e496763a-fb93-457b-a3f7-a6659d4f3e9d` with the expected active-tab source and commentary.

Production extension p50/p95 proof still to record:

- p50: reload the newly built `dist/extension`, save `https://annotated-canvas-api.jaybhagat841.workers.dev` in Settings, publish one <=90-second annotation from a real tab, and verify the annotation id through production API/feed/permalink evidence.
- p95 selected text: select an exact quote on a normal HTTPS page, choose `Annotate selected text`, and retain the selected text screenshot, side-panel quote preview, production `POST /api/annotations` payload, response id, and stored annotation proof showing the same quote.
- p95 media time: seek a real `<video>` or `<audio>` element, record `document.querySelector("video,audio")?.currentTime`, verify side-panel `Start` seeds from that value, publish <=90 seconds, and retain the production payload with exact `start_seconds`, `end_seconds`, and `duration_seconds`.
- p95 over-90 rejection: enter a range longer than 90 seconds, retain the side-panel error `Clip length must be 90 seconds or less.`, and retain Network/HAR proof that no production `POST /api/annotations` was sent.
- p95 audio/R2 limitation: record the microphone prompt outcome and the production `POST /api/uploads/audio-commentary` response. Current expected limitation is `upload.status: "intent-created"` rather than `"stored"` because production omits `MEDIA_BUCKET` until #26 enables R2 or another durable audio path.

Production smoke evidence recorded on May 1, 2026:

- GitHub Actions run `25212955639` completed successfully from `main` at `2963f02d37bff4d862e00027f7774688ff9f5e26`.
- The run passed typecheck, unit/integration tests, Worker runtime tests, build, Cloudflare production preflight, remote D1 migrations, Worker deploy, production web build, and Pages deploy.
- `GET https://annotated-canvas-api.jaybhagat841.workers.dev/api/health` returned `200` with `ok: true`, `service: annotated-canvas-api`, and `mode: production`.
- `GET https://annotated-canvas.pages.dev/`, `/home`, `/u/mira`, and `/a/ann_d586ad40-058a-42c1-b6d7-8e0e691cfae4` returned `200`.
- `GET /api/annotations/ann_d586ad40-058a-42c1-b6d7-8e0e691cfae4` returns canonical `permalink_url: https://annotated-canvas.pages.dev/a/ann_d586ad40-058a-42c1-b6d7-8e0e691cfae4`.
- `GET /api/feed` includes `ann_d586ad40-058a-42c1-b6d7-8e0e691cfae4`.
- `GET /api/me` from the Pages origin returned `401 authentication_required`, which is the expected signed-out state.
- Google and X auth start endpoints returned `503 auth_not_configured`, listing the missing provider client IDs/secrets.
- Earlier production API smoke created comment `cmt_73c82db2-d4db-4661-b92e-84b12b4e74e7`, claim notice `claim_36899790-f89f-4add-9744-046b5b46c3f3`, and `POST /api/uploads/audio-commentary` returned `status: intent-created`.
- Important boundary: this is API-level production smoke. It does not replace #30 browser p95 proof for exact selected text, real media current time, or no-network rejection from the unpacked extension.

## Known Blockers Before External Submission

- Public deployment is live and #22 is closed. Do not list Cloudflare deploy-from-main as a remaining blocker.
- Real Google/X OAuth needs provider client IDs/secrets, callback configuration, token exchange, and production-safe sessions. Tracked by #24.
- Extension and web capture need final proof that user-entered text/time selections bind exactly to the publish payload. Tracked by #23.
- Selected-text context menu, real media current-time capture, over-90-second browser validation, and audio commentary remain p95 extension proof gaps. Tracked by #30 and #26.
- Audio commentary recording/finalize and 240p owned-media policy remain unresolved. Tracked by #26.
- R2 is not enabled in the Cloudflare account yet. Production omits the R2 binding, so audio upload storage remains blocked by #26.
- Chrome Web Store distribution is not part of the local MVP; reviewers load `dist/extension` unpacked.

Submission language to use if posting before all blockers close:

> Annotated Canvas is live as a source-linked MVP with GitHub-deployed public Pages/Worker URLs, public feed, permalinks, comments, claim filing, text commentary, API-level 90-second validation, and local unpacked Chrome side-panel proof. The current approved public smoke annotation is `ann_d586ad40-058a-42c1-b6d7-8e0e691cfae4`. The remaining disclosed gaps are real Google/X OAuth credentials and token exchange, production Chrome extension p95 proof for exact selected text/media timing and >90-second no-network rejection, durable recorded-audio storage, and owned-media 240p processing policy.

Dependency gate map: `output/reports/gas-town/dependency-gate-map.md`.

External inputs required before this packet can claim full bounty coverage:

- Google OAuth app credentials for `https://annotated-canvas-api.jaybhagat841.workers.dev/api/auth/google/callback`.
- X OAuth app credentials for `https://annotated-canvas-api.jaybhagat841.workers.dev/api/auth/x/callback`.
- R2 enablement for bucket `annotated-canvas-media`, or an approved alternate storage path for recorded audio commentary.
- Product/legal decision for third-party reference-only media versus owned-video 240p/sub-480p processing.

## Final Submission Checklist

- [x] Public web URL is live and replaces the placeholder above.
- [x] Public API health URL returns OK and replaces the placeholder above.
- [x] GitHub Actions deploy-from-main is proven by run `25212955639`.
- [x] Public feed, profile, permalink, removed state, and claim flow are smoke-tested.
- [x] Approved public smoke annotation is current: `ann_d586ad40-058a-42c1-b6d7-8e0e691cfae4`.
- [x] Chrome extension builds with `npm run build:extension`.
- [x] Unpacked extension loads from `dist/extension` and side panel opens in Chrome.
- [ ] Extension Settings saves the production Worker URL and publishes through that API base without source edits.
- [ ] Current-page capture publishes the exact selected text or media time range.
- [ ] Selected-text context menu proof includes exact quote preservation in the production payload and stored annotation.
- [ ] Real media current-time proof includes browser `currentTime`, seeded side-panel fields, and exact production payload media seconds.
- [ ] URL-input capture publishes with the original `source_url`.
- [x] Media duration over 90 seconds is rejected.
- [ ] Browser p95 proof shows over-90-second extension publish is blocked before any production network request.
- [x] Every public annotation links back to its original source.
- [x] Comments and engagement are demonstrated on a public annotation.
- [x] `File a claim` records a notice and does not automatically remove content.
- [ ] Audio commentary limitation is documented with microphone/upload evidence and the production R2 `intent-created` fallback.
- [ ] Demo Google and X auth behavior is documented, or production OAuth is fully configured.
- [ ] Known limitations are copied into the bounty submission without hiding bounty-critical gaps.
- [ ] Submission is posted to `https://annotated.lovable.app`.
