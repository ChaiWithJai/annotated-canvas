# Annotated Canvas MVP User Guide

This guide explains how to run the MVP locally, load the Chrome extension as an unpacked extension, publish an annotation, view the public web surfaces, and file a claim.

## Prerequisites

- Node 24.
- npm.
- Google Chrome 116 or newer.
- Wrangler is installed through the repo dev dependencies, so use `npm run ...` commands from the repo root.

Install dependencies once:

```bash
npm install
```

## Run the Web Client and API Locally

Open two terminal windows from the repo root.

Terminal 1: start the Cloudflare Worker API locally.

```bash
npm run dev:api
```

The API runs at `http://localhost:8787`.

Terminal 2: start the React web client.

```bash
npm run dev:web
```

The web client runs at the Vite URL printed in the terminal, normally `http://127.0.0.1:5173`.

Useful API smoke check:

```bash
curl http://localhost:8787/api/health
```

Expected result:

```json
{
  "ok": true,
  "service": "annotated-canvas-api",
  "mode": "in-process"
}
```

If the local D1 database has not been created or migrated yet, run:

```bash
npm run cf:migrate:local
```

The API falls back to in-memory data when no D1 binding is available in tests, but local Wrangler development is configured to use the `annotated_canvas` D1 binding.

## Run the Chrome Extension Locally as Unpacked

The MVP is not installed from the Chrome Web Store. Build the extension and load the generated folder in Chrome.

1. Build the extension:

   ```bash
   npm run build:extension
   ```

2. Open Chrome and go to `chrome://extensions`.
3. Turn on `Developer mode`.
4. Click `Load unpacked`.
5. Select the repo folder `dist/extension`.
6. Pin `Annotated Canvas` from the Chrome extensions menu if useful.
7. Open any article, video, or source page in Chrome.
8. Click the extension icon to open the side panel.

The extension side panel has four tabs:

- `CONTEXT`: capture a source-linked text or timecode clip and add commentary.
- `DRAFTS`: placeholder for saved draft annotations.
- `ANNOTATIONS`: placeholder for previously published annotations.
- `SETTINGS`: placeholder for account and provider settings.

The current side panel reads the active tab when it can, falls back to the demo source when it cannot, and publishes through the local API when `Publish annotation` is clicked. Use the API flow below when you need to inspect the exact backend payload.

When rebuilding the extension, return to `chrome://extensions` and click the reload icon on the Annotated Canvas card.

## Publish an Annotation

There are two MVP paths.

### Publish from the Extension Demo

1. Load the unpacked extension from `dist/extension`.
2. Open the extension side panel.
3. On `Capture`, choose `Time range` or `Selected text`.
4. Add commentary.
5. Click `Publish annotation`.
6. The button changes from `Publishing...` to `Published`.

This verifies the local capture UI, but it does not currently persist the annotation through the API.

### Publish Through the Local API

Start `npm run dev:api`, then send a POST to `/api/annotations`. `Idempotency-Key` is required and must be at least 8 characters.

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

The response returns an `annotation` object with an `id`, author, clip, commentary, visibility, timestamps, permalink URL, and engagement counts.

Text clipping uses the same endpoint with `kind: "text"`:

```json
{
  "clip": {
    "kind": "text",
    "source": {
      "source_url": "https://example.com/essays/calm-interface-density",
      "source_domain": "example.com",
      "title": "Calm Interface Density"
    },
    "text": {
      "quote": "A quiet interface is not an empty interface.",
      "prefix": "In practice,",
      "suffix": "It is intentional."
    }
  },
  "commentary": {
    "kind": "text",
    "text": "This framing is useful for dense creator tools."
  },
  "visibility": "public",
  "client_context": {
    "surface": "web",
    "capture_method": "selection"
  }
}
```

## View the Feed, Profile, and Permalink

Start the web client with `npm run dev:web`.

The current web client is a local demo UI with fixture data and route-aware views:

- Feed: `http://127.0.0.1:5173/`
- Profile: `http://127.0.0.1:5173/u/mira`
- Annotation permalink: `http://127.0.0.1:5173/a/ann_video_minimalism`
- Removed annotation state: `http://127.0.0.1:5173/a/removed`
- Empty feed state: `http://127.0.0.1:5173/empty`

You can also use the header navigation in the app:

- `Following` opens the feed.
- `Profile` opens Mira's profile.
- `Annotation` opens the annotation permalink.

Backend equivalents:

```bash
curl http://localhost:8787/api/feed
curl http://localhost:8787/api/users/mira
curl http://localhost:8787/api/users/mira/annotations
curl http://localhost:8787/api/annotations/ann_video_minimalism
```

## File a Claim

### File a Claim in the Web UI

1. Open the feed, profile, permalink, or removed annotation route.
2. Click `File a claim` on an annotation.
3. Choose the relationship:
   - `Copyright owner`
   - `Authorized agent`
   - `Creator`
   - `Other`
4. Enter the reason.
5. Click `Submit review request`.

The current modal demonstrates the claim workflow in the browser. Use the API flow below when you need a local claim record.

### File a Claim Through the Local API

Start `npm run dev:api`, then send:

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

The response returns `202 Accepted` with a `claim` object. The API also queues a `claim_notice` job when queue bindings are available.

## Local Auth Behavior

The MVP allows X and Google auth providers. Local development defaults to demo auth mode.

```bash
curl "http://localhost:8787/api/auth/google/start?return_to=http://127.0.0.1:5173/"
curl "http://localhost:8787/api/auth/x/start?return_to=http://127.0.0.1:5173/"
```

In demo mode, the API returns an authorization URL that points directly to the local callback instead of redirecting to a real provider.

## Troubleshooting

- If Chrome says the extension is invalid, rebuild with `npm run build:extension` and load `dist/extension`, not `apps/extension`.
- If the side panel does not update after code changes, rebuild and reload the extension from `chrome://extensions`.
- If the web client cannot call the API, confirm the API is on `http://localhost:8787` and the web app is on `http://127.0.0.1:5173`; `APP_ORIGIN` in `apps/api/wrangler.jsonc` is set for that local origin.
- If `POST /api/annotations` returns `428`, add an `Idempotency-Key` header with at least 8 characters.
- If a claim returns `404`, create or use an existing annotation id first.
