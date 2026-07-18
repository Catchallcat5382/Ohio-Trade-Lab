PRAGMA foreign_keys=ON;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS rooms;
DROP TABLE IF EXISTS bids;
DROP TABLE IF EXISTS listings;
CREATE TABLE IF NOT EXISTS users (
 id TEXT PRIMARY KEY,
 email TEXT NOT NULL UNIQUE,
 username TEXT NOT NULL UNIQUE,
 display_name TEXT NOT NULL,
 avatar TEXT NOT NULL DEFAULT '',
 password_hash TEXT,
 password_salt TEXT,
 provider TEXT NOT NULL CHECK(provider IN ('email','google')),
 provider_id TEXT UNIQUE,
 role TEXT NOT NULL DEFAULT 'user',
 status TEXT NOT NULL DEFAULT 'active',
 created INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS listings (
 id TEXT PRIMARY KEY,
 type TEXT NOT NULL CHECK(type IN ('trade','auction')),
 owner_id TEXT NOT NULL,
 title TEXT NOT NULL,
 description TEXT NOT NULL DEFAULT '',
 give_json TEXT NOT NULL DEFAULT '[]',
 want_json TEXT NOT NULL DEFAULT '[]',
 category TEXT NOT NULL DEFAULT '',
 preferred_section TEXT NOT NULL DEFAULT '',
 preferred_set TEXT NOT NULL DEFAULT '',
 min_bid_value INTEGER NOT NULL DEFAULT 0,
 created INTEGER NOT NULL,
 expires INTEGER NOT NULL,
 completed INTEGER,
 status TEXT NOT NULL DEFAULT 'open',
 winning_bid_id TEXT,
 FOREIGN KEY(owner_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_listings_status_expires ON listings(status,expires);
CREATE TABLE IF NOT EXISTS bids (
 id TEXT PRIMARY KEY,
 listing_id TEXT NOT NULL,
 bidder_id TEXT NOT NULL,
 items_json TEXT NOT NULL,
 value INTEGER NOT NULL DEFAULT 0,
 created INTEGER NOT NULL,
 FOREIGN KEY(listing_id) REFERENCES listings(id),
 FOREIGN KEY(bidder_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_bids_listing_value ON bids(listing_id,value DESC,created ASC);
CREATE TABLE IF NOT EXISTS rooms (
 id TEXT PRIMARY KEY,
 listing_id TEXT,
 title TEXT NOT NULL,
 member_a TEXT NOT NULL,
 member_b TEXT NOT NULL,
 created INTEGER NOT NULL,
 status TEXT NOT NULL DEFAULT 'open',
 FOREIGN KEY(member_a) REFERENCES users(id),
 FOREIGN KEY(member_b) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS messages (
 id TEXT PRIMARY KEY,
 room_id TEXT NOT NULL,
 author_id TEXT NOT NULL,
 body TEXT NOT NULL,
 created INTEGER NOT NULL,
 system INTEGER NOT NULL DEFAULT 0,
 FOREIGN KEY(room_id) REFERENCES rooms(id),
 FOREIGN KEY(author_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS notifications (
 id TEXT PRIMARY KEY,
 recipient_id TEXT NOT NULL,
 body TEXT NOT NULL,
 room_id TEXT,
 created INTEGER NOT NULL,
 read INTEGER NOT NULL DEFAULT 0,
 FOREIGN KEY(recipient_id) REFERENCES users(id)
);
