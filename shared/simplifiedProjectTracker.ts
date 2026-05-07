// Simplified Types
export type Status = "pending" | "active" | "completed" | "blocked";
export type Priority = "low" | "medium" | "high" | "critical";
export type Owner = "client" | "team" | "manager" | "admin";
export type Health = "good" | "warning" | "critical";

// Core Interfaces
export interface Task {
  id: string;
  title: string;
  owner: Owner;
  status: Status;
  priority: Priority;
  dueDate: string;
  notes?: string;
}

export interface Phase {
  id: string;
  name: string;
  description: string;
  status: Status;
  tasks: Task[];
  deliverable?: string;
}

export interface ClientData {
  id: string;
  name: string;
  email: string;
  revenue: string;
  goals: string[];
  painPoints: string[];
}

export interface SalesFunnel {
  stage: string;
  count: number;
  conversion: number;
  status: Health;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  capacity: number; // percentage
  projects: string[];
}

// Main Project Tracker
export interface SimplifiedProjectTracker {
  // Basic Info
  id: string;
  clientData: ClientData;
  projectName: string;
  startDate: string;
  targetDate: string;
  
  // Status & Health
  overallStatus: Status;
  health: Health;
  completion: number; // percentage
  
  // Core Components
  phases: Phase[];
  salesFunnel: SalesFunnel[];
  team: TeamMember[];
  
  // Quick Actions
  nextActions: Task[];
  blockers: Task[];
  clientTasks: Task[];
  
  // Metrics
  metrics: {
    tasksCompleted: number;
    totalTasks: number;
    daysRemaining: number;
    clientSatisfaction: number;
  };
  
  // Communication
  lastUpdate: string;
  nextMeeting: string;
  
  updatedAt: string;
}

// Default Phases for Tier 5
export const defaultPhases: Phase[] = [
  {
    id: "onboarding",
    name: "Onboarding",
    description: "Get client setup and aligned",
    status: "active",
    deliverable: "Strategy Brief",
    tasks: [
      {
        id: "intake",
        title: "Complete intake form",
        owner: "client",
        status: "pending",
        priority: "critical",
        dueDate: "2024-01-15"
      },
      {
        id: "kickoff",
        title: "Kickoff strategy call",
        owner: "manager",
        status: "pending", 
        priority: "high",
        dueDate: "2024-01-17"
      }
    ]
  },
  {
    id: "strategy",
    name: "Strategy & Planning",
    description: "Define offer and funnel strategy",
    status: "pending",
    deliverable: "Funnel Blueprint",
    tasks: [
      {
        id: "offer",
        title: "Refine offer positioning",
        owner: "manager",
        status: "pending",
        priority: "high",
        dueDate: "2024-01-22"
      },
      {
        id: "funnel-map",
        title: "Create funnel map",
        owner: "team",
        status: "pending",
        priority: "medium",
        dueDate: "2024-01-25"
      }
    ]
  },
  {
    id: "build",
    name: "Asset Creation",
    description: "Build pages, emails, and content",
    status: "pending",
    deliverable: "Complete Funnel",
    tasks: [
      {
        id: "landing-page",
        title: "Build landing pages",
        owner: "team",
        status: "pending",
        priority: "high",
        dueDate: "2024-02-01"
      },
      {
        id: "email-sequence",
        title: "Write email sequence",
        owner: "team",
        status: "pending",
        priority: "medium",
        dueDate: "2024-02-05"
      }
    ]
  },
  {
    id: "launch",
    name: "Launch & Traffic",
    description: "Go live and drive traffic",
    status: "pending",
    deliverable: "Live System",
    tasks: [
      {
        id: "content-pipeline",
        title: "Setup content pipeline",
        owner: "manager",
        status: "pending",
        priority: "medium",
        dueDate: "2024-02-10"
      },
      {
        id: "ads-setup",
        title: "Launch ad campaigns",
        owner: "team",
        status: "pending",
        priority: "high",
        dueDate: "2024-02-12"
      }
    ]
  },
  {
    id: "optimize",
    name: "Optimize & Scale",
    description: "Improve performance and scale",
    status: "pending",
    deliverable: "Optimization Report",
    tasks: [
      {
        id: "performance-review",
        title: "Analyze performance data",
        owner: "manager",
        status: "pending",
        priority: "medium",
        dueDate: "2024-02-20"
      },
      {
        id: "scale-plan",
        title: "Create scaling roadmap",
        owner: "admin",
        status: "pending",
        priority: "high",
        dueDate: "2024-02-25"
      }
    ]
  }
];

// Default Sales Funnel Stages
export const defaultSalesFunnel: SalesFunnel[] = [
  { stage: "Leads", count: 100, conversion: 100, status: "good" },
  { stage: "Qualified", count: 35, conversion: 35, status: "good" },
  { stage: "Booked", count: 18, conversion: 51, status: "warning" },
  { stage: "Showed", count: 14, conversion: 78, status: "good" },
  { stage: "Closed", count: 4, conversion: 29, status: "critical" }
];

// Default Team Structure
export const defaultTeam: TeamMember[] = [
  { id: "manager", name: "Success Manager", role: "Project Manager", capacity: 80, projects: [] },
  { id: "strategist", name: "Strategist", role: "Strategy Lead", capacity: 75, projects: [] },
  { id: "designer", name: "Designer", role: "Creative Lead", capacity: 90, projects: [] },
  { id: "developer", name: "Developer", role: "Tech Lead", capacity: 85, projects: [] }
];

// Simplified Dashboard Views
export interface DashboardView {
  id: string;
  name: string;
  sections: DashboardSection[];
}

export interface DashboardSection {
  id: string;
  title: string;
  type: "metrics" | "tasks" | "funnel" | "team" | "timeline";
  data: any;
}

export const dashboardViews: DashboardView[] = [
  {
    id: "overview",
    name: "Overview",
    sections: [
      { id: "health", title: "Project Health", type: "metrics", data: {} },
      { id: "next-actions", title: "Next Actions", type: "tasks", data: {} },
      { id: "funnel", title: "Sales Funnel", type: "funnel", data: {} }
    ]
  },
  {
    id: "client",
    name: "Client View", 
    sections: [
      { id: "progress", title: "Progress", type: "metrics", data: {} },
      { id: "your-tasks", title: "Your Tasks", type: "tasks", data: {} },
      { id: "timeline", title: "Timeline", type: "timeline", data: {} }
    ]
  },
  {
    id: "team",
    name: "Team View",
    sections: [
      { id: "capacity", title: "Team Capacity", type: "team", data: {} },
      { id: "all-tasks", title: "All Tasks", type: "tasks", data: {} },
      { id: "blockers", title: "Blockers", type: "tasks", data: {} }
    ]
  }
];

// Quick Actions
export interface QuickAction {
  id: string;
  label: string;
  action: string;
  icon: string;
}

export const quickActions: QuickAction[] = [
  { id: "add-task", label: "Add Task", action: "create_task", icon: "+" },
  { id: "update-status", label: "Update Status", action: "update_status", icon: "✓" },
  { id: "schedule-meeting", label: "Schedule Meeting", action: "schedule_meeting", icon: "📅" },
  { id: "send-update", label: "Send Update", action: "send_update", icon: "📧" },
  { id: "view-funnel", label: "View Funnel", action: "view_funnel", icon: "📊" }
];

// Automation Rules (Simplified)
export interface AutomationRule {
  id: string;
  name: string;
  trigger: string;
  action: string;
  enabled: boolean;
}

export const automationRules: AutomationRule[] = [
  {
    id: "task-complete",
    name: "Task Completion",
    trigger: "task_completed",
    action: "notify_next_owner",
    enabled: true
  },
  {
    id: "deadline-alert",
    name: "Deadline Alert",
    trigger: "task_due_tomorrow",
    action: "send_reminder",
    enabled: true
  },
  {
    id: "client-response",
    name: "Client Response",
    trigger: "client_task_overdue",
    action: "escalate_to_manager",
    enabled: true
  }
];

// Factory Function
export function createSimplifiedTracker(clientData: ClientData): SimplifiedProjectTracker {
  const today = new Date().toISOString().split('T')[0];
  const targetDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  return {
    id: `project-${clientData.id}`,
    clientData,
    projectName: `${clientData.name} Growth System`,
    startDate: today,
    targetDate,
    
    overallStatus: "active",
    health: "good",
    completion: 0,
    
    phases: defaultPhases,
    salesFunnel: defaultSalesFunnel,
    team: defaultTeam,
    
    nextActions: [],
    blockers: [],
    clientTasks: [],
    
    metrics: {
      tasksCompleted: 0,
      totalTasks: defaultPhases.reduce((sum, phase) => sum + phase.tasks.length, 0),
      daysRemaining: 60,
      clientSatisfaction: 8.5
    },
    
    lastUpdate: today,
    nextMeeting: "",
    updatedAt: today
  };
}

// Utility Functions
export function getProjectHealth(tracker: SimplifiedProjectTracker): Health {
  const { completion, metrics } = tracker;
  const daysUsed = 60 - metrics.daysRemaining;
  const expectedCompletion = (daysUsed / 60) * 100;
  
  if (completion >= expectedCompletion * 0.9) return "good";
  if (completion >= expectedCompletion * 0.7) return "warning";
  return "critical";
}

export function getNextActions(tracker: SimplifiedProjectTracker): Task[] {
  return tracker.phases
    .flatMap(phase => phase.tasks)
    .filter(task => task.status === "pending")
    .sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    })
    .slice(0, 5);
}

export function getClientTasks(tracker: SimplifiedProjectTracker): Task[] {
  return tracker.phases
    .flatMap(phase => phase.tasks)
    .filter(task => task.owner === "client" && task.status !== "completed");
}

export function getBlockers(tracker: SimplifiedProjectTracker): Task[] {
  return tracker.phases
    .flatMap(phase => phase.tasks)
    .filter(task => task.status === "blocked");
}

export function updateTaskStatus(tracker: SimplifiedProjectTracker, taskId: string, status: Status): SimplifiedProjectTracker {
  const updatedPhases = tracker.phases.map(phase => ({
    ...phase,
    tasks: phase.tasks.map(task => 
      task.id === taskId ? { ...task, status } : task
    )
  }));
  
  const completedTasks = updatedPhases
    .flatMap(phase => phase.tasks)
    .filter(task => task.status === "completed").length;
  
  return {
    ...tracker,
    phases: updatedPhases,
    completion: Math.round((completedTasks / tracker.metrics.totalTasks) * 100),
    metrics: {
      ...tracker.metrics,
      tasksCompleted: completedTasks
    },
    health: getProjectHealth({
      ...tracker,
      completion: Math.round((completedTasks / tracker.metrics.totalTasks) * 100)
    }),
    updatedAt: new Date().toISOString().split('T')[0]
  };
}