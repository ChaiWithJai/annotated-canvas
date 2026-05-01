# Chrome Extension Local Smoke Checklist

This checklist is for issue #30: local unpacked Chrome extension install and bounty smoke verification.

## Artifact And Manifest

- Source manifest: `apps/extension/public/manifest.json`
- Build command: `npm run build:extension`
- Generated unpacked directory: `dist/extension`
- Manifest version: MV3
- Extension name: `Annotated Canvas`
- Minimum Chrome version: `116`
- Background worker: `service-worker.js`
- Side panel entry: `sidepanel.html`
- Content script: `content-script.js`
- Required permissions: `sidePanel`, `scripting`, `storage`, `tabs`, `contextMenus`, `identity`
- Host permissions: `<all_urls>`

The extension API base defaults to `http://localhost:8787` through `DEFAULT_API_BASE` in `apps/extension/src/sidepanel/api.ts`. Testers can switch the API target in the side panel Settings tab; the value is persisted in `chrome.storage.local` under `apiBaseUrl`.

## Local Install Steps

1. From the repo root, run:

   ```sh
   npm run build:extension
   ```

2. Open Chrome 116 or newer.
3. Go to `chrome://extensions`.
4. Enable Developer mode.
5. Click Load unpacked.
6. Select the generated `dist/extension` folder, not `apps/extension`.
7. Confirm the extension card shows `Annotated Canvas`.
8. Pin the extension if useful.
9. Open a normal source page with text, video, or audio content.
10. Click the extension action icon; the MV3 side panel should open.
11. After any rebuild, return to `chrome://extensions` and click the reload icon on the Annotated Canvas card.

## Local API Setup

Run the local Worker before publishing from the side panel:

```sh
npm run cf:dev
```

Expected local API base:

```text
http://localhost:8787
```

Useful health check:

```sh
curl http://localhost:8787/api/health
```

If testing a deployed Worker, open the side panel Settings tab, replace the API URL with the deployed Worker origin, and save. This should not require a source edit or rebuild.

## Production Worker Setup

Use this API base for the #23/#30 production extension proof:

```text
https://annotated-canvas-api.jaybhagat841.workers.dev
```

Production health baseline observed on May 1, 2026:

```sh
curl https://annotated-canvas-api.jaybhagat841.workers.dev/api/health
```

Expected response shape:

```json
{
  "ok": true,
  "service": "annotated-canvas-api",
  "mode": "production"
}
```

## Smoke Checklist

- [x] `npm run build:extension` exits successfully and leaves `dist/extension/manifest.json`, `sidepanel.html`, `sidepanel.js`, `service-worker.js`, `content-script.js`, and `assets/sidepanel.css`.
- [x] Chrome loads `dist/extension` without manifest or permission errors.
- [x] Extension action opens the Chrome side panel.
- [x] Settings tab shows `http://localhost:8787` by default.
- [x] Settings tab saves the API URL in `chrome.storage.local`.
- [ ] Settings tab saves `https://annotated-canvas-api.jaybhagat841.workers.dev`, survives side-panel close/reopen, and publishes to the production Worker without source edits.
- [ ] On a text page, select text, right-click, choose `Annotate selected text`, and confirm the side panel displays the selected text path.
- [x] On a normal page, confirm the side panel reads the active tab URL/title through the content-script/tab fallback path.
- [ ] On a media page, confirm the side panel seeds a time range from the current media time when available.
- [x] Enter a range of 90 seconds or less, add commentary, publish, and confirm the local API returns success.
- [x] Verify the created annotation appears in the API feed or web client.
- [ ] Enter a range over 90 seconds and confirm publish is blocked with `Clip length must be 90 seconds or less.` before the network publish.
- [ ] Record a voice note, handle the microphone prompt, and publish it if the local API upload path is available; otherwise record the exact blocker.

## Verified Local Browser Evidence

- Build: `npm run build` passed after pinning Vite 7.3.2 and `@vitejs/plugin-react` 5.2.0.
- Local API: `curl http://localhost:8787/api/health` returned `ok: true` for `annotated-canvas-api`.
- Chrome install: `dist/extension` was loaded through `chrome://extensions` with Developer Mode enabled.
- Chrome extension ID: `knpgndejanjcgnfognmebiieingaimkl`.
- Pinning: toolbar pin was enabled for `Annotated Canvas`.
- Side panel: action icon opened `chrome-extension://knpgndejanjcgnfognmebiieingaimkl/sidepanel.html`.
- Settings: API URL displayed `http://localhost:8787`; Save settings returned `Saved.`.
- Active-tab capture: side panel opened on `http://127.0.0.1:5173/` and displayed source title `Annotated Canvas`.
- Publish: side panel published a 47-second time range with commentary `Local extension smoke test for bounty criteria: capture from active tab to local API.`
- API feed proof: `GET /api/feed` returned `ann_e496763a-fb93-457b-a3f7-a6659d4f3e9d` with source URL `http://127.0.0.1:5173/`, domain `127.0.0.1`, title `Annotated Canvas`, and the smoke-test commentary.

## Sequenced Production p50/p95 Smoke Plan

Run this sequence after rebuilding and reloading `dist/extension`. Keep Chrome DevTools Network open for the side panel, clear the log before each publish/rejection case, and preserve the request payloads or export a HAR where practical.

### Setup And API-Base Switch

1. Build the artifact with `npm run build:extension`.
2. Record `ls -1 dist/extension` showing `manifest.json`, `sidepanel.html`, `sidepanel.js`, `service-worker.js`, `content-script.js`, and `assets/sidepanel.css`.
3. Open `chrome://extensions`, reload the `Annotated Canvas` unpacked extension, and record the extension card with Developer Mode enabled.
4. Open the side panel, go to Settings, replace `http://localhost:8787` with `https://annotated-canvas-api.jaybhagat841.workers.dev`, and click `Save settings`.
5. Close and reopen the side panel. The `API URL` field should still show the production Worker URL.
6. Capture `curl -i https://annotated-canvas-api.jaybhagat841.workers.dev/api/health` returning `200` with `"mode": "production"`.

Evidence to retain: build output, extension-card screenshot or recording, Settings screenshot before and after save, reopened Settings screenshot, the health-check response, and confirmation that no app or API source files were edited for the API-base switch.

### p50 Happy Path

1. Open a normal source page in Chrome.
2. Open the extension side panel and verify the displayed source title/domain matches the active tab.
3. Leave `Time range` selected, enter a range of 90 seconds or less, add a unique text note, and click `Publish annotation`.
4. Verify the side panel reaches `Published`.
5. Fetch the returned annotation or `GET https://annotated-canvas-api.jaybhagat841.workers.dev/api/feed` and confirm the new id appears.

Evidence to retain: side-panel source screenshot, Network `POST /api/annotations` request to the production Worker, request JSON with `client_context.surface: "extension"`, response annotation id, feed/permalink/API proof for that id, and the exact commentary string used for correlation.

### p95 Selected-Text Context Menu

1. Open a normal HTTPS text page that allows selection.
2. Select a short exact quote. Prefer a sentence stable enough to compare byte-for-byte in the payload.
3. Right-click the selection and choose `Annotate selected text`.
4. Verify the side panel opens in `Selected text` mode and the quote preview matches the selected text exactly.
5. Add a unique note and publish to the production Worker.

Evidence to retain: screenshot or recording of the selected browser text, the context menu item `Annotate selected text`, the side-panel quote preview, and the production `POST /api/annotations` payload showing:

```json
{
  "clip": {
    "kind": "text",
    "text": {
      "quote": "the exact selected quote"
    }
  },
  "client_context": {
    "surface": "extension",
    "capture_method": "selection"
  }
}
```

Also retain the response annotation id and a follow-up API/permalink/feed response proving the stored annotation still contains the same quote and source URL.

### p95 Real Media Current-Time Capture

1. Open a page with a real top-level `<video>` or `<audio>` element. Avoid iframe-only players for this proof unless the extension explicitly supports reading them.
2. Play or seek the media to a known current time, such as `00:01:12`.
3. Before opening the side panel, capture DevTools Console output for:

   ```js
   document.querySelector("video,audio")?.currentTime
   document.querySelector("video,audio")?.tagName
   ```

4. Open or reload the side panel. The `Start` field should seed from `Math.floor(currentTime)`, and `End` should seed to `Start + 47`.
5. Publish a 90-second-or-less range to the production Worker.

Evidence to retain: media page URL/title, media control or console proof of `currentTime`, side-panel `Start` and `End` fields, production `POST /api/annotations` payload showing `clip.kind` as `video` or `audio`, and exact `media.start_seconds`, `media.end_seconds`, and `media.duration_seconds`. Confirm the stored annotation through API/feed/permalink evidence.

### p95 Over-90-Second Rejection

1. Keep the production Worker URL saved in Settings.
2. On the media capture screen, clear the Network log.
3. Enter a range longer than 90 seconds, for example `Start` = `00:00:00` and `End` = `00:01:31`.
4. Click `Publish annotation`.
5. Confirm the side panel shows `Clip length must be 90 seconds or less.`
6. Confirm no new `POST /api/annotations` request was sent after the click.

Evidence to retain: side-panel fields, the exact error text, a Network panel screenshot or HAR showing no production `POST /api/annotations` for the rejected click, and a note that API/contract validation still rejects over-90 payloads if sent directly.

### p95 Audio/R2 Limitation

1. Keep the production Worker URL saved in Settings.
2. Click `Record voice note`, handle Chrome's microphone prompt, stop recording, and record whether the side panel shows `Voice note ready` or `Microphone permission was blocked.`
3. If a voice note is ready, publish with a short text or media capture.
4. Capture the production `POST /api/uploads/audio-commentary` response.
5. Independently verify the production upload fallback with:

   ```sh
   printf 'audio-smoke' | curl -sS -X POST \
     "https://annotated-canvas-api.jaybhagat841.workers.dev/api/uploads/audio-commentary" \
     -H "Content-Type: audio/webm" \
     --data-binary @-
   ```

Evidence to retain: microphone prompt or blocker screenshot, `Voice note ready` screenshot if recording succeeds, upload response JSON showing `upload.storage: "r2"` and `upload.status: "intent-created"` rather than `"stored"`, and a submission note that production omits `MEDIA_BUCKET` until #26 enables R2 or another durable audio storage path.

## Evidence To Capture

- Terminal output from `npm run build:extension`.
- File listing for `dist/extension`.
- Screenshot or recording of the loaded extension card at `chrome://extensions`.
- Screenshot or recording of the side panel opened on a real page.
- Screenshot or recording of selected text capture, including the context menu item and exact quote.
- Screenshot or recording of media time range capture, including real media `currentTime` and seeded `Start`/`End`.
- Screenshot or recording of the over-90-second client-side validation and proof that no network publish occurred.
- Network/API evidence for successful publish, including annotation id.
- Feed, permalink, or API response proving the published annotation is visible.
- Settings proof showing localhost and production API base switching to `https://annotated-canvas-api.jaybhagat841.workers.dev`.
- Audio commentary proof, or a precise microphone/upload/R2 blocker with `status: "intent-created"`.

## Bounty Criteria Mapping

| Bounty requirement | Smoke proof |
| --- | --- |
| Sidebar Chrome extension | `dist/extension` loads unpacked and opens the MV3 side panel from the extension action. |
| Highlight and clip media from any website | Selected text path captures selected text; media path captures active page URL/title and time range. |
| Add commentary and annotations | Side panel commentary publishes through `POST /api/annotations`. |
| Public feed of annotated content | Published annotation appears in the web client/feed or API feed response. |
| URL input or current page | Extension reads the current tab URL/title through content script or tab fallback. |
| Highlight moments in videos/audio/text | Text selection, video/audio time range, and 90-second media cap are exercised. |
| Max clip size 90 seconds | Side panel blocks media ranges over 90 seconds before network publish. |
| Audio commentary | Voice note flow is tested or explicitly marked blocked with browser/API evidence. |

## Learning Log Pitfalls

Capture these in `docs/issue-learning-loop.md` or the issue thread after browser verification:

- MV3 side panel testing is not equivalent to normal web-app Playwright testing.
- `chrome://extensions` reload is required after rebuilding an unpacked extension.
- Reviewers must load `dist/extension`; loading `apps/extension` fails because built entry files are absent.
- The API base must remain configurable between localhost and production without source edits.
- Localhost CORS and extension host permissions need to be verified together.
- Context menu selected-text capture and active-tab content-script capture are separate paths.
- Microphone prompts and upload storage can block audio commentary independently from text/media publish.
- The extension should not rely on Chrome Web Store distribution for the local bounty smoke.

## Remaining P95 Smoke Gaps

- Selected-text context menu capture still needs a browser proof pass on a normal content page.
- Media current-time seeding still needs a proof pass on a real video/audio page.
- Over-90-second client-side validation still needs browser proof, even though unit coverage exercises the publish path.
- Audio commentary needs microphone permission and upload proof; production currently returns the R2-disabled `intent-created` fallback until #26 enables durable storage.
- Production API URL switching needs browser proof against `https://annotated-canvas-api.jaybhagat841.workers.dev`.
