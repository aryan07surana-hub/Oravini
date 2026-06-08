import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, pgEnum, real, jsonb, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const roleEnum = pgEnum("role", ["admin", "client"]);
export const docTypeEnum = pgEnum("doc_type", ["recording", "summary", "audit", "strategy", "worksheet", "contract", "material", "other"]);
export const platformEnum = pgEnum("platform", ["instagram", "youtube"]);
export const contentTypeEnum = pgEnum("content_type", ["reel", "carousel", "story", "video", "post"]);
export const funnelStageEnum = pgEnum("funnel_stage", ["top", "middle", "bottom"]);
export const planEnum = pgEnum("plan", ["free", "starter", "growth", "pro", "elite"]);
export const sessionTypeEnum = pgEnum("session_type", ["recording", "live_qa", "workshop", "masterclass"]);
export const sessionTierEnum = pgEnum("session_tier", ["free", "starter", "growth", "pro", "elite"]);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: roleEnum("role").notNull().default("client"),
  avatar: text("avatar"),
  program: text("program"),
  nextCallDate: timestamp("next_call_date"),
  phone: text("phone"),
  phoneVerified: boolean("phone_verified").notNull().default(true),
  googleId: text("google_id").unique(),
  plan: planEnum("plan").notNull().default("free"),
  planConfirmed: boolean("plan_confirmed").notNull().default(false),
  hasVideoMarketing: boolean("has_video_marketing").notNull().default(false),
  surveyCompleted: boolean("survey_completed").notNull().default(false),
  hasVideoMarketingAddon: boolean("has_video_marketing_addon").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const sessions = pgTable("sessions_hub", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  type: sessionTypeEnum("type").notNull().default("recording"),
  videoUrl: text("video_url"),
  thumbnailUrl: text("thumbnail_url"),
  hostName: text("host_name"),
  durationMinutes: integer("duration_minutes"),
  scheduledAt: timestamp("scheduled_at"),
  tierRequired: sessionTierEnum("tier_required").notNull().default("free"),
  isPublished: boolean("is_published").notNull().default(false),
  tags: text("tags").array(),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const freeAiUsage = pgTable("free_ai_usage", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  identifier: text("identifier").notNull(),
  date: text("date").notNull(),
  count: integer("count").notNull().default(0),
});

export const creditBalances = pgTable("credit_balances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  monthlyCredits: integer("monthly_credits").notNull().default(20),
  bonusCredits: integer("bonus_credits").notNull().default(0),
  lastResetMonth: text("last_reset_month").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow(),
});

export const creditTransactions = pgTable("credit_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  amount: integer("amount").notNull(),
  type: text("type").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCreditBalanceSchema = createInsertSchema(creditBalances).omit({ id: true, createdAt: true });
export type InsertCreditBalance = z.infer<typeof insertCreditBalanceSchema>;
export type CreditBalance = typeof creditBalances.$inferSelect;

export const insertCreditTransactionSchema = createInsertSchema(creditTransactions).omit({ id: true, createdAt: true });
export type InsertCreditTransaction = z.infer<typeof insertCreditTransactionSchema>;
export type CreditTransaction = typeof creditTransactions.$inferSelect;

export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => users.id),
  uploadedBy: varchar("uploaded_by").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  fileName: text("file_name").notNull(),
  fileSize: text("file_size"),
  fileType: docTypeEnum("file_type").notNull().default("other"),
  fileUrl: text("file_url").notNull(),
  mimeType: text("mime_type"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  receiverId: varchar("receiver_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  fileUrl: text("file_url"),
  fileName: text("file_name"),
  fileMime: text("file_mime"),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const progress = pgTable("progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => users.id).unique(),
  offerCreation: integer("offer_creation").notNull().default(0),
  funnelProgress: integer("funnel_progress").notNull().default(0),
  contentProgress: integer("content_progress").notNull().default(0),
  monetizationProgress: integer("monetization_progress").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const callFeedback = pgTable("call_feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  recordingUrl: text("recording_url"),
  summary: text("summary"),
  feedbackNotes: text("feedback_notes"),
  actionSteps: text("action_steps"),
  callDate: timestamp("call_date").notNull(),
  clientFeedback: text("client_feedback"),
  clientLearnings: text("client_learnings"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  completed: boolean("completed").notNull().default(false),
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => users.id),
  message: text("message").notNull(),
  type: text("type").notNull().default("reminder"),
  read: boolean("read").notNull().default(false),
  scheduledFor: timestamp("scheduled_for"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const contentPosts = pgTable("content_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => users.id),
  platform: platformEnum("platform").notNull(),
  contentType: contentTypeEnum("content_type").notNull(),
  title: text("title"),
  postUrl: text("post_url"),
  postDate: timestamp("post_date").notNull(),
  funnelStage: funnelStageEnum("funnel_stage"),
  views: integer("views").notNull().default(0),
  likes: integer("likes").notNull().default(0),
  comments: integer("comments").notNull().default(0),
  saves: integer("saves").notNull().default(0),
  shares: integer("shares").notNull().default(0),
  contentStyle: text("content_style"),
  followersGained: integer("followers_gained").notNull().default(0),
  subscribersGained: integer("subscribers_gained").notNull().default(0),
  views2w: integer("views_2w"),
  likes2w: integer("likes_2w"),
  comments2w: integer("comments_2w"),
  saves2w: integer("saves_2w"),
  shares2w: integer("shares_2w"),
  followersGained2w: integer("followers_gained_2w"),
  subscribersGained2w: integer("subscribers_gained_2w"),
  views4w: integer("views_4w"),
  likes4w: integer("likes_4w"),
  comments4w: integer("comments_4w"),
  saves4w: integer("saves_4w"),
  shares4w: integer("shares_4w"),
  followersGained4w: integer("followers_gained_4w"),
  subscribersGained4w: integer("subscribers_gained_4w"),
  metricsReminded: boolean("metrics_reminded").notNull().default(false),
  initialSyncedAt: timestamp("initial_synced_at"),
  twoWeekSyncedAt: timestamp("two_week_synced_at"),
  fourWeekSyncedAt: timestamp("four_week_synced_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const incomeGoals = pgTable("income_goals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => users.id).unique(),
  goalAmount: real("goal_amount").notNull(),
  currency: text("currency").notNull().default("USD"),
  timeframeMonths: integer("timeframe_months").notNull().default(6),
  createdAt: timestamp("created_at").defaultNow(),
});

export const callBookings = pgTable("call_bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").references(() => users.id),
  inviteeName: text("invitee_name").notNull(),
  inviteeEmail: text("invitee_email").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  eventName: text("event_name"),
  status: text("status").notNull().default("scheduled"),
  calendlyEventUri: text("calendly_event_uri"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertDocumentSchema = createInsertSchema(documents).omit({ id: true, createdAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true, read: true });
export const insertProgressSchema = createInsertSchema(progress).omit({ id: true, updatedAt: true });
export const insertCallFeedbackSchema = createInsertSchema(callFeedback).omit({ id: true, createdAt: true });
export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true, createdAt: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true, read: true });
export const insertContentPostSchema = createInsertSchema(contentPosts).omit({ id: true, createdAt: true });
export const aiIdeaLogs = pgTable("ai_idea_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull(),
  platform: text("platform").notNull(),
  niche: text("niche").notNull(),
  contentType: text("content_type"),
  goal: text("goal"),
  ideasCount: integer("ideas_count").default(6),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertIncomeGoalSchema = createInsertSchema(incomeGoals).omit({ id: true, createdAt: true });
export const insertCallBookingSchema = createInsertSchema(callBookings).omit({ id: true, createdAt: true });
export const insertAiIdeaLogSchema = createInsertSchema(aiIdeaLogs).omit({ id: true, createdAt: true });

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Progress = typeof progress.$inferSelect;
export type InsertProgress = z.infer<typeof insertProgressSchema>;
export type CallFeedback = typeof callFeedback.$inferSelect;
export type InsertCallFeedback = z.infer<typeof insertCallFeedbackSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type ContentPost = typeof contentPosts.$inferSelect;
export type InsertContentPost = z.infer<typeof insertContentPostSchema>;
export type IncomeGoal = typeof incomeGoals.$inferSelect;
export type InsertIncomeGoal = z.infer<typeof insertIncomeGoalSchema>;
export type CallBooking = typeof callBookings.$inferSelect;
export type InsertCallBooking = z.infer<typeof insertCallBookingSchema>;
export type AiIdeaLog = typeof aiIdeaLogs.$inferSelect;
export type InsertAiIdeaLog = z.infer<typeof insertAiIdeaLogSchema>;

export const dmLeads = pgTable("dm_leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  instagramHandle: varchar("instagram_handle"),
  status: varchar("status").notNull().default("new"),
  notes: text("notes"),
  lastContactAt: timestamp("last_contact_at"),
  followUpDate: timestamp("follow_up_date"),
  source: varchar("source"),
  email: text("email"),
  phone: text("phone"),
  leadScore: integer("lead_score"),
  leadScoreReason: text("lead_score_reason"),
  isOptedOut: boolean("is_opted_out").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDmLeadSchema = createInsertSchema(dmLeads).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDmLead = z.infer<typeof insertDmLeadSchema>;
export type DmLead = typeof dmLeads.$inferSelect;

export const dmQuickReplies = pgTable("dm_quick_replies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDmQuickReplySchema = createInsertSchema(dmQuickReplies).omit({ id: true, createdAt: true });
export type InsertDmQuickReply = z.infer<typeof insertDmQuickReplySchema>;
export type DmQuickReply = typeof dmQuickReplies.$inferSelect;

export const instagramProfileReports = pgTable("instagram_profile_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => users.id),
  instagramUrl: text("instagram_url").notNull(),
  handle: varchar("handle"),
  postCount: integer("post_count").default(0),
  report: jsonb("report"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertInstagramProfileReportSchema = createInsertSchema(instagramProfileReports).omit({ id: true, createdAt: true });
export type InsertInstagramProfileReport = z.infer<typeof insertInstagramProfileReportSchema>;
export type InstagramProfileReport = typeof instagramProfileReports.$inferSelect;

export const nicheAnalyses = pgTable("niche_analyses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => users.id),
  niche: varchar("niche").notNull(),
  competitorUrls: text("competitor_urls").array().notNull(),
  competitorHandles: text("competitor_handles").array(),
  report: jsonb("report"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertNicheAnalysisSchema = createInsertSchema(nicheAnalyses).omit({ id: true, createdAt: true });
export type InsertNicheAnalysis = z.infer<typeof insertNicheAnalysisSchema>;
export type NicheAnalysis = typeof nicheAnalyses.$inferSelect;

export const competitorAnalyses = pgTable("competitor_analyses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => users.id),
  clientUrl: text("client_url").notNull(),
  competitorUrl: text("competitor_url").notNull(),
  clientHandle: varchar("client_handle"),
  competitorHandle: varchar("competitor_handle"),
  report: jsonb("report"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCompetitorAnalysisSchema = createInsertSchema(competitorAnalyses).omit({ id: true, createdAt: true });
export type InsertCompetitorAnalysis = z.infer<typeof insertCompetitorAnalysisSchema>;
export type CompetitorAnalysis = typeof competitorAnalyses.$inferSelect;

export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const videoResources = pgTable("video_resources", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  url: text("url").notNull(),
  category: text("category").default("General"),
  platform: text("platform"),
  thumbnailUrl: text("thumbnail_url"),
  addedBy: varchar("added_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertVideoResourceSchema = createInsertSchema(videoResources).omit({ id: true, createdAt: true });
export type InsertVideoResource = z.infer<typeof insertVideoResourceSchema>;
export type VideoResource = typeof videoResources.$inferSelect;

// Meta (Instagram/Facebook) OAuth tokens
export const metaTokens = pgTable("meta_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  accessToken: text("access_token").notNull(),
  expiresAt: timestamp("expires_at"),
  scope: text("scope"),
  igAccountId: text("ig_account_id"),
  igUsername: text("ig_username"),
  fbPageId: text("fb_page_id"),
  fbPageName: text("fb_page_name"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export type MetaToken = typeof metaTokens.$inferSelect;

export const insertSessionSchema = createInsertSchema(sessions).omit({ id: true, createdAt: true });
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessions.$inferSelect;

export const insertFreeAiUsageSchema = createInsertSchema(freeAiUsage).omit({ id: true });
export type InsertFreeAiUsage = z.infer<typeof insertFreeAiUsageSchema>;
export type FreeAiUsage = typeof freeAiUsage.$inferSelect;

export const otpCodes = pgTable("otp_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull(),
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertOtpCodeSchema = createInsertSchema(otpCodes).omit({ id: true, createdAt: true });
export type InsertOtpCode = z.infer<typeof insertOtpCodeSchema>;
export type OtpCode = typeof otpCodes.$inferSelect;

export const landingLeads = pgTable("landing_leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  source: text("source").notNull().default("email_capture"),
  creatorType: text("creator_type"),
  platform: text("platform"),
  biggestChallenge: text("biggest_challenge"),
  postFrequency: text("post_frequency"),
  monetizationGoal: text("monetization_goal"),
  niche: text("niche"),
  targetAudience: text("target_audience"),
  goals: text("goals"),
  instagramUrl: text("instagram_url"),
  quizAnswers: jsonb("quiz_answers"),
  monetizationReport: jsonb("monetization_report"),
  auditData: jsonb("audit_data"),
  creditsClaimed: boolean("credits_claimed").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertLandingLeadSchema = createInsertSchema(landingLeads).omit({ id: true, createdAt: true });
export type InsertLandingLead = z.infer<typeof insertLandingLeadSchema>;
export type LandingLead = typeof landingLeads.$inferSelect;

export const twitterTokens = pgTable("twitter_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at"),
  twitterUserId: text("twitter_user_id"),
  twitterHandle: text("twitter_handle"),
  createdAt: timestamp("created_at").defaultNow(),
});
export type TwitterToken = typeof twitterTokens.$inferSelect;

export const scheduledTweets = pgTable("scheduled_tweets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  mediaUrls: text("media_urls").array(),
  scheduledFor: timestamp("scheduled_for").notNull(),
  status: text("status").notNull().default("pending"),
  tweetId: text("tweet_id"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertScheduledTweetSchema = createInsertSchema(scheduledTweets).omit({ id: true, createdAt: true, tweetId: true, errorMessage: true });
export type InsertScheduledTweet = z.infer<typeof insertScheduledTweetSchema>;
export type ScheduledTweet = typeof scheduledTweets.$inferSelect;

export const linkedinTokens = pgTable("linkedin_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at"),
  linkedinUserId: text("linkedin_user_id"),
  linkedinName: text("linkedin_name"),
  createdAt: timestamp("created_at").defaultNow(),
});
export type LinkedinToken = typeof linkedinTokens.$inferSelect;

export const scheduledLinkedinPosts = pgTable("scheduled_linkedin_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  scheduledFor: timestamp("scheduled_for").notNull(),
  status: text("status").notNull().default("pending"),
  postId: text("post_id"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertScheduledLinkedinPostSchema = createInsertSchema(scheduledLinkedinPosts).omit({ id: true, createdAt: true, postId: true, errorMessage: true });
export type InsertScheduledLinkedinPost = z.infer<typeof insertScheduledLinkedinPostSchema>;
export type ScheduledLinkedinPost = typeof scheduledLinkedinPosts.$inferSelect;

export const youtubeTokens = pgTable("youtube_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at"),
  channelId: text("channel_id"),
  channelTitle: text("channel_title"),
  channelThumbnail: text("channel_thumbnail"),
  createdAt: timestamp("created_at").defaultNow(),
});
export type YoutubeToken = typeof youtubeTokens.$inferSelect;

export const scheduledYoutubePosts = pgTable("scheduled_youtube_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  tags: text("tags").array(),
  category: text("category").default("22"),
  privacyStatus: text("privacy_status").notNull().default("public"),
  videoUrl: text("video_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  scheduledFor: timestamp("scheduled_for").notNull(),
  status: text("status").notNull().default("pending"),
  youtubeVideoId: text("youtube_video_id"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertScheduledYoutubePostSchema = createInsertSchema(scheduledYoutubePosts).omit({ id: true, createdAt: true, youtubeVideoId: true, errorMessage: true, status: true });
export type InsertScheduledYoutubePost = z.infer<typeof insertScheduledYoutubePostSchema>;
export type ScheduledYoutubePost = typeof scheduledYoutubePosts.$inferSelect;

export const scheduledInstagramPosts = pgTable("scheduled_instagram_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  caption: text("caption").notNull(),
  scheduledFor: timestamp("scheduled_for").notNull(),
  status: text("status").notNull().default("pending"), // pending | ready | posted
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertScheduledInstagramPostSchema = createInsertSchema(scheduledInstagramPosts).omit({ id: true, createdAt: true, status: true });
export type InsertScheduledInstagramPost = z.infer<typeof insertScheduledInstagramPostSchema>;
export type ScheduledInstagramPost = typeof scheduledInstagramPosts.$inferSelect;

export const aiSessionHistory = pgTable("ai_session_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tool: text("tool").notNull(),
  title: text("title"),
  inputs: jsonb("inputs"),
  output: jsonb("output"),
  createdAt: timestamp("created_at").defaultNow(),
});
export type AiSessionHistory = typeof aiSessionHistory.$inferSelect;
export type InsertAiSessionHistory = { userId: string; tool: string; title?: string; inputs?: any; output?: any };

// ── Forms / Quiz / Survey builder ──────────────────────────────────────────
export const forms = pgTable("forms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull().default("form"), // form | quiz | survey | event
  status: text("status").notNull().default("draft"), // draft | published
  slug: text("slug").notNull().unique(),
  settings: jsonb("settings"), // { submitMessage, theme, collectEmail, collectName }
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertFormSchema = createInsertSchema(forms).omit({ id: true, createdAt: true });
export type InsertForm = z.infer<typeof insertFormSchema>;
export type Form = typeof forms.$inferSelect;

export const formQuestions = pgTable("form_questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  formId: varchar("form_id").notNull().references(() => forms.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // text|long_text|email|name|mcq|rating|yes_no|number|phone
  question: text("question").notNull(),
  options: jsonb("options"), // string[] for mcq
  required: boolean("required").notNull().default(false),
  orderIdx: integer("order_idx").notNull().default(0),
});
export const insertFormQuestionSchema = createInsertSchema(formQuestions).omit({ id: true });
export type InsertFormQuestion = z.infer<typeof insertFormQuestionSchema>;
export type FormQuestion = typeof formQuestions.$inferSelect;

export const formSubmissions = pgTable("form_submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  formId: varchar("form_id").notNull().references(() => forms.id, { onDelete: "cascade" }),
  respondentName: text("respondent_name"),
  respondentEmail: text("respondent_email"),
  submittedAt: timestamp("submitted_at").defaultNow(),
  metadata: jsonb("metadata"), // { device, referrer }
});
export type FormSubmission = typeof formSubmissions.$inferSelect;

export const formAnswers = pgTable("form_answers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  submissionId: varchar("submission_id").notNull().references(() => formSubmissions.id, { onDelete: "cascade" }),
  questionId: varchar("question_id").notNull(),
  value: text("value"),
});
export type FormAnswer = typeof formAnswers.$inferSelect;

export const formViews = pgTable("form_views", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  formId: varchar("form_id").notNull().references(() => forms.id, { onDelete: "cascade" }),
  viewedAt: timestamp("viewed_at").defaultNow(),
  metadata: jsonb("metadata"),
});
export type FormView = typeof formViews.$inferSelect;

// ── Meetings Notetaker ─────────────────────────────────────────────────────────
export const meetings = pgTable("meetings", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  meetingDate: timestamp("meeting_date"),
  duration: integer("duration"),
  status: text("status").notNull().default("processing"),
  rawTranscript: text("raw_transcript"),
  summary: text("summary"),
  actionItems: jsonb("action_items"),
  keyMoments: jsonb("key_moments"),
  participants: text("participants"),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertMeetingSchema = createInsertSchema(meetings).omit({ id: true, createdAt: true });
export type Meeting = typeof meetings.$inferSelect;
export type InsertMeeting = z.infer<typeof insertMeetingSchema>;

// ── Video Studio ───────────────────────────────────────────────────────────────
export const videoEdits = pgTable("video_edits", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  originalFilename: text("original_filename").notNull(),
  filePath: text("file_path").notNull(),
  fileUrl: text("file_url"),
  duration: real("duration"),
  transcript: jsonb("transcript"),
  silences: jsonb("silences"),
  status: text("status").default("uploaded"),
  shotstackRenderId: text("shotstack_render_id"),
  outputUrl: text("output_url"),
  settings: jsonb("settings"),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertVideoEditSchema = createInsertSchema(videoEdits).omit({ id: true, createdAt: true });
export type VideoEdit = typeof videoEdits.$inferSelect;
export type InsertVideoEdit = z.infer<typeof insertVideoEditSchema>;

// ── B-Roll Library ─────────────────────────────────────────────────────────────
export const brollClips = pgTable("broll_clips", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").default("General"),
  videoUrl: text("video_url"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertBrollClipSchema = createInsertSchema(brollClips).omit({ id: true, createdAt: true });
export type BrollClip = typeof brollClips.$inferSelect;
export type InsertBrollClip = z.infer<typeof insertBrollClipSchema>;

// ── Instagram Comment Bot ──────────────────────────────────────────────────
export const igBotCookies = pgTable("ig_bot_cookies", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  cookiesJson: text("cookies_json").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export const insertIgBotCookiesSchema = createInsertSchema(igBotCookies).omit({ id: true, updatedAt: true });
export type IgBotCookies = typeof igBotCookies.$inferSelect;

export const igBotCampaigns = pgTable("ig_bot_campaigns", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  postUrls: text("post_urls").array().notNull().default(sql`'{}'::text[]`),
  comments: text("comments").array().notNull().default(sql`'{}'::text[]`),
  status: text("status").default("idle"),
  resultCount: integer("result_count"),
  errorMsg: text("error_msg"),
  lastRunAt: timestamp("last_run_at"),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertIgBotCampaignSchema = createInsertSchema(igBotCampaigns).omit({ id: true, createdAt: true, lastRunAt: true });
export type IgBotCampaign = typeof igBotCampaigns.$inferSelect;
export type InsertIgBotCampaign = z.infer<typeof insertIgBotCampaignSchema>;

// ── Instagram Growth Tracker ────────────────────────────────────────────────
export const igTrackedProfiles = pgTable("ig_tracked_profiles", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  username: text("username").notNull(),
  fullName: text("full_name"),
  profilePic: text("profile_pic"),
  igUserId: text("ig_user_id"),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertIgTrackedProfileSchema = createInsertSchema(igTrackedProfiles).omit({ id: true, createdAt: true });
export type IgTrackedProfile = typeof igTrackedProfiles.$inferSelect;
export type InsertIgTrackedProfile = z.infer<typeof insertIgTrackedProfileSchema>;

export const igFollowerSnapshots = pgTable("ig_follower_snapshots", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").notNull().references(() => igTrackedProfiles.id, { onDelete: "cascade" }),
  followersCount: integer("followers_count").notNull(),
  followsCount: integer("follows_count").notNull(),
  scannedAt: timestamp("scanned_at").defaultNow(),
});
export const insertIgFollowerSnapshotSchema = createInsertSchema(igFollowerSnapshots).omit({ id: true, scannedAt: true });
export type IgFollowerSnapshot = typeof igFollowerSnapshots.$inferSelect;
export type InsertIgFollowerSnapshot = z.infer<typeof insertIgFollowerSnapshotSchema>;

// ── Scheduling System ──────────────────────────────────────────────────────
export const meetingTypes = pgTable("meeting_types", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  duration: integer("duration").notNull().default(30),
  color: text("color").notNull().default("#d4b461"),
  location: text("location"),
  timezone: text("timezone").notNull().default("UTC"),
  bufferTime: integer("buffer_time").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  customQuestions: text("custom_questions").default("[]"),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertMeetingTypeSchema = createInsertSchema(meetingTypes).omit({ id: true, createdAt: true });
export type InsertMeetingType = z.infer<typeof insertMeetingTypeSchema>;
export type MeetingType = typeof meetingTypes.$inferSelect;

export const availabilityRules = pgTable("availability_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  meetingTypeId: varchar("meeting_type_id").notNull().references(() => meetingTypes.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(), // 0=Sun, 1=Mon, ... 6=Sat
  startTime: text("start_time").notNull(), // "09:00"
  endTime: text("end_time").notNull(),     // "17:00"
  isEnabled: boolean("is_enabled").notNull().default(true),
});
export const insertAvailabilityRuleSchema = createInsertSchema(availabilityRules).omit({ id: true });
export type InsertAvailabilityRule = z.infer<typeof insertAvailabilityRuleSchema>;
export type AvailabilityRule = typeof availabilityRules.$inferSelect;

export const scheduledBookings = pgTable("scheduled_bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  meetingTypeId: varchar("meeting_type_id").notNull().references(() => meetingTypes.id, { onDelete: "cascade" }),
  clientName: text("client_name").notNull(),
  clientEmail: text("client_email").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  status: text("status").notNull().default("scheduled"), // scheduled | cancelled | completed
  notes: text("notes"),
  meetLink: text("meet_link"),
  reminder24Sent: boolean("reminder_24_sent").notNull().default(false),
  reminder1Sent: boolean("reminder_1_sent").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const availabilityOverrides = pgTable("availability_overrides", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  meetingTypeId: varchar("meeting_type_id").notNull().references(() => meetingTypes.id, { onDelete: "cascade" }),
  date: text("date").notNull(), // "2025-12-25" specific date
  type: text("type").notNull().default("unavailable"), // "unavailable" | "custom"
  timeBlocks: text("time_blocks").default("[]"), // JSON array of {start, end} for custom availability
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertAvailabilityOverrideSchema = createInsertSchema(availabilityOverrides).omit({ id: true, createdAt: true });
export type InsertAvailabilityOverride = z.infer<typeof insertAvailabilityOverrideSchema>;
export type AvailabilityOverride = typeof availabilityOverrides.$inferSelect;

export const googleCalendarTokens = pgTable("google_calendar_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at"),
  connectedEmail: text("connected_email"),
  createdAt: timestamp("created_at").defaultNow(),
});
export type GoogleCalendarToken = typeof googleCalendarTokens.$inferSelect;
export const insertScheduledBookingSchema = createInsertSchema(scheduledBookings).omit({ id: true, createdAt: true, reminder24Sent: true, reminder1Sent: true });
export type InsertScheduledBooking = z.infer<typeof insertScheduledBookingSchema>;
export type ScheduledBooking = typeof scheduledBookings.$inferSelect;

export const onboardingSurveys = pgTable("onboarding_surveys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  awareness: text("awareness"),
  field: text("field"),
  fields: text("fields").array(),
  struggles: text("struggles").array(),
  contentTypes: text("content_types").array(),
  descriptor: text("descriptor"),
  experience: text("experience"),
  followerCount: text("follower_count"),
  monthlyRevenue: text("monthly_revenue"),
  primaryGoal: text("primary_goal"),
  platform: text("platform"),
  platforms: text("platforms").array(),
  heardAbout: text("heard_about").array(),
  answers: jsonb("answers"),
  completedAt: timestamp("completed_at").defaultNow(),
});
export const insertOnboardingSurveySchema = createInsertSchema(onboardingSurveys).omit({ id: true, completedAt: true });
export type OnboardingSurvey = typeof onboardingSurveys.$inferSelect;
export type InsertOnboardingSurvey = z.infer<typeof insertOnboardingSurveySchema>;

// ── Email Marketing ─────────────────────────────────────────────────────────
export const emailSequences = pgTable("email_sequences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  trigger: text("trigger").notNull(), // "join" | "upgrade" | "liked"
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertEmailSequenceSchema = createInsertSchema(emailSequences).omit({ id: true, createdAt: true });
export type InsertEmailSequence = z.infer<typeof insertEmailSequenceSchema>;
export type EmailSequence = typeof emailSequences.$inferSelect;

export const sequenceEmails = pgTable("sequence_emails", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sequenceId: varchar("sequence_id").notNull().references(() => emailSequences.id, { onDelete: "cascade" }),
  subject: text("subject").notNull(),
  bodyHtml: text("body_html").notNull(),
  delayDays: integer("delay_days").notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertSequenceEmailSchema = createInsertSchema(sequenceEmails).omit({ id: true, createdAt: true });
export type InsertSequenceEmail = z.infer<typeof insertSequenceEmailSchema>;
export type SequenceEmail = typeof sequenceEmails.$inferSelect;

export const emailEnrollments = pgTable("email_enrollments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sequenceId: varchar("sequence_id").notNull().references(() => emailSequences.id, { onDelete: "cascade" }),
  currentStep: integer("current_step").notNull().default(0),
  completed: boolean("completed").notNull().default(false),
  unsubscribed: boolean("unsubscribed").notNull().default(false),
  enrolledAt: timestamp("enrolled_at").defaultNow(),
  nextSendAt: timestamp("next_send_at"),
});
export const insertEmailEnrollmentSchema = createInsertSchema(emailEnrollments).omit({ id: true, enrolledAt: true });
export type InsertEmailEnrollment = z.infer<typeof insertEmailEnrollmentSchema>;
export type EmailEnrollment = typeof emailEnrollments.$inferSelect;

export const emailLogs = pgTable("email_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  toEmail: text("to_email").notNull(),
  toName: text("to_name"),
  subject: text("subject").notNull(),
  sequenceEmailId: varchar("sequence_email_id"),
  broadcastId: varchar("broadcast_id"),
  openedAt: timestamp("opened_at"),
  sentAt: timestamp("sent_at").defaultNow(),
});
export type EmailLog = typeof emailLogs.$inferSelect;

export const emailBroadcasts = pgTable("email_broadcasts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  bodyHtml: text("body_html").notNull(),
  segment: text("segment").notNull().default("all"),
  recipientsCount: integer("recipients_count"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertEmailBroadcastSchema = createInsertSchema(emailBroadcasts).omit({ id: true, createdAt: true, sentAt: true, recipientsCount: true });
export type InsertEmailBroadcast = z.infer<typeof insertEmailBroadcastSchema>;
export type EmailBroadcast = typeof emailBroadcasts.$inferSelect;

export const emailUnsubscribes = pgTable("email_unsubscribes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  unsubscribedAt: timestamp("unsubscribed_at").defaultNow(),
});

// ── Everyday Reading / Daily Reading Library ─────────────────────────────────
export const readingStatusEnum = pgEnum("reading_status", ["unread", "reading", "completed"]);
export const readingDifficultyEnum = pgEnum("reading_difficulty", ["beginner", "intermediate", "advanced", "elite"]);
export const readingPriorityEnum = pgEnum("reading_priority", ["low", "medium", "high", "must_read"]);

export const readingMaterials = pgTable("reading_materials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  author: text("author"),
  source: text("source"), // e.g. "$100M Offers", "Sales Psychology PDF"
  category: text("category").notNull().default("Books"), // Books, Playbooks, Sales, Marketing, Psychology, Communication, Business, Wealth, Mindset, Systems, SOPs, Personal Notes, Swipe Files
  summary: text("summary"),
  keyTakeaways: text("key_takeaways").array(),
  actionableLessons: text("actionable_lessons").array(),
  tags: text("tags").array(),
  difficulty: readingDifficultyEnum("difficulty").notNull().default("intermediate"),
  readTimeMinutes: integer("read_time_minutes").notNull().default(10),
  priority: readingPriorityEnum("priority").notNull().default("medium"),
  status: readingStatusEnum("status").notNull().default("unread"),
  fileUrl: text("file_url"), // PDF upload
  fileType: text("file_type"), // pdf, txt, markdown
  favorite: boolean("favorite").notNull().default(false),
  mustRead: boolean("must_read").notNull().default(false),
  aiGenerated: boolean("ai_generated").notNull().default(false),
  lastReviewedAt: timestamp("last_reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export const insertReadingMaterialSchema = createInsertSchema(readingMaterials).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertReadingMaterial = z.infer<typeof insertReadingMaterialSchema>;
export type ReadingMaterial = typeof readingMaterials.$inferSelect;

export const readingHighlights = pgTable("reading_highlights", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  materialId: varchar("material_id").notNull().references(() => readingMaterials.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  excerpt: text("excerpt").notNull(),
  page: integer("page"),
  note: text("note"),
  tag: text("tag"), // framework, swipe, mindset, quote, etc.
  favorite: boolean("favorite").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertReadingHighlightSchema = createInsertSchema(readingHighlights).omit({ id: true, createdAt: true });
export type InsertReadingHighlight = z.infer<typeof insertReadingHighlightSchema>;
export type ReadingHighlight = typeof readingHighlights.$inferSelect;

export const readingStreaks = pgTable("reading_streaks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  lastReadDate: timestamp("last_read_date"),
  totalDaysRead: integer("total_days_read").notNull().default(0),
  totalMinutesRead: integer("total_minutes_read").notNull().default(0),
  booksCompleted: integer("books_completed").notNull().default(0),
  lessonsImplemented: integer("lessons_implemented").notNull().default(0),
  knowledgeScore: integer("knowledge_score").notNull().default(0), // 0-100
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export type ReadingStreak = typeof readingStreaks.$inferSelect;

export const dailyReadings = pgTable("daily_readings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: timestamp("date").notNull().defaultNow(),
  mode: text("mode").notNull().default("15min"), // 5min, 10min, 15min, 30min, 45min, deep_work
  quickReadTitle: text("quick_read_title"),
  quickReadContent: text("quick_read_content"),
  quickReadSource: text("quick_read_source"),
  focusReadTitle: text("focus_read_title"),
  focusReadContent: text("focus_read_content"),
  focusReadSource: text("focus_read_source"),
  deepReadTitle: text("deep_read_title"),
  deepReadContent: text("deep_read_content"),
  deepReadSource: text("deep_read_source"),
  mentalModel: text("mental_model"),
  mentalModelExplanation: text("mental_model_explanation"),
  framework: text("framework"),
  frameworkExplanation: text("framework_explanation"),
  quote: text("quote"),
  quoteAuthor: text("quote_author"),
  executionTask: text("execution_task"),
  reflectionQuestion: text("reflection_question"),
  challenge: text("challenge"),
  implementation: text("implementation"),
  whyToday: text("why_today"),
  sources: text("sources").array(),
  knowledgeScore: integer("knowledge_score").default(0),
  implemented: boolean("implemented").notNull().default(false),
  savedForLater: boolean("saved_for_later").notNull().default(false),
  skipped: boolean("skipped").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});
export type DailyReading = typeof dailyReadings.$inferSelect;

export const deletionSurveys = pgTable("deletion_surveys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  userName: text("user_name"),
  userEmail: text("user_email"),
  userPlan: text("user_plan"),
  reason: text("reason").notNull(),
  duration: text("duration").notNull(),
  rating: text("rating").notNull(),
  favoriteFeature: text("favorite_feature").notNull(),
  wouldReturn: text("would_return").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertDeletionSurveySchema = createInsertSchema(deletionSurveys).omit({ id: true, createdAt: true });
export type InsertDeletionSurvey = z.infer<typeof insertDeletionSurveySchema>;
export type DeletionSurvey = typeof deletionSurveys.$inferSelect;

// ── Referral System ──────────────────────────────────────────────────────────
export const referralCodes = pgTable("referral_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  code: text("code").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});
export type ReferralCode = typeof referralCodes.$inferSelect;

export const referralClicks = pgTable("referral_clicks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});
export type ReferralClick = typeof referralClicks.$inferSelect;

// ── DM Automation (ManyChat-style) ─────────────────────────────────────────
export const dmTriggers = pgTable("dm_triggers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  keyword: text("keyword").notNull(),
  matchType: text("match_type").notNull().default("contains"), // exact | contains | starts_with
  replyMessage: text("reply_message").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  triggerCount: integer("trigger_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertDmTriggerSchema = createInsertSchema(dmTriggers).omit({ id: true, createdAt: true, triggerCount: true });
export type InsertDmTrigger = z.infer<typeof insertDmTriggerSchema>;
export type DmTrigger = typeof dmTriggers.$inferSelect;

export const dmSequences = pgTable("dm_sequences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertDmSequenceSchema = createInsertSchema(dmSequences).omit({ id: true, createdAt: true });
export type InsertDmSequence = z.infer<typeof insertDmSequenceSchema>;
export type DmSequence = typeof dmSequences.$inferSelect;

export const dmSequenceSteps = pgTable("dm_sequence_steps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sequenceId: varchar("sequence_id").notNull().references(() => dmSequences.id, { onDelete: "cascade" }),
  stepOrder: integer("step_order").notNull().default(0),
  delayDays: integer("delay_days").notNull().default(0),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertDmSequenceStepSchema = createInsertSchema(dmSequenceSteps).omit({ id: true, createdAt: true });
export type InsertDmSequenceStep = z.infer<typeof insertDmSequenceStepSchema>;
export type DmSequenceStep = typeof dmSequenceSteps.$inferSelect;

export const dmSequenceEnrollments = pgTable("dm_sequence_enrollments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sequenceId: varchar("sequence_id").notNull().references(() => dmSequences.id, { onDelete: "cascade" }),
  leadId: varchar("lead_id").notNull().references(() => dmLeads.id, { onDelete: "cascade" }),
  recipientIgId: text("recipient_ig_id").notNull(),
  currentStep: integer("current_step").notNull().default(0),
  completed: boolean("completed").notNull().default(false),
  nextSendAt: timestamp("next_send_at"),
  enrolledAt: timestamp("enrolled_at").defaultNow(),
});
export type DmSequenceEnrollment = typeof dmSequenceEnrollments.$inferSelect;

export const referralConversions = pgTable("referral_conversions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  referrerId: varchar("referrer_id").notNull().references(() => users.id),
  referredUserId: varchar("referred_user_id").references(() => users.id),
  referredEmail: text("referred_email"),
  registered: boolean("registered").notNull().default(true),
  converted: boolean("converted").notNull().default(false),
  creditAwarded: boolean("credit_awarded").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  convertedAt: timestamp("converted_at"),
});
export type ReferralConversion = typeof referralConversions.$inferSelect;

// ── Video Marketing / Webinars ─────────────────────────────────────────────
export const webinarStatusEnum = pgEnum("webinar_status", ["upcoming", "live", "completed", "cancelled"]);

export const webinars = pgTable("webinars", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  scheduledAt: timestamp("scheduled_at").notNull(),
  durationMinutes: integer("duration_minutes").notNull().default(60),
  maxAttendees: integer("max_attendees"),
  status: webinarStatusEnum("status").notNull().default("upcoming"),
  meetingCode: text("meeting_code").notNull().unique(),
  chatChannels: text("chat_channels").array().default(sql`'{}'::text[]`),
  offerUrl: text("offer_url"),
  offerTitle: text("offer_title"),
  thumbnailUrl: text("thumbnail_url"),
  isPublic: boolean("is_public").notNull().default(false),
  webinarType: text("webinar_type").notNull().default("live"),
  replayVideoUrl: text("replay_video_url"),
  presenterName: text("presenter_name"),
  videoQuality: text("video_quality").default("1080p"),
  views: integer("views").notNull().default(0),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  peakViewers: integer("peak_viewers").notNull().default(0),
  broadcastUrl: text("broadcast_url"),
  livekitRoomName: text("livekit_room_name"),
  seriesId: varchar("series_id"),
  waitingRoomVideoUrl: text("waiting_room_video_url"),
  waitingRoomMessage: text("waiting_room_message"),
  emailReminderEnabled: boolean("email_reminder_enabled").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export const insertWebinarSchema = createInsertSchema(webinars).omit({ id: true, createdAt: true, updatedAt: true, views: true });
export type InsertWebinar = z.infer<typeof insertWebinarSchema>;
export type Webinar = typeof webinars.$inferSelect;

export const webinarRegistrations = pgTable("webinar_registrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  webinarId: varchar("webinar_id").notNull().references(() => webinars.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  attended: boolean("attended").notNull().default(false),
  watchedDuration: integer("watched_duration").default(0), // seconds
  registeredAt: timestamp("registered_at").defaultNow(),
});
export const insertWebinarRegistrationSchema = createInsertSchema(webinarRegistrations).omit({ id: true, registeredAt: true, attended: true, watchedDuration: true });
export type InsertWebinarRegistration = z.infer<typeof insertWebinarRegistrationSchema>;
export type WebinarRegistration = typeof webinarRegistrations.$inferSelect;

export const videoEvents = pgTable("video_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  videoUrl: text("video_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  duration: integer("duration"), // seconds
  category: text("category").default("General"),
  tags: text("tags").array().default(sql`'{}'::text[]`),
  views: integer("views").notNull().default(0),
  isPublic: boolean("is_public").notNull().default(false),
  allowDownload: boolean("allow_download").notNull().default(false),
  videoType: text("video_type").notNull().default("standard"), // standard | vsl | webinar
  progressBarConfig: text("progress_bar_config"), // JSON stringified config
  leadGateEnabled: boolean("lead_gate_enabled").notNull().default(false),
  // Player branding
  brandColor: text("brand_color"),
  logoUrl: text("logo_url"),
  captionUrl: text("caption_url"),
  resumeEnabled: boolean("resume_enabled").notNull().default(false),
  autoplayNextEnabled: boolean("autoplay_next_enabled").notNull().default(false),
  // Protection
  domainWhitelist: text("domain_whitelist").array().default(sql`'{}'::text[]`),
  expiresAt: timestamp("expires_at"),
  passwordHash: text("password_hash"),
  // Urgency bar
  urgencyText: text("urgency_text"),
  urgencyEndsAt: timestamp("urgency_ends_at"),
  // Player controls
  defaultPlaybackSpeed: real("default_playback_speed").notNull().default(1.0),
  allowSpeedControl: boolean("allow_speed_control").notNull().default(true),
  allowQualityControl: boolean("allow_quality_control").notNull().default(true),
  // Oravini watermark
  showOraviniWatermark: boolean("show_oravini_watermark").notNull().default(true),
  oraviniWatermarkPosition: text("oravini_watermark_position").notNull().default("bottom-right"),
  // ── Wistia-like extensions ──────────────────────────────────────────────────
  // Approval workflow
  approvalStatus: text("approval_status").default("pending"), // pending | approved | changes_requested
  // Thumbnails
  animatedThumbnailUrl: text("animated_thumbnail_url"),
  // SEO
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  // Edit metadata for video editor (trim/split/stitch operations)
  editMetadata: text("edit_metadata"), // JSON {clips: [...], music: ...}
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertVideoEventSchema = createInsertSchema(videoEvents).omit({ id: true, createdAt: true, views: true });
export type InsertVideoEvent = z.infer<typeof insertVideoEventSchema>;
export type VideoEvent = typeof videoEvents.$inferSelect;

// ── Video Collections ─────────────────────────────────────────────────────────
export const videoCollections = pgTable("video_collections", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  thumbnailUrl: text("thumbnail_url"),
  isPublic: boolean("is_public").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertVideoCollectionSchema = createInsertSchema(videoCollections).omit({ id: true, createdAt: true });
export type InsertVideoCollection = z.infer<typeof insertVideoCollectionSchema>;
export type VideoCollection = typeof videoCollections.$inferSelect;

export const videoCollectionItems = pgTable("video_collection_items", {
  id: serial("id").primaryKey(),
  collectionId: integer("collection_id").notNull().references(() => videoCollections.id, { onDelete: "cascade" }),
  videoEventId: varchar("video_event_id").notNull().references(() => videoEvents.id, { onDelete: "cascade" }),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});
export type VideoCollectionItem = typeof videoCollectionItems.$inferSelect;

// ── Recording Comments / Reactions ─────────────────────────────────────────
export const recordingComments = pgTable("recording_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  videoEventId: varchar("video_event_id").notNull().references(() => videoEvents.id, { onDelete: "cascade" }),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  userName: text("user_name").notNull(),
  text: text("text").default(""),
  emoji: text("emoji"),
  timestamp: integer("timestamp").notNull().default(0), // seconds in video
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertRecordingCommentSchema = createInsertSchema(recordingComments).omit({ id: true, createdAt: true });
export type InsertRecordingComment = z.infer<typeof insertRecordingCommentSchema>;
export type RecordingComment = typeof recordingComments.$inferSelect;

// ── Recording Sequences (Loom-style multi-clip reels) ──────────────────────
export const recordingSequences = pgTable("recording_sequences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  transition: text("transition").notNull().default("fade"),
  clipIds: text("clip_ids").array().notNull().default(sql`ARRAY[]::text[]`),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export const insertRecordingSequenceSchema = createInsertSchema(recordingSequences).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertRecordingSequence = z.infer<typeof insertRecordingSequenceSchema>;
export type RecordingSequence = typeof recordingSequences.$inferSelect;

// ── Video Chapters ─────────────────────────────────────────────────────────────
export const videoChapters = pgTable("video_chapters", {
  id: serial("id").primaryKey(),
  videoEventId: varchar("video_event_id").notNull().references(() => videoEvents.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  startSeconds: integer("start_seconds").notNull().default(0),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertVideoChapterSchema = createInsertSchema(videoChapters).omit({ id: true, createdAt: true });
export type InsertVideoChapter = z.infer<typeof insertVideoChapterSchema>;
export type VideoChapter = typeof videoChapters.$inferSelect;

// ── Video CTAs (timed overlays) ───────────────────────────────────────────────
export const videoCtas = pgTable("video_ctas", {
  id: serial("id").primaryKey(),
  videoEventId: varchar("video_event_id").notNull().references(() => videoEvents.id, { onDelete: "cascade" }),
  type: text("type").notNull().default("button"), // button | banner | urgency
  text: text("text").notNull(),
  url: text("url"),
  appearAt: integer("appear_at").notNull().default(0), // seconds
  disappearAt: integer("disappear_at"),
  style: text("style").notNull().default("gold"), // gold | red | white
  clicks: integer("clicks").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertVideoCtaSchema = createInsertSchema(videoCtas).omit({ id: true, createdAt: true, clicks: true });
export type InsertVideoCta = z.infer<typeof insertVideoCtaSchema>;
export type VideoCta = typeof videoCtas.$inferSelect;

// ── Video Viewer Sessions (watch heatmap / viewer CRM) ────────────────────────
export const videoViewerSessions = pgTable("video_viewer_sessions", {
  id: serial("id").primaryKey(),
  videoEventId: varchar("video_event_id").notNull().references(() => videoEvents.id, { onDelete: "cascade" }),
  visitorId: text("visitor_id").notNull(),
  watchedSeconds: integer("watched_seconds").notNull().default(0),
  completionPct: integer("completion_pct").notNull().default(0),
  heatmapData: text("heatmap_data"), // JSON: {[second]: watchCount}
  ctaClicked: boolean("cta_clicked").notNull().default(false),
  country: text("country"),
  referrer: text("referrer"),
  createdAt: timestamp("created_at").defaultNow(),
  lastSeenAt: timestamp("last_seen_at").defaultNow(),
});
export const insertVideoViewerSessionSchema = createInsertSchema(videoViewerSessions).omit({ id: true, createdAt: true, lastSeenAt: true });
export type InsertVideoViewerSession = z.infer<typeof insertVideoViewerSessionSchema>;
export type VideoViewerSession = typeof videoViewerSessions.$inferSelect;

// ── Video Interactive Elements (annotations, turnstile, CTAs at timestamps) ──
export const videoInteractiveElements = pgTable("video_interactive_elements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  videoEventId: varchar("video_event_id").notNull().references(() => videoEvents.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // annotation | turnstile | cta
  timestamp: integer("timestamp").notNull(), // seconds
  endTimestamp: integer("end_timestamp"),
  // Annotation
  text: text("text"),
  url: text("url"),
  // Turnstile
  requireEmail: boolean("require_email").default(true),
  requireName: boolean("require_name").default(false),
  skipAllowed: boolean("skip_allowed").default(false),
  // CTA
  ctaType: text("cta_type"), // text | image | html
  ctaText: text("cta_text"),
  ctaButtonText: text("cta_button_text"),
  ctaButtonUrl: text("cta_button_url"),
  ctaImageUrl: text("cta_image_url"),
  ctaHtml: text("cta_html"),
  ctaPosition: text("cta_position").default("center"),
  // Stats
  impressions: integer("impressions").notNull().default(0),
  clicks: integer("clicks").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertVideoInteractiveElementSchema = createInsertSchema(videoInteractiveElements).omit({ id: true, createdAt: true, impressions: true, clicks: true });
export type InsertVideoInteractiveElement = z.infer<typeof insertVideoInteractiveElementSchema>;
export type VideoInteractiveElement = typeof videoInteractiveElements.$inferSelect;

// ── Video A/B Tests ───────────────────────────────────────────────────────────
export const videoAbTests = pgTable("video_ab_tests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  testType: text("test_type").notNull().default("video"), // video | thumbnail | cta
  videoAId: varchar("video_a_id").references(() => videoEvents.id, { onDelete: "cascade" }),
  videoBId: varchar("video_b_id").references(() => videoEvents.id, { onDelete: "cascade" }),
  // Variant overrides (when testing thumbnails or CTAs)
  variantAConfig: text("variant_a_config"),
  variantBConfig: text("variant_b_config"),
  splitRatio: integer("split_ratio").notNull().default(50), // percentage to A
  status: text("status").notNull().default("running"), // running | paused | ended
  // Stats
  playsA: integer("plays_a").notNull().default(0),
  playsB: integer("plays_b").notNull().default(0),
  conversionsA: integer("conversions_a").notNull().default(0),
  conversionsB: integer("conversions_b").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  endedAt: timestamp("ended_at"),
});
export const insertVideoAbTestSchema = createInsertSchema(videoAbTests).omit({ id: true, createdAt: true, playsA: true, playsB: true, conversionsA: true, conversionsB: true });
export type InsertVideoAbTest = z.infer<typeof insertVideoAbTestSchema>;
export type VideoAbTest = typeof videoAbTests.$inferSelect;

// ── Video Channels (Netflix-style branded pages) ─────────────────────────────
export const videoChannels = pgTable("video_channels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  slug: text("slug").unique(),
  theme: text("theme").notNull().default("dark"), // dark | light
  accentColor: text("accent_color").default("#d4b461"),
  coverUrl: text("cover_url"),
  logoUrl: text("logo_url"),
  subscribable: boolean("subscribable").notNull().default(true),
  subscriberCount: integer("subscriber_count").notNull().default(0),
  isPublic: boolean("is_public").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertVideoChannelSchema = createInsertSchema(videoChannels).omit({ id: true, createdAt: true, subscriberCount: true });
export type InsertVideoChannel = z.infer<typeof insertVideoChannelSchema>;
export type VideoChannel = typeof videoChannels.$inferSelect;

// ── Video Channel Episodes (videos in a channel) ──────────────────────────────
export const videoChannelEpisodes = pgTable("video_channel_episodes", {
  id: serial("id").primaryKey(),
  channelId: varchar("channel_id").notNull().references(() => videoChannels.id, { onDelete: "cascade" }),
  videoEventId: varchar("video_event_id").notNull().references(() => videoEvents.id, { onDelete: "cascade" }),
  section: text("section").default("Episodes"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});
export type VideoChannelEpisode = typeof videoChannelEpisodes.$inferSelect;

// ── Video Channel Subscribers ────────────────────────────────────────────────
export const videoChannelSubscribers = pgTable("video_channel_subscribers", {
  id: serial("id").primaryKey(),
  channelId: varchar("channel_id").notNull().references(() => videoChannels.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  name: text("name"),
  createdAt: timestamp("created_at").defaultNow(),
});
export type VideoChannelSubscriber = typeof videoChannelSubscribers.$inferSelect;

// ── Video Dubbing Jobs (AI dub into other languages) ──────────────────────────
export const videoDubbingJobs = pgTable("video_dubbing_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  videoEventId: varchar("video_event_id").notNull().references(() => videoEvents.id, { onDelete: "cascade" }),
  language: text("language").notNull(),
  jobType: text("job_type").notNull().default("dub"), // dub | captions
  status: text("status").notNull().default("processing"), // processing | done | failed
  outputUrl: text("output_url"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});
export const insertVideoDubbingJobSchema = createInsertSchema(videoDubbingJobs).omit({ id: true, createdAt: true, completedAt: true });
export type InsertVideoDubbingJob = z.infer<typeof insertVideoDubbingJobSchema>;
export type VideoDubbingJob = typeof videoDubbingJobs.$inferSelect;

// ── Video Comments (timestamped collaboration comments) ──────────────────────
export const videoCollabComments = pgTable("video_collab_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  videoEventId: varchar("video_event_id").notNull().references(() => videoEvents.id, { onDelete: "cascade" }),
  authorId: varchar("author_id").references(() => users.id, { onDelete: "set null" }),
  authorName: text("author_name").notNull(),
  timestamp: integer("timestamp"), // seconds (nullable = general comment)
  text: text("text").notNull(),
  resolved: boolean("resolved").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertVideoCollabCommentSchema = createInsertSchema(videoCollabComments).omit({ id: true, createdAt: true });
export type InsertVideoCollabComment = z.infer<typeof insertVideoCollabCommentSchema>;
export type VideoCollabComment = typeof videoCollabComments.$inferSelect;

export const webinarRecordings = pgTable("webinar_recordings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  webinarId: varchar("webinar_id").notNull().references(() => webinars.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  recordingUrl: text("recording_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  duration: integer("duration"), // seconds
  fileSize: text("file_size"),
  shareToken: text("share_token").unique(),
  views: integer("views").notNull().default(0),
  isPublic: boolean("is_public").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertWebinarRecordingSchema = createInsertSchema(webinarRecordings).omit({ id: true, createdAt: true, views: true });
export type InsertWebinarRecording = z.infer<typeof insertWebinarRecordingSchema>;
export type WebinarRecording = typeof webinarRecordings.$inferSelect;

export const webinarLandingPages = pgTable("webinar_landing_pages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  webinarId: varchar("webinar_id").notNull().references(() => webinars.id, { onDelete: "cascade" }).unique(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  slug: text("slug").notNull().unique(),
  headline: text("headline").notNull(),
  subheadline: text("subheadline"),
  description: text("description"),
  bodyContent: text("body_content"),
  heroImageUrl: text("hero_image_url"),
  presenterName: text("presenter_name"),
  presenterTitle: text("presenter_title"),
  presenterAvatarUrl: text("presenter_avatar_url"),
  bulletPoints: text("bullet_points").array().default(sql`'{}'::text[]`),
  ctaText: text("cta_text").default("Register Now — It's Free"),
  accentColor: text("accent_color").default("#d4b461"),
  isActive: boolean("is_active").notNull().default(true),
  published: boolean("published").notNull().default(false),
  chatEnabled: boolean("chat_enabled").notNull().default(false),
  chatSystemPrompt: text("chat_system_prompt"),
  sections: text("sections"), // JSON string of section array
  design: text("design"), // JSON string of theme config
  chatConfig: text("chat_config"), // JSON string of chat widget config
  views: integer("views").notNull().default(0),
  registrations: integer("registrations").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export const insertWebinarLandingPageSchema = createInsertSchema(webinarLandingPages).omit({ id: true, createdAt: true, updatedAt: true, views: true, registrations: true });
export type InsertWebinarLandingPage = z.infer<typeof insertWebinarLandingPageSchema>;
export type WebinarLandingPage = typeof webinarLandingPages.$inferSelect;

// ── Video Marketing: Contacts / CRM ─────────────────────────────────────────
export const webinarContacts = pgTable("webinar_contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name"),
  email: text("email"),
  phone: text("phone"),
  company: text("company"),
  source: text("source"),
  segment: text("segment").notNull().default("general"),
  stage: text("stage").notNull().default("lead"),
  webinarCode: text("webinar_code"),
  notes: text("notes"),
  conversionValue: real("conversion_value"),
  conversionNote: text("conversion_note"),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertWebinarContactSchema = createInsertSchema(webinarContacts).omit({ id: true, createdAt: true });
export type InsertWebinarContact = z.infer<typeof insertWebinarContactSchema>;
export type WebinarContact = typeof webinarContacts.$inferSelect;

// ── Video Marketing: Video Analytics Events ─────────────────────────────────
export const videoAnalyticsEvents = pgTable("video_analytics_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  videoId: varchar("video_id").notNull(),
  sessionId: text("session_id").notNull(),
  eventType: text("event_type").notNull(), // play, pause, seek, complete, progress, cta_click, lead_gate, buffer, error
  position: real("position").notNull().default(0),
  metadata: jsonb("metadata"), // { device, browser, os, referrer, country, city, screenWidth, etc. }
  createdAt: timestamp("created_at").defaultNow(),
});
export type VideoAnalyticsEvent = typeof videoAnalyticsEvents.$inferSelect;
export type InsertVideoAnalyticsEvent = typeof videoAnalyticsEvents.$inferInsert;

// ── Video Analytics: Aggregated Daily Stats ─────────────────────────────────
export const videoAnalyticsDailyStats = pgTable("video_analytics_daily_stats", {
  id: serial("id").primaryKey(),
  videoId: varchar("video_id").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  views: integer("views").notNull().default(0),
  uniqueViewers: integer("unique_viewers").notNull().default(0),
  plays: integer("plays").notNull().default(0),
  completions: integer("completions").notNull().default(0),
  totalWatchSeconds: integer("total_watch_seconds").notNull().default(0),
  avgCompletionPct: real("avg_completion_pct").notNull().default(0),
  ctaClicks: integer("cta_clicks").notNull().default(0),
  leadCaptures: integer("lead_captures").notNull().default(0),
  // Engagement
  avgEngagementPct: real("avg_engagement_pct").notNull().default(0),
  bounceCount: integer("bounce_count").notNull().default(0), // played < 3 seconds
  createdAt: timestamp("created_at").defaultNow(),
});
export type VideoAnalyticsDailyStat = typeof videoAnalyticsDailyStats.$inferSelect;

// ── Video Analytics: Heatmap Segments ───────────────────────────────────────
// Pre-computed engagement data per 1-second segment of the video
export const videoHeatmapSegments = pgTable("video_heatmap_segments", {
  id: serial("id").primaryKey(),
  videoId: varchar("video_id").notNull(),
  segmentSecond: integer("segment_second").notNull(), // 0, 1, 2, 3... (each second)
  viewCount: integer("view_count").notNull().default(0), // how many viewers watched this second
  replayCount: integer("replay_count").notNull().default(0), // how many times this second was replayed
  dropOffCount: integer("drop_off_count").notNull().default(0), // how many viewers stopped here
  updatedAt: timestamp("updated_at").defaultNow(),
});
export type VideoHeatmapSegment = typeof videoHeatmapSegments.$inferSelect;

// ── Video Analytics: Viewer Profiles ────────────────────────────────────────
// Enriched viewer data for the Viewer CRM
export const videoViewerProfiles = pgTable("video_viewer_profiles", {
  id: serial("id").primaryKey(),
  videoId: varchar("video_id").notNull(),
  sessionId: text("session_id").notNull(),
  visitorId: text("visitor_id"), // email if lead-gated, fingerprint otherwise
  // Device & Browser
  device: text("device"), // desktop | mobile | tablet
  browser: text("browser"), // Chrome | Safari | Firefox | Edge
  os: text("os"), // Windows | macOS | iOS | Android | Linux
  screenWidth: integer("screen_width"),
  // Location
  country: text("country"),
  city: text("city"),
  region: text("region"),
  // Source
  referrer: text("referrer"),
  referrerDomain: text("referrer_domain"),
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  // Engagement
  totalWatchSeconds: integer("total_watch_seconds").notNull().default(0),
  completionPct: integer("completion_pct").notNull().default(0),
  maxPosition: real("max_position").notNull().default(0),
  playCount: integer("play_count").notNull().default(1),
  pauseCount: integer("pause_count").notNull().default(0),
  seekCount: integer("seek_count").notNull().default(0),
  replayCount: integer("replay_count").notNull().default(0),
  ctaClicked: boolean("cta_clicked").notNull().default(false),
  ctaClickedAt: real("cta_clicked_at"), // position in seconds when CTA was clicked
  leadCaptured: boolean("lead_captured").notNull().default(false),
  // Timeline (JSON array of events: [{type, position, timestamp}])
  timeline: jsonb("timeline"),
  // Timestamps
  firstSeenAt: timestamp("first_seen_at").defaultNow(),
  lastSeenAt: timestamp("last_seen_at").defaultNow(),
});
export type VideoViewerProfile = typeof videoViewerProfiles.$inferSelect;
export type InsertVideoViewerProfile = typeof videoViewerProfiles.$inferInsert;

// ── User Feedback ──────────────────────────────────────────────────────────────
export const userFeedback = pgTable("user_feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  // Overall Experience
  overallRating: integer("overall_rating"), // 1-5
  easeOfUse: text("ease_of_use"), // "very_easy" | "easy" | "neutral" | "difficult" | "very_difficult"
  // Usage Context
  purposeToday: text("purpose_today"),
  completedPurpose: text("completed_purpose"), // "yes" | "no" | "partially"
  // What's Working Well
  mostLiked: text("most_liked"),
  mostUsefulFeature: text("most_useful_feature"),
  // Issues
  hadIssues: text("had_issues"), // "yes" | "no"
  issueType: text("issue_type"), // "bug" | "slow" | "confusing" | "missing_feature" | "other"
  issueDescription: text("issue_description"),
  issueFrequency: text("issue_frequency"), // "once" | "occasionally" | "frequently" | "always"
  // Improvements
  improvement: text("improvement"),
  wishedFeature: text("wished_feature"),
  immediateChange: text("immediate_change"),
  // Impact & Priority
  feedbackImportance: text("feedback_importance"), // "low" | "medium" | "high"
  wouldStopUsing: text("would_stop_using"), // "yes" | "no"
  // Satisfaction & Recommendation
  npsScore: integer("nps_score"), // 0-10
  npsReason: text("nps_reason"),
  source: text("source").notNull().default("dashboard"), // "dashboard" | "settings"
  submittedAt: timestamp("submitted_at").defaultNow(),
});

export const insertUserFeedbackSchema = createInsertSchema(userFeedback).omit({ id: true, submittedAt: true });
export type InsertUserFeedback = z.infer<typeof insertUserFeedbackSchema>;
export type UserFeedback = typeof userFeedback.$inferSelect;

// ── CONTENT INTELLIGENCE ENGINE ────────────────────────────────────────────
// Hook Library — Proven viral hooks trained from real data
export const hookTypeEnum = pgEnum("hook_type", ["curiosity", "authority", "storytelling", "controversy", "pain_point", "education", "proof", "question"]);

export const hookLibrary = pgTable("hook_library", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  hook: text("hook").notNull(),
  hookType: hookTypeEnum("hook_type").notNull(),
  platform: platformEnum("platform").notNull(),
  niche: text("niche").notNull(),
  viralScore: real("viral_score").notNull().default(0), // 0-10
  avgViews: integer("avg_views").notNull().default(0),
  avgEngagement: real("avg_engagement").notNull().default(0),
  usageCount: integer("usage_count").notNull().default(0),
  source: text("source").notNull().default("user_content"), // user_content | admin_curated | ai_generated
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertHookLibrarySchema = createInsertSchema(hookLibrary).omit({ id: true, createdAt: true });
export type InsertHookLibrary = z.infer<typeof insertHookLibrarySchema>;
export type HookLibrary = typeof hookLibrary.$inferSelect;

// Winning Patterns — Content that performed well
export const winningPatterns = pgTable("winning_patterns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  postId: varchar("post_id").references(() => contentPosts.id, { onDelete: "set null" }),
  platform: platformEnum("platform").notNull(),
  contentType: contentTypeEnum("content_type").notNull(),
  funnelStage: funnelStageEnum("funnel_stage").notNull(),
  hook: text("hook").notNull(),
  hookType: hookTypeEnum("hook_type").notNull(),
  structure: text("structure").notNull(), // "Hook → Problem → Solution → CTA"
  cta: text("cta"),
  niche: text("niche").notNull(),
  views: integer("views").notNull().default(0),
  likes: integer("likes").notNull().default(0),
  comments: integer("comments").notNull().default(0),
  saves: integer("saves").notNull().default(0),
  engagementRate: real("engagement_rate").notNull().default(0),
  viralScore: real("viral_score").notNull().default(0), // 0-10
  performanceReason: text("performance_reason"), // Why it worked
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertWinningPatternSchema = createInsertSchema(winningPatterns).omit({ id: true, createdAt: true });
export type InsertWinningPattern = z.infer<typeof insertWinningPatternSchema>;
export type WinningPattern = typeof winningPatterns.$inferSelect;

// Brand Voice Profiles — User's unique voice extracted from their content
export const brandVoiceProfiles = pgTable("brand_voice_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  tone: text("tone").notNull(), // authoritative | casual | inspirational | educational | humorous
  vocabulary: text("vocabulary").array(), // Unique words they use often
  sentenceStructure: text("sentence_structure").notNull(), // short punchy | long flowing | mix
  punctuationStyle: text("punctuation_style").notNull(), // lots of emojis | minimal | professional
  perspective: text("perspective").notNull(), // first person | second person | third person
  uniquePatterns: text("unique_patterns").array(), // Signature phrases
  voiceFingerprint: text("voice_fingerprint").notNull(), // One sentence summary
  analyzedPostsCount: integer("analyzed_posts_count").notNull().default(0),
  lastAnalyzedAt: timestamp("last_analyzed_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export const insertBrandVoiceProfileSchema = createInsertSchema(brandVoiceProfiles).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBrandVoiceProfile = z.infer<typeof insertBrandVoiceProfileSchema>;
export type BrandVoiceProfile = typeof brandVoiceProfiles.$inferSelect;

// Content Calendars — Monthly content plans
export const contentCalendars = pgTable("content_calendars", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  month: text("month").notNull(), // "2025-10"
  niche: text("niche").notNull(),
  platform: platformEnum("platform").notNull(),
  goal: text("goal").notNull(),
  strategy: jsonb("strategy"), // TOFU/MOFU/BOFU distribution, posting frequency, content mix
  posts: jsonb("posts"), // Array of 30 days of content
  status: text("status").notNull().default("draft"), // draft | active | completed
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export const insertContentCalendarSchema = createInsertSchema(contentCalendars).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertContentCalendar = z.infer<typeof insertContentCalendarSchema>;
export type ContentCalendar = typeof contentCalendars.$inferSelect;

// Content Templates — Reusable content structures
export const contentTemplates = pgTable("content_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  funnelStage: funnelStageEnum("funnel_stage").notNull(),
  platform: platformEnum("platform").notNull(),
  contentType: contentTypeEnum("content_type").notNull(),
  template: jsonb("template"), // { hook, body, cta, structure }
  usageCount: integer("usage_count").notNull().default(0),
  isPublic: boolean("is_public").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export const insertContentTemplateSchema = createInsertSchema(contentTemplates).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertContentTemplate = z.infer<typeof insertContentTemplateSchema>;
export type ContentTemplate = typeof contentTemplates.$inferSelect;

// Platform Training Data — Platform-specific patterns that work
export const platformTrainingData = pgTable("platform_training_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  platform: platformEnum("platform").notNull(),
  contentType: contentTypeEnum("content_type").notNull(),
  pattern: text("pattern").notNull(), // "Hook in first 3 seconds", "Jump cuts every 2-3s"
  category: text("category").notNull(), // "hook_rules" | "retention_tricks" | "cta_rules" | "structure"
  description: text("description").notNull(),
  examples: jsonb("examples"), // Array of real examples
  effectiveness: real("effectiveness").notNull().default(0), // 0-10
  source: text("source").notNull().default("admin_curated"),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertPlatformTrainingDataSchema = createInsertSchema(platformTrainingData).omit({ id: true, createdAt: true });
export type InsertPlatformTrainingData = z.infer<typeof insertPlatformTrainingDataSchema>;
export type PlatformTrainingData = typeof platformTrainingData.$inferSelect;

// Funnel Stage Training — Examples for each funnel stage
export const funnelStageTraining = pgTable("funnel_stage_training", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  funnelStage: funnelStageEnum("funnel_stage").notNull(),
  purpose: text("purpose").notNull(),
  contentTypes: text("content_types").array().notNull(),
  hookTypes: text("hook_types").array().notNull(),
  ctaTypes: text("cta_types").array().notNull(),
  examples: jsonb("examples"), // Array of proven examples
  bestPractices: text("best_practices").array(),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertFunnelStageTrainingSchema = createInsertSchema(funnelStageTraining).omit({ id: true, createdAt: true });
export type InsertFunnelStageTraining = z.infer<typeof insertFunnelStageTrainingSchema>;
export type FunnelStageTraining = typeof funnelStageTraining.$inferSelect;

// ── Video Marketing: Custom Domains ──────────────────────────────────────────
export const webinarDomains = pgTable("webinar_domains", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  domain: text("domain").notNull().unique(),
  status: text("status").notNull().default("pending"), // pending | active | failed
  targetSlug: text("target_slug"),
  verifyToken: text("verify_token"),
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertWebinarDomainSchema = createInsertSchema(webinarDomains).omit({ id: true, createdAt: true, verifiedAt: true });
export type InsertWebinarDomain = z.infer<typeof insertWebinarDomainSchema>;
export type WebinarDomain = typeof webinarDomains.$inferSelect;

// ── Video Marketing: Broadcast / Livekit Settings (per user) ─────────────────
export const videoMarketingSettings = pgTable("video_marketing_settings", {
  userId: varchar("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  livekitUrl: text("livekit_url"),
  livekitKey: text("livekit_key"),
  livekitSecret: text("livekit_secret"),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export type VideoMarketingSettings = typeof videoMarketingSettings.$inferSelect;

// ── Webinar Live Events (analytics) ───────────────────────────────────────────
export const webinarEvents = pgTable("webinar_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  webinarId: varchar("webinar_id").notNull().references(() => webinars.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(), // viewer_join | viewer_leave | chat | qa | reaction | raise_hand
  viewerName: text("viewer_name"),
  viewerId: text("viewer_id"),
  data: jsonb("data"),
  ts: timestamp("ts").defaultNow(),
});
export const insertWebinarEventSchema = createInsertSchema(webinarEvents).omit({ id: true, ts: true });
export type InsertWebinarEvent = z.infer<typeof insertWebinarEventSchema>;
export type WebinarEvent = typeof webinarEvents.$inferSelect;

// ── Webinar Series ─────────────────────────────────────────────────────────────
export const webinarSeries = pgTable("webinar_series", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  schedule: text("schedule").notNull().default("weekly"), // weekly | biweekly | monthly
  dayOfWeek: integer("day_of_week").notNull().default(1), // 0=Sun…6=Sat
  timeHour: integer("time_hour").notNull().default(19),
  timeMinute: integer("time_minute").notNull().default(0),
  timezone: text("timezone").notNull().default("America/New_York"),
  durationMinutes: integer("duration_minutes").notNull().default(60),
  maxAttendees: integer("max_attendees"),
  presenterName: text("presenter_name"),
  webinarType: text("webinar_type").notNull().default("live"),
  registrationSlug: text("registration_slug"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export const insertWebinarSeriesSchema = createInsertSchema(webinarSeries).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWebinarSeries = z.infer<typeof insertWebinarSeriesSchema>;
export type WebinarSeries = typeof webinarSeries.$inferSelect;

// ── Webinar Polls ─────────────────────────────────────────────────────────────
export const webinarPolls = pgTable("webinar_polls", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  webinarId: varchar("webinar_id").notNull().references(() => webinars.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  options: jsonb("options").notNull().$type<string[]>(),
  isActive: boolean("is_active").notNull().default(false),
  showResults: boolean("show_results").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertWebinarPollSchema = createInsertSchema(webinarPolls).omit({ id: true, createdAt: true });
export type InsertWebinarPoll = z.infer<typeof insertWebinarPollSchema>;
export type WebinarPoll = typeof webinarPolls.$inferSelect;

export const webinarPollVotes = pgTable("webinar_poll_votes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pollId: varchar("poll_id").notNull().references(() => webinarPolls.id, { onDelete: "cascade" }),
  webinarId: varchar("webinar_id").notNull(),
  viewerId: text("viewer_id").notNull(),
  viewerName: text("viewer_name"),
  optionIndex: integer("option_index").notNull(),
  ts: timestamp("ts").defaultNow(),
});
export type WebinarPollVote = typeof webinarPollVotes.$inferSelect;

// ── Webinar Viewer Sessions (live viewer tracking) ─────────────────────────
export const webinarViewerSessions = pgTable("webinar_viewer_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  webinarId: varchar("webinar_id").notNull().references(() => webinars.id, { onDelete: "cascade" }),
  viewerId: text("viewer_id").notNull(),
  viewerName: text("viewer_name").notNull().default("Anonymous"),
  joinedAt: timestamp("joined_at").defaultNow(),
  lastHeartbeatAt: timestamp("last_heartbeat_at").defaultNow(),
  leftAt: timestamp("left_at"),
  watchedSeconds: integer("watched_seconds").notNull().default(0),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  country: text("country"),
  referrer: text("referrer"),
  isActive: boolean("is_active").notNull().default(true),
});
export const insertWebinarViewerSessionSchema = createInsertSchema(webinarViewerSessions).omit({ id: true, joinedAt: true, lastHeartbeatAt: true, leftAt: true });
export type InsertWebinarViewerSession = z.infer<typeof insertWebinarViewerSessionSchema>;
export type WebinarViewerSession = typeof webinarViewerSessions.$inferSelect;

// ── Webinar Analytics (aggregated per-webinar stats) ────────────────────────
export const webinarAnalytics = pgTable("webinar_analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  webinarId: varchar("webinar_id").notNull().references(() => webinars.id, { onDelete: "cascade" }).unique(),
  totalViewers: integer("total_viewers").notNull().default(0),
  peakConcurrent: integer("peak_concurrent").notNull().default(0),
  avgWatchSeconds: real("avg_watch_seconds").notNull().default(0),
  totalChatMessages: integer("total_chat_messages").notNull().default(0),
  totalReactions: integer("total_reactions").notNull().default(0),
  totalQuestions: integer("total_questions").notNull().default(0),
  totalPollVotes: integer("total_poll_votes").notNull().default(0),
  totalCtaClicks: integer("total_cta_clicks").notNull().default(0),
  engagementRate: real("engagement_rate").notNull().default(0),
  showRate: real("show_rate").notNull().default(0),
  completionRate: real("completion_rate").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export const insertWebinarAnalyticsSchema = createInsertSchema(webinarAnalytics).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWebinarAnalytics = z.infer<typeof insertWebinarAnalyticsSchema>;
export type WebinarAnalytics = typeof webinarAnalytics.$inferSelect;

// ── DM Advanced Features ───────────────────────────────────────────────────

export const commentAutoReplies = pgTable("comment_auto_replies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  keyword: text("keyword"),
  postUrl: text("post_url"),
  replyMessage: text("reply_message").notNull(),
  alsoDm: boolean("also_dm").notNull().default(false),
  dmMessage: text("dm_message"),
  isActive: boolean("is_active").notNull().default(true),
  triggerCount: integer("trigger_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertCommentAutoReplySchema = createInsertSchema(commentAutoReplies).omit({ id: true, createdAt: true, triggerCount: true });
export type InsertCommentAutoReply = z.infer<typeof insertCommentAutoReplySchema>;
export type CommentAutoReply = typeof commentAutoReplies.$inferSelect;

export const storyReplyConfigs = pgTable("story_reply_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  replyMessage: text("reply_message").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});
export type StoryReplyConfig = typeof storyReplyConfigs.$inferSelect;

export const dmFlows = pgTable("dm_flows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  triggerKeyword: text("trigger_keyword"),
  nodes: jsonb("nodes").notNull().default(sql`'[]'::jsonb`),
  edges: jsonb("edges").notNull().default(sql`'[]'::jsonb`),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export const insertDmFlowSchema = createInsertSchema(dmFlows).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDmFlow = z.infer<typeof insertDmFlowSchema>;
export type DmFlow = typeof dmFlows.$inferSelect;

export const dmContactTags = pgTable("dm_contact_tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").notNull().references(() => dmLeads.id, { onDelete: "cascade" }),
  tag: text("tag").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
export type DmContactTag = typeof dmContactTags.$inferSelect;

export const aiBotConfigs = pgTable("ai_bot_configs", {
  userId: varchar("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  isActive: boolean("is_active").notNull().default(false),
  personality: text("personality").notNull().default("friendly"),
  instructions: text("instructions"),
  fallbackMessage: text("fallback_message"),
  keywordsOnly: boolean("keywords_only").notNull().default(false),
  keywords: text("keywords").array(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export type AiBotConfig = typeof aiBotConfigs.$inferSelect;

export const optInLinks = pgTable("opt_in_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  refCode: text("ref_code").notNull().unique(),
  welcomeMessage: text("welcome_message"),
  sequenceId: varchar("sequence_id").references(() => dmSequences.id, { onDelete: "set null" }),
  clickCount: integer("click_count").notNull().default(0),
  optInCount: integer("opt_in_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertOptInLinkSchema = createInsertSchema(optInLinks).omit({ id: true, createdAt: true, clickCount: true, optInCount: true });
export type InsertOptInLink = z.infer<typeof insertOptInLinkSchema>;
export type OptInLink = typeof optInLinks.$inferSelect;

// ── Contact Custom Fields ───────────────────────────────────────────────────
export const contactCustomFieldDefs = pgTable("contact_custom_field_defs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  fieldKey: text("field_key").notNull(),
  fieldType: text("field_type").notNull().default("text"),
  createdAt: timestamp("created_at").defaultNow(),
});
export type ContactCustomFieldDef = typeof contactCustomFieldDefs.$inferSelect;

export const contactCustomFieldValues = pgTable("contact_custom_field_values", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").notNull().references(() => dmLeads.id, { onDelete: "cascade" }),
  fieldDefId: varchar("field_def_id").notNull().references(() => contactCustomFieldDefs.id, { onDelete: "cascade" }),
  value: text("value"),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export type ContactCustomFieldValue = typeof contactCustomFieldValues.$inferSelect;

// ── Welcome DM ──────────────────────────────────────────────────────────────
export const welcomeDmConfigs = pgTable("welcome_dm_configs", {
  userId: varchar("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  isActive: boolean("is_active").notNull().default(false),
  message: text("message").notNull().default(""),
  delayMinutes: integer("delay_minutes").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export type WelcomeDmConfig = typeof welcomeDmConfigs.$inferSelect;

// ── Outbound Webhooks ───────────────────────────────────────────────────────
export const outboundWebhooks = pgTable("outbound_webhooks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  url: text("url").notNull(),
  triggerEvent: text("trigger_event").notNull(),
  triggerValue: text("trigger_value"),
  isActive: boolean("is_active").notNull().default(true),
  fireCount: integer("fire_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});
export type OutboundWebhook = typeof outboundWebhooks.$inferSelect;

// ── Click Tracking Links ────────────────────────────────────────────────────
export const dmClickLinks = pgTable("dm_click_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  originalUrl: text("original_url").notNull(),
  shortCode: text("short_code").notNull().unique(),
  label: text("label"),
  clickCount: integer("click_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});
export type DmClickLink = typeof dmClickLinks.$inferSelect;

export const dmClickEvents = pgTable("dm_click_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  linkId: varchar("link_id").notNull().references(() => dmClickLinks.id, { onDelete: "cascade" }),
  leadId: varchar("lead_id").references(() => dmLeads.id, { onDelete: "set null" }),
  clickedAt: timestamp("clicked_at").defaultNow(),
  ipAddress: text("ip_address"),
});
export type DmClickEvent = typeof dmClickEvents.$inferSelect;

// ── DM Funnel Events ────────────────────────────────────────────────────────
export const dmFunnelEvents = pgTable("dm_funnel_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  leadId: varchar("lead_id").references(() => dmLeads.id, { onDelete: "set null" }),
  flowId: varchar("flow_id").references(() => dmFlows.id, { onDelete: "set null" }),
  eventType: text("event_type").notNull(),
  metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").defaultNow(),
});
export type DmFunnelEvent = typeof dmFunnelEvents.$inferSelect;

// ── Conversation Notes ──────────────────────────────────────────────────────
export const conversationNotes = pgTable("conversation_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  igUserId: text("ig_user_id").notNull(),
  note: text("note").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
export type ConversationNote = typeof conversationNotes.$inferSelect;

// ── Scheduled Broadcasts ────────────────────────────────────────────────────
export const dmScheduledBroadcasts = pgTable("dm_scheduled_broadcasts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  message: text("message").notNull(),
  targetTag: text("target_tag"),
  targetStatus: text("target_status"),
  scheduledAt: timestamp("scheduled_at").notNull(),
  sentAt: timestamp("sent_at"),
  recipientCount: integer("recipient_count").notNull().default(0),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});
export type DmScheduledBroadcast = typeof dmScheduledBroadcasts.$inferSelect;

// ── NICHE INTELLIGENCE FEED ───────────────────────────────────────────
// Aggregated performance data by niche — the network effect moat
export const nicheIntelligence = pgTable("niche_intelligence", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  niche: text("niche").notNull(),
  platform: platformEnum("platform"),
  hookType: hookTypeEnum("hook_type"),
  contentType: contentTypeEnum("content_type"),
  funnelStage: funnelStageEnum("funnel_stage"),

  // Aggregate metrics
  avgViews: integer("avg_views").notNull().default(0),
  avgLikes: integer("avg_likes").notNull().default(0),
  avgComments: integer("avg_comments").notNull().default(0),
  avgSaves: integer("avg_saves").notNull().default(0),
  avgShares: integer("avg_shares").notNull().default(0),
  avgEngagementRate: real("avg_engagement_rate").notNull().default(0),
  avgViralScore: real("avg_viral_score").notNull().default(0),

  // Top performing
  topHookType: text("top_hook_type"),
  topContentType: text("top_content_type"),
  topStructure: text("top_structure"),

  // Volume
  totalPosts: integer("total_posts").notNull().default(0),
  totalUsers: integer("total_users").notNull().default(0),
  totalWinningPatterns: integer("total_winning_patterns").notNull().default(0),

  // Trend
  trend30d: real("trend_30d").notNull().default(0),

  // Health score (0-100 composite)
  healthScore: real("health_score"),
  healthLabel: text("health_label"),

  lastCalculatedAt: timestamp("last_calculated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export type NicheIntelligence = typeof nicheIntelligence.$inferSelect;
export type InsertNicheIntelligence = typeof nicheIntelligence.$inferInsert;

// ── SMS Marketing ─────────────────────────────────────────────────────────
export const smsSequences = pgTable("sms_sequences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  trigger: text("trigger").notNull().default("manual"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertSmsSequenceSchema = createInsertSchema(smsSequences).omit({ id: true, createdAt: true });
export type InsertSmsSequence = z.infer<typeof insertSmsSequenceSchema>;
export type SmsSequence = typeof smsSequences.$inferSelect;

export const smsSequenceSteps = pgTable("sms_sequence_steps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sequenceId: varchar("sequence_id").notNull().references(() => smsSequences.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  delayMinutes: integer("delay_minutes").notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertSmsSequenceStepSchema = createInsertSchema(smsSequenceSteps).omit({ id: true, createdAt: true });
export type InsertSmsSequenceStep = z.infer<typeof insertSmsSequenceStepSchema>;
export type SmsSequenceStep = typeof smsSequenceSteps.$inferSelect;

export const smsEnrollments = pgTable("sms_enrollments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  phone: text("phone").notNull(),
  sequenceId: varchar("sequence_id").notNull().references(() => smsSequences.id, { onDelete: "cascade" }),
  currentStep: integer("current_step").notNull().default(0),
  completed: boolean("completed").notNull().default(false),
  unsubscribed: boolean("unsubscribed").notNull().default(false),
  enrolledAt: timestamp("enrolled_at").defaultNow(),
  nextSendAt: timestamp("next_send_at"),
});
export type SmsEnrollment = typeof smsEnrollments.$inferSelect;

export const smsLogs = pgTable("sms_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  toPhone: text("to_phone").notNull(),
  message: text("message").notNull(),
  sequenceStepId: varchar("sequence_step_id"),
  broadcastId: varchar("broadcast_id"),
  sentAt: timestamp("sent_at").defaultNow(),
});
export type SmsLog = typeof smsLogs.$inferSelect;

export const smsBroadcasts = pgTable("sms_broadcasts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  message: text("message").notNull(),
  segment: text("segment").notNull().default("all"),
  recipientsCount: integer("recipients_count"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertSmsBroadcastSchema = createInsertSchema(smsBroadcasts).omit({ id: true, createdAt: true, sentAt: true, recipientsCount: true });
export type InsertSmsBroadcast = z.infer<typeof insertSmsBroadcastSchema>;
export type SmsBroadcast = typeof smsBroadcasts.$inferSelect;

export const smsCarrierGateways = pgTable("sms_carrier_gateways", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  phone: text("phone").notNull().unique(),
  carrierName: text("carrier_name").notNull().default("unknown"),
  gatewayDomain: text("gateway_domain").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export type SmsCarrierGateway = typeof smsCarrierGateways.$inferSelect;

export const smsUnsubscribes = pgTable("sms_unsubscribes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  phone: text("phone").notNull().unique(),
  unsubscribedAt: timestamp("unsubscribed_at").defaultNow(),
});

export const smsTemplates = pgTable("sms_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  message: text("message").notNull(),
  category: text("category").notNull().default("general"),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertSmsTemplateSchema = createInsertSchema(smsTemplates).omit({ id: true, createdAt: true });
export type InsertSmsTemplate = z.infer<typeof insertSmsTemplateSchema>;
export type SmsTemplate = typeof smsTemplates.$inferSelect;

export const smsContactTags = pgTable("sms_contact_tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  color: text("color").notNull().default("#d4b461"),
  createdAt: timestamp("created_at").defaultNow(),
});
export type SmsContactTag = typeof smsContactTags.$inferSelect;

export const smsContactTagAssignments = pgTable("sms_contact_tag_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  phone: text("phone").notNull(),
  tagId: varchar("tag_id").notNull().references(() => smsContactTags.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});
export type SmsContactTagAssignment = typeof smsContactTagAssignments.$inferSelect;

export const smsStepVariants = pgTable("sms_step_variants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  stepId: varchar("step_id").notNull().references(() => smsSequenceSteps.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  isControl: boolean("is_control").notNull().default(false),
  opens: integer("opens").notNull().default(0),
  clicks: integer("clicks").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});
export type SmsStepVariant = typeof smsStepVariants.$inferSelect;

// ── Niche Trend Signals ──────────────────────────────────────────────────
// Niche Trend Signals — real-time trending patterns per niche
export const nicheTrends = pgTable("niche_trends", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  niche: text("niche").notNull(),
  platform: platformEnum("platform"),
  trendType: text("trend_type").notNull(),
  trendValue: text("trend_value").notNull(),
  momentum: text("momentum").notNull().default("stable"),
  engagementDelta: real("engagement_delta").notNull().default(0),
  sampleCount: integer("sample_count").notNull().default(0),
  samplePostIds: jsonb("sample_post_ids").default(sql`'[]'::jsonb`),
  detectedAt: timestamp("detected_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export type NicheTrend = typeof nicheTrends.$inferSelect;
export type InsertNicheTrend = typeof nicheTrends.$inferInsert;

// ── Webinar Panelists (Multi-Panelist + Role System) ─────────────────────────
export const webinarRoleEnum = pgEnum("webinar_role", ["host", "co_host", "panelist", "attendee"]);

export const webinarPanelists = pgTable("webinar_panelists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  webinarId: varchar("webinar_id").notNull().references(() => webinars.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  name: text("name").notNull(),
  role: webinarRoleEnum("role").notNull().default("panelist"),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  inviteToken: text("invite_token").notNull().unique(),
  status: text("status").notNull().default("invited"), // invited | accepted | declined | joined
  canShareScreen: boolean("can_share_screen").notNull().default(true),
  canChat: boolean("can_chat").notNull().default(true),
  canManagePolls: boolean("can_manage_polls").notNull().default(false),
  canMuteOthers: boolean("can_mute_others").notNull().default(false),
  canRemoveAttendees: boolean("can_remove_attendees").notNull().default(false),
  avatarUrl: text("avatar_url"),
  joinedAt: timestamp("joined_at"),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertWebinarPanelistSchema = createInsertSchema(webinarPanelists).omit({ id: true, createdAt: true, joinedAt: true });
export type InsertWebinarPanelist = z.infer<typeof insertWebinarPanelistSchema>;
export type WebinarPanelist = typeof webinarPanelists.$inferSelect;

// ── Webinar Backstage / Green Room ───────────────────────────────────────────
export const webinarBackstageMessages = pgTable("webinar_backstage_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  webinarId: varchar("webinar_id").notNull().references(() => webinars.id, { onDelete: "cascade" }),
  senderName: text("sender_name").notNull(),
  senderRole: text("sender_role").notNull().default("host"),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
export type WebinarBackstageMessage = typeof webinarBackstageMessages.$inferSelect;

// ── Webinar Practice Sessions ────────────────────────────────────────────────
export const webinarPracticeSessions = pgTable("webinar_practice_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  webinarId: varchar("webinar_id").notNull().references(() => webinars.id, { onDelete: "cascade" }),
  startedBy: varchar("started_by").notNull(),
  startedAt: timestamp("started_at").defaultNow(),
  endedAt: timestamp("ended_at"),
  notes: text("notes"),
  participants: jsonb("participants").$type<string[]>().default(sql`'[]'::jsonb`),
});
export type WebinarPracticeSession = typeof webinarPracticeSessions.$inferSelect;

// ── Webinar Breakout Rooms ───────────────────────────────────────────────────
export const webinarBreakoutRooms = pgTable("webinar_breakout_rooms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  webinarId: varchar("webinar_id").notNull().references(() => webinars.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  topic: text("topic"),
  maxParticipants: integer("max_participants"),
  assignmentType: text("assignment_type").notNull().default("manual"), // manual | auto | self_select
  isOpen: boolean("is_open").notNull().default(false),
  duration: integer("duration"), // minutes
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertWebinarBreakoutRoomSchema = createInsertSchema(webinarBreakoutRooms).omit({ id: true, createdAt: true });
export type InsertWebinarBreakoutRoom = z.infer<typeof insertWebinarBreakoutRoomSchema>;
export type WebinarBreakoutRoom = typeof webinarBreakoutRooms.$inferSelect;

export const webinarBreakoutParticipants = pgTable("webinar_breakout_participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roomId: varchar("room_id").notNull().references(() => webinarBreakoutRooms.id, { onDelete: "cascade" }),
  viewerId: text("viewer_id").notNull(),
  viewerName: text("viewer_name").notNull(),
  joinedAt: timestamp("joined_at").defaultNow(),
  leftAt: timestamp("left_at"),
});
export type WebinarBreakoutParticipant = typeof webinarBreakoutParticipants.$inferSelect;

// ── Webinar Email Automation ─────────────────────────────────────────────────
export const webinarEmails = pgTable("webinar_emails", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  webinarId: varchar("webinar_id").notNull().references(() => webinars.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // confirmation | reminder_24h | reminder_1h | reminder_15m | followup | replay
  subject: text("subject").notNull(),
  bodyHtml: text("body_html").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  sendAt: timestamp("send_at"), // null = send immediately on trigger
  sentCount: integer("sent_count").notNull().default(0),
  openCount: integer("open_count").notNull().default(0),
  clickCount: integer("click_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertWebinarEmailSchema = createInsertSchema(webinarEmails).omit({ id: true, createdAt: true, sentCount: true, openCount: true, clickCount: true });
export type InsertWebinarEmail = z.infer<typeof insertWebinarEmailSchema>;
export type WebinarEmail = typeof webinarEmails.$inferSelect;

export const webinarEmailLogs = pgTable("webinar_email_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  webinarEmailId: varchar("webinar_email_id").notNull().references(() => webinarEmails.id, { onDelete: "cascade" }),
  recipientEmail: text("recipient_email").notNull(),
  recipientName: text("recipient_name"),
  sentAt: timestamp("sent_at").defaultNow(),
  openedAt: timestamp("opened_at"),
  clickedAt: timestamp("clicked_at"),
  bounced: boolean("bounced").notNull().default(false),
});
export type WebinarEmailLog = typeof webinarEmailLogs.$inferSelect;

// ── Webinar Post-Event Survey ────────────────────────────────────────────────
export const webinarSurveys = pgTable("webinar_surveys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  webinarId: varchar("webinar_id").notNull().references(() => webinars.id, { onDelete: "cascade" }),
  title: text("title").notNull().default("How was the webinar?"),
  questions: jsonb("questions").notNull().$type<{ id: string; type: string; question: string; options?: string[] }[]>(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertWebinarSurveySchema = createInsertSchema(webinarSurveys).omit({ id: true, createdAt: true });
export type InsertWebinarSurvey = z.infer<typeof insertWebinarSurveySchema>;
export type WebinarSurvey = typeof webinarSurveys.$inferSelect;

export const webinarSurveyResponses = pgTable("webinar_survey_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  surveyId: varchar("survey_id").notNull().references(() => webinarSurveys.id, { onDelete: "cascade" }),
  viewerId: text("viewer_id").notNull(),
  viewerName: text("viewer_name"),
  viewerEmail: text("viewer_email"),
  answers: jsonb("answers").notNull().$type<Record<string, string | number>>(),
  rating: integer("rating"), // overall 1-5
  submittedAt: timestamp("submitted_at").defaultNow(),
});
export type WebinarSurveyResponse = typeof webinarSurveyResponses.$inferSelect;

// ── Webinar Templates ────────────────────────────────────────────────────────
export const webinarTemplates = pgTable("webinar_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  config: jsonb("config").notNull(), // { title, description, duration, webinarType, videoQuality, emails, survey, branding }
  thumbnailUrl: text("thumbnail_url"),
  usageCount: integer("usage_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertWebinarTemplateSchema = createInsertSchema(webinarTemplates).omit({ id: true, createdAt: true, usageCount: true });
export type InsertWebinarTemplate = z.infer<typeof insertWebinarTemplateSchema>;
export type WebinarTemplate = typeof webinarTemplates.$inferSelect;

// ── Webinar Live Captions ────────────────────────────────────────────────────
export const webinarCaptions = pgTable("webinar_captions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  webinarId: varchar("webinar_id").notNull().references(() => webinars.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  speakerName: text("speaker_name"),
  language: text("language").notNull().default("en"),
  startTime: real("start_time").notNull(), // seconds from webinar start
  endTime: real("end_time"),
  isFinal: boolean("is_final").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});
export type WebinarCaption = typeof webinarCaptions.$inferSelect;

// ── Webinar Transcription (full post-event) ──────────────────────────────────
export const webinarTranscripts = pgTable("webinar_transcripts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  webinarId: varchar("webinar_id").notNull().references(() => webinars.id, { onDelete: "cascade" }).unique(),
  fullText: text("full_text").notNull(),
  segments: jsonb("segments").$type<{ start: number; end: number; speaker: string; text: string }[]>(),
  language: text("language").notNull().default("en"),
  generatedAt: timestamp("generated_at").defaultNow(),
});
export type WebinarTranscript = typeof webinarTranscripts.$inferSelect;

// ── Webinar Attendee Engagement Scores ───────────────────────────────────────
export const webinarAttendeeScores = pgTable("webinar_attendee_scores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  webinarId: varchar("webinar_id").notNull().references(() => webinars.id, { onDelete: "cascade" }),
  viewerId: text("viewer_id").notNull(),
  viewerName: text("viewer_name"),
  viewerEmail: text("viewer_email"),
  watchDuration: integer("watch_duration").notNull().default(0), // seconds
  chatMessages: integer("chat_messages").notNull().default(0),
  questionsAsked: integer("questions_asked").notNull().default(0),
  pollsVoted: integer("polls_voted").notNull().default(0),
  reactionsCount: integer("reactions_count").notNull().default(0),
  ctaClicks: integer("cta_clicks").notNull().default(0),
  handRaises: integer("hand_raises").notNull().default(0),
  engagementScore: real("engagement_score").notNull().default(0), // 0-100 computed
  attendedFullDuration: boolean("attended_full_duration").notNull().default(false),
  joinedAt: timestamp("joined_at"),
  leftAt: timestamp("left_at"),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export type WebinarAttendeeScore = typeof webinarAttendeeScores.$inferSelect;

// ── Webinar Social Streaming Destinations ────────────────────────────────────
export const webinarStreamDestinations = pgTable("webinar_stream_destinations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  webinarId: varchar("webinar_id").notNull().references(() => webinars.id, { onDelete: "cascade" }),
  platform: text("platform").notNull(), // youtube | facebook | linkedin | custom
  rtmpUrl: text("rtmp_url").notNull(),
  streamKey: text("stream_key").notNull(),
  label: text("label"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertWebinarStreamDestinationSchema = createInsertSchema(webinarStreamDestinations).omit({ id: true, createdAt: true });
export type InsertWebinarStreamDestination = z.infer<typeof insertWebinarStreamDestinationSchema>;
export type WebinarStreamDestination = typeof webinarStreamDestinations.$inferSelect;

// ── Webinar File/Resource Sharing ────────────────────────────────────────────
export const webinarResources = pgTable("webinar_resources", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  webinarId: varchar("webinar_id").notNull().references(() => webinars.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  url: text("url").notNull(),
  type: text("type").notNull().default("link"), // link | pdf | slide | image
  pushedAt: timestamp("pushed_at"), // null = not pushed yet
  downloadCount: integer("download_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertWebinarResourceSchema = createInsertSchema(webinarResources).omit({ id: true, createdAt: true, downloadCount: true });
export type InsertWebinarResource = z.infer<typeof insertWebinarResourceSchema>;
export type WebinarResource = typeof webinarResources.$inferSelect;

/* ───────────────────────────────────────────────────────────
   CRM SUITE — Contacts · Pipelines · Opportunities · Activities · Tasks · Tags
─────────────────────────────────────────────────────────── */

export const crmContactStatusEnum = pgEnum("crm_contact_status", ["lead", "prospect", "customer", "inactive"]);
export const crmActivityTypeEnum = pgEnum("crm_activity_type", ["note", "email", "call", "sms", "meeting", "task", "stage_change", "tag", "system"]);
export const crmTaskStatusEnum = pgEnum("crm_task_status", ["open", "done", "snoozed"]);
export const crmOpportunityStatusEnum = pgEnum("crm_opportunity_status", ["open", "won", "lost", "abandoned"]);

export const crmContacts = pgTable("crm_contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: varchar("owner_id").references(() => users.id, { onDelete: "set null" }),
  firstName: text("first_name"),
  lastName: text("last_name"),
  email: text("email"),
  phone: text("phone"),
  company: text("company"),
  title: text("title"),
  source: text("source").default("manual"), // landing | dm | webinar | manual | api | form
  status: crmContactStatusEnum("status").notNull().default("lead"),
  lifecycleStage: text("lifecycle_stage").default("subscriber"),
  city: text("city"),
  country: text("country"),
  timezone: text("timezone"),
  // Social profiles
  instagram: text("instagram"),
  youtube: text("youtube"),
  linkedin: text("linkedin"),
  twitter: text("twitter"),
  website: text("website"),
  // Lead scoring
  score: integer("score").notNull().default(0),
  // Free-form
  tags: jsonb("tags").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  customFields: jsonb("custom_fields").$type<Record<string, any>>().notNull().default(sql`'{}'::jsonb`),
  notes: text("notes"),
  // Linkage to platform user, when applicable
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  // Engagement
  lastContactedAt: timestamp("last_contacted_at"),
  doNotContact: boolean("do_not_contact").notNull().default(false),
  archivedAt: timestamp("archived_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export const insertCrmContactSchema = createInsertSchema(crmContacts).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCrmContact = z.infer<typeof insertCrmContactSchema>;
export type CrmContact = typeof crmContacts.$inferSelect;

export const crmPipelines = pgTable("crm_pipelines", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color").default("#d4b461"),
  isDefault: boolean("is_default").notNull().default(false),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertCrmPipelineSchema = createInsertSchema(crmPipelines).omit({ id: true, createdAt: true });
export type InsertCrmPipeline = z.infer<typeof insertCrmPipelineSchema>;
export type CrmPipeline = typeof crmPipelines.$inferSelect;

export const crmPipelineStages = pgTable("crm_pipeline_stages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pipelineId: varchar("pipeline_id").notNull().references(() => crmPipelines.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color").default("#d4b461"),
  position: integer("position").notNull().default(0),
  // Probability of close at this stage (0-100), used for forecasting
  probability: integer("probability").notNull().default(0),
  // Mark as terminal stage
  isWon: boolean("is_won").notNull().default(false),
  isLost: boolean("is_lost").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertCrmPipelineStageSchema = createInsertSchema(crmPipelineStages).omit({ id: true, createdAt: true });
export type InsertCrmPipelineStage = z.infer<typeof insertCrmPipelineStageSchema>;
export type CrmPipelineStage = typeof crmPipelineStages.$inferSelect;

export const crmOpportunities = pgTable("crm_opportunities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pipelineId: varchar("pipeline_id").notNull().references(() => crmPipelines.id, { onDelete: "cascade" }),
  stageId: varchar("stage_id").notNull().references(() => crmPipelineStages.id, { onDelete: "restrict" }),
  contactId: varchar("contact_id").references(() => crmContacts.id, { onDelete: "set null" }),
  ownerId: varchar("owner_id").references(() => users.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description"),
  // dollars * 100 (cents) to avoid float drift
  valueCents: integer("value_cents").notNull().default(0),
  currency: text("currency").notNull().default("USD"),
  status: crmOpportunityStatusEnum("status").notNull().default("open"),
  expectedCloseDate: timestamp("expected_close_date"),
  closedAt: timestamp("closed_at"),
  // free-form ordering inside a stage column for drag/drop
  position: integer("position").notNull().default(0),
  tags: jsonb("tags").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  customFields: jsonb("custom_fields").$type<Record<string, any>>().notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export const insertCrmOpportunitySchema = createInsertSchema(crmOpportunities).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCrmOpportunity = z.infer<typeof insertCrmOpportunitySchema>;
export type CrmOpportunity = typeof crmOpportunities.$inferSelect;

export const crmActivities = pgTable("crm_activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contactId: varchar("contact_id").references(() => crmContacts.id, { onDelete: "cascade" }),
  opportunityId: varchar("opportunity_id").references(() => crmOpportunities.id, { onDelete: "cascade" }),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  type: crmActivityTypeEnum("type").notNull(),
  title: text("title").notNull(),
  body: text("body"),
  metadata: jsonb("metadata").$type<Record<string, any>>().default(sql`'{}'::jsonb`),
  occurredAt: timestamp("occurred_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertCrmActivitySchema = createInsertSchema(crmActivities).omit({ id: true, createdAt: true });
export type InsertCrmActivity = z.infer<typeof insertCrmActivitySchema>;
export type CrmActivity = typeof crmActivities.$inferSelect;

export const crmTasks = pgTable("crm_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contactId: varchar("contact_id").references(() => crmContacts.id, { onDelete: "cascade" }),
  opportunityId: varchar("opportunity_id").references(() => crmOpportunities.id, { onDelete: "cascade" }),
  assigneeId: varchar("assignee_id").references(() => users.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description"),
  status: crmTaskStatusEnum("status").notNull().default("open"),
  priority: text("priority").notNull().default("normal"), // low | normal | high | urgent
  dueAt: timestamp("due_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export const insertCrmTaskSchema = createInsertSchema(crmTasks).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCrmTask = z.infer<typeof insertCrmTaskSchema>;
export type CrmTask = typeof crmTasks.$inferSelect;

export const crmTags = pgTable("crm_tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  color: text("color").default("#d4b461"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertCrmTagSchema = createInsertSchema(crmTags).omit({ id: true, createdAt: true });
export type InsertCrmTag = z.infer<typeof insertCrmTagSchema>;
export type CrmTag = typeof crmTags.$inferSelect;


export const crmSmartLists = pgTable("crm_smart_lists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  // Filter spec — JSON object: { q, status, tag, source, scoreMin, scoreMax, archived, lastContactedDays, doNotContact }
  filters: jsonb("filters").$type<Record<string, any>>().notNull().default(sql`'{}'::jsonb`),
  ownerId: varchar("owner_id").references(() => users.id, { onDelete: "set null" }),
  pinned: boolean("pinned").notNull().default(false),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertCrmSmartListSchema = createInsertSchema(crmSmartLists).omit({ id: true, createdAt: true });
export type InsertCrmSmartList = z.infer<typeof insertCrmSmartListSchema>;
export type CrmSmartList = typeof crmSmartLists.$inferSelect;


export const crmApiKeys = pgTable("crm_api_keys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),                                  // display label
  keyHash: text("key_hash").notNull().unique(),                  // sha256 of the secret
  keyPrefix: text("key_prefix").notNull(),                       // first 12 chars, for ID display
  // Scopes restrict what the key can do. e.g. ["contacts:write","opportunities:write","activities:write","tasks:write"]
  scopes: jsonb("scopes").$type<string[]>().notNull().default(sql`'["contacts:write"]'::jsonb`),
  // Auto-tag every contact created with this key (e.g. "brandverse-landing")
  defaultTags: jsonb("default_tags").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  defaultSource: text("default_source"),                         // e.g. "brandverse-landing"
  // CORS — comma-separated list of allowed origins, or "*" for any
  allowedOrigins: text("allowed_origins").default("*"),
  rateLimitPerMin: integer("rate_limit_per_min").notNull().default(60),
  ownerId: varchar("owner_id").references(() => users.id, { onDelete: "set null" }),
  // Telemetry
  lastUsedAt: timestamp("last_used_at"),
  lastUsedIp: text("last_used_ip"),
  usageCount: integer("usage_count").notNull().default(0),
  // Lifecycle
  expiresAt: timestamp("expires_at"),
  revokedAt: timestamp("revoked_at"),
  createdAt: timestamp("created_at").defaultNow(),
});
export type CrmApiKey = typeof crmApiKeys.$inferSelect;

// ── EMAIL MARKETING PLATFORM ───────────────────────────────────────────────────

export const emSequences = pgTable("em_sequences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull().default("nurture"), // nurture|upsell|winback|welcome|launch|promo|post_purchase|feedback|referral|webinar|abandonment|milestone
  description: text("description"),
  status: text("status").notNull().default("draft"), // draft|active|paused|archived
  fromName: text("from_name"),
  fromEmail: text("from_email"),
  replyTo: text("reply_to"),
  tags: text("tags").array(),
  aiGenerated: boolean("ai_generated").notNull().default(false),
  totalEnrolled: integer("total_enrolled").notNull().default(0),
  totalSent: integer("total_sent").notNull().default(0),
  totalOpened: integer("total_opened").notNull().default(0),
  totalClicked: integer("total_clicked").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export type EmSequence = typeof emSequences.$inferSelect;

export const emSteps = pgTable("em_steps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sequenceId: varchar("sequence_id").notNull().references(() => emSequences.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  stepNumber: integer("step_number").notNull().default(1),
  delayDays: integer("delay_days").notNull().default(0),
  delayHours: integer("delay_hours").notNull().default(0),
  subject: text("subject").notNull(),
  previewText: text("preview_text"),
  bodyHtml: text("body_html").notNull(),
  bodyText: text("body_text"),
  sendTimeOptimized: boolean("send_time_optimized").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});
export type EmStep = typeof emSteps.$inferSelect;

export const emContacts = pgTable("em_contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  phone: text("phone"),
  tags: text("tags").array(),
  customFields: jsonb("custom_fields").$type<Record<string, any>>(),
  subscribed: boolean("subscribed").notNull().default(true),
  unsubscribedAt: timestamp("unsubscribed_at"),
  source: text("source"),
  score: integer("score").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});
export type EmContact = typeof emContacts.$inferSelect;

export const emSends = pgTable("em_sends", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  stepId: varchar("step_id").notNull().references(() => emSteps.id, { onDelete: "cascade" }),
  contactId: varchar("contact_id").notNull().references(() => emContacts.id, { onDelete: "cascade" }),
  sequenceId: varchar("sequence_id").notNull().references(() => emSequences.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("pending"), // pending|sent|delivered|opened|clicked|bounced|unsubscribed
  trackingId: text("tracking_id").unique(),
  sentAt: timestamp("sent_at"),
  openedAt: timestamp("opened_at"),
  clickedAt: timestamp("clicked_at"),
  bouncedAt: timestamp("bounced_at"),
  createdAt: timestamp("created_at").defaultNow(),
});
export type EmSend = typeof emSends.$inferSelect;

export const emWorkflows = pgTable("em_workflows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").notNull().default("draft"), // draft|active|paused
  nodes: jsonb("nodes").$type<any[]>().notNull().default(sql`'[]'::jsonb`),
  triggerType: text("trigger_type").notNull().default("manual"), // manual|contact_added|tag_applied|form_submitted|purchase|date_based
  triggerValue: text("trigger_value"),
  enrolledCount: integer("enrolled_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export type EmWorkflow = typeof emWorkflows.$inferSelect;

export const emSmtpConfigs = pgTable("em_smtp_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  provider: text("provider").notNull().default("custom"), // gmail|outlook|sendgrid|mailgun|ses|smtp2go|custom
  host: text("host"),
  port: integer("port").default(587),
  secure: boolean("secure").default(false),
  username: text("username"),
  password: text("password"),
  fromName: text("from_name"),
  fromEmail: text("from_email"),
  replyTo: text("reply_to"),
  isVerified: boolean("is_verified").notNull().default(false),
  dailySendLimit: integer("daily_send_limit").notNull().default(500),
  warmingEnabled: boolean("warming_enabled").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});
export type EmSmtpConfig = typeof emSmtpConfigs.$inferSelect;
// ── Competitor Watch List ────────────────────────────────────────────────────
export const competitorWatchlist = pgTable("competitor_watchlist", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  competitorUrl: text("competitor_url").notNull(),
  handle: varchar("handle").notNull(),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  isActive: boolean("is_active").notNull().default(true),
  lastScannedAt: timestamp("last_scanned_at"),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertCompetitorWatchlistSchema = createInsertSchema(competitorWatchlist).omit({ id: true, createdAt: true });
export type CompetitorWatchlistItem = typeof competitorWatchlist.$inferSelect;
export type InsertCompetitorWatchlistItem = z.infer<typeof insertCompetitorWatchlistSchema>;

// ── Competitor Snapshots ─────────────────────────────────────────────────────
export const competitorSnapshots = pgTable("competitor_snapshots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  watchlistId: varchar("watchlist_id").notNull().references(() => competitorWatchlist.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  scannedAt: timestamp("scanned_at").defaultNow(),
  followerCount: integer("follower_count"),
  followingCount: integer("following_count"),
  postCount: integer("post_count"),
  avgViews: real("avg_views"),
  avgLikes: real("avg_likes"),
  avgComments: real("avg_comments"),
  avgEngagement: real("avg_engagement"),
  bio: text("bio"),
  recentPosts: jsonb("recent_posts"),
});
export type CompetitorSnapshot = typeof competitorSnapshots.$inferSelect;

// ── Competitor Alerts ────────────────────────────────────────────────────────
export const competitorAlerts = pgTable("competitor_alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  watchlistId: varchar("watchlist_id").notNull().references(() => competitorWatchlist.id, { onDelete: "cascade" }),
  alertType: text("alert_type").notNull(), // 'new_post' | 'bio_change' | 'follower_spike' | 'engagement_spike' | 'post_count_jump'
  title: text("title").notNull(),
  description: text("description").notNull(),
  data: jsonb("data"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});
export type CompetitorAlert = typeof competitorAlerts.$inferSelect;

export const aiFeedback = pgTable("ai_feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  responseId: text("response_id"),
  responseType: text("response_type"),
  rating: boolean("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertAiFeedbackSchema = createInsertSchema(aiFeedback).omit({ id: true, createdAt: true });
export type InsertAiFeedback = z.infer<typeof insertAiFeedbackSchema>;
export type AiFeedback = typeof aiFeedback.$inferSelect;


export const aiMemory = pgTable("ai_memory", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  key: text("key").notNull(),
  value: jsonb("value").$type<any>().notNull(),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export const insertAiMemorySchema = createInsertSchema(aiMemory).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAiMemory = z.infer<typeof insertAiMemorySchema>;
export type AiMemory = typeof aiMemory.$inferSelect;
