# Reviewer Journey And Krug Pass

Use this as the script before recording the demo video. It reconciles `bounty.txt`, the public app, and the local unpacked Chrome extension path.

## p50 Happy Path

1. Open `https://annotated-canvas.pages.dev/home`.
2. Confirm the first screen says what the app does, links to the public feed, and exposes `Extension install guide`.
3. Open `https://annotated-canvas.pages.dev/` and scan source domains, engagement, and `File a claim`.
4. Open `https://annotated-canvas.pages.dev/a/ann_d586ad40-058a-42c1-b6d7-8e0e691cfae4`.
5. Confirm the permalink has commentary, media timing, author, original source link, comments, and claim action.
6. Build and load the extension locally:

   ```bash
   npm run build:extension
   ```

   Then open `chrome://extensions`, enable Developer Mode, click `Load unpacked`, and select `dist/extension`.

7. Open a source page, open the extension side panel, choose `Settings`, select `Production`, and save.
8. Capture selected text or a media time range of 90 seconds or less, add commentary, and publish.
9. Copy the returned annotation id/permalink from the `Published` tab.
10. Return to the web feed/permalink and verify the source link, comment path, and claim path.

## p95 Sad Paths

| Path | Expected behavior | Evidence |
| --- | --- | --- |
| Google/X not configured | Signup shows the provider blocker and points to feed plus unpacked extension review path. | Web screenshot and `/api/auth/*/start` response. |
| Extension not installed | Web onboarding links to the install guide; docs say `dist/extension`, not source folders. | Home screenshot and install proof. |
| Wrong API URL | Side panel Settings lets reviewer switch Local/Production without source edits. | Settings screenshot after reopen. |
| No selected text | Selected-text proof must show exact browser selection, preview, payload, and stored quote. | Screenshot plus request/response. |
| Reversed or over-90 range | Side panel blocks publish before network; API/contracts reject direct invalid payload. | Error screenshot and no `POST /api/annotations`. |
| Audio storage unavailable | UI/docs disclose R2 `intent-created`; do not claim durable audio playback. | Upload response and #26 link. |
| Claim submitted | Claim is recorded as review intake and does not automatically remove the annotation. | Claim id/status and permalink still visible. |

## Krug Guardrails

- The page name and next action must be visible without reading docs.
- Buttons must name the action: `View public feed`, `Extension install guide`, `Publish annotation`, `File a claim`.
- Do not claim Google/X auth is complete until provider secrets and production smoke pass.
- Do not hide the Chrome Web Store gap; local unpacked install is part of the review path.
- Keep source links and claim actions visible on every annotation surface.
- Keep recovery copy near the failed action.

## Testing Trophy

- **Static/contract**: source URL required, media duration <= 90 seconds, audio asset id required, idempotency required.
- **Integration**: feed, permalink, comments, claims, auth failure, extension-token handoff.
- **Browser smoke**: home/feed/permalink screenshots, extension Settings persistence, p50 publish, selected-text proof, media-time proof, over-90 no-network proof.
- **Manual proof**: Chrome unpacked extension installation and microphone prompt behavior.
