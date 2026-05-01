{
  "bounty": {
    "name": "Annotated",
    "sponsor": "Jason Calacanis (This Week in Startups)",
    "prize_usd": 5000,
    "submission_url": "https://annotated.lovable.app",
    "announcement_date": "2026-04-30",
    "source_thread": "https://x.com/twistartups/status/2049931426972180820"
  },
  "domain_model": {
    "domain": "Annotated Web Media",
    "core_jtbd": "Clip a precise moment from any web media and publish my take on it, building an audience around how I see things.",
    "bounded_contexts": [
      { "name": "Capture", "responsibility": "Extract clip reference from active page (text selection, video timestamp range, audio timestamp range)." },
      { "name": "Annotation", "responsibility": "Author commentary anchored to a clip; persist as immutable post." },
      { "name": "Publication", "responsibility": "Render clip + annotation at a permalink; always link back to original source." },
      { "name": "SocialGraph", "responsibility": "Accounts, follows, public feed, engagement (replies, likes)." },
      { "name": "RightsDispute", "responsibility": "Accept fair-use claim filings; notify; route for review. Does not adjudicate." }
    ],
    "cross_cutting_invariants": [
      "Every published artifact MUST link to original source URL.",
      "Clip is stored by reference (source_url + offsets), not by re-hosting third-party bytes.",
      "Author identity is verified via X or Google OAuth before publish."
    ]
  },
  "explicit_requirements": [
    "Sidebar Chrome extension (chrome.sidePanel, MV3).",
    "'File a claim' button on every published annotation.",
    "All content links back to original source.",
    "Auth via X or Google.",
    "Accept URL input OR operate on current tab.",
    "Support clip types: text, audio (timestamped), video (timestamped). YouTube, news articles, podcasts named explicitly.",
    "User specifies clip start/end (audio/video) or selection (text).",
    "Public landing page per annotation.",
    "Public-facing social feed.",
    "Follow-and-engage between users."
  ],
  "delivery_constraints": {
    "browser_surface": {
      "primary": "Chrome MV3 + chrome.sidePanel (stable since Chrome 114)",
      "secondary": "Edge (compatible)",
      "out_of_scope_for_mvp": "Firefox (sidebar_action is a different API shape — adapter needed later)",
      "key_apis": [
        "chrome.sidePanel.setOptions / open (user-gesture-gated)",
        "chrome.scripting (inject content script)",
        "chrome.storage.local (state survives service-worker sleep)",
        "chrome.identity.launchWebAuthFlow (OAuth)",
        "chrome.contextMenus (right-click → annotate)",
        "Web APIs in content script: window.getSelection, document.querySelector (OG/Twitter meta), HTMLMediaElement.currentTime"
      ],
      "gotchas": [
        "MV3 service worker sleeps ~30s idle — never hold state in module scope.",
        "sidePanel.open() requires user gesture.",
        "No remotely hosted code allowed in MV3 — bundle everything.",
        "DRM-protected media (Spotify web, Apple Podcasts) cannot be extracted; only timestamp-referenced.",
        "Cross-origin video bytes generally cannot be re-encoded client-side; clip-by-reference only."
      ]
    },
    "backend_stack_cloudflare": {
      "compute": "Workers (TypeScript, bindings not REST)",
      "relational": "D1 — users, annotations, clips, follows, claims, engagement",
      "kv": "KV — session tokens, OAuth state, hot-read caches (feed pages)",
      "object_storage": "R2 — user-uploaded original media only, OG image snapshots, optional source-page archive",
      "video": "Stream — only when user uploads their own video; not used for re-hosting third-party media",
      "queue": "Queues — async jobs: feed fan-out, claim notification, OG-image fetch, source-page snapshot",
      "stateful": "Durable Objects — per-annotation engagement counters, real-time feed updates",
      "future": "Vectorize + Workers AI — semantic search across annotations (post-MVP)",
      "frontend_hosting": "Workers Static Assets or Pages — public landing pages and social feed"
    },
    "non_negotiables": [
      "Clip-by-reference model for all third-party media (legal + technical reality).",
      "Idempotent Queue consumers (at-least-once delivery).",
      "OAuth via X and Google only — no email/password for MVP.",
      "Source attribution is enforced at the data layer, not the UI layer (NOT NULL on source_url).",
      "Claim filing is a notice workflow; system does not determine fair use."
    ]
  },
  "open_questions_for_jcal": [
    "Is the MVP Chrome-only, or must Edge/Firefox ship day one?",
    "What constitutes a valid 'claim'? Email-the-rights-holder, or just a takedown queue for moderators?",
    "Monetization signal: ads, paid follows, or pure social MVP?",
    "Does 'clip a podcast' include podcast platforms with DRM (Spotify), or only open RSS-distributed audio?"
  ]
}
