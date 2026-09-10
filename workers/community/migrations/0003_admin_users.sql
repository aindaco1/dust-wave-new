-- Community owns its users independently of Store, Pool and other applications.
CREATE TABLE community_admin_directory (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  revision INTEGER NOT NULL DEFAULT 0,
  mutation_id TEXT NOT NULL DEFAULT '',
  users TEXT NOT NULL CHECK (json_valid(users) AND json_type(users) = 'array')
);
INSERT INTO community_admin_directory(id, users) VALUES (1,
  '[{"name":"","email":"alonso@dustwave.xyz","role":"super_admin"}]'
);
-- Retired identities must not retain outstanding links or sessions.
DELETE FROM community_auth_tokens WHERE email NOT IN
  (SELECT json_extract(value, '$.email') FROM community_admin_directory, json_each(users));
DELETE FROM community_sessions WHERE email NOT IN
  (SELECT json_extract(value, '$.email') FROM community_admin_directory, json_each(users));
