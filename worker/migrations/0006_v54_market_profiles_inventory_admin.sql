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
