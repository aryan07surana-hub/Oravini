-- Advanced Scheduling Features Migration
-- Adds: custom fields, conditional logic, file uploads, payments, team scheduling, branding

-- Add columns to meeting_types
ALTER TABLE meeting_types ADD COLUMN IF NOT EXISTS buffer_after INTEGER NOT NULL DEFAULT 0;
ALTER TABLE meeting_types ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '[]'::jsonb;
ALTER TABLE meeting_types ADD COLUMN IF NOT EXISTS conditional_logic JSONB DEFAULT '{}'::jsonb;
ALTER TABLE meeting_types ADD COLUMN IF NOT EXISTS allow_file_upload BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE meeting_types ADD COLUMN IF NOT EXISTS max_file_size INTEGER DEFAULT 5;
ALTER TABLE meeting_types ADD COLUMN IF NOT EXISTS accepted_file_types TEXT DEFAULT 'image/*,application/pdf';
ALTER TABLE meeting_types ADD COLUMN IF NOT EXISTS require_payment BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE meeting_types ADD COLUMN IF NOT EXISTS payment_amount INTEGER DEFAULT 0;
ALTER TABLE meeting_types ADD COLUMN IF NOT EXISTS payment_currency TEXT DEFAULT 'USD';
ALTER TABLE meeting_types ADD COLUMN IF NOT EXISTS stripe_payment_link_id TEXT;
ALTER TABLE meeting_types ADD COLUMN IF NOT EXISTS min_notice_hours INTEGER NOT NULL DEFAULT 24;
ALTER TABLE meeting_types ADD COLUMN IF NOT EXISTS max_booking_days INTEGER NOT NULL DEFAULT 60;
ALTER TABLE meeting_types ADD COLUMN IF NOT EXISTS slot_interval INTEGER NOT NULL DEFAULT 30;
ALTER TABLE meeting_types ADD COLUMN IF NOT EXISTS team_members JSONB DEFAULT '[]'::jsonb;
ALTER TABLE meeting_types ADD COLUMN IF NOT EXISTS round_robin_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE meeting_types ADD COLUMN IF NOT EXISTS require_approval BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE meeting_types ADD COLUMN IF NOT EXISTS branding_config JSONB DEFAULT '{}'::jsonb;
ALTER TABLE meeting_types ADD COLUMN IF NOT EXISTS redirect_url TEXT;
ALTER TABLE meeting_types ADD COLUMN IF NOT EXISTS confirmation_message TEXT;

-- Add columns to scheduled_bookings
ALTER TABLE scheduled_bookings ADD COLUMN IF NOT EXISTS user_id VARCHAR REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE scheduled_bookings ADD COLUMN IF NOT EXISTS assigned_team_member_id VARCHAR REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE scheduled_bookings ADD COLUMN IF NOT EXISTS client_phone TEXT;
ALTER TABLE scheduled_bookings ADD COLUMN IF NOT EXISTS client_timezone TEXT DEFAULT 'UTC';
ALTER TABLE scheduled_bookings ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE scheduled_bookings ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;
ALTER TABLE scheduled_bookings ADD COLUMN IF NOT EXISTS custom_answers TEXT;
ALTER TABLE scheduled_bookings ADD COLUMN IF NOT EXISTS uploaded_files JSONB DEFAULT '[]'::jsonb;
ALTER TABLE scheduled_bookings ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid';
ALTER TABLE scheduled_bookings ADD COLUMN IF NOT EXISTS payment_intent_id TEXT;
ALTER TABLE scheduled_bookings ADD COLUMN IF NOT EXISTS cancel_reason TEXT;
ALTER TABLE scheduled_bookings ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;
ALTER TABLE scheduled_bookings ADD COLUMN IF NOT EXISTS rescheduled_from VARCHAR;
ALTER TABLE scheduled_bookings ADD COLUMN IF NOT EXISTS rescheduled_to VARCHAR;
ALTER TABLE scheduled_bookings ADD COLUMN IF NOT EXISTS no_show_recorded BOOLEAN NOT NULL DEFAULT false;

-- Backfill user_id from meeting_types
UPDATE scheduled_bookings 
SET user_id = (SELECT user_id FROM meeting_types WHERE meeting_types.id = scheduled_bookings.meeting_type_id)
WHERE user_id IS NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_scheduled_bookings_user_id ON scheduled_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_bookings_assigned_team_member ON scheduled_bookings(assigned_team_member_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_bookings_start_time ON scheduled_bookings(start_time);
CREATE INDEX IF NOT EXISTS idx_scheduled_bookings_status ON scheduled_bookings(status);
CREATE INDEX IF NOT EXISTS idx_meeting_types_slug ON meeting_types(slug);
CREATE INDEX IF NOT EXISTS idx_meeting_types_user_id ON meeting_types(user_id);
