PRAGMA foreign_keys=OFF;
CREATE TABLE IF NOT EXISTS users_v41 (
 id TEXT PRIMARY KEY,
 email TEXT NOT NULL UNIQUE,
 username TEXT NOT NULL UNIQUE,
 display_name TEXT NOT NULL,
 avatar TEXT NOT NULL DEFAULT '',
 password_hash TEXT,
 password_salt TEXT,
 provider TEXT NOT NULL CHECK(provider IN ('email','google','discord')),
 provider_id TEXT UNIQUE,
 role TEXT NOT NULL DEFAULT 'user',
 status TEXT NOT NULL DEFAULT 'active',
 created INTEGER NOT NULL
);
INSERT OR IGNORE INTO users_v41(id,email,username,display_name,avatar,password_hash,password_salt,provider,provider_id,role,status,created)
 SELECT id,email,username,display_name,avatar,password_hash,password_salt,provider,provider_id,role,status,created FROM users;
DROP TABLE users;
ALTER TABLE users_v41 RENAME TO users;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE TABLE IF NOT EXISTS presence (
 visitor_id TEXT PRIMARY KEY,
 user_id TEXT,
 kind TEXT NOT NULL CHECK(kind IN ('guest','user','staff')),
 last_seen INTEGER NOT NULL,
 FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_presence_last_seen ON presence(last_seen);
PRAGMA foreign_keys=ON;
