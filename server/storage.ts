import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq, and, or, desc, gte, lte, isNull, sql as sqlExpr, inArray } from "drizzle-orm";
import {
  igTrackedProfiles, igFollowerSnapshots,
  type IgTrackedProfile, type InsertIgTrackedProfile,
  type IgFollowerSnapshot, type InsertIgFollowerSnapshot,
  igBotCookies, igBotCampaigns,
  users, documents, messages, progress, callFeedback, tasks, notifications,
  contentPosts, incomeGoals, callBookings, aiIdeaLogs, competitorAnalyses, nicheAnalyses,
  dmLeads, dmQuickReplies, dmTriggers, dmSequences, dmSequenceSteps, dmSequenceEnrollments,
  instagramProfileReports, appSettings, canvaTokens, videoResources, otpCodes,
  sessions, freeAiUsage, creditBalances, creditTransactions, landingLeads,
  emailSequences, sequenceEmails, emailEnrollments, emailLogs, emailBroadcasts, emailUnsubscribes,
  twitterTokens, scheduledTweets, linkedinTokens, scheduledLinkedinPosts, aiSessionHistory,
  youtubeTokens, scheduledYoutubePosts,
  referralCodes, referralClicks, referralConversions,
  forms, formQuestions, formSubmissions, formAnswers, formViews,
  meetings,
  videoEdits,
  brollClips,
  meetingTypes, availabilityRules, scheduledBookings, googleCalendarTokens,
  readingMaterials, readingHighlights, readingStreaks, dailyReadings,
  webinars, webinarRegistrations, videoEvents, webinarRecordings, webinarLandingPages,
  type GoogleCalendarToken,
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
  type DmTrigger, type InsertDmTrigger,
  type DmSequence, type InsertDmSequence,
  type DmSequenceStep, type InsertDmSequenceStep,
  type DmSequenceEnrollment,
  type InstagramProfileReport, type InsertInstagramProfileReport,
  type CanvaToken, type InsertCanvaToken,
  type VideoResource, type InsertVideoResource,
  type OtpCode,
  type Session, type InsertSession,
  type CreditBalance, type CreditTransaction,
  type LandingLead, type InsertLandingLead,
  type Form, type InsertForm, type FormQuestion, type InsertFormQuestion,
  type FormSubmission, type FormAnswer, type FormView,
  type Meeting, type InsertMeeting,
  type VideoEdit, type InsertVideoEdit,
  type BrollClip, type InsertBrollClip,
  type MeetingType, type InsertMeetingType,
  type AvailabilityRule, type InsertAvailabilityRule,
  type ScheduledBooking, type InsertScheduledBooking,
  type EmailSequence, type InsertEmailSequence,
  type SequenceEmail, type InsertSequenceEmail,
  type EmailEnrollment, type InsertEmailEnrollment,
  type EmailLog,
  type EmailBroadcast, type InsertEmailBroadcast,
  type ReadingMaterial, type InsertReadingMaterial,
  type ReadingHighlight, type InsertReadingHighlight,
  type ReadingStreak, type DailyReading,
  type Webinar, type InsertWebinar,
  type WebinarRegistration, type InsertWebinarRegistration,
  type VideoEvent, type InsertVideoEvent,
  type WebinarRecording, type InsertWebinarRecording,
  type WebinarLandingPage, type InsertWebinarLandingPage,
  type WebinarContact, type InsertWebinarContact,
  type VideoAnalyticsEvent, type InsertVideoAnalyticsEvent,
  webinarContacts, videoAnalyticsEvents,
} from "@shared/schema";

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
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

  // Onboarding Surveys
  saveOnboardingSurvey(data: any): Promise<any>;
  getOnboardingSurvey(userId: string): Promise<any | undefined>;
  getAllOnboardingSurveys(): Promise<any[]>;

  // Referrals
  getOrCreateReferralCode(userId: string): Promise<string>;
  getReferralCode(code: string): Promise<any | undefined>;
  trackReferralClick(code: string, ip: string, ua: string): Promise<void>;
  processReferralSignup(code: string, newUserId: string, email: string, ipAddress?: string): Promise<void>;
  processReferralConversion(referredUserId: string): Promise<void>;
  getReferralStats(userId: string): Promise<{ code: string; clicks: number; signups: number; conversions: number }>;
  getAllReferralStats(): Promise<any[]>;
  getReferralLeaderboard(): Promise<any[]>;

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
  getUserByPhone(phone: string): Promise<User | undefined>;
  setPhoneVerified(userId: string, phone: string): Promise<void>;
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
  // DM Automation
  getDmTriggers(userId: string): Promise<DmTrigger[]>;
  createDmTrigger(data: InsertDmTrigger): Promise<DmTrigger>;
  updateDmTrigger(id: string, data: Partial<InsertDmTrigger>): Promise<DmTrigger>;
  deleteDmTrigger(id: string): Promise<void>;
  getDmSequences(userId: string): Promise<DmSequence[]>;
  createDmSequence(data: InsertDmSequence): Promise<DmSequence>;
  updateDmSequence(id: string, data: Partial<InsertDmSequence>): Promise<DmSequence>;
  deleteDmSequence(id: string): Promise<void>;
  getDmSequenceSteps(sequenceId: string): Promise<DmSequenceStep[]>;
  upsertDmSequenceSteps(sequenceId: string, steps: Omit<InsertDmSequenceStep, "sequenceId">[]): Promise<DmSequenceStep[]>;
  getDmSequenceEnrollments(sequenceId: string): Promise<DmSequenceEnrollment[]>;
  enrollLeadInDmSequence(sequenceId: string, leadId: string, recipientIgId: string): Promise<DmSequenceEnrollment>;
  getPendingDmEnrollments(): Promise<(DmSequenceEnrollment & { sequenceId: string })[]>;
  getInstagramProfileReport(clientId: string): Promise<InstagramProfileReport | null>;
  upsertInstagramProfileReport(data: InsertInstagramProfileReport): Promise<InstagramProfileReport>;

  // YouTube OAuth tokens
  getYoutubeToken(userId: string): Promise<YoutubeToken | null>;
  upsertYoutubeToken(userId: string, data: Omit<YoutubeToken, "id" | "userId" | "createdAt">): Promise<YoutubeToken>;
  deleteYoutubeToken(userId: string): Promise<void>;

  // Google Calendar OAuth tokens
  getGoogleCalendarToken(userId: string): Promise<GoogleCalendarToken | null>;
  upsertGoogleCalendarToken(userId: string, data: Omit<GoogleCalendarToken, "id" | "userId" | "createdAt">): Promise<GoogleCalendarToken>;
  deleteGoogleCalendarToken(userId: string): Promise<void>;
  getScheduledYoutubePosts(userId: string): Promise<ScheduledYoutubePost[]>;
  getPendingDueYoutubePosts(): Promise<ScheduledYoutubePost[]>;
  createScheduledYoutubePost(data: InsertScheduledYoutubePost): Promise<ScheduledYoutubePost>;
  updateScheduledYoutubePost(id: string, data: Partial<ScheduledYoutubePost>): Promise<void>;
  deleteScheduledYoutubePost(id: string, userId: string): Promise<void>;

  // Forms
  getForms(userId: string): Promise<Form[]>;
  getForm(id: string): Promise<Form | undefined>;
  getFormBySlug(slug: string): Promise<Form | undefined>;
  createForm(data: InsertForm): Promise<Form>;
  updateForm(id: string, userId: string, data: Partial<InsertForm>): Promise<Form | undefined>;
  deleteForm(id: string, userId: string): Promise<void>;
  getFormQuestions(formId: string): Promise<FormQuestion[]>;
  saveFormQuestions(formId: string, questions: Omit<InsertFormQuestion, "formId">[]): Promise<FormQuestion[]>;
  getFormSubmissions(formId: string): Promise<(FormSubmission & { answers: FormAnswer[] })[]>;
  createFormSubmission(formId: string, data: { respondentName?: string; respondentEmail?: string; metadata?: any }, answers: { questionId: string; value: string }[]): Promise<FormSubmission>;
  trackFormView(formId: string, metadata?: any): Promise<void>;
  getFormAnalytics(formId: string): Promise<{ views: number; submissions: number; emailCaptures: number }>;

  // Video Studio
  getVideoEdits(userId: string): Promise<VideoEdit[]>;
  getVideoEdit(id: number, userId: string): Promise<VideoEdit | undefined>;
  createVideoEdit(data: InsertVideoEdit): Promise<VideoEdit>;
  updateVideoEdit(id: number, userId: string, data: Partial<InsertVideoEdit>): Promise<VideoEdit | undefined>;
  deleteVideoEdit(id: number, userId: string): Promise<void>;

  // B-Roll Library
  getBrollClips(userId: string): Promise<BrollClip[]>;
  createBrollClip(data: InsertBrollClip): Promise<BrollClip>;
  deleteBrollClip(id: number, userId: string): Promise<void>;

  // Scheduling System
  getMeetingTypes(): Promise<MeetingType[]>;
  getMeetingTypeBySlug(slug: string): Promise<MeetingType | undefined>;
  getMeetingType(id: string): Promise<MeetingType | undefined>;
  createMeetingType(data: InsertMeetingType): Promise<MeetingType>;
  updateMeetingType(id: string, data: Partial<InsertMeetingType>): Promise<MeetingType | undefined>;
  deleteMeetingType(id: string): Promise<void>;
  getAvailabilityRules(meetingTypeId: string): Promise<AvailabilityRule[]>;
  upsertAvailabilityRules(meetingTypeId: string, rules: Omit<InsertAvailabilityRule, "meetingTypeId">[]): Promise<AvailabilityRule[]>;
  getScheduledBookings(): Promise<(ScheduledBooking & { meetingType: MeetingType | null })[]>;
  getScheduledBookingsByMeetingType(meetingTypeId: string): Promise<ScheduledBooking[]>;
  getScheduledBooking(id: string): Promise<ScheduledBooking | undefined>;
  createScheduledBooking(data: InsertScheduledBooking): Promise<ScheduledBooking>;
  updateScheduledBooking(id: string, data: Partial<ScheduledBooking>): Promise<ScheduledBooking | undefined>;
  getUpcomingBookingsForReminders(): Promise<(ScheduledBooking & { meetingType: MeetingType | null })[]>;

  // Email Marketing
  getEmailSequences(): Promise<EmailSequence[]>;
  getEmailSequence(id: string): Promise<EmailSequence | undefined>;
  createEmailSequence(data: InsertEmailSequence): Promise<EmailSequence>;
  updateEmailSequence(id: string, data: Partial<InsertEmailSequence>): Promise<EmailSequence | undefined>;
  deleteEmailSequence(id: string): Promise<void>;
  getSequenceEmails(sequenceId: string): Promise<SequenceEmail[]>;
  createSequenceEmail(data: InsertSequenceEmail): Promise<SequenceEmail>;
  updateSequenceEmail(id: string, data: Partial<InsertSequenceEmail>): Promise<SequenceEmail | undefined>;
  deleteSequenceEmail(id: string): Promise<void>;
  enrollUserInSequence(userId: string, sequenceId: string): Promise<EmailEnrollment | null>;
  getPendingEnrollments(): Promise<(EmailEnrollment & { userEmail: string; userName: string | null })[]>;
  advanceEnrollment(id: string, nextStep: number, nextSendAt: Date | null, completed?: boolean): Promise<void>;
  logEmail(data: { toEmail: string; toName?: string; subject: string; sequenceEmailId?: string; broadcastId?: string }): Promise<EmailLog>;
  markEmailOpened(logId: string): Promise<void>;
  getEmailStats(): Promise<{ totalSent: number; totalOpened: number; sentToday: number; activeEnrollments: number }>;
  getEmailLogs(limit?: number): Promise<EmailLog[]>;
  createEmailBroadcast(data: InsertEmailBroadcast): Promise<EmailBroadcast>;
  getEmailBroadcasts(): Promise<EmailBroadcast[]>;
  updateEmailBroadcast(id: string, data: Partial<EmailBroadcast>): Promise<void>;
  isEmailUnsubscribed(email: string): Promise<boolean>;
  addEmailUnsubscribe(email: string): Promise<void>;

  // Everyday Reading
  getReadingMaterials(userId: string, category?: string): Promise<ReadingMaterial[]>;
  getReadingMaterial(id: string): Promise<ReadingMaterial | undefined>;
  createReadingMaterial(data: InsertReadingMaterial): Promise<ReadingMaterial>;
  updateReadingMaterial(id: string, data: Partial<InsertReadingMaterial>): Promise<ReadingMaterial | undefined>;
  deleteReadingMaterial(id: string): Promise<void>;
  getReadingHighlights(userId: string, materialId?: string): Promise<ReadingHighlight[]>;
  createReadingHighlight(data: InsertReadingHighlight): Promise<ReadingHighlight>;
  deleteReadingHighlight(id: string): Promise<void>;
  getReadingStreak(userId: string): Promise<ReadingStreak | undefined>;
  upsertReadingStreak(userId: string, data: Partial<ReadingStreak>): Promise<ReadingStreak>;
  getDailyReadings(userId: string, limit?: number): Promise<DailyReading[]>;
  getDailyReading(userId: string, date: Date): Promise<DailyReading | undefined>;
  createDailyReading(data: any): Promise<DailyReading>;
  updateDailyReading(id: string, data: Partial<DailyReading>): Promise<DailyReading | undefined>;

  // Video Marketing
  getWebinars(userId: string, status?: "upcoming" | "live" | "completed" | "cancelled"): Promise<Webinar[]>;
  getPublicWebinars(limit?: number): Promise<Webinar[]>;
  getWebinar(id: string): Promise<Webinar | undefined>;
  getWebinarByMeetingCode(meetingCode: string): Promise<Webinar | undefined>;
  createWebinar(data: InsertWebinar): Promise<Webinar>;
  updateWebinar(id: string, data: Partial<InsertWebinar>): Promise<Webinar | undefined>;
  deleteWebinar(id: string): Promise<void>;
  getWebinarRegistrations(webinarId: string): Promise<WebinarRegistration[]>;
  createWebinarRegistration(data: InsertWebinarRegistration): Promise<WebinarRegistration>;
  updateWebinarRegistration(id: string, data: Partial<InsertWebinarRegistration>): Promise<WebinarRegistration | undefined>;
  getVideoEvents(userId: string): Promise<VideoEvent[]>;
  getVideoEvent(id: string): Promise<VideoEvent | undefined>;
  createVideoEvent(data: InsertVideoEvent): Promise<VideoEvent>;
  updateVideoEvent(id: string, data: Partial<InsertVideoEvent>): Promise<VideoEvent | undefined>;
  deleteVideoEvent(id: string): Promise<void>;
  getWebinarRecordings(userId: string): Promise<WebinarRecording[]>;
  getWebinarRecording(id: string): Promise<WebinarRecording | undefined>;
  createWebinarRecording(data: InsertWebinarRecording): Promise<WebinarRecording>;
  updateWebinarRecording(id: string, data: Partial<InsertWebinarRecording>): Promise<WebinarRecording | undefined>;
  deleteWebinarRecording(id: string): Promise<void>;
  getWebinarLandingPage(webinarId: string): Promise<WebinarLandingPage | undefined>;
  getWebinarLandingPageBySlug(slug: string): Promise<WebinarLandingPage | undefined>;
  getWebinarLandingPageWithWebinar(slug: string): Promise<{ landingPage: WebinarLandingPage; webinar: Webinar } | undefined>;
  createWebinarLandingPage(data: InsertWebinarLandingPage): Promise<WebinarLandingPage>;
  updateWebinarLandingPage(id: string, data: Partial<InsertWebinarLandingPage>): Promise<WebinarLandingPage | undefined>;
  deleteWebinarLandingPage(id: string): Promise<void>;
  getWebinarLandingPagesByUser(userId: string): Promise<WebinarLandingPage[]>;
  trackLandingPageView(id: string): Promise<void>;
  incrementLandingPageRegistration(id: string): Promise<void>;
  // Video Marketing: Contacts / CRM
  getWebinarContacts(userId: string): Promise<WebinarContact[]>;
  getWebinarContact(id: string): Promise<WebinarContact | undefined>;
  createWebinarContact(data: InsertWebinarContact): Promise<WebinarContact>;
  updateWebinarContact(id: string, data: Partial<InsertWebinarContact>): Promise<WebinarContact | undefined>;
  deleteWebinarContact(id: string): Promise<void>;
  // Video Marketing: Analytics
  createVideoAnalyticsEvent(data: InsertVideoAnalyticsEvent): Promise<VideoAnalyticsEvent>;
  getVideoAnalyticsEvents(videoId: string): Promise<VideoAnalyticsEvent[]>;
  getVideoAnalyticsSummary(videoId: string): Promise<{ totalViews: number; totalCompletions: number; avgWatchTime: number }>;
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

  async getUserByPhone(phone: string) {
    const [user] = await db.select().from(users).where(eq(users.phone, phone));
    return user;
  }

  async setPhoneVerified(userId: string, phone: string): Promise<void> {
    await db.update(users).set({ phone, phoneVerified: true }).where(eq(users.id, userId));
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
    await db.delete(referralConversions).where(or(eq(referralConversions.referrerId, id), eq(referralConversions.referredUserId, id)));
    await db.delete(referralCodes).where(eq(referralCodes.userId, id));
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
    const result: { clientId: string; lastMessage: Message; unreadCount: number }[] = [];
    const unreadByClient: Record<string, number> = {};

    for (const msg of allMsgs) {
      const clientId = msg.senderId === adminId ? msg.receiverId : msg.senderId;
      // Count messages sent TO admin that are unread
      if (msg.receiverId === adminId && !msg.read) {
        unreadByClient[clientId] = (unreadByClient[clientId] || 0) + 1;
      }
      if (!seen.has(clientId)) {
        seen.add(clientId);
        result.push({ clientId, lastMessage: msg, unreadCount: 0 });
      }
    }

    // Attach unread counts
    for (const r of result) {
      r.unreadCount = unreadByClient[r.clientId] || 0;
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

  // ── Onboarding Surveys ─────────────────────────────────────────────────────
  async saveOnboardingSurvey(data: any): Promise<any> {
    const result = await pool.query(
      `INSERT INTO onboarding_surveys
         (user_id, awareness, field, fields, struggles, content_types, descriptor, experience, follower_count, monthly_revenue, primary_goal, platform, platforms, heard_about, answers)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       ON CONFLICT (user_id) DO UPDATE SET
         awareness=EXCLUDED.awareness,
         field=EXCLUDED.field, fields=EXCLUDED.fields,
         struggles=EXCLUDED.struggles, content_types=EXCLUDED.content_types,
         descriptor=EXCLUDED.descriptor, experience=EXCLUDED.experience,
         follower_count=EXCLUDED.follower_count, monthly_revenue=EXCLUDED.monthly_revenue,
         primary_goal=EXCLUDED.primary_goal,
         platform=EXCLUDED.platform, platforms=EXCLUDED.platforms,
         heard_about=EXCLUDED.heard_about,
         answers=EXCLUDED.answers, completed_at=NOW()
       RETURNING *`,
      [
        data.userId,
        data.awareness ?? null,
        data.field ?? null,
        data.fields ?? null,
        data.struggles ?? null,
        data.contentTypes ?? null,
        data.descriptor ?? null,
        data.experience ?? null,
        data.followerCount ?? null,
        data.monthlyRevenue ?? null,
        data.primaryGoal ?? null,
        data.platform ?? null,
        data.platforms ?? null,
        data.heardAbout ?? null,
        JSON.stringify(data.answers ?? {}),
      ]
    );
    return result.rows[0];
  }

  async getOnboardingSurvey(userId: string): Promise<any | undefined> {
    const result = await pool.query(`SELECT * FROM onboarding_surveys WHERE user_id=$1 LIMIT 1`, [userId]);
    return result.rows[0];
  }

  async getAllOnboardingSurveys(): Promise<any[]> {
    const result = await pool.query(
      `SELECT os.*, u.name as user_name, u.email as user_email, u.plan as user_plan, u.created_at as user_created_at
       FROM onboarding_surveys os
       LEFT JOIN users u ON u.id = os.user_id
       ORDER BY os.completed_at DESC`
    );
    return result.rows;
  }

  // ── Credit system ──────────────────────────────────────────────────────────
  // Tier 1 (free)=20/month, Tier 2 (starter)=100/month, Tier 3 (growth)=250/month
  // Tier 4 (pro)=500/month, Tier 5 (elite)=unlimited (bypass all checks)
  private readonly PLAN_CREDITS: Record<string, number> = { free: 20, starter: 100, growth: 250, pro: 500, elite: 99999 };

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

  async getGoogleCalendarToken(userId: string): Promise<GoogleCalendarToken | null> {
    const [row] = await db.select().from(googleCalendarTokens).where(eq(googleCalendarTokens.userId, userId));
    return row ?? null;
  }

  async upsertGoogleCalendarToken(userId: string, data: Omit<GoogleCalendarToken, "id" | "userId" | "createdAt">): Promise<GoogleCalendarToken> {
    const existing = await this.getGoogleCalendarToken(userId);
    if (existing) {
      const [row] = await db.update(googleCalendarTokens).set(data).where(eq(googleCalendarTokens.userId, userId)).returning();
      return row;
    }
    const [row] = await db.insert(googleCalendarTokens).values({ userId, ...data }).returning();
    return row;
  }

  async deleteGoogleCalendarToken(userId: string): Promise<void> {
    await db.delete(googleCalendarTokens).where(eq(googleCalendarTokens.userId, userId));
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

  // ── Forms ──────────────────────────────────────────────────────────────────
  async getForms(userId: string): Promise<Form[]> {
    return db.select().from(forms).where(eq(forms.userId, userId)).orderBy(desc(forms.createdAt));
  }

  async getForm(id: string): Promise<Form | undefined> {
    const [row] = await db.select().from(forms).where(eq(forms.id, id));
    return row;
  }

  async getFormBySlug(slug: string): Promise<Form | undefined> {
    const [row] = await db.select().from(forms).where(eq(forms.slug, slug));
    return row;
  }

  async createForm(data: InsertForm): Promise<Form> {
    const [row] = await db.insert(forms).values(data).returning();
    return row;
  }

  async updateForm(id: string, userId: string, data: Partial<InsertForm>): Promise<Form | undefined> {
    const [row] = await db.update(forms).set(data).where(and(eq(forms.id, id), eq(forms.userId, userId))).returning();
    return row;
  }

  async deleteForm(id: string, userId: string): Promise<void> {
    await db.delete(forms).where(and(eq(forms.id, id), eq(forms.userId, userId)));
  }

  async getFormQuestions(formId: string): Promise<FormQuestion[]> {
    return db.select().from(formQuestions).where(eq(formQuestions.formId, formId)).orderBy(formQuestions.orderIdx);
  }

  async saveFormQuestions(formId: string, questions: Omit<InsertFormQuestion, "formId">[]): Promise<FormQuestion[]> {
    await db.delete(formQuestions).where(eq(formQuestions.formId, formId));
    if (!questions.length) return [];
    const rows = await db.insert(formQuestions).values(questions.map((q, i) => ({ ...q, formId, orderIdx: i }))).returning();
    return rows;
  }

  async getFormSubmissions(formId: string): Promise<(FormSubmission & { answers: FormAnswer[] })[]> {
    const subs = await db.select().from(formSubmissions).where(eq(formSubmissions.formId, formId)).orderBy(desc(formSubmissions.submittedAt));
    if (!subs.length) return [];
    const subIds = subs.map(s => s.id);
    const ans = await db.select().from(formAnswers).where(inArray(formAnswers.submissionId, subIds));
    return subs.map(s => ({ ...s, answers: ans.filter(a => a.submissionId === s.id) }));
  }

  async createFormSubmission(formId: string, data: { respondentName?: string; respondentEmail?: string; metadata?: any }, answers: { questionId: string; value: string }[]): Promise<FormSubmission> {
    const [sub] = await db.insert(formSubmissions).values({ formId, ...data }).returning();
    if (answers.length) {
      await db.insert(formAnswers).values(answers.map(a => ({ submissionId: sub.id, questionId: a.questionId, value: a.value })));
    }
    return sub;
  }

  async trackFormView(formId: string, metadata?: any): Promise<void> {
    await db.insert(formViews).values({ formId, metadata });
  }

  async getFormAnalytics(formId: string): Promise<{ views: number; submissions: number; emailCaptures: number }> {
    const viewRows = await db.select({ count: sqlExpr<number>`count(*)::int` }).from(formViews).where(eq(formViews.formId, formId));
    const subRows = await db.select({ count: sqlExpr<number>`count(*)::int` }).from(formSubmissions).where(eq(formSubmissions.formId, formId));
    const emailRows = await db.select({ count: sqlExpr<number>`count(*)::int` }).from(formSubmissions).where(and(eq(formSubmissions.formId, formId), sqlExpr`respondent_email IS NOT NULL AND respondent_email != ''`));
    return {
      views: viewRows[0]?.count ?? 0,
      submissions: subRows[0]?.count ?? 0,
      emailCaptures: emailRows[0]?.count ?? 0,
    };
  }

  // ── Meetings Notetaker ──────────────────────────────────────────────────────
  async getMeetings(userId: string): Promise<Meeting[]> {
    return db.select().from(meetings).where(eq(meetings.userId, userId)).orderBy(desc(meetings.createdAt));
  }

  async getMeeting(id: number, userId: string): Promise<Meeting | undefined> {
    const rows = await db.select().from(meetings).where(and(eq(meetings.id, id), eq(meetings.userId, userId)));
    return rows[0];
  }

  async createMeeting(data: InsertMeeting): Promise<Meeting> {
    const rows = await db.insert(meetings).values(data).returning();
    return rows[0];
  }

  async updateMeeting(id: number, userId: string, data: Partial<InsertMeeting>): Promise<Meeting | undefined> {
    const rows = await db.update(meetings).set(data).where(and(eq(meetings.id, id), eq(meetings.userId, userId))).returning();
    return rows[0];
  }

  async deleteMeeting(id: number, userId: string): Promise<void> {
    await db.delete(meetings).where(and(eq(meetings.id, id), eq(meetings.userId, userId)));
  }

  // ── Video Studio ─────────────────────────────────────────────────────────────
  async getVideoEdits(userId: string): Promise<VideoEdit[]> {
    return db.select().from(videoEdits).where(eq(videoEdits.userId, userId)).orderBy(desc(videoEdits.createdAt));
  }

  async getVideoEdit(id: number, userId: string): Promise<VideoEdit | undefined> {
    const rows = await db.select().from(videoEdits).where(and(eq(videoEdits.id, id), eq(videoEdits.userId, userId)));
    return rows[0];
  }

  async createVideoEdit(data: InsertVideoEdit): Promise<VideoEdit> {
    const rows = await db.insert(videoEdits).values(data).returning();
    return rows[0];
  }

  async updateVideoEdit(id: number, userId: string, data: Partial<InsertVideoEdit>): Promise<VideoEdit | undefined> {
    const rows = await db.update(videoEdits).set(data).where(and(eq(videoEdits.id, id), eq(videoEdits.userId, userId))).returning();
    return rows[0];
  }

  async deleteVideoEdit(id: number, userId: string): Promise<void> {
    await db.delete(videoEdits).where(and(eq(videoEdits.id, id), eq(videoEdits.userId, userId)));
  }

  // ── B-Roll Library ───────────────────────────────────────────────────────────
  async getBrollClips(userId: string): Promise<BrollClip[]> {
    return db.select().from(brollClips).where(eq(brollClips.userId, userId)).orderBy(desc(brollClips.createdAt));
  }

  async createBrollClip(data: InsertBrollClip): Promise<BrollClip> {
    const rows = await db.insert(brollClips).values(data).returning();
    return rows[0];
  }

  async deleteBrollClip(id: number, userId: string): Promise<void> {
    await db.delete(brollClips).where(and(eq(brollClips.id, id), eq(brollClips.userId, userId)));
  }

  // ── Instagram Growth Tracker ───────────────────────────────────────────────
  async getIgTrackedProfiles(userId: string): Promise<(IgTrackedProfile & { latestSnapshot: IgFollowerSnapshot | null; prevSnapshot: IgFollowerSnapshot | null })[]> {
    const profiles = await db.select().from(igTrackedProfiles).where(eq(igTrackedProfiles.userId, userId)).orderBy(igTrackedProfiles.createdAt);
    const result = [];
    for (const profile of profiles) {
      const snaps = await db.select().from(igFollowerSnapshots).where(eq(igFollowerSnapshots.profileId, profile.id)).orderBy(desc(igFollowerSnapshots.scannedAt)).limit(2);
      result.push({ ...profile, latestSnapshot: snaps[0] ?? null, prevSnapshot: snaps[1] ?? null });
    }
    return result;
  }

  async getAllIgTrackedProfiles(): Promise<IgTrackedProfile[]> {
    return db.select().from(igTrackedProfiles);
  }

  async addIgTrackedProfile(data: InsertIgTrackedProfile): Promise<IgTrackedProfile> {
    const rows = await db.insert(igTrackedProfiles).values(data).returning();
    return rows[0];
  }

  async updateIgTrackedProfile(id: number, data: Partial<IgTrackedProfile>): Promise<void> {
    await db.update(igTrackedProfiles).set(data).where(eq(igTrackedProfiles.id, id));
  }

  async deleteIgTrackedProfile(id: number, userId: string): Promise<void> {
    await db.delete(igTrackedProfiles).where(and(eq(igTrackedProfiles.id, id), eq(igTrackedProfiles.userId, userId)));
  }

  async addIgFollowerSnapshot(data: InsertIgFollowerSnapshot): Promise<IgFollowerSnapshot> {
    const rows = await db.insert(igFollowerSnapshots).values(data).returning();
    return rows[0];
  }

  async getIgFollowerSnapshots(profileId: number): Promise<IgFollowerSnapshot[]> {
    return db.select().from(igFollowerSnapshots).where(eq(igFollowerSnapshots.profileId, profileId)).orderBy(igFollowerSnapshots.scannedAt);
  }

  // ── Instagram Comment Bot ───────────────────────────────────────────────────
  async getIgBotCookies(userId: string) {
    const rows = await db.select().from(igBotCookies).where(eq(igBotCookies.userId, userId)).limit(1);
    return rows[0] || null;
  }

  async upsertIgBotCookies(userId: string, cookiesJson: string) {
    const existing = await this.getIgBotCookies(userId);
    if (existing) {
      const rows = await db.update(igBotCookies).set({ cookiesJson, updatedAt: new Date() }).where(eq(igBotCookies.userId, userId)).returning();
      return rows[0];
    }
    const rows = await db.insert(igBotCookies).values({ userId, cookiesJson }).returning();
    return rows[0];
  }

  async getIgBotCampaigns(userId: string) {
    return db.select().from(igBotCampaigns).where(eq(igBotCampaigns.userId, userId)).orderBy(igBotCampaigns.createdAt);
  }

  async createIgBotCampaign(data: { userId: string; name: string; postUrls: string[]; comments: string[] }) {
    const rows = await db.insert(igBotCampaigns).values(data).returning();
    return rows[0];
  }

  async updateIgBotCampaign(id: number, userId: string, data: Partial<typeof igBotCampaigns.$inferSelect>) {
    const rows = await db.update(igBotCampaigns).set(data).where(and(eq(igBotCampaigns.id, id), eq(igBotCampaigns.userId, userId))).returning();
    return rows[0];
  }

  async deleteIgBotCampaign(id: number, userId: string) {
    await db.delete(igBotCampaigns).where(and(eq(igBotCampaigns.id, id), eq(igBotCampaigns.userId, userId)));
  }

  // ── Scheduling System ────────────────────────────────────────────────────────
  async getMeetingTypes(): Promise<MeetingType[]> {
    return db.select().from(meetingTypes).orderBy(desc(meetingTypes.createdAt));
  }

  async getMeetingTypeBySlug(slug: string): Promise<MeetingType | undefined> {
    const [row] = await db.select().from(meetingTypes).where(eq(meetingTypes.slug, slug));
    return row;
  }

  async getMeetingType(id: string): Promise<MeetingType | undefined> {
    const [row] = await db.select().from(meetingTypes).where(eq(meetingTypes.id, id));
    return row;
  }

  async createMeetingType(data: InsertMeetingType): Promise<MeetingType> {
    const [row] = await db.insert(meetingTypes).values(data).returning();
    return row;
  }

  async updateMeetingType(id: string, data: Partial<InsertMeetingType>): Promise<MeetingType | undefined> {
    const [row] = await db.update(meetingTypes).set(data).where(eq(meetingTypes.id, id)).returning();
    return row;
  }

  async deleteMeetingType(id: string): Promise<void> {
    await db.delete(meetingTypes).where(eq(meetingTypes.id, id));
  }

  async getAvailabilityRules(meetingTypeId: string): Promise<AvailabilityRule[]> {
    return db.select().from(availabilityRules).where(eq(availabilityRules.meetingTypeId, meetingTypeId)).orderBy(availabilityRules.dayOfWeek);
  }

  async upsertAvailabilityRules(meetingTypeId: string, rules: Omit<InsertAvailabilityRule, "meetingTypeId">[]): Promise<AvailabilityRule[]> {
    await db.delete(availabilityRules).where(eq(availabilityRules.meetingTypeId, meetingTypeId));
    if (rules.length === 0) return [];
    const inserted = await db.insert(availabilityRules).values(rules.map(r => ({ ...r, meetingTypeId }))).returning();
    return inserted;
  }

  async getScheduledBookings(): Promise<(ScheduledBooking & { meetingType: MeetingType | null })[]> {
    const bookings = await db.select().from(scheduledBookings).orderBy(desc(scheduledBookings.startTime));
    const types = await db.select().from(meetingTypes);
    return bookings.map(b => ({ ...b, meetingType: types.find(t => t.id === b.meetingTypeId) || null }));
  }

  async getScheduledBookingsByMeetingType(meetingTypeId: string): Promise<ScheduledBooking[]> {
    return db.select().from(scheduledBookings).where(eq(scheduledBookings.meetingTypeId, meetingTypeId)).orderBy(desc(scheduledBookings.startTime));
  }

  async getScheduledBooking(id: string): Promise<ScheduledBooking | undefined> {
    const [row] = await db.select().from(scheduledBookings).where(eq(scheduledBookings.id, id));
    return row;
  }

  async createScheduledBooking(data: InsertScheduledBooking): Promise<ScheduledBooking> {
    const [row] = await db.insert(scheduledBookings).values(data).returning();
    return row;
  }

  async updateScheduledBooking(id: string, data: Partial<ScheduledBooking>): Promise<ScheduledBooking | undefined> {
    const [row] = await db.update(scheduledBookings).set(data).where(eq(scheduledBookings.id, id)).returning();
    return row;
  }

  async getUpcomingBookingsForReminders(): Promise<(ScheduledBooking & { meetingType: MeetingType | null })[]> {
    const now = new Date();
    const in25Hours = new Date(now.getTime() + 25 * 60 * 60 * 1000);
    const bookings = await db.select().from(scheduledBookings).where(
      and(
        eq(scheduledBookings.status, "scheduled"),
        gte(scheduledBookings.startTime, now),
        lte(scheduledBookings.startTime, in25Hours)
      )
    );
    const types = await db.select().from(meetingTypes);
    return bookings.map(b => ({ ...b, meetingType: types.find(t => t.id === b.meetingTypeId) || null }));
  }

  // ── Email Marketing ────────────────────────────────────────────────────────
  async getEmailSequences() {
    return db.select().from(emailSequences).orderBy(desc(emailSequences.createdAt));
  }
  async getEmailSequence(id: string) {
    const [row] = await db.select().from(emailSequences).where(eq(emailSequences.id, id));
    return row;
  }
  async createEmailSequence(data: InsertEmailSequence) {
    const [row] = await db.insert(emailSequences).values(data).returning();
    return row;
  }
  async updateEmailSequence(id: string, data: Partial<InsertEmailSequence>) {
    const [row] = await db.update(emailSequences).set(data).where(eq(emailSequences.id, id)).returning();
    return row;
  }
  async deleteEmailSequence(id: string) {
    await db.delete(emailSequences).where(eq(emailSequences.id, id));
  }
  async getSequenceEmails(sequenceId: string) {
    return db.select().from(sequenceEmails).where(eq(sequenceEmails.sequenceId, sequenceId)).orderBy(sequenceEmails.sortOrder, sequenceEmails.delayDays);
  }
  async createSequenceEmail(data: InsertSequenceEmail) {
    const [row] = await db.insert(sequenceEmails).values(data).returning();
    return row;
  }
  async updateSequenceEmail(id: string, data: Partial<InsertSequenceEmail>) {
    const [row] = await db.update(sequenceEmails).set(data).where(eq(sequenceEmails.id, id)).returning();
    return row;
  }
  async deleteSequenceEmail(id: string) {
    await db.delete(sequenceEmails).where(eq(sequenceEmails.id, id));
  }
  async enrollUserInSequence(userId: string, sequenceId: string): Promise<EmailEnrollment | null> {
    // Don't enroll if already enrolled (and not completed/unsubscribed)
    const existing = await db.select().from(emailEnrollments).where(
      and(eq(emailEnrollments.userId, userId), eq(emailEnrollments.sequenceId, sequenceId))
    );
    if (existing.length > 0) return null;
    const [row] = await db.insert(emailEnrollments).values({
      userId, sequenceId, currentStep: 0, completed: false, unsubscribed: false, nextSendAt: new Date(),
    }).returning();
    return row;
  }
  async getPendingEnrollments() {
    const now = new Date();
    const rows = await db.select({
      enrollment: emailEnrollments,
      userEmail: users.email,
      userName: users.name,
    }).from(emailEnrollments)
      .innerJoin(users, eq(emailEnrollments.userId, users.id))
      .where(
        and(
          eq(emailEnrollments.completed, false),
          eq(emailEnrollments.unsubscribed, false),
          lte(emailEnrollments.nextSendAt, now),
        )
      );
    return rows.map(r => ({ ...r.enrollment, userEmail: r.userEmail, userName: r.userName }));
  }
  async advanceEnrollment(id: string, nextStep: number, nextSendAt: Date | null, completed = false) {
    await db.update(emailEnrollments).set({ currentStep: nextStep, nextSendAt: nextSendAt ?? undefined, completed }).where(eq(emailEnrollments.id, id));
  }
  async logEmail(data: { toEmail: string; toName?: string; subject: string; sequenceEmailId?: string; broadcastId?: string }) {
    const [row] = await db.insert(emailLogs).values({ ...data, sentAt: new Date() }).returning();
    return row;
  }
  async markEmailOpened(logId: string) {
    await db.update(emailLogs).set({ openedAt: new Date() }).where(and(eq(emailLogs.id, logId), isNull(emailLogs.openedAt)));
  }
  async getEmailStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const allLogs = await db.select().from(emailLogs);
    const totalSent = allLogs.length;
    const totalOpened = allLogs.filter(l => l.openedAt).length;
    const sentToday = allLogs.filter(l => l.sentAt && l.sentAt >= today).length;
    const activeEnrollments = await db.select().from(emailEnrollments).where(and(eq(emailEnrollments.completed, false), eq(emailEnrollments.unsubscribed, false)));
    return { totalSent, totalOpened, sentToday, activeEnrollments: activeEnrollments.length };
  }
  async getEmailLogs(limit = 50) {
    return db.select().from(emailLogs).orderBy(desc(emailLogs.sentAt)).limit(limit);
  }
  async createEmailBroadcast(data: InsertEmailBroadcast) {
    const [row] = await db.insert(emailBroadcasts).values(data).returning();
    return row;
  }
  async getEmailBroadcasts() {
    return db.select().from(emailBroadcasts).orderBy(desc(emailBroadcasts.createdAt));
  }
  async updateEmailBroadcast(id: string, data: Partial<EmailBroadcast>) {
    await db.update(emailBroadcasts).set(data).where(eq(emailBroadcasts.id, id));
  }
  async isEmailUnsubscribed(email: string) {
    const [row] = await db.select().from(emailUnsubscribes).where(eq(emailUnsubscribes.email, email));
    return !!row;
  }
  async addEmailUnsubscribe(email: string) {
    await db.insert(emailUnsubscribes).values({ email }).onConflictDoNothing();
  }

  // ── Everyday Reading ───────────────────────────────────────────────────────
  async getReadingMaterials(userId: string, category?: string): Promise<ReadingMaterial[]> {
    if (category && category !== "all") {
      return db.select().from(readingMaterials)
        .where(and(eq(readingMaterials.userId, userId), eq(readingMaterials.category, category)))
        .orderBy(desc(readingMaterials.createdAt));
    }
    return db.select().from(readingMaterials).where(eq(readingMaterials.userId, userId)).orderBy(desc(readingMaterials.createdAt));
  }
  async getReadingMaterial(id: string): Promise<ReadingMaterial | undefined> {
    const [row] = await db.select().from(readingMaterials).where(eq(readingMaterials.id, id));
    return row;
  }
  async createReadingMaterial(data: InsertReadingMaterial): Promise<ReadingMaterial> {
    const [row] = await db.insert(readingMaterials).values(data).returning();
    return row;
  }
  async updateReadingMaterial(id: string, data: Partial<InsertReadingMaterial>): Promise<ReadingMaterial | undefined> {
    const [row] = await db.update(readingMaterials).set({ ...data, updatedAt: new Date() }).where(eq(readingMaterials.id, id)).returning();
    return row;
  }
  async deleteReadingMaterial(id: string): Promise<void> {
    await db.delete(readingMaterials).where(eq(readingMaterials.id, id));
  }
  async getReadingHighlights(userId: string, materialId?: string): Promise<ReadingHighlight[]> {
    if (materialId) {
      return db.select().from(readingHighlights)
        .where(and(eq(readingHighlights.userId, userId), eq(readingHighlights.materialId, materialId)))
        .orderBy(desc(readingHighlights.createdAt));
    }
    return db.select().from(readingHighlights).where(eq(readingHighlights.userId, userId)).orderBy(desc(readingHighlights.createdAt));
  }
  async createReadingHighlight(data: InsertReadingHighlight): Promise<ReadingHighlight> {
    const [row] = await db.insert(readingHighlights).values(data).returning();
    return row;
  }
  async deleteReadingHighlight(id: string): Promise<void> {
    await db.delete(readingHighlights).where(eq(readingHighlights.id, id));
  }
  async getReadingStreak(userId: string): Promise<ReadingStreak | undefined> {
    const [row] = await db.select().from(readingStreaks).where(eq(readingStreaks.userId, userId));
    return row;
  }
  async upsertReadingStreak(userId: string, data: Partial<ReadingStreak>): Promise<ReadingStreak> {
    const existing = await this.getReadingStreak(userId);
    if (existing) {
      const [row] = await db.update(readingStreaks).set({ ...data, updatedAt: new Date() }).where(eq(readingStreaks.userId, userId)).returning();
      return row;
    }
    const [row] = await db.insert(readingStreaks).values({ userId, ...data } as any).returning();
    return row;
  }
  async getDailyReadings(userId: string, limit = 30): Promise<DailyReading[]> {
    return db.select().from(dailyReadings).where(eq(dailyReadings.userId, userId)).orderBy(desc(dailyReadings.date)).limit(limit);
  }
  async getDailyReading(userId: string, date: Date): Promise<DailyReading | undefined> {
    const start = new Date(date); start.setHours(0, 0, 0, 0);
    const end = new Date(date); end.setHours(23, 59, 59, 999);
    const [row] = await db.select().from(dailyReadings).where(
      and(eq(dailyReadings.userId, userId), gte(dailyReadings.date, start), lte(dailyReadings.date, end))
    );
    return row;
  }
  async createDailyReading(data: any): Promise<DailyReading> {
    const [row] = await db.insert(dailyReadings).values(data).returning();
    return row;
  }
  async updateDailyReading(id: string, data: Partial<DailyReading>): Promise<DailyReading | undefined> {
    const [row] = await db.update(dailyReadings).set(data).where(eq(dailyReadings.id, id)).returning();
    return row;
  }

  // ── DM Automation (ManyChat-style) ─────────────────────────────────────────
  async getDmTriggers(userId: string): Promise<DmTrigger[]> {
    return db.select().from(dmTriggers).where(eq(dmTriggers.userId, userId)).orderBy(desc(dmTriggers.createdAt));
  }
  async createDmTrigger(data: InsertDmTrigger): Promise<DmTrigger> {
    const [row] = await db.insert(dmTriggers).values(data).returning();
    return row;
  }
  async updateDmTrigger(id: string, data: Partial<InsertDmTrigger>): Promise<DmTrigger> {
    const [row] = await db.update(dmTriggers).set(data).where(eq(dmTriggers.id, id)).returning();
    return row;
  }
  async deleteDmTrigger(id: string): Promise<void> {
    await db.delete(dmTriggers).where(eq(dmTriggers.id, id));
  }

  async getDmSequences(userId: string): Promise<DmSequence[]> {
    return db.select().from(dmSequences).where(eq(dmSequences.userId, userId)).orderBy(desc(dmSequences.createdAt));
  }
  async createDmSequence(data: InsertDmSequence): Promise<DmSequence> {
    const [row] = await db.insert(dmSequences).values(data).returning();
    return row;
  }
  async updateDmSequence(id: string, data: Partial<InsertDmSequence>): Promise<DmSequence> {
    const [row] = await db.update(dmSequences).set(data).where(eq(dmSequences.id, id)).returning();
    return row;
  }
  async deleteDmSequence(id: string): Promise<void> {
    await db.delete(dmSequences).where(eq(dmSequences.id, id));
  }

  async getDmSequenceSteps(sequenceId: string): Promise<DmSequenceStep[]> {
    return db.select().from(dmSequenceSteps).where(eq(dmSequenceSteps.sequenceId, sequenceId)).orderBy(dmSequenceSteps.stepOrder);
  }
  async upsertDmSequenceSteps(sequenceId: string, steps: Omit<InsertDmSequenceStep, "sequenceId">[]): Promise<DmSequenceStep[]> {
    await db.delete(dmSequenceSteps).where(eq(dmSequenceSteps.sequenceId, sequenceId));
    if (!steps.length) return [];
    const rows = await db.insert(dmSequenceSteps).values(steps.map((s, i) => ({ ...s, sequenceId, stepOrder: i }))).returning();
    return rows;
  }

  async getDmSequenceEnrollments(sequenceId: string): Promise<DmSequenceEnrollment[]> {
    return db.select().from(dmSequenceEnrollments).where(eq(dmSequenceEnrollments.sequenceId, sequenceId)).orderBy(desc(dmSequenceEnrollments.enrolledAt));
  }
  async enrollLeadInDmSequence(sequenceId: string, leadId: string, recipientIgId: string): Promise<DmSequenceEnrollment> {
    const [row] = await db.insert(dmSequenceEnrollments).values({
      sequenceId, leadId, recipientIgId, currentStep: 0, completed: false, nextSendAt: new Date(),
    }).returning();
    return row;
  }
  async getPendingDmEnrollments(): Promise<(DmSequenceEnrollment & { sequenceId: string })[]> {
    const now = new Date();
    return db.select().from(dmSequenceEnrollments).where(
      and(
        eq(dmSequenceEnrollments.completed, false),
        lte(dmSequenceEnrollments.nextSendAt, now)
      )
    ) as any;
  }

  // ── Referral System ─────────────────────────────────────────────────────────
  async getOrCreateReferralCode(userId: string): Promise<string> {
    const [existing] = await db.select().from(referralCodes).where(eq(referralCodes.userId, userId));
    if (existing) return existing.code;
    const user = await this.getUser(userId);
    const base = (user?.name || "user").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8);
    const suffix = Math.random().toString(36).slice(2, 6);
    const code = `${base}${suffix}`;
    const [row] = await db.insert(referralCodes).values({ userId, code }).returning();
    return row.code;
  }

  async getReferralCode(code: string): Promise<any | undefined> {
    const [row] = await db.select().from(referralCodes).where(eq(referralCodes.code, code));
    return row;
  }

  async trackReferralClick(code: string, ip: string, ua: string): Promise<void> {
    await db.insert(referralClicks).values({ code, ipAddress: ip, userAgent: ua });
  }

  async processReferralSignup(code: string, newUserId: string, email: string, ipAddress?: string): Promise<void> {
    const ref = await this.getReferralCode(code);
    if (!ref || ref.userId === newUserId) return;

    // Prevent double-processing the same referred user
    const [existing] = await db.select().from(referralConversions)
      .where(eq(referralConversions.referredUserId, newUserId));
    if (existing) return;

    // IP abuse check — if referrer signed up from same IP, block it
    if (ipAddress) {
      const referrerUser = await this.getUser(ref.userId);
      // Check if any recent signups from same IP already exist for this referrer
      const recentClicks = await db.select().from(referralClicks)
        .where(and(eq(referralClicks.code, code), eq(referralClicks.ipAddress, ipAddress)));
      if (recentClicks.length > 1) {
        // Same IP clicked the referral link multiple times — likely self-referral
        console.log(`[referral] ⚠️ Blocked suspected self-referral from IP ${ipAddress} for code ${code}`);
        return;
      }
    }

    // Record the conversion — award credits on free signup too
    await db.insert(referralConversions).values({
      referrerId: ref.userId, referredUserId: newUserId, referredEmail: email,
      registered: true, converted: false, creditAwarded: false,
    });

    // Award referrer 25 credits when friend signs up free
    await this.addBonusCredits(ref.userId, 25, `Referral bonus — ${email} joined`);
    // Award referred person 25 welcome credits
    await this.addBonusCredits(newUserId, 25, `Welcome bonus — joined via referral`);

    console.log(`[referral] ✅ Referrer ${ref.userId} +25 credits | New user ${newUserId} +25 credits (code: ${code})`);
  }

  async processReferralConversion(referredUserId: string): Promise<void> {
    // Called when a referred user upgrades to a paid plan
    const [conversion] = await db.select().from(referralConversions)
      .where(and(eq(referralConversions.referredUserId, referredUserId), eq(referralConversions.creditAwarded, false)));
    if (!conversion) return;

    // Award both referrer AND referred user 100 bonus credits for upgrading
    await this.addBonusCredits(conversion.referrerId, 100, `Referral upgrade bonus — referred user upgraded to paid plan`);
    await this.addBonusCredits(referredUserId, 100, `Upgrade bonus — you upgraded via referral link`);

    // Mark as converted and credited
    await db.update(referralConversions)
      .set({ converted: true, creditAwarded: true, convertedAt: new Date() })
      .where(eq(referralConversions.id, conversion.id));

    console.log(`[referral] 💰 Referrer ${conversion.referrerId} +100 credits & referred user ${referredUserId} +100 credits — upgraded`);
  }

  async getReferralStats(userId: string): Promise<{ code: string; clicks: number; signups: number; conversions: number }> {
    const code = await this.getOrCreateReferralCode(userId);
    const clicks = await db.select().from(referralClicks).where(eq(referralClicks.code, code));
    const conversions = await db.select().from(referralConversions).where(eq(referralConversions.referrerId, userId));
    const converted = conversions.filter(c => c.converted);
    return { code, clicks: clicks.length, signups: conversions.length, conversions: converted.length };
  }

  async getAllReferralStats(): Promise<any[]> {
    const result = await db.execute(sqlExpr`
      SELECT rc.code, rc.user_id, u.name, u.email, u.plan,
        (SELECT COUNT(*) FROM referral_clicks rl WHERE rl.code = rc.code) AS clicks,
        (SELECT COUNT(*) FROM referral_conversions rv WHERE rv.referrer_id = rc.user_id) AS signups,
        (SELECT COUNT(*) FROM referral_conversions rv WHERE rv.referrer_id = rc.user_id AND rv.converted = true) AS conversions
      FROM referral_codes rc
      LEFT JOIN users u ON u.id = rc.user_id
      ORDER BY signups DESC
    `);
    return result.rows as any[];
  }

  async getReferralLeaderboard(): Promise<any[]> {
    const result = await db.execute(sqlExpr`
      SELECT rc.code, rc.user_id, u.name, u.email, u.plan,
        (SELECT COUNT(*) FROM referral_clicks rl WHERE rl.code = rc.code) AS clicks,
        (SELECT COUNT(*) FROM referral_conversions rv WHERE rv.referrer_id = rc.user_id) AS signups,
        (SELECT COUNT(*) FROM referral_conversions rv WHERE rv.referrer_id = rc.user_id AND rv.converted = true) AS conversions
      FROM referral_codes rc
      LEFT JOIN users u ON u.id = rc.user_id
      ORDER BY signups DESC
      LIMIT 20
    `);
    return result.rows as any[];
  }

  // ── Video Marketing / Webinars ───────────────────────────────────────────
  async getWebinars(userId: string, status?: "upcoming" | "live" | "completed" | "cancelled"): Promise<Webinar[]> {
    if (status) {
      return db.select().from(webinars).where(and(eq(webinars.userId, userId), eq(webinars.status, status))).orderBy(desc(webinars.scheduledAt));
    }
    return db.select().from(webinars).where(eq(webinars.userId, userId)).orderBy(desc(webinars.scheduledAt));
  }
  async getPublicWebinars(limit: number = 20): Promise<Webinar[]> {
    return db
      .select()
      .from(webinars)
      .where(and(eq(webinars.isPublic, true), eq(webinars.status, "upcoming")))
      .orderBy(webinars.scheduledAt)
      .limit(limit);
  }
  async getWebinar(id: string): Promise<Webinar | undefined> {
    const [row] = await db.select().from(webinars).where(eq(webinars.id, id));
    return row;
  }
  async createWebinar(data: InsertWebinar): Promise<Webinar> {
    const [row] = await db.insert(webinars).values(data).returning();
    return row;
  }
  async updateWebinar(id: string, data: Partial<InsertWebinar>): Promise<Webinar | undefined> {
    const [row] = await db.update(webinars).set({ ...data, updatedAt: new Date() }).where(eq(webinars.id, id)).returning();
    return row;
  }
  async deleteWebinar(id: string): Promise<void> {
    await db.delete(webinars).where(eq(webinars.id, id));
  }
  async getWebinarRegistrations(webinarId: string): Promise<WebinarRegistration[]> {
    return db.select().from(webinarRegistrations).where(eq(webinarRegistrations.webinarId, webinarId)).orderBy(desc(webinarRegistrations.registeredAt));
  }
  async createWebinarRegistration(data: InsertWebinarRegistration): Promise<WebinarRegistration> {
    const [row] = await db.insert(webinarRegistrations).values(data).returning();
    return row;
  }
  async updateWebinarRegistration(id: string, data: Partial<InsertWebinarRegistration>): Promise<WebinarRegistration | undefined> {
    const [row] = await db.update(webinarRegistrations).set(data).where(eq(webinarRegistrations.id, id)).returning();
    return row;
  }
  async getVideoEvents(userId: string): Promise<VideoEvent[]> {
    return db.select().from(videoEvents).where(eq(videoEvents.userId, userId)).orderBy(desc(videoEvents.createdAt));
  }
  async getVideoEvent(id: string): Promise<VideoEvent | undefined> {
    const [row] = await db.select().from(videoEvents).where(eq(videoEvents.id, id));
    return row;
  }
  async createVideoEvent(data: InsertVideoEvent): Promise<VideoEvent> {
    const [row] = await db.insert(videoEvents).values(data).returning();
    return row;
  }
  async updateVideoEvent(id: string, data: Partial<InsertVideoEvent>): Promise<VideoEvent | undefined> {
    const [row] = await db.update(videoEvents).set(data).where(eq(videoEvents.id, id)).returning();
    return row;
  }
  async deleteVideoEvent(id: string): Promise<void> {
    await db.delete(videoEvents).where(eq(videoEvents.id, id));
  }
  async getWebinarRecordings(userId: string): Promise<WebinarRecording[]> {
    return db.select().from(webinarRecordings).where(eq(webinarRecordings.userId, userId)).orderBy(desc(webinarRecordings.createdAt));
  }
  async getWebinarRecording(id: string): Promise<WebinarRecording | undefined> {
    const [row] = await db.select().from(webinarRecordings).where(eq(webinarRecordings.id, id));
    return row;
  }
  async createWebinarRecording(data: InsertWebinarRecording): Promise<WebinarRecording> {
    const [row] = await db.insert(webinarRecordings).values(data).returning();
    return row;
  }
  async updateWebinarRecording(id: string, data: Partial<InsertWebinarRecording>): Promise<WebinarRecording | undefined> {
    const [row] = await db.update(webinarRecordings).set(data).where(eq(webinarRecordings.id, id)).returning();
    return row;
  }
  async deleteWebinarRecording(id: string): Promise<void> {
    await db.delete(webinarRecordings).where(eq(webinarRecordings.id, id));
  }
  async getWebinarLandingPage(webinarId: string): Promise<WebinarLandingPage | undefined> {
    const [row] = await db.select().from(webinarLandingPages).where(eq(webinarLandingPages.webinarId, webinarId));
    return row;
  }
  async getWebinarLandingPageBySlug(slug: string): Promise<WebinarLandingPage | undefined> {
    const [row] = await db.select().from(webinarLandingPages).where(eq(webinarLandingPages.slug, slug));
    return row;
  }
  async createWebinarLandingPage(data: InsertWebinarLandingPage): Promise<WebinarLandingPage> {
    const [row] = await db.insert(webinarLandingPages).values(data).returning();
    return row;
  }
  async updateWebinarLandingPage(id: string, data: Partial<InsertWebinarLandingPage>): Promise<WebinarLandingPage | undefined> {
    const [row] = await db.update(webinarLandingPages).set({ ...data, updatedAt: new Date() }).where(eq(webinarLandingPages.id, id)).returning();
    return row;
  }
  async deleteWebinarLandingPage(id: string): Promise<void> {
    await db.delete(webinarLandingPages).where(eq(webinarLandingPages.id, id));
  }
  async getWebinarByMeetingCode(meetingCode: string): Promise<Webinar | undefined> {
    const [row] = await db.select().from(webinars).where(eq(webinars.meetingCode, meetingCode));
    return row;
  }
  async getWebinarLandingPageWithWebinar(slug: string): Promise<{ landingPage: WebinarLandingPage; webinar: Webinar } | undefined> {
    const [lp] = await db.select().from(webinarLandingPages).where(eq(webinarLandingPages.slug, slug));
    if (!lp) return undefined;
    const [webinar] = await db.select().from(webinars).where(eq(webinars.id, lp.webinarId));
    if (!webinar) return undefined;
    return { landingPage: lp, webinar };
  }
  async getWebinarLandingPagesByUser(userId: string): Promise<WebinarLandingPage[]> {
    return db.select().from(webinarLandingPages).where(eq(webinarLandingPages.userId, userId)).orderBy(desc(webinarLandingPages.createdAt));
  }
  async trackLandingPageView(id: string): Promise<void> {
    await db.update(webinarLandingPages).set({ views: sqlExpr`${webinarLandingPages.views} + 1` }).where(eq(webinarLandingPages.id, id));
  }
  async incrementLandingPageRegistration(id: string): Promise<void> {
    await db.update(webinarLandingPages).set({ registrations: sqlExpr`${webinarLandingPages.registrations} + 1` }).where(eq(webinarLandingPages.id, id));
  }
  // ── Video Marketing: Contacts / CRM ───────────────────────────────────────
  async getWebinarContacts(userId: string): Promise<WebinarContact[]> {
    return db.select().from(webinarContacts).where(eq(webinarContacts.userId, userId)).orderBy(desc(webinarContacts.createdAt));
  }
  async getWebinarContact(id: string): Promise<WebinarContact | undefined> {
    const [row] = await db.select().from(webinarContacts).where(eq(webinarContacts.id, id));
    return row;
  }
  async createWebinarContact(data: InsertWebinarContact): Promise<WebinarContact> {
    const [row] = await db.insert(webinarContacts).values(data).returning();
    return row;
  }
  async updateWebinarContact(id: string, data: Partial<InsertWebinarContact>): Promise<WebinarContact | undefined> {
    const [row] = await db.update(webinarContacts).set(data).where(eq(webinarContacts.id, id)).returning();
    return row;
  }
  async deleteWebinarContact(id: string): Promise<void> {
    await db.delete(webinarContacts).where(eq(webinarContacts.id, id));
  }
  // ── Video Marketing: Analytics ────────────────────────────────────────────
  async createVideoAnalyticsEvent(data: InsertVideoAnalyticsEvent): Promise<VideoAnalyticsEvent> {
    const [row] = await db.insert(videoAnalyticsEvents).values(data).returning();
    return row;
  }
  async getVideoAnalyticsEvents(videoId: string): Promise<VideoAnalyticsEvent[]> {
    return db.select().from(videoAnalyticsEvents).where(eq(videoAnalyticsEvents.videoId, videoId)).orderBy(desc(videoAnalyticsEvents.createdAt));
  }
  async getVideoAnalyticsSummary(videoId: string): Promise<{ totalViews: number; totalCompletions: number; avgWatchTime: number }> {
    const events = await db.select().from(videoAnalyticsEvents).where(eq(videoAnalyticsEvents.videoId, videoId));
    const uniqueSessions = new Set(events.filter(e => e.eventType === "play").map(e => e.sessionId));
    const completions = events.filter(e => e.eventType === "complete").length;
    const watchTimes = events.filter(e => e.eventType === "progress").map(e => e.position);
    const avgWatchTime = watchTimes.length > 0 ? watchTimes.reduce((a, b) => a + b, 0) / watchTimes.length : 0;
    return { totalViews: uniqueSessions.size, totalCompletions: completions, avgWatchTime };
  }
}

export const storage = new DatabaseStorage();
