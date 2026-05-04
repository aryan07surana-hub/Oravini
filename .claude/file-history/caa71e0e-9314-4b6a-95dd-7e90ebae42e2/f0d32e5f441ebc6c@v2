-- DM Automation Advanced Features v2

-- Contact Custom Field Definitions
CREATE TABLE IF NOT EXISTS contact_custom_field_defs (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  field_key TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Contact Custom Field Values (one per lead per field)
CREATE TABLE IF NOT EXISTS contact_custom_field_values (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id VARCHAR NOT NULL REFERENCES dm_leads(id) ON DELETE CASCADE,
  field_def_id VARCHAR NOT NULL REFERENCES contact_custom_field_defs(id) ON DELETE CASCADE,
  value TEXT,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(lead_id, field_def_id)
);

-- Welcome DM Configs
CREATE TABLE IF NOT EXISTS welcome_dm_configs (
  user_id VARCHAR PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  message TEXT NOT NULL DEFAULT '',
  delay_minutes INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Outbound Webhooks (Zapier/Make integration)
CREATE TABLE IF NOT EXISTS outbound_webhooks (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  trigger_event TEXT NOT NULL,
  trigger_value TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  fire_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- DM Click Tracking Links
CREATE TABLE IF NOT EXISTS dm_click_links (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  original_url TEXT NOT NULL,
  short_code TEXT NOT NULL UNIQUE,
  label TEXT,
  click_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- DM Click Events (per-click log)
CREATE TABLE IF NOT EXISTS dm_click_events (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id VARCHAR NOT NULL REFERENCES dm_click_links(id) ON DELETE CASCADE,
  lead_id VARCHAR REFERENCES dm_leads(id) ON DELETE SET NULL,
  clicked_at TIMESTAMP DEFAULT NOW(),
  ip_address TEXT
);

-- DM Funnel Events
CREATE TABLE IF NOT EXISTS dm_funnel_events (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lead_id VARCHAR REFERENCES dm_leads(id) ON DELETE SET NULL,
  flow_id VARCHAR REFERENCES dm_flows(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Conversation Notes
CREATE TABLE IF NOT EXISTS conversation_notes (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ig_user_id TEXT NOT NULL,
  note TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Scheduled Broadcasts
CREATE TABLE IF NOT EXISTS dm_scheduled_broadcasts (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  message TEXT NOT NULL,
  target_tag TEXT,
  target_status TEXT,
  scheduled_at TIMESTAMP NOT NULL,
  sent_at TIMESTAMP,
  recipient_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Extend dm_leads with new columns
ALTER TABLE dm_leads ADD COLUMN IF NOT EXISTS lead_score INTEGER;
ALTER TABLE dm_leads ADD COLUMN IF NOT EXISTS lead_score_reason TEXT;
ALTER TABLE dm_leads ADD COLUMN IF NOT EXISTS is_opted_out BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE dm_leads ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE dm_leads ADD COLUMN IF NOT EXISTS phone TEXT;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cf_defs_user       ON contact_custom_field_defs(user_id);
CREATE INDEX IF NOT EXISTS idx_cf_values_lead      ON contact_custom_field_values(lead_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_user        ON outbound_webhooks(user_id);
CREATE INDEX IF NOT EXISTS idx_click_links_user     ON dm_click_links(user_id);
CREATE INDEX IF NOT EXISTS idx_click_links_code     ON dm_click_links(short_code);
CREATE INDEX IF NOT EXISTS idx_click_events_link    ON dm_click_events(link_id);
CREATE INDEX IF NOT EXISTS idx_funnel_events_user   ON dm_funnel_events(user_id);
CREATE INDEX IF NOT EXISTS idx_funnel_events_type   ON dm_funnel_events(event_type);
CREATE INDEX IF NOT EXISTS idx_conv_notes_ig        ON conversation_notes(ig_user_id);
CREATE INDEX IF NOT EXISTS idx_sched_bcast_user     ON dm_scheduled_broadcasts(user_id);
CREATE INDEX IF NOT EXISTS idx_sched_bcast_status   ON dm_scheduled_broadcasts(status, scheduled_at);
