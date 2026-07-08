-- Coach Agent Migration
-- Adds persistent user profiles + score history for AI agent personalization

CREATE TABLE IF NOT EXISTS coach_profiles (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  niche TEXT,
  platform TEXT NOT NULL DEFAULT 'instagram',
  goal TEXT,
  follower_tier TEXT NOT NULL DEFAULT 'nano',
  content_style TEXT,
  avg_hook_score REAL NOT NULL DEFAULT 0,
  avg_clarity REAL NOT NULL DEFAULT 0,
  avg_persuasion REAL NOT NULL DEFAULT 0,
  avg_cta REAL NOT NULL DEFAULT 0,
  avg_brand_voice REAL NOT NULL DEFAULT 0,
  avg_overall REAL NOT NULL DEFAULT 0,
  total_sessions INTEGER NOT NULL DEFAULT 0,
  top_weakness TEXT,
  top_strength TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coach_profiles_user ON coach_profiles(user_id);

CREATE TABLE IF NOT EXISTS coach_score_history (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  script_preview TEXT,
  overall_score INTEGER NOT NULL DEFAULT 0,
  clarity INTEGER NOT NULL DEFAULT 0,
  persuasion INTEGER NOT NULL DEFAULT 0,
  cta_strength INTEGER NOT NULL DEFAULT 0,
  brand_voice INTEGER NOT NULL DEFAULT 0,
  mode TEXT NOT NULL DEFAULT 'breakdown',
  goal TEXT,
  verdict TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coach_score_history_user ON coach_score_history(user_id);
CREATE INDEX IF NOT EXISTS idx_coach_score_history_created ON coach_score_history(user_id, created_at DESC);
