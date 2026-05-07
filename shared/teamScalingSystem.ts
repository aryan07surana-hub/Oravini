export type TeamLevel = "junior" | "mid" | "senior" | "lead" | "manager";
export type TeamDepartment = "sales" | "delivery" | "content" | "operations" | "support";

export interface TeamMemberProfile {
  id: string;
  name: string;
  role: TeamRole;
  department: TeamDepartment;
  level: TeamLevel;
  focus: string;
  skills: string[];
  capacity: number; // percentage
  currentProjects: string[];
  performanceScore: number; // 0-100
  trainingNeeds: string[];
  careerGoals: string[];
  managerId?: string;
}

export interface TeamStructure {
  departments: {
    [key in TeamDepartment]: {
      head: string;
      members: TeamMemberProfile[];
      capacity: number;
      targets: Record<string, number>;
      kpis: Record<string, number>;
    }
  };
  hierarchy: {
    [managerId: string]: string[]; // manager -> direct reports
  };
  scalingPlan: {
    nextHires: {
      role: string;
      department: TeamDepartment;
      priority: "critical" | "high" | "medium" | "low";
      timeline: string;
      budget: number;
    }[];
    promotionPipeline: {
      memberId: string;
      currentLevel: TeamLevel;
      targetLevel: TeamLevel;
      requirements: string[];
      timeline: string;
    }[];
  };
}

export interface SalesTeamMetrics {
  teamSize: number;
  avgDealsPerRep: number;
  avgDealSize: number;
  avgSalesCycle: number; // days
  teamQuota: number;
  teamAttainment: number; // percentage
  topPerformer: {
    id: string;
    name: string;
    metrics: Record<string, number>;
  };
  improvementAreas: string[];
  trainingPriorities: string[];
}

export const defaultTeamStructure: TeamStructure = {
  departments: {
    sales: {
      head: "sales-manager-1",
      members: [],
      capacity: 80,
      targets: {
        monthlyRevenue: 100000,
        newClients: 15,
        callsBooked: 60
      },
      kpis: {
        showRate: 75,
        closeRate: 25,
        avgDealSize: 6500
      }
    },
    delivery: {
      head: "delivery-manager-1", 
      members: [],
      capacity: 85,
      targets: {
        clientSatisfaction: 9.0,
        projectsDelivered: 20,
        onTimeDelivery: 95
      },
      kpis: {
        clientRetention: 90,
        upsellRate: 30,
        avgProjectDuration: 60
      }
    },
    content: {
      head: "content-manager-1",
      members: [],
      capacity: 75,
      targets: {
        contentPieces: 100,
        campaignsLaunched: 8,
        leadGenerated: 500
      },
      kpis: {
        contentQuality: 8.5,
        engagementRate: 4.2,
        conversionRate: 2.8
      }
    },
    operations: {
      head: "ops-manager-1",
      members: [],
      capacity: 90,
      targets: {
        processEfficiency: 95,
        automationRate: 80,
        errorRate: 2
      },
      kpis: {
        systemUptime: 99.5,
        responseTime: 2,
        clientOnboardingTime: 7
      }
    },
    support: {
      head: "support-manager-1",
      members: [],
      capacity: 85,
      targets: {
        ticketResolution: 24,
        clientSatisfaction: 9.2,
        firstResponseTime: 2
      },
      kpis: {
        resolutionRate: 95,
        escalationRate: 5,
        knowledgeBaseUsage: 70
      }
    }
  },
  hierarchy: {},
  scalingPlan: {
    nextHires: [
      {
        role: "Senior Sales Rep",
        department: "sales",
        priority: "high",
        timeline: "30 days",
        budget: 80000
      },
      {
        role: "Content Strategist",
        department: "content", 
        priority: "medium",
        timeline: "60 days",
        budget: 65000
      }
    ],
    promotionPipeline: []
  }
};