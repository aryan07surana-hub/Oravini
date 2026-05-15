CREATE TYPE "public"."content_type" AS ENUM('reel', 'carousel', 'story', 'video', 'post');--> statement-breakpoint
CREATE TYPE "public"."doc_type" AS ENUM('recording', 'summary', 'audit', 'strategy', 'worksheet', 'contract', 'material', 'other');--> statement-breakpoint
CREATE TYPE "public"."funnel_stage" AS ENUM('top', 'middle', 'bottom');--> statement-breakpoint
CREATE TYPE "public"."hook_type" AS ENUM('curiosity', 'authority', 'storytelling', 'controversy', 'pain_point', 'education', 'proof', 'question');--> statement-breakpoint
CREATE TYPE "public"."plan" AS ENUM('free', 'starter', 'growth', 'pro', 'elite');--> statement-breakpoint
CREATE TYPE "public"."platform" AS ENUM('instagram', 'youtube');--> statement-breakpoint
CREATE TYPE "public"."reading_difficulty" AS ENUM('beginner', 'intermediate', 'advanced', 'elite');--> statement-breakpoint
CREATE TYPE "public"."reading_priority" AS ENUM('low', 'medium', 'high', 'must_read');--> statement-breakpoint
CREATE TYPE "public"."reading_status" AS ENUM('unread', 'reading', 'completed');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('admin', 'client');--> statement-breakpoint
CREATE TYPE "public"."session_tier" AS ENUM('free', 'starter', 'growth', 'pro', 'elite');--> statement-breakpoint
CREATE TYPE "public"."session_type" AS ENUM('recording', 'live_qa', 'workshop', 'masterclass');--> statement-breakpoint
CREATE TYPE "public"."webinar_status" AS ENUM('upcoming', 'live', 'completed', 'cancelled');--> statement-breakpoint
CREATE TABLE "ai_bot_configs" (
	"user_id" varchar PRIMARY KEY NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"personality" text DEFAULT 'friendly' NOT NULL,
	"instructions" text,
	"fallback_message" text,
	"keywords_only" boolean DEFAULT false NOT NULL,
	"keywords" text[],
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ai_idea_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"platform" text NOT NULL,
	"niche" text NOT NULL,
	"content_type" text,
	"goal" text,
	"ideas_count" integer DEFAULT 6,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ai_session_history" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"tool" text NOT NULL,
	"title" text,
	"inputs" jsonb,
	"output" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "app_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "availability_overrides" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meeting_type_id" varchar NOT NULL,
	"date" text NOT NULL,
	"type" text DEFAULT 'unavailable' NOT NULL,
	"time_blocks" text DEFAULT '[]',
	"reason" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "availability_rules" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meeting_type_id" varchar NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brand_voice_profiles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"tone" text NOT NULL,
	"vocabulary" text[],
	"sentence_structure" text NOT NULL,
	"punctuation_style" text NOT NULL,
	"perspective" text NOT NULL,
	"unique_patterns" text[],
	"voice_fingerprint" text NOT NULL,
	"analyzed_posts_count" integer DEFAULT 0 NOT NULL,
	"last_analyzed_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "brand_voice_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "broll_clips" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"category" text DEFAULT 'General',
	"video_url" text,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "call_bookings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar,
	"invitee_name" text NOT NULL,
	"invitee_email" text NOT NULL,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"event_name" text,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"calendly_event_uri" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "call_feedback" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"title" text NOT NULL,
	"recording_url" text,
	"summary" text,
	"feedback_notes" text,
	"action_steps" text,
	"call_date" timestamp NOT NULL,
	"client_feedback" text,
	"client_learnings" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "comment_auto_replies" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"name" text NOT NULL,
	"keyword" text,
	"post_url" text,
	"reply_message" text NOT NULL,
	"also_dm" boolean DEFAULT false NOT NULL,
	"dm_message" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"trigger_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "competitor_analyses" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"client_url" text NOT NULL,
	"competitor_url" text NOT NULL,
	"client_handle" varchar,
	"competitor_handle" varchar,
	"report" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contact_custom_field_defs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"label" text NOT NULL,
	"field_key" text NOT NULL,
	"field_type" text DEFAULT 'text' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contact_custom_field_values" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" varchar NOT NULL,
	"field_def_id" varchar NOT NULL,
	"value" text,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "content_calendars" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"month" text NOT NULL,
	"niche" text NOT NULL,
	"platform" "platform" NOT NULL,
	"goal" text NOT NULL,
	"strategy" jsonb,
	"posts" jsonb,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "content_posts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"platform" "platform" NOT NULL,
	"content_type" "content_type" NOT NULL,
	"title" text,
	"post_url" text,
	"post_date" timestamp NOT NULL,
	"funnel_stage" "funnel_stage",
	"views" integer DEFAULT 0 NOT NULL,
	"likes" integer DEFAULT 0 NOT NULL,
	"comments" integer DEFAULT 0 NOT NULL,
	"saves" integer DEFAULT 0 NOT NULL,
	"shares" integer DEFAULT 0 NOT NULL,
	"content_style" text,
	"followers_gained" integer DEFAULT 0 NOT NULL,
	"subscribers_gained" integer DEFAULT 0 NOT NULL,
	"views_2w" integer,
	"likes_2w" integer,
	"comments_2w" integer,
	"saves_2w" integer,
	"shares_2w" integer,
	"followers_gained_2w" integer,
	"subscribers_gained_2w" integer,
	"views_4w" integer,
	"likes_4w" integer,
	"comments_4w" integer,
	"saves_4w" integer,
	"shares_4w" integer,
	"followers_gained_4w" integer,
	"subscribers_gained_4w" integer,
	"metrics_reminded" boolean DEFAULT false NOT NULL,
	"initial_synced_at" timestamp,
	"two_week_synced_at" timestamp,
	"four_week_synced_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "content_templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"funnel_stage" "funnel_stage" NOT NULL,
	"platform" "platform" NOT NULL,
	"content_type" "content_type" NOT NULL,
	"template" jsonb,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "conversation_notes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"ig_user_id" text NOT NULL,
	"note" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "credit_balances" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"monthly_credits" integer DEFAULT 20 NOT NULL,
	"bonus_credits" integer DEFAULT 0 NOT NULL,
	"last_reset_month" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "credit_balances_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "credit_transactions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"amount" integer NOT NULL,
	"type" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "daily_readings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL,
	"mode" text DEFAULT '15min' NOT NULL,
	"quick_read_title" text,
	"quick_read_content" text,
	"quick_read_source" text,
	"focus_read_title" text,
	"focus_read_content" text,
	"focus_read_source" text,
	"deep_read_title" text,
	"deep_read_content" text,
	"deep_read_source" text,
	"mental_model" text,
	"mental_model_explanation" text,
	"framework" text,
	"framework_explanation" text,
	"quote" text,
	"quote_author" text,
	"execution_task" text,
	"reflection_question" text,
	"challenge" text,
	"implementation" text,
	"why_today" text,
	"sources" text[],
	"knowledge_score" integer DEFAULT 0,
	"implemented" boolean DEFAULT false NOT NULL,
	"saved_for_later" boolean DEFAULT false NOT NULL,
	"skipped" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "deletion_surveys" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"user_name" text,
	"user_email" text,
	"user_plan" text,
	"reason" text NOT NULL,
	"duration" text NOT NULL,
	"rating" text NOT NULL,
	"favorite_feature" text NOT NULL,
	"would_return" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dm_click_events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"link_id" varchar NOT NULL,
	"lead_id" varchar,
	"clicked_at" timestamp DEFAULT now(),
	"ip_address" text
);
--> statement-breakpoint
CREATE TABLE "dm_click_links" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"original_url" text NOT NULL,
	"short_code" text NOT NULL,
	"label" text,
	"click_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "dm_click_links_short_code_unique" UNIQUE("short_code")
);
--> statement-breakpoint
CREATE TABLE "dm_contact_tags" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" varchar NOT NULL,
	"tag" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dm_flows" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"trigger_keyword" text,
	"nodes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"edges" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dm_funnel_events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"lead_id" varchar,
	"flow_id" varchar,
	"event_type" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dm_leads" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"name" text NOT NULL,
	"instagram_handle" varchar,
	"status" varchar DEFAULT 'new' NOT NULL,
	"notes" text,
	"last_contact_at" timestamp,
	"follow_up_date" timestamp,
	"source" varchar,
	"email" text,
	"phone" text,
	"lead_score" integer,
	"lead_score_reason" text,
	"is_opted_out" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dm_quick_replies" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dm_scheduled_broadcasts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"name" text NOT NULL,
	"message" text NOT NULL,
	"target_tag" text,
	"target_status" text,
	"scheduled_at" timestamp NOT NULL,
	"sent_at" timestamp,
	"recipient_count" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dm_sequence_enrollments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sequence_id" varchar NOT NULL,
	"lead_id" varchar NOT NULL,
	"recipient_ig_id" text NOT NULL,
	"current_step" integer DEFAULT 0 NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"next_send_at" timestamp,
	"enrolled_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dm_sequence_steps" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sequence_id" varchar NOT NULL,
	"step_order" integer DEFAULT 0 NOT NULL,
	"delay_days" integer DEFAULT 0 NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dm_sequences" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dm_triggers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"name" text NOT NULL,
	"keyword" text NOT NULL,
	"match_type" text DEFAULT 'contains' NOT NULL,
	"reply_message" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"trigger_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"uploaded_by" varchar NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"file_name" text NOT NULL,
	"file_size" text,
	"file_type" "doc_type" DEFAULT 'other' NOT NULL,
	"file_url" text NOT NULL,
	"mime_type" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "email_broadcasts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"subject" text NOT NULL,
	"body_html" text NOT NULL,
	"segment" text DEFAULT 'all' NOT NULL,
	"recipients_count" integer,
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "email_enrollments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"sequence_id" varchar NOT NULL,
	"current_step" integer DEFAULT 0 NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"unsubscribed" boolean DEFAULT false NOT NULL,
	"enrolled_at" timestamp DEFAULT now(),
	"next_send_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "email_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"to_email" text NOT NULL,
	"to_name" text,
	"subject" text NOT NULL,
	"sequence_email_id" varchar,
	"broadcast_id" varchar,
	"opened_at" timestamp,
	"sent_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "email_sequences" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"trigger" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "email_unsubscribes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"unsubscribed_at" timestamp DEFAULT now(),
	CONSTRAINT "email_unsubscribes_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "form_answers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" varchar NOT NULL,
	"question_id" varchar NOT NULL,
	"value" text
);
--> statement-breakpoint
CREATE TABLE "form_questions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"form_id" varchar NOT NULL,
	"type" text NOT NULL,
	"question" text NOT NULL,
	"options" jsonb,
	"required" boolean DEFAULT false NOT NULL,
	"order_idx" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "form_submissions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"form_id" varchar NOT NULL,
	"respondent_name" text,
	"respondent_email" text,
	"submitted_at" timestamp DEFAULT now(),
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "form_views" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"form_id" varchar NOT NULL,
	"viewed_at" timestamp DEFAULT now(),
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "forms" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"type" text DEFAULT 'form' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"slug" text NOT NULL,
	"settings" jsonb,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "forms_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "free_ai_usage" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identifier" text NOT NULL,
	"date" text NOT NULL,
	"count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "funnel_stage_training" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"funnel_stage" "funnel_stage" NOT NULL,
	"purpose" text NOT NULL,
	"content_types" text[] NOT NULL,
	"hook_types" text[] NOT NULL,
	"cta_types" text[] NOT NULL,
	"examples" jsonb,
	"best_practices" text[],
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "google_calendar_tokens" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text,
	"expires_at" timestamp,
	"connected_email" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "google_calendar_tokens_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "hook_library" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hook" text NOT NULL,
	"hook_type" "hook_type" NOT NULL,
	"platform" "platform" NOT NULL,
	"niche" text NOT NULL,
	"viral_score" real DEFAULT 0 NOT NULL,
	"avg_views" integer DEFAULT 0 NOT NULL,
	"avg_engagement" real DEFAULT 0 NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"source" text DEFAULT 'user_content' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ig_bot_campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"name" text NOT NULL,
	"post_urls" text[] DEFAULT '{}'::text[] NOT NULL,
	"comments" text[] DEFAULT '{}'::text[] NOT NULL,
	"status" text DEFAULT 'idle',
	"result_count" integer,
	"error_msg" text,
	"last_run_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ig_bot_cookies" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"cookies_json" text NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ig_follower_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"profile_id" integer NOT NULL,
	"followers_count" integer NOT NULL,
	"follows_count" integer NOT NULL,
	"scanned_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ig_tracked_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"username" text NOT NULL,
	"full_name" text,
	"profile_pic" text,
	"ig_user_id" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "income_goals" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"goal_amount" real NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"timeframe_months" integer DEFAULT 6 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "income_goals_client_id_unique" UNIQUE("client_id")
);
--> statement-breakpoint
CREATE TABLE "instagram_profile_reports" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"instagram_url" text NOT NULL,
	"handle" varchar,
	"post_count" integer DEFAULT 0,
	"report" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "landing_leads" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"source" text DEFAULT 'email_capture' NOT NULL,
	"creator_type" text,
	"platform" text,
	"biggest_challenge" text,
	"post_frequency" text,
	"monetization_goal" text,
	"niche" text,
	"target_audience" text,
	"goals" text,
	"instagram_url" text,
	"quiz_answers" jsonb,
	"monetization_report" jsonb,
	"audit_data" jsonb,
	"credits_claimed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "landing_leads_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "linkedin_tokens" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text,
	"expires_at" timestamp,
	"linkedin_user_id" text,
	"linkedin_name" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "meeting_types" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"duration" integer DEFAULT 30 NOT NULL,
	"color" text DEFAULT '#d4b461' NOT NULL,
	"location" text,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"buffer_time" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"custom_questions" text DEFAULT '[]',
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "meeting_types_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "meetings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"title" text NOT NULL,
	"meeting_date" timestamp,
	"duration" integer,
	"status" text DEFAULT 'processing' NOT NULL,
	"raw_transcript" text,
	"summary" text,
	"action_items" jsonb,
	"key_moments" jsonb,
	"participants" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sender_id" varchar NOT NULL,
	"receiver_id" varchar NOT NULL,
	"content" text NOT NULL,
	"file_url" text,
	"file_name" text,
	"file_mime" text,
	"read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "meta_tokens" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"access_token" text NOT NULL,
	"expires_at" timestamp,
	"scope" text,
	"ig_account_id" text,
	"ig_username" text,
	"fb_page_id" text,
	"fb_page_name" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "meta_tokens_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "niche_analyses" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"niche" varchar NOT NULL,
	"competitor_urls" text[] NOT NULL,
	"competitor_handles" text[],
	"report" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"message" text NOT NULL,
	"type" text DEFAULT 'reminder' NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"scheduled_for" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "onboarding_surveys" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"awareness" text,
	"field" text,
	"fields" text[],
	"struggles" text[],
	"content_types" text[],
	"descriptor" text,
	"experience" text,
	"follower_count" text,
	"monthly_revenue" text,
	"primary_goal" text,
	"platform" text,
	"platforms" text[],
	"heard_about" text[],
	"answers" jsonb,
	"completed_at" timestamp DEFAULT now(),
	CONSTRAINT "onboarding_surveys_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "opt_in_links" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"name" text NOT NULL,
	"ref_code" text NOT NULL,
	"welcome_message" text,
	"sequence_id" varchar,
	"click_count" integer DEFAULT 0 NOT NULL,
	"opt_in_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "opt_in_links_ref_code_unique" UNIQUE("ref_code")
);
--> statement-breakpoint
CREATE TABLE "otp_codes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"code" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "outbound_webhooks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"trigger_event" text NOT NULL,
	"trigger_value" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"fire_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "platform_training_data" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"platform" "platform" NOT NULL,
	"content_type" "content_type" NOT NULL,
	"pattern" text NOT NULL,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"examples" jsonb,
	"effectiveness" real DEFAULT 0 NOT NULL,
	"source" text DEFAULT 'admin_curated' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "progress" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"offer_creation" integer DEFAULT 0 NOT NULL,
	"funnel_progress" integer DEFAULT 0 NOT NULL,
	"content_progress" integer DEFAULT 0 NOT NULL,
	"monetization_progress" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "progress_client_id_unique" UNIQUE("client_id")
);
--> statement-breakpoint
CREATE TABLE "reading_highlights" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"material_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"excerpt" text NOT NULL,
	"page" integer,
	"note" text,
	"tag" text,
	"favorite" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "reading_materials" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"title" text NOT NULL,
	"author" text,
	"source" text,
	"category" text DEFAULT 'Books' NOT NULL,
	"summary" text,
	"key_takeaways" text[],
	"actionable_lessons" text[],
	"tags" text[],
	"difficulty" "reading_difficulty" DEFAULT 'intermediate' NOT NULL,
	"read_time_minutes" integer DEFAULT 10 NOT NULL,
	"priority" "reading_priority" DEFAULT 'medium' NOT NULL,
	"status" "reading_status" DEFAULT 'unread' NOT NULL,
	"file_url" text,
	"file_type" text,
	"favorite" boolean DEFAULT false NOT NULL,
	"must_read" boolean DEFAULT false NOT NULL,
	"ai_generated" boolean DEFAULT false NOT NULL,
	"last_reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "reading_streaks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"current_streak" integer DEFAULT 0 NOT NULL,
	"longest_streak" integer DEFAULT 0 NOT NULL,
	"last_read_date" timestamp,
	"total_days_read" integer DEFAULT 0 NOT NULL,
	"total_minutes_read" integer DEFAULT 0 NOT NULL,
	"books_completed" integer DEFAULT 0 NOT NULL,
	"lessons_implemented" integer DEFAULT 0 NOT NULL,
	"knowledge_score" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "reading_streaks_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "referral_clicks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "referral_codes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"code" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "referral_codes_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "referral_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "referral_conversions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"referrer_id" varchar NOT NULL,
	"referred_user_id" varchar,
	"referred_email" text,
	"registered" boolean DEFAULT true NOT NULL,
	"converted" boolean DEFAULT false NOT NULL,
	"credit_awarded" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"converted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "scheduled_bookings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meeting_type_id" varchar NOT NULL,
	"client_name" text NOT NULL,
	"client_email" text NOT NULL,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"notes" text,
	"meet_link" text,
	"reminder_24_sent" boolean DEFAULT false NOT NULL,
	"reminder_1_sent" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "scheduled_instagram_posts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"caption" text NOT NULL,
	"scheduled_for" timestamp NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "scheduled_linkedin_posts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"content" text NOT NULL,
	"scheduled_for" timestamp NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"post_id" text,
	"error_message" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "scheduled_tweets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"content" text NOT NULL,
	"media_urls" text[],
	"scheduled_for" timestamp NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"tweet_id" text,
	"error_message" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "scheduled_youtube_posts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"tags" text[],
	"category" text DEFAULT '22',
	"privacy_status" text DEFAULT 'public' NOT NULL,
	"video_url" text NOT NULL,
	"thumbnail_url" text,
	"scheduled_for" timestamp NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"youtube_video_id" text,
	"error_message" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sequence_emails" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sequence_id" varchar NOT NULL,
	"subject" text NOT NULL,
	"body_html" text NOT NULL,
	"delay_days" integer DEFAULT 0 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions_hub" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"type" "session_type" DEFAULT 'recording' NOT NULL,
	"video_url" text,
	"thumbnail_url" text,
	"host_name" text,
	"duration_minutes" integer,
	"scheduled_at" timestamp,
	"tier_required" "session_tier" DEFAULT 'free' NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"tags" text[],
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "story_reply_configs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"reply_message" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"completed" boolean DEFAULT false NOT NULL,
	"due_date" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "twitter_tokens" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text,
	"expires_at" timestamp,
	"twitter_user_id" text,
	"twitter_handle" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_feedback" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"overall_rating" integer,
	"ease_of_use" text,
	"purpose_today" text,
	"completed_purpose" text,
	"most_liked" text,
	"most_useful_feature" text,
	"had_issues" text,
	"issue_type" text,
	"issue_description" text,
	"issue_frequency" text,
	"improvement" text,
	"wished_feature" text,
	"immediate_change" text,
	"feedback_importance" text,
	"would_stop_using" text,
	"nps_score" integer,
	"nps_reason" text,
	"source" text DEFAULT 'dashboard' NOT NULL,
	"submitted_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"name" text NOT NULL,
	"role" "role" DEFAULT 'client' NOT NULL,
	"avatar" text,
	"program" text,
	"next_call_date" timestamp,
	"phone" text,
	"phone_verified" boolean DEFAULT true NOT NULL,
	"google_id" text,
	"plan" "plan" DEFAULT 'free' NOT NULL,
	"plan_confirmed" boolean DEFAULT false NOT NULL,
	"has_video_marketing" boolean DEFAULT false NOT NULL,
	"survey_completed" boolean DEFAULT false NOT NULL,
	"has_video_marketing_addon" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_google_id_unique" UNIQUE("google_id")
);
--> statement-breakpoint
CREATE TABLE "video_analytics_daily_stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"video_id" varchar NOT NULL,
	"date" text NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"unique_viewers" integer DEFAULT 0 NOT NULL,
	"plays" integer DEFAULT 0 NOT NULL,
	"completions" integer DEFAULT 0 NOT NULL,
	"total_watch_seconds" integer DEFAULT 0 NOT NULL,
	"avg_completion_pct" real DEFAULT 0 NOT NULL,
	"cta_clicks" integer DEFAULT 0 NOT NULL,
	"lead_captures" integer DEFAULT 0 NOT NULL,
	"avg_engagement_pct" real DEFAULT 0 NOT NULL,
	"bounce_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "video_analytics_events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"video_id" varchar NOT NULL,
	"session_id" text NOT NULL,
	"event_type" text NOT NULL,
	"position" real DEFAULT 0 NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "video_chapters" (
	"id" serial PRIMARY KEY NOT NULL,
	"video_event_id" varchar NOT NULL,
	"title" text NOT NULL,
	"start_seconds" integer DEFAULT 0 NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "video_collection_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"collection_id" integer NOT NULL,
	"video_event_id" varchar NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "video_collections" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"thumbnail_url" text,
	"is_public" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "video_ctas" (
	"id" serial PRIMARY KEY NOT NULL,
	"video_event_id" varchar NOT NULL,
	"type" text DEFAULT 'button' NOT NULL,
	"text" text NOT NULL,
	"url" text,
	"appear_at" integer DEFAULT 0 NOT NULL,
	"disappear_at" integer,
	"style" text DEFAULT 'gold' NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "video_edits" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"title" text NOT NULL,
	"original_filename" text NOT NULL,
	"file_path" text NOT NULL,
	"file_url" text,
	"duration" real,
	"transcript" jsonb,
	"silences" jsonb,
	"status" text DEFAULT 'uploaded',
	"shotstack_render_id" text,
	"output_url" text,
	"settings" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "video_events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"video_url" text NOT NULL,
	"thumbnail_url" text,
	"duration" integer,
	"category" text DEFAULT 'General',
	"tags" text[] DEFAULT '{}'::text[],
	"views" integer DEFAULT 0 NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"allow_download" boolean DEFAULT false NOT NULL,
	"video_type" text DEFAULT 'standard' NOT NULL,
	"progress_bar_config" text,
	"lead_gate_enabled" boolean DEFAULT false NOT NULL,
	"brand_color" text,
	"logo_url" text,
	"caption_url" text,
	"resume_enabled" boolean DEFAULT false NOT NULL,
	"autoplay_next_enabled" boolean DEFAULT false NOT NULL,
	"domain_whitelist" text[] DEFAULT '{}'::text[],
	"expires_at" timestamp,
	"password_hash" text,
	"urgency_text" text,
	"urgency_ends_at" timestamp,
	"default_playback_speed" real DEFAULT 1 NOT NULL,
	"allow_speed_control" boolean DEFAULT true NOT NULL,
	"allow_quality_control" boolean DEFAULT true NOT NULL,
	"show_oravini_watermark" boolean DEFAULT true NOT NULL,
	"oravini_watermark_position" text DEFAULT 'bottom-right' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "video_heatmap_segments" (
	"id" serial PRIMARY KEY NOT NULL,
	"video_id" varchar NOT NULL,
	"segment_second" integer NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"replay_count" integer DEFAULT 0 NOT NULL,
	"drop_off_count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "video_marketing_settings" (
	"user_id" varchar PRIMARY KEY NOT NULL,
	"livekit_url" text,
	"livekit_key" text,
	"livekit_secret" text,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "video_resources" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"url" text NOT NULL,
	"category" text DEFAULT 'General',
	"platform" text,
	"thumbnail_url" text,
	"added_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "video_viewer_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"video_id" varchar NOT NULL,
	"session_id" text NOT NULL,
	"visitor_id" text,
	"device" text,
	"browser" text,
	"os" text,
	"screen_width" integer,
	"country" text,
	"city" text,
	"region" text,
	"referrer" text,
	"referrer_domain" text,
	"utm_source" text,
	"utm_medium" text,
	"utm_campaign" text,
	"total_watch_seconds" integer DEFAULT 0 NOT NULL,
	"completion_pct" integer DEFAULT 0 NOT NULL,
	"max_position" real DEFAULT 0 NOT NULL,
	"play_count" integer DEFAULT 1 NOT NULL,
	"pause_count" integer DEFAULT 0 NOT NULL,
	"seek_count" integer DEFAULT 0 NOT NULL,
	"replay_count" integer DEFAULT 0 NOT NULL,
	"cta_clicked" boolean DEFAULT false NOT NULL,
	"cta_clicked_at" real,
	"lead_captured" boolean DEFAULT false NOT NULL,
	"timeline" jsonb,
	"first_seen_at" timestamp DEFAULT now(),
	"last_seen_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "video_viewer_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"video_event_id" varchar NOT NULL,
	"visitor_id" text NOT NULL,
	"watched_seconds" integer DEFAULT 0 NOT NULL,
	"completion_pct" integer DEFAULT 0 NOT NULL,
	"heatmap_data" text,
	"cta_clicked" boolean DEFAULT false NOT NULL,
	"country" text,
	"referrer" text,
	"created_at" timestamp DEFAULT now(),
	"last_seen_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "webinar_analytics" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"webinar_id" varchar NOT NULL,
	"total_viewers" integer DEFAULT 0 NOT NULL,
	"peak_concurrent" integer DEFAULT 0 NOT NULL,
	"avg_watch_seconds" real DEFAULT 0 NOT NULL,
	"total_chat_messages" integer DEFAULT 0 NOT NULL,
	"total_reactions" integer DEFAULT 0 NOT NULL,
	"total_questions" integer DEFAULT 0 NOT NULL,
	"total_poll_votes" integer DEFAULT 0 NOT NULL,
	"total_cta_clicks" integer DEFAULT 0 NOT NULL,
	"engagement_rate" real DEFAULT 0 NOT NULL,
	"show_rate" real DEFAULT 0 NOT NULL,
	"completion_rate" real DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "webinar_analytics_webinar_id_unique" UNIQUE("webinar_id")
);
--> statement-breakpoint
CREATE TABLE "webinar_contacts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"name" text,
	"email" text,
	"phone" text,
	"company" text,
	"source" text,
	"segment" text DEFAULT 'general' NOT NULL,
	"stage" text DEFAULT 'lead' NOT NULL,
	"webinar_code" text,
	"notes" text,
	"conversion_value" real,
	"conversion_note" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "webinar_domains" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"domain" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"target_slug" text,
	"verify_token" text,
	"verified_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "webinar_domains_domain_unique" UNIQUE("domain")
);
--> statement-breakpoint
CREATE TABLE "webinar_events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"webinar_id" varchar NOT NULL,
	"event_type" text NOT NULL,
	"viewer_name" text,
	"viewer_id" text,
	"data" jsonb,
	"ts" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "webinar_landing_pages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"webinar_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"slug" text NOT NULL,
	"headline" text NOT NULL,
	"subheadline" text,
	"description" text,
	"body_content" text,
	"hero_image_url" text,
	"presenter_name" text,
	"presenter_title" text,
	"presenter_avatar_url" text,
	"bullet_points" text[] DEFAULT '{}'::text[],
	"cta_text" text DEFAULT 'Register Now — It''s Free',
	"accent_color" text DEFAULT '#d4b461',
	"is_active" boolean DEFAULT true NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"chat_enabled" boolean DEFAULT false NOT NULL,
	"chat_system_prompt" text,
	"sections" text,
	"design" text,
	"chat_config" text,
	"views" integer DEFAULT 0 NOT NULL,
	"registrations" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "webinar_landing_pages_webinar_id_unique" UNIQUE("webinar_id"),
	CONSTRAINT "webinar_landing_pages_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "webinar_poll_votes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"poll_id" varchar NOT NULL,
	"webinar_id" varchar NOT NULL,
	"viewer_id" text NOT NULL,
	"viewer_name" text,
	"option_index" integer NOT NULL,
	"ts" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "webinar_polls" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"webinar_id" varchar NOT NULL,
	"question" text NOT NULL,
	"options" jsonb NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"show_results" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "webinar_recordings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"webinar_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"title" text NOT NULL,
	"recording_url" text NOT NULL,
	"thumbnail_url" text,
	"duration" integer,
	"file_size" text,
	"share_token" text,
	"views" integer DEFAULT 0 NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "webinar_recordings_share_token_unique" UNIQUE("share_token")
);
--> statement-breakpoint
CREATE TABLE "webinar_registrations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"webinar_id" varchar NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"attended" boolean DEFAULT false NOT NULL,
	"watched_duration" integer DEFAULT 0,
	"registered_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "webinar_series" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"schedule" text DEFAULT 'weekly' NOT NULL,
	"day_of_week" integer DEFAULT 1 NOT NULL,
	"time_hour" integer DEFAULT 19 NOT NULL,
	"time_minute" integer DEFAULT 0 NOT NULL,
	"timezone" text DEFAULT 'America/New_York' NOT NULL,
	"duration_minutes" integer DEFAULT 60 NOT NULL,
	"max_attendees" integer,
	"presenter_name" text,
	"webinar_type" text DEFAULT 'live' NOT NULL,
	"registration_slug" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "webinar_viewer_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"webinar_id" varchar NOT NULL,
	"viewer_id" text NOT NULL,
	"viewer_name" text DEFAULT 'Anonymous' NOT NULL,
	"joined_at" timestamp DEFAULT now(),
	"last_heartbeat_at" timestamp DEFAULT now(),
	"left_at" timestamp,
	"watched_seconds" integer DEFAULT 0 NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"country" text,
	"referrer" text,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webinars" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"scheduled_at" timestamp NOT NULL,
	"duration_minutes" integer DEFAULT 60 NOT NULL,
	"max_attendees" integer,
	"status" "webinar_status" DEFAULT 'upcoming' NOT NULL,
	"meeting_code" text NOT NULL,
	"chat_channels" text[] DEFAULT '{}'::text[],
	"offer_url" text,
	"offer_title" text,
	"thumbnail_url" text,
	"is_public" boolean DEFAULT false NOT NULL,
	"webinar_type" text DEFAULT 'live' NOT NULL,
	"replay_video_url" text,
	"presenter_name" text,
	"video_quality" text DEFAULT '1080p',
	"views" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp,
	"ended_at" timestamp,
	"peak_viewers" integer DEFAULT 0 NOT NULL,
	"broadcast_url" text,
	"livekit_room_name" text,
	"series_id" varchar,
	"waiting_room_video_url" text,
	"waiting_room_message" text,
	"email_reminder_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "webinars_meeting_code_unique" UNIQUE("meeting_code")
);
--> statement-breakpoint
CREATE TABLE "welcome_dm_configs" (
	"user_id" varchar PRIMARY KEY NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"message" text DEFAULT '' NOT NULL,
	"delay_minutes" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "winning_patterns" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"post_id" varchar,
	"platform" "platform" NOT NULL,
	"content_type" "content_type" NOT NULL,
	"funnel_stage" "funnel_stage" NOT NULL,
	"hook" text NOT NULL,
	"hook_type" "hook_type" NOT NULL,
	"structure" text NOT NULL,
	"cta" text,
	"niche" text NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"likes" integer DEFAULT 0 NOT NULL,
	"comments" integer DEFAULT 0 NOT NULL,
	"saves" integer DEFAULT 0 NOT NULL,
	"engagement_rate" real DEFAULT 0 NOT NULL,
	"viral_score" real DEFAULT 0 NOT NULL,
	"performance_reason" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "youtube_tokens" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text,
	"expires_at" timestamp,
	"channel_id" text,
	"channel_title" text,
	"channel_thumbnail" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "ai_bot_configs" ADD CONSTRAINT "ai_bot_configs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_session_history" ADD CONSTRAINT "ai_session_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_overrides" ADD CONSTRAINT "availability_overrides_meeting_type_id_meeting_types_id_fk" FOREIGN KEY ("meeting_type_id") REFERENCES "public"."meeting_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_rules" ADD CONSTRAINT "availability_rules_meeting_type_id_meeting_types_id_fk" FOREIGN KEY ("meeting_type_id") REFERENCES "public"."meeting_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_voice_profiles" ADD CONSTRAINT "brand_voice_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broll_clips" ADD CONSTRAINT "broll_clips_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_bookings" ADD CONSTRAINT "call_bookings_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_feedback" ADD CONSTRAINT "call_feedback_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_auto_replies" ADD CONSTRAINT "comment_auto_replies_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competitor_analyses" ADD CONSTRAINT "competitor_analyses_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_custom_field_defs" ADD CONSTRAINT "contact_custom_field_defs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_custom_field_values" ADD CONSTRAINT "contact_custom_field_values_lead_id_dm_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."dm_leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_custom_field_values" ADD CONSTRAINT "contact_custom_field_values_field_def_id_contact_custom_field_defs_id_fk" FOREIGN KEY ("field_def_id") REFERENCES "public"."contact_custom_field_defs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_calendars" ADD CONSTRAINT "content_calendars_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_posts" ADD CONSTRAINT "content_posts_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_templates" ADD CONSTRAINT "content_templates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_notes" ADD CONSTRAINT "conversation_notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_balances" ADD CONSTRAINT "credit_balances_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_readings" ADD CONSTRAINT "daily_readings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dm_click_events" ADD CONSTRAINT "dm_click_events_link_id_dm_click_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."dm_click_links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dm_click_events" ADD CONSTRAINT "dm_click_events_lead_id_dm_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."dm_leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dm_click_links" ADD CONSTRAINT "dm_click_links_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dm_contact_tags" ADD CONSTRAINT "dm_contact_tags_lead_id_dm_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."dm_leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dm_flows" ADD CONSTRAINT "dm_flows_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dm_funnel_events" ADD CONSTRAINT "dm_funnel_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dm_funnel_events" ADD CONSTRAINT "dm_funnel_events_lead_id_dm_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."dm_leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dm_funnel_events" ADD CONSTRAINT "dm_funnel_events_flow_id_dm_flows_id_fk" FOREIGN KEY ("flow_id") REFERENCES "public"."dm_flows"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dm_leads" ADD CONSTRAINT "dm_leads_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dm_quick_replies" ADD CONSTRAINT "dm_quick_replies_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dm_scheduled_broadcasts" ADD CONSTRAINT "dm_scheduled_broadcasts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dm_sequence_enrollments" ADD CONSTRAINT "dm_sequence_enrollments_sequence_id_dm_sequences_id_fk" FOREIGN KEY ("sequence_id") REFERENCES "public"."dm_sequences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dm_sequence_enrollments" ADD CONSTRAINT "dm_sequence_enrollments_lead_id_dm_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."dm_leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dm_sequence_steps" ADD CONSTRAINT "dm_sequence_steps_sequence_id_dm_sequences_id_fk" FOREIGN KEY ("sequence_id") REFERENCES "public"."dm_sequences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dm_sequences" ADD CONSTRAINT "dm_sequences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dm_triggers" ADD CONSTRAINT "dm_triggers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_enrollments" ADD CONSTRAINT "email_enrollments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_enrollments" ADD CONSTRAINT "email_enrollments_sequence_id_email_sequences_id_fk" FOREIGN KEY ("sequence_id") REFERENCES "public"."email_sequences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_answers" ADD CONSTRAINT "form_answers_submission_id_form_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."form_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_questions" ADD CONSTRAINT "form_questions_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_views" ADD CONSTRAINT "form_views_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forms" ADD CONSTRAINT "forms_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "google_calendar_tokens" ADD CONSTRAINT "google_calendar_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ig_bot_campaigns" ADD CONSTRAINT "ig_bot_campaigns_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ig_bot_cookies" ADD CONSTRAINT "ig_bot_cookies_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ig_follower_snapshots" ADD CONSTRAINT "ig_follower_snapshots_profile_id_ig_tracked_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."ig_tracked_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ig_tracked_profiles" ADD CONSTRAINT "ig_tracked_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "income_goals" ADD CONSTRAINT "income_goals_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instagram_profile_reports" ADD CONSTRAINT "instagram_profile_reports_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "linkedin_tokens" ADD CONSTRAINT "linkedin_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_receiver_id_users_id_fk" FOREIGN KEY ("receiver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meta_tokens" ADD CONSTRAINT "meta_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "niche_analyses" ADD CONSTRAINT "niche_analyses_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_surveys" ADD CONSTRAINT "onboarding_surveys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opt_in_links" ADD CONSTRAINT "opt_in_links_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opt_in_links" ADD CONSTRAINT "opt_in_links_sequence_id_dm_sequences_id_fk" FOREIGN KEY ("sequence_id") REFERENCES "public"."dm_sequences"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbound_webhooks" ADD CONSTRAINT "outbound_webhooks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress" ADD CONSTRAINT "progress_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_highlights" ADD CONSTRAINT "reading_highlights_material_id_reading_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."reading_materials"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_highlights" ADD CONSTRAINT "reading_highlights_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_materials" ADD CONSTRAINT "reading_materials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_streaks" ADD CONSTRAINT "reading_streaks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_codes" ADD CONSTRAINT "referral_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_conversions" ADD CONSTRAINT "referral_conversions_referrer_id_users_id_fk" FOREIGN KEY ("referrer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_conversions" ADD CONSTRAINT "referral_conversions_referred_user_id_users_id_fk" FOREIGN KEY ("referred_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_bookings" ADD CONSTRAINT "scheduled_bookings_meeting_type_id_meeting_types_id_fk" FOREIGN KEY ("meeting_type_id") REFERENCES "public"."meeting_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_instagram_posts" ADD CONSTRAINT "scheduled_instagram_posts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_linkedin_posts" ADD CONSTRAINT "scheduled_linkedin_posts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_tweets" ADD CONSTRAINT "scheduled_tweets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_youtube_posts" ADD CONSTRAINT "scheduled_youtube_posts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sequence_emails" ADD CONSTRAINT "sequence_emails_sequence_id_email_sequences_id_fk" FOREIGN KEY ("sequence_id") REFERENCES "public"."email_sequences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions_hub" ADD CONSTRAINT "sessions_hub_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_reply_configs" ADD CONSTRAINT "story_reply_configs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "twitter_tokens" ADD CONSTRAINT "twitter_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_feedback" ADD CONSTRAINT "user_feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_chapters" ADD CONSTRAINT "video_chapters_video_event_id_video_events_id_fk" FOREIGN KEY ("video_event_id") REFERENCES "public"."video_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_collection_items" ADD CONSTRAINT "video_collection_items_collection_id_video_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."video_collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_collection_items" ADD CONSTRAINT "video_collection_items_video_event_id_video_events_id_fk" FOREIGN KEY ("video_event_id") REFERENCES "public"."video_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_collections" ADD CONSTRAINT "video_collections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_ctas" ADD CONSTRAINT "video_ctas_video_event_id_video_events_id_fk" FOREIGN KEY ("video_event_id") REFERENCES "public"."video_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_edits" ADD CONSTRAINT "video_edits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_events" ADD CONSTRAINT "video_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_marketing_settings" ADD CONSTRAINT "video_marketing_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_resources" ADD CONSTRAINT "video_resources_added_by_users_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_viewer_sessions" ADD CONSTRAINT "video_viewer_sessions_video_event_id_video_events_id_fk" FOREIGN KEY ("video_event_id") REFERENCES "public"."video_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webinar_analytics" ADD CONSTRAINT "webinar_analytics_webinar_id_webinars_id_fk" FOREIGN KEY ("webinar_id") REFERENCES "public"."webinars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webinar_contacts" ADD CONSTRAINT "webinar_contacts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webinar_domains" ADD CONSTRAINT "webinar_domains_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webinar_events" ADD CONSTRAINT "webinar_events_webinar_id_webinars_id_fk" FOREIGN KEY ("webinar_id") REFERENCES "public"."webinars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webinar_landing_pages" ADD CONSTRAINT "webinar_landing_pages_webinar_id_webinars_id_fk" FOREIGN KEY ("webinar_id") REFERENCES "public"."webinars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webinar_landing_pages" ADD CONSTRAINT "webinar_landing_pages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webinar_poll_votes" ADD CONSTRAINT "webinar_poll_votes_poll_id_webinar_polls_id_fk" FOREIGN KEY ("poll_id") REFERENCES "public"."webinar_polls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webinar_polls" ADD CONSTRAINT "webinar_polls_webinar_id_webinars_id_fk" FOREIGN KEY ("webinar_id") REFERENCES "public"."webinars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webinar_recordings" ADD CONSTRAINT "webinar_recordings_webinar_id_webinars_id_fk" FOREIGN KEY ("webinar_id") REFERENCES "public"."webinars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webinar_recordings" ADD CONSTRAINT "webinar_recordings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webinar_registrations" ADD CONSTRAINT "webinar_registrations_webinar_id_webinars_id_fk" FOREIGN KEY ("webinar_id") REFERENCES "public"."webinars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webinar_series" ADD CONSTRAINT "webinar_series_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webinar_viewer_sessions" ADD CONSTRAINT "webinar_viewer_sessions_webinar_id_webinars_id_fk" FOREIGN KEY ("webinar_id") REFERENCES "public"."webinars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webinars" ADD CONSTRAINT "webinars_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "welcome_dm_configs" ADD CONSTRAINT "welcome_dm_configs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "winning_patterns" ADD CONSTRAINT "winning_patterns_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "winning_patterns" ADD CONSTRAINT "winning_patterns_post_id_content_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."content_posts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "youtube_tokens" ADD CONSTRAINT "youtube_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;