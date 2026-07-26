-- DM AI Brain (BYOK) config table
CREATE TABLE IF NOT EXISTS dm_ai_configs (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(20) NOT NULL DEFAULT 'claude',
  api_key_encrypted TEXT NOT NULL,
  system_prompt TEXT NOT NULL DEFAULT '',
  voice_description TEXT NOT NULL DEFAULT '',
  example_conversations JSONB DEFAULT '[]',
  auto_tag_rules JSONB DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS dm_ai_configs_user_id_idx ON dm_ai_configs(user_id);
