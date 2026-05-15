CREATE TABLE "niche_intelligence" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"niche" text NOT NULL,
	"platform" "platform",
	"hook_type" "hook_type",
	"content_type" "content_type",
	"funnel_stage" "funnel_stage",
	"avg_views" integer DEFAULT 0 NOT NULL,
	"avg_likes" integer DEFAULT 0 NOT NULL,
	"avg_comments" integer DEFAULT 0 NOT NULL,
	"avg_saves" integer DEFAULT 0 NOT NULL,
	"avg_shares" integer DEFAULT 0 NOT NULL,
	"avg_engagement_rate" real DEFAULT 0 NOT NULL,
	"avg_viral_score" real DEFAULT 0 NOT NULL,
	"top_hook_type" text,
	"top_content_type" text,
	"top_structure" text,
	"total_posts" integer DEFAULT 0 NOT NULL,
	"total_users" integer DEFAULT 0 NOT NULL,
	"total_winning_patterns" integer DEFAULT 0 NOT NULL,
	"trend_30d" real DEFAULT 0 NOT NULL,
	"health_score" real,
	"health_label" text,
	"last_calculated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "niche_trends" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"niche" text NOT NULL,
	"platform" "platform",
	"trend_type" text NOT NULL,
	"trend_value" text NOT NULL,
	"momentum" text DEFAULT 'stable' NOT NULL,
	"engagement_delta" real DEFAULT 0 NOT NULL,
	"sample_count" integer DEFAULT 0 NOT NULL,
	"sample_post_ids" jsonb DEFAULT '[]'::jsonb,
	"detected_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sms_broadcasts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"message" text NOT NULL,
	"segment" text DEFAULT 'all' NOT NULL,
	"recipients_count" integer,
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sms_carrier_gateways" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" text NOT NULL,
	"carrier_name" text DEFAULT 'unknown' NOT NULL,
	"gateway_domain" text NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "sms_carrier_gateways_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "sms_contact_tag_assignments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" text NOT NULL,
	"tag_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sms_contact_tags" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT '#d4b461' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "sms_contact_tags_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "sms_enrollments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" text NOT NULL,
	"sequence_id" varchar NOT NULL,
	"current_step" integer DEFAULT 0 NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"unsubscribed" boolean DEFAULT false NOT NULL,
	"enrolled_at" timestamp DEFAULT now(),
	"next_send_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "sms_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"to_phone" text NOT NULL,
	"message" text NOT NULL,
	"sequence_step_id" varchar,
	"broadcast_id" varchar,
	"sent_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sms_sequence_steps" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sequence_id" varchar NOT NULL,
	"message" text NOT NULL,
	"delay_minutes" integer DEFAULT 0 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sms_sequences" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"trigger" text DEFAULT 'manual' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sms_step_variants" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"step_id" varchar NOT NULL,
	"message" text NOT NULL,
	"is_control" boolean DEFAULT false NOT NULL,
	"opens" integer DEFAULT 0 NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sms_templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"message" text NOT NULL,
	"category" text DEFAULT 'general' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sms_unsubscribes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" text NOT NULL,
	"unsubscribed_at" timestamp DEFAULT now(),
	CONSTRAINT "sms_unsubscribes_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
ALTER TABLE "sms_contact_tag_assignments" ADD CONSTRAINT "sms_contact_tag_assignments_tag_id_sms_contact_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."sms_contact_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sms_enrollments" ADD CONSTRAINT "sms_enrollments_sequence_id_sms_sequences_id_fk" FOREIGN KEY ("sequence_id") REFERENCES "public"."sms_sequences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sms_sequence_steps" ADD CONSTRAINT "sms_sequence_steps_sequence_id_sms_sequences_id_fk" FOREIGN KEY ("sequence_id") REFERENCES "public"."sms_sequences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sms_step_variants" ADD CONSTRAINT "sms_step_variants_step_id_sms_sequence_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."sms_sequence_steps"("id") ON DELETE cascade ON UPDATE no action;