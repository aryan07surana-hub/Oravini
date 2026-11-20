-- AI video editor overhaul (additive only; also applied at boot by server/index.ts runMigrations).
CREATE TABLE IF NOT EXISTS video_editor_jobs (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL,
  edit_id INTEGER,
  kind TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  progress REAL NOT NULL DEFAULT 0,
  stage TEXT,
  payload JSONB,
  result JSONB,
  error TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_video_editor_jobs_status ON video_editor_jobs(status, id);
CREATE INDEX IF NOT EXISTS idx_video_editor_jobs_user ON video_editor_jobs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_editor_jobs_edit ON video_editor_jobs(edit_id, created_at DESC);
ALTER TABLE video_edits ADD COLUMN IF NOT EXISTS edl JSONB;
ALTER TABLE video_edits ADD COLUMN IF NOT EXISTS chat_history JSONB;
ALTER TABLE video_edits ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'upload';
ALTER TABLE video_edits ADD COLUMN IF NOT EXISTS source_remote_url TEXT;
ALTER TABLE video_edits ADD COLUMN IF NOT EXISTS output_engine TEXT;
ALTER TABLE video_edits ADD COLUMN IF NOT EXISTS output_watermarked BOOLEAN DEFAULT FALSE;
ALTER TABLE video_edits ADD COLUMN IF NOT EXISTS output_meta JSONB;
ALTER TABLE video_edits ADD COLUMN IF NOT EXISTS error TEXT;
ALTER TABLE video_edits ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
