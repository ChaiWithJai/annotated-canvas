# Submission Issue Comment Drafts

Prepared May 1, 2026 for the seven currently open bounty-readiness issues. These are drafts, not posted comments. They are intentionally concise because the issue threads already contain detailed evidence.

## #21 Bounty Gap Audit And Submission Readiness

```md
Submission packet reconciliation update:

`docs/bounty-gap-audit.md` and `docs/submission-packet.md` now use the same readiness buckets: working now, deployed but limited, blocked by human credentials/secrets, and not yet implemented.

Close gate remains: keep #21 open until #22/#23/#24/#26/#28/#30 are either completed with evidence or explicitly accepted as disclosed limitations by the human submitter. The packet should not claim full bounty completion while real OAuth, production extension p95 proof, durable audio storage, owned-media 240p policy, and GitHub deploy-from-main are still open.
```

## #22 Cloudflare CLI Production Setup And Deployment

```md
Submission packet reconciliation update:

The docs now distinguish local Wrangler production proof from GitHub deploy-from-main proof. Current status is "working live, CI/CD limited": Worker/Pages/D1/KV/Queues are live and smoke-tested, but #22 should close only after `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, and `CLOUDFLARE_DEPLOY_ENABLED=true` are installed and the GitHub Actions deploy job runs instead of skipping.

p50 proof: public web/API smoke works. p95 proof: the same smoke passes from the commit deployed by GitHub Actions.
```

## #23 Complete Extension And Web Capture Journey

```md
Submission packet reconciliation update:

The current capture journey is documented as deployed but limited. Web URL capture and extension current-page capture exist, but close requires payload-level evidence: exact selected text, exact media start/end/duration, commentary, and source URL must match across browser UI, production `POST /api/annotations`, stored annotation, and permalink.

p50 proof: one normal annotation publishes. p95 proof: exact quote/timecode preservation plus invalid-duration rejection and source-link integrity.
```

## #24 Real X/Google Auth And Extension Handoff

```md
Submission packet reconciliation update:

PR #31 moved production auth into an honest limited state: sign-in UI is no longer inert, and missing provider config fails visibly instead of creating fake production sessions. The docs now classify #24 as blocked by human credentials/secrets plus remaining provider implementation.

Close requires real Google/X apps and secrets, token exchange, user/session creation, secure cookies, logout/session invalidation, and authenticated extension-token handoff. p95 proof should include invalid/replayed state rejection and anonymous extension-token denial.
```

## #26 Audio Commentary And 240p Media Policy

```md
Submission packet reconciliation update:

The docs now classify audio/240p as deployed but limited for audio intents and not yet implemented for owned-media 240p. Text commentary works; production audio upload currently returns `intent-created` because R2 is not enabled and `MEDIA_BUCKET` is omitted.

Close requires R2 or an alternate durable storage path, finalize/metadata validation, permalink audio proof, and a product/legal decision for owned-video 240p/sub-480p handling. Third-party media should remain source-linked by reference unless an owned-upload path is explicitly approved.
```

## #28 Final Bounty Submission Package

```md
Submission packet reconciliation update:

`docs/submission-packet.md` now has live URLs, status buckets, issue-linked acceptance notes, p50/p95 proof requirements, and copy for an honest known-limitations disclosure.

Close when the human submitter either waits for #22/#23/#24/#26/#30 to close or approves submitting with the disclosed gaps: real OAuth, production extension p95 proof, durable recorded-audio storage, owned-media 240p policy, and GitHub deploy-from-main.
```

## #30 Local Chrome Extension Install And Bounty Smoke Verification

```md
Submission packet reconciliation update:

The extension proof is documented as working locally but not yet production-p95 complete. Existing local evidence proves `dist/extension` can load unpacked, open the side panel, save localhost API base, capture current tab, and publish to the local API.

Close requires the rebuilt extension to save the production Worker URL, publish one production annotation, preserve exact selected text, preserve real media current time/start/end/duration, block >90 seconds before network publish, and document audio/microphone behavior against the current #26 storage limitation.
```
