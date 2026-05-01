# Regression Testing Strategy

Annotated Canvas follows the testing trophy: static checks and unit tests as the broad base, integration tests as the high-value middle, and a smaller number of browser-level end-to-end checks for complete user journeys.

## What P50 and P95 Mean Here

P50 features are the normal paths most users hit:

- Feed loads with source attribution.
- Extension side panel has timecode and commentary controls.
- Text or media annotation publishes with an idempotency key.
- Claim button opens a notice form.
- Sign-in controls show the correct signed-out or not-configured state.

P95 features are edge paths that decide whether the system is trustworthy:

- Replayed publish request returns the same annotation.
- Third-party clip without `source_url` is rejected.
- Media range over 90 seconds is rejected.
- Claim filing does not automatically remove content.
- Queue consumers can see duplicate jobs and remain idempotent.
- Extension state survives MV3 service-worker sleep.
- OAuth state cannot be replayed and demo auth cannot mint fake production sessions.
- Selected text and media timecodes are preserved exactly from browser UI to stored annotation.
- Audio commentary cannot publish arbitrary or unfinalized asset IDs.

## Bounty Readiness Test Matrix

| Area | p50 proof | p95 proof | Current owner |
| --- | --- | --- | --- |
| Public web/API | Public web, feed, profile, permalink, health, comment, and claim routes return expected results. | The same smoke runs after GitHub Actions deploy-from-main from `main`. | #22, #28 |
| Extension capture | Unpacked side panel saves API base and publishes one <=90-second annotation. | Selected-text context menu, real media `currentTime`, and >90-second no-network rejection are recorded in Chrome. | #23, #30 |
| Auth | Signed-out UI and provider start routes fail clearly when secrets are missing. | Real Google/X callbacks exchange tokens, create sessions, reject invalid/replayed state, and gate extension-token minting. | #24 |
| Source attribution | Annotation permalink displays the source link and API requires `source_url`. | Every p95 extension publish proves the same source URL in UI, network payload, stored annotation, and permalink. | #21, #23 |
| Commentary | Text commentary publishes and renders. | Recorded audio persists through storage/finalize and permalink loading, or the limitation is disclosed. | #26 |
| Media policy | Third-party media references keep original source URL plus start/end. | Owned-video upload policy enforces 240p/sub-480p or is explicitly excluded from the submission. | #26 |
| Claims/comments | Comment and claim POST flows work and claim does not auto-remove content. | Duplicate/retry behavior remains idempotent and moderation state is auditable. | #28 |

## Trophy Layers

### Static

- TypeScript strict mode.
- Zod schemas as executable API contracts.
- Wrangler type generation for Cloudflare bindings.

Command:

```bash
npm run typecheck
```

### Unit

- Contract validation for `ClipRef`, `AnnotationCreate`, `ClaimCreate`, and engagement payloads.
- Pure helpers such as timecode formatting and source-domain normalization.

Command:

```bash
npm run test:contracts
```

### Integration

- API router tests for publish, feed, permalink, claim, engagement, idempotency, and validation errors.
- Repository and queue fakes are used where a behavior contract matters more than a specific storage vendor.
- Worker-runtime tests with `@cloudflare/vitest-pool-workers` should be added once D1 queries replace the in-memory repository.

Command:

```bash
npm run test:api
npm run test:workers
```

### End-To-End

Run a small set only after UI and API are wired:

- Web feed to permalink to claim modal.
- Extension side panel capture to publish.
- API Worker local route to D1 local migration.

These should be fewer than integration tests and focused on confidence in the complete story.

## Current Regression Gates

- P50 feed and claim UI smoke tests.
- P50 publish and feed API tests.
- P95 idempotent publish retry test.
- P95 missing source attribution rejection.
- P95 media duration cap rejection.
- P95 claim-as-notice behavior test.

## Cloudflare Nuance To Test Next

- D1 migration applies locally and all `NOT NULL`/`CHECK` constraints reject invalid rows.
- Queue duplicate message is acknowledged without duplicate side effects.
- Durable Object counter is per annotation, not global.
- KV cache miss falls back to D1 without changing source-of-truth behavior.
