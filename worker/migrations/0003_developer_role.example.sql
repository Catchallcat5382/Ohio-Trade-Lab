-- TEMPLATE ONLY: replace developer@example.com before running manually.
-- After creating your own account, replace the email below with your real login email.
-- Run this migration only after editing it.
UPDATE users SET role='developer' WHERE lower(email)=lower('developer@example.com');
CREATE INDEX IF NOT EXISTS idx_users_role_status ON users(role,status);
