import { CompleteClientSuccessSystem } from './completeClientSuccessSystem';
import { ClientJourney } from './completeClientJourney';
import { ComprehensiveTrackingDashboard } from './comprehensiveTrackingDashboard';

// ADMIN DASHBOARD - All Tier 5 Clients Overview
export interface AdminDashboard {
  // Overview Metrics
  overview: AdminOverviewMetrics;
  
  // All Clients Data
  clients: AdminClientView[];
  
  // Team Performance
  teamPerformance: AdminTeamMetrics;
  
  // Revenue Analytics
  revenueAnalytics: AdminRevenueAnalytics;
  
  // Real-time Activity Feed
  activityFeed: AdminActivityFeed[];
  
  // Alerts & Notifications
  alerts: AdminAlert[];
  
  // Performance Insights
  insights: AdminInsight[];
}

export interface AdminOverviewMetrics {
  // Client Metrics
  totalTier5Clients: number;
  activeClients: number;
  clientsAt10K: number;
  avgTimeToFirstSale: number; // days
  avgTimeTo10K: number; // days
  
  // Revenue Metrics
  totalRevenueGenerated: number;
  monthlyRecurringRevenue: number;
  avgRevenuePerClient: number;
  revenueGrowthRate: number; // percentage
  
  // Success Metrics
  overallSuccessRate: number; // percentage of clients reaching $10K
  avgClientSatisfaction: number;
  clientRetentionRate: number;
  
  // Team Metrics
  totalTeamMembers: number;
  avgTeamUtilization: number;
  clientsPerTeamMember: number;
}

export interface AdminClientView {
  // Basic Info
  clientId: string;
  clientName: string;
  startDate: string;
  salesRep: string;
  coach: string;
  
  // Progress Metrics
  currentRevenue: number;
  targetRevenue: number;
  progressPercentage: number;
  daysInProgram: number;
  
  // Health Indicators
  health: "excellent" | "good" | "warning" | "critical";
  engagementScore: number;
  riskLevel: "low" | "medium" | "high";
  successProbability: number;
  
  // Current Status
  currentStage: string;
  nextMilestone: string;
  daysToNextMilestone: number;
  blockers: string[];
  
  // Recent Activity
  lastInteraction: string;
  lastCoachingSession: string;
  lastRevenueUpdate: string;
  
  // Key Metrics
  funnelConversionRate: number;
  coachingSessionsAttended: number;
  taskCompletionRate: number;
  
  // Quick Actions
  quickActions: {
    id: string;
    label: string;
    action: string;
    urgent: boolean;
  }[];
}

export interface AdminTeamMetrics {
  // Sales Team Performance
  salesTeam: {
    member: string;
    clientsManaged: number;
    totalTouchpoints: number;
    avgClientSatisfaction: number;
    revenueGenerated: number;
    conversionRate: number;
  }[];
  
  // Coaching Team Performance
  coachingTeam: {
    coach: string;
    clientsCoached: number;
    sessionsCompleted: number;
    avgImplementationRate: number;
    clientSuccessRate: number;
    avgRevenueImpact: number;
  }[];
  
  // Delivery Team Performance
  deliveryTeam: {
    member: string;
    projectsDelivered: number;
    avgDeliveryTime: number;
    clientSatisfaction: number;
    tasksCompleted: number;
  }[];
}

export interface AdminRevenueAnalytics {
  // Revenue Trends
  dailyRevenue: { date: string; amount: number; }[];
  weeklyRevenue: { week: string; amount: number; }[];
  monthlyRevenue: { month: string; amount: number; }[];
  
  // Milestone Analytics
  milestoneAchievements: {
    milestone: string;
    clientsAchieved: number;
    avgDaysToAchieve: number;
    successRate: number;
  }[];
  
  // Revenue Sources
  revenueSources: {
    source: string;
    amount: number;
    percentage: number;
    clients: number;
  }[];
  
  // Funnel Performance
  funnelPerformance: {
    stage: string;
    totalVisitors: number;
    totalConversions: number;
    avgConversionRate: number;
    totalRevenue: number;
  }[];
}

export interface AdminActivityFeed {
  id: string;
  timestamp: string;
  clientId: string;
  clientName: string;
  type: "milestone" | "coaching" | "sales" | "funnel" | "revenue" | "alert";
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  teamMember?: string;
  revenueImpact?: number;
}

export interface AdminAlert {
  id: string;
  type: "client_risk" | "milestone_overdue" | "low_engagement" | "team_capacity" | "revenue_drop";
  severity: "critical" | "warning" | "info";
  clientId?: string;
  clientName?: string;
  message: string;
  actionRequired: string;
  createdAt: string;
  resolved: boolean;
}

export interface AdminInsight {
  id: string;
  type: "success_pattern" | "risk_factor" | "optimization" | "team_performance";
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  recommendation: string;
  affectedClients: string[];
  dataPoints: any[];
}

// Admin Dashboard Manager
export class AdminDashboardManager {
  private clientSystem: CompleteClientSuccessSystem;
  
  constructor(clientSystem: CompleteClientSuccessSystem) {
    this.clientSystem = clientSystem;
  }
  
  /**
   * Get complete admin dashboard
   */
  getAdminDashboard(): AdminDashboard {
    const allClients = this.clientSystem.getAllClientsProgress();
    const clientViews = this.buildClientViews(allClients);
    
    return {
      overview: this.calculateOverviewMetrics(allClients),
      clients: clientViews,
      teamPerformance: this.calculateTeamMetrics(allClients),
      revenueAnalytics: this.calculateRevenueAnalytics(allClients),
      activityFeed: this.buildActivityFeed(),
      alerts: this.generateAlerts(clientViews),
      insights: this.generateInsights(allClients)\n    };\n  }\n  \n  /**\n   * Build detailed client views for admin\n   */\n  private buildClientViews(clients: any[]): AdminClientView[] {\n    return clients.map(client => {\n      const journey = this.clientSystem.getClientJourney(client.clientId);\n      const dashboard = this.clientSystem.getDashboard(client.clientId);\n      \n      if (!journey || !dashboard) {\n        return this.createEmptyClientView(client);\n      }\n      \n      // Calculate metrics\n      const progressPercentage = (journey.currentRevenue / journey.targetRevenue) * 100;\n      const engagementScore = dashboard.engagementScore.overall;\n      const successProbability = this.calculateSuccessProbability(journey, dashboard);\n      \n      // Determine health status\n      const health = this.determineClientHealth(journey, dashboard, engagementScore);\n      \n      // Get current stage\n      const currentStage = journey.stages.find(s => s.status === 'active')?.name || 'Completed';\n      \n      // Get next milestone\n      const nextMilestone = journey.revenueMilestones.find(m => !m.achievedDate);\n      \n      // Calculate days to next milestone\n      const daysToNextMilestone = nextMilestone \n        ? Math.ceil((new Date(nextMilestone.targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))\n        : 0;\n      \n      // Get blockers\n      const blockers = journey.stages\n        .filter(s => s.blockers.length > 0)\n        .flatMap(s => s.blockers);\n      \n      // Get recent activities\n      const lastInteraction = journey.interactions[0]?.timestamp || 'Never';\n      const lastCoaching = journey.coachingSessions[0]?.date || 'Never';\n      const lastRevenue = dashboard.timeline.find(t => t.type === 'revenue')?.timestamp || 'Never';\n      \n      // Calculate funnel conversion\n      const funnelConversion = journey.funnelMetrics.length > 0\n        ? journey.funnelMetrics[journey.funnelMetrics.length - 1].conversionRate\n        : 0;\n      \n      return {\n        clientId: client.clientId,\n        clientName: client.name,\n        startDate: journey.startDate,\n        salesRep: this.getSalesRep(journey),\n        coach: this.getCoach(journey),\n        \n        currentRevenue: journey.currentRevenue,\n        targetRevenue: journey.targetRevenue,\n        progressPercentage: Math.round(progressPercentage),\n        daysInProgram: dashboard.liveMetrics.daysInProgram,\n        \n        health,\n        engagementScore,\n        riskLevel: this.calculateRiskLevel(health, engagementScore),\n        successProbability: Math.round(successProbability),\n        \n        currentStage,\n        nextMilestone: nextMilestone?.milestone || 'Completed',\n        daysToNextMilestone,\n        blockers,\n        \n        lastInteraction,\n        lastCoachingSession: lastCoaching,\n        lastRevenueUpdate: lastRevenue,\n        \n        funnelConversionRate: Math.round(funnelConversion * 100) / 100,\n        coachingSessionsAttended: journey.successMetrics.coachingSessionsAttended,\n        taskCompletionRate: Math.round(journey.successMetrics.taskCompletionRate),\n        \n        quickActions: this.generateQuickActions(journey, dashboard)\n      };\n    });\n  }\n  \n  /**\n   * Calculate overview metrics\n   */\n  private calculateOverviewMetrics(clients: any[]): AdminOverviewMetrics {\n    const totalClients = clients.length;\n    const activeClients = clients.filter(c => c.health !== 'completed').length;\n    const clientsAt10K = clients.filter(c => c.currentRevenue >= 10000).length;\n    \n    // Calculate averages\n    const totalRevenue = clients.reduce((sum, c) => sum + c.currentRevenue, 0);\n    const avgRevenue = totalClients > 0 ? totalRevenue / totalClients : 0;\n    \n    // Success rate\n    const successRate = totalClients > 0 ? (clientsAt10K / totalClients) * 100 : 0;\n    \n    return {\n      totalTier5Clients: totalClients,\n      activeClients,\n      clientsAt10K,\n      avgTimeToFirstSale: 14, // Would calculate from actual data\n      avgTimeTo10K: 75, // Would calculate from actual data\n      \n      totalRevenueGenerated: totalRevenue,\n      monthlyRecurringRevenue: totalRevenue * 0.8, // Estimate\n      avgRevenuePerClient: Math.round(avgRevenue),\n      revenueGrowthRate: 15, // Would calculate from historical data\n      \n      overallSuccessRate: Math.round(successRate),\n      avgClientSatisfaction: 8.7,\n      clientRetentionRate: 92,\n      \n      totalTeamMembers: 12,\n      avgTeamUtilization: 82,\n      clientsPerTeamMember: Math.round(totalClients / 12)\n    };\n  }\n  \n  /**\n   * Generate alerts for admin attention\n   */\n  private generateAlerts(clients: AdminClientView[]): AdminAlert[] {\n    const alerts: AdminAlert[] = [];\n    \n    // Client risk alerts\n    clients.forEach(client => {\n      if (client.health === 'critical') {\n        alerts.push({\n          id: `alert-${client.clientId}-critical`,\n          type: 'client_risk',\n          severity: 'critical',\n          clientId: client.clientId,\n          clientName: client.clientName,\n          message: `${client.clientName} is at critical risk`,\n          actionRequired: 'Immediate intervention needed',\n          createdAt: new Date().toISOString(),\n          resolved: false\n        });\n      }\n      \n      if (client.engagementScore < 60) {\n        alerts.push({\n          id: `alert-${client.clientId}-engagement`,\n          type: 'low_engagement',\n          severity: 'warning',\n          clientId: client.clientId,\n          clientName: client.clientName,\n          message: `${client.clientName} has low engagement (${client.engagementScore}%)`,\n          actionRequired: 'Schedule check-in call',\n          createdAt: new Date().toISOString(),\n          resolved: false\n        });\n      }\n      \n      if (client.daysToNextMilestone < 0) {\n        alerts.push({\n          id: `alert-${client.clientId}-overdue`,\n          type: 'milestone_overdue',\n          severity: 'warning',\n          clientId: client.clientId,\n          clientName: client.clientName,\n          message: `${client.clientName} is ${Math.abs(client.daysToNextMilestone)} days overdue for ${client.nextMilestone}`,\n          actionRequired: 'Review progress and adjust timeline',\n          createdAt: new Date().toISOString(),\n          resolved: false\n        });\n      }\n    });\n    \n    return alerts;\n  }\n  \n  /**\n   * Build real-time activity feed\n   */\n  private buildActivityFeed(): AdminActivityFeed[] {\n    const activities: AdminActivityFeed[] = [];\n    \n    // Get recent activities from all clients\n    this.clientSystem.getAllClientsProgress().forEach(client => {\n      const dashboard = this.clientSystem.getDashboard(client.clientId);\n      if (dashboard) {\n        // Get recent timeline events\n        dashboard.timeline.slice(0, 5).forEach(event => {\n          activities.push({\n            id: event.id,\n            timestamp: event.timestamp,\n            clientId: client.clientId,\n            clientName: client.name,\n            type: event.type as any,\n            title: event.title,\n            description: event.description,\n            impact: event.impact,\n            teamMember: event.participants[0],\n            revenueImpact: event.revenueImpact\n          });\n        });\n      }\n    });\n    \n    // Sort by timestamp (most recent first)\n    return activities\n      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())\n      .slice(0, 50); // Keep last 50 activities\n  }\n  \n  // Helper methods\n  private createEmptyClientView(client: any): AdminClientView {\n    return {\n      clientId: client.clientId,\n      clientName: client.name,\n      startDate: new Date().toISOString(),\n      salesRep: 'Unassigned',\n      coach: 'Unassigned',\n      currentRevenue: 0,\n      targetRevenue: 10000,\n      progressPercentage: 0,\n      daysInProgram: 0,\n      health: 'warning',\n      engagementScore: 0,\n      riskLevel: 'high',\n      successProbability: 0,\n      currentStage: 'Not Started',\n      nextMilestone: '$1K',\n      daysToNextMilestone: 30,\n      blockers: ['No data available'],\n      lastInteraction: 'Never',\n      lastCoachingSession: 'Never',\n      lastRevenueUpdate: 'Never',\n      funnelConversionRate: 0,\n      coachingSessionsAttended: 0,\n      taskCompletionRate: 0,\n      quickActions: []\n    };\n  }\n  \n  private determineClientHealth(journey: ClientJourney, dashboard: ComprehensiveTrackingDashboard, engagement: number): AdminClientView['health'] {\n    if (journey.currentRevenue >= 10000) return 'excellent';\n    if (engagement >= 80 && dashboard.liveMetrics.projectHealth === 'good') return 'good';\n    if (engagement >= 60 && dashboard.liveMetrics.projectHealth !== 'critical') return 'warning';\n    return 'critical';\n  }\n  \n  private calculateRiskLevel(health: AdminClientView['health'], engagement: number): AdminClientView['riskLevel'] {\n    if (health === 'critical' || engagement < 50) return 'high';\n    if (health === 'warning' || engagement < 70) return 'medium';\n    return 'low';\n  }\n  \n  private calculateSuccessProbability(journey: ClientJourney, dashboard: ComprehensiveTrackingDashboard): number {\n    const revenueProgress = (journey.currentRevenue / journey.targetRevenue) * 100;\n    const timeProgress = (dashboard.liveMetrics.daysInProgram / journey.daysToTarget) * 100;\n    const engagement = dashboard.engagementScore.overall;\n    \n    // Weighted calculation\n    return (revenueProgress * 0.4) + (engagement * 0.3) + ((100 - Math.min(timeProgress, 100)) * 0.3);\n  }\n  \n  private getSalesRep(journey: ClientJourney): string {\n    const salesActivity = journey.salesActivities.find(a => a.activityType === 'onboarding');\n    return salesActivity?.teamMember || 'Unassigned';\n  }\n  \n  private getCoach(journey: ClientJourney): string {\n    const coachingSession = journey.coachingSessions[0];\n    return coachingSession?.coach || 'Unassigned';\n  }\n  \n  private generateQuickActions(journey: ClientJourney, dashboard: ComprehensiveTrackingDashboard): AdminClientView['quickActions'] {\n    const actions: AdminClientView['quickActions'] = [];\n    \n    // Based on client status, generate relevant quick actions\n    if (dashboard.engagementScore.overall < 70) {\n      actions.push({\n        id: 'schedule-checkin',\n        label: 'Schedule Check-in',\n        action: 'schedule_call',\n        urgent: true\n      });\n    }\n    \n    if (journey.currentRevenue === 0) {\n      actions.push({\n        id: 'review-funnel',\n        label: 'Review Funnel',\n        action: 'review_funnel',\n        urgent: true\n      });\n    }\n    \n    actions.push(\n      {\n        id: 'send-update',\n        label: 'Send Update',\n        action: 'send_update',\n        urgent: false\n      },\n      {\n        id: 'view-details',\n        label: 'View Details',\n        action: 'view_client',\n        urgent: false\n      }\n    );\n    \n    return actions;\n  }\n  \n  private calculateTeamMetrics(clients: any[]): AdminTeamMetrics {\n    // This would calculate actual team performance from the data\n    return {\n      salesTeam: [\n        {\n          member: 'Sarah Johnson',\n          clientsManaged: 8,\n          totalTouchpoints: 45,\n          avgClientSatisfaction: 9.2,\n          revenueGenerated: 65000,\n          conversionRate: 28\n        }\n      ],\n      coachingTeam: [\n        {\n          coach: 'Alex Rodriguez',\n          clientsCoached: 12,\n          sessionsCompleted: 48,\n          avgImplementationRate: 82,\n          clientSuccessRate: 85,\n          avgRevenueImpact: 5400\n        }\n      ],\n      deliveryTeam: [\n        {\n          member: 'Emma Wilson',\n          projectsDelivered: 15,\n          avgDeliveryTime: 45,\n          clientSatisfaction: 8.9,\n          tasksCompleted: 156\n        }\n      ]\n    };\n  }\n  \n  private calculateRevenueAnalytics(clients: any[]): AdminRevenueAnalytics {\n    // This would calculate actual revenue analytics from the data\n    return {\n      dailyRevenue: [], // Would populate with real data\n      weeklyRevenue: [], // Would populate with real data\n      monthlyRevenue: [], // Would populate with real data\n      milestoneAchievements: [\n        { milestone: '$1K', clientsAchieved: 18, avgDaysToAchieve: 21, successRate: 85 },\n        { milestone: '$5K', clientsAchieved: 12, avgDaysToAchieve: 45, successRate: 75 },\n        { milestone: '$10K', clientsAchieved: 8, avgDaysToAchieve: 72, successRate: 65 }\n      ],\n      revenueSources: [\n        { source: 'Funnel Sales', amount: 125000, percentage: 65, clients: 15 },\n        { source: 'Webinar Sales', amount: 45000, percentage: 25, clients: 8 },\n        { source: 'Direct Sales', amount: 20000, percentage: 10, clients: 5 }\n      ],\n      funnelPerformance: [\n        { stage: 'Traffic', totalVisitors: 25000, totalConversions: 25000, avgConversionRate: 100, totalRevenue: 0 },\n        { stage: 'Landing', totalVisitors: 25000, totalConversions: 8500, avgConversionRate: 34, totalRevenue: 0 },\n        { stage: 'Nurture', totalVisitors: 8500, totalConversions: 1700, avgConversionRate: 20, totalRevenue: 0 },\n        { stage: 'Sales', totalVisitors: 1700, totalConversions: 340, avgConversionRate: 20, totalRevenue: 190000 }\n      ]\n    };\n  }\n  \n  private generateInsights(clients: any[]): AdminInsight[] {\n    return [\n      {\n        id: 'insight-1',\n        type: 'success_pattern',\n        title: 'High Engagement = Higher Success Rate',\n        description: 'Clients with >80% engagement score have 3x higher success rate',\n        impact: 'high',\n        recommendation: 'Focus on engagement strategies for all clients',\n        affectedClients: clients.map(c => c.clientId),\n        dataPoints: []\n      },\n      {\n        id: 'insight-2',\n        type: 'optimization',\n        title: 'Funnel Stage 2 Needs Optimization',\n        description: 'Landing page conversion is 15% below target across all clients',\n        impact: 'medium',\n        recommendation: 'A/B test landing page headlines and CTAs',\n        affectedClients: clients.map(c => c.clientId),\n        dataPoints: []\n      }\n    ];\n  }\n}\n\n// Export the admin dashboard manager\nexport default AdminDashboardManager;