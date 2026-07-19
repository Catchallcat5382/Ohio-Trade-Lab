-- Ohio Trade Lab V55 compatibility migration.
-- The Worker also applies these columns automatically, so this migration is safe
-- for fresh databases and documents the schema expected by V55.
ALTER TABLE users ADD COLUMN bio TEXT NOT NULL DEFAULT '';
ALTER TABLE listings ADD COLUMN max_bid_value INTEGER NOT NULL DEFAULT 0;
ALTER TABLE listings ADD COLUMN buyout_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE listings ADD COLUMN accepted_by TEXT;
CREATE TABLE IF NOT EXISTS user_inventory (
  user_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  updated INTEGER NOT NULL,
  PRIMARY KEY(user_id,item_id),
  FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_inventory_user ON user_inventory(user_id);
CREATE TABLE IF NOT EXISTS presence (
  visitor_id TEXT PRIMARY KEY,
  user_id TEXT,
  kind TEXT NOT NULL CHECK(kind IN ('guest','user','staff')),
  last_seen INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_presence_last_seen ON presence(last_seen);
