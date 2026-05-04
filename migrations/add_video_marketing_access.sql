-- Add hasVideoMarketing field to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS has_video_marketing BOOLEAN NOT NULL DEFAULT FALSE;

-- Grant video marketing access to Elite tier users automatically
UPDATE users SET has_video_marketing = TRUE WHERE plan = 'elite';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_has_video_marketing ON users(has_video_marketing);
CREATE INDEX IF NOT EXISTS idx_users_plan_video_marketing ON users(plan, has_video_marketing);
