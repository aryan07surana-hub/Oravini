export interface DashboardSection {
  id: string;
  title: string;
  description: string;
  icon: string;
  priority: number;
  widgets: DashboardWidget[];
  permissions: string[];
}

export interface DashboardWidget {
  id: string;
  type: "metric" | "chart" | "table" | "kanban" | "calendar" | "checklist";
  title: string;
  size: "small" | "medium" | "large" | "full";
  dataSource: string;
  config: Record<string, any>;
  refreshInterval?: number;
}

export interface NotionLikeTemplate {
  id: string;
  name: string;
  description: string;
  sections: DashboardSection[];
  navigation: NavigationStructure;
  quickActions: QuickAction[];
  automations: UIAutomation[];
}

export interface NavigationStructure {
  primary: NavItem[];
  secondary: NavItem[];
  contextual: NavItem[];
}

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  badge?: string;
  children?: NavItem[];
}

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  action: string;
  shortcut?: string;
  context: string[];
}

export interface UIAutomation {
  id: string;
  trigger: string;
  action: string;
  description: string;
  enabled: boolean;
}

export const tier5NotionTemplate: NotionLikeTemplate = {
  id: "tier5-consulting-template",
  name: "Tier 5 Consulting Command Center",
  description: "Complete business management system for scaling consulting operations",
  sections: [
    {
      id: "executive-dashboard",
      title: "Executive Overview",
      description: "High-level metrics and KPIs",
      icon: "📊",
      priority: 1,
      widgets: [
        {
          id: "revenue-metric",
          type: "metric",
          title: "Monthly Revenue",
          size: "small",
          dataSource: "sales.monthlyRevenue",
          config: { format: "currency", target: 100000 }
        },
        {
          id: "client-count",
          type: "metric", 
          title: "Active Clients",
          size: "small",
          dataSource: "clients.active",
          config: { format: "number", target: 25 }
        },
        {
          id: "team-capacity",
          type: "chart",
          title: "Team Capacity",
          size: "medium",
          dataSource: "team.capacity",
          config: { type: "donut", showPercentage: true }
        },
        {
          id: "sales-funnel",
          type: "chart",
          title: "Sales Funnel",
          size: "large",
          dataSource: "sales.funnel",
          config: { type: "funnel", showConversion: true }
        }
      ],
      permissions: ["admin", "manager"]
    },
    {
      id: "sales-pipeline",
      title: "Sales Pipeline",
      description: "Lead management and conversion tracking",
      icon: "🎯",
      priority: 2,
      widgets: [
        {
          id: "pipeline-kanban",
          type: "kanban",
          title: "Deal Pipeline",
          size: "full",
          dataSource: "sales.pipeline",
          config: { 
            stages: ["Lead", "Qualified", "Proposal", "Negotiation", "Closed"],
            autoRefresh: 300
          }
        },
        {
          id: "conversion-metrics",
          type: "table",
          title: "Conversion Metrics",
          size: "medium",
          dataSource: "sales.conversions",
          config: { sortable: true, filterable: true }
        }
      ],
      permissions: ["admin", "manager", "sales"]
    },
    {
      id: "client-delivery",
      title: "Client Delivery",
      description: "Project tracking and client success",
      icon: "🚀",
      priority: 3,
      widgets: [
        {
          id: "project-status",
          type: "table",
          title: "Project Status",
          size: "large",
          dataSource: "projects.status",
          config: { 
            columns: ["client", "phase", "health", "nextAction", "dueDate"],
            statusColors: true
          }
        },
        {
          id: "client-health",
          type: "chart",
          title: "Client Health Score",
          size: "medium",
          dataSource: "clients.health",
          config: { type: "gauge", thresholds: [70, 85, 95] }
        }
      ],
      permissions: ["admin", "manager", "delivery"]
    },
    {
      id: "team-management",
      title: "Team Management", 
      description: "Team performance and scaling",
      icon: "👥",
      priority: 4,
      widgets: [
        {
          id: "team-performance",
          type: "table",
          title: "Team Performance",
          size: "large",
          dataSource: "team.performance",
          config: { 
            columns: ["member", "department", "kpis", "capacity", "projects"],
            performanceColors: true
          }
        },
        {
          id: "hiring-pipeline",
          type: "checklist",
          title: "Hiring Pipeline",
          size: "medium",
          dataSource: "team.hiring",
          config: { showProgress: true, groupBy: "department" }
        }
      ],
      permissions: ["admin", "manager"]
    },
    {
      id: "operations",
      title: "Operations Center",
      description: "Automation and system management",
      icon: "⚙️",
      priority: 5,
      widgets: [
        {
          id: "automation-status",
          type: "table",
          title: "Automation Status",
          size: "medium",
          dataSource: "operations.automations",
          config: { statusIndicators: true }
        },
        {
          id: "system-health",
          type: "metric",
          title: "System Health",
          size: "small",
          dataSource: "operations.health",
          config: { format: "percentage", threshold: 95 }
        }
      ],
      permissions: ["admin", "operations"]
    }
  ],
  navigation: {
    primary: [
      { id: "dashboard", label: "Dashboard", icon: "🏠", path: "/dashboard" },
      { id: "sales", label: "Sales", icon: "💰", path: "/sales", badge: "12" },
      { id: "clients", label: "Clients", icon: "👤", path: "/clients" },
      { id: "team", label: "Team", icon: "👥", path: "/team" },
      { id: "operations", label: "Operations", icon: "⚙️", path: "/operations" }
    ],
    secondary: [
      { id: "reports", label: "Reports", icon: "📈", path: "/reports" },
      { id: "settings", label: "Settings", icon: "⚙️", path: "/settings" },
      { id: "help", label: "Help", icon: "❓", path: "/help" }
    ],
    contextual: []
  },
  quickActions: [
    { id: "add-lead", label: "Add Lead", icon: "➕", action: "modal:addLead", shortcut: "Cmd+L", context: ["sales"] },
    { id: "create-project", label: "New Project", icon: "📁", action: "modal:createProject", shortcut: "Cmd+P", context: ["clients"] },
    { id: "schedule-call", label: "Schedule Call", icon: "📞", action: "modal:scheduleCall", context: ["sales", "clients"] },
    { id: "send-update", label: "Send Update", icon: "📧", action: "modal:sendUpdate", context: ["clients"] }
  ],
  automations: [
    {
      id: "auto-lead-assignment",
      trigger: "new_lead_created",
      action: "assign_to_available_rep",
      description: "Automatically assign new leads to available sales reps",
      enabled: true
    },
    {
      id: "project-health-alert",
      trigger: "project_health_low",
      action: "notify_manager_and_client",
      description: "Alert when project health drops below threshold",
      enabled: true
    },
    {
      id: "onboarding-reminder",
      trigger: "client_onboarding_stalled",
      action: "send_reminder_sequence",
      description: "Remind clients to complete onboarding steps",
      enabled: true
    }
  ]
};