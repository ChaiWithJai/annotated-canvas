# Issue #23/#30 Extension Production Smoke Plan

Prepared for Worker C on May 1, 2026. This plan is based on the open #23/#30 issue comments and the current docs packet.

## Production Target

- Worker API base: `https://annotated-canvas-api.jaybhagat841.workers.dev`
- Health check: `GET /api/health`
- Observed baseline on May 1, 2026: `200` with `ok: true`, `service: annotated-canvas-api`, and `mode: production`.

## p50 Sequence

1. Build and reload the extension.
   - Evidence: `npm run build:extension` output, `ls -1 dist/extension`, and `chrome://extensions` screenshot showing the unpacked `Annotated Canvas` card.
2. Save the production API base.
   - Evidence: side-panel Settings before/after, `Save settings` -> `Saved.`, reopened Settings still showing `https://annotated-canvas-api.jaybhagat841.workers.dev`, and production health check output.
3. Publish one happy-path annotation from a real tab.
   - Evidence: side panel source title/domain, `POST /api/annotations` sent to the production Worker, request payload with `client_context.surface: "extension"`, response annotation id, and feed/permalink/API proof for the id.

## p95 Sequence

1. Selected-text context menu proof.
   - Steps: select an exact quote, right-click, choose `Annotate selected text`, confirm the side panel switches to `Selected text`, publish.
   - Evidence: selected quote screenshot, context menu item screenshot, side-panel quote preview, production request payload with `clip.kind: "text"`, exact `clip.text.quote`, `client_context.capture_method: "selection"`, response id, and stored annotation proof preserving the quote.
2. Real media current-time proof.
   - Steps: open a page with a real top-level `<video>` or `<audio>`, seek to a known time, record `document.querySelector("video,audio")?.currentTime`, open side panel, publish <=90 seconds.
   - Evidence: media page URL/title, console/current-time proof, side-panel `Start` and `End`, production request payload with `clip.kind` `video` or `audio`, exact `media.start_seconds`, `media.end_seconds`, `media.duration_seconds`, and stored annotation proof.
3. Over-90-second browser rejection.
   - Steps: clear Network, enter a range longer than 90 seconds, click `Publish annotation`.
   - Evidence: fields showing the >90 range, error text `Clip length must be 90 seconds or less.`, and Network/HAR proof that no production `POST /api/annotations` fired.
4. Audio/R2 limitation.
   - Steps: click `Record voice note`, handle the microphone prompt, stop recording if allowed, publish or call the upload endpoint directly.
   - Evidence: microphone prompt or `Microphone permission was blocked.`, `Voice note ready` if allowed, production `POST /api/uploads/audio-commentary` response with `upload.storage: "r2"` and `upload.status: "intent-created"` rather than `"stored"`, plus a limitation note that #26 owns durable R2/audio storage.

## Issue Comment Draft

Use this if posting a coordination update to #30, and optionally cross-link it in #23:

```md
Worker C planning update for the production extension smoke:

The p50 path is: rebuild/reload `dist/extension`, save `https://annotated-canvas-api.jaybhagat841.workers.dev` in Settings, publish one <=90-second annotation from a real tab, and verify the annotation id through production API/feed/permalink evidence.

The p95 path should then capture:
- selected-text context menu proof with exact quote preservation in the production `POST /api/annotations` payload and stored annotation;
- real `<video>`/`<audio>` current-time proof with console `currentTime`, seeded side-panel `Start`/`End`, and exact media seconds in the payload;
- >90-second browser rejection with the error `Clip length must be 90 seconds or less.` and Network/HAR proof that no production publish request fired;
- audio/R2 limitation proof with microphone prompt outcome and `POST /api/uploads/audio-commentary` returning `upload.status: "intent-created"` rather than `"stored"` until #26 enables durable storage.

Docs updated: `docs/chrome-extension-local-smoke.md` and `docs/submission-packet.md`.
```
