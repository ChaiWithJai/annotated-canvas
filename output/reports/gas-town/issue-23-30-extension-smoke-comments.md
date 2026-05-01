# Issue #23/#30 Extension Smoke Comment Drafts

Prepared on May 1, 2026 from branch `codex/issue-23-extension-mvp-smoke`.

Posted:

- #30: https://github.com/ChaiWithJai/annotated-canvas/issues/30#issuecomment-4357699541
- #23: https://github.com/ChaiWithJai/annotated-canvas/issues/23#issuecomment-4357699827

## Issue #30 Comment Draft

```md
Extension local-install smoke update for #30:

Implemented local-run affordances for the unpacked MV3 extension:
- Settings now has explicit Local and Production API-base presets and still persists the normalized URL in `chrome.storage.local`.
- Capture can save/restore the latest local draft from extension storage.
- Context-menu selected-text handoff trims the selected quote and clears the pending capture after the side panel reads it.
- Publish now has an explicit <=90s media guard before upload or annotation fetch, so over-limit audio/video attempts produce no publish network request.
- The side panel now states the signed-out limitation: production publishes still use the demo API author until extension OAuth handoff lands.

Automated evidence:
- `npm run test:node -- apps/extension/src/sidepanel/api.test.ts`
- `npm run build:extension`

Acceptance criteria still requiring browser evidence:
- Load `dist/extension` in Chrome 116+ from `chrome://extensions`.
- Save `https://annotated-canvas-api.jaybhagat841.workers.dev` in Settings, close/reopen the side panel, and confirm it persists.
- Publish one <=90s annotation to the production Worker and verify the returned annotation through feed/permalink/API.
- Select exact text on a normal page, use `Annotate selected text`, publish, and verify `clip.text.quote` and `client_context.capture_method: "selection"`.
- Capture a real top-level `<video>` or `<audio>` current time and verify seeded Start/End and production media payload.
- Enter >90s, click publish, confirm `Clip length must be 90 seconds or less.` and no production `POST /api/annotations`.
- Record the audio commentary outcome; production upload is expected to remain an `intent-created`/durable-storage limitation until #26.

Docs updated with exact steps and evidence templates in `docs/chrome-extension-local-smoke.md` and `docs/user-guide.md`.
```

## Issue #23 Comment Draft

```md
Extension capture journey update for #23:

The extension path is now closer to a repeatable end-to-end MVP smoke:
- API base can be switched between localhost and production from the side panel without rebuild/source edits.
- Selected-text capture is preserved from context menu to publish payload and stale pending captures are cleared.
- Media publish blocks >90s ranges before any upload or annotation request.
- Local draft save/restore exists for commentary/capture setup.
- Signed-out/auth limitation is visible in the extension: publishing works through the API demo author while real extension OAuth handoff remains pending.

Unit coverage now exercises p50 media publish, p95 selected-text payload, production API-base persistence, pending-capture clearing, local draft persistence, and >90s pre-network rejection.

Remaining close gate is browser evidence against the production Worker: exact selected quote in the production payload/stored annotation, exact media seconds from a real `<video>`/`<audio>`, and over-90s rejection with no network publish.
```
