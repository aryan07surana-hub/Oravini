// Complete Client Journey Tracking System - Onboarding to First $10K

export interface ClientJourney {
  clientId: string;
  startDate: string;
  targetRevenue: number; // $10,000
  currentRevenue: number;
  daysToTarget: number;
  
  // Journey Stages
  stages: JourneyStage[];
  
  // All Interactions
  interactions: Interaction[];
  
  // Sales Team Activities
  salesActivities: SalesActivity[];
  
  // Funnel Performance
  funnelMetrics: FunnelMetrics[];
  
  // Webinar Analytics
  webinarData: WebinarAnalytics[];
  
  // Coaching & Sessions
  coachingSessions: CoachingSession[];
  
  // Revenue Milestones
  revenueMilestones: RevenueMilestone[];
  
  // Success Metrics
  successMetrics: SuccessMetrics;
}

// Journey Stages (Onboarding to $10K)
export interface JourneyStage {
  id: string;
  name: string;
  description: string;
  status: "pending" | "active" | "completed" | "blocked";
  startDate?: string;
  completedDate?: string;
  tasks: StageTask[];
  metrics: StageMetrics;
  blockers: string[];
}

export interface StageTask {
  id: string;
  title: string;
  description: string;
  owner: "client" | "sales_team" | "delivery_team" | "coach";
  status: "pending" | "in_progress" | "completed" | "blocked";
  dueDate: string;
  completedDate?: string;
  notes: string[];
  attachments: string[];
}

export interface StageMetrics {
  completionRate: number; // 0-100%
  timeSpent: number; // hours
  clientEngagement: number; // 1-10
  teamEfficiency: number; // 1-10
  issuesEncountered: number;
}

// All Interactions Tracking
export interface Interaction {
  id: string;
  timestamp: string;
  type: "call" | "email" | "meeting" | "task_update" | "funnel_activity" | "webinar" | "coaching" | "support";
  participants: string[];
  duration?: number; // minutes
  summary: string;
  outcome: string;
  nextActions: string[];
  recordingUrl?: string;
  transcriptUrl?: string;
  attachments: string[];
  tags: string[];
}

// Sales Team Activities
export interface SalesActivity {
  id: string;
  timestamp: string;
  teamMember: string;
  activityType: "prospecting" | "demo" | "follow_up" | "closing" | "onboarding" | "upsell";
  description: string;
  outcome: "positive" | "neutral" | "negative" | "no_response";
  nextSteps: string[];
  clientFeedback?: string;
  revenueImpact?: number;
  recordingUrl?: string;
}

// Funnel Performance Tracking
export interface FunnelMetrics {
  timestamp: string;
  funnelStage: "traffic" | "landing" | "optin" | "nurture" | "sales" | "close";
  visitors: number;
  conversions: number;
  conversionRate: number;
  revenue: number;
  cost: number;
  roi: number;
  sources: TrafficSource[];
  issues: string[];
  optimizations: string[];
}

export interface TrafficSource {
  source: string;
  visitors: number;
  conversions: number;
  cost: number;
  quality: number; // 1-10
}

// Webinar Analytics
export interface WebinarAnalytics {
  webinarId: string;
  title: string;
  date: string;
  duration: number; // minutes
  
  // Attendance Data
  registered: number;
  attended: number;
  showRate: number;
  
  // Engagement Metrics
  avgWatchTime: number;
  peakViewers: number;
  chatMessages: number;
  pollResponses: number;
  
  // Conversion Data
  offers: WebinarOffer[];
  
  // Client Specific
  clientAttended: boolean;
  clientWatchTime?: number;
  clientEngagement?: number; // 1-10
  clientFeedback?: string;
  
  recordingUrl: string;
  analyticsUrl: string;
}

export interface WebinarOffer {
  offerName: string;
  price: number;
  conversions: number;
  revenue: number;
  clientPurchased: boolean;
}

// Coaching Sessions
export interface CoachingSession {
  id: string;
  date: string;
  duration: number; // minutes
  coach: string;
  sessionType: "strategy" | "implementation" | "troubleshooting" | "mindset" | "review";
  
  // Session Content
  agenda: string[];
  topicsCovered: string[];
  actionItems: ActionItem[];
  
  // Client Progress
  clientPreparation: number; // 1-10
  clientEngagement: number; // 1-10
  progressMade: number; // 1-10
  
  // Outcomes
  breakthroughs: string[];
  challenges: string[];
  nextSessionFocus: string[];
  
  // Resources
  recordingUrl?: string;
  transcriptUrl?: string;
  worksheets: string[];
  homework: string[];
  
  // Metrics Impact
  revenueDiscussed: number;
  implementationRate: number; // 0-100%
}

export interface ActionItem {
  id: string;
  description: string;
  owner: "client" | "coach" | "team";
  dueDate: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "pending" | "in_progress" | "completed" | "blocked";
  completedDate?: string;
  notes: string[];
}

// Revenue Milestones
export interface RevenueMilestone {
  milestone: "$1K" | "$2.5K" | "$5K" | "$7.5K" | "$10K";
  targetDate: string;
  achievedDate?: string;
  daysToAchieve?: number;
  
  // What Led to Milestone
  keyActivities: string[];
  funnelPerformance: {
    stage: string;
    improvement: string;
    impact: number;
  }[];
  coachingImpact: string[];
  teamSupport: string[];
  
  // Celebration & Next Steps
  celebrationPlan: string;
  nextMilestoneTarget: string;
  scalingStrategy: string[];
}

// Success Metrics
export interface SuccessMetrics {
  // Revenue Metrics
  totalRevenue: number;
  monthlyRecurring: number;
  averageOrderValue: number;
  customerLifetimeValue: number;
  
  // Funnel Metrics
  totalTraffic: number;
  totalLeads: number;
  totalCustomers: number;
  overallConversionRate: number;
  
  // Engagement Metrics
  coachingSessionsAttended: number;
  webinarsAttended: number;
  taskCompletionRate: number;
  responseTime: number; // hours
  
  // Team Metrics
  salesTeamTouchpoints: number;
  supportTickets: number;
  issuesResolved: number;
  clientSatisfaction: number; // 1-10
  
  // Time Metrics
  daysToFirstSale: number;
  daysTo1K: number;
  daysTo5K: number;
  daysTo10K: number;
}

// Default Journey Stages (Onboarding to $10K)
export const defaultJourneyStages: JourneyStage[] = [
  {
    id: "onboarding",
    name: "Client Onboarding",
    description: "Complete intake, setup accounts, and align on strategy",
    status: "active",
    tasks: [
      {
        id: "intake-form",
        title: "Complete detailed intake form",
        description: "Capture business model, goals, current systems, and challenges",
        owner: "client",
        status: "pending",
        dueDate: "2024-01-15",
        notes: [],
        attachments: []
      },
      {
        id: "welcome-call",
        title: "Welcome & strategy alignment call",
        description: "60-min call to review intake and set expectations",
        owner: "sales_team",
        status: "pending", 
        dueDate: "2024-01-17",
        notes: [],
        attachments: []
      },
      {
        id: "account-setup",
        title: "Setup tracking and tools",
        description: "Configure analytics, CRM, and project management tools",
        owner: "delivery_team",
        status: "pending",
        dueDate: "2024-01-20",
        notes: [],
        attachments: []
      }
    ],
    metrics: {
      completionRate: 0,
      timeSpent: 0,
      clientEngagement: 0,
      teamEfficiency: 0,
      issuesEncountered: 0
    },
    blockers: []
  },
  {
    id: "foundation",
    name: "Foundation Building",
    description: "Create offer, messaging, and basic funnel structure",
    status: "pending",
    tasks: [
      {
        id: "offer-creation",
        title: "Define and package core offer",
        description: "Create compelling offer with clear value proposition",
        owner: "coach",
        status: "pending",
        dueDate: "2024-01-25",
        notes: [],
        attachments: []
      },
      {
        id: "messaging-framework",
        title: "Develop messaging framework",
        description: "Create hooks, headlines, and core messaging",
        owner: "delivery_team",
        status: "pending",
        dueDate: "2024-01-27",
        notes: [],
        attachments: []
      }
    ],
    metrics: {
      completionRate: 0,
      timeSpent: 0,
      clientEngagement: 0,
      teamEfficiency: 0,
      issuesEncountered: 0
    },
    blockers: []
  },
  {
    id: "funnel-build",
    name: "Funnel Construction",
    description: "Build and launch complete sales funnel",
    status: "pending",
    tasks: [
      {
        id: "landing-pages",
        title: "Create landing pages",
        description: "Build opt-in and sales pages with copy and design",
        owner: "delivery_team",
        status: "pending",
        dueDate: "2024-02-05",
        notes: [],
        attachments: []
      },
      {
        id: "email-sequences",
        title: "Write email sequences",
        description: "Create nurture and sales email sequences",
        owner: "delivery_team",
        status: "pending",
        dueDate: "2024-02-08",
        notes: [],
        attachments: []
      }
    ],
    metrics: {
      completionRate: 0,
      timeSpent: 0,
      clientEngagement: 0,
      teamEfficiency: 0,
      issuesEncountered: 0
    },
    blockers: []
  },
  {
    id: "traffic-launch",
    name: "Traffic & Launch",
    description: "Drive traffic and generate first sales",
    status: "pending",
    tasks: [
      {
        id: "content-strategy",
        title: "Launch content marketing",
        description: "Create and publish content to drive organic traffic",
        owner: "client",
        status: "pending",
        dueDate: "2024-02-12",
        notes: [],
        attachments: []
      },
      {
        id: "paid-ads",
        title: "Launch paid advertising",
        description: "Setup and optimize paid ad campaigns",
        owner: "delivery_team",
        status: "pending",
        dueDate: "2024-02-15",
        notes: [],
        attachments: []
      }
    ],
    metrics: {
      completionRate: 0,
      timeSpent: 0,
      clientEngagement: 0,
      teamEfficiency: 0,
      issuesEncountered: 0
    },
    blockers: []
  },
  {
    id: "optimize-scale",
    name: "Optimize & Scale",
    description: "Optimize performance and scale to $10K",
    status: "pending",
    tasks: [
      {
        id: "conversion-optimization",
        title: "Optimize conversion rates",
        description: "A/B test and improve funnel performance",
        owner: "delivery_team",
        status: "pending",
        dueDate: "2024-02-25",
        notes: [],
        attachments: []
      },
      {
        id: "scale-traffic",
        title: "Scale traffic sources",
        description: "Increase ad spend and expand traffic channels",
        owner: "coach",
        status: "pending",
        dueDate: "2024-03-01",
        notes: [],
        attachments: []
      }
    ],
    metrics: {
      completionRate: 0,
      timeSpent: 0,
      clientEngagement: 0,
      teamEfficiency: 0,
      issuesEncountered: 0
    },
    blockers: []
  }
];

// Factory Function
export function createClientJourney(clientId: string): ClientJourney {
  const today = new Date().toISOString();
  
  return {
    clientId,
    startDate: today,
    targetRevenue: 10000,
    currentRevenue: 0,
    daysToTarget: 90,
    
    stages: defaultJourneyStages,
    interactions: [],
    salesActivities: [],
    funnelMetrics: [],
    webinarData: [],
    coachingSessions: [],
    revenueMilestones: [
      {
        milestone: "$1K",
        targetDate: "2024-02-15",
        keyActivities: [],
        funnelPerformance: [],
        coachingImpact: [],
        teamSupport: [],
        celebrationPlan: "Send congratulations email and case study request",
        nextMilestoneTarget: "$2.5K by March 1st",
        scalingStrategy: []
      },
      {
        milestone: "$2.5K",
        targetDate: "2024-03-01",
        keyActivities: [],
        funnelPerformance: [],
        coachingImpact: [],
        teamSupport: [],
        celebrationPlan: "Schedule success call and testimonial recording",
        nextMilestoneTarget: "$5K by March 15th",
        scalingStrategy: []
      },
      {
        milestone: "$5K",
        targetDate: "2024-03-15",
        keyActivities: [],
        funnelPerformance: [],
        coachingImpact: [],
        teamSupport: [],
        celebrationPlan: "Feature in newsletter and social media",
        nextMilestoneTarget: "$10K by April 1st",
        scalingStrategy: []
      },
      {
        milestone: "$10K",
        targetDate: "2024-04-01",
        keyActivities: [],
        funnelPerformance: [],
        coachingImpact: [],
        teamSupport: [],
        celebrationPlan: "Success celebration call and graduation ceremony",
        nextMilestoneTarget: "Scale to $25K with advanced strategies",
        scalingStrategy: []
      }
    ],
    
    successMetrics: {
      totalRevenue: 0,
      monthlyRecurring: 0,
      averageOrderValue: 0,
      customerLifetimeValue: 0,
      totalTraffic: 0,
      totalLeads: 0,
      totalCustomers: 0,
      overallConversionRate: 0,
      coachingSessionsAttended: 0,
      webinarsAttended: 0,
      taskCompletionRate: 0,
      responseTime: 0,
      salesTeamTouchpoints: 0,
      supportTickets: 0,
      issuesResolved: 0,
      clientSatisfaction: 0,
      daysToFirstSale: 0,
      daysTo1K: 0,
      daysTo5K: 0,
      daysTo10K: 0
    }
  };
}

// Tracking Functions
export function recordInteraction(journey: ClientJourney, interaction: Omit<Interaction, 'id'>): ClientJourney {
  const newInteraction: Interaction = {
    ...interaction,
    id: `interaction-${Date.now()}`
  };
  
  return {
    ...journey,
    interactions: [...journey.interactions, newInteraction]
  };
}

export function recordSalesActivity(journey: ClientJourney, activity: Omit<SalesActivity, 'id'>): ClientJourney {
  const newActivity: SalesActivity = {
    ...activity,
    id: `sales-${Date.now()}`
  };
  
  return {
    ...journey,
    salesActivities: [...journey.salesActivities, newActivity],
    successMetrics: {
      ...journey.successMetrics,
      salesTeamTouchpoints: journey.successMetrics.salesTeamTouchpoints + 1
    }
  };
}

export function recordCoachingSession(journey: ClientJourney, session: Omit<CoachingSession, 'id'>): ClientJourney {
  const newSession: CoachingSession = {
    ...session,
    id: `coaching-${Date.now()}`
  };
  
  return {
    ...journey,
    coachingSessions: [...journey.coachingSessions, newSession],
    successMetrics: {
      ...journey.successMetrics,
      coachingSessionsAttended: journey.successMetrics.coachingSessionsAttended + 1
    }
  };
}

export function updateRevenue(journey: ClientJourney, newRevenue: number): ClientJourney {
  const updatedJourney = {
    ...journey,
    currentRevenue: newRevenue,
    successMetrics: {
      ...journey.successMetrics,
      totalRevenue: newRevenue
    }
  };
  
  // Check for milestone achievements
  const milestones = ["$1K", "$2.5K", "$5K", "$7.5K", "$10K"] as const;
  const milestoneValues = [1000, 2500, 5000, 7500, 10000];
  
  milestoneValues.forEach((value, index) => {
    if (newRevenue >= value) {
      const milestone = updatedJourney.revenueMilestones.find(m => m.milestone === milestones[index]);
      if (milestone && !milestone.achievedDate) {
        milestone.achievedDate = new Date().toISOString();
        milestone.daysToAchieve = Math.floor((new Date().getTime() - new Date(journey.startDate).getTime()) / (1000 * 60 * 60 * 24));
      }
    }
  });
  
  return updatedJourney;
}

export function getJourneyProgress(journey: ClientJourney): {
  overallProgress: number;
  stageProgress: { [stageId: string]: number };
  revenueProgress: number;
  timeProgress: number;
} {
  // Calculate stage progress
  const stageProgress: { [stageId: string]: number } = {};
  let totalStageProgress = 0;
  
  journey.stages.forEach(stage => {
    const completedTasks = stage.tasks.filter(task => task.status === 'completed').length;
    const progress = stage.tasks.length > 0 ? (completedTasks / stage.tasks.length) * 100 : 0;
    stageProgress[stage.id] = progress;
    totalStageProgress += progress;
  });
  
  const avgStageProgress = totalStageProgress / journey.stages.length;
  
  // Calculate revenue progress
  const revenueProgress = (journey.currentRevenue / journey.targetRevenue) * 100;
  
  // Calculate time progress
  const startDate = new Date(journey.startDate);
  const today = new Date();
  const daysElapsed = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const timeProgress = (daysElapsed / journey.daysToTarget) * 100;
  
  // Overall progress (weighted average)
  const overallProgress = (avgStageProgress * 0.4) + (revenueProgress * 0.6);
  
  return {
    overallProgress: Math.round(overallProgress),
    stageProgress,
    revenueProgress: Math.round(revenueProgress),
    timeProgress: Math.round(timeProgress)
  };
}