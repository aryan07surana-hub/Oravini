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
  commentAutoReplies, storyReplyConfigs, dmFlows, dmContactTags, aiBotConfigs, optInLinks, metaTokens,
  instagramProfileReports, appSettings, videoResources, otpCodes,
  sessions, freeAiUsage, creditBalances, creditTransactions, landingLeads,
  emailSequences, sequenceEmails, emailEnrollments, emailLogs, emailBroadcasts, emailUnsubscribes,
  twitterTokens, scheduledTweets, linkedinTokens, scheduledLinkedinPosts, aiSessionHistory,
  youtubeTokens, scheduledYoutubePosts, scheduledInstagramPosts,
  referralCodes, referralClicks, referralConversions,
  forms, formQuestions, formSubmissions, formAnswers, formViews,
  meetings,
  videoEdits,
  brollClips,
  meetingTypes, availabilityRules, scheduledBookings, googleCalendarTokens, availabilityOverrides,
  readingMaterials, readingHighlights, readingStreaks, dailyReadings,
  webinars, webinarRegistrations, videoEvents, webinarRecordings, webinarLandingPages, webinarEvents,
  webinarDomains, videoMarketingSettings,
  type WebinarDomain, type InsertWebinarDomain, type VideoMarketingSettings,
  type GoogleCalendarToken,
  type TwitterToken, type ScheduledTweet, type InsertScheduledTweet,
  type LinkedinToken, type ScheduledLinkedinPost, type InsertScheduledLinkedinPost,
  type YoutubeToken, type ScheduledYoutubePost, type InsertScheduledYoutubePost,
  type ScheduledInstagramPost, type InsertScheduledInstagramPost,
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
  type AvailabilityOverride, type InsertAvailabilityOverride,
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
  type WebinarEvent, type InsertWebinarEvent,
  type VideoAnalyticsEvent, type InsertVideoAnalyticsEvent,
  type VideoAnalyticsDailyStat, videoAnalyticsDailyStats,
  type VideoHeatmapSegment, videoHeatmapSegments,
  type VideoViewerProfile, type InsertVideoViewerProfile, videoViewerProfiles,
  type UserFeedback, type InsertUserFeedback,
  webinarContacts, videoAnalyticsEvents, userFeedback,
  // Content Intelligence Engine
  hookLibrary, winningPatterns, brandVoiceProfiles, contentCalendars, contentTemplates,
  platformTrainingData, funnelStageTraining,
  type HookLibrary, type InsertHookLibrary,
  type WinningPattern, type InsertWinningPattern,
  type BrandVoiceProfile, type InsertBrandVoiceProfile,
  type ContentCalendar, type InsertContentCalendar,
  type ContentTemplate, type InsertContentTemplate,
  type PlatformTrainingData, type InsertPlatformTrainingData,
  type FunnelStageTraining, type InsertFunnelStageTraining,
  webinarPolls, webinarPollVotes, webinarSeries, webinarViewerSessions, webinarAnalytics,
  type WebinarPoll, type InsertWebinarPoll,
  type WebinarSeries, type InsertWebinarSeries,
  type WebinarViewerSession, type InsertWebinarViewerSession,
  type WebinarAnalytics, type InsertWebinarAnalytics,
  videoCollections, videoCollectionItems, videoChapters, videoCtas, videoViewerSessions,
  type VideoCollection, type InsertVideoCollection, type VideoCollectionItem,
  type VideoChapter, type InsertVideoChapter,
  type VideoCta, type InsertVideoCta,
  type VideoViewerSession, type InsertVideoViewerSession,
  videoInteractiveElements, videoAbTests, videoChannels, videoChannelEpisodes, videoChannelSubscribers, videoDubbingJobs, videoCollabComments,
  type VideoInteractiveElement, type InsertVideoInteractiveElement,
  type VideoAbTest, type InsertVideoAbTest,
  type VideoChannel, type InsertVideoChannel,
  type VideoChannelEpisode,
  type VideoChannelSubscriber,
  type VideoDubbingJob, type InsertVideoDubbingJob,
  type VideoCollabComment, type InsertVideoCollabComment,
  nicheIntelligence, nicheTrends,
  type NicheIntelligence, type InsertNicheIntelligence,
  type NicheTrend, type InsertNicheTrend,
  smsSequences, smsSequenceSteps, smsEnrollments, smsLogs, smsBroadcasts, smsCarrierGateways, smsUnsubscribes,
  smsTemplates, smsContactTags, smsContactTagAssignments, smsStepVariants,
  type SmsSequence, type InsertSmsSequence,
  type SmsSequenceStep, type InsertSmsSequenceStep,
  type SmsEnrollment,
  type SmsLog,
  type SmsBroadcast, type InsertSmsBroadcast,
  type SmsCarrierGateway,
  type SmsTemplate, type InsertSmsTemplate,
  type SmsContactTag,
  type SmsContactTagAssignment,
  type SmsStepVariant,
  // Webinar Advanced Features
  webinarPanelists, webinarBackstageMessages, webinarPracticeSessions,
  webinarBreakoutRooms, webinarBreakoutParticipants,
  webinarEmails, webinarEmailLogs,
  webinarSurveys, webinarSurveyResponses,
  webinarTemplates,
  webinarCaptions, webinarTranscripts,
  webinarAttendeeScores,
  webinarStreamDestinations,
  webinarResources,
  competitorWatchlist, competitorSnapshots, competitorAlerts,
  competitorDetectedPosts, competitorContentIdeas,
  type CompetitorWatchlistItem, type InsertCompetitorWatchlistItem,
  type CompetitorSnapshot, type CompetitorAlert,
  type CompetitorDetectedPost, type InsertCompetitorDetectedPost,
  type CompetitorContentIdea, type InsertCompetitorContentIdea,
  dialerAiCallQuota,
} from "@shared/schema";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection cannot be established
});
export const db = drizzle(pool);

export interface IStorage {
  // App Settings
  getAppSetting(key: string): Promise<string | undefined>;
  setAppSetting(key: string, value: string): Promise<void>;

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

  // User Feedback
  createUserFeedback(data: InsertUserFeedback): Promise<UserFeedback>;
  getAllUserFeedback(): Promise<(UserFeedback & { userName?: string; userEmail?: string })[]>;
  getUserFeedback(userId: string): Promise<UserFeedback[]>;

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
  getContentPosts(userId: string, filters?: { limit?: number }): Promise<ContentPost[]>;
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
  // Competitor Watchlist
  getCompetitorWatchlist(userId: string): Promise<CompetitorWatchlistItem[]>;
  getAllActiveWatchlistItems(): Promise<CompetitorWatchlistItem[]>;
  addCompetitorToWatchlist(data: InsertCompetitorWatchlistItem): Promise<CompetitorWatchlistItem>;
  updateWatchlistItem(id: string, data: Partial<CompetitorWatchlistItem>): Promise<CompetitorWatchlistItem>;
  removeFromWatchlist(id: string): Promise<void>;
  createCompetitorSnapshot(data: Omit<CompetitorSnapshot, 'id' | 'scannedAt'>): Promise<CompetitorSnapshot>;
  getCompetitorSnapshots(watchlistId: string, limit?: number): Promise<CompetitorSnapshot[]>;
  getLatestSnapshot(watchlistId: string): Promise<CompetitorSnapshot | null>;
  createCompetitorAlert(data: Omit<CompetitorAlert, 'id' | 'createdAt'>): Promise<CompetitorAlert>;
  getCompetitorAlerts(userId: string, unreadOnly?: boolean): Promise<CompetitorAlert[]>;
  markAlertsRead(userId: string): Promise<void>;
  // Competitor detected posts
  createDetectedPost(data: InsertCompetitorDetectedPost): Promise<CompetitorDetectedPost>;
  getActivityFeed(userId: string, limit?: number): Promise<CompetitorDetectedPost[]>;
  getDetectedPost(id: string): Promise<CompetitorDetectedPost | null>;
  updateDetectedPost(id: string, data: Partial<CompetitorDetectedPost>): Promise<void>;
  postAlreadyDetected(watchlistId: string, postUrl: string): Promise<boolean>;
  getDetectedPostByUrl(watchlistId: string, postUrl: string): Promise<CompetitorDetectedPost | null>;
  getRecentDetectedPostsForUser(userId: string, sinceDate: Date): Promise<CompetitorDetectedPost[]>;
  getUnseenFeedCount(userId: string): Promise<number>;
  markFeedSeen(userId: string): Promise<void>;
  // Competitor content ideas
  createContentIdea(data: InsertCompetitorContentIdea): Promise<CompetitorContentIdea>;
  getContentIdeas(userId: string): Promise<CompetitorContentIdea[]>;
  updateContentIdeaStatus(id: string, status: string): Promise<void>;
  deleteContentIdea(id: string): Promise<void>;
  getLeaderboard(userId: string): Promise<any[]>;
  getFormatBreakdown(userId: string): Promise<any[]>;
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
  getDmSequence(id: string): Promise<DmSequence | null>;
  createDmSequence(data: InsertDmSequence): Promise<DmSequence>;
  updateDmSequence(id: string, data: Partial<InsertDmSequence>): Promise<DmSequence>;
  deleteDmSequence(id: string): Promise<void>;
  getDmSequenceSteps(sequenceId: string): Promise<DmSequenceStep[]>;
  upsertDmSequenceSteps(sequenceId: string, steps: Omit<InsertDmSequenceStep, "sequenceId">[]): Promise<DmSequenceStep[]>;
  createDmSequenceStep(data: InsertDmSequenceStep): Promise<DmSequenceStep>;
  updateDmSequenceStep(id: string, data: Partial<InsertDmSequenceStep>): Promise<DmSequenceStep>;
  deleteDmSequenceStep(id: string): Promise<void>;
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

  // Instagram scheduled posts (caption reminders — no direct publish)
  getScheduledInstagramPosts(userId: string): Promise<ScheduledInstagramPost[]>;
  getPendingDueInstagramPosts(): Promise<ScheduledInstagramPost[]>;
  createScheduledInstagramPost(data: InsertScheduledInstagramPost): Promise<ScheduledInstagramPost>;
  updateScheduledInstagramPost(id: string, data: Partial<ScheduledInstagramPost>): Promise<void>;
  deleteScheduledInstagramPost(id: string, userId: string): Promise<void>;

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
  getMeetingTypeByUserId(userId: string): Promise<MeetingType | undefined>;
  createMeetingType(data: InsertMeetingType): Promise<MeetingType>;
  updateMeetingType(id: string, data: Partial<InsertMeetingType>): Promise<MeetingType | undefined>;
  deleteMeetingType(id: string): Promise<void>;
  getAvailabilityRules(meetingTypeId: string): Promise<AvailabilityRule[]>;
  upsertAvailabilityRules(meetingTypeId: string, rules: Omit<InsertAvailabilityRule, "meetingTypeId">[]): Promise<AvailabilityRule[]>;
  getScheduledBookings(): Promise<(ScheduledBooking & { meetingType: MeetingType | null })[]>;
  getScheduledBookingsByMeetingType(meetingTypeId: string): Promise<ScheduledBooking[]>;
  getScheduledBookingsByDateRange(start: Date, end: Date): Promise<(ScheduledBooking & { meetingType: MeetingType | null })[]>;
  getScheduledBooking(id: string): Promise<ScheduledBooking | undefined>;
  createScheduledBooking(data: InsertScheduledBooking): Promise<ScheduledBooking>;
  updateScheduledBooking(id: string, data: Partial<ScheduledBooking>): Promise<ScheduledBooking | undefined>;
  deleteScheduledBooking(id: string): Promise<void>;
  getUpcomingBookingsForReminders(): Promise<(ScheduledBooking & { meetingType: MeetingType | null })[]>;
  getCompletedBookingsForFollowUp(): Promise<(ScheduledBooking & { meetingType: MeetingType | null })[]>;
  getAvailabilityOverrides(meetingTypeId: string): Promise<AvailabilityOverride[]>;
  getAvailabilityOverridesByDate(meetingTypeId: string, date: string): Promise<AvailabilityOverride | undefined>;
  createAvailabilityOverride(data: InsertAvailabilityOverride): Promise<AvailabilityOverride>;
  deleteAvailabilityOverride(id: string): Promise<void>;

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
  incrementVideoViews(id: string): Promise<void>;
  getWebinarRecordings(userId: string): Promise<WebinarRecording[]>;
  getWebinarRecording(id: string): Promise<WebinarRecording | undefined>;
  getWebinarRecordingsByWebinarId(webinarId: string): Promise<WebinarRecording[]>;
  createWebinarRecording(data: InsertWebinarRecording): Promise<WebinarRecording>;
  updateWebinarRecording(id: string, data: Partial<InsertWebinarRecording>): Promise<WebinarRecording | undefined>;
  deleteWebinarRecording(id: string): Promise<void>;
  createWebinarEvent(data: InsertWebinarEvent): Promise<WebinarEvent>;
  getWebinarEvents(webinarId: string): Promise<WebinarEvent[]>;
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
  // Advanced Analytics
  getVideoHeatmap(videoId: string): Promise<VideoHeatmapSegment[]>;
  upsertHeatmapSegment(videoId: string, second: number, field: "viewCount" | "replayCount" | "dropOffCount"): Promise<void>;
  getVideoViewerProfiles(videoId: string): Promise<VideoViewerProfile[]>;
  upsertVideoViewerProfile(data: Partial<InsertVideoViewerProfile> & { videoId: string; sessionId: string }): Promise<VideoViewerProfile>;
  getVideoDailyStats(videoId: string, days?: number): Promise<VideoAnalyticsDailyStat[]>;
  incrementDailyStat(videoId: string, date: string, field: string): Promise<void>;
  getVideoAnalyticsOverview(userId: string): Promise<any>;
  // Video Collections
  getVideoCollections(userId: string): Promise<VideoCollection[]>;
  createVideoCollection(data: InsertVideoCollection): Promise<VideoCollection>;
  updateVideoCollection(id: number, data: Partial<InsertVideoCollection>): Promise<VideoCollection | undefined>;
  deleteVideoCollection(id: number): Promise<void>;
  getVideoCollectionItems(collectionId: number): Promise<VideoCollectionItem[]>;
  addVideoToCollection(collectionId: number, videoEventId: string, sortOrder?: number): Promise<VideoCollectionItem>;
  removeVideoFromCollection(id: number): Promise<void>;
  // Video Chapters
  getVideoChapters(videoEventId: string): Promise<VideoChapter[]>;
  createVideoChapter(data: InsertVideoChapter): Promise<VideoChapter>;
  updateVideoChapter(id: number, data: Partial<InsertVideoChapter>): Promise<VideoChapter | undefined>;
  deleteVideoChapter(id: number): Promise<void>;
  // Video CTAs
  getVideoCtas(videoEventId: string): Promise<VideoCta[]>;
  createVideoCta(data: InsertVideoCta): Promise<VideoCta>;
  updateVideoCta(id: number, data: Partial<InsertVideoCta>): Promise<VideoCta | undefined>;
  deleteVideoCta(id: number): Promise<void>;
  incrementCtaClicks(id: number): Promise<void>;
  // Video Viewer Sessions
  createViewerSession(data: InsertVideoViewerSession): Promise<VideoViewerSession>;
  getVideoViewerSessions(videoEventId: string): Promise<VideoViewerSession[]>;
  updateViewerSession(id: number, data: Partial<InsertVideoViewerSession>): Promise<void>;
  // Video Interactive Elements
  getVideoInteractiveElements(videoEventId: string): Promise<VideoInteractiveElement[]>;
  createVideoInteractiveElement(data: InsertVideoInteractiveElement): Promise<VideoInteractiveElement>;
  updateVideoInteractiveElement(id: string, data: Partial<InsertVideoInteractiveElement>): Promise<VideoInteractiveElement | undefined>;
  deleteVideoInteractiveElement(id: string): Promise<void>;
  // Video A/B Tests
  getVideoAbTests(userId: string): Promise<VideoAbTest[]>;
  createVideoAbTest(data: InsertVideoAbTest): Promise<VideoAbTest>;
  updateVideoAbTest(id: string, data: Partial<InsertVideoAbTest>): Promise<VideoAbTest | undefined>;
  deleteVideoAbTest(id: string): Promise<void>;
  // Video Channels
  getVideoChannels(userId: string): Promise<VideoChannel[]>;
  getVideoChannel(id: string): Promise<VideoChannel | undefined>;
  getVideoChannelBySlug(slug: string): Promise<VideoChannel | undefined>;
  createVideoChannel(data: InsertVideoChannel): Promise<VideoChannel>;
  updateVideoChannel(id: string, data: Partial<InsertVideoChannel>): Promise<VideoChannel | undefined>;
  deleteVideoChannel(id: string): Promise<void>;
  getChannelEpisodes(channelId: string): Promise<VideoChannelEpisode[]>;
  addChannelEpisode(channelId: string, videoEventId: string, section?: string, sortOrder?: number): Promise<VideoChannelEpisode>;
  removeChannelEpisode(id: number): Promise<void>;
  subscribeToChannel(channelId: string, email: string, name?: string): Promise<VideoChannelSubscriber>;
  // Video Dubbing Jobs
  getVideoDubbingJobs(userId: string, videoEventId?: string): Promise<VideoDubbingJob[]>;
  createVideoDubbingJob(data: InsertVideoDubbingJob): Promise<VideoDubbingJob>;
  updateVideoDubbingJob(id: string, data: Partial<InsertVideoDubbingJob>): Promise<VideoDubbingJob | undefined>;
  // Video Collaboration Comments
  getVideoCollabComments(videoEventId: string): Promise<VideoCollabComment[]>;
  createVideoCollabComment(data: InsertVideoCollabComment): Promise<VideoCollabComment>;
  updateVideoCollabComment(id: string, data: Partial<InsertVideoCollabComment>): Promise<VideoCollabComment | undefined>;
  deleteVideoCollabComment(id: string): Promise<void>;
  // Custom Domains
  getWebinarDomains(userId: string): Promise<WebinarDomain[]>;
  getWebinarDomainByDomain(domain: string): Promise<WebinarDomain | undefined>;
  createWebinarDomain(data: InsertWebinarDomain): Promise<WebinarDomain>;
  updateWebinarDomain(id: string, data: Partial<WebinarDomain>): Promise<WebinarDomain | undefined>;
  deleteWebinarDomain(id: string): Promise<void>;
  // Video Marketing Settings (Livekit)
  getVideoMarketingSettings(userId: string): Promise<VideoMarketingSettings | undefined>;
  upsertVideoMarketingSettings(userId: string, data: Partial<VideoMarketingSettings>): Promise<VideoMarketingSettings>;
  // Webinar Polls
  getWebinarPolls(webinarId: string): Promise<WebinarPoll[]>;
  createWebinarPoll(data: InsertWebinarPoll): Promise<WebinarPoll>;
  updateWebinarPoll(id: string, data: Partial<WebinarPoll>): Promise<WebinarPoll | undefined>;
  deleteWebinarPoll(id: string): Promise<void>;
  // Webinar Series
  getWebinarSeries(userId: string): Promise<WebinarSeries[]>;
  getWebinarSeriesById(id: string): Promise<WebinarSeries | undefined>;
  createWebinarSeries(data: InsertWebinarSeries): Promise<WebinarSeries>;
  updateWebinarSeries(id: string, data: Partial<InsertWebinarSeries>): Promise<WebinarSeries | undefined>;
  deleteWebinarSeries(id: string): Promise<void>;
  // Webinar Viewer Sessions
  createWebinarViewerSession(data: InsertWebinarViewerSession): Promise<WebinarViewerSession>;
  getWebinarViewerSessions(webinarId: string): Promise<WebinarViewerSession[]>;
  updateWebinarViewerSession(id: string, data: Partial<WebinarViewerSession>): Promise<WebinarViewerSession | undefined>;
  getActiveViewerCount(webinarId: string): Promise<number>;
  // Webinar Analytics
  getWebinarAnalytics(webinarId: string): Promise<WebinarAnalytics | undefined>;
  upsertWebinarAnalytics(webinarId: string, data: Partial<InsertWebinarAnalytics>): Promise<WebinarAnalytics>;
  // Webinar Poll Votes
  createWebinarPollVote(data: { pollId: string; webinarId: string; viewerId: string; viewerName: string; optionIndex: number }): Promise<any>;
  getWebinarPollVotes(pollId: string): Promise<any[]>;
  // Webinar Series - generate instances
  generateSeriesInstances(seriesId: string, count?: number): Promise<any[]>;

  // ── NICHE INTELLIGENCE ──────────────────────────────────────────
  getNicheIntelligence(filters?: { niche?: string; platform?: string }): Promise<NicheIntelligence[]>;
  getSingleNicheIntelligence(niche: string, platform?: string): Promise<NicheIntelligence | undefined>;
  getNicheTrends(niche: string, platform?: string): Promise<NicheTrend[]>;
  upsertNicheIntelligence(data: InsertNicheIntelligence): Promise<NicheIntelligence>;
  upsertNicheTrend(data: InsertNicheTrend): Promise<NicheTrend>;
  computeNicheIntelligence(): Promise<void>;
  getNicheHealthScore(niche: string, platform?: string): Promise<{ healthScore: number; healthLabel: string; factors: Record<string, number> }>;
  getNicheUserRank(userId: string, niche: string, platform?: string): Promise<{ percentile: number; userAvgEngagement: number; nicheAvgEngagement: number; userAvgViralScore: number; nicheAvgViralScore: number; totalUsers: number; rank: number }>;
  getNicheStrategy(niche: string, platform?: string): Promise<any[]>;
  getNicheHooksLibrary(niche: string, platform?: string, limit?: number): Promise<any[]>;
  getNicheContentGaps(userId: string, niche: string, platform?: string): Promise<any[]>;

  // ── SMS MARKETING ───────────────────────────────────────────────
  getSmsSequences(): Promise<SmsSequence[]>;
  getSmsSequence(id: string): Promise<SmsSequence | undefined>;
  createSmsSequence(data: InsertSmsSequence): Promise<SmsSequence>;
  updateSmsSequence(id: string, data: Partial<InsertSmsSequence>): Promise<SmsSequence | undefined>;
  deleteSmsSequence(id: string): Promise<void>;
  getSmsSequenceSteps(sequenceId: string): Promise<SmsSequenceStep[]>;
  createSmsSequenceStep(data: InsertSmsSequenceStep): Promise<SmsSequenceStep>;
  updateSmsSequenceStep(id: string, data: Partial<InsertSmsSequenceStep>): Promise<SmsSequenceStep | undefined>;
  deleteSmsSequenceStep(id: string): Promise<void>;
  reorderSmsSequenceSteps(sequenceId: string, stepIds: string[]): Promise<void>;
  enrollPhoneInSmsSequence(phone: string, sequenceId: string): Promise<SmsEnrollment | null>;
  getPendingSmsEnrollments(): Promise<(SmsEnrollment & { phone: string })[]>;
  advanceSmsEnrollment(id: string, nextStep: number, nextSendAt: Date | null, completed?: boolean): Promise<void>;
  logSms(data: { toPhone: string; message: string; sequenceStepId?: string; broadcastId?: string }): Promise<SmsLog>;
  getSmsStats(): Promise<{ totalSent: number; sentToday: number; activeEnrollments: number; deliveredRate: number; optOutRate: number }>;
  getSmsLogs(limit?: number): Promise<SmsLog[]>;
  getDailySmsVolume(days?: number): Promise<{ date: string; count: number }[]>;
  createSmsBroadcast(data: InsertSmsBroadcast): Promise<SmsBroadcast>;
  getSmsBroadcasts(): Promise<SmsBroadcast[]>;
  updateSmsBroadcast(id: string, data: Partial<SmsBroadcast>): Promise<void>;
  getScheduledBroadcasts(): Promise<SmsBroadcast[]>;
  getSmsCarrierGateway(phone: string): Promise<SmsCarrierGateway | undefined>;
  setSmsCarrierGateway(phone: string, carrierName: string, gatewayDomain: string): Promise<SmsCarrierGateway>;
  isSmsUnsubscribed(phone: string): Promise<boolean>;
  addSmsUnsubscribe(phone: string): Promise<void>;

  // Templates
  getSmsTemplates(category?: string): Promise<SmsTemplate[]>;
  createSmsTemplate(data: InsertSmsTemplate): Promise<SmsTemplate>;
  deleteSmsTemplate(id: string): Promise<void>;

  // Contact Tags
  getSmsContactTags(): Promise<SmsContactTag[]>;
  createSmsContactTag(name: string, color: string): Promise<SmsContactTag>;
  deleteSmsContactTag(id: string): Promise<void>;
  getContactTagsForPhone(phone: string): Promise<SmsContactTag[]>;
  assignTagToPhone(phone: string, tagId: string): Promise<SmsContactTagAssignment>;
  unassignTagFromPhone(phone: string, tagId: string): Promise<void>;

  // A/B Variants
  getStepVariants(stepId: string): Promise<SmsStepVariant[]>;
  createStepVariant(data: { stepId: string; message: string; isControl?: boolean }): Promise<SmsStepVariant>;
  deleteStepVariant(id: string): Promise<void>;
  incrementVariantClick(id: string): Promise<void>;

  getUsersWithPhone(): Promise<{ id: string; name: string | null; phone: string | null; carrierName: string | null; gatewayDomain: string | null }[]>;

  // ── Webinar Panelists ─────────────────────────────────────────────────────
  getWebinarPanelists(webinarId: string): Promise<any[]>;
  createWebinarPanelist(data: any): Promise<any>;
  updateWebinarPanelist(id: string, data: any): Promise<any>;
  deleteWebinarPanelist(id: string): Promise<void>;
  acceptWebinarPanelistInvite(token: string): Promise<any>;
  getWebinarPanelistByToken(token: string): Promise<any>;

  // ── Webinar Backstage ─────────────────────────────────────────────────────
  getWebinarBackstageMessages(webinarId: string): Promise<any[]>;
  createBackstageMessage(data: any): Promise<any>;
  startPracticeSession(data: any): Promise<any>;
  endPracticeSession(webinarId: string, notes?: string): Promise<any>;
  getActivePracticeSession(webinarId: string): Promise<any>;
  getPracticeSessionHistory(webinarId: string): Promise<any[]>;

  // ── Webinar Breakout Rooms ────────────────────────────────────────────────
  getWebinarBreakoutRooms(webinarId: string): Promise<any[]>;
  createWebinarBreakoutRoom(data: any): Promise<any>;
  updateWebinarBreakoutRoom(id: string, data: any): Promise<any>;
  deleteWebinarBreakoutRoom(id: string): Promise<void>;
  openAllBreakoutRooms(webinarId: string): Promise<void>;
  closeAllBreakoutRooms(webinarId: string): Promise<void>;
  assignBreakoutParticipant(data: any): Promise<any>;
  removeBreakoutParticipant(roomId: string, viewerId: string): Promise<void>;
  getBreakoutParticipants(roomId: string): Promise<any[]>;

  // ── Webinar Email Automation ──────────────────────────────────────────────
  getWebinarEmails(webinarId: string): Promise<any[]>;
  getWebinarEmailById(id: string): Promise<any>;
  upsertWebinarEmail(data: any): Promise<any>;
  updateWebinarEmail(id: string, data: any): Promise<any>;
  deleteWebinarEmail(id: string): Promise<void>;
  logWebinarEmail(emailId: string, recipientEmail: string, recipientName?: string): Promise<void>;
  getWebinarEmailLogs(emailId: string): Promise<any[]>;
  getWebinarByCode(code: string): Promise<any>;

  // ── Webinar Surveys ───────────────────────────────────────────────────────
  getWebinarSurvey(webinarId: string): Promise<any>;
  upsertWebinarSurvey(data: any): Promise<any>;
  submitWebinarSurveyResponse(data: any): Promise<any>;
  getWebinarSurveyResponses(surveyId: string): Promise<any[]>;

  // ── Webinar Templates ─────────────────────────────────────────────────────
  getWebinarTemplates(userId: string): Promise<any[]>;
  createWebinarTemplate(data: any): Promise<any>;
  deleteWebinarTemplate(id: string): Promise<void>;

  // ── Webinar Captions ──────────────────────────────────────────────────────
  getWebinarCaptions(webinarId: string, after?: number, limit?: number): Promise<any[]>;
  addWebinarCaption(data: any): Promise<any>;
  getWebinarTranscript(webinarId: string): Promise<any>;
  saveWebinarTranscript(data: any): Promise<any>;

  // ── Webinar Stream Destinations ───────────────────────────────────────────
  getWebinarStreamDestinations(webinarId: string): Promise<any[]>;
  createWebinarStreamDestination(data: any): Promise<any>;
  updateWebinarStreamDestination(id: string, data: any): Promise<any>;
  deleteWebinarStreamDestination(id: string): Promise<void>;

  // ── Webinar Resources ─────────────────────────────────────────────────────
  getWebinarResources(webinarId: string): Promise<any[]>;
  createWebinarResource(data: any): Promise<any>;
  pushWebinarResource(id: string): Promise<any>;
  deleteWebinarResource(id: string): Promise<void>;

  // ── Webinar Engagement Scores ─────────────────────────────────────────────
  getWebinarAttendeeScores(webinarId: string): Promise<any[]>;
  updateAttendeeEngagement(webinarId: string, data: any): Promise<any>;
  computeWebinarEngagementScores(webinarId: string): Promise<any[]>;
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

  async getContentPosts(userId: string, filters?: { limit?: number }): Promise<ContentPost[]> {
    let query = db.select().from(contentPosts).where(eq(contentPosts.clientId, userId)).orderBy(desc(contentPosts.postDate));
    if (filters?.limit) query = query.limit(filters.limit) as any;
    return query;
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

  // ── Competitor Watchlist ──────────────────────────────────────────────────

  async getCompetitorWatchlist(userId: string) {
    return db.select().from(competitorWatchlist)
      .where(eq(competitorWatchlist.userId, userId))
      .orderBy(desc(competitorWatchlist.createdAt));
  }

  async getAllActiveWatchlistItems() {
    return db.select().from(competitorWatchlist)
      .where(eq(competitorWatchlist.isActive, true));
  }

  async getUserWatchlistItems(userId: string) {
    return db.select().from(competitorWatchlist)
      .where(and(eq(competitorWatchlist.userId, userId), eq(competitorWatchlist.isActive, true)));
  }

  async addCompetitorToWatchlist(data: InsertCompetitorWatchlistItem) {
    const [item] = await db.insert(competitorWatchlist).values(data).returning();
    return item;
  }

  async updateWatchlistItem(id: string, data: Partial<CompetitorWatchlistItem>) {
    const [item] = await db.update(competitorWatchlist).set(data).where(eq(competitorWatchlist.id, id)).returning();
    return item;
  }

  async removeFromWatchlist(id: string) {
    await db.delete(competitorWatchlist).where(eq(competitorWatchlist.id, id));
  }

  async createCompetitorSnapshot(data: Omit<CompetitorSnapshot, 'id' | 'scannedAt'>) {
    const [snap] = await db.insert(competitorSnapshots).values(data as any).returning();
    return snap;
  }

  async getCompetitorSnapshots(watchlistId: string, limit = 30) {
    return db.select().from(competitorSnapshots)
      .where(eq(competitorSnapshots.watchlistId, watchlistId))
      .orderBy(desc(competitorSnapshots.scannedAt))
      .limit(limit);
  }

  async getLatestSnapshot(watchlistId: string) {
    const rows = await db.select().from(competitorSnapshots)
      .where(eq(competitorSnapshots.watchlistId, watchlistId))
      .orderBy(desc(competitorSnapshots.scannedAt))
      .limit(1);
    return rows[0] ?? null;
  }

  async createCompetitorAlert(data: Omit<CompetitorAlert, 'id' | 'createdAt'>) {
    const [alert] = await db.insert(competitorAlerts).values(data as any).returning();
    return alert;
  }

  async getCompetitorAlerts(userId: string, unreadOnly = false) {
    const conditions = unreadOnly
      ? [eq(competitorAlerts.userId, userId), eq(competitorAlerts.isRead, false)]
      : [eq(competitorAlerts.userId, userId)];
    return db.select().from(competitorAlerts)
      .where(and(...conditions as any))
      .orderBy(desc(competitorAlerts.createdAt))
      .limit(100);
  }

  async markAlertsRead(userId: string) {
    await db.update(competitorAlerts)
      .set({ isRead: true })
      .where(eq(competitorAlerts.userId, userId));
  }

  async createDetectedPost(data: InsertCompetitorDetectedPost) {
    const [post] = await db.insert(competitorDetectedPosts).values(data as any).returning();
    return post;
  }

  async getActivityFeed(userId: string, limit = 50) {
    return db.select().from(competitorDetectedPosts)
      .where(eq(competitorDetectedPosts.userId, userId))
      .orderBy(desc(competitorDetectedPosts.detectedAt))
      .limit(limit);
  }

  async getDetectedPost(id: string) {
    const [post] = await db.select().from(competitorDetectedPosts)
      .where(eq(competitorDetectedPosts.id, id));
    return post ?? null;
  }

  async updateDetectedPost(id: string, data: Partial<CompetitorDetectedPost>) {
    await db.update(competitorDetectedPosts).set(data as any).where(eq(competitorDetectedPosts.id, id));
  }

  async postAlreadyDetected(watchlistId: string, postUrl: string) {
    const [existing] = await db.select({ id: competitorDetectedPosts.id })
      .from(competitorDetectedPosts)
      .where(and(eq(competitorDetectedPosts.watchlistId, watchlistId), eq(competitorDetectedPosts.postUrl, postUrl)));
    return !!existing;
  }

  async getDetectedPostByUrl(watchlistId: string, postUrl: string) {
    const [post] = await db.select().from(competitorDetectedPosts)
      .where(and(eq(competitorDetectedPosts.watchlistId, watchlistId), eq(competitorDetectedPosts.postUrl, postUrl)));
    return post ?? null;
  }

  async getRecentDetectedPostsForUser(userId: string, sinceDate: Date) {
    return db.select().from(competitorDetectedPosts)
      .where(and(
        eq(competitorDetectedPosts.userId, userId),
        sqlExpr`${competitorDetectedPosts.detectedAt} >= ${sinceDate}`
      ))
      .orderBy(desc(competitorDetectedPosts.detectedAt));
  }

  async getUnseenFeedCount(userId: string) {
    const rows = await db.select({ id: competitorDetectedPosts.id })
      .from(competitorDetectedPosts)
      .where(and(eq(competitorDetectedPosts.userId, userId), eq(competitorDetectedPosts.isSeen, false)));
    return rows.length;
  }

  async markFeedSeen(userId: string) {
    await db.update(competitorDetectedPosts)
      .set({ isSeen: true })
      .where(and(eq(competitorDetectedPosts.userId, userId), eq(competitorDetectedPosts.isSeen, false)));
  }

  async createContentIdea(data: InsertCompetitorContentIdea) {
    const [idea] = await db.insert(competitorContentIdeas).values(data as any).returning();
    return idea;
  }

  async getContentIdeas(userId: string) {
    return db.select().from(competitorContentIdeas)
      .where(eq(competitorContentIdeas.userId, userId))
      .orderBy(desc(competitorContentIdeas.createdAt));
  }

  async updateContentIdeaStatus(id: string, status: string) {
    await db.update(competitorContentIdeas).set({ status }).where(eq(competitorContentIdeas.id, id));
  }

  async deleteContentIdea(id: string) {
    await db.delete(competitorContentIdeas).where(eq(competitorContentIdeas.id, id));
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

  async getLeaderboard(userId: string) {
    const { rows } = await pool.query(`
      SELECT
        w.id, w.handle, w.display_name, w.avatar_url, w.niche,
        s.follower_count, s.following_count, s.post_count,
        s.avg_views, s.avg_likes, s.avg_comments, s.avg_engagement,
        s.scanned_at,
        prev.follower_count AS prev_follower_count
      FROM competitor_watchlist w
      LEFT JOIN LATERAL (
        SELECT * FROM competitor_snapshots
        WHERE watchlist_id = w.id
        ORDER BY scanned_at DESC LIMIT 1
      ) s ON true
      LEFT JOIN LATERAL (
        SELECT follower_count FROM competitor_snapshots
        WHERE watchlist_id = w.id
        ORDER BY scanned_at DESC LIMIT 1 OFFSET 1
      ) prev ON true
      WHERE w.user_id = $1 AND w.is_active = true
      ORDER BY s.follower_count DESC NULLS LAST
    `, [userId]);
    return rows;
  }

  async getFormatBreakdown(userId: string) {
    const { rows } = await pool.query(`
      SELECT
        handle,
        post_type,
        COUNT(*)::int AS count,
        ROUND(AVG(views))::int AS avg_views,
        ROUND(AVG(likes))::int AS avg_likes,
        ROUND(AVG(comments))::int AS avg_comments
      FROM competitor_detected_posts
      WHERE user_id = $1
        AND detected_at > NOW() - INTERVAL '30 days'
      GROUP BY handle, post_type
      ORDER BY handle, avg_views DESC
    `, [userId]);
    return rows;
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

  async getScheduledInstagramPosts(userId: string): Promise<ScheduledInstagramPost[]> {
    return db.select().from(scheduledInstagramPosts).where(eq(scheduledInstagramPosts.userId, userId)).orderBy(desc(scheduledInstagramPosts.scheduledFor));
  }

  async getPendingDueInstagramPosts(): Promise<ScheduledInstagramPost[]> {
    return db.select().from(scheduledInstagramPosts)
      .where(and(eq(scheduledInstagramPosts.status, "pending"), lte(scheduledInstagramPosts.scheduledFor, new Date())));
  }

  async createScheduledInstagramPost(data: InsertScheduledInstagramPost): Promise<ScheduledInstagramPost> {
    const [row] = await db.insert(scheduledInstagramPosts).values(data).returning();
    return row;
  }

  async updateScheduledInstagramPost(id: string, data: Partial<ScheduledInstagramPost>): Promise<void> {
    await db.update(scheduledInstagramPosts).set(data).where(eq(scheduledInstagramPosts.id, id));
  }

  async deleteScheduledInstagramPost(id: string, userId: string): Promise<void> {
    await db.delete(scheduledInstagramPosts).where(and(eq(scheduledInstagramPosts.id, id), eq(scheduledInstagramPosts.userId, userId)));
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

  async getMeetingTypeByUserId(userId: string): Promise<MeetingType | undefined> {
    const [row] = await db.select().from(meetingTypes).where(eq(meetingTypes.userId, userId)).orderBy(desc(meetingTypes.createdAt)).limit(1);
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

  async getCompletedBookingsForFollowUp(): Promise<(ScheduledBooking & { meetingType: MeetingType | null })[]> {
    const bookings = await db.select().from(scheduledBookings).where(
      and(
        eq(scheduledBookings.status, "completed"),
        eq(scheduledBookings.followUpSent, false)
      )
    );
    const types = await db.select().from(meetingTypes);
    return bookings.map(b => ({ ...b, meetingType: types.find(t => t.id === b.meetingTypeId) || null }));
  }

  async getScheduledBookingsByDateRange(start: Date, end: Date): Promise<(ScheduledBooking & { meetingType: MeetingType | null })[]> {
    const bookings = await db.select().from(scheduledBookings).where(
      and(
        gte(scheduledBookings.startTime, start),
        lte(scheduledBookings.startTime, end)
      )
    ).orderBy(scheduledBookings.startTime);
    const types = await db.select().from(meetingTypes);
    return bookings.map(b => ({ ...b, meetingType: types.find(t => t.id === b.meetingTypeId) || null }));
  }

  async deleteScheduledBooking(id: string): Promise<void> {
    await db.delete(scheduledBookings).where(eq(scheduledBookings.id, id));
  }

  async getAvailabilityOverrides(meetingTypeId: string): Promise<AvailabilityOverride[]> {
    return db.select().from(availabilityOverrides).where(eq(availabilityOverrides.meetingTypeId, meetingTypeId)).orderBy(availabilityOverrides.date);
  }

  async getAvailabilityOverridesByDate(meetingTypeId: string, date: string): Promise<AvailabilityOverride | undefined> {
    const [row] = await db.select().from(availabilityOverrides).where(
      and(eq(availabilityOverrides.meetingTypeId, meetingTypeId), eq(availabilityOverrides.date, date))
    );
    return row;
  }

  async createAvailabilityOverride(data: InsertAvailabilityOverride): Promise<AvailabilityOverride> {
    // Upsert: delete existing override for same date, then insert
    await db.delete(availabilityOverrides).where(
      and(eq(availabilityOverrides.meetingTypeId, data.meetingTypeId), eq(availabilityOverrides.date, data.date))
    );
    const [row] = await db.insert(availabilityOverrides).values(data).returning();
    return row;
  }

  async deleteAvailabilityOverride(id: string): Promise<void> {
    await db.delete(availabilityOverrides).where(eq(availabilityOverrides.id, id));
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
  async getDmSequence(id: string): Promise<DmSequence | null> {
    const [row] = await db.select().from(dmSequences).where(eq(dmSequences.id, id));
    return row ?? null;
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
  async createDmSequenceStep(data: InsertDmSequenceStep): Promise<DmSequenceStep> {
    const [row] = await db.insert(dmSequenceSteps).values(data).returning();
    return row;
  }
  async updateDmSequenceStep(id: string, data: Partial<InsertDmSequenceStep>): Promise<DmSequenceStep> {
    const [row] = await db.update(dmSequenceSteps).set(data).where(eq(dmSequenceSteps.id, id)).returning();
    return row;
  }
  async deleteDmSequenceStep(id: string): Promise<void> {
    await db.delete(dmSequenceSteps).where(eq(dmSequenceSteps.id, id));
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
  async incrementVideoViews(id: string): Promise<void> {
    await db.update(videoEvents).set({ views: sqlExpr`${videoEvents.views} + 1` }).where(eq(videoEvents.id, id));
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
  async getWebinarRecordingsByWebinarId(webinarId: string): Promise<WebinarRecording[]> {
    return db.select().from(webinarRecordings).where(eq(webinarRecordings.webinarId, webinarId)).orderBy(desc(webinarRecordings.createdAt));
  }
  async createWebinarEvent(data: InsertWebinarEvent): Promise<WebinarEvent> {
    const [row] = await db.insert(webinarEvents).values(data).returning();
    return row;
  }
  async getWebinarEvents(webinarId: string): Promise<WebinarEvent[]> {
    return db.select().from(webinarEvents).where(eq(webinarEvents.webinarId, webinarId)).orderBy(webinarEvents.ts);
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

  // ── Advanced Video Analytics ──────────────────────────────────────────────
  async getVideoHeatmap(videoId: string): Promise<VideoHeatmapSegment[]> {
    return db.select().from(videoHeatmapSegments).where(eq(videoHeatmapSegments.videoId, videoId)).orderBy(videoHeatmapSegments.segmentSecond);
  }

  async upsertHeatmapSegment(videoId: string, second: number, field: "viewCount" | "replayCount" | "dropOffCount"): Promise<void> {
    const existing = await db.select().from(videoHeatmapSegments).where(and(eq(videoHeatmapSegments.videoId, videoId), eq(videoHeatmapSegments.segmentSecond, second)));
    if (existing.length > 0) {
      const update: any = { updatedAt: new Date() };
      update[field === "viewCount" ? "viewCount" : field === "replayCount" ? "replayCount" : "dropOffCount"] = sqlExpr`${field === "viewCount" ? videoHeatmapSegments.viewCount : field === "replayCount" ? videoHeatmapSegments.replayCount : videoHeatmapSegments.dropOffCount} + 1`;
      await db.update(videoHeatmapSegments).set(update).where(and(eq(videoHeatmapSegments.videoId, videoId), eq(videoHeatmapSegments.segmentSecond, second)));
    } else {
      const insert: any = { videoId, segmentSecond: second, viewCount: 0, replayCount: 0, dropOffCount: 0 };
      insert[field] = 1;
      await db.insert(videoHeatmapSegments).values(insert);
    }
  }

  async getVideoViewerProfiles(videoId: string): Promise<VideoViewerProfile[]> {
    return db.select().from(videoViewerProfiles).where(eq(videoViewerProfiles.videoId, videoId)).orderBy(desc(videoViewerProfiles.lastSeenAt));
  }

  async upsertVideoViewerProfile(data: Partial<InsertVideoViewerProfile> & { videoId: string; sessionId: string }): Promise<VideoViewerProfile> {
    const existing = await db.select().from(videoViewerProfiles).where(and(eq(videoViewerProfiles.videoId, data.videoId), eq(videoViewerProfiles.sessionId, data.sessionId)));
    if (existing.length > 0) {
      const { videoId, sessionId, ...updates } = data;
      const [row] = await db.update(videoViewerProfiles).set({ ...updates, lastSeenAt: new Date() } as any).where(and(eq(videoViewerProfiles.videoId, videoId), eq(videoViewerProfiles.sessionId, sessionId))).returning();
      return row;
    } else {
      const [row] = await db.insert(videoViewerProfiles).values(data as any).returning();
      return row;
    }
  }

  async getVideoDailyStats(videoId: string, days: number = 30): Promise<VideoAnalyticsDailyStat[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().split("T")[0];
    return db.select().from(videoAnalyticsDailyStats).where(and(eq(videoAnalyticsDailyStats.videoId, videoId), gte(videoAnalyticsDailyStats.date, cutoffStr))).orderBy(videoAnalyticsDailyStats.date);
  }

  async incrementDailyStat(videoId: string, date: string, field: string): Promise<void> {
    const allowedFields = ["views", "uniqueViewers", "plays", "completions", "totalWatchSeconds", "avgCompletionPct", "ctaClicks", "leadCaptures", "avgEngagementPct", "bounceCount"];
    if (!allowedFields.includes(field)) {
      throw new Error(`Invalid field: ${field}`);
    }
    const existing = await db.select().from(videoAnalyticsDailyStats).where(and(eq(videoAnalyticsDailyStats.videoId, videoId), eq(videoAnalyticsDailyStats.date, date)));
    if (existing.length > 0) {
      const updateData: any = {};
      updateData[field] = sqlExpr`${sqlExpr.raw(`"${field}"`)} + 1`;
      await db.update(videoAnalyticsDailyStats).set(updateData).where(and(eq(videoAnalyticsDailyStats.videoId, videoId), eq(videoAnalyticsDailyStats.date, date)));
    } else {
      const insert: any = { videoId, date, views: 0, uniqueViewers: 0, plays: 0, completions: 0, totalWatchSeconds: 0, avgCompletionPct: 0, ctaClicks: 0, leadCaptures: 0, avgEngagementPct: 0, bounceCount: 0 };
      insert[field] = 1;
      await db.insert(videoAnalyticsDailyStats).values(insert);
    }
  }

  async getVideoAnalyticsOverview(userId: string): Promise<any> {
    const videos = await this.getVideoEvents(userId);
    const videoIds = videos.map(v => v.id);
    if (videoIds.length === 0) return { totalViews: 0, totalVideos: 0, avgCompletion: 0, topReferrers: [], deviceBreakdown: {}, countryBreakdown: {}, dailyViews: [] };

    const allProfiles = await db.select().from(videoViewerProfiles).where(inArray(videoViewerProfiles.videoId, videoIds));
    const totalViews = videos.reduce((s, v) => s + (v.views || 0), 0);
    const avgCompletion = allProfiles.length > 0 ? Math.round(allProfiles.reduce((s, p) => s + (p.completionPct || 0), 0) / allProfiles.length) : 0;

    // Referrer breakdown
    const referrerMap: Record<string, number> = {};
    allProfiles.forEach(p => { if (p.referrerDomain) referrerMap[p.referrerDomain] = (referrerMap[p.referrerDomain] || 0) + 1; });
    const topReferrers = Object.entries(referrerMap).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([domain, count]) => ({ domain, count }));

    // Device breakdown
    const deviceMap: Record<string, number> = {};
    allProfiles.forEach(p => { if (p.device) deviceMap[p.device] = (deviceMap[p.device] || 0) + 1; });

    // Browser breakdown
    const browserMap: Record<string, number> = {};
    allProfiles.forEach(p => { if (p.browser) browserMap[p.browser] = (browserMap[p.browser] || 0) + 1; });

    // Country breakdown
    const countryMap: Record<string, number> = {};
    allProfiles.forEach(p => { if (p.country) countryMap[p.country] = (countryMap[p.country] || 0) + 1; });
    const countryBreakdown = Object.entries(countryMap).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([country, count]) => ({ country, count }));

    // Daily views (last 30 days)
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dailyStats = await db.select().from(videoAnalyticsDailyStats).where(and(inArray(videoAnalyticsDailyStats.videoId, videoIds), gte(videoAnalyticsDailyStats.date, thirtyDaysAgo.toISOString().split("T")[0]))).orderBy(videoAnalyticsDailyStats.date);

    // Aggregate daily
    const dailyMap: Record<string, { views: number; plays: number; completions: number }> = {};
    dailyStats.forEach(s => {
      if (!dailyMap[s.date]) dailyMap[s.date] = { views: 0, plays: 0, completions: 0 };
      dailyMap[s.date].views += s.views;
      dailyMap[s.date].plays += s.plays;
      dailyMap[s.date].completions += s.completions;
    });
    const dailyViews = Object.entries(dailyMap).map(([date, data]) => ({ date, ...data }));

    return { totalViews, totalVideos: videos.length, avgCompletion, topReferrers, deviceBreakdown: deviceMap, browserBreakdown: browserMap, countryBreakdown, dailyViews };
  }

  // ── Video Collections ─────────────────────────────────────────────────────
  async getVideoCollections(userId: string): Promise<VideoCollection[]> {
    return db.select().from(videoCollections).where(eq(videoCollections.userId, userId)).orderBy(desc(videoCollections.createdAt));
  }
  async createVideoCollection(data: InsertVideoCollection): Promise<VideoCollection> {
    const [row] = await db.insert(videoCollections).values(data).returning();
    return row;
  }
  async updateVideoCollection(id: number, data: Partial<InsertVideoCollection>): Promise<VideoCollection | undefined> {
    const [row] = await db.update(videoCollections).set(data).where(eq(videoCollections.id, id)).returning();
    return row;
  }
  async deleteVideoCollection(id: number): Promise<void> {
    await db.delete(videoCollections).where(eq(videoCollections.id, id));
  }
  async getVideoCollectionItems(collectionId: number): Promise<VideoCollectionItem[]> {
    return db.select().from(videoCollectionItems).where(eq(videoCollectionItems.collectionId, collectionId)).orderBy(videoCollectionItems.sortOrder);
  }
  async addVideoToCollection(collectionId: number, videoEventId: string, sortOrder = 0): Promise<VideoCollectionItem> {
    const [row] = await db.insert(videoCollectionItems).values({ collectionId, videoEventId, sortOrder }).returning();
    return row;
  }
  async removeVideoFromCollection(id: number): Promise<void> {
    await db.delete(videoCollectionItems).where(eq(videoCollectionItems.id, id));
  }

  // ── Video Chapters ────────────────────────────────────────────────────────
  async getVideoChapters(videoEventId: string): Promise<VideoChapter[]> {
    return db.select().from(videoChapters).where(eq(videoChapters.videoEventId, videoEventId)).orderBy(videoChapters.startSeconds);
  }
  async createVideoChapter(data: InsertVideoChapter): Promise<VideoChapter> {
    const [row] = await db.insert(videoChapters).values(data).returning();
    return row;
  }
  async updateVideoChapter(id: number, data: Partial<InsertVideoChapter>): Promise<VideoChapter | undefined> {
    const [row] = await db.update(videoChapters).set(data).where(eq(videoChapters.id, id)).returning();
    return row;
  }
  async deleteVideoChapter(id: number): Promise<void> {
    await db.delete(videoChapters).where(eq(videoChapters.id, id));
  }

  // ── Video CTAs ────────────────────────────────────────────────────────────
  async getVideoCtas(videoEventId: string): Promise<VideoCta[]> {
    return db.select().from(videoCtas).where(eq(videoCtas.videoEventId, videoEventId)).orderBy(videoCtas.appearAt);
  }
  async createVideoCta(data: InsertVideoCta): Promise<VideoCta> {
    const [row] = await db.insert(videoCtas).values(data).returning();
    return row;
  }
  async updateVideoCta(id: number, data: Partial<InsertVideoCta>): Promise<VideoCta | undefined> {
    const [row] = await db.update(videoCtas).set(data).where(eq(videoCtas.id, id)).returning();
    return row;
  }
  async deleteVideoCta(id: number): Promise<void> {
    await db.delete(videoCtas).where(eq(videoCtas.id, id));
  }
  async incrementCtaClicks(id: number): Promise<void> {
    await db.update(videoCtas).set({ clicks: sqlExpr`clicks + 1` }).where(eq(videoCtas.id, id));
  }

  // ── Video Viewer Sessions ─────────────────────────────────────────────────
  async createViewerSession(data: InsertVideoViewerSession): Promise<VideoViewerSession> {
    const [row] = await db.insert(videoViewerSessions).values(data).returning();
    return row;
  }
  async getVideoViewerSessions(videoEventId: string): Promise<VideoViewerSession[]> {
    return db.select().from(videoViewerSessions).where(eq(videoViewerSessions.videoEventId, videoEventId)).orderBy(desc(videoViewerSessions.createdAt));
  }
  async updateViewerSession(id: number, data: Partial<InsertVideoViewerSession>): Promise<void> {
    await db.update(videoViewerSessions).set(data).where(eq(videoViewerSessions.id, id));
  }

  // ── Video Interactive Elements ────────────────────────────────────────────
  async getVideoInteractiveElements(videoEventId: string): Promise<VideoInteractiveElement[]> {
    return db.select().from(videoInteractiveElements).where(eq(videoInteractiveElements.videoEventId, videoEventId)).orderBy(videoInteractiveElements.timestamp);
  }
  async createVideoInteractiveElement(data: InsertVideoInteractiveElement): Promise<VideoInteractiveElement> {
    const [row] = await db.insert(videoInteractiveElements).values(data).returning();
    return row;
  }
  async updateVideoInteractiveElement(id: string, data: Partial<InsertVideoInteractiveElement>): Promise<VideoInteractiveElement | undefined> {
    const [row] = await db.update(videoInteractiveElements).set(data).where(eq(videoInteractiveElements.id, id)).returning();
    return row;
  }
  async deleteVideoInteractiveElement(id: string): Promise<void> {
    await db.delete(videoInteractiveElements).where(eq(videoInteractiveElements.id, id));
  }

  // ── Video A/B Tests ───────────────────────────────────────────────────────
  async getVideoAbTests(userId: string): Promise<VideoAbTest[]> {
    return db.select().from(videoAbTests).where(eq(videoAbTests.userId, userId)).orderBy(desc(videoAbTests.createdAt));
  }
  async createVideoAbTest(data: InsertVideoAbTest): Promise<VideoAbTest> {
    const [row] = await db.insert(videoAbTests).values(data).returning();
    return row;
  }
  async updateVideoAbTest(id: string, data: Partial<InsertVideoAbTest>): Promise<VideoAbTest | undefined> {
    const [row] = await db.update(videoAbTests).set(data).where(eq(videoAbTests.id, id)).returning();
    return row;
  }
  async deleteVideoAbTest(id: string): Promise<void> {
    await db.delete(videoAbTests).where(eq(videoAbTests.id, id));
  }

  // ── Video Channels ────────────────────────────────────────────────────────
  async getVideoChannels(userId: string): Promise<VideoChannel[]> {
    return db.select().from(videoChannels).where(eq(videoChannels.userId, userId)).orderBy(desc(videoChannels.createdAt));
  }
  async getVideoChannel(id: string): Promise<VideoChannel | undefined> {
    const [row] = await db.select().from(videoChannels).where(eq(videoChannels.id, id));
    return row;
  }
  async getVideoChannelBySlug(slug: string): Promise<VideoChannel | undefined> {
    const [row] = await db.select().from(videoChannels).where(eq(videoChannels.slug, slug));
    return row;
  }
  async createVideoChannel(data: InsertVideoChannel): Promise<VideoChannel> {
    const [row] = await db.insert(videoChannels).values(data).returning();
    return row;
  }
  async updateVideoChannel(id: string, data: Partial<InsertVideoChannel>): Promise<VideoChannel | undefined> {
    const [row] = await db.update(videoChannels).set(data).where(eq(videoChannels.id, id)).returning();
    return row;
  }
  async deleteVideoChannel(id: string): Promise<void> {
    await db.delete(videoChannels).where(eq(videoChannels.id, id));
  }
  async getChannelEpisodes(channelId: string): Promise<VideoChannelEpisode[]> {
    return db.select().from(videoChannelEpisodes).where(eq(videoChannelEpisodes.channelId, channelId)).orderBy(videoChannelEpisodes.sortOrder);
  }
  async addChannelEpisode(channelId: string, videoEventId: string, section?: string, sortOrder?: number): Promise<VideoChannelEpisode> {
    const [row] = await db.insert(videoChannelEpisodes).values({ channelId, videoEventId, section: section || "Episodes", sortOrder: sortOrder ?? 0 }).returning();
    return row;
  }
  async removeChannelEpisode(id: number): Promise<void> {
    await db.delete(videoChannelEpisodes).where(eq(videoChannelEpisodes.id, id));
  }
  async subscribeToChannel(channelId: string, email: string, name?: string): Promise<VideoChannelSubscriber> {
    const [row] = await db.insert(videoChannelSubscribers).values({ channelId, email, name: name || null }).returning();
    await db.update(videoChannels).set({ subscriberCount: sqlExpr`subscriber_count + 1` }).where(eq(videoChannels.id, channelId));
    return row;
  }

  // ── Video Dubbing Jobs ────────────────────────────────────────────────────
  async getVideoDubbingJobs(userId: string, videoEventId?: string): Promise<VideoDubbingJob[]> {
    const conds = [eq(videoDubbingJobs.userId, userId)];
    if (videoEventId) conds.push(eq(videoDubbingJobs.videoEventId, videoEventId));
    return db.select().from(videoDubbingJobs).where(and(...conds)).orderBy(desc(videoDubbingJobs.createdAt));
  }
  async createVideoDubbingJob(data: InsertVideoDubbingJob): Promise<VideoDubbingJob> {
    const [row] = await db.insert(videoDubbingJobs).values(data).returning();
    return row;
  }
  async updateVideoDubbingJob(id: string, data: Partial<InsertVideoDubbingJob>): Promise<VideoDubbingJob | undefined> {
    const [row] = await db.update(videoDubbingJobs).set(data).where(eq(videoDubbingJobs.id, id)).returning();
    return row;
  }

  // ── Video Collaboration Comments ──────────────────────────────────────────
  async getVideoCollabComments(videoEventId: string): Promise<VideoCollabComment[]> {
    return db.select().from(videoCollabComments).where(eq(videoCollabComments.videoEventId, videoEventId)).orderBy(desc(videoCollabComments.createdAt));
  }
  async createVideoCollabComment(data: InsertVideoCollabComment): Promise<VideoCollabComment> {
    const [row] = await db.insert(videoCollabComments).values(data).returning();
    return row;
  }
  async updateVideoCollabComment(id: string, data: Partial<InsertVideoCollabComment>): Promise<VideoCollabComment | undefined> {
    const [row] = await db.update(videoCollabComments).set(data).where(eq(videoCollabComments.id, id)).returning();
    return row;
  }
  async deleteVideoCollabComment(id: string): Promise<void> {
    await db.delete(videoCollabComments).where(eq(videoCollabComments.id, id));
  }

  // ── Canva Integration ─────────────────────────────────────────────────────
  async getCanvaToken(userId: string): Promise<any | null> {
    // Placeholder - implement when canva_tokens table exists
    return null;
  }

  async upsertCanvaToken(data: { userId: string; accessToken: string; refreshToken?: string; expiresAt?: Date; scope?: string }): Promise<any> {
    // Placeholder - implement when canva_tokens table exists
    return data;
  }

  async deleteCanvaToken(userId: string): Promise<void> {
    // Placeholder - implement when canva_tokens table exists
  }

  // ── User Feedback ─────────────────────────────────────────────────────────
  async createUserFeedback(data: InsertUserFeedback): Promise<UserFeedback> {
    const [row] = await db.insert(userFeedback).values(data).returning();
    return row;
  }
  async getAllUserFeedback(): Promise<(UserFeedback & { userName?: string; userEmail?: string })[]> {
    const rows = await db
      .select({
        feedback: userFeedback,
        userName: users.name,
        userEmail: users.email,
      })
      .from(userFeedback)
      .leftJoin(users, eq(userFeedback.userId, users.id))
      .orderBy(desc(userFeedback.submittedAt));
    return rows.map(r => ({ ...r.feedback, userName: r.userName ?? undefined, userEmail: r.userEmail ?? undefined }));
  }
  async getUserFeedback(userId: string): Promise<UserFeedback[]> {
    return db.select().from(userFeedback).where(eq(userFeedback.userId, userId)).orderBy(desc(userFeedback.submittedAt));
  }

  // ── CONTENT INTELLIGENCE ENGINE ──────────────────────────────────────────
  // Hook Library
  async getHookLibrary(filters?: { platform?: string; niche?: string; hookType?: string; limit?: number }): Promise<HookLibrary[]> {
    let query = db.select().from(hookLibrary).orderBy(desc(hookLibrary.viralScore));
    if (filters?.limit) query = query.limit(filters.limit) as any;
    const results = await query;
    return results.filter(h => {
      if (filters?.platform && h.platform !== filters.platform) return false;
      if (filters?.niche && !h.niche.toLowerCase().includes(filters.niche.toLowerCase())) return false;
      if (filters?.hookType && h.hookType !== filters.hookType) return false;
      return true;
    });
  }
  async createHook(data: InsertHookLibrary): Promise<HookLibrary> {
    const [row] = await db.insert(hookLibrary).values(data).returning();
    return row;
  }
  async incrementHookUsage(id: string): Promise<void> {
    await db.update(hookLibrary).set({ usageCount: sqlExpr`${hookLibrary.usageCount} + 1` }).where(eq(hookLibrary.id, id));
  }

  // Winning Patterns
  async getWinningPatterns(userId: string, filters?: { platform?: string; funnelStage?: string; limit?: number }): Promise<WinningPattern[]> {
    let query = db.select().from(winningPatterns).where(eq(winningPatterns.userId, userId)).orderBy(desc(winningPatterns.viralScore));
    if (filters?.limit) query = query.limit(filters.limit) as any;
    const results = await query;
    return results.filter(p => {
      if (filters?.platform && p.platform !== filters.platform) return false;
      if (filters?.funnelStage && p.funnelStage !== filters.funnelStage) return false;
      return true;
    });
  }
  async createWinningPattern(data: InsertWinningPattern): Promise<WinningPattern> {
    const [row] = await db.insert(winningPatterns).values(data).returning();
    return row;
  }
  async getTopWinningPatterns(filters?: { platform?: string; niche?: string; limit?: number }): Promise<WinningPattern[]> {
    let query = db.select().from(winningPatterns).orderBy(desc(winningPatterns.viralScore));
    if (filters?.limit) query = query.limit(filters.limit) as any;
    const results = await query;
    return results.filter(p => {
      if (filters?.platform && p.platform !== filters.platform) return false;
      if (filters?.niche && !p.niche.toLowerCase().includes(filters.niche.toLowerCase())) return false;
      return true;
    });
  }

  // Brand Voice Profiles
  async getBrandVoiceProfile(userId: string): Promise<BrandVoiceProfile | undefined> {
    const [row] = await db.select().from(brandVoiceProfiles).where(eq(brandVoiceProfiles.userId, userId));
    return row;
  }
  async createBrandVoiceProfile(data: InsertBrandVoiceProfile): Promise<BrandVoiceProfile> {
    const [row] = await db.insert(brandVoiceProfiles).values(data).returning();
    return row;
  }
  async updateBrandVoiceProfile(userId: string, data: Partial<InsertBrandVoiceProfile>): Promise<BrandVoiceProfile> {
    const [row] = await db.update(brandVoiceProfiles).set({ ...data, updatedAt: new Date() }).where(eq(brandVoiceProfiles.userId, userId)).returning();
    return row;
  }
  async upsertBrandVoiceProfile(data: InsertBrandVoiceProfile): Promise<BrandVoiceProfile> {
    const existing = await this.getBrandVoiceProfile(data.userId);
    if (existing) {
      const [row] = await db.update(brandVoiceProfiles).set({ ...data, updatedAt: new Date() }).where(eq(brandVoiceProfiles.userId, data.userId)).returning();
      return row;
    }
    const [row] = await db.insert(brandVoiceProfiles).values(data).returning();
    return row;
  }

  // Content Calendars
  async getContentCalendars(userId: string): Promise<ContentCalendar[]> {
    return db.select().from(contentCalendars).where(eq(contentCalendars.userId, userId)).orderBy(desc(contentCalendars.createdAt));
  }
  async getContentCalendar(id: string): Promise<ContentCalendar | undefined> {
    const [row] = await db.select().from(contentCalendars).where(eq(contentCalendars.id, id));
    return row;
  }
  async createContentCalendar(data: InsertContentCalendar): Promise<ContentCalendar> {
    const [row] = await db.insert(contentCalendars).values(data).returning();
    return row;
  }
  async updateContentCalendar(id: string, data: Partial<InsertContentCalendar>): Promise<ContentCalendar> {
    const [row] = await db.update(contentCalendars).set({ ...data, updatedAt: new Date() }).where(eq(contentCalendars.id, id)).returning();
    return row;
  }
  async deleteContentCalendar(id: string): Promise<void> {
    await db.delete(contentCalendars).where(eq(contentCalendars.id, id));
  }

  // Content Templates
  async getContentTemplates(userId: string): Promise<ContentTemplate[]> {
    return db.select().from(contentTemplates).where(eq(contentTemplates.userId, userId)).orderBy(desc(contentTemplates.createdAt));
  }
  async getPublicContentTemplates(): Promise<ContentTemplate[]> {
    return db.select().from(contentTemplates).where(eq(contentTemplates.isPublic, true)).orderBy(desc(contentTemplates.usageCount));
  }
  async createContentTemplate(data: InsertContentTemplate): Promise<ContentTemplate> {
    const [row] = await db.insert(contentTemplates).values(data).returning();
    return row;
  }
  async updateContentTemplate(id: string, data: Partial<InsertContentTemplate>): Promise<ContentTemplate> {
    const [row] = await db.update(contentTemplates).set({ ...data, updatedAt: new Date() }).where(eq(contentTemplates.id, id)).returning();
    return row;
  }
  async deleteContentTemplate(id: string): Promise<void> {
    await db.delete(contentTemplates).where(eq(contentTemplates.id, id));
  }
  async incrementTemplateUsage(id: string): Promise<void> {
    await db.update(contentTemplates).set({ usageCount: sqlExpr`${contentTemplates.usageCount} + 1` }).where(eq(contentTemplates.id, id));
  }

  // Platform Training Data
  async getPlatformTrainingData(platform: string, contentType?: string): Promise<PlatformTrainingData[]> {
    let query = db.select().from(platformTrainingData).where(eq(platformTrainingData.platform, platform as any));
    const results = await query;
    if (contentType) {
      return results.filter(p => p.contentType === contentType);
    }
    return results;
  }
  async createPlatformTrainingData(data: InsertPlatformTrainingData): Promise<PlatformTrainingData> {
    const [row] = await db.insert(platformTrainingData).values(data).returning();
    return row;
  }

  // Funnel Stage Training
  async getFunnelStageTraining(funnelStage: string): Promise<FunnelStageTraining | undefined> {
    const [row] = await db.select().from(funnelStageTraining).where(eq(funnelStageTraining.funnelStage, funnelStage as any));
    return row;
  }
  async getAllFunnelStageTraining(): Promise<FunnelStageTraining[]> {
    return db.select().from(funnelStageTraining);
  }
  async createFunnelStageTraining(data: InsertFunnelStageTraining): Promise<FunnelStageTraining> {
    const [row] = await db.insert(funnelStageTraining).values(data).returning();
    return row;
  }

  // ── Custom Domains ──────────────────────────────────────────────────────
  async getWebinarDomains(userId: string): Promise<WebinarDomain[]> {
    return db.select().from(webinarDomains).where(eq(webinarDomains.userId, userId)).orderBy(desc(webinarDomains.createdAt));
  }
  async getWebinarDomainByDomain(domain: string): Promise<WebinarDomain | undefined> {
    const [row] = await db.select().from(webinarDomains).where(eq(webinarDomains.domain, domain.toLowerCase().trim()));
    return row;
  }
  async createWebinarDomain(data: InsertWebinarDomain): Promise<WebinarDomain> {
    const [row] = await db.insert(webinarDomains).values(data).returning();
    return row;
  }
  async updateWebinarDomain(id: string, data: Partial<WebinarDomain>): Promise<WebinarDomain | undefined> {
    const [row] = await db.update(webinarDomains).set(data).where(eq(webinarDomains.id, id)).returning();
    return row;
  }
  async deleteWebinarDomain(id: string): Promise<void> {
    await db.delete(webinarDomains).where(eq(webinarDomains.id, id));
  }

  // ── Video Marketing Settings (Livekit) ─────────────────────────────────
  async getVideoMarketingSettings(userId: string): Promise<VideoMarketingSettings | undefined> {
    const [row] = await db.select().from(videoMarketingSettings).where(eq(videoMarketingSettings.userId, userId));
    return row;
  }
  async upsertVideoMarketingSettings(userId: string, data: Partial<VideoMarketingSettings>): Promise<VideoMarketingSettings> {
    const [row] = await db
      .insert(videoMarketingSettings)
      .values({ userId, livekitUrl: null, livekitKey: null, livekitSecret: null, ...data })
      .onConflictDoUpdate({ target: videoMarketingSettings.userId, set: { ...data, updatedAt: new Date() } })
      .returning();
    return row;
  }

  // ── Webinar Polls ──────────────────────────────────────────────────────
  async getWebinarPolls(webinarId: string): Promise<WebinarPoll[]> {
    return db.select().from(webinarPolls).where(eq(webinarPolls.webinarId, webinarId)).orderBy(desc(webinarPolls.createdAt));
  }
  async createWebinarPoll(data: InsertWebinarPoll): Promise<WebinarPoll> {
    const [row] = await db.insert(webinarPolls).values(data).returning();
    return row;
  }
  async updateWebinarPoll(id: string, data: Partial<WebinarPoll>): Promise<WebinarPoll | undefined> {
    const [row] = await db.update(webinarPolls).set(data).where(eq(webinarPolls.id, id)).returning();
    return row;
  }
  async deleteWebinarPoll(id: string): Promise<void> {
    await db.delete(webinarPolls).where(eq(webinarPolls.id, id));
  }

  // ── Webinar Series ──────────────────────────────────────────────────────
  async getWebinarSeries(userId: string): Promise<WebinarSeries[]> {
    return db.select().from(webinarSeries).where(eq(webinarSeries.userId, userId)).orderBy(desc(webinarSeries.createdAt));
  }
  async getWebinarSeriesById(id: string): Promise<WebinarSeries | undefined> {
    const [row] = await db.select().from(webinarSeries).where(eq(webinarSeries.id, id));
    return row;
  }
  async createWebinarSeries(data: InsertWebinarSeries): Promise<WebinarSeries> {
    const [row] = await db.insert(webinarSeries).values(data).returning();
    return row;
  }
  async updateWebinarSeries(id: string, data: Partial<InsertWebinarSeries>): Promise<WebinarSeries | undefined> {
    const [row] = await db.update(webinarSeries).set({ ...data, updatedAt: new Date() }).where(eq(webinarSeries.id, id)).returning();
    return row;
  }
  async deleteWebinarSeries(id: string): Promise<void> {
    await db.delete(webinarSeries).where(eq(webinarSeries.id, id));
  }

  // ── Webinar Viewer Sessions ─────────────────────────────────────────────
  async createWebinarViewerSession(data: InsertWebinarViewerSession): Promise<WebinarViewerSession> {
    const [row] = await db.insert(webinarViewerSessions).values(data).returning();
    return row;
  }
  async getWebinarViewerSessions(webinarId: string): Promise<WebinarViewerSession[]> {
    return db.select().from(webinarViewerSessions).where(eq(webinarViewerSessions.webinarId, webinarId)).orderBy(desc(webinarViewerSessions.joinedAt));
  }
  async updateWebinarViewerSession(id: string, data: Partial<WebinarViewerSession>): Promise<WebinarViewerSession | undefined> {
    const [row] = await db.update(webinarViewerSessions).set(data).where(eq(webinarViewerSessions.id, id)).returning();
    return row;
  }
  async getActiveViewerCount(webinarId: string): Promise<number> {
    const cutoff = new Date(Date.now() - 60000);
    const rows = await db.select().from(webinarViewerSessions).where(
      and(
        eq(webinarViewerSessions.webinarId, webinarId),
        eq(webinarViewerSessions.isActive, true),
        gte(webinarViewerSessions.lastHeartbeatAt, cutoff)
      )
    );
    return rows.length;
  }

  // ── Webinar Analytics ───────────────────────────────────────────────────
  async getWebinarAnalytics(webinarId: string): Promise<WebinarAnalytics | undefined> {
    const [row] = await db.select().from(webinarAnalytics).where(eq(webinarAnalytics.webinarId, webinarId));
    return row;
  }
  async upsertWebinarAnalytics(webinarId: string, data: Partial<InsertWebinarAnalytics>): Promise<WebinarAnalytics> {
    const [row] = await db
      .insert(webinarAnalytics)
      .values({ webinarId, ...data })
      .onConflictDoUpdate({ target: webinarAnalytics.webinarId, set: { ...data, updatedAt: new Date() } })
      .returning();
    return row;
  }

  // ── Webinar Poll Votes ──────────────────────────────────────────────────
  async createWebinarPollVote(data: { pollId: string; webinarId: string; viewerId: string; viewerName: string; optionIndex: number }): Promise<any> {
    const [row] = await db.insert(webinarPollVotes).values(data).returning();
    return row;
  }
  async getWebinarPollVotes(pollId: string): Promise<any[]> {
    return db.select().from(webinarPollVotes).where(eq(webinarPollVotes.pollId, pollId));
  }

  // ── Webinar Series - Generate Instances ─────────────────────────────────
  async generateSeriesInstances(seriesId: string, count: number = 5): Promise<any[]> {
    const series = await this.getWebinarSeriesById(seriesId);
    if (!series) return [];
    const instances: any[] = [];
    const now = new Date();
    for (let i = 0; i < count; i++) {
      const scheduledAt = new Date(now);
      const daysToAdd = i * (series.schedule === "daily" ? 1 : series.schedule === "weekly" ? 7 : series.schedule === "biweekly" ? 14 : 30);
      scheduledAt.setDate(scheduledAt.getDate() + daysToAdd);
      scheduledAt.setHours(series.timeHour, series.timeMinute, 0, 0);
      const meetingCode = `${series.title.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}-${i}`;
      const [webinar] = await db.insert(webinars).values({
        userId: series.userId,
        title: series.title,
        description: series.description,
        scheduledAt,
        durationMinutes: series.durationMinutes,
        maxAttendees: series.maxAttendees,
        meetingCode,
        presenterName: series.presenterName,
        webinarType: series.webinarType,
        seriesId: series.id,
        status: "upcoming",
      }).returning();
      instances.push(webinar);
    }
    return instances;
  }

  // ── NICHE INTELLIGENCE ─────────────────────────────────────────────────
  async getNicheIntelligence(filters?: { niche?: string; platform?: string }): Promise<NicheIntelligence[]> {
    let query = db.select().from(nicheIntelligence).orderBy(desc(nicheIntelligence.totalPosts));
    if (filters?.niche) query = query.where(eq(nicheIntelligence.niche, filters.niche)) as any;
    if (filters?.platform) query = query.where(eq(nicheIntelligence.platform, filters.platform as any)) as any;
    return query;
  }

  async getSingleNicheIntelligence(niche: string, platform?: string): Promise<NicheIntelligence | undefined> {
    if (platform) {
      const [row] = await db.select().from(nicheIntelligence).where(
        and(eq(nicheIntelligence.niche, niche), eq(nicheIntelligence.platform, platform as any))
      );
      return row;
    }
    const [row] = await db.select().from(nicheIntelligence).where(eq(nicheIntelligence.niche, niche));
    return row;
  }

  async getNicheTrends(niche: string, platform?: string): Promise<NicheTrend[]> {
    let query = db.select().from(nicheTrends).where(eq(nicheTrends.niche, niche)).orderBy(desc(nicheTrends.detectedAt)) as any;
    if (platform) query = query.where(eq(nicheTrends.platform, platform as any));
    return query;
  }

  async upsertNicheIntelligence(data: InsertNicheIntelligence): Promise<NicheIntelligence> {
    const existing = await this.getSingleNicheIntelligence(data.niche, data.platform ?? undefined);
    if (existing) {
      const [row] = await db.update(nicheIntelligence).set({ ...data, updatedAt: new Date() }).where(eq(nicheIntelligence.id, existing.id)).returning();
      return row;
    }
    const [row] = await db.insert(nicheIntelligence).values(data).returning();
    return row;
  }

  async upsertNicheTrend(data: InsertNicheTrend): Promise<NicheTrend> {
    const [existing] = await db.select().from(nicheTrends).where(
      and(
        eq(nicheTrends.niche, data.niche),
        eq(nicheTrends.platform, data.platform as any),
        eq(nicheTrends.trendType, data.trendType as any),
        eq(nicheTrends.trendValue, data.trendValue)
      )
    );
    if (existing) {
      const [row] = await db.update(nicheTrends).set({ ...data as any, updatedAt: new Date() }).where(eq(nicheTrends.id, existing.id)).returning();
      return row;
    }
    const [row] = await db.insert(nicheTrends).values(data).returning();
    return row;
  }

  async computeNicheIntelligence(): Promise<void> {
    // Aggregate from winning_patterns by niche
    const aggregates = await db.execute(sqlExpr`
      SELECT
        wp.niche,
        wp.platform,
        COUNT(*)::int AS total_winning_patterns,
        COUNT(DISTINCT wp.user_id)::int AS total_users,
        ROUND(AVG(wp.views)::numeric, 0)::int AS avg_views,
        ROUND(AVG(wp.likes)::numeric, 0)::int AS avg_likes,
        ROUND(AVG(wp.comments)::numeric, 0)::int AS avg_comments,
        ROUND(AVG(wp.saves)::numeric, 0)::int AS avg_saves,
        ROUND(AVG(wp.shares)::numeric, 0)::int AS avg_shares,
        ROUND(AVG(wp.engagement_rate)::numeric, 2)::real AS avg_engagement_rate,
        ROUND(AVG(wp.viral_score)::numeric, 2)::real AS avg_viral_score,
        ROUND(AVG(CASE WHEN wp.created_at >= NOW() - INTERVAL '30 days' THEN wp.engagement_rate ELSE NULL END)::numeric, 2)::real AS trend_30d
      FROM winning_patterns wp
      WHERE wp.niche IS NOT NULL AND wp.niche != ''
      GROUP BY wp.niche, wp.platform
    `);

    const rows = aggregates.rows as any[];
    for (const row of rows) {
      // Compute health score (0-100)
      const engRate = row.avg_engagement_rate ?? 0;
      const trend = row.trend_30d ?? 0;
      const users = row.total_users ?? 0;
      const posts = row.total_winning_patterns ?? 0;

      const baseScore = Math.min(engRate * 10, 40);
      const trendAdj = Math.max(-10, Math.min(trend * 2, 20));
      const communityScore = Math.min(users * 5, 20);
      const activityScore = Math.min((users > 0 ? posts / users : 0) * 2, 20);
      const healthScore = Math.max(0, Math.min(Math.round(baseScore + trendAdj + communityScore + activityScore), 100));
      const healthLabel = healthScore >= 80 ? "Excellent" : healthScore >= 60 ? "Good" : healthScore >= 40 ? "Fair" : "Poor";

      await this.upsertNicheIntelligence({
        niche: row.niche,
        platform: row.platform,
        avgViews: row.avg_views ?? 0,
        avgLikes: row.avg_likes ?? 0,
        avgComments: row.avg_comments ?? 0,
        avgSaves: row.avg_saves ?? 0,
        avgShares: row.avg_shares ?? 0,
        avgEngagementRate: engRate,
        avgViralScore: row.avg_viral_score ?? 0,
        totalPosts: posts,
        totalUsers: users,
        totalWinningPatterns: posts,
        trend30d: trend,
        healthScore,
        healthLabel,
        lastCalculatedAt: new Date(),
      });
    }

    // Compute top hook types per niche
    const topHooks = await db.execute(sqlExpr`
      SELECT DISTINCT ON (wp.niche, wp.platform)
        wp.niche,
        wp.platform,
        wp.hook_type AS top_hook_type,
        COUNT(*) OVER (PARTITION BY wp.niche, wp.platform, wp.hook_type) AS hook_count
      FROM winning_patterns wp
      WHERE wp.niche IS NOT NULL AND wp.niche != ''
      ORDER BY wp.niche, wp.platform, hook_count DESC
    `);

    for (const row of (topHooks.rows as any[])) {
      const existing = await this.getSingleNicheIntelligence(row.niche, row.platform);
      if (existing) {
        await db.update(nicheIntelligence).set({ topHookType: row.top_hook_type, updatedAt: new Date() }).where(eq(nicheIntelligence.id, existing.id));
      }
    }

    // Compute top content types per niche
    const topContentTypes = await db.execute(sqlExpr`
      SELECT DISTINCT ON (wp.niche, wp.platform)
        wp.niche,
        wp.platform,
        wp.content_type AS top_content_type,
        COUNT(*) OVER (PARTITION BY wp.niche, wp.platform, wp.content_type) AS ct_count
      FROM winning_patterns wp
      WHERE wp.niche IS NOT NULL AND wp.niche != ''
      ORDER BY wp.niche, wp.platform, ct_count DESC
    `);

    for (const row of (topContentTypes.rows as any[])) {
      const existing = await this.getSingleNicheIntelligence(row.niche, row.platform);
      if (existing) {
        await db.update(nicheIntelligence).set({ topContentType: row.top_content_type, updatedAt: new Date() }).where(eq(nicheIntelligence.id, existing.id));
      }
    }
  }

  async getNicheHealthScore(niche: string, platform?: string): Promise<{ healthScore: number; healthLabel: string; factors: Record<string, number> }> {
    const data = await this.getSingleNicheIntelligence(niche, platform);
    if (!data || data.healthScore == null) {
      return { healthScore: 0, healthLabel: "No Data", factors: { baseScore: 0, trendAdj: 0, communityScore: 0, activityScore: 0 } };
    }
    const engRate = data.avgEngagementRate ?? 0;
    const trend = data.trend30d ?? 0;
    const users = data.totalUsers ?? 0;
    const posts = data.totalPosts ?? 0;
    return {
      healthScore: data.healthScore,
      healthLabel: data.healthLabel ?? "Unknown",
      factors: {
        baseScore: Math.min(engRate * 10, 40),
        trendAdj: Math.max(-10, Math.min(trend * 2, 20)),
        communityScore: Math.min(users * 5, 20),
        activityScore: Math.min((users > 0 ? posts / users : 0) * 2, 20),
      },
    };
  }

  async getNicheUserRank(userId: string, niche: string, platform?: string): Promise<{ percentile: number; userAvgEngagement: number; nicheAvgEngagement: number; userAvgViralScore: number; nicheAvgViralScore: number; totalUsers: number; rank: number }> {
    // Get user's winning patterns in this niche
    const userPatterns = await db.select().from(winningPatterns).where(
      and(eq(winningPatterns.userId, userId), eq(winningPatterns.niche, niche))
    );
    const totalUserPatterns = userPatterns.length;
    const userAvgEngagement = totalUserPatterns > 0
      ? userPatterns.reduce((s: number, p: any) => s + (p.engagementRate || 0), 0) / totalUserPatterns
      : 0;
    const userAvgViralScore = totalUserPatterns > 0
      ? userPatterns.reduce((s: number, p: any) => s + (p.viralScore || 0), 0) / totalUserPatterns
      : 0;

    // Get niche average
    const ni = await this.getSingleNicheIntelligence(niche, platform);
    const nicheAvgEngagement = ni?.avgEngagementRate ?? 0;
    const nicheAvgViralScore = ni?.avgViralScore ?? 0;
    const totalUsers = ni?.totalUsers ?? 1;

    // Get all users' avg engagement in this niche to compute percentile
    const allNichePatterns = await db.select({
      userId: winningPatterns.userId,
      engagementRate: winningPatterns.engagementRate,
    }).from(winningPatterns).where(eq(winningPatterns.niche, niche));

    const userEngagementMap = new Map<string, number[]>();
    for (const p of allNichePatterns) {
      const arr = userEngagementMap.get(p.userId) || [];
      arr.push(p.engagementRate);
      userEngagementMap.set(p.userId, arr);
    }

    const userAvgs: { userId: string; avg: number }[] = [];
    for (const [uid, rates] of userEngagementMap) {
      userAvgs.push({ userId: uid, avg: rates.reduce((s, r) => s + r, 0) / rates.length });
    }
    userAvgs.sort((a, b) => b.avg - a.avg);

    const userRank = userAvgs.findIndex(u => u.userId === userId) + 1;
    const percentile = totalUsers > 0 ? Math.round(((totalUsers - userRank) / totalUsers) * 100) : 0;

    return {
      percentile: Math.max(0, percentile),
      userAvgEngagement: parseFloat(userAvgEngagement.toFixed(2)),
      nicheAvgEngagement: parseFloat(nicheAvgEngagement.toFixed(2)),
      userAvgViralScore: parseFloat(userAvgViralScore.toFixed(2)),
      nicheAvgViralScore: parseFloat(nicheAvgViralScore.toFixed(2)),
      totalUsers,
      rank: userRank > 0 ? userRank : totalUsers,
    };
  }

  async getNicheStrategy(niche: string, platform?: string): Promise<any[]> {
    const ni = await this.getSingleNicheIntelligence(niche, platform);
    if (!ni) return [];

    const strategies: any[] = [];

    // Hook strategy
    if (ni.topHookType) {
      strategies.push({
        type: "hook",
        title: `Lead with "${ni.topHookType}" hooks`,
        description: `${ni.topHookType} hooks are driving top engagement in ${niche}. Start your content with a ${ni.topHookType}-based opening to maximise hook retention.`,
        impact: "high",
        icon: "zap",
      });
    }

    // Content type strategy
    if (ni.topContentType) {
      strategies.push({
        type: "content_format",
        title: `Prioritise ${ni.topContentType} content`,
        description: `${ni.topContentType} is outperforming other formats in ${niche}. Shift your content mix to include more ${ni.topContentType} posts.`,
        impact: "high",
        icon: "layers",
      });
    }

    // Trend strategy
    if (ni.trend30d > 0) {
      strategies.push({
        type: "timing",
        title: "Increase posting frequency",
        description: `Niche engagement is rising ${ni.trend30d.toFixed(1)}% — now is the time to increase your posting cadence and capture the growing audience.`,
        impact: "medium",
        icon: "trending-up",
      });
    } else if (ni.trend30d < 0) {
      strategies.push({
        type: "innovation",
        title: "Experiment with new formats",
        description: `Engagement is declining ${Math.abs(ni.trend30d).toFixed(1)}% in ${niche}. Try new hook types, formats, and content structures to stand out.`,
        impact: "high",
        icon: "flame",
      });
    }

    // Saturation strategy
    const users = ni.totalUsers || 0;
    const posts = ni.totalPosts || 0;
    const postsPerUser = users > 0 ? posts / users : 0;
    if (postsPerUser > 20) {
      strategies.push({
        type: "differentiation",
        title: "Find your unique angle",
        description: `This niche has high content density (${postsPerUser.toFixed(1)} posts/creator). Differentiate with unique perspectives and underserved subtopics.`,
        impact: "medium",
        icon: "target",
      });
    } else if (postsPerUser < 5 && users > 5) {
      strategies.push({
        type: "volume",
        title: "Outpace the competition with volume",
        description: `Low content density (${postsPerUser.toFixed(1)} posts/creator) means opportunity. Post more frequently to capture market share.`,
        impact: "medium",
        icon: "zap",
      });
    }

    // Viral strategy
    if (ni.avgViralScore < 3) {
      strategies.push({
        type: "viral",
        title: "Improve your viral mechanics",
        description: `The niche average viral score is ${ni.avgViralScore.toFixed(1)}/10. Add comment bait, shareable moments, and save-worthy value to boost virality.`,
        impact: "high",
        icon: "flame",
      });
    }

    return strategies;
  }

  async getNicheHooksLibrary(niche: string, platform?: string, limit: number = 20): Promise<any[]> {
    let query = db.select().from(hookLibrary).where(eq(hookLibrary.niche, niche)).orderBy(desc(hookLibrary.viralScore), desc(hookLibrary.usageCount)).limit(limit) as any;
    if (platform) query = query.where(eq(hookLibrary.platform, platform as any));
    return query;
  }

  async getNicheContentGaps(userId: string, niche: string, platform?: string): Promise<any[]> {
    // Get top patterns across the niche
    const nichePatternsQuery = db.select({
      hookType: winningPatterns.hookType,
      contentType: winningPatterns.contentType,
      structure: winningPatterns.structure,
      engagementRate: winningPatterns.engagementRate,
    }).from(winningPatterns).where(eq(winningPatterns.niche, niche)).orderBy(desc(winningPatterns.engagementRate));

    const nichePatterns = await nichePatternsQuery;

    // Get user's patterns
    const userPatterns = await db.select({
      hookType: winningPatterns.hookType,
      contentType: winningPatterns.contentType,
      structure: winningPatterns.structure,
    }).from(winningPatterns).where(
      and(eq(winningPatterns.userId, userId), eq(winningPatterns.niche, niche))
    );

    const userHookTypes = new Set(userPatterns.map(p => p.hookType));
    const userContentTypes = new Set(userPatterns.map(p => p.contentType));
    const userStructures = new Set(userPatterns.map(p => p.structure));

    // Find gaps: top niche patterns the user hasn't tried
    const seen = new Set<string>();
    const gaps: any[] = [];

    for (const p of nichePatterns) {
      const key = `${p.hookType}-${p.contentType}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const missing: string[] = [];
      if (p.hookType && !userHookTypes.has(p.hookType)) missing.push(`hook type "${p.hookType}"`);
      if (p.contentType && !userContentTypes.has(p.contentType)) missing.push(`content format "${p.contentType}"`);

      if (missing.length > 0) {
        gaps.push({
          hookType: p.hookType,
          contentType: p.contentType,
          structure: p.structure,
          missing,
          potentialImpact: p.engagementRate > (nichePatterns.reduce((s, x) => s + x.engagementRate, 0) / Math.max(nichePatterns.length, 1)) ? "high" : "medium",
          avgEngagementRate: parseFloat(p.engagementRate.toFixed(2)),
        });
      }
    }

    return gaps.slice(0, 10);
  }

  // ── SMS Marketing ────────────────────────────────────────────────────────
  async getSmsSequences() {
    return db.select().from(smsSequences).orderBy(desc(smsSequences.createdAt));
  }
  async getSmsSequence(id: string) {
    const [row] = await db.select().from(smsSequences).where(eq(smsSequences.id, id));
    return row;
  }
  async createSmsSequence(data: InsertSmsSequence) {
    const [row] = await db.insert(smsSequences).values(data).returning();
    return row;
  }
  async updateSmsSequence(id: string, data: Partial<InsertSmsSequence>) {
    const [row] = await db.update(smsSequences).set(data).where(eq(smsSequences.id, id)).returning();
    return row;
  }
  async deleteSmsSequence(id: string) {
    await db.delete(smsSequences).where(eq(smsSequences.id, id));
  }
  async getSmsSequenceSteps(sequenceId: string) {
    return db.select().from(smsSequenceSteps).where(eq(smsSequenceSteps.sequenceId, sequenceId)).orderBy(smsSequenceSteps.sortOrder);
  }
  async createSmsSequenceStep(data: InsertSmsSequenceStep) {
    const [row] = await db.insert(smsSequenceSteps).values(data).returning();
    return row;
  }
  async updateSmsSequenceStep(id: string, data: Partial<InsertSmsSequenceStep>) {
    const [row] = await db.update(smsSequenceSteps).set(data).where(eq(smsSequenceSteps.id, id)).returning();
    return row;
  }
  async deleteSmsSequenceStep(id: string) {
    await db.delete(smsSequenceSteps).where(eq(smsSequenceSteps.id, id));
  }
  async enrollPhoneInSmsSequence(phone: string, sequenceId: string) {
    const existing = await db.select().from(smsEnrollments).where(
      and(eq(smsEnrollments.phone, phone), eq(smsEnrollments.sequenceId, sequenceId))
    );
    if (existing.length > 0) return null;
    const [row] = await db.insert(smsEnrollments).values({
      phone, sequenceId, currentStep: 0, completed: false, unsubscribed: false, nextSendAt: new Date(),
    }).returning();
    return row;
  }
  async getPendingSmsEnrollments() {
    const now = new Date();
    return db.select().from(smsEnrollments).where(
      and(
        eq(smsEnrollments.completed, false),
        eq(smsEnrollments.unsubscribed, false),
        lte(smsEnrollments.nextSendAt, now),
      )
    );
  }
  async advanceSmsEnrollment(id: string, nextStep: number, nextSendAt: Date | null, completed = false) {
    await db.update(smsEnrollments).set({ currentStep: nextStep, nextSendAt: nextSendAt ?? undefined, completed }).where(eq(smsEnrollments.id, id));
  }
  async logSms(data: { toPhone: string; message: string; sequenceStepId?: string; broadcastId?: string }) {
    const [row] = await db.insert(smsLogs).values({ ...data, sentAt: new Date() }).returning();
    return row;
  }
  async getSmsLogs(limit = 50) {
    return db.select().from(smsLogs).orderBy(desc(smsLogs.sentAt)).limit(limit);
  }
  async createSmsBroadcast(data: InsertSmsBroadcast) {
    const [row] = await db.insert(smsBroadcasts).values(data).returning();
    return row;
  }
  async getSmsBroadcasts() {
    return db.select().from(smsBroadcasts).orderBy(desc(smsBroadcasts.createdAt));
  }
  async updateSmsBroadcast(id: string, data: Partial<SmsBroadcast>) {
    await db.update(smsBroadcasts).set(data).where(eq(smsBroadcasts.id, id));
  }
  async getScheduledBroadcasts() {
    return db.select().from(smsBroadcasts).where(and(isNull(smsBroadcasts.sentAt), sqlExpr`${smsBroadcasts.scheduled_for} IS NOT NULL`));
  }
  async getSmsCarrierGateway(phone: string) {
    const [row] = await db.select().from(smsCarrierGateways).where(eq(smsCarrierGateways.phone, phone));
    return row;
  }
  async setSmsCarrierGateway(phone: string, carrierName: string, gatewayDomain: string) {
    const [row] = await db.insert(smsCarrierGateways).values({ phone, carrierName, gatewayDomain }).onConflictDoUpdate({ target: smsCarrierGateways.phone, set: { carrierName, gatewayDomain, updatedAt: new Date() } }).returning();
    return row;
  }
  async isSmsUnsubscribed(phone: string) {
    const [row] = await db.select().from(smsUnsubscribes).where(eq(smsUnsubscribes.phone, phone));
    return !!row;
  }
  async addSmsUnsubscribe(phone: string) {
    await db.insert(smsUnsubscribes).values({ phone }).onConflictDoNothing();
  }

  // ── SMS Templates ──
  async getSmsTemplates(category?: string) {
    if (category && category !== "all") return db.select().from(smsTemplates).where(eq(smsTemplates.category, category)).orderBy(desc(smsTemplates.createdAt));
    return db.select().from(smsTemplates).orderBy(desc(smsTemplates.createdAt));
  }
  async createSmsTemplate(data: InsertSmsTemplate) {
    const [row] = await db.insert(smsTemplates).values(data).returning();
    return row;
  }
  async deleteSmsTemplate(id: string) {
    await db.delete(smsTemplates).where(eq(smsTemplates.id, id));
  }

  // ── SMS Contact Tags ──
  async getSmsContactTags() {
    return db.select().from(smsContactTags).orderBy(smsContactTags.name);
  }
  async createSmsContactTag(name: string, color: string) {
    const [row] = await db.insert(smsContactTags).values({ name, color }).returning();
    return row;
  }
  async deleteSmsContactTag(id: string) {
    await db.delete(smsContactTags).where(eq(smsContactTags.id, id));
  }
  async getContactTagsForPhone(phone: string) {
    const rows = await db.select({ tag: smsContactTags }).from(smsContactTagAssignments)
      .innerJoin(smsContactTags, eq(smsContactTagAssignments.tagId, smsContactTags.id))
      .where(eq(smsContactTagAssignments.phone, phone));
    return rows.map(r => r.tag);
  }
  async assignTagToPhone(phone: string, tagId: string) {
    const [row] = await db.insert(smsContactTagAssignments).values({ phone, tagId }).returning();
    return row;
  }
  async unassignTagFromPhone(phone: string, tagId: string) {
    await db.delete(smsContactTagAssignments).where(and(eq(smsContactTagAssignments.phone, phone), eq(smsContactTagAssignments.tagId, tagId)));
  }

  // ── SMS Step Variants (A/B Testing) ──
  async getStepVariants(stepId: string) {
    return db.select().from(smsStepVariants).where(eq(smsStepVariants.stepId, stepId)).orderBy(smsStepVariants.createdAt);
  }
  async createStepVariant(data: { stepId: string; message: string; isControl?: boolean }) {
    const [row] = await db.insert(smsStepVariants).values(data).returning();
    return row;
  }
  async deleteStepVariant(id: string) {
    await db.delete(smsStepVariants).where(eq(smsStepVariants.id, id));
  }
  async incrementVariantClick(id: string) {
    await db.update(smsStepVariants).set({ clicks: sqlExpr`${smsStepVariants.clicks} + 1` }).where(eq(smsStepVariants.id, id));
  }

  // ── Enhanced Stats ──
  async getSmsStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const allLogs = await db.select().from(smsLogs);
    const totalSent = allLogs.length;
    const sentToday = allLogs.filter(l => l.sentAt && l.sentAt >= today).length;
    const activeEnrollments = await db.select().from(smsEnrollments).where(and(eq(smsEnrollments.completed, false), eq(smsEnrollments.unsubscribed, false)));
    const unsubscribedCount = await db.select().from(smsUnsubscribes);
    const contactCount = (await db.select().from(smsCarrierGateways)).length;
    const totalAttempts = totalSent + unsubscribedCount.length;
    const deliveredRate = totalAttempts > 0 ? Math.round((totalSent / totalAttempts) * 100) : 100;
    const optOutRate = totalSent > 0 ? Math.round((unsubscribedCount.length / totalSent) * 1000) / 10 : 0;
    return { totalSent, sentToday, activeEnrollments: activeEnrollments.length, deliveredRate, optOutRate, contactCount };
  }
  async getDailySmsVolume(days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const logs = await db.select().from(smsLogs).where(gte(smsLogs.sentAt, since));
    const map = new Map<string, number>();
    for (const l of logs) {
      if (l.sentAt) {
        const d = new Date(l.sentAt).toISOString().slice(0, 10);
        map.set(d, (map.get(d) || 0) + 1);
      }
    }
    const result: { date: string; count: number }[] = [];
    for (let i = days; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      result.push({ date: d, count: map.get(d) || 0 });
    }
    return result;
  }
  async reorderSmsSequenceSteps(sequenceId: string, stepIds: string[]) {
    for (let i = 0; i < stepIds.length; i++) {
      await db.update(smsSequenceSteps).set({ sortOrder: i }).where(and(eq(smsSequenceSteps.id, stepIds[i]), eq(smsSequenceSteps.sequenceId, sequenceId)));
    }
  }

  async getUsersWithPhone() {
    const rows = await db.select({
      id: users.id, name: users.name, phone: users.phone, carrierName: smsCarrierGateways.carrierName, gatewayDomain: smsCarrierGateways.gatewayDomain,
    }).from(users).leftJoin(smsCarrierGateways, eq(users.phone, smsCarrierGateways.phone))
      .where(and(sqlExpr`${users.phone} IS NOT NULL`, sqlExpr`${users.phone} != ''`));
    return rows as any[];
  }

  // ── Webinar Panelists ─────────────────────────────────────────────────────
  async getWebinarPanelists(webinarId: string) {
    return db.select().from(webinarPanelists).where(eq(webinarPanelists.webinarId, webinarId)).orderBy(desc(webinarPanelists.createdAt));
  }

  async createWebinarPanelist(data: any) {
    const [panelist] = await db.insert(webinarPanelists).values(data).returning();
    return panelist;
  }

  async updateWebinarPanelist(id: string, data: any) {
    const [panelist] = await db.update(webinarPanelists).set(data).where(eq(webinarPanelists.id, id)).returning();
    return panelist;
  }

  async deleteWebinarPanelist(id: string) {
    await db.delete(webinarPanelists).where(eq(webinarPanelists.id, id));
  }

  async acceptWebinarPanelistInvite(token: string) {
    const [panelist] = await db.update(webinarPanelists)
      .set({ status: "accepted", joinedAt: new Date() })
      .where(eq(webinarPanelists.inviteToken, token))
      .returning();
    return panelist;
  }

  async getWebinarPanelistByToken(token: string) {
    const [panelist] = await db.select().from(webinarPanelists).where(eq(webinarPanelists.inviteToken, token));
    return panelist;
  }

  // ── Webinar Backstage ─────────────────────────────────────────────────────
  async getWebinarBackstageMessages(webinarId: string) {
    return db.select().from(webinarBackstageMessages).where(eq(webinarBackstageMessages.webinarId, webinarId)).orderBy(webinarBackstageMessages.createdAt);
  }

  async createBackstageMessage(data: any) {
    const [msg] = await db.insert(webinarBackstageMessages).values(data).returning();
    return msg;
  }

  async startPracticeSession(data: any) {
    const [session] = await db.insert(webinarPracticeSessions).values({ ...data, startedAt: new Date() }).returning();
    return session;
  }

  async endPracticeSession(webinarId: string, notes?: string) {
    const [session] = await db.update(webinarPracticeSessions)
      .set({ endedAt: new Date(), notes: notes || null })
      .where(and(eq(webinarPracticeSessions.webinarId, webinarId), isNull(webinarPracticeSessions.endedAt)))
      .returning();
    return session;
  }

  async getActivePracticeSession(webinarId: string) {
    const [session] = await db.select().from(webinarPracticeSessions)
      .where(and(eq(webinarPracticeSessions.webinarId, webinarId), isNull(webinarPracticeSessions.endedAt)));
    return session;
  }

  async getPracticeSessionHistory(webinarId: string) {
    return db.select().from(webinarPracticeSessions).where(eq(webinarPracticeSessions.webinarId, webinarId)).orderBy(desc(webinarPracticeSessions.startedAt));
  }

  // ── Webinar Breakout Rooms ────────────────────────────────────────────────
  async getWebinarBreakoutRooms(webinarId: string) {
    return db.select().from(webinarBreakoutRooms).where(eq(webinarBreakoutRooms.webinarId, webinarId)).orderBy(webinarBreakoutRooms.createdAt);
  }

  async createWebinarBreakoutRoom(data: any) {
    const [room] = await db.insert(webinarBreakoutRooms).values(data).returning();
    return room;
  }

  async updateWebinarBreakoutRoom(id: string, data: any) {
    const [room] = await db.update(webinarBreakoutRooms).set(data).where(eq(webinarBreakoutRooms.id, id)).returning();
    return room;
  }

  async deleteWebinarBreakoutRoom(id: string) {
    await db.delete(webinarBreakoutParticipants).where(eq(webinarBreakoutParticipants.roomId, id));
    await db.delete(webinarBreakoutRooms).where(eq(webinarBreakoutRooms.id, id));
  }

  async openAllBreakoutRooms(webinarId: string) {
    await db.update(webinarBreakoutRooms).set({ isOpen: true }).where(eq(webinarBreakoutRooms.webinarId, webinarId));
  }

  async closeAllBreakoutRooms(webinarId: string) {
    await db.update(webinarBreakoutRooms).set({ isOpen: false }).where(eq(webinarBreakoutRooms.webinarId, webinarId));
  }

  async assignBreakoutParticipant(data: any) {
    const [participant] = await db.insert(webinarBreakoutParticipants).values({ ...data, joinedAt: new Date() }).returning();
    return participant;
  }

  async removeBreakoutParticipant(roomId: string, viewerId: string) {
    await db.update(webinarBreakoutParticipants)
      .set({ leftAt: new Date() })
      .where(and(eq(webinarBreakoutParticipants.roomId, roomId), eq(webinarBreakoutParticipants.viewerId, viewerId)));
  }

  async getBreakoutParticipants(roomId: string) {
    return db.select().from(webinarBreakoutParticipants)
      .where(and(eq(webinarBreakoutParticipants.roomId, roomId), isNull(webinarBreakoutParticipants.leftAt)));
  }

  // ── Webinar Email Automation ──────────────────────────────────────────────
  async getWebinarEmails(webinarId: string) {
    return db.select().from(webinarEmails).where(eq(webinarEmails.webinarId, webinarId)).orderBy(webinarEmails.createdAt);
  }

  async getWebinarEmailById(id: string) {
    const [email] = await db.select().from(webinarEmails).where(eq(webinarEmails.id, id));
    return email;
  }

  async upsertWebinarEmail(data: any) {
    // Check if this type already exists for the webinar
    const [existing] = await db.select().from(webinarEmails)
      .where(and(eq(webinarEmails.webinarId, data.webinarId), eq(webinarEmails.type, data.type)));
    if (existing) {
      const [updated] = await db.update(webinarEmails).set(data).where(eq(webinarEmails.id, existing.id)).returning();
      return updated;
    }
    const [created] = await db.insert(webinarEmails).values(data).returning();
    return created;
  }

  async updateWebinarEmail(id: string, data: any) {
    const [email] = await db.update(webinarEmails).set(data).where(eq(webinarEmails.id, id)).returning();
    return email;
  }

  async deleteWebinarEmail(id: string) {
    await db.delete(webinarEmails).where(eq(webinarEmails.id, id));
  }

  async logWebinarEmail(emailId: string, recipientEmail: string, recipientName?: string) {
    await db.insert(webinarEmailLogs).values({ webinarEmailId: emailId, recipientEmail, recipientName: recipientName || null });
  }

  async getWebinarEmailLogs(emailId: string) {
    return db.select().from(webinarEmailLogs).where(eq(webinarEmailLogs.webinarEmailId, emailId)).orderBy(desc(webinarEmailLogs.sentAt));
  }

  async getWebinarByCode(code: string) {
    const [webinar] = await db.select().from(webinars).where(eq(webinars.meetingCode, code));
    return webinar;
  }

  // ── Webinar Surveys ───────────────────────────────────────────────────────
  async getWebinarSurvey(webinarId: string) {
    const [survey] = await db.select().from(webinarSurveys).where(eq(webinarSurveys.webinarId, webinarId));
    return survey;
  }

  async upsertWebinarSurvey(data: any) {
    const [existing] = await db.select().from(webinarSurveys).where(eq(webinarSurveys.webinarId, data.webinarId));
    if (existing) {
      const [updated] = await db.update(webinarSurveys).set(data).where(eq(webinarSurveys.id, existing.id)).returning();
      return updated;
    }
    const [created] = await db.insert(webinarSurveys).values(data).returning();
    return created;
  }

  async submitWebinarSurveyResponse(data: any) {
    const [response] = await db.insert(webinarSurveyResponses).values({ ...data, submittedAt: new Date() }).returning();
    return response;
  }

  async getWebinarSurveyResponses(surveyId: string) {
    return db.select().from(webinarSurveyResponses).where(eq(webinarSurveyResponses.surveyId, surveyId)).orderBy(desc(webinarSurveyResponses.submittedAt));
  }

  // ── Webinar Templates ─────────────────────────────────────────────────────
  async getWebinarTemplates(userId: string) {
    return db.select().from(webinarTemplates).where(eq(webinarTemplates.userId, userId)).orderBy(desc(webinarTemplates.createdAt));
  }

  async createWebinarTemplate(data: any) {
    const [template] = await db.insert(webinarTemplates).values(data).returning();
    return template;
  }

  async deleteWebinarTemplate(id: string) {
    await db.delete(webinarTemplates).where(eq(webinarTemplates.id, id));
  }

  // ── Webinar Captions ──────────────────────────────────────────────────────
  async getWebinarCaptions(webinarId: string, after: number = 0, limit: number = 50) {
    return db.select().from(webinarCaptions)
      .where(and(eq(webinarCaptions.webinarId, webinarId), gte(webinarCaptions.startTime, after)))
      .orderBy(webinarCaptions.startTime)
      .limit(limit);
  }

  async addWebinarCaption(data: any) {
    const [caption] = await db.insert(webinarCaptions).values(data).returning();
    return caption;
  }

  async getWebinarTranscript(webinarId: string) {
    const [transcript] = await db.select().from(webinarTranscripts).where(eq(webinarTranscripts.webinarId, webinarId));
    return transcript;
  }

  async saveWebinarTranscript(data: any) {
    // Upsert - one transcript per webinar
    const [existing] = await db.select().from(webinarTranscripts).where(eq(webinarTranscripts.webinarId, data.webinarId));
    if (existing) {
      const [updated] = await db.update(webinarTranscripts).set(data).where(eq(webinarTranscripts.id, existing.id)).returning();
      return updated;
    }
    const [created] = await db.insert(webinarTranscripts).values({ ...data, generatedAt: new Date() }).returning();
    return created;
  }

  // ── Webinar Stream Destinations ───────────────────────────────────────────
  async getWebinarStreamDestinations(webinarId: string) {
    return db.select().from(webinarStreamDestinations).where(eq(webinarStreamDestinations.webinarId, webinarId));
  }

  async createWebinarStreamDestination(data: any) {
    const [dest] = await db.insert(webinarStreamDestinations).values(data).returning();
    return dest;
  }

  async updateWebinarStreamDestination(id: string, data: any) {
    const [dest] = await db.update(webinarStreamDestinations).set(data).where(eq(webinarStreamDestinations.id, id)).returning();
    return dest;
  }

  async deleteWebinarStreamDestination(id: string) {
    await db.delete(webinarStreamDestinations).where(eq(webinarStreamDestinations.id, id));
  }

  // ── Webinar Resources ─────────────────────────────────────────────────────
  async getWebinarResources(webinarId: string) {
    return db.select().from(webinarResources).where(eq(webinarResources.webinarId, webinarId)).orderBy(webinarResources.createdAt);
  }

  async createWebinarResource(data: any) {
    const [resource] = await db.insert(webinarResources).values(data).returning();
    return resource;
  }

  async pushWebinarResource(id: string) {
    const [resource] = await db.update(webinarResources).set({ pushedAt: new Date() }).where(eq(webinarResources.id, id)).returning();
    return resource;
  }

  async deleteWebinarResource(id: string) {
    await db.delete(webinarResources).where(eq(webinarResources.id, id));
  }

  // ── Webinar Engagement Scores ─────────────────────────────────────────────
  async getWebinarAttendeeScores(webinarId: string) {
    return db.select().from(webinarAttendeeScores).where(eq(webinarAttendeeScores.webinarId, webinarId)).orderBy(desc(webinarAttendeeScores.engagementScore));
  }

  async updateAttendeeEngagement(webinarId: string, data: any) {
    const { viewerId, viewerName, viewerEmail, event } = data;
    // Try to get existing score
    const [existing] = await db.select().from(webinarAttendeeScores)
      .where(and(eq(webinarAttendeeScores.webinarId, webinarId), eq(webinarAttendeeScores.viewerId, viewerId)));

    const updates: any = { updatedAt: new Date() };
    if (event === "chat") updates.chatMessages = (existing?.chatMessages || 0) + 1;
    else if (event === "question") updates.questionsAsked = (existing?.questionsAsked || 0) + 1;
    else if (event === "poll") updates.pollsVoted = (existing?.pollsVoted || 0) + 1;
    else if (event === "reaction") updates.reactionsCount = (existing?.reactionsCount || 0) + 1;
    else if (event === "cta_click") updates.ctaClicks = (existing?.ctaClicks || 0) + 1;
    else if (event === "hand_raise") updates.handRaises = (existing?.handRaises || 0) + 1;

    if (existing) {
      const [updated] = await db.update(webinarAttendeeScores).set(updates).where(eq(webinarAttendeeScores.id, existing.id)).returning();
      return updated;
    } else {
      const [created] = await db.insert(webinarAttendeeScores).values({
        webinarId, viewerId, viewerName, viewerEmail,
        ...updates,
        watchDuration: 0, chatMessages: 0, questionsAsked: 0, pollsVoted: 0,
        reactionsCount: 0, ctaClicks: 0, handRaises: 0, engagementScore: 0,
        ...(event === "chat" ? { chatMessages: 1 } : {}),
        ...(event === "question" ? { questionsAsked: 1 } : {}),
        ...(event === "poll" ? { pollsVoted: 1 } : {}),
        ...(event === "reaction" ? { reactionsCount: 1 } : {}),
        ...(event === "cta_click" ? { ctaClicks: 1 } : {}),
        ...(event === "hand_raise" ? { handRaises: 1 } : {}),
      }).returning();
      return created;
    }
  }

  async computeWebinarEngagementScores(webinarId: string) {
    const scores = await db.select().from(webinarAttendeeScores).where(eq(webinarAttendeeScores.webinarId, webinarId));
    const webinar = await this.getWebinar(webinarId);
    const totalDuration = (webinar?.durationMinutes || 60) * 60; // seconds

    const results: any[] = [];
    for (const score of scores) {
      // Compute engagement score (0-100)
      const watchPct = Math.min((score.watchDuration || 0) / totalDuration, 1) * 40; // 40% weight
      const chatPts = Math.min((score.chatMessages || 0) / 10, 1) * 15; // 15%
      const questionPts = Math.min((score.questionsAsked || 0) / 3, 1) * 15; // 15%
      const pollPts = Math.min((score.pollsVoted || 0) / 3, 1) * 10; // 10%
      const reactionPts = Math.min((score.reactionsCount || 0) / 5, 1) * 10; // 10%
      const ctaPts = Math.min((score.ctaClicks || 0) / 2, 1) * 10; // 10%
      const engagementScore = Math.round(watchPct + chatPts + questionPts + pollPts + reactionPts + ctaPts);
      const attendedFullDuration = (score.watchDuration || 0) >= totalDuration * 0.8;

      const [updated] = await db.update(webinarAttendeeScores)
        .set({ engagementScore, attendedFullDuration })
        .where(eq(webinarAttendeeScores.id, score.id))
        .returning();
      results.push(updated);
    }
    return results;
  }

  // ── AI Call Quota ─────────────────────────────────────────────────────────
  // Pro (Tier 4): 200 calls/month included. Elite: unlimited.
  // Top-up packs add bonus calls that carry over (never reset).
  // After monthly allowance exhausted, bonus calls consumed first before blocking.

  private readonly AI_CALL_QUOTA: Record<string, number> = {
    free: 0, starter: 0, growth: 0, pro: 200, elite: 9999,
  };

  private currentMonthKey(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }

  async getAiCallQuota(userId: string, plan: string): Promise<{ used: number; limit: number; bonus: number; periodMonth: string }> {
    const limit = this.AI_CALL_QUOTA[plan] ?? 0;
    const periodMonth = this.currentMonthKey();
    const [row] = await db.select().from(dialerAiCallQuota).where(eq(dialerAiCallQuota.userId, userId));
    if (!row || row.periodMonth !== periodMonth) {
      return { used: 0, limit, bonus: row?.bonusCallsBalance ?? 0, periodMonth };
    }
    return { used: row.callsUsed, limit, bonus: row.bonusCallsBalance, periodMonth };
  }

  async checkAndIncrementAiCallQuota(userId: string, plan: string): Promise<{ allowed: boolean; used: number; limit: number; bonus: number }> {
    const limit = this.AI_CALL_QUOTA[plan] ?? 0;
    const periodMonth = this.currentMonthKey();
    const [row] = await db.select().from(dialerAiCallQuota).where(eq(dialerAiCallQuota.userId, userId));

    const isNewMonth = !row || row.periodMonth !== periodMonth;
    const used = isNewMonth ? 0 : row!.callsUsed;
    const bonus = row?.bonusCallsBalance ?? 0;

    // Under monthly limit → consume monthly allowance
    if (limit > 0 && used < limit) {
      const newUsed = used + 1;
      if (!row) {
        await db.insert(dialerAiCallQuota).values({ userId, callsUsed: newUsed, bonusCallsBalance: 0, periodMonth });
      } else {
        await db.update(dialerAiCallQuota)
          .set({ callsUsed: newUsed, periodMonth, updatedAt: new Date() })
          .where(eq(dialerAiCallQuota.userId, userId));
      }
      return { allowed: true, used: newUsed, limit, bonus };
    }

    // Over monthly limit — consume bonus calls if available
    if (bonus > 0) {
      const newBonus = bonus - 1;
      if (!row) {
        await db.insert(dialerAiCallQuota).values({ userId, callsUsed: used, bonusCallsBalance: newBonus, periodMonth });
      } else {
        await db.update(dialerAiCallQuota)
          .set({ callsUsed: isNewMonth ? 0 : used, bonusCallsBalance: newBonus, periodMonth, updatedAt: new Date() })
          .where(eq(dialerAiCallQuota.userId, userId));
      }
      return { allowed: true, used, limit, bonus: newBonus };
    }

    return { allowed: false, used, limit, bonus: 0 };
  }

  async addAiCallTopUp(userId: string, amount: number): Promise<{ bonus: number }> {
    const [row] = await db.select().from(dialerAiCallQuota).where(eq(dialerAiCallQuota.userId, userId));
    if (!row) {
      await db.insert(dialerAiCallQuota).values({
        userId, callsUsed: 0, bonusCallsBalance: amount, periodMonth: this.currentMonthKey(),
      });
      return { bonus: amount };
    }
    const newBonus = row.bonusCallsBalance + amount;
    await db.update(dialerAiCallQuota)
      .set({ bonusCallsBalance: newBonus, updatedAt: new Date() })
      .where(eq(dialerAiCallQuota.userId, userId));
    return { bonus: newBonus };
  }

  // ── Coach Agent: Profile + Score History ─────────────────────────────────

  async getCoachProfile(userId: string): Promise<any | null> {
    const { rows } = await pool.query(`SELECT * FROM coach_profiles WHERE user_id=$1 LIMIT 1`, [userId]);
    return rows[0] ?? null;
  }

  async upsertCoachProfile(userId: string, data: {
    niche?: string; platform?: string; goal?: string; follower_tier?: string; content_style?: string;
  }): Promise<any> {
    const fields = Object.entries(data).filter(([, v]) => v !== undefined);
    if (fields.length === 0) return this.getCoachProfile(userId);
    const setClauses = fields.map(([k], i) => `${k}=\$${i + 2}`).join(", ");
    const values = [userId, ...fields.map(([, v]) => v)];
    const { rows } = await pool.query(`
      INSERT INTO coach_profiles (user_id, ${fields.map(([k]) => k).join(", ")})
      VALUES ($1, ${fields.map((_, i) => `$${i + 2}`).join(", ")})
      ON CONFLICT (user_id) DO UPDATE SET ${setClauses}, updated_at=NOW()
      RETURNING *
    `, values);
    return rows[0];
  }

  async addCoachScore(userId: string, data: {
    script_preview?: string; overall_score: number; clarity: number; persuasion: number;
    cta_strength: number; brand_voice: number; mode?: string; goal?: string; verdict?: string;
  }): Promise<void> {
    await pool.query(`
      INSERT INTO coach_score_history
        (user_id, script_preview, overall_score, clarity, persuasion, cta_strength, brand_voice, mode, goal, verdict)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    `, [
      userId, data.script_preview ?? null, data.overall_score, data.clarity,
      data.persuasion, data.cta_strength, data.brand_voice,
      data.mode ?? "breakdown", data.goal ?? null, data.verdict ?? null,
    ]);

    // Recalculate rolling averages + detect top weakness/strength
    await pool.query(`
      UPDATE coach_profiles SET
        avg_overall   = sub.avg_overall,
        avg_clarity   = sub.avg_clarity,
        avg_persuasion= sub.avg_persuasion,
        avg_cta       = sub.avg_cta,
        avg_brand_voice=sub.avg_brand_voice,
        total_sessions= sub.cnt,
        updated_at    = NOW()
      FROM (
        SELECT
          AVG(overall_score) AS avg_overall,
          AVG(clarity)       AS avg_clarity,
          AVG(persuasion)    AS avg_persuasion,
          AVG(cta_strength)  AS avg_cta,
          AVG(brand_voice)   AS avg_brand_voice,
          COUNT(*)           AS cnt
        FROM coach_score_history WHERE user_id=$1
      ) sub
      WHERE user_id=$1
    `, [userId]);
  }

  async getCoachScores(userId: string, limit = 20): Promise<any[]> {
    const { rows } = await pool.query(`
      SELECT * FROM coach_score_history WHERE user_id=$1 ORDER BY created_at DESC LIMIT $2
    `, [userId, limit]);
    return rows;
  }

  async getContentIdeaById(id: string): Promise<any | null> {
    const { rows } = await pool.query(
      "SELECT * FROM competitor_content_ideas WHERE id=$1 LIMIT 1", [id]
    );
    return rows[0] ?? null;
  }

  async getTodayContentIdeas(userId: string): Promise<any[]> {
    const { rows } = await pool.query(`
      SELECT * FROM competitor_content_ideas
      WHERE user_id=$1 AND created_at >= CURRENT_DATE
      ORDER BY created_at DESC
      LIMIT 20
    `, [userId]);
    return rows;
  }

  async getRecentSnapshotsForUser(userId: string, hoursBack = 30): Promise<any[]> {
    const { rows } = await pool.query(`
      SELECT cs.*, cw.handle, cw.niche as watchlist_niche
      FROM competitor_snapshots cs
      JOIN competitor_watchlist cw ON cw.id = cs.watchlist_id
      WHERE cs.user_id=$1
        AND cs.scanned_at >= NOW() - INTERVAL '${hoursBack} hours'
      ORDER BY cs.scanned_at DESC
    `, [userId]);
    return rows;
  }

  async getUserIdsWithWatchlist(): Promise<string[]> {
    const { rows } = await pool.query(`
      SELECT DISTINCT user_id FROM competitor_watchlist WHERE is_active = true
    `);
    return rows.map((r: any) => r.user_id);
  }
}

export const storage = new DatabaseStorage();
