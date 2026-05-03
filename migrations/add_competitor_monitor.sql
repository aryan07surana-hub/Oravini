-- Daily Competitor Monitor Tables

CREATE TABLE IF NOT EXISTS competitor_monitors (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  competitor_url TEXT NOT NULL,
  competitor_handle VARCHAR,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS competitor_daily_snapshots (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  monitor_id VARCHAR NOT NULL REFERENCES competitor_monitors(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  posts_today JSONB, -- Array of posts from today
  total_posts INTEGER DEFAULT 0,
  new_posts_count INTEGER DEFAULT 0,
  avg_engagement REAL DEFAULT 0,
  top_post JSONB, -- Best performing post of the day
  summary TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(monitor_id, snapshot_date)
);

CREATE INDEX idx_competitor_monitors_client ON competitor_monitors(client_id);
CREATE INDEX idx_competitor_snapshots_monitor ON competitor_daily_snapshots(monitor_id);
CREATE INDEX idx_competitor_snapshots_date ON competitor_daily_snapshots(snapshot_date);
