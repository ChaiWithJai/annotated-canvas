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

## Smoke Checklist

- [x] `npm run build:extension` exits successfully and leaves `dist/extension/manifest.json`, `sidepanel.html`, `sidepanel.js`, `service-worker.js`, `content-script.js`, and `assets/sidepanel.css`.
- [x] Chrome loads `dist/extension` without manifest or permission errors.
- [x] Extension action opens the Chrome side panel.
- [x] Settings tab shows `http://localhost:8787` by default.
- [x] Settings tab saves the API URL in `chrome.storage.local`; production Worker URL switching remains pending until deployment URL exists.
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

## Evidence To Capture

- Terminal output from `npm run build:extension`.
- File listing for `dist/extension`.
- Screenshot or recording of the loaded extension card at `chrome://extensions`.
- Screenshot or recording of the side panel opened on a real page.
- Screenshot or recording of selected text capture.
- Screenshot or recording of media time range capture.
- Screenshot or recording of the over-90-second client-side validation.
- Network/API evidence for successful publish, including annotation id.
- Feed, permalink, or API response proving the published annotation is visible.
- Settings proof showing localhost and production API base switching.
- Audio commentary proof, or a precise microphone/upload/R2 blocker.

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
- Audio commentary needs microphone permission and upload proof against local or deployed R2-backed storage.
- Production API URL switching needs the deployed Cloudflare Worker URL.
