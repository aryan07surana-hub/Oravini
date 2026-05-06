import { SimplifiedProjectTracker, DashboardView, QuickAction } from './simplifiedProjectTracker';

// Simplified Navigation
export interface NavItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  badge?: number;
}

export interface NotionTemplate {
  id: string;
  name: string;
  navigation: NavItem[];
  views: DashboardView[];
  quickActions: QuickAction[];
  widgets: Widget[];
}

export interface Widget {
  id: string;
  title: string;
  type: "metric" | "chart" | "list" | "kanban";
  size: "small" | "medium" | "large";
  data: any;
}

// Main Consulting Business Template
export const consultingTemplate: NotionTemplate = {
  id: "consulting-dashboard",
  name: "Consulting Business Dashboard",
  
  navigation: [
    { id: "dashboard", label: "Dashboard", icon: "🏠", path: "/dashboard" },
    { id: "projects", label: "Projects", icon: "📁", path: "/projects", badge: 5 },
    { id: "sales", label: "Sales", icon: "💰", path: "/sales", badge: 12 },
    { id: "clients", label: "Clients", icon: "👤", path: "/clients" },
    { id: "team", label: "Team", icon: "👥", path: "/team" },
    { id: "reports", label: "Reports", icon: "📊", path: "/reports" }
  ],
  
  views: [
    {
      id: "executive",
      name: "Executive View",
      sections: [
        { id: "revenue", title: "Revenue", type: "metrics", data: {} },
        { id: "projects", title: "Active Projects", type: "metrics", data: {} },
        { id: "team-health", title: "Team Health", type: "metrics", data: {} },
        { id: "sales-pipeline", title: "Sales Pipeline", type: "funnel", data: {} }
      ]
    },
    {
      id: "manager",
      name: "Manager View", 
      sections: [
        { id: "project-status", title: "Project Status", type: "tasks", data: {} },
        { id: "team-capacity", title: "Team Capacity", type: "team", data: {} },
        { id: "client-health", title: "Client Health", type: "metrics", data: {} },
        { id: "blockers", title: "Blockers", type: "tasks", data: {} }
      ]
    },
    {
      id: "client",
      name: "Client Portal",
      sections: [
        { id: "progress", title: "Your Progress", type: "metrics", data: {} },
        { id: "tasks", title: "Your Tasks", type: "tasks", data: {} },
        { id: "timeline", title: "Timeline", type: "timeline", data: {} },
        { id: "results", title: "Results", type: "metrics", data: {} }
      ]
    }
  ],
  
  quickActions: [
    { id: "new-project", label: "New Project", action: "create_project", icon: "➕" },
    { id: "add-client", label: "Add Client", action: "add_client", icon: "👤" },
    { id: "schedule-call", label: "Schedule Call", action: "schedule_call", icon: "📞" },
    { id: "send-update", label: "Send Update", action: "send_update", icon: "📧" },
    { id: "view-reports", label: "View Reports", action: "view_reports", icon: "📈" }
  ],
  
  widgets: [
    {
      id: "monthly-revenue",
      title: "Monthly Revenue",
      type: "metric",
      size: "small",
      data: { value: "$85,000", target: "$100,000", trend: "up" }
    },
    {
      id: "active-projects",
      title: "Active Projects", 
      type: "metric",
      size: "small",
      data: { value: 12, target: 15, trend: "stable" }
    },
    {
      id: "client-satisfaction",
      title: "Client Satisfaction",
      type: "metric", 
      size: "small",
      data: { value: "8.7/10", target: "9.0/10", trend: "up" }
    },
    {
      id: "team-utilization",
      title: "Team Utilization",
      type: "chart",
      size: "medium",
      data: { type: "donut", value: 82, target: 85 }
    },
    {
      id: "sales-funnel",
      title: "Sales Funnel",
      type: "chart",
      size: "large", 
      data: {
        stages: [
          { name: "Leads", count: 45, conversion: 100 },
          { name: "Qualified", count: 18, conversion: 40 },
          { name: "Proposals", count: 8, conversion: 44 },
          { name: "Closed", count: 3, conversion: 38 }
        ]
      }
    },
    {
      id: "recent-tasks",
      title: "Recent Tasks",
      type: "list",
      size: "medium",
      data: {
        items: [
          { title: "Complete client onboarding", status: "pending", owner: "Sarah" },
          { title: "Review funnel performance", status: "in_progress", owner: "Mike" },
          { title: "Send weekly report", status: "completed", owner: "Lisa" }
        ]
      }
    },
    {
      id: "project-kanban",
      title: "Project Pipeline",
      type: "kanban",
      size: "large",
      data: {
        columns: [
          { name: "Onboarding", tasks: 3 },
          { name: "Strategy", tasks: 2 },
          { name: "Build", tasks: 4 },
          { name: "Launch", tasks: 2 },
          { name: "Optimize", tasks: 1 }
        ]
      }
    }
  ]
};

// Role-based Dashboard Configurations
export const roleConfigs = {
  admin: {
    widgets: ["monthly-revenue", "active-projects", "client-satisfaction", "team-utilization", "sales-funnel", "project-kanban"],
    quickActions: ["new-project", "add-client", "view-reports", "schedule-call"],
    navigation: ["dashboard", "projects", "sales", "clients", "team", "reports"]
  },
  
  manager: {
    widgets: ["active-projects", "team-utilization", "recent-tasks", "project-kanban", "client-satisfaction"],
    quickActions: ["new-project", "schedule-call", "send-update"],
    navigation: ["dashboard", "projects", "clients", "team"]
  },
  
  client: {
    widgets: ["progress", "tasks", "timeline", "results"],
    quickActions: ["schedule-call", "send-message"],
    navigation: ["dashboard", "progress", "tasks", "results"]
  },
  
  team: {
    widgets: ["recent-tasks", "project-kanban", "team-utilization"],
    quickActions: ["update-task", "schedule-call"],
    navigation: ["dashboard", "projects", "tasks"]
  }
};

// Simplified Automation System
export interface SimpleAutomation {
  id: string;
  name: string;
  trigger: string;
  action: string;
  enabled: boolean;
}

export const businessAutomations: SimpleAutomation[] = [
  {
    id: "new-lead",
    name: "New Lead Assignment",
    trigger: "Lead captured from website",
    action: "Assign to available sales rep + send welcome email",
    enabled: true
  },
  {
    id: "project-kickoff",
    name: "Project Kickoff",
    trigger: "Client signs contract",
    action: "Create project tracker + schedule kickoff call",
    enabled: true
  },
  {
    id: "task-overdue",
    name: "Task Overdue Alert",
    trigger: "Task is 1 day overdue",
    action: "Notify manager + send client reminder",
    enabled: true
  },
  {
    id: "project-complete",
    name: "Project Completion",
    trigger: "All tasks completed",
    action: "Send satisfaction survey + schedule review call",
    enabled: true
  },
  {
    id: "weekly-report",
    name: "Weekly Reports",
    trigger: "Every Friday 5 PM",
    action: "Generate and send weekly progress reports",
    enabled: true
  }
];

// KPI Tracking (Simplified)
export interface SimpleKPI {
  id: string;
  name: string;
  current: number;
  target: number;
  unit: string;
  trend: "up" | "down" | "stable";
  status: "good" | "warning" | "critical";
}

export const businessKPIs: SimpleKPI[] = [
  {
    id: "monthly-revenue",
    name: "Monthly Revenue",
    current: 85000,
    target: 100000,
    unit: "$",
    trend: "up",
    status: "warning"
  },
  {
    id: "client-satisfaction",
    name: "Client Satisfaction",
    current: 8.7,
    target: 9.0,
    unit: "/10",
    trend: "up", 
    status: "good"
  },
  {
    id: "project-delivery",
    name: "On-Time Delivery",
    current: 92,
    target: 95,
    unit: "%",
    trend: "stable",
    status: "good"
  },
  {
    id: "sales-conversion",
    name: "Sales Conversion",
    current: 22,
    target: 30,
    unit: "%",
    trend: "down",
    status: "critical"
  },
  {
    id: "team-utilization",
    name: "Team Utilization",
    current: 82,
    target: 85,
    unit: "%",
    trend: "stable",
    status: "good"
  }
];

// Integration Points (Simplified)
export interface Integration {
  id: string;
  name: string;
  type: string;
  status: "connected" | "disconnected" | "error";
  lastSync: string;
}

export const integrations: Integration[] = [
  { id: "hubspot", name: "HubSpot CRM", type: "CRM", status: "connected", lastSync: "2024-01-10 14:30" },
  { id: "calendly", name: "Calendly", type: "Scheduling", status: "connected", lastSync: "2024-01-10 14:25" },
  { id: "stripe", name: "Stripe", type: "Payments", status: "connected", lastSync: "2024-01-10 14:20" },
  { id: "slack", name: "Slack", type: "Communication", status: "connected", lastSync: "2024-01-10 14:35" },
  { id: "gmail", name: "Gmail", type: "Email", status: "disconnected", lastSync: "2024-01-09 16:00" }
];

// Factory function to create dashboard for specific role
export function createRoleDashboard(role: keyof typeof roleConfigs): NotionTemplate {
  const config = roleConfigs[role];
  
  return {
    ...consultingTemplate,
    widgets: consultingTemplate.widgets.filter(w => config.widgets.includes(w.id)),
    quickActions: consultingTemplate.quickActions.filter(qa => config.quickActions.includes(qa.id)),
    navigation: consultingTemplate.navigation.filter(nav => config.navigation.includes(nav.id))
  };
}

// Utility function to get dashboard data
export function getDashboardData(projects: SimplifiedProjectTracker[]) {
  const totalProjects = projects.length;
  const activeProjects = projects.filter(p => p.overallStatus === "active").length;
  const avgCompletion = projects.reduce((sum, p) => sum + p.completion, 0) / totalProjects;
  const criticalProjects = projects.filter(p => p.health === "critical").length;
  
  return {
    totalProjects,
    activeProjects,
    avgCompletion: Math.round(avgCompletion),
    criticalProjects,
    totalTasks: projects.reduce((sum, p) => sum + p.metrics.totalTasks, 0),
    completedTasks: projects.reduce((sum, p) => sum + p.metrics.tasksCompleted, 0)
  };
}