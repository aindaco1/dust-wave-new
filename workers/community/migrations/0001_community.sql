-- Domain records share a revision so queue edits and their derived agendas commit together.
CREATE TABLE community_meta (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  revision INTEGER NOT NULL DEFAULT 0,
  mutation_id TEXT NOT NULL DEFAULT ''
);
INSERT INTO community_meta(id) VALUES (1);
CREATE TABLE community_records (
  kind TEXT NOT NULL CHECK(kind IN ('event', 'script')),
  id TEXT NOT NULL,
  data TEXT NOT NULL CHECK(json_valid(data)),
  PRIMARY KEY(kind, id)
);
CREATE TABLE community_uploads (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('image', 'pdf')),
  state TEXT NOT NULL CHECK(state IN ('pending', 'ready', 'attached')),
  data TEXT NOT NULL DEFAULT '{}',
  expires_at INTEGER NOT NULL
);
CREATE TABLE community_auth_tokens (
  hash TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE TABLE community_sessions (
  hash TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  csrf TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE TABLE community_rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE TABLE community_receipts (
  key_hash TEXT PRIMARY KEY,
  payload_hash TEXT NOT NULL,
  record_id TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE community_audit (
  id TEXT PRIMARY KEY,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  revision INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
