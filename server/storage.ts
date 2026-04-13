import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq, and, or, desc, gte, lte, isNull, sql as sqlExpr, inArray } from "drizzle-orm";
import {
  users, documents, messages, progress, callFeedback, tasks, notifications,
  contentPosts, incomeGoals, callBookings, aiIdeaLogs, competitorAnalyses, nicheAnalyses,
  dmLeads, dmQuickReplies, instagramProfileReports, appSettings, canvaTokens, videoResources, otpCodes,
  sessions, freeAiUsage, creditBalances, creditTransactions, landingLeads,
  twitterTokens, scheduledTweets, linkedinTokens, scheduledLinkedinPosts, aiSessionHistory,
  youtubeTokens, scheduledYoutubePosts,
  type TwitterToken, type ScheduledTweet, type InsertScheduledTweet,
  type LinkedinToken, type ScheduledLinkedinPost, type InsertScheduledLinkedinPost,
  type YoutubeToken, type ScheduledYoutubePost, type InsertScheduledYoutubePost,
  type AiSessionHistory, type InsertAiSessionHistory,
  type User, type InsertUser, type Document, type InsertDocument,
  type Message, type InsertMessage, type Progress, type InsertProgress,
  type CallFeedback, type InsertCallFeedback, type Task, type InsertTask,
  type Notification, type InsertNotification,
  type CompetitorAnalysis, type InsertCompetitorAnalysis,
  type NicheAnalysis, type InsertNicheAnalysis,
  type ContentPost, type InsertContentPost, type IncomeGoal, type InsertIncomeGoal,
  type CallBooking, type InsertCallBooking,
  type DmLead, type InsertDmLead, type DmQuickReply, type InsertDmQuickReply,
  type InstagramProfileReport, type InsertInstagramProfileReport,
  type CanvaToken, type InsertCanvaToken,
  type VideoResource, type InsertVideoResource,
  type OtpCode,
  type Session, type InsertSession,
  type CreditBalance, type CreditTransaction,
  type LandingLead, type InsertLandingLead,
} from "@shared/schema";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

export interface IStorage {
  // App Settings
  getAppSetting(key: string): Promise<string | undefined>;
  setAppSetting(key: string, value: string): Promise<void>;

  // Canva OAuth tokens
  getCanvaToken(userId: string): Promise<CanvaToken | undefined>;
  upsertCanvaToken(data: InsertCanvaToken): Promise<CanvaToken>;
  deleteCanvaToken(userId: string): Promise<void>;

  // Video Resource Library
  getVideoResources(): Promise<VideoResource[]>;
  getVideoResource(id: string): Promise<VideoResource | undefined>;
  createVideoResource(data: InsertVideoResource): Promise<VideoResource>;
  updateVideoResource(id: string, data: Partial<InsertVideoResource>): Promise<VideoResource | undefined>;
  deleteVideoResource(id: string): Promise<void>;

  // OTP Codes
  createOtpCode(email: string, code: string, expiresAt: Date): Promise<OtpCode>;
  getValidOtpCode(email: string, code: string): Promise<OtpCode | undefined>;
  markOtpUsed(id: string): Promise<void>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;

  // Credits
  getCreditBalance(userId: string): Promise<CreditBalance | undefined>;
  upsertCreditBalance(userId: string, plan: string): Promise<CreditBalance>;
  activatePlanCredits(userId: string, plan: string): Promise<CreditBalance>;
  deductCredits(userId: string, amount: number, type: string, description: string, plan: string): Promise<{ success: boolean; balance: CreditBalance; message?: string }>;
  addBonusCredits(userId: string, amount: number, description: string): Promise<CreditBalance>;
  getCreditTransactions(userId: string, limit?: number): Promise<CreditTransaction[]>;
  getAllCreditBalances(): Promise<(CreditBalance & { userName?: string; userEmail?: string; userPlan?: string })[]>;

  // Landing Leads (CRM)
  createLandingLead(data: InsertLandingLead): Promise<LandingLead>;
  getLandingLeadByEmail(email: string): Promise<LandingLead | undefined>;
  updateLandingLead(id: string, data: Partial<InsertLandingLead>): Promise<LandingLead | undefined>;
  getAllLandingLeads(): Promise<LandingLead[]>;

  // Sessions Hub
  getSessions(tierFilter?: string[]): Promise<Session[]>;
  getSession(id: string): Promise<Session | undefined>;
  createSession(data: InsertSession): Promise<Session>;
  updateSession(id: string, data: Partial<InsertSession>): Promise<Session | undefined>;
  deleteSession(id: string): Promise<void>;

  // Free AI Usage
  getFreeAiUsage(identifier: string, date: string): Promise<number>;
  incrementFreeAiUsage(identifier: string, date: string): Promise<number>;

  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getAllClients(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<User>;
  deleteUser(id: string): Promise<void>;

  // Documents
  getDocumentsByClient(clientId: string): Promise<Document[]>;
  getAllDocuments(): Promise<Document[]>;
  getMaterials(): Promise<Document[]>;
  getDocument(id: string): Promise<Document | undefined>;
  createDocument(doc: InsertDocument): Promise<Document>;
  deleteDocument(id: string): Promise<void>;

  // Messages
  getMessagesBetween(userA: string, userB: string): Promise<Message[]>;
  getConversations(adminId: string): Promise<{ clientId: string; lastMessage: Message }[]>;
  createMessage(msg: InsertMessage): Promise<Message>;
  updateMessage(id: string, content: string): Promise<Message>;
  deleteMessage(id: string): Promise<void>;
  getMessage(id: string): Promise<Message | undefined>;
  markMessagesRead(senderId: string, receiverId: string): Promise<void>;
  getUnreadCount(receiverId: string): Promise<number>;

  // Progress
  getProgress(clientId: string): Promise<Progress | undefined>;
  upsertProgress(data: InsertProgress): Promise<Progress>;

  // Call Feedback
  getCallFeedbackByClient(clientId: string): Promise<CallFeedback[]>;
  getCallFeedback(id: string): Promise<CallFeedback | undefined>;
  createCallFeedback(data: InsertCallFeedback): Promise<CallFeedback>;
  updateCallFeedback(id: string, data: Partial<InsertCallFeedback>): Promise<CallFeedback>;
  deleteCallFeedback(id: string): Promise<void>;

  // Tasks
  getTasksByClient(clientId: string): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, data: Partial<InsertTask>): Promise<Task>;
  deleteTask(id: string): Promise<void>;

  // Notifications
  getNotificationsByClient(clientId: string): Promise<Notification[]>;
  createNotification(notif: InsertNotification): Promise<Notification>;
  markNotificationRead(id: string): Promise<void>;
  markAllNotificationsRead(clientId: string): Promise<void>;
  deleteNotification(id: string): Promise<void>;
  getDueScheduledNotifications(): Promise<Notification[]>;

  // Content Posts
  getContentPostsByClient(clientId: string): Promise<ContentPost[]>;
  getContentPost(id: string): Promise<ContentPost | undefined>;
  createContentPost(post: InsertContentPost): Promise<ContentPost>;
  updateContentPost(id: string, data: Partial<InsertContentPost>): Promise<ContentPost>;
  deleteContentPost(id: string): Promise<void>;

  // Income Goals
  getIncomeGoal(clientId: string): Promise<IncomeGoal | undefined>;
  upsertIncomeGoal(data: InsertIncomeGoal): Promise<IncomeGoal>;

  // Call Bookings (Calendly)
  getAllCallBookings(): Promise<(CallBooking & { client: User | null })[]>;
  createAiIdeaLog(data: { clientId: string; platform: string; niche: string; contentType?: string; goal?: string; ideasCount?: number }): Promise<void>;
  getAiIdeaLogs(): Promise<any[]>;
  getCallBookingsByClient(clientId: string): Promise<CallBooking[]>;
  getCallBookingByCalendlyUri(uri: string): Promise<CallBooking | undefined>;
  createCallBooking(data: InsertCallBooking): Promise<CallBooking>;
  updateCallBooking(id: string, data: Partial<InsertCallBooking>): Promise<CallBooking>;
  createCompetitorAnalysis(data: InsertCompetitorAnalysis): Promise<CompetitorAnalysis>;
  getCompetitorAnalyses(clientId: string): Promise<CompetitorAnalysis[]>;
  deleteCompetitorAnalysis(id: string): Promise<void>;
  getAllInstagramPostsWithUrls(): Promise<any[]>;
  getAllYouTubePostsWithUrls(): Promise<any[]>;
  // DM Tracker
  getDmLeads(clientId: string): Promise<DmLead[]>;
  getAllDmLeads(): Promise<DmLead[]>;
  createDmLead(data: InsertDmLead): Promise<DmLead>;
  updateDmLead(id: string, data: Partial<InsertDmLead>): Promise<DmLead>;
  deleteDmLead(id: string): Promise<void>;
  getDmQuickReplies(clientId: string): Promise<DmQuickReply[]>;
  createDmQuickReply(data: InsertDmQuickReply): Promise<DmQuickReply>;
  deleteDmQuickReply(id: string): Promise<void>;
  getInstagramProfileReport(clientId: string): Promise<InstagramProfileReport | null>;
  upsertInstagramProfileReport(data: InsertInstagramProfileReport): Promise<InstagramProfileReport>;

  // YouTube OAuth tokens
  getYoutubeToken(userId: string): Promise<YoutubeToken | null>;
  upsertYoutubeToken(userId: string, data: Omit<YoutubeToken, "id" | "userId" | "createdAt">): Promise<YoutubeToken>;
  deleteYoutubeToken(userId: string): Promise<void>;
  getScheduledYoutubePosts(userId: string): Promise<ScheduledYoutubePost[]>;
  getPendingDueYoutubePosts(): Promise<ScheduledYoutubePost[]>;
  createScheduledYoutubePost(data: InsertScheduledYoutubePost): Promise<ScheduledYoutubePost>;
  updateScheduledYoutubePost(id: string, data: Partial<ScheduledYoutubePost>): Promise<void>;
  deleteScheduledYoutubePost(id: string, userId: string): Promise<void>;
}

class DatabaseStorage implements IStorage {
  async createOtpCode(email: string, code: string, expiresAt: Date): Promise<OtpCode> {
    const [otp] = await db.insert(otpCodes).values({ email, code, expiresAt, used: false }).returning();
    return otp;
  }

  async getValidOtpCode(email: string, code: string): Promise<OtpCode | undefined> {
    const now = new Date();
    const [otp] = await db.select().from(otpCodes).where(
      and(eq(otpCodes.email, email), eq(otpCodes.code, code), eq(otpCodes.used, false), gte(otpCodes.expiresAt, now))
    );
    return otp;
  }

  async markOtpUsed(id: string): Promise<void> {
    await db.update(otpCodes).set({ used: true }).where(eq(otpCodes.id, id));
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.googleId, googleId));
    return user;
  }

  async getUser(id: string) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getAllClients() {
    return db.select().from(users).where(eq(users.role, "client")).orderBy(desc(users.createdAt));
  }

  async createUser(user: InsertUser) {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async updateUser(id: string, data: Partial<InsertUser>) {
    const [updated] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return updated;
  }

  async deleteUser(id: string) {
    // Delete all FK-referencing records that don't have onDelete: cascade
    await db.delete(contentPosts).where(eq(contentPosts.clientId, id));
    await db.delete(incomeGoals).where(eq(incomeGoals.clientId, id));
    await db.delete(callBookings).where(eq(callBookings.clientId, id));
    await db.delete(dmLeads).where(eq(dmLeads.clientId, id));
    await db.delete(dmQuickReplies).where(eq(dmQuickReplies.clientId, id));
    await db.delete(instagramProfileReports).where(eq(instagramProfileReports.clientId, id));
    await db.delete(nicheAnalyses).where(eq(nicheAnalyses.clientId, id));
    await db.delete(competitorAnalyses).where(eq(competitorAnalyses.clientId, id));
    await db.delete(canvaTokens).where(eq(canvaTokens.userId, id));
    await db.delete(creditTransactions).where(eq(creditTransactions.userId, id));
    await db.delete(creditBalances).where(eq(creditBalances.userId, id));
    await db.delete(notifications).where(eq(notifications.clientId, id));
    await db.delete(tasks).where(eq(tasks.clientId, id));
    await db.delete(callFeedback).where(eq(callFeedback.clientId, id));
    await db.delete(progress).where(eq(progress.clientId, id));
    await db.delete(documents).where(eq(documents.clientId, id));
    await db.delete(documents).where(eq(documents.uploadedBy, id));
    await db.delete(messages).where(or(eq(messages.senderId, id), eq(messages.receiverId, id)));
    await db.delete(users).where(eq(users.id, id));
  }

  async getDocumentsByClient(clientId: string) {
    return db.select().from(documents).where(eq(documents.clientId, clientId)).orderBy(desc(documents.createdAt));
  }

  async getAllDocuments() {
    return db.select().from(documents).orderBy(desc(documents.createdAt));
  }

  async getMaterials() {
    return db.select().from(documents).where(eq(documents.fileType, "material")).orderBy(desc(documents.createdAt));
  }

  async getDocument(id: string) {
    const [doc] = await db.select().from(documents).where(eq(documents.id, id));
    return doc;
  }

  async createDocument(doc: InsertDocument) {
    const [created] = await db.insert(documents).values(doc).returning();
    return created;
  }

  async deleteDocument(id: string) {
    await db.delete(documents).where(eq(documents.id, id));
  }

  async getMessagesBetween(userA: string, userB: string) {
    return db.select().from(messages).where(
      or(
        and(eq(messages.senderId, userA), eq(messages.receiverId, userB)),
        and(eq(messages.senderId, userB), eq(messages.receiverId, userA))
      )
    ).orderBy(messages.createdAt);
  }

  async getConversations(adminId: string) {
    const allMsgs = await db.select().from(messages).where(
      or(eq(messages.senderId, adminId), eq(messages.receiverId, adminId))
    ).orderBy(desc(messages.createdAt));

    const seen = new Set<string>();
    const result: { clientId: string; lastMessage: Message }[] = [];
    for (const msg of allMsgs) {
      const clientId = msg.senderId === adminId ? msg.receiverId : msg.senderId;
      if (!seen.has(clientId)) {
        seen.add(clientId);
        result.push({ clientId, lastMessage: msg });
      }
    }
    return result;
  }

  async createMessage(msg: InsertMessage) {
    const [created] = await db.insert(messages).values(msg).returning();
    return created;
  }

  async getMessage(id: string) {
    const [msg] = await db.select().from(messages).where(eq(messages.id, id));
    return msg;
  }

  async updateMessage(id: string, content: string) {
    const [updated] = await db.update(messages).set({ content }).where(eq(messages.id, id)).returning();
    return updated;
  }

  async deleteMessage(id: string) {
    await db.delete(messages).where(eq(messages.id, id));
  }

  async markMessagesRead(senderId: string, receiverId: string) {
    await db.update(messages).set({ read: true }).where(
      and(eq(messages.senderId, senderId), eq(messages.receiverId, receiverId))
    );
  }

  async getUnreadCount(receiverId: string) {
    const unread = await db.select().from(messages).where(
      and(eq(messages.receiverId, receiverId), eq(messages.read, false))
    );
    return unread.length;
  }

  async getProgress(clientId: string) {
    const [prog] = await db.select().from(progress).where(eq(progress.clientId, clientId));
    return prog;
  }

  async upsertProgress(data: InsertProgress) {
    const existing = await this.getProgress(data.clientId);
    if (existing) {
      const [updated] = await db.update(progress).set({ ...data, updatedAt: new Date() }).where(eq(progress.clientId, data.clientId)).returning();
      return updated;
    } else {
      const [created] = await db.insert(progress).values(data).returning();
      return created;
    }
  }

  async getCallFeedbackByClient(clientId: string) {
    return db.select().from(callFeedback).where(eq(callFeedback.clientId, clientId)).orderBy(desc(callFeedback.callDate));
  }

  async getCallFeedback(id: string) {
    const [cf] = await db.select().from(callFeedback).where(eq(callFeedback.id, id));
    return cf;
  }

  async createCallFeedback(data: InsertCallFeedback) {
    const [created] = await db.insert(callFeedback).values(data).returning();
    return created;
  }

  async updateCallFeedback(id: string, data: Partial<InsertCallFeedback>) {
    const [updated] = await db.update(callFeedback).set(data).where(eq(callFeedback.id, id)).returning();
    return updated;
  }

  async deleteCallFeedback(id: string) {
    await db.delete(callFeedback).where(eq(callFeedback.id, id));
  }

  async getTasksByClient(clientId: string) {
    return db.select().from(tasks).where(eq(tasks.clientId, clientId)).orderBy(desc(tasks.createdAt));
  }

  async createTask(task: InsertTask) {
    const [created] = await db.insert(tasks).values(task).returning();
    return created;
  }

  async updateTask(id: string, data: Partial<InsertTask>) {
    const [updated] = await db.update(tasks).set(data).where(eq(tasks.id, id)).returning();
    return updated;
  }

  async deleteTask(id: string) {
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  async getNotificationsByClient(clientId: string) {
    const now = new Date();
    return db.select().from(notifications).where(
      and(
        eq(notifications.clientId, clientId),
        or(isNull(notifications.scheduledFor), lte(notifications.scheduledFor, now))
      )
    ).orderBy(desc(notifications.createdAt));
  }

  async createNotification(notif: InsertNotification) {
    const [created] = await db.insert(notifications).values(notif).returning();
    return created;
  }

  async markNotificationRead(id: string) {
    await db.update(notifications).set({ read: true }).where(eq(notifications.id, id));
  }

  async markAllNotificationsRead(clientId: string) {
    await db.update(notifications).set({ read: true }).where(eq(notifications.clientId, clientId));
  }

  async deleteNotification(id: string) {
    await db.delete(notifications).where(eq(notifications.id, id));
  }

  async getDueScheduledNotifications() {
    const now = new Date();
    return db.select().from(notifications).where(
      and(
        eq(notifications.read, false),
        lte(notifications.scheduledFor, now)
      )
    );
  }

  async getContentPostsByClient(clientId: string) {
    return db.select().from(contentPosts).where(eq(contentPosts.clientId, clientId)).orderBy(desc(contentPosts.postDate));
  }

  async getContentPost(id: string) {
    const [post] = await db.select().from(contentPosts).where(eq(contentPosts.id, id));
    return post;
  }

  async createContentPost(post: InsertContentPost) {
    const [created] = await db.insert(contentPosts).values(post).returning();
    return created;
  }

  async updateContentPost(id: string, data: Partial<InsertContentPost>) {
    const [updated] = await db.update(contentPosts).set(data).where(eq(contentPosts.id, id)).returning();
    return updated;
  }

  async deleteContentPost(id: string) {
    await db.delete(contentPosts).where(eq(contentPosts.id, id));
  }

  async getIncomeGoal(clientId: string) {
    const [goal] = await db.select().from(incomeGoals).where(eq(incomeGoals.clientId, clientId));
    return goal;
  }

  async upsertIncomeGoal(data: InsertIncomeGoal) {
    const existing = await this.getIncomeGoal(data.clientId);
    if (existing) {
      const [updated] = await db.update(incomeGoals).set(data).where(eq(incomeGoals.clientId, data.clientId)).returning();
      return updated;
    } else {
      const [created] = await db.insert(incomeGoals).values(data).returning();
      return created;
    }
  }

  async createAiIdeaLog(data: { clientId: string; platform: string; niche: string; contentType?: string; goal?: string; ideasCount?: number }) {
    await db.insert(aiIdeaLogs).values({
      clientId: data.clientId,
      platform: data.platform,
      niche: data.niche,
      contentType: data.contentType,
      goal: data.goal,
      ideasCount: data.ideasCount ?? 6,
    });
  }

  async getAiIdeaLogs() {
    const logs = await db.select().from(aiIdeaLogs).orderBy(desc(aiIdeaLogs.createdAt)).limit(100);
    const allUsers = await db.select({ id: users.id, name: users.name, email: users.email }).from(users);
    return logs.map(l => ({ ...l, client: allUsers.find(u => u.id === l.clientId) || null }));
  }

  async getAllCallBookings() {
    const allBookings = await db.select().from(callBookings).orderBy(desc(callBookings.startTime));
    const allUsers = await db.select().from(users);
    return allBookings.map(b => ({
      ...b,
      client: allUsers.find(u => u.id === b.clientId) || null,
    }));
  }

  async getCallBookingsByClient(clientId: string) {
    return db.select().from(callBookings).where(eq(callBookings.clientId, clientId)).orderBy(desc(callBookings.startTime));
  }

  async getCallBookingByCalendlyUri(uri: string) {
    const [booking] = await db.select().from(callBookings).where(eq(callBookings.calendlyEventUri, uri));
    return booking;
  }

  async createCallBooking(data: InsertCallBooking) {
    const [created] = await db.insert(callBookings).values(data).returning();
    return created;
  }

  async updateCallBooking(id: string, data: Partial<InsertCallBooking>) {
    const [updated] = await db.update(callBookings).set(data).where(eq(callBookings.id, id)).returning();
    return updated;
  }

  async createCompetitorAnalysis(data: InsertCompetitorAnalysis) {
    const [created] = await db.insert(competitorAnalyses).values(data).returning();
    return created;
  }

  async getCompetitorAnalyses(clientId: string) {
    return db.select().from(competitorAnalyses)
      .where(eq(competitorAnalyses.clientId, clientId))
      .orderBy(desc(competitorAnalyses.createdAt));
  }

  async deleteCompetitorAnalysis(id: string) {
    await db.delete(competitorAnalyses).where(eq(competitorAnalyses.id, id));
  }

  async createNicheAnalysis(data: InsertNicheAnalysis) {
    const [created] = await db.insert(nicheAnalyses).values(data).returning();
    return created;
  }

  async getNicheAnalyses(clientId: string) {
    return db.select().from(nicheAnalyses)
      .where(eq(nicheAnalyses.clientId, clientId))
      .orderBy(desc(nicheAnalyses.createdAt));
  }

  async deleteNicheAnalysis(id: string) {
    await db.delete(nicheAnalyses).where(eq(nicheAnalyses.id, id));
  }

  async getDmLeads(clientId: string) {
    return db.select().from(dmLeads).where(eq(dmLeads.clientId, clientId)).orderBy(desc(dmLeads.updatedAt));
  }
  async getAllDmLeads() {
    return db.select().from(dmLeads).orderBy(desc(dmLeads.updatedAt));
  }
  async createDmLead(data: InsertDmLead) {
    const [lead] = await db.insert(dmLeads).values(data).returning();
    return lead;
  }
  async updateDmLead(id: string, data: Partial<InsertDmLead>) {
    const [lead] = await db.update(dmLeads).set({ ...data, updatedAt: new Date() }).where(eq(dmLeads.id, id)).returning();
    return lead;
  }
  async deleteDmLead(id: string) {
    await db.delete(dmLeads).where(eq(dmLeads.id, id));
  }
  async getDmQuickReplies(clientId: string) {
    return db.select().from(dmQuickReplies).where(eq(dmQuickReplies.clientId, clientId)).orderBy(desc(dmQuickReplies.createdAt));
  }
  async createDmQuickReply(data: InsertDmQuickReply) {
    const [reply] = await db.insert(dmQuickReplies).values(data).returning();
    return reply;
  }
  async deleteDmQuickReply(id: string) {
    await db.delete(dmQuickReplies).where(eq(dmQuickReplies.id, id));
  }

  async getAllInstagramPostsWithUrls() {
    return db.select().from(contentPosts)
      .where(and(
        eq(contentPosts.platform, "instagram"),
        sqlExpr`${contentPosts.postUrl} IS NOT NULL AND ${contentPosts.postUrl} != ''`
      ));
  }

  async getAllYouTubePostsWithUrls() {
    return db.select().from(contentPosts)
      .where(and(
        eq(contentPosts.platform, "youtube"),
        sqlExpr`${contentPosts.postUrl} IS NOT NULL AND ${contentPosts.postUrl} != ''`
      ));
  }

  async getInstagramProfileReport(clientId: string) {
    const [report] = await db.select().from(instagramProfileReports)
      .where(eq(instagramProfileReports.clientId, clientId))
      .orderBy(desc(instagramProfileReports.createdAt))
      .limit(1);
    return report ?? null;
  }

  async upsertInstagramProfileReport(data: InsertInstagramProfileReport) {
    const existing = await this.getInstagramProfileReport(data.clientId);
    if (existing) {
      const [updated] = await db.update(instagramProfileReports)
        .set({ instagramUrl: data.instagramUrl, handle: data.handle, postCount: data.postCount, report: data.report, createdAt: new Date() })
        .where(eq(instagramProfileReports.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await db.insert(instagramProfileReports).values(data).returning();
    return created;
  }

  async getAppSetting(key: string): Promise<string | undefined> {
    const [row] = await db.select().from(appSettings).where(eq(appSettings.key, key));
    return row?.value;
  }

  async setAppSetting(key: string, value: string): Promise<void> {
    await db.insert(appSettings).values({ key, value })
      .onConflictDoUpdate({ target: appSettings.key, set: { value, updatedAt: new Date() } });
  }

  async getCanvaToken(userId: string): Promise<CanvaToken | undefined> {
    const [row] = await db.select().from(canvaTokens).where(eq(canvaTokens.userId, userId));
    return row;
  }

  async upsertCanvaToken(data: InsertCanvaToken): Promise<CanvaToken> {
    const [row] = await db.insert(canvaTokens).values(data)
      .onConflictDoUpdate({ target: canvaTokens.userId, set: { accessToken: data.accessToken, refreshToken: data.refreshToken, expiresAt: data.expiresAt, scope: data.scope, updatedAt: new Date() } })
      .returning();
    return row;
  }

  async deleteCanvaToken(userId: string): Promise<void> {
    await db.delete(canvaTokens).where(eq(canvaTokens.userId, userId));
  }

  async getVideoResources(): Promise<VideoResource[]> {
    return await db.select().from(videoResources).orderBy(desc(videoResources.createdAt));
  }

  async getVideoResource(id: string): Promise<VideoResource | undefined> {
    const [row] = await db.select().from(videoResources).where(eq(videoResources.id, id));
    return row;
  }

  async createVideoResource(data: InsertVideoResource): Promise<VideoResource> {
    const [row] = await db.insert(videoResources).values(data).returning();
    return row;
  }

  async updateVideoResource(id: string, data: Partial<InsertVideoResource>): Promise<VideoResource | undefined> {
    const [row] = await db.update(videoResources).set(data).where(eq(videoResources.id, id)).returning();
    return row;
  }

  async deleteVideoResource(id: string): Promise<void> {
    await db.delete(videoResources).where(eq(videoResources.id, id));
  }

  // ── Landing Leads (CRM) ────────────────────────────────────────────────────
  async createLandingLead(data: InsertLandingLead): Promise<LandingLead> {
    const [row] = await db.insert(landingLeads).values(data).returning();
    return row;
  }

  async getLandingLeadByEmail(email: string): Promise<LandingLead | undefined> {
    const [row] = await db.select().from(landingLeads).where(eq(landingLeads.email, email));
    return row;
  }

  async updateLandingLead(id: string, data: Partial<InsertLandingLead>): Promise<LandingLead | undefined> {
    const [row] = await db.update(landingLeads).set(data).where(eq(landingLeads.id, id)).returning();
    return row;
  }

  async getAllLandingLeads(): Promise<LandingLead[]> {
    return await db.select().from(landingLeads).orderBy(desc(landingLeads.createdAt));
  }

  // ── Credit system ──────────────────────────────────────────────────────────
  // Tier 1 (free)=5/day, Tier 2 (starter)=150/month, Tier 3 (growth)=350/month
  // Tier 4 (pro)=700/month, Tier 5 (elite)=unlimited (bypass all checks)
  private readonly PLAN_CREDITS: Record<string, number> = { free: 5, starter: 150, growth: 350, pro: 700, elite: 99999 };

  private currentPeriodKey(plan: string): string {
    const d = new Date();
    if (plan === "free") {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }

  private currentMonth(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }

  async getCreditBalance(userId: string): Promise<CreditBalance | undefined> {
    const [row] = await db.select().from(creditBalances).where(eq(creditBalances.userId, userId));
    return row;
  }

  async upsertCreditBalance(userId: string, plan: string): Promise<CreditBalance> {
    const periodKey = this.currentPeriodKey(plan);
    const allowance = this.PLAN_CREDITS[plan] ?? 10;
    const existing = await this.getCreditBalance(userId);
    const periodLabel = plan === "free" ? "Daily" : "Monthly";
    // Elite tier: always return a very large balance without resetting (unlimited)
    if (!existing) {
      const [row] = await db.insert(creditBalances)
        .values({ userId, monthlyCredits: allowance, bonusCredits: 0, lastResetMonth: periodKey })
        .returning();
      await db.insert(creditTransactions).values({ userId, amount: allowance, type: "period_reset", description: `${periodLabel} credits for ${periodKey} (${plan} plan)` });
      return row;
    }
    if (existing.lastResetMonth !== periodKey) {
      const [row] = await db.update(creditBalances)
        .set({ monthlyCredits: allowance, lastResetMonth: periodKey })
        .where(eq(creditBalances.userId, userId))
        .returning();
      await db.insert(creditTransactions).values({ userId, amount: allowance, type: "period_reset", description: `${periodLabel} credits for ${periodKey} (${plan} plan)` });
      return row;
    }
    return existing;
  }

  // Force-activate a plan's full credit allowance immediately (used on plan confirmation/upgrade)
  async activatePlanCredits(userId: string, plan: string): Promise<CreditBalance> {
    const allowance = this.PLAN_CREDITS[plan] ?? 5;
    const periodKey = this.currentPeriodKey(plan);
    const existing = await this.getCreditBalance(userId);
    if (!existing) {
      const [row] = await db.insert(creditBalances)
        .values({ userId, monthlyCredits: allowance, bonusCredits: 0, lastResetMonth: periodKey })
        .returning();
      await db.insert(creditTransactions).values({ userId, amount: allowance, type: "plan_activated", description: `Plan activated: ${plan} — ${allowance} credits granted` });
      return row;
    }
    const [row] = await db.update(creditBalances)
      .set({ monthlyCredits: allowance, lastResetMonth: periodKey })
      .where(eq(creditBalances.userId, userId))
      .returning();
    await db.insert(creditTransactions).values({ userId, amount: allowance, type: "plan_activated", description: `Plan activated: ${plan} — ${allowance} credits granted` });
    return row;
  }

  async deductCredits(userId: string, amount: number, type: string, description: string, plan: string): Promise<{ success: boolean; balance: CreditBalance; message?: string }> {
    // Tier 5 (elite) = unlimited credits — skip deduction entirely
    if (plan === "elite") {
      const balance = await this.getCreditBalance(userId) ?? { userId, monthlyCredits: 99999, bonusCredits: 0, lastResetMonth: "", id: 0 } as any;
      return { success: true, balance };
    }
    const balance = await this.upsertCreditBalance(userId, plan);
    const total = balance.monthlyCredits + balance.bonusCredits;
    if (total < amount) {
      return { success: false, balance, message: `Not enough credits. You need ${amount} but have ${total}.` };
    }
    let newMonthly = balance.monthlyCredits;
    let newBonus = balance.bonusCredits;
    let remaining = amount;
    if (newBonus >= remaining) { newBonus -= remaining; remaining = 0; }
    else { remaining -= newBonus; newBonus = 0; newMonthly -= remaining; }
    const [updated] = await db.update(creditBalances)
      .set({ monthlyCredits: newMonthly, bonusCredits: newBonus })
      .where(eq(creditBalances.userId, userId))
      .returning();
    await db.insert(creditTransactions).values({ userId, amount: -amount, type, description });
    return { success: true, balance: updated };
  }

  async addBonusCredits(userId: string, amount: number, description: string): Promise<CreditBalance> {
    const existing = await this.getCreditBalance(userId);
    if (!existing) {
      const [row] = await db.insert(creditBalances)
        .values({ userId, monthlyCredits: 0, bonusCredits: amount, lastResetMonth: this.currentMonth() })
        .returning();
      await db.insert(creditTransactions).values({ userId, amount, type: "bonus_added", description });
      return row;
    }
    const [row] = await db.update(creditBalances)
      .set({ bonusCredits: existing.bonusCredits + amount })
      .where(eq(creditBalances.userId, userId))
      .returning();
    await db.insert(creditTransactions).values({ userId, amount, type: "bonus_added", description });
    return row;
  }

  async getCreditTransactions(userId: string, limit = 20): Promise<CreditTransaction[]> {
    return await db.select().from(creditTransactions)
      .where(eq(creditTransactions.userId, userId))
      .orderBy(desc(creditTransactions.createdAt))
      .limit(limit);
  }

  async getAllCreditBalances(): Promise<(CreditBalance & { userName?: string; userEmail?: string; userPlan?: string })[]> {
    const rows = await db.select({
      id: creditBalances.id,
      userId: creditBalances.userId,
      monthlyCredits: creditBalances.monthlyCredits,
      bonusCredits: creditBalances.bonusCredits,
      lastResetMonth: creditBalances.lastResetMonth,
      createdAt: creditBalances.createdAt,
      userName: users.name,
      userEmail: users.email,
      userPlan: users.plan,
    }).from(creditBalances).leftJoin(users, eq(creditBalances.userId, users.id));
    return rows as any;
  }

  async getSessions(tierFilter?: string[]): Promise<Session[]> {
    if (tierFilter && tierFilter.length > 0) {
      return await db.select().from(sessions)
        .where(and(
          eq(sessions.isPublished, true),
          inArray(sessions.tierRequired, tierFilter as any[])
        ))
        .orderBy(desc(sessions.createdAt));
    }
    return await db.select().from(sessions).orderBy(desc(sessions.createdAt));
  }

  async getSession(id: string): Promise<Session | undefined> {
    const [row] = await db.select().from(sessions).where(eq(sessions.id, id));
    return row;
  }

  async createSession(data: InsertSession): Promise<Session> {
    const [row] = await db.insert(sessions).values(data).returning();
    return row;
  }

  async updateSession(id: string, data: Partial<InsertSession>): Promise<Session | undefined> {
    const [row] = await db.update(sessions).set(data).where(eq(sessions.id, id)).returning();
    return row;
  }

  async deleteSession(id: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.id, id));
  }

  async getFreeAiUsage(identifier: string, date: string): Promise<number> {
    const [row] = await db.select().from(freeAiUsage)
      .where(and(eq(freeAiUsage.identifier, identifier), eq(freeAiUsage.date, date)));
    return row?.count ?? 0;
  }

  async incrementFreeAiUsage(identifier: string, date: string): Promise<number> {
    const [row] = await db.insert(freeAiUsage)
      .values({ identifier, date, count: 1 })
      .onConflictDoUpdate({
        target: [freeAiUsage.identifier, freeAiUsage.date],
        set: { count: sqlExpr`${freeAiUsage.count} + 1` },
      })
      .returning();
    return row.count;
  }

  async getTwitterToken(userId: string): Promise<TwitterToken | null> {
    const [row] = await db.select().from(twitterTokens).where(eq(twitterTokens.userId, userId));
    return row ?? null;
  }

  async upsertTwitterToken(userId: string, data: Omit<TwitterToken, "id" | "userId" | "createdAt">): Promise<TwitterToken> {
    const existing = await this.getTwitterToken(userId);
    if (existing) {
      const [row] = await db.update(twitterTokens).set(data).where(eq(twitterTokens.userId, userId)).returning();
      return row;
    }
    const [row] = await db.insert(twitterTokens).values({ userId, ...data }).returning();
    return row;
  }

  async deleteTwitterToken(userId: string): Promise<void> {
    await db.delete(twitterTokens).where(eq(twitterTokens.userId, userId));
  }

  async getScheduledTweets(userId: string): Promise<ScheduledTweet[]> {
    return db.select().from(scheduledTweets).where(eq(scheduledTweets.userId, userId)).orderBy(desc(scheduledTweets.scheduledFor));
  }

  async getPendingDueTweets(): Promise<ScheduledTweet[]> {
    return db.select().from(scheduledTweets)
      .where(and(eq(scheduledTweets.status, "pending"), lte(scheduledTweets.scheduledFor, new Date())));
  }

  async createScheduledTweet(data: InsertScheduledTweet): Promise<ScheduledTweet> {
    const [row] = await db.insert(scheduledTweets).values(data).returning();
    return row;
  }

  async updateScheduledTweet(id: string, data: Partial<ScheduledTweet>): Promise<void> {
    await db.update(scheduledTweets).set(data).where(eq(scheduledTweets.id, id));
  }

  async deleteScheduledTweet(id: string, userId: string): Promise<void> {
    await db.delete(scheduledTweets).where(and(eq(scheduledTweets.id, id), eq(scheduledTweets.userId, userId)));
  }

  async getLinkedinToken(userId: string): Promise<LinkedinToken | null> {
    const [row] = await db.select().from(linkedinTokens).where(eq(linkedinTokens.userId, userId));
    return row ?? null;
  }

  async upsertLinkedinToken(userId: string, data: Omit<LinkedinToken, "id" | "userId" | "createdAt">): Promise<LinkedinToken> {
    const existing = await this.getLinkedinToken(userId);
    if (existing) {
      const [row] = await db.update(linkedinTokens).set(data).where(eq(linkedinTokens.userId, userId)).returning();
      return row;
    }
    const [row] = await db.insert(linkedinTokens).values({ userId, ...data }).returning();
    return row;
  }

  async deleteLinkedinToken(userId: string): Promise<void> {
    await db.delete(linkedinTokens).where(eq(linkedinTokens.userId, userId));
  }

  async getScheduledLinkedinPosts(userId: string): Promise<ScheduledLinkedinPost[]> {
    return db.select().from(scheduledLinkedinPosts).where(eq(scheduledLinkedinPosts.userId, userId)).orderBy(desc(scheduledLinkedinPosts.scheduledFor));
  }

  async getPendingDueLinkedinPosts(): Promise<ScheduledLinkedinPost[]> {
    return db.select().from(scheduledLinkedinPosts)
      .where(and(eq(scheduledLinkedinPosts.status, "pending"), lte(scheduledLinkedinPosts.scheduledFor, new Date())));
  }

  async createScheduledLinkedinPost(data: InsertScheduledLinkedinPost): Promise<ScheduledLinkedinPost> {
    const [row] = await db.insert(scheduledLinkedinPosts).values(data).returning();
    return row;
  }

  async updateScheduledLinkedinPost(id: string, data: Partial<ScheduledLinkedinPost>): Promise<void> {
    await db.update(scheduledLinkedinPosts).set(data).where(eq(scheduledLinkedinPosts.id, id));
  }

  async deleteScheduledLinkedinPost(id: string, userId: string): Promise<void> {
    await db.delete(scheduledLinkedinPosts).where(and(eq(scheduledLinkedinPosts.id, id), eq(scheduledLinkedinPosts.userId, userId)));
  }

  async saveAiHistory(data: InsertAiSessionHistory): Promise<AiSessionHistory> {
    const [row] = await db.insert(aiSessionHistory).values(data).returning();
    return row;
  }

  async getAiHistory(userId: string, tool: string, limit = 20): Promise<AiSessionHistory[]> {
    return db.select().from(aiSessionHistory)
      .where(and(eq(aiSessionHistory.userId, userId), eq(aiSessionHistory.tool, tool)))
      .orderBy(desc(aiSessionHistory.createdAt))
      .limit(limit);
  }

  async deleteAiHistory(id: string, userId: string): Promise<void> {
    await db.delete(aiSessionHistory).where(and(eq(aiSessionHistory.id, id), eq(aiSessionHistory.userId, userId)));
  }

  async getYoutubeToken(userId: string): Promise<YoutubeToken | null> {
    const [row] = await db.select().from(youtubeTokens).where(eq(youtubeTokens.userId, userId));
    return row ?? null;
  }

  async upsertYoutubeToken(userId: string, data: Omit<YoutubeToken, "id" | "userId" | "createdAt">): Promise<YoutubeToken> {
    const existing = await this.getYoutubeToken(userId);
    if (existing) {
      const [row] = await db.update(youtubeTokens).set(data).where(eq(youtubeTokens.userId, userId)).returning();
      return row;
    }
    const [row] = await db.insert(youtubeTokens).values({ userId, ...data }).returning();
    return row;
  }

  async deleteYoutubeToken(userId: string): Promise<void> {
    await db.delete(youtubeTokens).where(eq(youtubeTokens.userId, userId));
  }

  async getScheduledYoutubePosts(userId: string): Promise<ScheduledYoutubePost[]> {
    return db.select().from(scheduledYoutubePosts).where(eq(scheduledYoutubePosts.userId, userId)).orderBy(desc(scheduledYoutubePosts.scheduledFor));
  }

  async getPendingDueYoutubePosts(): Promise<ScheduledYoutubePost[]> {
    return db.select().from(scheduledYoutubePosts)
      .where(and(eq(scheduledYoutubePosts.status, "pending"), lte(scheduledYoutubePosts.scheduledFor, new Date())));
  }

  async createScheduledYoutubePost(data: InsertScheduledYoutubePost): Promise<ScheduledYoutubePost> {
    const [row] = await db.insert(scheduledYoutubePosts).values(data).returning();
    return row;
  }

  async updateScheduledYoutubePost(id: string, data: Partial<ScheduledYoutubePost>): Promise<void> {
    await db.update(scheduledYoutubePosts).set(data).where(eq(scheduledYoutubePosts.id, id));
  }

  async deleteScheduledYoutubePost(id: string, userId: string): Promise<void> {
    await db.delete(scheduledYoutubePosts).where(and(eq(scheduledYoutubePosts.id, id), eq(scheduledYoutubePosts.userId, userId)));
  }
}

export const storage = new DatabaseStorage();
