CREATE TABLE IF NOT EXISTS mutation_idempotency_keys (
  scope TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (scope, idempotency_key)
);
