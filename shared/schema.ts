import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, pgEnum, real, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const roleEnum = pgEnum("role", ["admin", "client"]);
export const docTypeEnum = pgEnum("doc_type", ["recording", "summary", "audit", "strategy", "worksheet", "contract", "material", "other"]);
export const platformEnum = pgEnum("platform", ["instagram", "youtube"]);
export const contentTypeEnum = pgEnum("content_type", ["reel", "carousel", "story", "video"]);
export const funnelStageEnum = pgEnum("funnel_stage", ["top", "middle", "bottom"]);

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
  createdAt: timestamp("created_at").defaultNow(),
});

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
