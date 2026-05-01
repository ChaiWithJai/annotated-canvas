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

The extension API base defaults to `http://localhost:8787` through `DEFAULT_API_BASE` in `apps/extension/src/sidepanel/api.ts`. Testers can switch the API target in the side panel Settings tab with the `Local` and `Production` presets or by typing a URL; the value is persisted in `chrome.storage.local` under `apiBaseUrl`.

Local smoke drafts are stored in `chrome.storage.local` under `captureDraft`. The context-menu selected-text handoff uses `pendingCapture` once and clears it after the side panel reads it, which avoids stale selections during repeated smoke runs.

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
- [x] Settings tab includes local and production API-base presets.
- [x] Capture tab can save and restore the latest local draft from Chrome extension storage.
- [x] Published tab shows the last production/local annotation id and permalink returned by `POST /api/annotations`.
- [ ] Settings tab saves `https://annotated-canvas-api.jaybhagat841.workers.dev`, survives side-panel close/reopen, and publishes to the production Worker without source edits.
- [ ] On a text page, select text, right-click, choose `Annotate selected text`, and confirm the side panel displays the selected text path.
- [x] On a normal page, confirm the side panel reads the active tab URL/title through the content-script/tab fallback path.
- [ ] On a media page, confirm the side panel seeds a time range from the current media time when available.
- [x] Enter a range of 90 seconds or less, add commentary, publish, and confirm the local API returns success.
- [x] Verify the created annotation appears in the API feed or web client.
- [ ] Enter a range over 90 seconds and confirm publish is blocked with `Clip length must be 90 seconds or less.` before the network publish.
- [ ] Enter an end time at or before the start time and confirm publish is blocked with `End time must be after start time.` before the network publish.
- [ ] Record a voice note, handle the microphone prompt, and publish it if the local API upload path is available; otherwise record the exact blocker.

## Worker B Audit, May 1 2026

Current implementation status against `bounty.txt`:

| Requirement | Current extension status |
| --- | --- |
| Sidebar Chrome extension | Implemented as MV3 side panel with `chrome.sidePanel` and loadable `dist/extension`. Needs refreshed production browser screenshot/recording. |
| Current page URL | Implemented through content-script `ANNOTATED_READ_CONTEXT` with a tab URL/title fallback. Local Chrome proof exists; production URL publish still needs evidence. |
| Selected text | Implemented through context menu `Annotate selected text`, one-shot `pendingCapture`, and `clip.text.quote` trimming. Needs browser proof that the exact selected quote is preserved in production payload and stored annotation. |
| Audio/video time range | Implemented through top-level `video, audio` current-time capture and side-panel Start/End fields. Needs browser proof on real media that seeded seconds match `POST /api/annotations`. |
| Commentary | Implemented for text commentary and recorded audio commentary upload-before-publish. Audio storage remains limited by the current production upload fallback until #26 enables durable R2 storage. |
| Publish to production API | Implemented through persisted Settings API base and Production preset. Needs side-panel production proof using `https://annotated-canvas-api.jaybhagat841.workers.dev`. |
| Permalink/feed proof | API returns the annotation resource with `id` and `permalink_url`; the side panel now surfaces the last publish id/permalink in the Published tab for smoke evidence. |
| Stale state handling | Pending selected-text captures are cleared after one read, local drafts are explicit, and failed publishes clear any previous publish result before retry. |
| 90-second cap | Implemented in side panel and publish helper before audio upload or annotation fetch. Reversed/zero-length media ranges are now rejected before fetch instead of being silently adjusted. |

## Automated Extension Coverage

Run before the browser proof:

```sh
npm run test:node -- apps/extension/src/sidepanel/api.test.ts
npm run build:extension
```

Covered cases:

- p50 media publish preserves the exact entered start/end/duration.
- p95 media ranges over 90 seconds throw `range_too_long` before annotation fetch.
- p95 audio commentary with a range over 90 seconds throws before upload or annotation fetch.
- Reversed media ranges throw `invalid_range` before annotation fetch.
- p95 selected-text publish trims and preserves the exact quote in `clip.text.quote` and uses `client_context.capture_method: "selection"`.
- Publish responses are parsed into a full annotation resource so the side panel can show the returned id and permalink.
- Production API-base persistence normalizes `https://annotated-canvas-api.jaybhagat841.workers.dev/` to `https://annotated-canvas-api.jaybhagat841.workers.dev`.
- Pending selected-text capture clears after one read.
- Local capture drafts persist with trimmed commentary.

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

Template:

```md
API base saved:
- Before:
- After save:
- After side-panel reopen:
- Health command:
- Health response:
- Source edits required: no
```

### p50 Happy Path

1. Open a normal source page in Chrome.
2. Open the extension side panel and verify the displayed source title/domain matches the active tab.
3. Leave `Time range` selected, enter a range of 90 seconds or less, add a unique text note, and click `Publish annotation`.
4. Verify the side panel reaches `Published`.
5. Fetch the returned annotation or `GET https://annotated-canvas-api.jaybhagat841.workers.dev/api/feed` and confirm the new id appears.

Evidence to retain: side-panel source screenshot, Network `POST /api/annotations` request to the production Worker, request JSON with `client_context.surface: "extension"`, response annotation id, feed/permalink/API proof for that id, and the exact commentary string used for correlation.

After publish, open the side panel Published tab and record the returned annotation id/permalink displayed there before switching tabs or retrying a publish.

Template:

```md
p50 publish:
- Page URL/title:
- Commentary:
- Request URL:
- Request client_context:
- Response annotation id:
- Feed/permalink/API proof:
```

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

Template:

```md
Selected-text proof:
- Page URL/title:
- Exact selected text:
- Side-panel quote preview:
- Request clip.kind:
- Request clip.text.quote:
- Request capture_method:
- Response annotation id:
- Stored annotation proof:
```

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

Template:

```md
Media timecode proof:
- Page URL/title:
- Console currentTime/tagName:
- Side-panel Start/End:
- Request clip.kind:
- Request media:
- Response annotation id:
- Stored annotation proof:
```

### p95 Over-90-Second Rejection

1. Keep the production Worker URL saved in Settings.
2. On the media capture screen, clear the Network log.
3. Enter a range longer than 90 seconds, for example `Start` = `00:00:00` and `End` = `00:01:31`.
4. Click `Publish annotation`.
5. Confirm the side panel shows `Clip length must be 90 seconds or less.`
6. Confirm no new `POST /api/annotations` request was sent after the click.

Evidence to retain: side-panel fields, the exact error text, a Network panel screenshot or HAR showing no production `POST /api/annotations` for the rejected click, and a note that API/contract validation still rejects over-90 payloads if sent directly.

Template:

```md
Over-90 rejection:
- Start:
- End:
- Error text:
- Network proof of no POST:
- API/contract validation note:
```

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

Template:

```md
Audio limitation:
- Microphone prompt/result:
- Voice note ready:
- Upload response:
- Durable storage status:
- Blocker owner:
```

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

## Worker B Issue Comment Draft

Use this for #23 and #30 after this branch lands or as a coordination update:

```md
Worker B extension smoke audit update, May 1 2026:

Code/doc changes are scoped to `apps/extension/**` and `docs/chrome-extension-local-smoke.md`.

What changed:
- The extension publish helper now parses the production `POST /api/annotations` response into a full annotation resource.
- The side panel Published tab now shows the last returned annotation id and permalink, so p50/p95 smoke evidence can record the production id without digging through DevTools.
- Media publishes now reject zero-length or reversed ranges before upload/fetch with `End time must be after start time.` instead of silently changing the entered end time.
- The smoke doc now maps the current extension state against `bounty.txt` and calls out remaining browser proof.

Verified:
- `npx vitest run apps/extension/src/sidepanel/api.test.ts --environment node --no-file-parallelism --maxWorkers=1 --pool=forks --isolate=false --reporter=verbose` -> 10 extension tests passed.
- `npm run build:extension` -> rebuilt `dist/extension`.
- `npm run typecheck` -> passed.
- `curl -i https://annotated-canvas-api.jaybhagat841.workers.dev/api/health` -> `200`, `mode: "production"`.
- `curl -i https://annotated-canvas.pages.dev/` -> `200`.

Not completed in this pass:
- I did not load/reload the unpacked extension in desktop Chrome because installing/loading a browser extension is a user-confirmed action.
- I did not create a new public production annotation because that posts public test content and should be confirmed at action time.
- `npm test` still hung in the combined Vitest node startup path before spawning workers; the focused extension suite passed.

Close gate still needs browser evidence:
- Save `https://annotated-canvas-api.jaybhagat841.workers.dev` in side-panel Settings and confirm it persists after reopen.
- Publish one production p50 annotation and record the side-panel Published id/permalink plus API/feed proof.
- Use `Annotate selected text` on a normal page and prove the exact quote is preserved in payload and stored annotation.
- Use a real `<video>` or `<audio>` page and prove current time -> Start/End -> production media seconds.
- Enter a >90s range and prove the side-panel error appears with no production `POST /api/annotations`.
- Record microphone/audio upload behavior and the current #26 durable-storage limitation.
```
