-- Webinar Advanced Features Migration
-- Multi-Panelist, Backstage, Breakout Rooms, Email Automation, Surveys, Captions, etc.

-- Webinar Role Enum
DO $$ BEGIN
  CREATE TYPE webinar_role AS ENUM ('host', 'co_host', 'panelist', 'attendee');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Webinar Panelists
CREATE TABLE IF NOT EXISTS webinar_panelists (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  webinar_id VARCHAR NOT NULL REFERENCES webinars(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role webinar_role NOT NULL DEFAULT 'panelist',
  user_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  invite_token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'invited',
  can_share_screen BOOLEAN NOT NULL DEFAULT true,
  can_chat BOOLEAN NOT NULL DEFAULT true,
  can_manage_polls BOOLEAN NOT NULL DEFAULT false,
  can_mute_others BOOLEAN NOT NULL DEFAULT false,
  can_remove_attendees BOOLEAN NOT NULL DEFAULT false,
  avatar_url TEXT,
  joined_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Webinar Backstage Messages
CREATE TABLE IF NOT EXISTS webinar_backstage_messages (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  webinar_id VARCHAR NOT NULL REFERENCES webinars(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  sender_role TEXT NOT NULL DEFAULT 'host',
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Webinar Practice Sessions
CREATE TABLE IF NOT EXISTS webinar_practice_sessions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  webinar_id VARCHAR NOT NULL REFERENCES webinars(id) ON DELETE CASCADE,
  started_by VARCHAR NOT NULL,
  started_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP,
  notes TEXT,
  participants JSONB DEFAULT '[]'::jsonb
);

-- Webinar Breakout Rooms
CREATE TABLE IF NOT EXISTS webinar_breakout_rooms (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  webinar_id VARCHAR NOT NULL REFERENCES webinars(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  topic TEXT,
  max_participants INTEGER,
  assignment_type TEXT NOT NULL DEFAULT 'manual',
  is_open BOOLEAN NOT NULL DEFAULT false,
  duration INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Webinar Breakout Participants
CREATE TABLE IF NOT EXISTS webinar_breakout_participants (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id VARCHAR NOT NULL REFERENCES webinar_breakout_rooms(id) ON DELETE CASCADE,
  viewer_id TEXT NOT NULL,
  viewer_name TEXT NOT NULL,
  joined_at TIMESTAMP DEFAULT NOW(),
  left_at TIMESTAMP
);

-- Webinar Emails (automation)
CREATE TABLE IF NOT EXISTS webinar_emails (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  webinar_id VARCHAR NOT NULL REFERENCES webinars(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  send_at TIMESTAMP,
  sent_count INTEGER NOT NULL DEFAULT 0,
  open_count INTEGER NOT NULL DEFAULT 0,
  click_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Webinar Email Logs
CREATE TABLE IF NOT EXISTS webinar_email_logs (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  webinar_email_id VARCHAR NOT NULL REFERENCES webinar_emails(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  sent_at TIMESTAMP DEFAULT NOW(),
  opened_at TIMESTAMP,
  clicked_at TIMESTAMP,
  bounced BOOLEAN NOT NULL DEFAULT false
);

-- Webinar Surveys
CREATE TABLE IF NOT EXISTS webinar_surveys (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  webinar_id VARCHAR NOT NULL REFERENCES webinars(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'How was the webinar?',
  questions JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Webinar Survey Responses
CREATE TABLE IF NOT EXISTS webinar_survey_responses (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id VARCHAR NOT NULL REFERENCES webinar_surveys(id) ON DELETE CASCADE,
  viewer_id TEXT NOT NULL,
  viewer_name TEXT,
  viewer_email TEXT,
  answers JSONB NOT NULL,
  rating INTEGER,
  submitted_at TIMESTAMP DEFAULT NOW()
);

-- Webinar Templates
CREATE TABLE IF NOT EXISTS webinar_templates (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  config JSONB NOT NULL,
  thumbnail_url TEXT,
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Webinar Captions (live)
CREATE TABLE IF NOT EXISTS webinar_captions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  webinar_id VARCHAR NOT NULL REFERENCES webinars(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  speaker_name TEXT,
  language TEXT NOT NULL DEFAULT 'en',
  start_time REAL NOT NULL,
  end_time REAL,
  is_final BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Webinar Transcripts (full post-event)
CREATE TABLE IF NOT EXISTS webinar_transcripts (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  webinar_id VARCHAR NOT NULL REFERENCES webinars(id) ON DELETE CASCADE UNIQUE,
  full_text TEXT NOT NULL,
  segments JSONB,
  language TEXT NOT NULL DEFAULT 'en',
  generated_at TIMESTAMP DEFAULT NOW()
);

-- Webinar Attendee Engagement Scores
CREATE TABLE IF NOT EXISTS webinar_attendee_scores (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  webinar_id VARCHAR NOT NULL REFERENCES webinars(id) ON DELETE CASCADE,
  viewer_id TEXT NOT NULL,
  viewer_name TEXT,
  viewer_email TEXT,
  watch_duration INTEGER NOT NULL DEFAULT 0,
  chat_messages INTEGER NOT NULL DEFAULT 0,
  questions_asked INTEGER NOT NULL DEFAULT 0,
  polls_voted INTEGER NOT NULL DEFAULT 0,
  reactions_count INTEGER NOT NULL DEFAULT 0,
  cta_clicks INTEGER NOT NULL DEFAULT 0,
  hand_raises INTEGER NOT NULL DEFAULT 0,
  engagement_score REAL NOT NULL DEFAULT 0,
  attended_full_duration BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMP,
  left_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Webinar Stream Destinations
CREATE TABLE IF NOT EXISTS webinar_stream_destinations (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  webinar_id VARCHAR NOT NULL REFERENCES webinars(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  rtmp_url TEXT NOT NULL,
  stream_key TEXT NOT NULL,
  label TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Webinar Resources (file/link sharing)
CREATE TABLE IF NOT EXISTS webinar_resources (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  webinar_id VARCHAR NOT NULL REFERENCES webinars(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'link',
  pushed_at TIMESTAMP,
  download_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_panelists_webinar ON webinar_panelists(webinar_id);
CREATE INDEX IF NOT EXISTS idx_panelists_email ON webinar_panelists(email);
CREATE INDEX IF NOT EXISTS idx_backstage_webinar ON webinar_backstage_messages(webinar_id);
CREATE INDEX IF NOT EXISTS idx_breakout_rooms_webinar ON webinar_breakout_rooms(webinar_id);
CREATE INDEX IF NOT EXISTS idx_breakout_participants_room ON webinar_breakout_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_webinar_emails_webinar ON webinar_emails(webinar_id);
CREATE INDEX IF NOT EXISTS idx_webinar_email_logs_email ON webinar_email_logs(webinar_email_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_survey ON webinar_survey_responses(survey_id);
CREATE INDEX IF NOT EXISTS idx_captions_webinar ON webinar_captions(webinar_id);
CREATE INDEX IF NOT EXISTS idx_attendee_scores_webinar ON webinar_attendee_scores(webinar_id);
CREATE INDEX IF NOT EXISTS idx_stream_destinations_webinar ON webinar_stream_destinations(webinar_id);
CREATE INDEX IF NOT EXISTS idx_resources_webinar ON webinar_resources(webinar_id);
