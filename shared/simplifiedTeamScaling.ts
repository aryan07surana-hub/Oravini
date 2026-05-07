// Simplified Team Management System

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  department: "sales" | "delivery" | "operations" | "support";
  level: "junior" | "mid" | "senior" | "lead";
  capacity: number; // 0-100%
  skills: string[];
  currentProjects: string[];
  performance: number; // 1-10
  salary: number;
  startDate: string;
}

export interface Department {
  name: string;
  head: string;
  members: TeamMember[];
  budget: number;
  targets: {
    revenue?: number;
    clients?: number;
    satisfaction?: number;
  };
  performance: {
    current: number;
    target: number;
    trend: "up" | "down" | "stable";
  };
}

export interface HiringPlan {
  role: string;
  department: "sales" | "delivery" | "operations" | "support";
  level: "junior" | "mid" | "senior" | "lead";
  priority: "low" | "medium" | "high" | "critical";
  timeline: string; // "30 days", "60 days", etc.
  budget: number;
  reason: string;
  skills: string[];
}

export interface TeamStructure {
  departments: Department[];
  hiringPlan: HiringPlan[];
  totalBudget: number;
  totalCapacity: number;
  growthTargets: {
    teamSize: number;
    timeline: string;
    revenue: number;
  };
}

// Default Team Structure for Consulting Business
export const defaultTeamStructure: TeamStructure = {
  departments: [
    {
      name: "Sales",
      head: "sales-manager",
      members: [
        {
          id: "sales-manager",
          name: "Sarah Johnson",
          role: "Sales Manager",
          department: "sales",
          level: "senior",
          capacity: 85,
          skills: ["Sales", "Strategy", "Client Relations"],
          currentProjects: ["lead-gen", "client-calls"],
          performance: 9,
          salary: 80000,
          startDate: "2023-01-15"
        },
        {
          id: "sales-rep-1",
          name: "Mike Chen",
          role: "Sales Rep",
          department: "sales", 
          level: "mid",
          capacity: 90,
          skills: ["Cold Outreach", "Demo Calls", "Closing"],
          currentProjects: ["outbound-campaign"],
          performance: 8,
          salary: 60000,
          startDate: "2023-06-01"
        }
      ],
      budget: 200000,
      targets: {
        revenue: 100000,
        clients: 15
      },
      performance: {
        current: 85000,
        target: 100000,
        trend: "up"
      }
    },
    {
      name: "Delivery",
      head: "delivery-manager",
      members: [
        {
          id: "delivery-manager",
          name: "Alex Rodriguez",
          role: "Delivery Manager",
          department: "delivery",
          level: "senior",
          capacity: 80,
          skills: ["Project Management", "Strategy", "Client Success"],
          currentProjects: ["client-a", "client-b", "client-c"],
          performance: 9,
          salary: 85000,
          startDate: "2022-08-01"
        },
        {
          id: "strategist-1",
          name: "Emma Wilson",
          role: "Strategist",
          department: "delivery",
          level: "mid",
          capacity: 95,
          skills: ["Funnel Strategy", "Copywriting", "Analytics"],
          currentProjects: ["client-d", "client-e"],
          performance: 8,
          salary: 70000,
          startDate: "2023-03-15"
        }
      ],
      budget: 250000,
      targets: {
        clients: 20,
        satisfaction: 9.0
      },
      performance: {
        current: 8.7,
        target: 9.0,
        trend: "up"
      }
    },
    {
      name: "Operations",
      head: "ops-manager",
      members: [
        {
          id: "ops-manager",
          name: "David Kim",
          role: "Operations Manager",
          department: "operations",
          level: "senior",
          capacity: 75,
          skills: ["Systems", "Automation", "Process Design"],
          currentProjects: ["crm-setup", "automation-flows"],
          performance: 9,
          salary: 75000,
          startDate: "2022-11-01"
        }
      ],
      budget: 150000,
      targets: {
        satisfaction: 8.5
      },
      performance: {
        current: 8.2,
        target: 8.5,
        trend: "stable"
      }
    },
    {
      name: "Support",
      head: "support-lead",
      members: [
        {
          id: "support-lead",
          name: "Lisa Park",
          role: "Support Lead",
          department: "support",
          level: "mid",
          capacity: 85,
          skills: ["Customer Support", "Documentation", "Training"],
          currentProjects: ["client-support", "knowledge-base"],
          performance: 8,
          salary: 55000,
          startDate: "2023-04-01"
        }
      ],
      budget: 100000,
      targets: {
        satisfaction: 9.2
      },
      performance: {
        current: 9.0,
        target: 9.2,
        trend: "stable"
      }
    }
  ],
  
  hiringPlan: [
    {
      role: "Senior Sales Rep",
      department: "sales",
      level: "senior",
      priority: "high",
      timeline: "30 days",
      budget: 75000,
      reason: "Need to handle increased lead volume",
      skills: ["Enterprise Sales", "Consultative Selling", "CRM Management"]
    },
    {
      role: "Delivery Specialist",
      department: "delivery",
      level: "mid",
      priority: "medium",
      timeline: "60 days", 
      budget: 65000,
      reason: "Support growing client base",
      skills: ["Project Management", "Client Communication", "Funnel Building"]
    },
    {
      role: "Automation Specialist",
      department: "operations",
      level: "mid",
      priority: "medium",
      timeline: "90 days",
      budget: 70000,
      reason: "Scale operations and reduce manual work",
      skills: ["Zapier", "API Integration", "Workflow Design"]
    }
  ],
  
  totalBudget: 700000,
  totalCapacity: 83,
  
  growthTargets: {
    teamSize: 12,
    timeline: "6 months",
    revenue: 150000
  }
};

// Team Performance Metrics
export interface TeamMetrics {
  totalMembers: number;
  avgPerformance: number;
  avgCapacity: number;
  departmentBreakdown: {
    [key: string]: {
      members: number;
      avgPerformance: number;
      capacity: number;
    };
  };
  hiringNeeds: number;
  budgetUtilization: number;
}

// Utility Functions
export function calculateTeamMetrics(structure: TeamStructure): TeamMetrics {
  const allMembers = structure.departments.flatMap(dept => dept.members);
  
  const departmentBreakdown = structure.departments.reduce((acc, dept) => {
    acc[dept.name] = {
      members: dept.members.length,
      avgPerformance: dept.members.reduce((sum, m) => sum + m.performance, 0) / dept.members.length,
      capacity: dept.members.reduce((sum, m) => sum + m.capacity, 0) / dept.members.length
    };
    return acc;
  }, {} as any);
  
  return {
    totalMembers: allMembers.length,
    avgPerformance: allMembers.reduce((sum, m) => sum + m.performance, 0) / allMembers.length,
    avgCapacity: allMembers.reduce((sum, m) => sum + m.capacity, 0) / allMembers.length,
    departmentBreakdown,
    hiringNeeds: structure.hiringPlan.length,
    budgetUtilization: (structure.departments.reduce((sum, d) => sum + d.budget, 0) / structure.totalBudget) * 100
  };
}

export function getCapacityAlerts(structure: TeamStructure): string[] {
  const alerts: string[] = [];
  
  structure.departments.forEach(dept => {
    const avgCapacity = dept.members.reduce((sum, m) => sum + m.capacity, 0) / dept.members.length;
    
    if (avgCapacity > 90) {
      alerts.push(`${dept.name} department is at ${avgCapacity}% capacity - consider hiring`);
    }
    
    dept.members.forEach(member => {
      if (member.capacity > 95) {
        alerts.push(`${member.name} is at ${member.capacity}% capacity - risk of burnout`);
      }
    });
  });
  
  return alerts;
}

export function getPerformanceInsights(structure: TeamStructure): string[] {
  const insights: string[] = [];
  
  structure.departments.forEach(dept => {
    const lowPerformers = dept.members.filter(m => m.performance < 7);
    const highPerformers = dept.members.filter(m => m.performance >= 9);
    
    if (lowPerformers.length > 0) {
      insights.push(`${dept.name} has ${lowPerformers.length} members needing performance support`);
    }
    
    if (highPerformers.length > 0) {
      insights.push(`${dept.name} has ${highPerformers.length} high performers - consider promotion/retention`);
    }
  });
  
  return insights;
}

export function prioritizeHiring(hiringPlan: HiringPlan[]): HiringPlan[] {
  const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
  
  return hiringPlan.sort((a, b) => {
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
    if (priorityDiff !== 0) return priorityDiff;
    
    // If same priority, sort by timeline (shorter first)
    const timelineA = parseInt(a.timeline);
    const timelineB = parseInt(b.timeline);
    return timelineA - timelineB;
  });
}

// Role Templates for Quick Hiring
export const roleTemplates = {
  "Sales Rep": {
    skills: ["Cold Outreach", "Demo Calls", "CRM Management", "Closing"],
    salary: { junior: 45000, mid: 60000, senior: 80000 },
    description: "Generate leads and close deals"
  },
  "Delivery Manager": {
    skills: ["Project Management", "Client Success", "Strategy", "Team Leadership"],
    salary: { junior: 55000, mid: 70000, senior: 90000 },
    description: "Manage client projects and ensure successful delivery"
  },
  "Strategist": {
    skills: ["Funnel Strategy", "Copywriting", "Analytics", "Marketing"],
    salary: { junior: 50000, mid: 65000, senior: 85000 },
    description: "Develop and implement growth strategies for clients"
  },
  "Operations Specialist": {
    skills: ["Process Design", "Automation", "Systems", "Documentation"],
    salary: { junior: 45000, mid: 60000, senior: 75000 },
    description: "Optimize operations and implement systems"
  }
};

export function createHiringPlan(role: string, department: Department["name"], priority: HiringPlan["priority"], timeline: string): HiringPlan {
  const template = roleTemplates[role as keyof typeof roleTemplates];
  
  return {
    role,
    department: department as any,
    level: "mid",
    priority,
    timeline,
    budget: template?.salary.mid || 60000,
    reason: `Expand ${department} capacity`,
    skills: template?.skills || []
  };
}