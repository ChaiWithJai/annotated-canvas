CREATE TABLE IF NOT EXISTS mutation_idempotency_keys (
  scope TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (scope, idempotency_key)
);

INSERT OR IGNORE INTO users (id, handle, display_name, avatar_url, bio) VALUES
  ('usr_demo', 'mira', 'Mira Chen', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=80', 'Researcher collecting precise media moments.'),
  ('usr_ren', 'ren', 'Ren Alvarez', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=160&q=80', 'Interface critic and product editor.'),
  ('usr_ika', 'ika', 'Ika Morris', 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=160&q=80', 'Backend engineer mapping serverless tradeoffs.');

INSERT OR IGNORE INTO oauth_accounts (id, user_id, provider, provider_account_id) VALUES
  ('oauth_demo_google', 'usr_demo', 'google', 'demo-google-mira'),
  ('oauth_demo_x', 'usr_demo', 'x', 'demo-x-mira');

INSERT OR IGNORE INTO sources (id, source_url, source_domain, title, favicon_url, author_name) VALUES
  ('src_youtube_minimalism', 'https://www.youtube.com/watch?v=annotated-demo&t=263s', 'youtube.com', 'Minimalist Design Theory: A Comprehensive Guide', 'https://www.youtube.com/s/desktop/28b0985e/img/favicon_32x32.png', 'Design Systems Lab'),
  ('src_article_density', 'https://example.com/essays/calm-interface-density', 'example.com', 'Calm Interface Density', NULL, 'Nadia Park'),
  ('src_podcast_edge', 'https://example.fm/episodes/edge-computing-for-products', 'example.fm', 'Edge Computing for Product Teams', NULL, 'Edge Notes');

INSERT OR IGNORE INTO clips (id, source_id, kind, quote, selector, start_seconds, end_seconds, duration_seconds) VALUES
  ('clip_video_minimalism', 'src_youtube_minimalism', 'video', NULL, NULL, 263, 310, 47),
  ('clip_text_density', 'src_article_density', 'text', 'A quiet interface is not an empty interface. It is an interface where every visible thing has earned its place.', NULL, NULL, NULL, NULL),
  ('clip_audio_edge', 'src_podcast_edge', 'audio', NULL, NULL, 772, 835, 63);

INSERT OR IGNORE INTO annotations (id, author_id, clip_id, commentary_kind, commentary_text, visibility, created_at, updated_at) VALUES
  ('ann_video_minimalism', 'usr_demo', 'clip_video_minimalism', 'text', 'This is the moment where restraint stops being aesthetic and becomes an operating constraint.', 'public', '2026-05-01T00:00:00.000Z', '2026-05-01T00:00:00.000Z'),
  ('ann_text_density', 'usr_ren', 'clip_text_density', 'text', 'This is the principle the side panel has to preserve: dense enough for repeated work, quiet enough for judgment.', 'public', '2026-05-01T00:15:00.000Z', '2026-05-01T00:15:00.000Z'),
  ('ann_audio_edge', 'usr_ika', 'clip_audio_edge', 'text', 'This explanation makes the case for service bindings better than a diagram: the public contract can stay boring while internals evolve.', 'public', '2026-05-01T00:32:00.000Z', '2026-05-01T00:32:00.000Z');

INSERT OR IGNORE INTO engagement_events (id, annotation_id, user_id, type, body, idempotency_key) VALUES
  ('eng_like_video_1', 'ann_video_minimalism', 'usr_ren', 'like', NULL, 'seed-like-video-1'),
  ('eng_like_video_2', 'ann_video_minimalism', 'usr_ika', 'like', NULL, 'seed-like-video-2'),
  ('eng_discuss_video_1', 'ann_video_minimalism', 'usr_ren', 'discuss', 'This is the right design constraint.', 'seed-discuss-video-1'),
  ('eng_like_text_1', 'ann_text_density', 'usr_demo', 'like', NULL, 'seed-like-text-1'),
  ('eng_repost_audio_1', 'ann_audio_edge', 'usr_demo', 'repost', NULL, 'seed-repost-audio-1');

INSERT OR IGNORE INTO follows (follower_id, followed_id) VALUES
  ('usr_demo', 'usr_ren'),
  ('usr_demo', 'usr_ika');
