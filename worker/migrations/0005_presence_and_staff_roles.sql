CREATE TABLE IF NOT EXISTS presence (
 visitor_id TEXT PRIMARY KEY,
 user_id TEXT,
 kind TEXT NOT NULL CHECK(kind IN ('guest','user','staff')),
 last_seen INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_presence_last_seen ON presence(last_seen);
CREATE INDEX IF NOT EXISTS idx_users_role_status ON users(role,status);
-- Initial owner promotion is handled securely at verified Google/Discord login through OWNER_EMAILS.
