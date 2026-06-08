-- Dialer / Twilio calling system tables

CREATE TABLE IF NOT EXISTS dialer_settings (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  twilio_account_sid TEXT,
  twilio_auth_token TEXT,
  twilio_phone_number TEXT,
  twilio_twiml_app_sid TEXT,
  default_script TEXT,
  sms_template TEXT,
  record_calls BOOLEAN NOT NULL DEFAULT TRUE,
  ai_provider TEXT NOT NULL DEFAULT 'vapi',
  vapi_api_key TEXT,
  vapi_assistant_id TEXT,
  bland_api_key TEXT,
  bland_voice_id TEXT,
  ai_system_prompt TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dialer_leads (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  company TEXT,
  notes TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  source_type TEXT NOT NULL DEFAULT 'manual',
  source_webinar_id VARCHAR,
  source_webinar_title TEXT,
  engagement_score INTEGER NOT NULL DEFAULT 0,
  priority TEXT NOT NULL DEFAULT 'normal',
  webinar_behavior JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  last_call_at TIMESTAMP,
  call_count INTEGER NOT NULL DEFAULT 0,
  next_call_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dialer_call_logs (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lead_id VARCHAR,
  lead_name TEXT NOT NULL,
  lead_phone TEXT NOT NULL,
  twilio_call_sid TEXT,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  outcome TEXT NOT NULL DEFAULT 'no_answer',
  notes TEXT,
  script_used TEXT,
  recording_url TEXT,
  started_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dialer_ai_campaigns (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'vapi',
  system_prompt TEXT,
  first_message TEXT,
  objective TEXT NOT NULL DEFAULT 'book_meeting',
  source_webinar_id VARCHAR,
  source_webinar_title TEXT,
  max_calls_per_hour INTEGER NOT NULL DEFAULT 10,
  concurrent_calls INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft',
  total_leads INTEGER NOT NULL DEFAULT 0,
  called_count INTEGER NOT NULL DEFAULT 0,
  answered_count INTEGER NOT NULL DEFAULT 0,
  booked_count INTEGER NOT NULL DEFAULT 0,
  not_interested_count INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dialer_ai_call_results (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  campaign_id VARCHAR,
  lead_id VARCHAR,
  lead_name TEXT NOT NULL,
  lead_phone TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_call_id TEXT,
  status TEXT NOT NULL DEFAULT 'initiated',
  outcome TEXT,
  duration_seconds INTEGER,
  transcript TEXT,
  summary TEXT,
  sentiment TEXT,
  appointment_booked BOOLEAN NOT NULL DEFAULT FALSE,
  appointment_time TEXT,
  hot_lead BOOLEAN NOT NULL DEFAULT FALSE,
  needs_human_followup BOOLEAN NOT NULL DEFAULT FALSE,
  recording_url TEXT,
  key_points JSONB DEFAULT '[]'::jsonb,
  objections JSONB DEFAULT '[]'::jsonb,
  started_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dialer_voicemails (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  recording_url TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dialer_local_numbers (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  area_code TEXT NOT NULL,
  state TEXT,
  city TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dialer_sms_conversations (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lead_id VARCHAR,
  lead_name TEXT NOT NULL,
  lead_phone TEXT NOT NULL,
  last_message TEXT,
  last_message_at TIMESTAMP DEFAULT NOW(),
  unread_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS dialer_sms_messages (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id VARCHAR NOT NULL REFERENCES dialer_sms_conversations(id) ON DELETE CASCADE,
  direction TEXT NOT NULL,
  body TEXT NOT NULL,
  twilio_sid TEXT,
  status TEXT NOT NULL DEFAULT 'sent',
  sent_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dialer_cadences (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger_outcome TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dialer_cadence_steps (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  cadence_id VARCHAR NOT NULL REFERENCES dialer_cadences(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL DEFAULT 0,
  delay_hours INTEGER NOT NULL DEFAULT 0,
  action TEXT NOT NULL,
  template TEXT
);

CREATE TABLE IF NOT EXISTS dialer_cadence_enrollments (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  cadence_id VARCHAR NOT NULL REFERENCES dialer_cadences(id) ON DELETE CASCADE,
  lead_id VARCHAR NOT NULL,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  next_run_at TIMESTAMP,
  enrolled_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(cadence_id, lead_id)
);

CREATE TABLE IF NOT EXISTS dialer_callbacks (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lead_id VARCHAR,
  lead_name TEXT NOT NULL,
  lead_phone TEXT NOT NULL,
  scheduled_for TIMESTAMP NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS dialer_goals (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  daily_call_target INTEGER NOT NULL DEFAULT 50,
  daily_sms_target INTEGER NOT NULL DEFAULT 20,
  daily_booking_target INTEGER NOT NULL DEFAULT 5,
  weekly_call_target INTEGER NOT NULL DEFAULT 250,
  streak_days INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dialer_objections (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  objection TEXT NOT NULL,
  response TEXT,
  category TEXT NOT NULL DEFAULT 'other',
  occurrence_count INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dialer_timeline_events (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lead_id VARCHAR NOT NULL,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  metadata JSONB,
  occurred_at TIMESTAMP DEFAULT NOW()
);
