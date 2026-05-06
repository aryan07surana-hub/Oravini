// ADVANCED SCHEDULING SYSTEM - Better than Calendly
export interface SchedulingSystem {
  // Core Calendar Management
  calendars: CalendarIntegration[];
  availability: AvailabilityEngine;
  bookings: BookingManager;
  
  // Qualification Intelligence
  qualification: QualificationEngine;
  scoring: AIScoring;
  
  // Advanced Features
  workflows: MultiStepWorkflows;
  routing: SmartRouting;
  analytics: SchedulingAnalytics;
}

// Calendar Integration Engine
export interface CalendarIntegration {
  id: string;
  provider: "google" | "outlook" | "apple" | "calendly";
  userId: string;
  calendarId: string;
  accessToken: string;
  refreshToken: string;
  syncStatus: "active" | "error" | "syncing";
  lastSync: string;
  settings: {
    bufferTime: number; // minutes before/after meetings
    workingHours: {
      start: string;
      end: string;
      timezone: string;
    };
    blackoutDates: string[];
    meetingTypes: string[];
  };
}

// Smart Availability Engine
export interface AvailabilityEngine {
  teamMembers: TeamMemberAvailability[];
  rules: AvailabilityRule[];
  conflicts: ConflictDetection;
}

export interface TeamMemberAvailability {
  memberId: string;
  name: string;
  role: "sales" | "coach" | "closer" | "strategist";
  expertise: string[]; // ["saas", "ecommerce", "agency"]
  availability: {
    timezone: string;
    schedule: WeeklySchedule;
    exceptions: DateException[];
  };
  performance: {
    bookingToShowRate: number;
    showToCloseRate: number;
    avgDealSize: number;
    clientSatisfaction: number;
  };
  capacity: {
    maxBookingsPerDay: number;
    maxBookingsPerWeek: number;
    currentBookings: number;
  };
}

export interface WeeklySchedule {
  monday: TimeSlot[];
  tuesday: TimeSlot[];
  wednesday: TimeSlot[];
  thursday: TimeSlot[];
  friday: TimeSlot[];
  saturday: TimeSlot[];
  sunday: TimeSlot[];
}

export interface TimeSlot {
  start: string; // "09:00"
  end: string; // "17:00"
  meetingTypes: string[];
}

// Qualification Engine (Calendly Killer Feature)
export interface QualificationEngine {
  forms: QualificationForm[];
  rules: QualificationRule[];
  scoring: QualificationScoring;
}

export interface QualificationForm {
  id: string;
  name: string;
  meetingType: string;
  questions: QualificationQuestion[];
  logic: FormLogic[];
  disqualificationRules: DisqualificationRule[];
}

export interface QualificationQuestion {
  id: string;
  type: "text" | "select" | "multiselect" | "number" | "revenue_slider" | "budget_range";
  question: string;
  required: boolean;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
  scoring: {
    weight: number;
    scoreMap: { [key: string]: number };
  };
  showIf?: {
    questionId: string;
    condition: "equals" | "contains" | "greater_than" | "less_than";
    value: any;
  };
}

export interface FormLogic {
  condition: {
    questionId: string;
    operator: "equals" | "contains" | "greater_than";
    value: any;
  };
  action: {
    type: "show_question" | "hide_question" | "show_pricing" | "redirect" | "disqualify";
    target: string;
    data?: any;
  };
}

// AI-Powered Scoring System
export interface AIScoring {
  models: ScoringModel[];
  realTimeScoring: boolean;
}

export interface ScoringModel {
  id: string;
  name: string;
  type: "revenue_potential" | "fit_score" | "urgency_score" | "budget_score";
  algorithm: "weighted_sum" | "neural_network" | "decision_tree";
  weights: { [questionId: string]: number };
  thresholds: {
    excellent: number; // 90+
    good: number; // 70-89
    fair: number; // 50-69
    poor: number; // <50
  };
}

// Multi-Step Qualification Workflows
export interface MultiStepWorkflows {
  workflows: QualificationWorkflow[];
  automations: WorkflowAutomation[];
}

export interface QualificationWorkflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  triggers: WorkflowTrigger[];
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: "qualification_call" | "strategy_session" | "close_call" | "follow_up" | "nurture";
  duration: number; // minutes
  meetingType: string;
  requiredScore: number;
  autoBook: boolean;
  delay?: number; // hours between steps
  conditions: StepCondition[];
}

// Smart Routing Engine
export interface SmartRouting {
  rules: RoutingRule[];
  algorithms: RoutingAlgorithm[];
}

export interface RoutingRule {
  id: string;
  name: string;
  priority: number;
  conditions: {
    businessType?: string[];
    revenueRange?: { min: number; max: number };
    urgency?: "low" | "medium" | "high";
    previousClient?: boolean;
  };
  routing: {
    type: "specific_member" | "round_robin" | "best_fit" | "highest_performer";
    memberIds?: string[];
    algorithm?: string;
  };
}

// Booking Manager
export interface BookingManager {
  bookings: Booking[];
  templates: BookingTemplate[];
  notifications: NotificationSystem;
}

export interface Booking {
  id: string;
  prospectInfo: ProspectInfo;
  meetingDetails: MeetingDetails;
  qualification: QualificationResult;
  status: "confirmed" | "pending" | "cancelled" | "completed" | "no_show";
  createdAt: string;
  updatedAt: string;
  workflow: {
    workflowId: string;
    currentStep: number;
    nextSteps: string[];
  };
}

export interface ProspectInfo {
  name: string;
  email: string;
  phone: string;
  company: string;
  website?: string;
  businessType: string;
  currentRevenue: number;
  targetRevenue: number;
  urgency: "low" | "medium" | "high";
  painPoints: string[];
  previousExperience: string;
  budget: number;
  timeline: string;
  referralSource: string;
  socialProfiles?: {
    linkedin?: string;
    facebook?: string;
    instagram?: string;
  };
}

export interface MeetingDetails {
  type: string;
  duration: number;
  scheduledFor: string;
  timezone: string;
  assignedTo: string;
  meetingLink: string;
  location?: string;
  agenda: string[];
  preparation: string[];
}

export interface QualificationResult {
  overallScore: number;
  scores: {
    revenuePotential: number;
    fitScore: number;
    urgencyScore: number;
    budgetScore: number;
  };
  qualified: boolean;
  tier: "tier1" | "tier2" | "tier3" | "tier4" | "tier5" | "unqualified";
  reasoning: string[];
  redFlags: string[];
  opportunities: string[];
  recommendedNext: string;
}

// Scheduling Analytics
export interface SchedulingAnalytics {
  metrics: SchedulingMetrics;
  reports: AnalyticsReport[];
  insights: SchedulingInsight[];
}

export interface SchedulingMetrics {
  // Booking Metrics
  totalBookings: number;
  bookingsByType: { [type: string]: number };
  bookingsBySource: { [source: string]: number };
  conversionRates: {
    landingToBooking: number;
    bookingToShow: number;
    showToClose: number;
    overallConversion: number;
  };
  
  // Qualification Metrics
  qualificationScores: {
    average: number;
    distribution: { [range: string]: number };
  };
  disqualificationReasons: { [reason: string]: number };
  
  // Team Performance
  teamMetrics: {
    [memberId: string]: {
      bookings: number;
      showRate: number;
      closeRate: number;
      avgDealSize: number;
      satisfaction: number;
    };
  };
  
  // Revenue Impact
  revenueMetrics: {
    pipelineGenerated: number;
    closedRevenue: number;
    avgDealSize: number;
    timeToClose: number;
  };
}

// Main Scheduling System Class
export class AdvancedSchedulingSystem {
  private calendars: Map<string, CalendarIntegration> = new Map();
  private availability: AvailabilityEngine;
  private qualification: QualificationEngine;
  private bookings: Map<string, Booking> = new Map();
  private workflows: Map<string, QualificationWorkflow> = new Map();
  private analytics: SchedulingAnalytics;

  constructor() {
    this.initializeSystem();
  }

  /**
   * Initialize the scheduling system with default configurations
   */
  private initializeSystem(): void {
    this.setupDefaultAvailability();
    this.setupQualificationForms();
    this.setupWorkflows();
    this.setupAnalytics();
  }

  /**
   * Create a new booking page (Better than Calendly)
   */
  createBookingPage(config: {
    name: string;
    meetingType: string;
    duration: number;
    qualificationFormId: string;
    workflowId?: string;
    customization: {
      branding: {
        logo: string;
        colors: { primary: string; secondary: string; };
        customCSS?: string;
      };
      content: {
        headline: string;
        description: string;
        benefits: string[];
        socialProof: {
          testimonials: string[];
          caseStudies: string[];
          clientLogos: string[];
        };
      };
      pricing: {
        showInvestment: boolean;
        investmentRange: string;
        roiCalculator: boolean;
      };
    };
  }): BookingPage {
    const pageId = `booking-${Date.now()}`;
    
    return {
      id: pageId,
      url: `https://distinpro.com/book/${pageId}`,
      name: config.name,
      meetingType: config.meetingType,
      duration: config.duration,
      qualificationForm: this.getQualificationForm(config.qualificationFormId),
      workflow: config.workflowId ? this.getWorkflow(config.workflowId) : undefined,
      customization: config.customization,
      analytics: {
        views: 0,
        bookings: 0,
        conversionRate: 0,
        qualificationRate: 0
      },
      isActive: true,
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Process a new booking with AI qualification
   */
  async processBooking(bookingData: {
    pageId: string;
    prospectInfo: ProspectInfo;
    selectedTime: string;
    timezone: string;
    qualificationAnswers: { [questionId: string]: any };
  }): Promise<{
    booking?: Booking;
    qualified: boolean;
    score: QualificationResult;
    nextSteps: string[];
    message: string;
  }> {
    // 1. Score the prospect using AI
    const qualificationResult = await this.scoreProspect(bookingData.qualificationAnswers);
    
    // 2. Check if qualified
    if (!qualificationResult.qualified) {
      return {
        qualified: false,
        score: qualificationResult,
        nextSteps: ["redirect_to_nurture"],
        message: "Thank you for your interest. We'll be in touch with resources that match your current stage."
      };
    }

    // 3. Find best team member using smart routing
    const assignedMember = await this.findBestTeamMember(bookingData.prospectInfo, qualificationResult);

    // 4. Create the booking
    const booking: Booking = {
      id: `booking-${Date.now()}`,
      prospectInfo: bookingData.prospectInfo,
      meetingDetails: {
        type: "qualification_call",
        duration: 45,
        scheduledFor: bookingData.selectedTime,
        timezone: bookingData.timezone,
        assignedTo: assignedMember.memberId,
        meetingLink: await this.generateMeetingLink(),
        agenda: [
          "Current business overview",
          "Revenue goals and timeline",
          "Biggest challenges",
          "Success criteria",
          "Next steps"
        ],
        preparation: [
          "Review your current revenue numbers",
          "Think about your biggest bottlenecks",
          "Prepare questions about our process"
        ]
      },
      qualification: qualificationResult,
      status: "confirmed",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      workflow: {
        workflowId: "tier5-qualification",
        currentStep: 1,
        nextSteps: ["strategy_session", "close_call"]
      }
    };

    // 5. Store booking
    this.bookings.set(booking.id, booking);

    // 6. Send notifications
    await this.sendBookingNotifications(booking);

    // 7. Update analytics
    this.updateAnalytics(booking);

    return {
      booking,
      qualified: true,
      score: qualificationResult,
      nextSteps: ["confirmation_email", "calendar_invite", "preparation_materials"],
      message: `Perfect! You're qualified for our Tier 5 program. ${assignedMember.name} will see you on ${new Date(bookingData.selectedTime).toLocaleDateString()}.`
    };
  }

  /**
   * AI-powered prospect scoring (Better than Calendly)
   */
  private async scoreProspect(answers: { [questionId: string]: any }): Promise<QualificationResult> {
    const scores = {
      revenuePotential: 0,
      fitScore: 0,
      urgencyScore: 0,
      budgetScore: 0
    };

    // Revenue Potential Scoring
    const currentRevenue = answers['current_revenue'] || 0;
    const targetRevenue = answers['target_revenue'] || 0;
    
    if (currentRevenue >= 5000) scores.revenuePotential += 30;
    if (targetRevenue >= 50000) scores.revenuePotential += 40;
    if (targetRevenue / currentRevenue >= 5) scores.revenuePotential += 30;

    // Fit Score
    const businessType = answers['business_type'];
    const experience = answers['previous_experience'];
    
    if (['saas', 'ecommerce', 'agency', 'coaching'].includes(businessType)) scores.fitScore += 40;
    if (experience === 'some_success') scores.fitScore += 30;
    if (answers['team_size'] >= 2) scores.fitScore += 30;

    // Urgency Score
    const timeline = answers['timeline'];
    const painLevel = answers['pain_level'];
    
    if (timeline === '30_days') scores.urgencyScore += 50;
    else if (timeline === '90_days') scores.urgencyScore += 30;
    if (painLevel >= 8) scores.urgencyScore += 50;

    // Budget Score
    const budget = answers['budget'] || 0;
    if (budget >= 10000) scores.budgetScore += 50;
    else if (budget >= 5000) scores.budgetScore += 30;
    else if (budget >= 2000) scores.budgetScore += 20;

    const overallScore = (scores.revenuePotential + scores.fitScore + scores.urgencyScore + scores.budgetScore) / 4;

    // Determine qualification
    const qualified = overallScore >= 60 && scores.budgetScore >= 20;
    
    // Determine tier
    let tier: QualificationResult['tier'] = 'unqualified';
    if (qualified) {
      if (overallScore >= 90) tier = 'tier5';
      else if (overallScore >= 80) tier = 'tier4';
      else if (overallScore >= 70) tier = 'tier3';
      else if (overallScore >= 60) tier = 'tier2';
      else tier = 'tier1';
    }

    return {
      overallScore: Math.round(overallScore),
      scores,
      qualified,
      tier,
      reasoning: this.generateReasoning(scores, answers),
      redFlags: this.identifyRedFlags(answers),
      opportunities: this.identifyOpportunities(scores, answers),
      recommendedNext: qualified ? 'book_strategy_session' : 'nurture_sequence'
    };
  }

  /**
   * Smart team member routing (Better than Calendly)
   */
  private async findBestTeamMember(prospect: ProspectInfo, qualification: QualificationResult): Promise<TeamMemberAvailability> {
    const availableMembers = this.availability.teamMembers.filter(member => 
      member.capacity.currentBookings < member.capacity.maxBookingsPerDay
    );

    // Score each member based on fit
    const memberScores = availableMembers.map(member => {
      let score = 0;
      
      // Expertise match
      if (member.expertise.includes(prospect.businessType)) score += 40;
      
      // Performance metrics
      score += member.performance.showToCloseRate * 0.3;
      score += member.performance.clientSatisfaction * 0.2;
      
      // Deal size match
      const dealSizeMatch = Math.abs(member.performance.avgDealSize - prospect.targetRevenue) / prospect.targetRevenue;
      score += (1 - dealSizeMatch) * 20;

      return { member, score };
    });

    // Return highest scoring available member
    memberScores.sort((a, b) => b.score - a.score);
    return memberScores[0].member;
  }

  // Helper methods
  private setupDefaultAvailability(): void {
    this.availability = {
      teamMembers: [
        {
          memberId: "sarah-johnson",
          name: "Sarah Johnson",
          role: "sales",
          expertise: ["saas", "tech"],
          availability: {
            timezone: "America/New_York",
            schedule: {
              monday: [{ start: "09:00", end: "17:00", meetingTypes: ["qualification", "strategy"] }],
              tuesday: [{ start: "09:00", end: "17:00", meetingTypes: ["qualification", "strategy"] }],
              wednesday: [{ start: "09:00", end: "17:00", meetingTypes: ["qualification", "strategy"] }],
              thursday: [{ start: "09:00", end: "17:00", meetingTypes: ["qualification", "strategy"] }],
              friday: [{ start: "09:00", end: "15:00", meetingTypes: ["qualification"] }],
              saturday: [],
              sunday: []
            },
            exceptions: []
          },
          performance: {
            bookingToShowRate: 85,
            showToCloseRate: 35,
            avgDealSize: 15000,
            clientSatisfaction: 9.2
          },
          capacity: {
            maxBookingsPerDay: 8,
            maxBookingsPerWeek: 35,
            currentBookings: 3
          }
        }
      ],
      rules: [],
      conflicts: { enabled: true, bufferMinutes: 15 }
    };
  }

  private setupQualificationForms(): void {
    this.qualification = {
      forms: [
        {
          id: "tier5-qualification",
          name: "Tier 5 Client Qualification",
          meetingType: "qualification_call",
          questions: [
            {
              id: "current_revenue",
              type: "revenue_slider",
              question: "What's your current monthly revenue?",
              required: true,
              validation: { min: 0, max: 100000 },
              scoring: { weight: 25, scoreMap: { "5000+": 30, "10000+": 50, "25000+": 80 } }
            },
            {
              id: "target_revenue",
              type: "revenue_slider", 
              question: "What's your revenue goal in the next 90 days?",
              required: true,
              validation: { min: 0, max: 500000 },
              scoring: { weight: 25, scoreMap: { "50000+": 40, "100000+": 70, "250000+": 100 } }
            },
            {
              id: "business_type",
              type: "select",
              question: "What type of business do you run?",
              required: true,
              options: ["SaaS", "E-commerce", "Agency", "Coaching", "Consulting", "Other"],
              scoring: { weight: 20, scoreMap: { "SaaS": 40, "E-commerce": 40, "Agency": 40, "Coaching": 30 } }
            },
            {
              id: "budget",
              type: "budget_range",
              question: "What's your budget for business growth investment?",
              required: true,
              options: ["Under $2K", "$2K-$5K", "$5K-$10K", "$10K-$25K", "$25K+"],
              scoring: { weight: 30, scoreMap: { "$10K-$25K": 40, "$25K+": 50 } }
            }
          ],
          logic: [],
          disqualificationRules: [
            { condition: { field: "current_revenue", operator: "less_than", value: 1000 }, message: "Minimum revenue requirement not met" },
            { condition: { field: "budget", operator: "equals", value: "Under $2K" }, message: "Investment level too low" }
          ]
        }
      ],
      rules: [],
      scoring: { realTimeScoring: true, models: [] }
    };
  }

  private setupWorkflows(): void {
    // Implementation for workflow setup
  }

  private setupAnalytics(): void {
    this.analytics = {
      metrics: {
        totalBookings: 0,
        bookingsByType: {},
        bookingsBySource: {},
        conversionRates: {
          landingToBooking: 0,
          bookingToShow: 0,
          showToClose: 0,
          overallConversion: 0
        },
        qualificationScores: { average: 0, distribution: {} },
        disqualificationReasons: {},
        teamMetrics: {},
        revenueMetrics: {
          pipelineGenerated: 0,
          closedRevenue: 0,
          avgDealSize: 0,
          timeToClose: 0
        }
      },
      reports: [],
      insights: []
    };
  }

  private generateReasoning(scores: any, answers: any): string[] {
    const reasoning = [];
    if (scores.revenuePotential >= 70) reasoning.push("Strong revenue potential");
    if (scores.fitScore >= 70) reasoning.push("Excellent business fit");
    if (scores.urgencyScore >= 70) reasoning.push("High urgency to solve problems");
    if (scores.budgetScore >= 40) reasoning.push("Adequate investment capacity");
    return reasoning;
  }

  private identifyRedFlags(answers: any): string[] {
    const redFlags = [];
    if (answers.budget === "Under $2K") redFlags.push("Low investment capacity");
    if (answers.timeline === "no_timeline") redFlags.push("No urgency");
    return redFlags;
  }

  private identifyOpportunities(scores: any, answers: any): string[] {
    const opportunities = [];
    if (answers.target_revenue > answers.current_revenue * 5) opportunities.push("Aggressive growth goals");
    if (answers.pain_level >= 8) opportunities.push("High pain point motivation");
    return opportunities;
  }

  private getQualificationForm(formId: string) {
    return this.qualification.forms.find(f => f.id === formId);
  }

  private getWorkflow(workflowId: string) {
    return this.workflows.get(workflowId);
  }

  private async generateMeetingLink(): Promise<string> {
    return `https://meet.distinpro.com/room/${Date.now()}`;
  }

  private async sendBookingNotifications(booking: Booking): Promise<void> {
    // Implementation for sending notifications
  }

  private updateAnalytics(booking: Booking): void {
    this.analytics.metrics.totalBookings++;
    // Update other metrics
  }
}

// Additional interfaces
export interface BookingPage {
  id: string;
  url: string;
  name: string;
  meetingType: string;
  duration: number;
  qualificationForm?: QualificationForm;
  workflow?: QualificationWorkflow;
  customization: any;
  analytics: {
    views: number;
    bookings: number;
    conversionRate: number;
    qualificationRate: number;
  };
  isActive: boolean;
  createdAt: string;
}

export interface DisqualificationRule {
  condition: {
    field: string;
    operator: "equals" | "less_than" | "greater_than";
    value: any;
  };
  message: string;
}

export interface ConflictDetection {
  enabled: boolean;
  bufferMinutes: number;
}

export interface DateException {
  date: string;
  type: "unavailable" | "limited";
  reason: string;
  alternativeSlots?: TimeSlot[];
}

export interface AvailabilityRule {
  id: string;
  name: string;
  condition: any;
  action: any;
}

export interface WorkflowTrigger {
  event: string;
  condition: any;
}

export interface StepCondition {
  type: string;
  value: any;
}

export interface WorkflowAutomation {
  id: string;
  trigger: string;
  actions: any[];
}

export interface RoutingAlgorithm {
  id: string;
  name: string;
  logic: any;
}

export interface BookingTemplate {
  id: string;
  name: string;
  template: any;
}

export interface NotificationSystem {
  email: boolean;
  sms: boolean;
  slack: boolean;
  webhook: boolean;
}

export interface AnalyticsReport {
  id: string;
  name: string;
  data: any;
}

export interface SchedulingInsight {
  id: string;
  type: string;
  message: string;
  impact: "high" | "medium" | "low";
}

export default AdvancedSchedulingSystem;