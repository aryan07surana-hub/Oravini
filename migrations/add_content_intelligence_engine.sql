-- Content Intelligence Engine Migration
-- This adds all the training data infrastructure for the AI content system

-- Hook Type Enum
CREATE TYPE hook_type AS ENUM ('curiosity', 'authority', 'storytelling', 'controversy', 'pain_point', 'education', 'proof', 'question');

-- Hook Library Table
CREATE TABLE IF NOT EXISTS hook_library (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  hook TEXT NOT NULL,
  hook_type hook_type NOT NULL,
  platform platform NOT NULL,
  niche TEXT NOT NULL,
  viral_score REAL NOT NULL DEFAULT 0,
  avg_views INTEGER NOT NULL DEFAULT 0,
  avg_engagement REAL NOT NULL DEFAULT 0,
  usage_count INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'user_content',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_hook_library_platform ON hook_library(platform);
CREATE INDEX idx_hook_library_niche ON hook_library(niche);
CREATE INDEX idx_hook_library_viral_score ON hook_library(viral_score DESC);
CREATE INDEX idx_hook_library_hook_type ON hook_library(hook_type);

-- Winning Patterns Table
CREATE TABLE IF NOT EXISTS winning_patterns (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id VARCHAR REFERENCES content_posts(id) ON DELETE SET NULL,
  platform platform NOT NULL,
  content_type content_type NOT NULL,
  funnel_stage funnel_stage NOT NULL,
  hook TEXT NOT NULL,
  hook_type hook_type NOT NULL,
  structure TEXT NOT NULL,
  cta TEXT,
  niche TEXT NOT NULL,
  views INTEGER NOT NULL DEFAULT 0,
  likes INTEGER NOT NULL DEFAULT 0,
  comments INTEGER NOT NULL DEFAULT 0,
  saves INTEGER NOT NULL DEFAULT 0,
  engagement_rate REAL NOT NULL DEFAULT 0,
  viral_score REAL NOT NULL DEFAULT 0,
  performance_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_winning_patterns_user ON winning_patterns(user_id);
CREATE INDEX idx_winning_patterns_platform ON winning_patterns(platform);
CREATE INDEX idx_winning_patterns_viral_score ON winning_patterns(viral_score DESC);
CREATE INDEX idx_winning_patterns_funnel_stage ON winning_patterns(funnel_stage);

-- Brand Voice Profiles Table
CREATE TABLE IF NOT EXISTS brand_voice_profiles (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  tone TEXT NOT NULL,
  vocabulary TEXT[],
  sentence_structure TEXT NOT NULL,
  punctuation_style TEXT NOT NULL,
  perspective TEXT NOT NULL,
  unique_patterns TEXT[],
  voice_fingerprint TEXT NOT NULL,
  analyzed_posts_count INTEGER NOT NULL DEFAULT 0,
  last_analyzed_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_brand_voice_user ON brand_voice_profiles(user_id);

-- Content Calendars Table
CREATE TABLE IF NOT EXISTS content_calendars (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  niche TEXT NOT NULL,
  platform platform NOT NULL,
  goal TEXT NOT NULL,
  strategy JSONB,
  posts JSONB,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_content_calendars_user ON content_calendars(user_id);
CREATE INDEX idx_content_calendars_month ON content_calendars(month);
CREATE INDEX idx_content_calendars_status ON content_calendars(status);

-- Content Templates Table
CREATE TABLE IF NOT EXISTS content_templates (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  funnel_stage funnel_stage NOT NULL,
  platform platform NOT NULL,
  content_type content_type NOT NULL,
  template JSONB,
  usage_count INTEGER NOT NULL DEFAULT 0,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_content_templates_user ON content_templates(user_id);
CREATE INDEX idx_content_templates_funnel_stage ON content_templates(funnel_stage);
CREATE INDEX idx_content_templates_platform ON content_templates(platform);
CREATE INDEX idx_content_templates_public ON content_templates(is_public);

-- Platform Training Data Table
CREATE TABLE IF NOT EXISTS platform_training_data (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  platform platform NOT NULL,
  content_type content_type NOT NULL,
  pattern TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  examples JSONB,
  effectiveness REAL NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'admin_curated',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_platform_training_platform ON platform_training_data(platform);
CREATE INDEX idx_platform_training_content_type ON platform_training_data(content_type);
CREATE INDEX idx_platform_training_category ON platform_training_data(category);

-- Funnel Stage Training Table
CREATE TABLE IF NOT EXISTS funnel_stage_training (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_stage funnel_stage NOT NULL,
  purpose TEXT NOT NULL,
  content_types TEXT[] NOT NULL,
  hook_types TEXT[] NOT NULL,
  cta_types TEXT[] NOT NULL,
  examples JSONB,
  best_practices TEXT[],
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_funnel_stage_training_stage ON funnel_stage_training(funnel_stage);

-- Seed some initial training data
INSERT INTO funnel_stage_training (funnel_stage, purpose, content_types, hook_types, cta_types, examples, best_practices) VALUES
('top', 'Awareness — reach new people who don''t know you', ARRAY['viral reels', 'trending topics', 'relatable pain points'], ARRAY['curiosity', 'controversy', 'storytelling'], ARRAY['Follow for more', 'Save this', 'Share with someone who needs this'], '[]'::jsonb, ARRAY['Use pattern interrupts', 'Hook in first 3 seconds', 'Make it relatable']),
('middle', 'Trust — prove you know what you''re talking about', ARRAY['case studies', 'frameworks', 'how-to breakdowns'], ARRAY['authority', 'education', 'proof'], ARRAY['Comment your thoughts', 'DM me [word] for the full guide', 'Save this framework'], '[]'::jsonb, ARRAY['Show proof', 'Be specific', 'Provide frameworks']),
('bottom', 'Conversion — turn followers into customers', ARRAY['testimonials', 'offers', 'urgency-driven posts'], ARRAY['authority', 'proof', 'scarcity'], ARRAY['DM to work with me', 'Link in bio', 'Limited spots available'], '[]'::jsonb, ARRAY['Create urgency', 'Show results', 'Clear CTA']);

COMMENT ON TABLE hook_library IS 'Proven viral hooks trained from real user data';
COMMENT ON TABLE winning_patterns IS 'Content that performed well - used to train AI';
COMMENT ON TABLE brand_voice_profiles IS 'User-specific voice patterns extracted from their content';
COMMENT ON TABLE content_calendars IS 'Monthly content plans generated by AI';
COMMENT ON TABLE content_templates IS 'Reusable content structures';
COMMENT ON TABLE platform_training_data IS 'Platform-specific patterns that work';
COMMENT ON TABLE funnel_stage_training IS 'Training examples for each funnel stage';
