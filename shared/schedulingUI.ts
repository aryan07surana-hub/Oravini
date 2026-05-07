import { AdvancedSchedulingSystem, BookingPage, Booking, QualificationResult } from './schedulingSystem';

// SCHEDULING UI COMPONENTS - Better than Calendly Interface
export interface SchedulingUI {
  bookingPages: BookingPageUI[];
  calendar: CalendarUI;
  qualification: QualificationUI;
  analytics: SchedulingAnalyticsUI;
  management: SchedulingManagementUI;
}

// Booking Page UI (Calendly-style but better)
export interface BookingPageUI {
  id: string;
  layout: BookingPageLayout;
  components: BookingComponent[];
  customization: BookingCustomization;
  preview: string;
}

export interface BookingPageLayout {
  type: "single_column" | "two_column" | "split_screen";
  sections: LayoutSection[];
}

export interface LayoutSection {
  id: string;
  type: "header" | "qualification" | "calendar" | "social_proof" | "pricing" | "footer";
  position: { row: number; col: number; };
  size: "small" | "medium" | "large" | "full";
  visible: boolean;
}

export interface BookingComponent {
  id: string;
  type: "hero_section" | "qualification_form" | "calendar_widget" | "testimonials" | "case_studies" | "pricing_calculator" | "roi_calculator" | "urgency_timer";
  config: any;
  styling: ComponentStyling;
}

export interface ComponentStyling {
  backgroundColor: string;
  textColor: string;
  borderRadius: number;
  padding: number;
  margin: number;
  animation?: "fade_in" | "slide_up" | "bounce";
}

// Hero Section Component
export interface HeroSection {
  headline: string;
  subheadline: string;
  benefits: string[];
  ctaText: string;
  backgroundImage?: string;
  video?: {
    url: string;
    thumbnail: string;
    autoplay: boolean;
  };
  socialProof: {
    clientCount: number;
    avgResults: string;
    testimonialSnippet: string;
  };
}

// Advanced Qualification Form UI
export interface QualificationUI {
  forms: QualificationFormUI[];
  realTimeScoring: boolean;
  progressIndicator: boolean;
}

export interface QualificationFormUI {
  id: string;
  title: string;
  description: string;
  steps: FormStep[];
  styling: FormStyling;
  logic: FormLogicUI[];
}

export interface FormStep {
  id: string;
  title: string;
  questions: QuestionUI[];
  validation: StepValidation;
  progressPercentage: number;
}

export interface QuestionUI {
  id: string;
  type: "text" | "select" | "multiselect" | "slider" | "revenue_slider" | "budget_selector" | "pain_scale" | "urgency_meter";
  question: string;
  placeholder?: string;
  helpText?: string;
  required: boolean;
  validation: QuestionValidation;
  styling: QuestionStyling;
  options?: QuestionOption[];
  conditionalLogic?: ConditionalLogic;
}

export interface QuestionOption {
  value: string;
  label: string;
  description?: string;
  icon?: string;
  recommended?: boolean;
  disqualifies?: boolean;
}

export interface RevenueSlider {
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  labels: { [value: number]: string };
  colors: { [range: string]: string };
  showROI: boolean;
}

export interface BudgetSelector {
  ranges: BudgetRange[];
  showROI: boolean;
  showPaymentOptions: boolean;
}

export interface BudgetRange {
  id: string;
  label: string;
  min: number;
  max: number;
  recommended?: boolean;
  popular?: boolean;
  description: string;
  paymentOptions: string[];
}

// Real-time Scoring Display
export interface ScoringDisplay {
  showScore: boolean;
  showTier: boolean;
  showRecommendations: boolean;
  animations: boolean;
  thresholds: {
    excellent: { color: string; message: string; };
    good: { color: string; message: string; };
    fair: { color: string; message: string; };
    poor: { color: string; message: string; };
  };
}

// Calendar Widget UI
export interface CalendarUI {
  widget: CalendarWidget;
  timeSlots: TimeSlotUI[];
  availability: AvailabilityDisplay;
}

export interface CalendarWidget {
  type: "monthly" | "weekly" | "list";
  theme: "light" | "dark" | "custom";
  showTimezone: boolean;
  showDuration: boolean;
  showTeamMember: boolean;
  bufferTime: number;
  maxAdvanceBooking: number; // days
  minAdvanceBooking: number; // hours
}

export interface TimeSlotUI {
  time: string;
  available: boolean;
  teamMember: string;
  meetingType: string;
  duration: number;
  price?: string;
  popularity?: "high" | "medium" | "low";
  urgency?: boolean; // "Only 2 spots left today"
}

// Social Proof Components
export interface SocialProofSection {
  testimonials: TestimonialCard[];
  caseStudies: CaseStudyCard[];
  clientLogos: ClientLogo[];
  stats: SocialProofStat[];
}

export interface TestimonialCard {
  id: string;
  name: string;
  title: string;
  company: string;
  photo: string;
  testimonial: string;
  results: string;
  businessType: string;
  revenueGrowth: string;
  video?: string;
}

export interface CaseStudyCard {
  id: string;
  clientName: string;
  industry: string;
  challenge: string;
  solution: string;
  results: {
    revenue: string;
    timeframe: string;
    metrics: { [key: string]: string };
  };
  thumbnail: string;
  fullCaseStudy?: string;
}

export interface SocialProofStat {
  label: string;
  value: string;
  icon: string;
  description: string;
}

// Pricing & ROI Calculator
export interface PricingSection {
  showPricing: boolean;
  pricingTiers: PricingTier[];
  roiCalculator: ROICalculator;
  paymentOptions: PaymentOption[];
}

export interface PricingTier {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: string; // "3 months", "6 months"
  features: string[];
  results: string[];
  popular?: boolean;
  recommended?: boolean;
  qualificationRequired: number; // minimum score
}

export interface ROICalculator {
  enabled: boolean;
  inputs: ROIInput[];
  formula: string;
  display: ROIDisplay;
}

export interface ROIInput {
  id: string;
  label: string;
  type: "number" | "percentage" | "currency";
  defaultValue: number;
  min: number;
  max: number;
}

export interface ROIDisplay {
  showMonthly: boolean;
  showAnnual: boolean;
  showBreakeven: boolean;
  showProjections: boolean;
  chartType: "bar" | "line" | "pie";
}

// Urgency & Scarcity Elements
export interface UrgencyElements {
  timer: UrgencyTimer;
  scarcity: ScarcityIndicator;
  bonuses: LimitedBonus[];
}

export interface UrgencyTimer {
  enabled: boolean;
  type: "countdown" | "limited_spots" | "price_increase";
  duration: number; // hours
  message: string;
  action: "hide_booking" | "increase_price" | "remove_bonus";
}

export interface ScarcityIndicator {
  type: "spots_left" | "applications_left" | "bonus_expires";
  count: number;
  message: string;
  updateFrequency: number; // minutes
}

// Analytics Dashboard UI
export interface SchedulingAnalyticsUI {
  dashboard: AnalyticsDashboard;
  reports: AnalyticsReport[];
  insights: AnalyticsInsight[];
}

export interface AnalyticsDashboard {
  metrics: MetricCard[];
  charts: AnalyticsChart[];
  tables: AnalyticsTable[];
  filters: AnalyticsFilter[];
}

export interface AnalyticsChart {
  id: string;
  type: "line" | "bar" | "pie" | "funnel" | "heatmap";
  title: string;
  data: any;
  timeRange: string;
  comparison: boolean;
}

export interface AnalyticsTable {
  id: string;
  title: string;
  columns: TableColumn[];
  data: any[];
  sortable: boolean;
  filterable: boolean;
}

// Management Interface
export interface SchedulingManagementUI {
  bookingsList: BookingsListUI;
  teamCalendar: TeamCalendarUI;
  qualificationReview: QualificationReviewUI;
  automations: AutomationUI;
}

export interface BookingsListUI {
  bookings: BookingRowUI[];
  filters: BookingFilter[];
  bulkActions: BulkAction[];
  views: ListView[];
}

export interface BookingRowUI {
  booking: Booking;
  actions: BookingAction[];
  status: BookingStatus;
  qualification: QualificationSummary;
}

export interface BookingAction {
  id: string;
  label: string;
  type: "reschedule" | "cancel" | "confirm" | "send_reminder" | "view_details";
  icon: string;
}

export interface QualificationSummary {
  score: number;
  tier: string;
  qualified: boolean;
  redFlags: string[];
  opportunities: string[];
}

// Main Scheduling UI Factory
export class SchedulingUIFactory {
  private schedulingSystem: AdvancedSchedulingSystem;

  constructor() {
    this.schedulingSystem = new AdvancedSchedulingSystem();
  }

  /**
   * Create a complete booking page (Better than Calendly)
   */
  createBookingPage(config: {
    name: string;
    meetingType: string;
    template: "qualification" | "strategy" | "close" | "custom";
    branding: {
      logo: string;
      primaryColor: string;
      secondaryColor: string;
    };
    content: {
      headline: string;
      benefits: string[];
      socialProof: boolean;
      pricing: boolean;
      urgency: boolean;
    };
  }): BookingPageUI {
    const pageId = `page-${Date.now()}`;

    // Create hero section
    const heroSection: HeroSection = {
      headline: config.content.headline,
      subheadline: "Book your strategy session and discover how to scale to $50K+/month",
      benefits: config.content.benefits,
      ctaText: "Book Your Strategy Session",
      socialProof: {
        clientCount: 247,
        avgResults: "3.2x revenue growth in 90 days",
        testimonialSnippet: "\"Went from $8K to $32K/month in just 12 weeks!\""
      }
    };

    // Create qualification form
    const qualificationForm: QualificationFormUI = {
      id: "tier5-qual",
      title: "Quick Qualification",
      description: "Help us prepare for your call (takes 2 minutes)",
      steps: [
        {
          id: "step1",
          title: "Business Overview",
          progressPercentage: 33,
          questions: [
            {
              id: "current_revenue",
              type: "revenue_slider",
              question: "What's your current monthly revenue?",
              required: true,
              validation: { min: 0, max: 100000 },
              styling: { theme: "modern", size: "large" },
              helpText: "Be honest - this helps us give you the best advice"
            },
            {
              id: "business_type",
              type: "select",
              question: "What type of business do you run?",
              required: true,
              options: [
                { value: "saas", label: "SaaS/Software", icon: "💻", recommended: true },
                { value: "ecommerce", label: "E-commerce", icon: "🛒", recommended: true },
                { value: "agency", label: "Agency/Services", icon: "🎯", recommended: true },
                { value: "coaching", label: "Coaching/Consulting", icon: "🎓" },
                { value: "other", label: "Other", icon: "📋" }
              ],
              styling: { theme: "cards", columns: 2 }
            }
          ],
          validation: { required: ["current_revenue", "business_type"] }
        },
        {
          id: "step2", 
          title: "Goals & Investment",
          progressPercentage: 66,
          questions: [
            {
              id: "target_revenue",
              type: "revenue_slider",
              question: "What's your revenue goal for the next 90 days?",
              required: true,
              validation: { min: 5000, max: 500000 },
              styling: { theme: "gradient", showROI: true }
            },
            {
              id: "budget",
              type: "budget_selector",
              question: "What's your budget for business growth investment?",
              required: true,
              options: [
                { value: "2k-5k", label: "$2K - $5K", description: "Getting started" },
                { value: "5k-10k", label: "$5K - $10K", description: "Serious growth", recommended: true },
                { value: "10k-25k", label: "$10K - $25K", description: "Aggressive scaling", popular: true },
                { value: "25k+", label: "$25K+", description: "Enterprise level" }
              ],
              styling: { theme: "pricing_cards", showROI: true }
            }
          ],
          validation: { required: ["target_revenue", "budget"] }
        },
        {
          id: "step3",
          title: "Urgency & Contact",
          progressPercentage: 100,
          questions: [
            {
              id: "urgency",
              type: "urgency_meter",
              question: "How urgent is solving this for your business?",
              required: true,
              styling: { theme: "thermometer", animated: true }
            },
            {
              id: "timeline",
              type: "select",
              question: "When do you want to start seeing results?",
              required: true,
              options: [
                { value: "asap", label: "ASAP - This is urgent!", recommended: true },
                { value: "30_days", label: "Within 30 days" },
                { value: "90_days", label: "Within 90 days" },
                { value: "no_rush", label: "No specific timeline", disqualifies: true }
              ]
            }
          ],
          validation: { required: ["urgency", "timeline"] }
        }
      ],
      styling: {
        theme: "modern",
        progressBar: true,
        stepIndicator: true,
        animations: true
      },
      logic: [
        {
          condition: { questionId: "current_revenue", operator: "less_than", value: 1000 },
          action: { type: "show_message", message: "We specialize in businesses already generating revenue. Check out our free resources!" }
        },
        {
          condition: { questionId: "budget", operator: "equals", value: "under_2k" },
          action: { type: "redirect", url: "/free-resources" }
        }
      ]
    };

    // Create calendar widget
    const calendarWidget: CalendarWidget = {
      type: "weekly",
      theme: "custom",
      showTimezone: true,
      showDuration: true,
      showTeamMember: true,
      bufferTime: 15,
      maxAdvanceBooking: 30,
      minAdvanceBooking: 2
    };

    return {
      id: pageId,
      layout: {
        type: "two_column",
        sections: [
          { id: "hero", type: "header", position: { row: 1, col: 1 }, size: "full", visible: true },
          { id: "qualification", type: "qualification", position: { row: 2, col: 1 }, size: "medium", visible: true },
          { id: "calendar", type: "calendar", position: { row: 2, col: 2 }, size: "medium", visible: true },
          { id: "social_proof", type: "social_proof", position: { row: 3, col: 1 }, size: "full", visible: config.content.socialProof },
          { id: "pricing", type: "pricing", position: { row: 4, col: 1 }, size: "full", visible: config.content.pricing }
        ]
      },
      components: [
        {
          id: "hero",
          type: "hero_section",
          config: heroSection,
          styling: {
            backgroundColor: config.branding.primaryColor,
            textColor: "#ffffff",
            borderRadius: 8,
            padding: 32,
            margin: 16
          }
        },
        {
          id: "qualification_form",
          type: "qualification_form",
          config: qualificationForm,
          styling: {
            backgroundColor: "#ffffff",
            textColor: "#333333",
            borderRadius: 12,
            padding: 24,
            margin: 16,
            animation: "fade_in"
          }
        },
        {
          id: "calendar_widget",
          type: "calendar_widget",
          config: calendarWidget,
          styling: {
            backgroundColor: "#ffffff",
            textColor: "#333333",
            borderRadius: 12,
            padding: 24,
            margin: 16
          }
        }
      ],
      customization: {
        branding: config.branding,
        seo: {
          title: `Book ${config.meetingType} - ${config.name}`,
          description: "Book your strategy session and scale your business to $50K+/month",
          keywords: ["business growth", "scaling", "strategy session"]
        },
        tracking: {
          googleAnalytics: true,
          facebookPixel: true,
          customEvents: true
        }
      },
      preview: `https://distinpro.com/book/${pageId}/preview`
    };
  }

  /**
   * Create analytics dashboard for scheduling
   */
  createAnalyticsDashboard(): SchedulingAnalyticsUI {
    return {
      dashboard: {
        metrics: [
          {
            id: "total_bookings",
            title: "Total Bookings",
            value: "247",
            change: { value: 23, direction: "up", period: "vs last month" },
            status: "good",
            icon: "📅",
            color: "#10B981"
          },
          {
            id: "qualification_rate",
            title: "Qualification Rate",
            value: "73%",
            change: { value: 8, direction: "up", period: "vs last month" },
            status: "good", 
            icon: "✅",
            color: "#3B82F6"
          },
          {
            id: "show_rate",
            title: "Show Rate",
            value: "87%",
            change: { value: 5, direction: "up", period: "vs last month" },
            status: "good",
            icon: "👥",
            color: "#8B5CF6"
          },
          {
            id: "close_rate",
            title: "Close Rate",
            value: "34%",
            change: { value: 12, direction: "up", period: "vs last month" },
            status: "excellent",
            icon: "💰",
            color: "#F59E0B"
          }
        ],
        charts: [
          {
            id: "booking_trends",
            type: "line",
            title: "Booking Trends",
            data: {}, // Would contain actual chart data
            timeRange: "30_days",
            comparison: true
          },
          {
            id: "qualification_funnel",
            type: "funnel",
            title: "Qualification Funnel",
            data: {},
            timeRange: "30_days",
            comparison: false
          }
        ],
        tables: [
          {
            id: "recent_bookings",
            title: "Recent Bookings",
            columns: [
              { id: "name", label: "Name", sortable: true },
              { id: "score", label: "Score", sortable: true },
              { id: "tier", label: "Tier", sortable: true },
              { id: "scheduled", label: "Scheduled", sortable: true },
              { id: "status", label: "Status", sortable: false }
            ],
            data: [],
            sortable: true,
            filterable: true
          }
        ],
        filters: [
          { id: "date_range", type: "date_range", label: "Date Range" },
          { id: "booking_type", type: "select", label: "Booking Type" },
          { id: "team_member", type: "select", label: "Team Member" }
        ]
      },
      reports: [],
      insights: []
    };
  }

  /**
   * Create booking management interface
   */
  createBookingManagement(): SchedulingManagementUI {
    return {
      bookingsList: {
        bookings: [], // Would be populated with actual bookings
        filters: [
          { id: "status", type: "select", options: ["confirmed", "pending", "cancelled", "completed"] },
          { id: "qualification", type: "range", min: 0, max: 100 },
          { id: "date", type: "date_range" }
        ],
        bulkActions: [
          { id: "send_reminder", label: "Send Reminder", icon: "📧" },
          { id: "reschedule", label: "Reschedule", icon: "📅" },
          { id: "cancel", label: "Cancel", icon: "❌" }
        ],
        views: [
          { id: "all", label: "All Bookings", filter: {} },
          { id: "today", label: "Today", filter: { date: "today" } },
          { id: "qualified", label: "Qualified", filter: { qualified: true } },
          { id: "high_value", label: "High Value", filter: { score: { min: 80 } } }
        ]
      },
      teamCalendar: {
        view: "week",
        members: [],
        bookings: [],
        availability: []
      },
      qualificationReview: {
        pendingReview: [],
        autoApproved: [],
        rejected: []
      },
      automations: {
        workflows: [],
        triggers: [],
        actions: []
      }
    };
  }
}

// Additional interfaces for completeness
export interface FormStyling {
  theme: "modern" | "classic" | "minimal";
  progressBar: boolean;
  stepIndicator: boolean;
  animations: boolean;
}

export interface FormLogicUI {
  condition: any;
  action: any;
}

export interface StepValidation {
  required: string[];
  custom?: any;
}

export interface QuestionValidation {
  min?: number;
  max?: number;
  pattern?: string;
  custom?: any;
}

export interface QuestionStyling {
  theme: "modern" | "cards" | "minimal";
  size: "small" | "medium" | "large";
  columns?: number;
  showROI?: boolean;
  animated?: boolean;
}

export interface ConditionalLogic {
  showIf?: any;
  hideIf?: any;
  requireIf?: any;
}

export interface AvailabilityDisplay {
  showTeamPhotos: boolean;
  showExpertise: boolean;
  showRatings: boolean;
  groupByMember: boolean;
}

export interface ClientLogo {
  name: string;
  logo: string;
  industry: string;
}

export interface PaymentOption {
  id: string;
  name: string;
  description: string;
  terms: string;
}

export interface LimitedBonus {
  id: string;
  name: string;
  value: string;
  expires: string;
  description: string;
}

export interface AnalyticsReport {
  id: string;
  name: string;
  description: string;
  data: any;
}

export interface AnalyticsInsight {
  id: string;
  type: string;
  message: string;
  impact: "high" | "medium" | "low";
}

export interface MetricCard {
  id: string;
  title: string;
  value: string;
  change?: {
    value: number;
    direction: "up" | "down";
    period: string;
  };
  status: "good" | "warning" | "critical";
  icon: string;
  color: string;
}

export interface TableColumn {
  id: string;
  label: string;
  sortable: boolean;
}

export interface BookingFilter {
  id: string;
  type: "select" | "range" | "date_range";
  options?: string[];
  min?: number;
  max?: number;
}

export interface BulkAction {
  id: string;
  label: string;
  icon: string;
}

export interface ListView {
  id: string;
  label: string;
  filter: any;
}

export interface BookingStatus {
  status: string;
  color: string;
  icon: string;
}

export interface TeamCalendarUI {
  view: "day" | "week" | "month";
  members: any[];
  bookings: any[];
  availability: any[];
}

export interface QualificationReviewUI {
  pendingReview: any[];
  autoApproved: any[];
  rejected: any[];
}

export interface AutomationUI {
  workflows: any[];
  triggers: any[];
  actions: any[];
}

export interface AnalyticsFilter {
  id: string;
  type: string;
  label: string;
}

export interface BookingCustomization {
  branding: any;
  seo: any;
  tracking: any;
}

export default SchedulingUIFactory;