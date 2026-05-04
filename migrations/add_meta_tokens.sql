-- Migration: Add meta_tokens table for Instagram/Facebook OAuth
-- Drop canva_tokens table (no longer used)

-- Drop canva_tokens table
DROP TABLE IF EXISTS canva_tokens CASCADE;

-- Create meta_tokens table for Instagram/Facebook OAuth
CREATE TABLE IF NOT EXISTS meta_tokens (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  access_token TEXT NOT NULL,
  expires_at TIMESTAMP,
  scope TEXT,
  ig_account_id TEXT,
  ig_username TEXT,
  fb_page_id TEXT,
  fb_page_name TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_meta_tokens_user_id ON meta_tokens(user_id);
