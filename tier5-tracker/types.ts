// TypeScript interfaces for Tier 5 Project Tracker

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  calendlyUrl?: string;
  priority: 'high' | 'medium' | 'low';
  description?: string;
  dueDate?: Date;
  assignee?: string;
  estimatedHours?: number;
  dependencies?: string[];
}

export interface Phase {
  id: number;
  title: string;
  description: string;
  status: 'completed' | 'current' | 'upcoming';
  tasks: Task[];
  calendlyUrl: string;
  startDate?: Date;
  endDate?: Date;
  milestones?: Milestone[];
  resources?: Resource[];
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  targetDate: Date;
  completed: boolean;
  phaseId: number;
}

export interface Resource {
  id: string;
  title: string;
  type: 'document' | 'video' | 'tool' | 'template';
  url: string;
  description?: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  company?: string;
  currentPhase: number;
  startDate: Date;
  targetRevenue: number;
  currentRevenue: number;
  consultant?: string;
  timezone?: string;
}

export interface CalendlyMeetingType {
  id: string;
  name: string;
  url: string;
  duration: number;
  description: string;
  phaseIds?: number[];
  taskTypes?: string[];
}

export interface ProgressMetrics {
  totalTasks: number;
  completedTasks: number;
  completionPercentage: number;
  currentPhase: number;
  phasesCompleted: number;
  estimatedCompletionDate?: Date;
  daysInCurrentPhase: number;
  averageTaskCompletionTime: number;
}

export interface TrackerSettings {
  autoAdvancePhases: boolean;
  sendReminders: boolean;
  reminderFrequency: 'daily' | 'weekly' | 'biweekly';
  allowPhaseSkipping: boolean;
  requireMilestoneApproval: boolean;
  defaultCalendlyUrls: {
    consultation: string;
    strategy: string;
    review: string;
    emergency: string;
  };
}

export interface TrackerEvent {
  id: string;
  type: 'task_completed' | 'phase_advanced' | 'meeting_scheduled' | 'milestone_reached';
  timestamp: Date;
  clientId: string;
  phaseId?: number;
  taskId?: string;
  description: string;
  metadata?: Record<string, any>;
}

// Component Props
export interface Tier5ProjectTrackerProps {
  client: Client;
  settings?: TrackerSettings;
  onTaskComplete?: (taskId: string) => void;
  onPhaseAdvance?: (phaseId: number) => void;
  onMeetingScheduled?: (meetingType: string, calendlyUrl: string) => void;
  onProgressUpdate?: (metrics: ProgressMetrics) => void;
}

export interface PhaseCardProps {
  phase: Phase;
  isActive: boolean;
  isCompleted: boolean;
  onClick: () => void;
}

export interface TaskCardProps {
  task: Task;
  onToggleComplete: (taskId: string) => void;
  onScheduleMeeting?: (calendlyUrl: string) => void;
}

export interface ProgressOverviewProps {
  metrics: ProgressMetrics;
  phases: Phase[];
}

export interface QuickActionsProps {
  calendlyUrls: TrackerSettings['defaultCalendlyUrls'];
  onActionClick: (actionType: string, url: string) => void;
}

// API Response Types
export interface TrackerApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

export interface ClientProgressResponse extends TrackerApiResponse {
  data?: {
    client: Client;
    phases: Phase[];
    metrics: ProgressMetrics;
    recentEvents: TrackerEvent[];
  };
}

export interface UpdateTaskResponse extends TrackerApiResponse {
  data?: {
    task: Task;
    updatedMetrics: ProgressMetrics;
  };
}

// Utility Types
export type PhaseStatus = Phase['status'];
export type TaskPriority = Task['priority'];
export type MeetingType = CalendlyMeetingType['name'];
export type EventType = TrackerEvent['type'];

// Constants
export const PHASE_TITLES = {
  1: 'Onboarding & Discovery',
  2: 'Foundation Building', 
  3: 'Market Launch',
  4: 'Growth & Optimization',
  5: 'Success & Sustainability'
} as const;

export const PRIORITY_COLORS = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-gray-100 text-gray-700'
} as const;

export const STATUS_COLORS = {
  completed: 'bg-green-500 text-white',
  current: 'bg-blue-500 text-white',
  upcoming: 'bg-gray-200 text-gray-500'
} as const;