-- Add reset_token and reset_token_expiry columns to users table for password reset functionality

ALTER TABLE users
ADD COLUMN IF NOT EXISTS reset_token TEXT,
ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMP;

-- Add index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token);

-- Add comment
COMMENT ON COLUMN users.reset_token IS 'Temporary token for password reset, cleared after use';
COMMENT ON COLUMN users.reset_token_expiry IS 'Expiry timestamp for reset token (1 hour)';
