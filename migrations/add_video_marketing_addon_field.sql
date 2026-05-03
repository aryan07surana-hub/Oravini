-- Add video marketing addon field to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS has_video_marketing_addon BOOLEAN NOT NULL DEFAULT FALSE;

-- Pro and Elite users automatically get video marketing included
UPDATE users SET has_video_marketing_addon = TRUE WHERE plan IN ('pro', 'elite');
