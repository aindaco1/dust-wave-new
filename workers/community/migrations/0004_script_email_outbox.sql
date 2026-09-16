-- Email intent commits in the same D1 batch as its script and submission receipt.
CREATE TABLE community_email_outbox (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('received', 'admin', 'approved')),
  record_id TEXT NOT NULL,
  recipient TEXT NOT NULL,
  payload TEXT NOT NULL CHECK (json_valid(payload)),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'accepted', 'failed', 'uncertain', 'cancelled')),
  created_at INTEGER NOT NULL,
  next_attempt_at INTEGER NOT NULL,
  first_attempt_at INTEGER,
  attempts INTEGER NOT NULL DEFAULT 0,
  ambiguous INTEGER NOT NULL DEFAULT 0,
  lease_token TEXT NOT NULL DEFAULT '',
  lease_until INTEGER NOT NULL DEFAULT 0,
  provider_id TEXT NOT NULL DEFAULT '',
  last_error TEXT NOT NULL DEFAULT ''
);
CREATE INDEX community_email_due ON community_email_outbox(status, next_attempt_at, lease_until);
