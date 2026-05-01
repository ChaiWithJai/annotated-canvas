# Core API Contracts

This is the initial REST contract draft for the web client, Chrome extension, and API router. The router should expose public HTTP endpoints and dispatch internally to Cloudflare Workers via service bindings where possible.

## Principles

- Keep public contracts stable even if internal Cloudflare services change.
- Persist source attribution at the data layer, not only the UI layer.
- Use idempotency keys for publish, claim, engagement, and queue-backed operations.
- Keep clip references portable across extension and web client.
- Treat user-uploaded media separately from third-party media references.

## Common Types

### `SourceRef`

```json
{
  "source_url": "https://www.youtube.com/watch?v=...",
  "source_domain": "youtube.com",
  "title": "Minimalist Design Theory",
  "favicon_url": "https://...",
  "author_name": "optional upstream author",
  "published_at": "optional ISO-8601"
}
```

### `ClipRef`

```json
{
  "kind": "text | video | audio | upload",
  "source": {
    "source_url": "https://www.youtube.com/watch?v=...",
    "source_domain": "youtube.com"
  },
  "text": {
    "quote": "selected text",
    "selector": "optional text-fragment or DOM selector",
    "prefix": "optional disambiguation",
    "suffix": "optional disambiguation"
  },
  "media": {
    "start_seconds": 263,
    "end_seconds": 310,
    "duration_seconds": 47
  },
  "upload": {
    "asset_id": "optional-own-media-id",
    "r2_key": "optional",
    "stream_uid": "optional"
  }
}
```

Validation rules:

- `source.source_url` is required for every third-party clip.
- `text.quote` is required when `kind=text`.
- `media.start_seconds` and `media.end_seconds` are required when `kind=video` or `kind=audio`.
- Third-party media clips are references only. Upload fields are for creator-owned uploads.
- `media.duration_seconds` should be less than or equal to 90 seconds for the bounty MVP.

### `Annotation`

```json
{
  "id": "ann_...",
  "author_id": "usr_...",
  "clip": {},
  "commentary": {
    "kind": "text | audio",
    "text": "Add your perspective...",
    "audio_asset_id": "optional-own-audio-id"
  },
  "visibility": "public | unlisted | deleted",
  "created_at": "2026-05-01T00:00:00Z",
  "updated_at": "2026-05-01T00:00:00Z",
  "permalink_url": "https://annotated.example/a/ann_..."
}
```

## Endpoint Draft

### Auth

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/auth/:provider/start?return_to=` | Start X or Google OAuth from web or extension. |
| `GET` | `/api/auth/:provider/callback` | Complete OAuth and mint session. |
| `POST` | `/api/auth/extension-token` | Exchange web session for short-lived extension token. |
| `POST` | `/api/auth/logout` | Revoke current session. |
| `GET` | `/api/me` | Return current user and auth capabilities. |

### Capture and Publish

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/captures/resolve` | Normalize URL/current-tab metadata into a source reference. |
| `POST` | `/api/annotations` | Publish a clip and commentary. |
| `GET` | `/api/annotations/:id` | Fetch a permalink payload. |
| `DELETE` | `/api/annotations/:id` | Author delete or moderator tombstone. |
| `GET` | `/api/annotations/:id/comments` | List public comments on an annotation. |
| `POST` | `/api/annotations/:id/comments` | Add a comment/discussion entry to an annotation. |

`POST /api/annotations` requires `Idempotency-Key`.

```json
{
  "clip": {},
  "commentary": {
    "kind": "text",
    "text": "The key idea here is..."
  },
  "client_context": {
    "surface": "extension | web",
    "tab_id": "optional",
    "capture_method": "selection | media-timecode | url-input"
  }
}
```

### Feed, Profile, and Social Graph

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/feed?cursor=` | Public/following feed. |
| `GET` | `/api/users/:handle` | Public profile. |
| `GET` | `/api/users/:handle/annotations?cursor=` | User annotation list. |
| `PUT` | `/api/follows/:user_id` | Follow a user. |
| `DELETE` | `/api/follows/:user_id` | Unfollow a user. |
| `POST` | `/api/annotations/:id/engagement` | Like, repost, or discuss entrypoint. |

### Claims

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/claims` | File a claim against an annotation. |
| `GET` | `/api/claims/:id` | Claim status for claimant/moderator. |
| `POST` | `/api/claims/:id/events` | Add moderator or claimant event. |

`POST /api/claims` should enqueue notification and moderation work. The API accepts the notice and records state; it does not adjudicate fair use automatically.

`POST /api/claims/:id/events` records an auditable status or note event. A `status-change` event may move the claim to `needs_info`, `accepted`, `rejected`, or `withdrawn`.

### Uploads

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/uploads/audio-commentary` | Create upload intent for commentary audio. |
| `POST` | `/api/uploads/owned-video` | Create upload intent for creator-owned video. |
| `GET` | `/api/uploads/:id` | Poll upload processing state. |

Cloudflare Stream direct creator uploads are only for user-owned video. Third-party YouTube/news/podcast references should not be copied into Stream or R2.

## Error Envelope

```json
{
  "error": {
    "code": "source_url_required",
    "message": "Published annotations must include an original source URL.",
    "details": {}
  },
  "request_id": "req_..."
}
```

## First Open Questions

- Should extension auth rely on `chrome.identity.launchWebAuthFlow`, a web handoff, or both?
- What exact evidence fields are required for a claim filing?
- Should feed ranking be chronological only for MVP?
- Should comments live as first-class annotations or as a separate discussion model?
