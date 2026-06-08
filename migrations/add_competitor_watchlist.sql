-- Competitor Watch List: track 5-6 Instagram accounts continuously
CREATE TABLE IF NOT EXISTS competitor_watchlist (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  competitor_url TEXT NOT NULL,
  handle VARCHAR NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_scanned_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Daily snapshots per watchlist item
CREATE TABLE IF NOT EXISTS competitor_snapshots (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  watchlist_id VARCHAR NOT NULL REFERENCES competitor_watchlist(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scanned_at TIMESTAMP DEFAULT NOW(),
  follower_count INTEGER,
  following_count INTEGER,
  post_count INTEGER,
  avg_views REAL,
  avg_likes REAL,
  avg_comments REAL,
  avg_engagement REAL,
  bio TEXT,
  recent_posts JSONB
);

-- Change alerts
CREATE TABLE IF NOT EXISTS competitor_alerts (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  watchlist_id VARCHAR NOT NULL REFERENCES competitor_watchlist(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_competitor_watchlist_user ON competitor_watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_competitor_snapshots_watchlist ON competitor_snapshots(watchlist_id);
CREATE INDEX IF NOT EXISTS idx_competitor_alerts_user ON competitor_alerts(user_id, is_read, created_at DESC);
