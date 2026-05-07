-- Comment Auto-Replies
CREATE TABLE IF NOT EXISTS comment_auto_replies (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  keyword TEXT,
  post_url TEXT,
  reply_message TEXT NOT NULL,
  also_dm BOOLEAN NOT NULL DEFAULT FALSE,
  dm_message TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  trigger_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Story Reply Configs
CREATE TABLE IF NOT EXISTS story_reply_configs (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reply_message TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- DM Visual Flows
CREATE TABLE IF NOT EXISTS dm_flows (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  trigger_keyword TEXT,
  nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
  edges JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- DM Contact Tags
CREATE TABLE IF NOT EXISTS dm_contact_tags (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id VARCHAR NOT NULL REFERENCES dm_leads(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- AI Bot Configs
CREATE TABLE IF NOT EXISTS ai_bot_configs (
  user_id VARCHAR PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  personality TEXT NOT NULL DEFAULT 'friendly',
  instructions TEXT,
  fallback_message TEXT,
  keywords_only BOOLEAN NOT NULL DEFAULT FALSE,
  keywords TEXT[],
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Opt-in Links
CREATE TABLE IF NOT EXISTS opt_in_links (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  ref_code TEXT NOT NULL UNIQUE,
  welcome_message TEXT,
  sequence_id VARCHAR REFERENCES dm_sequences(id) ON DELETE SET NULL,
  click_count INTEGER NOT NULL DEFAULT 0,
  opt_in_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comment_auto_replies_user ON comment_auto_replies(user_id);
CREATE INDEX IF NOT EXISTS idx_story_reply_configs_user ON story_reply_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_dm_flows_user ON dm_flows(user_id);
CREATE INDEX IF NOT EXISTS idx_dm_contact_tags_lead ON dm_contact_tags(lead_id);
CREATE INDEX IF NOT EXISTS idx_opt_in_links_user ON opt_in_links(user_id);
CREATE INDEX IF NOT EXISTS idx_opt_in_links_ref_code ON opt_in_links(ref_code);
