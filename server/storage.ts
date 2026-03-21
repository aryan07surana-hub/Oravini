import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq, and, or, desc, gte, lte, isNull, sql as sqlExpr } from "drizzle-orm";
import {
  users, documents, messages, progress, callFeedback, tasks, notifications,
  contentPosts, incomeGoals, callBookings, aiIdeaLogs, competitorAnalyses, nicheAnalyses,
  dmLeads, dmQuickReplies, instagramProfileReports, appSettings, canvaTokens,
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
}

class DatabaseStorage implements IStorage {
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
    // Cascade delete all related data before removing user
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
}

export const storage = new DatabaseStorage();
