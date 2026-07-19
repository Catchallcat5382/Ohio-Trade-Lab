-- V66: anonymous OAuth onboarding and demand-aware auction ranking
ALTER TABLE users ADD COLUMN needs_display_name INTEGER NOT NULL DEFAULT 0;
ALTER TABLE bids ADD COLUMN demand_score REAL NOT NULL DEFAULT 0;
ALTER TABLE bids ADD COLUMN effective_score REAL NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_bids_listing_effective ON bids(listing_id,effective_score DESC,value DESC,demand_score DESC,created ASC);

UPDATE users SET needs_display_name=1, display_name='Anonymous User' WHERE provider IN ('google','discord');
