CREATE TYPE "public"."crm_activity_type" AS ENUM('note', 'email', 'call', 'sms', 'meeting', 'task', 'stage_change', 'tag', 'system');--> statement-breakpoint
CREATE TYPE "public"."crm_contact_status" AS ENUM('lead', 'prospect', 'customer', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."crm_opportunity_status" AS ENUM('open', 'won', 'lost', 'abandoned');--> statement-breakpoint
CREATE TYPE "public"."crm_task_status" AS ENUM('open', 'done', 'snoozed');--> statement-breakpoint
CREATE TYPE "public"."webinar_role" AS ENUM('host', 'co_host', 'panelist', 'attendee');--> statement-breakpoint
CREATE TABLE "ai_feedback" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"response_id" text,
	"response_type" text,
	"rating" boolean NOT NULL,
	"comment" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ai_memory" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "competitor_alerts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"watchlist_id" varchar NOT NULL,
	"alert_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"data" jsonb,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "competitor_content_ideas" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"source_post_id" varchar,
	"competitor_handle" varchar NOT NULL,
	"topic" text NOT NULL,
	"hook" text NOT NULL,
	"format" varchar DEFAULT 'reel' NOT NULL,
	"structure" text,
	"cta" text,
	"rationale" text,
	"status" varchar DEFAULT 'idea' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "competitor_detected_posts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"watchlist_id" varchar NOT NULL,
	"handle" varchar NOT NULL,
	"post_url" text NOT NULL,
	"short_code" varchar,
	"caption" text,
	"views" integer DEFAULT 0,
	"likes" integer DEFAULT 0,
	"comments" integer DEFAULT 0,
	"post_type" varchar DEFAULT 'reel' NOT NULL,
	"thumbnail" text,
	"posted_at" timestamp,
	"detected_at" timestamp DEFAULT now(),
	"ai_analysis" jsonb,
	"ideas_generated" boolean DEFAULT false NOT NULL,
	"is_seen" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "competitor_snapshots" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"watchlist_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"scanned_at" timestamp DEFAULT now(),
	"follower_count" integer,
	"following_count" integer,
	"post_count" integer,
	"avg_views" real,
	"avg_likes" real,
	"avg_comments" real,
	"avg_engagement" real,
	"bio" text,
	"recent_posts" jsonb
);
--> statement-breakpoint
CREATE TABLE "competitor_watchlist" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"competitor_url" text NOT NULL,
	"handle" varchar NOT NULL,
	"display_name" text,
	"avatar_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_scanned_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "crm_activities" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" varchar,
	"opportunity_id" varchar,
	"user_id" varchar,
	"type" "crm_activity_type" NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"occurred_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "crm_api_keys" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"key_hash" text NOT NULL,
	"key_prefix" text NOT NULL,
	"scopes" jsonb DEFAULT '["contacts:write"]'::jsonb NOT NULL,
	"default_tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"default_source" text,
	"allowed_origins" text DEFAULT '*',
	"rate_limit_per_min" integer DEFAULT 60 NOT NULL,
	"owner_id" varchar,
	"last_used_at" timestamp,
	"last_used_ip" text,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp,
	"revoked_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "crm_api_keys_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE "crm_contacts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" varchar,
	"first_name" text,
	"last_name" text,
	"email" text,
	"phone" text,
	"company" text,
	"title" text,
	"source" text DEFAULT 'manual',
	"status" "crm_contact_status" DEFAULT 'lead' NOT NULL,
	"lifecycle_stage" text DEFAULT 'subscriber',
	"city" text,
	"country" text,
	"timezone" text,
	"instagram" text,
	"youtube" text,
	"linkedin" text,
	"twitter" text,
	"website" text,
	"score" integer DEFAULT 0 NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"custom_fields" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"notes" text,
	"user_id" varchar,
	"last_contacted_at" timestamp,
	"do_not_contact" boolean DEFAULT false NOT NULL,
	"archived_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "crm_opportunities" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pipeline_id" varchar NOT NULL,
	"stage_id" varchar NOT NULL,
	"contact_id" varchar,
	"owner_id" varchar,
	"title" text NOT NULL,
	"description" text,
	"value_cents" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"status" "crm_opportunity_status" DEFAULT 'open' NOT NULL,
	"expected_close_date" timestamp,
	"closed_at" timestamp,
	"position" integer DEFAULT 0 NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"custom_fields" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "crm_pipeline_stages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pipeline_id" varchar NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT '#d4b461',
	"position" integer DEFAULT 0 NOT NULL,
	"probability" integer DEFAULT 0 NOT NULL,
	"is_won" boolean DEFAULT false NOT NULL,
	"is_lost" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "crm_pipelines" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"color" text DEFAULT '#d4b461',
	"is_default" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "crm_smart_lists" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"filters" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"owner_id" varchar,
	"pinned" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "crm_tags" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT '#d4b461',
	"description" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "crm_tags_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "crm_tasks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" varchar,
	"opportunity_id" varchar,
	"assignee_id" varchar,
	"title" text NOT NULL,
	"description" text,
	"status" "crm_task_status" DEFAULT 'open' NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"due_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dialer_ai_call_quota" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"calls_used" integer DEFAULT 0 NOT NULL,
	"bonus_calls_balance" integer DEFAULT 0 NOT NULL,
	"period_month" text DEFAULT '' NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "dialer_ai_call_quota_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "dialer_ai_call_results" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"campaign_id" varchar,
	"lead_id" varchar,
	"lead_name" text NOT NULL,
	"lead_phone" text NOT NULL,
	"provider" text NOT NULL,
	"provider_call_id" text,
	"status" text DEFAULT 'initiated' NOT NULL,
	"outcome" text,
	"duration_seconds" integer,
	"transcript" text,
	"summary" text,
	"sentiment" text,
	"appointment_booked" boolean DEFAULT false NOT NULL,
	"appointment_time" text,
	"hot_lead" boolean DEFAULT false NOT NULL,
	"needs_human_followup" boolean DEFAULT false NOT NULL,
	"recording_url" text,
	"key_points" jsonb DEFAULT '[]'::jsonb,
	"objections" jsonb DEFAULT '[]'::jsonb,
	"direction" text DEFAULT 'outbound' NOT NULL,
	"started_at" timestamp DEFAULT now(),
	"ended_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "dialer_ai_campaigns" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"name" text NOT NULL,
	"provider" text DEFAULT 'vapi' NOT NULL,
	"system_prompt" text,
	"first_message" text,
	"objective" text DEFAULT 'book_meeting' NOT NULL,
	"source_webinar_id" varchar,
	"source_webinar_title" text,
	"max_calls_per_hour" integer DEFAULT 10 NOT NULL,
	"concurrent_calls" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"total_leads" integer DEFAULT 0 NOT NULL,
	"called_count" integer DEFAULT 0 NOT NULL,
	"answered_count" integer DEFAULT 0 NOT NULL,
	"booked_count" integer DEFAULT 0 NOT NULL,
	"not_interested_count" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dialer_cadence_enrollments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cadence_id" varchar NOT NULL,
	"lead_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"current_step_index" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"next_run_at" timestamp,
	"enrolled_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dialer_cadence_steps" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cadence_id" varchar NOT NULL,
	"step_order" integer DEFAULT 0 NOT NULL,
	"delay_hours" integer DEFAULT 0 NOT NULL,
	"action" text NOT NULL,
	"template" text,
	"ai_personalize" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dialer_cadences" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"name" text NOT NULL,
	"trigger_outcome" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dialer_call_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"lead_id" varchar,
	"lead_name" text NOT NULL,
	"lead_phone" text NOT NULL,
	"twilio_call_sid" text,
	"duration_seconds" integer DEFAULT 0 NOT NULL,
	"outcome" text DEFAULT 'no_answer' NOT NULL,
	"notes" text,
	"script_used" text,
	"recording_url" text,
	"started_at" timestamp DEFAULT now(),
	"ended_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "dialer_callbacks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"lead_id" varchar,
	"lead_name" text NOT NULL,
	"lead_phone" text NOT NULL,
	"scheduled_for" timestamp NOT NULL,
	"notes" text,
	"status" text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dialer_goals" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"daily_call_target" integer DEFAULT 50 NOT NULL,
	"daily_sms_target" integer DEFAULT 20 NOT NULL,
	"daily_booking_target" integer DEFAULT 5 NOT NULL,
	"weekly_call_target" integer DEFAULT 250 NOT NULL,
	"streak_days" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dialer_leads" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"company" text,
	"notes" text,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"source_type" text DEFAULT 'manual' NOT NULL,
	"source_webinar_id" varchar,
	"source_webinar_title" text,
	"engagement_score" integer DEFAULT 0 NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"webinar_behavior" jsonb,
	"status" text DEFAULT 'pending' NOT NULL,
	"last_call_at" timestamp,
	"call_count" integer DEFAULT 0 NOT NULL,
	"next_call_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dialer_local_numbers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"phone_number" text NOT NULL,
	"area_code" text NOT NULL,
	"state" text,
	"city" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dialer_objections" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"objection" text NOT NULL,
	"response" text,
	"category" text DEFAULT 'other' NOT NULL,
	"occurrence_count" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dialer_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"twilio_account_sid" text,
	"twilio_auth_token" text,
	"twilio_phone_number" text,
	"twilio_twiml_app_sid" text,
	"default_script" text,
	"sms_template" text,
	"record_calls" boolean DEFAULT true NOT NULL,
	"ai_provider" text DEFAULT 'retell' NOT NULL,
	"vapi_api_key" text,
	"vapi_assistant_id" text,
	"bland_api_key" text,
	"bland_voice_id" text,
	"retell_api_key" text,
	"retell_agent_id" text,
	"ai_system_prompt" text,
	"open_ai_api_key" text,
	"inbound_agent_enabled" boolean DEFAULT false NOT NULL,
	"inbound_agent_id" text,
	"auto_sms_enabled" boolean DEFAULT false NOT NULL,
	"auto_sms_booked_template" text,
	"auto_sms_no_answer_template" text,
	"auto_sms_hot_lead_template" text,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dialer_sms_conversations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"lead_id" varchar,
	"lead_name" text NOT NULL,
	"lead_phone" text NOT NULL,
	"last_message" text,
	"last_message_at" timestamp DEFAULT now(),
	"unread_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dialer_sms_messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" varchar NOT NULL,
	"direction" text NOT NULL,
	"body" text NOT NULL,
	"twilio_sid" text,
	"status" text DEFAULT 'sent' NOT NULL,
	"sent_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dialer_timeline_events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"lead_id" varchar NOT NULL,
	"event_type" text NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"metadata" jsonb,
	"occurred_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dialer_voicemails" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"name" text NOT NULL,
	"recording_url" text NOT NULL,
	"duration_seconds" integer DEFAULT 0 NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "em_contacts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"email" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"phone" text,
	"tags" text[],
	"custom_fields" jsonb,
	"subscribed" boolean DEFAULT true NOT NULL,
	"unsubscribed_at" timestamp,
	"source" text,
	"score" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "em_sends" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"step_id" varchar NOT NULL,
	"contact_id" varchar NOT NULL,
	"sequence_id" varchar NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"tracking_id" text,
	"sent_at" timestamp,
	"opened_at" timestamp,
	"clicked_at" timestamp,
	"bounced_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "em_sends_tracking_id_unique" UNIQUE("tracking_id")
);
--> statement-breakpoint
CREATE TABLE "em_sequences" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'nurture' NOT NULL,
	"description" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"from_name" text,
	"from_email" text,
	"reply_to" text,
	"tags" text[],
	"ai_generated" boolean DEFAULT false NOT NULL,
	"total_enrolled" integer DEFAULT 0 NOT NULL,
	"total_sent" integer DEFAULT 0 NOT NULL,
	"total_opened" integer DEFAULT 0 NOT NULL,
	"total_clicked" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "em_smtp_configs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"provider" text DEFAULT 'custom' NOT NULL,
	"host" text,
	"port" integer DEFAULT 587,
	"secure" boolean DEFAULT false,
	"username" text,
	"password" text,
	"from_name" text,
	"from_email" text,
	"reply_to" text,
	"is_verified" boolean DEFAULT false NOT NULL,
	"daily_send_limit" integer DEFAULT 500 NOT NULL,
	"warming_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "em_smtp_configs_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "em_steps" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sequence_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"step_number" integer DEFAULT 1 NOT NULL,
	"delay_days" integer DEFAULT 0 NOT NULL,
	"delay_hours" integer DEFAULT 0 NOT NULL,
	"subject" text NOT NULL,
	"preview_text" text,
	"body_html" text NOT NULL,
	"body_text" text,
	"send_time_optimized" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "em_workflows" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"nodes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"trigger_type" text DEFAULT 'manual' NOT NULL,
	"trigger_value" text,
	"enrolled_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "recording_comments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"video_event_id" varchar NOT NULL,
	"user_id" varchar,
	"user_name" text NOT NULL,
	"text" text DEFAULT '',
	"emoji" text,
	"timestamp" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "recording_sequences" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"name" text NOT NULL,
	"transition" text DEFAULT 'fade' NOT NULL,
	"clip_ids" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "routing_form_fields" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"form_id" varchar NOT NULL,
	"label" text NOT NULL,
	"type" text DEFAULT 'text' NOT NULL,
	"options" text DEFAULT '[]',
	"required" boolean DEFAULT false NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "routing_form_rules" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"form_id" varchar NOT NULL,
	"field_id" varchar,
	"operator" text NOT NULL,
	"value" text NOT NULL,
	"action" text NOT NULL,
	"target_meeting_type_id" varchar,
	"message" text,
	"order_index" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "routing_forms" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"meeting_type_id" varchar,
	"title" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "scheduling_workflows" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"meeting_type_id" varchar,
	"name" text NOT NULL,
	"trigger" text NOT NULL,
	"trigger_offset_hours" integer DEFAULT 0,
	"action" text NOT NULL,
	"email_subject" text,
	"email_body" text,
	"webhook_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_activity_events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"event_type" text NOT NULL,
	"feature" text,
	"action" text,
	"metadata" jsonb,
	"session_id" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "video_ab_tests" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"name" text NOT NULL,
	"test_type" text DEFAULT 'video' NOT NULL,
	"video_a_id" varchar,
	"video_b_id" varchar,
	"variant_a_config" text,
	"variant_b_config" text,
	"split_ratio" integer DEFAULT 50 NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"plays_a" integer DEFAULT 0 NOT NULL,
	"plays_b" integer DEFAULT 0 NOT NULL,
	"conversions_a" integer DEFAULT 0 NOT NULL,
	"conversions_b" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"ended_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "video_channel_episodes" (
	"id" serial PRIMARY KEY NOT NULL,
	"channel_id" varchar NOT NULL,
	"video_event_id" varchar NOT NULL,
	"section" text DEFAULT 'Episodes',
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "video_channel_subscribers" (
	"id" serial PRIMARY KEY NOT NULL,
	"channel_id" varchar NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "video_channels" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"slug" text,
	"theme" text DEFAULT 'dark' NOT NULL,
	"accent_color" text DEFAULT '#d4b461',
	"cover_url" text,
	"logo_url" text,
	"subscribable" boolean DEFAULT true NOT NULL,
	"subscriber_count" integer DEFAULT 0 NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "video_channels_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "video_collab_comments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"video_event_id" varchar NOT NULL,
	"author_id" varchar,
	"author_name" text NOT NULL,
	"timestamp" integer,
	"text" text NOT NULL,
	"resolved" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "video_dubbing_jobs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"video_event_id" varchar NOT NULL,
	"language" text NOT NULL,
	"job_type" text DEFAULT 'dub' NOT NULL,
	"status" text DEFAULT 'processing' NOT NULL,
	"output_url" text,
	"error_message" text,
	"created_at" timestamp DEFAULT now(),
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "video_interactive_elements" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"video_event_id" varchar NOT NULL,
	"type" text NOT NULL,
	"timestamp" integer NOT NULL,
	"end_timestamp" integer,
	"text" text,
	"url" text,
	"require_email" boolean DEFAULT true,
	"require_name" boolean DEFAULT false,
	"skip_allowed" boolean DEFAULT false,
	"cta_type" text,
	"cta_text" text,
	"cta_button_text" text,
	"cta_button_url" text,
	"cta_image_url" text,
	"cta_html" text,
	"cta_position" text DEFAULT 'center',
	"impressions" integer DEFAULT 0 NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "webinar_attendee_scores" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"webinar_id" varchar NOT NULL,
	"viewer_id" text NOT NULL,
	"viewer_name" text,
	"viewer_email" text,
	"watch_duration" integer DEFAULT 0 NOT NULL,
	"chat_messages" integer DEFAULT 0 NOT NULL,
	"questions_asked" integer DEFAULT 0 NOT NULL,
	"polls_voted" integer DEFAULT 0 NOT NULL,
	"reactions_count" integer DEFAULT 0 NOT NULL,
	"cta_clicks" integer DEFAULT 0 NOT NULL,
	"hand_raises" integer DEFAULT 0 NOT NULL,
	"engagement_score" real DEFAULT 0 NOT NULL,
	"attended_full_duration" boolean DEFAULT false NOT NULL,
	"joined_at" timestamp,
	"left_at" timestamp,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "webinar_backstage_messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"webinar_id" varchar NOT NULL,
	"sender_name" text NOT NULL,
	"sender_role" text DEFAULT 'host' NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "webinar_breakout_participants" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" varchar NOT NULL,
	"viewer_id" text NOT NULL,
	"viewer_name" text NOT NULL,
	"joined_at" timestamp DEFAULT now(),
	"left_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "webinar_breakout_rooms" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"webinar_id" varchar NOT NULL,
	"name" text NOT NULL,
	"topic" text,
	"max_participants" integer,
	"assignment_type" text DEFAULT 'manual' NOT NULL,
	"is_open" boolean DEFAULT false NOT NULL,
	"duration" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "webinar_captions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"webinar_id" varchar NOT NULL,
	"text" text NOT NULL,
	"speaker_name" text,
	"language" text DEFAULT 'en' NOT NULL,
	"start_time" real NOT NULL,
	"end_time" real,
	"is_final" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "webinar_email_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"webinar_email_id" varchar NOT NULL,
	"recipient_email" text NOT NULL,
	"recipient_name" text,
	"sent_at" timestamp DEFAULT now(),
	"opened_at" timestamp,
	"clicked_at" timestamp,
	"bounced" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webinar_emails" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"webinar_id" varchar NOT NULL,
	"type" text NOT NULL,
	"subject" text NOT NULL,
	"body_html" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"send_at" timestamp,
	"sent_count" integer DEFAULT 0 NOT NULL,
	"open_count" integer DEFAULT 0 NOT NULL,
	"click_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "webinar_panelists" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"webinar_id" varchar NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"role" "webinar_role" DEFAULT 'panelist' NOT NULL,
	"user_id" varchar,
	"invite_token" text NOT NULL,
	"status" text DEFAULT 'invited' NOT NULL,
	"can_share_screen" boolean DEFAULT true NOT NULL,
	"can_chat" boolean DEFAULT true NOT NULL,
	"can_manage_polls" boolean DEFAULT false NOT NULL,
	"can_mute_others" boolean DEFAULT false NOT NULL,
	"can_remove_attendees" boolean DEFAULT false NOT NULL,
	"avatar_url" text,
	"joined_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "webinar_panelists_invite_token_unique" UNIQUE("invite_token")
);
--> statement-breakpoint
CREATE TABLE "webinar_practice_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"webinar_id" varchar NOT NULL,
	"started_by" varchar NOT NULL,
	"started_at" timestamp DEFAULT now(),
	"ended_at" timestamp,
	"notes" text,
	"participants" jsonb DEFAULT '[]'::jsonb
);
--> statement-breakpoint
CREATE TABLE "webinar_resources" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"webinar_id" varchar NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"type" text DEFAULT 'link' NOT NULL,
	"pushed_at" timestamp,
	"download_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "webinar_stream_destinations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"webinar_id" varchar NOT NULL,
	"platform" text NOT NULL,
	"rtmp_url" text NOT NULL,
	"stream_key" text NOT NULL,
	"label" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "webinar_survey_responses" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"survey_id" varchar NOT NULL,
	"viewer_id" text NOT NULL,
	"viewer_name" text,
	"viewer_email" text,
	"answers" jsonb NOT NULL,
	"rating" integer,
	"submitted_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "webinar_surveys" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"webinar_id" varchar NOT NULL,
	"title" text DEFAULT 'How was the webinar?' NOT NULL,
	"questions" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "webinar_templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"config" jsonb NOT NULL,
	"thumbnail_url" text,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "webinar_transcripts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"webinar_id" varchar NOT NULL,
	"full_text" text NOT NULL,
	"segments" jsonb,
	"language" text DEFAULT 'en' NOT NULL,
	"generated_at" timestamp DEFAULT now(),
	CONSTRAINT "webinar_transcripts_webinar_id_unique" UNIQUE("webinar_id")
);
--> statement-breakpoint
ALTER TABLE "meeting_types" ADD COLUMN "user_id" varchar;--> statement-breakpoint
ALTER TABLE "meeting_types" ADD COLUMN "buffer_after" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "meeting_types" ADD COLUMN "custom_fields" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "meeting_types" ADD COLUMN "conditional_logic" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "meeting_types" ADD COLUMN "allow_file_upload" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "meeting_types" ADD COLUMN "max_file_size" integer DEFAULT 5;--> statement-breakpoint
ALTER TABLE "meeting_types" ADD COLUMN "accepted_file_types" text DEFAULT 'image/*,application/pdf';--> statement-breakpoint
ALTER TABLE "meeting_types" ADD COLUMN "require_payment" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "meeting_types" ADD COLUMN "payment_amount" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "meeting_types" ADD COLUMN "payment_currency" text DEFAULT 'USD';--> statement-breakpoint
ALTER TABLE "meeting_types" ADD COLUMN "stripe_payment_link_id" text;--> statement-breakpoint
ALTER TABLE "meeting_types" ADD COLUMN "min_notice_hours" integer DEFAULT 24 NOT NULL;--> statement-breakpoint
ALTER TABLE "meeting_types" ADD COLUMN "max_booking_days" integer DEFAULT 60 NOT NULL;--> statement-breakpoint
ALTER TABLE "meeting_types" ADD COLUMN "slot_interval" integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE "meeting_types" ADD COLUMN "team_members" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "meeting_types" ADD COLUMN "round_robin_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "meeting_types" ADD COLUMN "require_approval" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "meeting_types" ADD COLUMN "branding_config" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "meeting_types" ADD COLUMN "redirect_url" text;--> statement-breakpoint
ALTER TABLE "meeting_types" ADD COLUMN "confirmation_message" text;--> statement-breakpoint
ALTER TABLE "meeting_types" ADD COLUMN "scheduling_config" text;--> statement-breakpoint
ALTER TABLE "scheduled_bookings" ADD COLUMN "user_id" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "scheduled_bookings" ADD COLUMN "assigned_team_member_id" varchar;--> statement-breakpoint
ALTER TABLE "scheduled_bookings" ADD COLUMN "client_phone" text;--> statement-breakpoint
ALTER TABLE "scheduled_bookings" ADD COLUMN "client_timezone" text DEFAULT 'UTC';--> statement-breakpoint
ALTER TABLE "scheduled_bookings" ADD COLUMN "title" text;--> statement-breakpoint
ALTER TABLE "scheduled_bookings" ADD COLUMN "duration_minutes" integer;--> statement-breakpoint
ALTER TABLE "scheduled_bookings" ADD COLUMN "custom_answers" text;--> statement-breakpoint
ALTER TABLE "scheduled_bookings" ADD COLUMN "uploaded_files" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "scheduled_bookings" ADD COLUMN "payment_status" text DEFAULT 'unpaid';--> statement-breakpoint
ALTER TABLE "scheduled_bookings" ADD COLUMN "payment_intent_id" text;--> statement-breakpoint
ALTER TABLE "scheduled_bookings" ADD COLUMN "cancel_reason" text;--> statement-breakpoint
ALTER TABLE "scheduled_bookings" ADD COLUMN "cancelled_at" timestamp;--> statement-breakpoint
ALTER TABLE "scheduled_bookings" ADD COLUMN "rescheduled_from" varchar;--> statement-breakpoint
ALTER TABLE "scheduled_bookings" ADD COLUMN "rescheduled_to" varchar;--> statement-breakpoint
ALTER TABLE "scheduled_bookings" ADD COLUMN "follow_up_sent" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "scheduled_bookings" ADD COLUMN "no_show_recorded" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "video_events" ADD COLUMN "approval_status" text DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "video_events" ADD COLUMN "animated_thumbnail_url" text;--> statement-breakpoint
ALTER TABLE "video_events" ADD COLUMN "seo_title" text;--> statement-breakpoint
ALTER TABLE "video_events" ADD COLUMN "seo_description" text;--> statement-breakpoint
ALTER TABLE "video_events" ADD COLUMN "edit_metadata" text;--> statement-breakpoint
ALTER TABLE "video_events" ADD COLUMN "end_screen_config" text;--> statement-breakpoint
ALTER TABLE "video_events" ADD COLUMN "social_share_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_feedback" ADD CONSTRAINT "ai_feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_memory" ADD CONSTRAINT "ai_memory_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competitor_alerts" ADD CONSTRAINT "competitor_alerts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competitor_alerts" ADD CONSTRAINT "competitor_alerts_watchlist_id_competitor_watchlist_id_fk" FOREIGN KEY ("watchlist_id") REFERENCES "public"."competitor_watchlist"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competitor_content_ideas" ADD CONSTRAINT "competitor_content_ideas_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competitor_content_ideas" ADD CONSTRAINT "competitor_content_ideas_source_post_id_competitor_detected_posts_id_fk" FOREIGN KEY ("source_post_id") REFERENCES "public"."competitor_detected_posts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competitor_detected_posts" ADD CONSTRAINT "competitor_detected_posts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competitor_detected_posts" ADD CONSTRAINT "competitor_detected_posts_watchlist_id_competitor_watchlist_id_fk" FOREIGN KEY ("watchlist_id") REFERENCES "public"."competitor_watchlist"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competitor_snapshots" ADD CONSTRAINT "competitor_snapshots_watchlist_id_competitor_watchlist_id_fk" FOREIGN KEY ("watchlist_id") REFERENCES "public"."competitor_watchlist"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competitor_snapshots" ADD CONSTRAINT "competitor_snapshots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competitor_watchlist" ADD CONSTRAINT "competitor_watchlist_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_contact_id_crm_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."crm_contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_opportunity_id_crm_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."crm_opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_api_keys" ADD CONSTRAINT "crm_api_keys_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_contacts" ADD CONSTRAINT "crm_contacts_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_contacts" ADD CONSTRAINT "crm_contacts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_opportunities" ADD CONSTRAINT "crm_opportunities_pipeline_id_crm_pipelines_id_fk" FOREIGN KEY ("pipeline_id") REFERENCES "public"."crm_pipelines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_opportunities" ADD CONSTRAINT "crm_opportunities_stage_id_crm_pipeline_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."crm_pipeline_stages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_opportunities" ADD CONSTRAINT "crm_opportunities_contact_id_crm_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."crm_contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_opportunities" ADD CONSTRAINT "crm_opportunities_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_pipeline_stages" ADD CONSTRAINT "crm_pipeline_stages_pipeline_id_crm_pipelines_id_fk" FOREIGN KEY ("pipeline_id") REFERENCES "public"."crm_pipelines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_smart_lists" ADD CONSTRAINT "crm_smart_lists_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_tasks" ADD CONSTRAINT "crm_tasks_contact_id_crm_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."crm_contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_tasks" ADD CONSTRAINT "crm_tasks_opportunity_id_crm_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."crm_opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_tasks" ADD CONSTRAINT "crm_tasks_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dialer_ai_call_quota" ADD CONSTRAINT "dialer_ai_call_quota_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dialer_ai_call_results" ADD CONSTRAINT "dialer_ai_call_results_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dialer_ai_campaigns" ADD CONSTRAINT "dialer_ai_campaigns_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dialer_cadence_enrollments" ADD CONSTRAINT "dialer_cadence_enrollments_cadence_id_dialer_cadences_id_fk" FOREIGN KEY ("cadence_id") REFERENCES "public"."dialer_cadences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dialer_cadence_enrollments" ADD CONSTRAINT "dialer_cadence_enrollments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dialer_cadence_steps" ADD CONSTRAINT "dialer_cadence_steps_cadence_id_dialer_cadences_id_fk" FOREIGN KEY ("cadence_id") REFERENCES "public"."dialer_cadences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dialer_cadences" ADD CONSTRAINT "dialer_cadences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dialer_call_logs" ADD CONSTRAINT "dialer_call_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dialer_callbacks" ADD CONSTRAINT "dialer_callbacks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dialer_goals" ADD CONSTRAINT "dialer_goals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dialer_leads" ADD CONSTRAINT "dialer_leads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dialer_local_numbers" ADD CONSTRAINT "dialer_local_numbers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dialer_objections" ADD CONSTRAINT "dialer_objections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dialer_settings" ADD CONSTRAINT "dialer_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dialer_sms_conversations" ADD CONSTRAINT "dialer_sms_conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dialer_sms_messages" ADD CONSTRAINT "dialer_sms_messages_conversation_id_dialer_sms_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."dialer_sms_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dialer_timeline_events" ADD CONSTRAINT "dialer_timeline_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dialer_voicemails" ADD CONSTRAINT "dialer_voicemails_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "em_contacts" ADD CONSTRAINT "em_contacts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "em_sends" ADD CONSTRAINT "em_sends_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "em_sends" ADD CONSTRAINT "em_sends_step_id_em_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."em_steps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "em_sends" ADD CONSTRAINT "em_sends_contact_id_em_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."em_contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "em_sends" ADD CONSTRAINT "em_sends_sequence_id_em_sequences_id_fk" FOREIGN KEY ("sequence_id") REFERENCES "public"."em_sequences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "em_sequences" ADD CONSTRAINT "em_sequences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "em_smtp_configs" ADD CONSTRAINT "em_smtp_configs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "em_steps" ADD CONSTRAINT "em_steps_sequence_id_em_sequences_id_fk" FOREIGN KEY ("sequence_id") REFERENCES "public"."em_sequences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "em_steps" ADD CONSTRAINT "em_steps_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "em_workflows" ADD CONSTRAINT "em_workflows_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recording_comments" ADD CONSTRAINT "recording_comments_video_event_id_video_events_id_fk" FOREIGN KEY ("video_event_id") REFERENCES "public"."video_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recording_comments" ADD CONSTRAINT "recording_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recording_sequences" ADD CONSTRAINT "recording_sequences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routing_form_fields" ADD CONSTRAINT "routing_form_fields_form_id_routing_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."routing_forms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routing_form_rules" ADD CONSTRAINT "routing_form_rules_form_id_routing_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."routing_forms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routing_form_rules" ADD CONSTRAINT "routing_form_rules_field_id_routing_form_fields_id_fk" FOREIGN KEY ("field_id") REFERENCES "public"."routing_form_fields"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routing_form_rules" ADD CONSTRAINT "routing_form_rules_target_meeting_type_id_meeting_types_id_fk" FOREIGN KEY ("target_meeting_type_id") REFERENCES "public"."meeting_types"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routing_forms" ADD CONSTRAINT "routing_forms_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routing_forms" ADD CONSTRAINT "routing_forms_meeting_type_id_meeting_types_id_fk" FOREIGN KEY ("meeting_type_id") REFERENCES "public"."meeting_types"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduling_workflows" ADD CONSTRAINT "scheduling_workflows_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduling_workflows" ADD CONSTRAINT "scheduling_workflows_meeting_type_id_meeting_types_id_fk" FOREIGN KEY ("meeting_type_id") REFERENCES "public"."meeting_types"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_activity_events" ADD CONSTRAINT "user_activity_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_ab_tests" ADD CONSTRAINT "video_ab_tests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_ab_tests" ADD CONSTRAINT "video_ab_tests_video_a_id_video_events_id_fk" FOREIGN KEY ("video_a_id") REFERENCES "public"."video_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_ab_tests" ADD CONSTRAINT "video_ab_tests_video_b_id_video_events_id_fk" FOREIGN KEY ("video_b_id") REFERENCES "public"."video_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_channel_episodes" ADD CONSTRAINT "video_channel_episodes_channel_id_video_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."video_channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_channel_episodes" ADD CONSTRAINT "video_channel_episodes_video_event_id_video_events_id_fk" FOREIGN KEY ("video_event_id") REFERENCES "public"."video_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_channel_subscribers" ADD CONSTRAINT "video_channel_subscribers_channel_id_video_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."video_channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_channels" ADD CONSTRAINT "video_channels_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_collab_comments" ADD CONSTRAINT "video_collab_comments_video_event_id_video_events_id_fk" FOREIGN KEY ("video_event_id") REFERENCES "public"."video_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_collab_comments" ADD CONSTRAINT "video_collab_comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_dubbing_jobs" ADD CONSTRAINT "video_dubbing_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_dubbing_jobs" ADD CONSTRAINT "video_dubbing_jobs_video_event_id_video_events_id_fk" FOREIGN KEY ("video_event_id") REFERENCES "public"."video_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_interactive_elements" ADD CONSTRAINT "video_interactive_elements_video_event_id_video_events_id_fk" FOREIGN KEY ("video_event_id") REFERENCES "public"."video_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webinar_attendee_scores" ADD CONSTRAINT "webinar_attendee_scores_webinar_id_webinars_id_fk" FOREIGN KEY ("webinar_id") REFERENCES "public"."webinars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webinar_backstage_messages" ADD CONSTRAINT "webinar_backstage_messages_webinar_id_webinars_id_fk" FOREIGN KEY ("webinar_id") REFERENCES "public"."webinars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webinar_breakout_participants" ADD CONSTRAINT "webinar_breakout_participants_room_id_webinar_breakout_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."webinar_breakout_rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webinar_breakout_rooms" ADD CONSTRAINT "webinar_breakout_rooms_webinar_id_webinars_id_fk" FOREIGN KEY ("webinar_id") REFERENCES "public"."webinars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webinar_captions" ADD CONSTRAINT "webinar_captions_webinar_id_webinars_id_fk" FOREIGN KEY ("webinar_id") REFERENCES "public"."webinars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webinar_email_logs" ADD CONSTRAINT "webinar_email_logs_webinar_email_id_webinar_emails_id_fk" FOREIGN KEY ("webinar_email_id") REFERENCES "public"."webinar_emails"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webinar_emails" ADD CONSTRAINT "webinar_emails_webinar_id_webinars_id_fk" FOREIGN KEY ("webinar_id") REFERENCES "public"."webinars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webinar_panelists" ADD CONSTRAINT "webinar_panelists_webinar_id_webinars_id_fk" FOREIGN KEY ("webinar_id") REFERENCES "public"."webinars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webinar_panelists" ADD CONSTRAINT "webinar_panelists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webinar_practice_sessions" ADD CONSTRAINT "webinar_practice_sessions_webinar_id_webinars_id_fk" FOREIGN KEY ("webinar_id") REFERENCES "public"."webinars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webinar_resources" ADD CONSTRAINT "webinar_resources_webinar_id_webinars_id_fk" FOREIGN KEY ("webinar_id") REFERENCES "public"."webinars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webinar_stream_destinations" ADD CONSTRAINT "webinar_stream_destinations_webinar_id_webinars_id_fk" FOREIGN KEY ("webinar_id") REFERENCES "public"."webinars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webinar_survey_responses" ADD CONSTRAINT "webinar_survey_responses_survey_id_webinar_surveys_id_fk" FOREIGN KEY ("survey_id") REFERENCES "public"."webinar_surveys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webinar_surveys" ADD CONSTRAINT "webinar_surveys_webinar_id_webinars_id_fk" FOREIGN KEY ("webinar_id") REFERENCES "public"."webinars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webinar_templates" ADD CONSTRAINT "webinar_templates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webinar_transcripts" ADD CONSTRAINT "webinar_transcripts_webinar_id_webinars_id_fk" FOREIGN KEY ("webinar_id") REFERENCES "public"."webinars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_types" ADD CONSTRAINT "meeting_types_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_bookings" ADD CONSTRAINT "scheduled_bookings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_bookings" ADD CONSTRAINT "scheduled_bookings_assigned_team_member_id_users_id_fk" FOREIGN KEY ("assigned_team_member_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;