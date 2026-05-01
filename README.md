# Annotated Canvas

Annotated Canvas is a Chrome side panel and web client for clipping exact moments from web media, adding commentary, and publishing public annotations that always link back to the original source.

The product is based on the `Annotated` bounty context captured in this repository. The MVP intentionally stores third-party clips by reference, not by re-hosting third-party media bytes.

## Product Surfaces

- Chrome MV3 side panel extension for capture from the current tab.
- Public web client for feed, profiles, annotation permalinks, and claim filing.
- REST API server/router that sends requests to the correct Cloudflare-backed service.
- Cloudflare service layer for auth, annotations, feed, claims, engagement, media references, and async jobs.

## MVP Invariants

- Every published annotation must include `source_url`.
- Third-party media is clipped by reference with text selection or timestamp offsets.
- OAuth is X or Google only for MVP.
- Published annotations have a public permalink and a `File a claim` workflow.
- Queue consumers must be idempotent because background delivery can happen more than once.

## Repo Context

- `original-design.md` contains the structured bounty and domain model.
- `design-inpso.md` contains the visual/product direction.
- `mocks.md` contains a UI and API mockup.
- `bounty.txt` contains the source bounty thread text captured locally.
- `docs/api-contracts.md` defines the first REST contract draft.
- `docs/cloudflare-architecture.md` defines the first system architecture draft.
- `docs/issue-learning-loop.md` defines how issues should document learning, pitfalls, and roadblocks.

## First Delivery Streams

1. Frontend UI scaffold: web client pages, extension side panel, shared design tokens, reusable clip/source components.
2. Core API contracts: OpenAPI-style resources for clips, annotations, feed, follows, engagement, auth, and claims.
3. Cloudflare architecture: router Worker, internal service bindings, D1 schema, KV cache/session usage, Queues, Durable Objects, R2/Stream policy, and observability.

## External Platform References

- Chrome side panel API: https://developer.chrome.com/docs/extensions/reference/api/sidePanel
- Cloudflare Workers Static Assets: https://developers.cloudflare.com/workers/static-assets/
- Cloudflare Service bindings: https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/
- Cloudflare D1: https://developers.cloudflare.com/d1/
- Cloudflare Queues delivery guarantees: https://developers.cloudflare.com/queues/reference/delivery-guarantees/
