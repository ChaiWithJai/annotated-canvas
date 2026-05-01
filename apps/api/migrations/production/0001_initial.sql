CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  handle TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS oauth_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  provider TEXT NOT NULL CHECK (provider IN ('x', 'google')),
  provider_account_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE(provider, provider_account_id)
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY,
  source_url TEXT NOT NULL UNIQUE,
  source_domain TEXT NOT NULL,
  title TEXT NOT NULL,
  favicon_url TEXT,
  author_name TEXT,
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS clips (
  id TEXT PRIMARY KEY,
  source_id TEXT REFERENCES sources(id),
  kind TEXT NOT NULL CHECK (kind IN ('text', 'video', 'audio', 'upload')),
  quote TEXT,
  selector TEXT,
  start_seconds REAL,
  end_seconds REAL,
  duration_seconds REAL,
  upload_asset_id TEXT,
  upload_r2_key TEXT,
  upload_stream_uid TEXT,
  owned_by_author INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (kind = 'upload' OR source_id IS NOT NULL),
  CHECK (kind != 'text' OR quote IS NOT NULL),
  CHECK (kind NOT IN ('video', 'audio') OR (start_seconds IS NOT NULL AND end_seconds IS NOT NULL AND duration_seconds <= 90))
);

CREATE TABLE IF NOT EXISTS annotations (
  id TEXT PRIMARY KEY,
  author_id TEXT NOT NULL REFERENCES users(id),
  clip_id TEXT NOT NULL REFERENCES clips(id),
  commentary_kind TEXT NOT NULL CHECK (commentary_kind IN ('text', 'audio')),
  commentary_text TEXT,
  audio_asset_id TEXT,
  visibility TEXT NOT NULL CHECK (visibility IN ('public', 'unlisted', 'deleted')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS follows (
  follower_id TEXT NOT NULL REFERENCES users(id),
  followed_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (follower_id, followed_id)
);

CREATE TABLE IF NOT EXISTS engagement_events (
  id TEXT PRIMARY KEY,
  annotation_id TEXT NOT NULL REFERENCES annotations(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL CHECK (type IN ('like', 'repost', 'discuss')),
  body TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS claims (
  id TEXT PRIMARY KEY,
  annotation_id TEXT NOT NULL REFERENCES annotations(id),
  claimant_name TEXT NOT NULL,
  claimant_email TEXT NOT NULL,
  relationship TEXT NOT NULL,
  reason TEXT NOT NULL,
  requested_action TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('open', 'needs_info', 'accepted', 'rejected', 'withdrawn')),
  idempotency_key TEXT UNIQUE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS claim_events (
  id TEXT PRIMARY KEY,
  claim_id TEXT NOT NULL REFERENCES claims(id),
  actor_id TEXT,
  event_type TEXT NOT NULL,
  body TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS queue_idempotency_keys (
  job_id TEXT PRIMARY KEY,
  job_type TEXT NOT NULL,
  processed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS mutation_idempotency_keys (
  scope TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (scope, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_annotations_created_at ON annotations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_annotations_author ON annotations(author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_claims_annotation ON claims(annotation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_engagement_annotation ON engagement_events(annotation_id, created_at DESC);
