export interface SalesFunnelStage {
  id: string;
  name: string;
  description: string;
  conversionRate: number;
  avgTimeInStage: number; // days
  automatedActions: string[];
  requiredAssets: string[];
}

export interface SalesFunnelMetrics {
  totalLeads: number;
  qualifiedLeads: number;
  bookedCalls: number;
  showRate: number;
  closeRate: number;
  avgDealSize: number;
  monthlyRecurring: number;
}

export interface SalesFunnelTracker {
  id: string;
  clientId: string;
  funnelType: "vsl" | "webinar" | "application" | "direct_sales";
  stages: SalesFunnelStage[];
  metrics: SalesFunnelMetrics;
  optimizationGoals: string[];
  currentBottleneck: string;
  nextOptimization: string;
  updatedAt: string;
}

export const defaultSalesFunnelStages: SalesFunnelStage[] = [
  {
    id: "traffic",
    name: "Traffic Generation",
    description: "Organic content + paid ads driving to landing page",
    conversionRate: 2.5,
    avgTimeInStage: 0,
    automatedActions: ["Track source", "Tag visitor", "Retargeting pixel"],
    requiredAssets: ["Landing page", "Lead magnet", "Ad creatives"]
  },
  {
    id: "lead_capture",
    name: "Lead Capture",
    description: "Visitor opts in for lead magnet",
    conversionRate: 35,
    avgTimeInStage: 0,
    automatedActions: ["Send welcome email", "Tag as lead", "Add to nurture sequence"],
    requiredAssets: ["Opt-in form", "Thank you page", "Lead magnet delivery"]
  },
  {
    id: "nurture",
    name: "Lead Nurture",
    description: "Email sequence building trust and authority",
    conversionRate: 18,
    avgTimeInStage: 7,
    automatedActions: ["Send daily emails", "Track engagement", "Score lead quality"],
    requiredAssets: ["Email sequence", "Case studies", "Social proof"]
  },
  {
    id: "application",
    name: "Application/Booking",
    description: "Qualified leads book strategy call",
    conversionRate: 22,
    avgTimeInStage: 3,
    automatedActions: ["Send booking link", "Qualification questions", "Calendar sync"],
    requiredAssets: ["Booking page", "Qualification form", "Calendar system"]
  },
  {
    id: "sales_call",
    name: "Sales Call",
    description: "Strategy call with potential client",
    conversionRate: 25,
    avgTimeInStage: 1,
    automatedActions: ["Send reminder", "Prep call notes", "Follow-up sequence"],
    requiredAssets: ["Sales script", "Proposal template", "Objection handling"]
  },
  {
    id: "close",
    name: "Close & Onboard",
    description: "Client signs contract and starts onboarding",
    conversionRate: 100,
    avgTimeInStage: 2,
    automatedActions: ["Send contract", "Payment processing", "Onboarding kickoff"],
    requiredAssets: ["Contract template", "Payment system", "Onboarding checklist"]
  }
];