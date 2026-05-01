# Regression Testing Strategy

Annotated Canvas follows the testing trophy: static checks and unit tests as the broad base, integration tests as the high-value middle, and a smaller number of browser-level end-to-end checks for complete user journeys.

## What P50 and P95 Mean Here

P50 features are the normal paths most users hit:

- Feed loads with source attribution.
- Extension side panel has timecode and commentary controls.
- Text or media annotation publishes with an idempotency key.
- Claim button opens a notice form.

P95 features are edge paths that decide whether the system is trustworthy:

- Replayed publish request returns the same annotation.
- Third-party clip without `source_url` is rejected.
- Media range over 90 seconds is rejected.
- Claim filing does not automatically remove content.
- Queue consumers can see duplicate jobs and remain idempotent.
- Extension state survives MV3 service-worker sleep.

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
