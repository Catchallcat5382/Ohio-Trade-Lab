-- After creating your own account, replace the email below with your real login email.
-- Run this migration only after editing it.
UPDATE users SET role='developer' WHERE lower(email)=lower('REPLACE_WITH_YOUR_EMAIL@example.com');
CREATE INDEX IF NOT EXISTS idx_users_role_status ON users(role,status);
