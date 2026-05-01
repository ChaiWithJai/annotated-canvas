# Annotated Canvas Bounty Submission Packet

Reviewer-facing packet for the Annotated MVP bounty described in `bounty.txt`.

## Submission Links

Fill these in immediately before posting to `https://annotated.lovable.app`.

| Item | Value |
| --- | --- |
| Public web URL | `https://annotated-canvas.pages.dev` |
| Public API health URL | `https://annotated-canvas-api.jaybhagat841.workers.dev/api/health` |
| Public feed URL | `https://annotated-canvas.pages.dev/` |
| Public annotation permalink | `https://annotated-canvas.pages.dev/a/ann_74ce284f-0516-41d1-a8f0-fdb0d3b824b0` |
| Public profile URL | `https://annotated-canvas.pages.dev/u/mira` |
| Source repository | `https://github.com/ChaiWithJai/annotated-canvas` |
| Local web URL | `http://127.0.0.1:5173` |
| Local API URL | `http://localhost:8787` |
| Local API health check | `http://localhost:8787/api/health` |
| Chrome extension artifact | `dist/extension` after `npm run build:extension` |

Public demo routes:

- Feed: `https://annotated-canvas.pages.dev/`
- Profile: `https://annotated-canvas.pages.dev/u/mira`
- Annotation permalink: `https://annotated-canvas.pages.dev/a/ann_74ce284f-0516-41d1-a8f0-fdb0d3b824b0`
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
8. Use the capture controls to create a text selection or time-range annotation with commentary.
9. After rebuilding, return to `chrome://extensions` and reload the extension card.

## Demo Script

Target length: 8-10 minutes.

1. Open the public web URL or local feed at `http://127.0.0.1:5173/`.
2. Show the public feed, source-domain labels, engagement counts, and `File a claim` button.
3. Open `http://127.0.0.1:5173/u/mira` and show the creator profile and annotation list.
4. Open `http://127.0.0.1:5173/a/ann_video_minimalism` and show the permalink, original source link, commentary, and clip metadata.
5. Show local demo auth start URLs for Google and X:

   ```bash
   curl "http://localhost:8787/api/auth/google/start?return_to=http://127.0.0.1:5173/"
   curl "http://localhost:8787/api/auth/x/start?return_to=http://127.0.0.1:5173/"
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
| Sidebar Chrome extension | MV3 side panel loaded from `dist/extension`; side panel opens on source pages. | Local Chrome proof recorded in #30; broader capture hardening remains in #23. |
| Highlight and clip text/audio/video from any website | Current-tab context, selected text, and media time-range UI/API payloads. | Partial, tracked by #23 and #26. |
| Add commentary and annotations | Text commentary publish path and API contract. | Partial, audio commentary tracked by #26. |
| Landing page links back to original source | Annotation permalink includes source metadata and original source link. | Public permalink smoke proof exists. |
| Public social feed | Feed route and API feed path. | Public Worker and Pages smoke proof exists. |
| Users can follow and engage | Feed/profile engagement and comments work from the local MVP stream. | Comments work from closed #25; broader parity remains part of review proof. |
| Account via X or Google | `/api/auth/google/start` and `/api/auth/x/start` demo mode; production OAuth plan. | Partial, real provider exchange blocked by #24 and external secrets. |
| User can enter URL or use current page | Web URL flow and extension current-page capture surface. | Partial, tracked by #23 for regression-proof binding. |
| Prompt for start/end or text section | Extension capture controls and API validation for media duration. | Partial, #23 tracks exact UI-to-payload verification. |
| Max clip size 90 seconds | Contracts/API reject over-90-second media references. | Implemented locally. |
| Downgrade clip to 240p or below 480p | Product decision: third-party media is source-linked by reference; owned uploads need processing policy. | Blocked by #26. |
| Text or recorded audio commentary | Text commentary works; upload/commentary contract exists. | Audio recording/finalize blocked by #26. |
| Users can leave comments | Comment resources and claim/feed docs reflect local completion. | Public smoke created `cmt_73c82db2-d4db-4661-b92e-84b12b4e74e7`. |
| File a claim button | Claim button/modal and `POST /api/claims` notice intake. | Public smoke created `claim_36899790-f89f-4add-9744-046b5b46c3f3` and annotation remained public. |
| All content links to original source | `source_url` required for third-party clips. | Implemented for third-party contracts/API. |
| Submit to annotated.lovable.app | Packet, URLs, demo script, and checklist. | Packet has live URLs; external submission still needs final extension p95 proof and known-limitations disclosure. |

## Current Open GitHub Issues

Open issue snapshot for `ChaiWithJai/annotated-canvas`:

- #21 `Epic: Bounty gap audit and submission readiness`
- #22 `Epic: Cloudflare CLI production setup and deployment`
- #23 `Epic: Complete extension and web capture journey`
- #24 `Epic: Real X/Google auth and extension handoff`
- #26 `Epic: Audio commentary and 240p media policy`
- #28 `Task: Prepare final bounty submission package`
- #30 `Task: Local Chrome extension install and bounty smoke verification`

Recently completed issue evidence relevant to the packet:

- #25 `Epic: Public feed, comments, follows, and engagement parity`
- #27 `Task: Harden claim filing into a reviewable notice workflow`

Local Chrome evidence recorded in #30:

- `dist/extension` loaded unpacked in Chrome Developer Mode.
- Extension ID: `knpgndejanjcgnfognmebiieingaimkl`.
- Side panel opened from the pinned toolbar action.
- Settings saved `http://localhost:8787`.
- Current-page capture on `http://127.0.0.1:5173/` published into the local Worker API.
- `GET /api/feed` returned `ann_e496763a-fb93-457b-a3f7-a6659d4f3e9d` with the expected active-tab source and commentary.

Production smoke evidence recorded on May 1, 2026:

- `GET https://annotated-canvas-api.jaybhagat841.workers.dev/api/health` returned `200`.
- `GET https://annotated-canvas.pages.dev/`, `/u/mira`, `/a/removed`, and `/a/ann_74ce284f-0516-41d1-a8f0-fdb0d3b824b0` returned `200`.
- `POST /api/annotations` created `ann_74ce284f-0516-41d1-a8f0-fdb0d3b824b0`.
- `GET /api/annotations/ann_74ce284f-0516-41d1-a8f0-fdb0d3b824b0` returns canonical `permalink_url: https://annotated-canvas.pages.dev/a/ann_74ce284f-0516-41d1-a8f0-fdb0d3b824b0`.
- `POST /api/annotations/ann_74ce284f-0516-41d1-a8f0-fdb0d3b824b0/comments` created `cmt_73c82db2-d4db-4661-b92e-84b12b4e74e7`.
- `POST /api/claims` created `claim_36899790-f89f-4add-9744-046b5b46c3f3`, and `GET /api/annotations/ann_74ce284f-0516-41d1-a8f0-fdb0d3b824b0` still returned `200`.
- `POST /api/uploads/audio-commentary` returned `status: intent-created`, confirming the R2-disabled fallback path.

## Known Blockers Before External Submission

- Public deployment is live. #22 remains open for GitHub CI/CD secret wiring and final deploy-from-main proof.
- Real Google/X OAuth needs provider client IDs/secrets, callback configuration, token exchange, and production-safe sessions. Tracked by #24.
- Extension and web capture need final proof that user-entered text/time selections bind exactly to the publish payload. Tracked by #23.
- Selected-text context menu, real media current-time capture, over-90-second browser validation, and audio commentary remain p95 extension proof gaps. Tracked by #30 and #26.
- Audio commentary recording/finalize and 240p owned-media policy remain unresolved. Tracked by #26.
- R2 is not enabled in the Cloudflare account yet. Production omits the R2 binding, so audio upload storage remains blocked by #26.
- Chrome Web Store distribution is not part of the local MVP; reviewers load `dist/extension` unpacked.

## Final Submission Checklist

- [x] Public web URL is live and replaces the placeholder above.
- [x] Public API health URL returns OK and replaces the placeholder above.
- [x] Public feed, profile, permalink, removed state, and claim flow are smoke-tested.
- [x] Chrome extension builds with `npm run build:extension`.
- [x] Unpacked extension loads from `dist/extension` and side panel opens in Chrome.
- [ ] Current-page capture publishes the exact selected text or media time range.
- [ ] URL-input capture publishes with the original `source_url`.
- [x] Media duration over 90 seconds is rejected.
- [x] Every public annotation links back to its original source.
- [x] Comments and engagement are demonstrated on a public annotation.
- [x] `File a claim` records a notice and does not automatically remove content.
- [ ] Demo Google and X auth behavior is documented, or production OAuth is fully configured.
- [ ] Known limitations are copied into the bounty submission without hiding bounty-critical gaps.
- [ ] Submission is posted to `https://annotated.lovable.app`.
