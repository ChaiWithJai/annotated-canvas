# Bounty Gap Audit

Source: `bounty.txt`, captured from the April 30, 2026 Annotated bounty thread.

## Current Status

- The repository is public.
- The local web client and local Worker API run.
- CI verifies typecheck, tests, Worker runtime tests, and production builds.
- The product is not deployed to a public Cloudflare URL yet.
- The Chrome extension can be built and loaded unpacked locally.

## Discrepancies

| Bounty requirement | Current status | Delivery issue |
| --- | --- | --- |
| Sidebar Chrome extension | Partial: MV3 side panel exists. | #23 |
| Highlight and clip media from any website | Partial: current tab, selection, and media references exist; broad compatibility needs hardening. | #23 |
| Add commentary and annotations | Partial: text works; audio recording path is new and still needs production media hardening. | #26 |
| Landing page linking back to original source | Partial: permalink exists locally; public deployment missing. | #22, #28 |
| Public social feed | Partial: feed exists locally; public deployment missing. | #22, #25 |
| Follow and engage with annotations | Partial: follows and engagement exist; comments were missing and are now tracked in #25. | #25 |
| Account via X or Google | Partial: demo OAuth exists; real provider exchange and secrets are missing. | #24 |
| URL input or current page | Partial: current page exists in extension; web composer now covers URL input locally. | #23 |
| Prompt for start/end or text section | Partial: UI exists; issue #23 tracks binding and regression proof. | #23 |
| Max clip size 90 seconds | Implemented in contracts/API. | #21 |
| Downgrade to 240p / below 480p | Missing product decision for third-party references versus owned uploads. | #26 |
| Text or recorded audio commentary | Partial: text works; recorded audio needs full upload/finalize proof. | #26 |
| Users can leave comments | Implemented locally in API/UI during this audit pass. | #25 |
| File a claim | Partial: notice intake works; status/events are now implemented locally and need public proof. | #27 |
| All content links to original source | Implemented for third-party clips through contracts/API. | #21 |
| Submit to annotated.lovable.app | Missing until public deployment and demo package are ready. | #28 |

## Learning Notes

- A UI field is not proof of behavior. The extension timecode fields must be tied to the publish payload and tested at the contract boundary.
- Third-party media should remain source-linked unless a rights-safe owned-upload path is used.
- Cloudflare setup is blocked by authentication and generated resource IDs, so the durable fix is a repeatable CLI bootstrap plus a clear human login/token step.
