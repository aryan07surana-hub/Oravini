-- Fix missing tables for Oravini platform
-- Run this to create the missing onboarding_survey, community_posts, and community_likes tables

-- Create onboarding_surveys table
CREATE TABLE IF NOT EXISTS onboarding_surveys (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  awareness TEXT,
  field TEXT,
  fields TEXT[],
  struggles TEXT[],
  content_types TEXT[],
  descriptor TEXT,
  experience TEXT,
  follower_count TEXT,
  monthly_revenue TEXT,
  primary_goal TEXT,
  platform TEXT,
  platforms TEXT[],
  heard_about TEXT[],
  answers JSONB,
  completed_at TIMESTAMP DEFAULT NOW()
);

-- Create community_posts table
CREATE TABLE IF NOT EXISTS community_posts (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL,
  channel TEXT NOT NULL,
  content TEXT NOT NULL,
  parent_id INTEGER REFERENCES community_posts(id) ON DELETE CASCADE,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create community_likes table
CREATE TABLE IF NOT EXISTS community_likes (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_onboarding_surveys_user_id ON onboarding_surveys(user_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_user_id ON community_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_channel ON community_posts(channel);
CREATE INDEX IF NOT EXISTS idx_community_likes_post_id ON community_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_community_likes_user_id ON community_likes(user_id);
