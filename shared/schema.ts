import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, pgEnum, real, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const roleEnum = pgEnum("role", ["admin", "client"]);
export const docTypeEnum = pgEnum("doc_type", ["recording", "summary", "audit", "strategy", "worksheet", "contract", "material", "other"]);
export const platformEnum = pgEnum("platform", ["instagram", "youtube"]);
export const contentTypeEnum = pgEnum("content_type", ["reel", "carousel", "story", "video"]);
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
  googleId: text("google_id").unique(),
  plan: planEnum("plan").notNull().default("free"),
  planConfirmed: boolean("plan_confirmed").notNull().default(false),
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
  followersGained: integer("followers_gained").notNull().default(0),
  subscribersGained: integer("subscribers_gained").notNull().default(0),
  views2w: integer("views_2w"),
  likes2w: integer("likes_2w"),
  comments2w: integer("comments_2w"),
  saves2w: integer("saves_2w"),
  followersGained2w: integer("followers_gained_2w"),
  subscribersGained2w: integer("subscribers_gained_2w"),
  views4w: integer("views_4w"),
  likes4w: integer("likes_4w"),
  comments4w: integer("comments_4w"),
  saves4w: integer("saves_4w"),
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

export const canvaTokens = pgTable("canva_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at").notNull(),
  scope: text("scope"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCanvaTokenSchema = createInsertSchema(canvaTokens).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCanvaToken = z.infer<typeof insertCanvaTokenSchema>;
export type CanvaToken = typeof canvaTokens.$inferSelect;

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
