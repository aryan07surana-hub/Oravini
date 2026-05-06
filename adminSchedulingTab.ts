import { AdminSection } from './completeAdminSection';
import { AdvancedSchedulingSystem, Booking, QualificationResult } from './schedulingSystem';
import { SchedulingUIFactory, SchedulingUI } from './schedulingUI';
import { AdminViewMode, AdminUIComponent } from './adminUIComponents';

// SCHEDULING TAB FOR ADMIN SECTION - Calendly Killer Integration
export interface AdminSchedulingTab {
  // Core Components
  bookingPages: BookingPageManager;
  calendar: CalendarManager;
  qualification: QualificationManager;
  analytics: SchedulingAnalyticsManager;
  automations: AutomationManager;
  
  // Integration
  clientIntegration: ClientSystemIntegration;
  teamManagement: TeamSchedulingManager;
  
  // Advanced Features
  aiInsights: AISchedulingInsights;
  competitorTracking: CompetitorAnalysis;
  revenueTracking: SchedulingRevenueTracker;
}

// Booking Page Manager
export interface BookingPageManager {
  pages: BookingPageConfig[];
  templates: BookingTemplate[];
  analytics: PageAnalytics;
}

export interface BookingPageConfig {
  id: string;
  name: string;
  url: string;
  type: "qualification" | "strategy" | "close" | "follow_up";
  status: "active" | "draft" | "archived";
  
  // Targeting
  targeting: {
    businessTypes: string[];
    revenueRange: { min: number; max: number; };
    geoLocation: string[];
    trafficSource: string[];
  };
  
  // Conversion Optimization
  optimization: {
    headline: string;
    benefits: string[];
    socialProof: SocialProofConfig;
    urgency: UrgencyConfig;
    pricing: PricingConfig;
  };
  
  // Performance
  performance: {
    views: number;
    bookings: number;
    conversionRate: number;
    qualificationRate: number;
    showRate: number;
    closeRate: number;
    revenue: number;
  };
}

export interface SocialProofConfig {
  testimonials: {
    enabled: boolean;
    count: number;
    filterByBusinessType: boolean;
    showResults: boolean;
  };
  caseStudies: {
    enabled: boolean;
    count: number;
    showROI: boolean;
  };
  stats: {
    clientCount: number;
    avgResults: string;
    successRate: number;
  };
}

export interface UrgencyConfig {
  timer: {
    enabled: boolean;
    duration: number; // hours
    message: string;
  };
  scarcity: {
    enabled: boolean;
    spotsLeft: number;
    message: string;
  };
  bonuses: {
    enabled: boolean;
    bonuses: LimitedTimeBonus[];
  };
}

export interface LimitedTimeBonus {
  name: string;
  value: string;
  expires: string;
  description: string;
}

export interface PricingConfig {
  showPricing: boolean;
  showROI: boolean;
  showPaymentPlans: boolean;
  tiers: PricingTier[];
}

export interface PricingTier {
  name: string;
  price: number;
  duration: string;
  features: string[];
  results: string[];
  qualificationRequired: number;
}

// Calendar Manager
export interface CalendarManager {
  teamAvailability: TeamAvailabilityManager;
  bookingRules: BookingRulesEngine;
  integrations: CalendarIntegrations;
}

export interface TeamAvailabilityManager {
  members: TeamMemberSchedule[];
  rules: AvailabilityRule[];
  overrides: ScheduleOverride[];
}

export interface TeamMemberSchedule {
  memberId: string;
  name: string;
  role: string;
  expertise: string[];
  timezone: string;
  
  // Availability
  schedule: WeeklyAvailability;
  capacity: {
    maxPerDay: number;
    maxPerWeek: number;
    bufferTime: number;
  };
  
  // Performance Metrics
  metrics: {
    bookingToShow: number;
    showToClose: number;
    avgDealSize: number;
    clientSatisfaction: number;
    responseTime: number; // minutes
  };
  
  // Preferences
  preferences: {
    meetingTypes: string[];
    clientTypes: string[];
    maxMeetingDuration: number;
    breaksBetweenMeetings: number;
  };
}

export interface WeeklyAvailability {
  [day: string]: DayAvailability;
}

export interface DayAvailability {
  available: boolean;
  timeSlots: TimeSlot[];
  breaks: TimeSlot[];
  meetingTypes: string[];
}

export interface TimeSlot {
  start: string;
  end: string;
  type?: string;
}

// Qualification Manager
export interface QualificationManager {
  forms: QualificationFormManager;
  scoring: ScoringEngine;
  workflows: QualificationWorkflowManager;
}

export interface QualificationFormManager {
  forms: QualificationFormConfig[];
  questions: QuestionLibrary;
  logic: FormLogicEngine;
}

export interface QualificationFormConfig {
  id: string;
  name: string;
  description: string;
  meetingType: string;
  
  // Form Structure
  steps: FormStepConfig[];
  
  // Qualification Logic
  scoring: ScoringConfig;
  disqualification: DisqualificationConfig;
  
  // Performance
  analytics: FormAnalytics;
}

export interface FormStepConfig {
  id: string;
  title: string;
  description: string;
  questions: string[]; // question IDs
  validation: StepValidationConfig;
  logic: StepLogicConfig[];
}

export interface ScoringConfig {
  algorithm: "weighted_sum" | "ai_model" | "decision_tree";
  weights: { [questionId: string]: number };
  thresholds: {
    tier5: number;
    tier4: number;
    tier3: number;
    tier2: number;
    tier1: number;
  };
  realTimeScoring: boolean;
}

export interface DisqualificationConfig {
  rules: DisqualificationRule[];
  redirectUrl: string;
  message: string;
  nurture: boolean;
}

export interface DisqualificationRule {
  condition: {
    questionId: string;
    operator: "equals" | "less_than" | "greater_than" | "contains";
    value: any;
  };
  reason: string;
  severity: "hard" | "soft";
}

// AI Scheduling Insights
export interface AISchedulingInsights {
  predictions: SchedulingPrediction[];
  optimizations: OptimizationSuggestion[];
  patterns: BehaviorPattern[];
}

export interface SchedulingPrediction {
  type: "booking_volume" | "conversion_rate" | "show_rate" | "close_rate";
  prediction: number;
  confidence: number;
  timeframe: string;
  factors: PredictionFactor[];
}

export interface PredictionFactor {
  factor: string;
  impact: number;
  description: string;
}

export interface OptimizationSuggestion {
  type: "form_optimization" | "calendar_optimization" | "team_optimization" | "pricing_optimization";
  suggestion: string;
  expectedImpact: number;
  effort: "low" | "medium" | "high";
  priority: "low" | "medium" | "high";
}

export interface BehaviorPattern {
  pattern: string;
  frequency: number;
  impact: string;
  recommendation: string;
}

// Competitor Analysis
export interface CompetitorAnalysis {
  competitors: CompetitorProfile[];
  analysis: CompetitiveAnalysis;
  alerts: CompetitorAlert[];
}

export interface CompetitorProfile {
  name: string;
  website: string;
  bookingUrl: string;
  services: string[];
  pricing: CompetitorPricing[];
  strengths: string[];
  weaknesses: string[];
}

export interface CompetitorPricing {
  service: string;
  price: number;
  duration: string;
  features: string[];
}

export interface CompetitiveAnalysis {
  positioning: string;
  advantages: string[];
  gaps: string[];
  opportunities: string[];
  threats: string[];
}

export interface CompetitorAlert {
  type: "pricing_change" | "new_service" | "marketing_campaign";
  competitor: string;
  description: string;
  impact: "high" | "medium" | "low";
  recommendation: string;
}

// Revenue Tracking
export interface SchedulingRevenueTracker {
  metrics: RevenueMetrics;
  attribution: RevenueAttribution;
  forecasting: RevenueForecast;
}

export interface RevenueMetrics {
  totalPipeline: number;
  closedRevenue: number;
  avgDealSize: number;
  timeToClose: number;
  
  // By Source
  byBookingPage: { [pageId: string]: RevenueData };
  byTeamMember: { [memberId: string]: RevenueData };
  byMeetingType: { [type: string]: RevenueData };
}

export interface RevenueData {
  bookings: number;
  pipeline: number;
  closed: number;
  conversionRate: number;
  avgDealSize: number;
}

export interface RevenueAttribution {
  firstTouch: AttributionData[];
  lastTouch: AttributionData[];
  multiTouch: AttributionData[];
}

export interface AttributionData {
  source: string;
  bookings: number;
  revenue: number;
  percentage: number;
}

// Main Admin Scheduling Tab Class
export class AdminSchedulingTab {
  private schedulingSystem: AdvancedSchedulingSystem;
  private uiFactory: SchedulingUIFactory;
  private adminSection: AdminSection;

  constructor(adminSection: AdminSection) {
    this.adminSection = adminSection;
    this.schedulingSystem = new AdvancedSchedulingSystem();
    this.uiFactory = new SchedulingUIFactory();
    this.initializeSchedulingTab();
  }

  /**
   * Initialize the scheduling tab with default configuration
   */
  private initializeSchedulingTab(): void {
    this.setupDefaultBookingPages();
    this.setupTeamAvailability();
    this.setupQualificationForms();
    this.setupAutomations();
  }

  /**
   * Get the complete scheduling tab UI for admin
   */
  getSchedulingTabUI(): AdminViewMode {
    return {
      id: "scheduling",
      name: "Scheduling Hub",
      description: "Advanced booking system - Better than Calendly",
      icon: "📅",
      components: [
        {
          id: "scheduling-overview",
          type: "metric_cards",
          title: "Scheduling Metrics",
          size: "full",
          position: { row: 1, col: 1 },
          config: {
            metrics: this.getSchedulingMetrics(),
            layout: "horizontal"
          }
        },
        {
          id: "booking-pages",
          type: "booking_pages_manager",
          title: "Booking Pages",
          size: "large",
          position: { row: 2, col: 1 },
          config: {
            showAnalytics: true,
            showEditor: true,
            showTemplates: true
          }
        },
        {
          id: "team-calendar",
          type: "team_calendar",
          title: "Team Calendar",
          size: "large",
          position: { row: 2, col: 2 },
          config: {
            view: "week",
            showAvailability: true,
            showBookings: true,
            showMetrics: true
          }
        },
        {
          id: "qualification-pipeline",
          type: "qualification_pipeline",
          title: "Qualification Pipeline",
          size: "medium",
          position: { row: 3, col: 1 },
          config: {
            showScoring: true,
            showWorkflows: true,
            realTimeUpdates: true
          }
        },
        {
          id: "ai-insights",
          type: "ai_insights_panel",
          title: "AI Insights & Optimization",
          size: "medium",
          position: { row: 3, col: 2 },
          config: {
            showPredictions: true,
            showOptimizations: true,
            showPatterns: true
          }
        },
        {
          id: "revenue-tracking",
          type: "revenue_tracker",
          title: "Revenue Attribution",
          size: "full",
          position: { row: 4, col: 1 },
          config: {
            showAttribution: true,
            showForecasting: true,
            showROI: true
          }
        }
      ]
    };
  }

  /**
   * Create a new booking page (Better than Calendly)
   */
  createBookingPage(config: {
    name: string;
    type: "qualification" | "strategy" | "close";
    template: string;
    targeting: any;
    optimization: any;
  }): BookingPageConfig {
    const pageId = `page-${Date.now()}`;
    
    // Create the booking page using the scheduling system
    const bookingPage = this.schedulingSystem.createBookingPage({
      name: config.name,
      meetingType: config.type,
      duration: config.type === "qualification" ? 45 : 60,
      qualificationFormId: "tier5-qualification",
      customization: {
        branding: {
          logo: "https://distinpro.com/logo.png",
          colors: { primary: "#3B82F6", secondary: "#10B981" }
        },
        content: {
          headline: config.optimization.headline || "Book Your Strategy Session",
          description: "Discover how to scale your business to $50K+/month",
          benefits: config.optimization.benefits || [
            "Get a custom growth strategy",
            "Identify your biggest bottlenecks", 
            "See exactly how to scale to $50K+/month"
          ],
          socialProof: config.optimization.socialProof || {
            testimonials: ["\"Went from $8K to $32K/month in 12 weeks!\""],
            caseStudies: ["SaaS company: 0 to $50K/month in 90 days"],
            clientLogos: ["client1.png", "client2.png"]
          }
        },
        pricing: config.optimization.pricing || {
          showInvestment: true,
          investmentRange: "$5K - $25K",
          roiCalculator: true
        }
      }
    });

    // Create the page configuration
    const pageConfig: BookingPageConfig = {
      id: pageId,
      name: config.name,
      url: `https://distinpro.com/book/${pageId}`,
      type: config.type,
      status: "active",
      targeting: config.targeting,
      optimization: config.optimization,
      performance: {
        views: 0,
        bookings: 0,
        conversionRate: 0,
        qualificationRate: 0,
        showRate: 0,
        closeRate: 0,
        revenue: 0
      }
    };

    return pageConfig;
  }

  /**
   * Process incoming booking and integrate with client system
   */
  async processBooking(bookingData: any): Promise<{
    success: boolean;
    booking?: Booking;
    clientId?: string;
    nextSteps: string[];
  }> {
    // Process through scheduling system
    const result = await this.schedulingSystem.processBooking(bookingData);
    
    if (result.qualified && result.booking) {
      // Create client in the main system
      const clientId = await this.createClientFromBooking(result.booking);
      
      // Set up automated follow-up sequence
      await this.setupFollowUpSequence(result.booking, clientId);
      
      // Notify team
      await this.notifyTeam(result.booking);
      
      return {
        success: true,
        booking: result.booking,
        clientId,
        nextSteps: [
          "Client created in system",
          "Follow-up sequence activated",
          "Team notified",
          "Calendar invite sent"
        ]
      };
    }

    return {
      success: false,
      nextSteps: ["Redirected to nurture sequence"]
    };
  }

  /**
   * Get scheduling analytics for admin dashboard
   */
  getSchedulingAnalytics(): any {
    return {
      overview: {
        totalBookings: 247,
        qualificationRate: 73,
        showRate: 87,
        closeRate: 34,
        avgDealSize: 15000,
        totalRevenue: 1250000
      },
      trends: {
        bookingsThisMonth: 89,
        bookingsLastMonth: 72,
        growthRate: 23.6
      },
      topPerformers: {
        bestBookingPage: { name: "Strategy Session", conversionRate: 12.5 },
        bestTeamMember: { name: "Sarah Johnson", closeRate: 42 },
        bestTimeSlot: { time: "2:00 PM EST", bookingRate: 18.3 }
      },
      insights: [
        "Tuesday 2 PM slots have highest show rates (94%)",
        "SaaS prospects convert 2.3x better than e-commerce",
        "Qualification scores above 80 have 67% close rate"
      ]
    };
  }

  /**
   * Get AI-powered optimization suggestions
   */
  getAIOptimizations(): OptimizationSuggestion[] {
    return [
      {
        type: "form_optimization",
        suggestion: "Add urgency question to qualification form",
        expectedImpact: 15,
        effort: "low",
        priority: "high"
      },
      {
        type: "calendar_optimization", 
        suggestion: "Block Friday afternoon slots (low show rate)",
        expectedImpact: 8,
        effort: "low",
        priority: "medium"
      },
      {
        type: "team_optimization",
        suggestion: "Route SaaS prospects to Sarah (highest close rate)",
        expectedImpact: 22,
        effort: "medium",
        priority: "high"
      }
    ];
  }

  // Private helper methods
  private setupDefaultBookingPages(): void {
    // Create default booking pages for different use cases
    const defaultPages = [
      {
        name: "Tier 5 Strategy Session",
        type: "qualification" as const,
        template: "high_ticket",
        targeting: {
          businessTypes: ["saas", "ecommerce", "agency"],
          revenueRange: { min: 5000, max: 100000 }
        },
        optimization: {
          headline: "Scale Your Business to $50K+/Month",
          benefits: [
            "Get a custom growth strategy",
            "Identify your biggest bottlenecks",
            "See exactly how to reach $50K+/month"
          ]
        }
      }
    ];

    defaultPages.forEach(page => {
      this.createBookingPage(page);
    });
  }

  private setupTeamAvailability(): void {
    // Configure team member availability
  }

  private setupQualificationForms(): void {
    // Setup qualification forms
  }

  private setupAutomations(): void {
    // Setup automated workflows
  }

  private async createClientFromBooking(booking: Booking): Promise<string> {
    // Create client in the main admin system
    const clientData = {
      name: booking.prospectInfo.name,
      email: booking.prospectInfo.email,
      phone: booking.prospectInfo.phone,
      businessType: booking.prospectInfo.businessType,
      currentRevenue: booking.prospectInfo.currentRevenue.toString(),
      goals: [`Reach $${booking.prospectInfo.targetRevenue}/month`],
      painPoints: booking.prospectInfo.painPoints,
      salesRep: booking.meetingDetails.assignedTo,
      coach: booking.meetingDetails.assignedTo
    };

    const journey = this.adminSection.addTier5Client(clientData);
    return journey.clientId;
  }

  private async setupFollowUpSequence(booking: Booking, clientId: string): Promise<void> {
    // Setup automated follow-up based on qualification score
    const sequence = booking.qualification.tier === "tier5" ? "high_value" : "standard";
    
    // Record initial interaction
    this.adminSection.updateClientProgress(clientId, {
      interaction: {
        timestamp: new Date().toISOString(),
        type: "booking",
        participants: [booking.meetingDetails.assignedTo],
        summary: `Initial ${booking.meetingDetails.type} booked`,
        outcome: `Qualification score: ${booking.qualification.overallScore}`,
        nextActions: ["Prepare for strategy session", "Send preparation materials"]
      }
    });
  }

  private async notifyTeam(booking: Booking): Promise<void> {
    // Send notifications to team about new qualified booking
    console.log(`🎉 New Tier 5 booking: ${booking.prospectInfo.name} - Score: ${booking.qualification.overallScore}`);
  }

  private getSchedulingMetrics(): any[] {
    const analytics = this.getSchedulingAnalytics();
    
    return [
      {
        id: "total_bookings",
        title: "Total Bookings",
        value: analytics.overview.totalBookings,
        change: { value: analytics.trends.growthRate, direction: "up", period: "vs last month" },
        status: "good",
        icon: "📅",
        color: "#3B82F6"
      },
      {
        id: "qualification_rate",
        title: "Qualification Rate", 
        value: `${analytics.overview.qualificationRate}%`,
        status: "good",
        icon: "✅",
        color: "#10B981"
      },
      {
        id: "show_rate",
        title: "Show Rate",
        value: `${analytics.overview.showRate}%`,
        status: "good",
        icon: "👥", 
        color: "#8B5CF6"
      },
      {
        id: "close_rate",
        title: "Close Rate",
        value: `${analytics.overview.closeRate}%`,
        status: "excellent",
        icon: "💰",
        color: "#F59E0B"
      }
    ];
  }
}

// Additional interfaces
export interface FormAnalytics {
  completionRate: number;
  dropoffPoints: { [stepId: string]: number };
  avgCompletionTime: number;
  qualificationRate: number;
}

export interface StepValidationConfig {
  required: string[];
  custom: any[];
}

export interface StepLogicConfig {
  condition: any;
  action: any;
}

export interface QuestionLibrary {
  questions: { [id: string]: any };
  categories: string[];
  tags: string[];
}

export interface FormLogicEngine {
  rules: any[];
  conditions: any[];
  actions: any[];
}

export interface ScoringEngine {
  models: any[];
  algorithms: any[];
  realTime: boolean;
}

export interface QualificationWorkflowManager {
  workflows: any[];
  triggers: any[];
  automations: any[];
}

export interface BookingRulesEngine {
  rules: any[];
  conditions: any[];
  actions: any[];
}

export interface CalendarIntegrations {
  google: boolean;
  outlook: boolean;
  apple: boolean;
  zoom: boolean;
}

export interface ScheduleOverride {
  memberId: string;
  date: string;
  type: "unavailable" | "limited";
  reason: string;
}

export interface AvailabilityRule {
  id: string;
  name: string;
  condition: any;
  action: any;
}

export interface AutomationManager {
  workflows: any[];
  triggers: any[];
  actions: any[];
}

export interface ClientSystemIntegration {
  syncEnabled: boolean;
  autoCreateClients: boolean;
  followUpSequences: any[];
}

export interface TeamSchedulingManager {
  members: any[];
  availability: any[];
  performance: any[];
}

export interface RevenueForecast {
  predictions: any[];
  scenarios: any[];
  confidence: number;
}

export interface BookingTemplate {
  id: string;
  name: string;
  description: string;
  config: any;
}

export interface PageAnalytics {
  views: number;
  conversions: number;
  revenue: number;
  sources: any[];
}

export default AdminSchedulingTab;