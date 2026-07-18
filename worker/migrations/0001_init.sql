CREATE TABLE IF NOT EXISTS listings (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK(type IN ('trade','auction')),
  owner TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  give_json TEXT NOT NULL DEFAULT '[]',
  want_json TEXT NOT NULL DEFAULT '[]',
  created INTEGER NOT NULL,
  expires INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'open'
);
CREATE INDEX IF NOT EXISTS idx_listings_status_expires ON listings(status, expires);

CREATE TABLE IF NOT EXISTS bids (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL,
  bidder TEXT NOT NULL,
  items_json TEXT NOT NULL,
  value INTEGER NOT NULL DEFAULT 0,
  created INTEGER NOT NULL,
  FOREIGN KEY(listing_id) REFERENCES listings(id)
);

CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  listing_id TEXT,
  title TEXT NOT NULL,
  members_json TEXT NOT NULL,
  created INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  author TEXT NOT NULL,
  body TEXT NOT NULL,
  created INTEGER NOT NULL,
  FOREIGN KEY(room_id) REFERENCES rooms(id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  recipient TEXT NOT NULL,
  body TEXT NOT NULL,
  room_id TEXT,
  created INTEGER NOT NULL,
  read INTEGER NOT NULL DEFAULT 0
);
