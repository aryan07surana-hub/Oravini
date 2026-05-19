// TypeScript interfaces for Client Partnership Tracker

export type Owner = 'us' | 'you' | 'both';
export type TaskStatus = 'completed' | 'in-progress' | 'upcoming' | 'blocked';
export type PhaseStatus = 'completed' | 'active' | 'locked';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  owner: Owner;
  timeline: string;
  calendlyType?: string;
  dependencies?: string[];
}

export interface Phase {
  id: number;
  title: string;
  subtitle: string;
  timeline: string;
  status: PhaseStatus;
  tasks: Task[];
  color: string;
}

export interface QuickAction {
  label: string;
  calendlyUrl: string;
  color: string;
  description: string;
}

export interface KPI {
  label: string;
  value: string;
  target?: string;
  current?: string;
}

export interface ClientInfo {
  id: string;
  name: string;
  email: string;
  company?: string;
  startDate: Date;
  currentPhase: number;
  timezone?: string;
}

export interface FunnelModel {
  type: 'vsl' | 'webinar' | 'application' | 'challenge';
  pricePoint: string;
  audienceTemperature: 'cold' | 'warm' | 'hot';
}

export interface SalesTeamConfig {
  structure: 'provided' | 'trained' | 'hybrid';
  setterCount: number;
  closerCount: number;
  targetBookingRate: string;
  targetCloseRate: string;
  speedToContact: string;
}

export interface ContentStrategy {
  pillars: string[];
  platforms: ('instagram' | 'youtube' | 'tiktok')[];
  postingFrequency: string;
  calendarDelivered: boolean;
}

// Calendly meeting types
export interface CalendlyConfig {
  kickoff: string;
  strategy: string;
  review: string;
  emergency: string;
  webinarReview: string;
  launchPrep: string;
  general: string;
}

// Progress tracking
export interface ProgressMetrics {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  completionPercentage: number;
  currentPhase: number;
  estimatedFirstRevenue: string;
  daysElapsed: number;
}

// Constants
export const PHASE_NAMES = {
  0: 'First 48 Hours',
  1: 'Foundation',
  2: 'Build & Launch',
  3: 'Scale & Optimise',
} as const;

export const OWNER_DISPLAY = {
  us: { label: 'We Handle', color: '#10b981' },
  you: { label: 'You Handle', color: '#f59e0b' },
  both: { label: 'Together', color: '#6366f1' },
} as const;

export const CORE_DELIVERABLES = [
  'Market & Offer Foundation',
  'Funnel Architecture',
  'Landing Pages & Copy',
  'Tech Stack & Integrations',
  'Automation Systems',
  'Webinar Funnel',
  'Sales Team Setup',
  'Instagram Growth',
  'YouTube Strategy',
  'Tracking & Analytics',
  'Course / Product Build',
  'Community Infrastructure',
  'QA & Go-Live',
] as const;
