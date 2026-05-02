# Don't Make Me Think UX Audit

Source: `/Users/jaybhagat/Downloads/Steve_Krug_Don’t_Make_Me_Think,.pdf`

This audit turns the book's principles into product guardrails for Annotated Canvas without reproducing the book text.

## Guardrails

- Every route should explain itself from the header, page name, and primary action.
- Button labels should say the action, not the internal state.
- Source links should look and read like source links.
- Legal and infrastructure language should not leak into user screens.
- Empty and error states should tell users how to recover.
- Dense screens should scan as groups: source, clip, note, actions.
- Reviewer docs should not make readers infer readiness from implementation detail. Use explicit buckets: working now, deployed but limited, blocked by credentials/secrets, and not yet implemented.

## Surface Audit

| Surface | Before | Update made |
| --- | --- | --- |
| Global header | Brand said `Annotated`; auth action said `Continue`; permalink nav was ambiguous. | Brand now says `Annotated Canvas`, auth says `Sign in`, and the deep-link route says `Annotation`. |
| Marketing/signup | CTA used signup language while the app supports auth handoff; hero copy was more promotional than instructional. | CTA now says `Sign in with Google/X`; hero states the concrete job: save a moment and keep the source one click away. |
| Feed | Page title and composer were split between `Following feed`, `New annotation`, and `Publish from a source link`. | Feed now says `Public feed`; the inert button is removed; composer heading is `Create an annotation`. |
| Composer | `Video/audio`, `Commentary`, and format-heavy time labels forced interpretation. | Labels now read `Time range`, `Your note`, `Start`, and `End`. |
| Right rail | `MVP gates`, `source_url`, and `idempotent publish` were implementation words. | Rail now uses user-facing trust checks: source link, 90-second limit, claim review, and no duplicate retries. |
| Permalink | `Public permalink` described URL mechanics, not the user's location. | Page label is now `Annotation page`. |
| Claim modal | Copy leaned on notice/workflow language. | Modal asks for a review, explains what will happen, and keeps the source visible. |
| Extension header | `AnnotatedCanvas` and `Extension` did not orient the user. | Header now reads `Annotated Canvas` and `Capture from this tab`. |
| Extension tabs | `Context` and `Annotations` were ambiguous. | Tabs now read `Capture`, `Drafts`, `Published`, and `Settings`. |
| Extension capture | `Capture type`, `Timecode`, `Text`, and `Commentary` required domain knowledge. | Labels now say `What are you saving?`, `Time range`, `Selected text`, and `Your note`. |
| Extension footer | `Connect accounts for sync` and `Publish to Canvas` were vague. | Footer now says `Signed out` and `Publish annotation`. |
| Cloudflare setup docs | Docs still led with local Wrangler login despite the user's GitHub-first deployment preference. | Cloudflare docs now frame GitHub Actions as the production deploy control plane and Wrangler as local/resource/fallback tooling. |
| Bounty submission docs | Readiness was split across issue comments and a long packet, making reviewers infer what was complete. | `docs/bounty-gap-audit.md` and `docs/submission-packet.md` now use explicit status buckets and issue-linked p50/p95 proof requirements. |
| Cold traffic home | The home route explained the product but still made visitors infer the full job from docs and issue evidence. | Home now leads with browse-first onboarding, real extension smoke screenshots, product trust checks, and the return path from side panel publish to web permalink. |

## Follow-Up Checks

- Verify the extension copy in an unpacked Chrome side panel after browser auth is wired.
- Revisit the claim modal when real moderation states exist.
- Re-run a screen-reader pass after the source-pill label change.
- Before external submission, read only the status bucket and acceptance tables first; if a reviewer cannot classify a requirement in under a few seconds, the packet needs another pass.
- Re-run the cold-traffic journey after every deploy: home -> feed -> permalink -> extension guide -> publish -> returned permalink.
