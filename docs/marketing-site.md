# Marketing and Signup Website Plan

This plan defines the first public marketing and signup website for Annotated Canvas. The site should explain the product, convert interested users to a waitlist or account, and make the public feed easy to view without installing the extension first.

## Primary Goals

1. Explain Annotated Canvas in one screen: source-linked annotations for exact web media moments.
2. Drive signup through Google or X, matching the MVP auth scope.
3. Let visitors view the public feed and a sample profile/permalink before signup.
4. Reassure source owners that annotations preserve source links and include a clear claim workflow.
5. Move creators from interest to action: install the unpacked/local extension in development or, later, install from the Chrome Web Store.

## Target Audiences

- Researchers and curators who collect specific moments from videos, podcasts, articles, and posts.
- Creators who want to publish commentary without re-hosting someone else's media.
- Readers who want a browsable feed of annotated source moments.
- Rights holders or source owners who need to understand how claims work.

## Positioning

Headline options:

- `Annotate the exact moment, keep the source intact.`
- `A public canvas for source-linked commentary.`
- `Clip by reference. Publish with context.`

Short value proposition:

Annotated Canvas lets creators capture exact moments from web media, add commentary, and publish public annotations that point back to the original source instead of re-hosting third-party media.

Core proof points:

- Exact text selections and media timecodes.
- Public feed, creator profiles, and permalink pages.
- Source URL required on every public annotation.
- Claim workflow on every public annotation.
- Chrome side panel capture flow.

## Site Structure

### 1. Home

Route: `/`

Purpose: explain the product and drive signup while showing real public annotations.

Above the fold:

- Product name: `Annotated Canvas`.
- Headline: `Annotate the exact moment, keep the source intact.`
- Supporting copy: `Capture text selections and media timecodes, add commentary, and publish public annotations that send readers back to the original source.`
- Primary CTA: `Sign up with Google`.
- Secondary CTA: `Sign up with X`.
- Tertiary link: `View public feed`.
- Trust note: `Every public annotation keeps a source URL and includes a claim workflow.`

First viewport should include a visible feed preview, not only marketing copy. Use 2-3 annotation cards with source domain, clip type, author, commentary excerpt, and `File a claim` affordance.

Sections:

- `How it works`: Capture, Comment, Publish.
- `Built for source-linked commentary`: explain clip-by-reference, not media re-hosting.
- `For creators`: save draft, publish, profile, follow graph.
- `For readers`: feed, profile pages, permalinks.
- `For rights holders`: claim workflow, attribution, review status.
- `Signup`: Google and X buttons plus an email waitlist fallback if desired.

### 2. Public Feed

Route: `/feed` or reuse `/`

Purpose: let signed-out visitors browse public annotations.

Content:

- Feed list with public annotations.
- Filters for `All`, `Video`, `Text`, `Audio`.
- Source-domain labels.
- Author links.
- `Open source` links.
- `View permalink` links.
- Signed-out CTA in the right rail or header: `Sign up to publish`.

MVP fallback:

- The existing web app feed route is `/`.
- Use `GET /api/feed` for live API data when connected.
- Show fixture data while the marketing site is still static.

### 3. Profile

Route: `/u/:handle`

Purpose: show a creator's public body of annotations and follow CTA.

Content:

- Display name, handle, avatar, bio.
- Follower/following/annotation counts.
- Follow button for authenticated users.
- Signed-out CTA: `Sign up to follow`.
- List of public annotations by that author.

MVP example:

- `/u/mira`

### 4. Annotation Permalink

Route: `/a/:id`

Purpose: make every annotation shareable and claimable.

Content:

- Commentary as the main content.
- Clip reference with source title, source domain, and text quote or time range.
- Author block.
- `Open original source`.
- Engagement counts.
- `File a claim`.
- Removed state when unavailable.

MVP examples:

- `/a/ann_video_minimalism`
- `/a/removed`

### 5. Claim Page or Modal

Route: `/claims/new?annotation_id=:id` or modal from permalink/feed cards.

Purpose: allow source owners, creators, agents, or other claimants to request review.

Fields:

- Annotation id.
- Claimant name.
- Claimant email.
- Relationship.
- Reason.
- Requested action: review, remove, attribute, or contact author.

Submission behavior:

- POST to `/api/claims`.
- Show confirmation with claim id and status.
- Explain that Annotated records and routes the claim for review; it does not automatically decide fair use.

### 6. Signup

Route: `/signup`

Purpose: convert visitors into authenticated users or waitlist entries.

Primary actions:

- `Continue with Google`.
- `Continue with X`.

Secondary action:

- `Join waitlist with email` if OAuth setup is not ready in the environment.

Copy:

- `Create a profile, publish annotations, follow curators, and save source-linked moments from the Chrome side panel.`

Auth endpoints:

- Google: `/api/auth/google/start?return_to=/`
- X: `/api/auth/x/start?return_to=/`

Local demo auth mode returns a local callback URL. Production OAuth mode should redirect to the provider authorization page.

### 7. Extension Install

Route: `/extension`

Purpose: explain the capture surface.

Development copy:

- `For local MVP testing, build the extension and load dist/extension as an unpacked Chrome extension.`
- Include short steps and a link to `docs/user-guide.md`.

Production copy:

- `Install Chrome extension` once the Chrome Web Store listing exists.

Content:

- Screenshot or product image of the side panel.
- Capture modes: timecode and text.
- Publish CTA.
- Account sync note.

## Navigation

Header:

- `Feed`
- `Explore`
- `Extension`
- `Sign in`
- Primary button: `Sign up`

Signed-in header:

- `Feed`
- `Profile`
- `New annotation`
- Avatar/account menu.

Footer:

- `About`
- `Docs`
- `Claim policy`
- `Privacy`
- `Terms`
- `Contact`

## Signup Funnel

1. Visitor lands on home page.
2. Visitor sees feed preview and source-linked annotation examples.
3. Visitor clicks `View public feed` or `Sign up`.
4. If browsing feed signed out, persistent CTA says `Sign up to publish`.
5. Signup uses Google or X.
6. After signup, redirect to feed with prompt to install/open extension.
7. Extension page explains local unpacked loading for MVP testers and Chrome Web Store install for production.

## Feed Viewing Funnel

1. Visitor clicks `View public feed`.
2. Feed loads public annotations.
3. Visitor opens a permalink.
4. Permalink includes source metadata, commentary, author, engagement, and claim button.
5. Visitor can open the original source or sign up to follow/publish.

## Content Blocks

Product description:

`Annotated Canvas is a Chrome side panel and public web client for clipping exact web media moments, adding commentary, and publishing source-linked annotations.`

How it works:

- `Capture`: Select text or mark a media time range from the current tab.
- `Comment`: Add text or audio commentary.
- `Publish`: Share a permalink that points back to the original source.

Source policy:

`Annotated Canvas stores third-party clips by reference. Public annotations require a source URL and use text selections or time offsets instead of re-hosting third-party media bytes.`

Claim policy:

`Every public annotation includes a claim workflow. Claimants can request review, removal, attribution, or author contact.`

Signup prompt:

`Start building a public profile of precise, source-linked commentary.`

Feed prompt:

`Browse recent annotations from creators who keep the original source in the loop.`

## MVP Implementation Notes

- The current web client already supports route-aware views for feed, profile, permalink, removed, and empty states.
- The current web UI uses fixture data; connecting it to `/api/feed`, `/api/users/:handle`, and `/api/annotations/:id` is the next product step.
- The current claim modal demonstrates the workflow but does not yet submit the form from the web client.
- The API supports claim creation through `POST /api/claims`.
- The extension side panel simulates publishing state; wiring it to `POST /api/annotations` is the next product step.
- Keep the MVP install language clear: local testers load `dist/extension` as an unpacked extension, not from the Chrome Web Store.

## Measurement

Track these events:

- Home CTA click.
- Signup provider selected.
- Feed viewed.
- Permalink viewed.
- Original source opened.
- Claim modal opened.
- Claim submitted.
- Extension install instructions viewed.
- Annotation published.

Conversion metrics:

- Home to signup start.
- Signup start to completed account.
- Feed view to signup.
- Permalink view to source click.
- Extension page view to annotation publish.

## Open Questions

- Whether production launch uses a waitlist before full Google/X OAuth.
- Whether `/` should remain the product feed or become a marketing home with `/feed` as the browse route.
- Whether claim filing should live as a modal only or also as a dedicated route for direct support links.
- Whether email signup is allowed for marketing capture even though MVP product auth is Google/X only.
