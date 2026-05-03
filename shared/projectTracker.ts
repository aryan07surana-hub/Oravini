export type ProjectHealth = "on_track" | "watch" | "blocked" | "completed";
export type ProjectStatus = "active" | "paused" | "blocked" | "completed";
export type PhaseStatus = "locked" | "in_progress" | "review" | "completed";
export type ActionStatus = "pending" | "in_progress" | "review" | "blocked" | "completed";
export type ActionPriority = "critical" | "high" | "medium" | "low";
export type ActionOwner = "admin" | "manager" | "team" | "client";
export type DeliverableStatus = "queued" | "in_progress" | "review" | "approved";
export type TeamRole = "admin" | "manager" | "executor";

export interface TeamMember {
  id: string;
  name: string;
  role: TeamRole;
  focus: string;
}

export interface SopTemplateItem {
  id: string;
  title: string;
  description: string;
  owner: ActionOwner;
}

export interface SopTemplate {
  id: string;
  title: string;
  purpose: string;
  steps: SopTemplateItem[];
}

export interface FunnelStage {
  id: string;
  title: string;
  metricLabel: string;
  metricValue: string;
  status: "stable" | "watch" | "critical";
}

export interface AutomationRule {
  id: string;
  title: string;
  trigger: string;
  action: string;
  enabled: boolean;
}

export interface CrmStage {
  id: string;
  title: string;
  count: number;
}

export interface ContentFlowItem {
  id: string;
  stage: "youtube" | "clips" | "reels" | "posts";
  title: string;
  status: ActionStatus;
}

export interface CommunicationThread {
  id: string;
  topic: string;
  type: "client" | "internal";
  linkedTo: string;
  lastMessage: string;
  unread: number;
}

export interface ExecutionColumn {
  id: string;
  title: string;
  status: ActionStatus;
  owner: ActionOwner;
  notes: string;
}

export interface ProjectDeliverable {
  id: string;
  title: string;
  type: string;
  status: DeliverableStatus;
  linkedPhaseId: string;
  url?: string;
  version?: number;
  approvalRequired?: boolean;
}

export interface ProjectAction {
  id: string;
  title: string;
  description: string;
  owner: ActionOwner;
  status: ActionStatus;
  priority: ActionPriority;
  dueDate: string | null;
  clientVisible: boolean;
  requiresApproval: boolean;
  notes?: string;
}

export interface ProjectStep {
  id: string;
  title: string;
  description: string;
  status: ActionStatus;
  actions: ProjectAction[];
}

export interface ProjectPhase {
  id: string;
  title: string;
  description: string;
  status: PhaseStatus;
  objective: string;
  steps: ProjectStep[];
}

export interface ProjectUpdate {
  id: string;
  title: string;
  message: string;
  type: "system" | "milestone" | "alert" | "client";
  createdAt: string;
}

export interface ProjectTracker {
  clientId: string;
  projectName: string;
  programName: string;
  managerName: string;
  projectStatus: ProjectStatus;
  health: ProjectHealth;
  targetDate: string | null;
  currentFocus: string;
  nextClientAction: string;
  phases: ProjectPhase[];
  deliverables: ProjectDeliverable[];
  updates: ProjectUpdate[];
  teamMembers: TeamMember[];
  sopTemplates: SopTemplate[];
  funnelStages: FunnelStage[];
  automationRules: AutomationRule[];
  crmPipeline: CrmStage[];
  contentPipeline: ContentFlowItem[];
  communicationThreads: CommunicationThread[];
  executionColumns: ExecutionColumn[];
  updatedAt: string;
}

const daysFromNow = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
};

const makeAction = (
  id: string,
  title: string,
  description: string,
  owner: ActionOwner,
  priority: ActionPriority,
  dueInDays: number,
  options: Partial<Pick<ProjectAction, "clientVisible" | "requiresApproval" | "status" | "notes">> = {},
): ProjectAction => ({
  id,
  title,
  description,
  owner,
  priority,
  dueDate: daysFromNow(dueInDays),
  clientVisible: options.clientVisible ?? true,
  requiresApproval: options.requiresApproval ?? false,
  status: options.status ?? "pending",
  notes: options.notes,
});

export function createDefaultProjectTracker(clientId: string, clientName: string, programName?: string): ProjectTracker {
  const today = new Date().toISOString();

  return {
    clientId,
    projectName: `${clientName}'s Growth Engine`,
    programName: programName || "Tier 5 Elite Buildout",
    managerName: "Brandverse Success Team",
    projectStatus: "active",
    health: "on_track",
    targetDate: daysFromNow(60),
    currentFocus: "Complete onboarding inputs and lock the strategic foundation.",
    nextClientAction: "Submit your onboarding answers and upload your core assets.",
    phases: [
      {
        id: "phase-1",
        title: "Onboarding & Foundation",
        description: "Align goals, collect assets, and prepare the workspace for execution.",
        status: "in_progress",
        objective: "Get complete clarity on the client offer, assets, and expectations.",
        steps: [
          {
            id: "step-1-1",
            title: "Client Intake",
            description: "Collect brand inputs, assets, and growth context.",
            status: "in_progress",
            actions: [
              makeAction("action-1-1", "Complete onboarding form", "Share niche, offer, audience, and current goals.", "client", "critical", 2, { status: "in_progress" }),
              makeAction("action-1-2", "Upload brand assets", "Provide logos, testimonials, references, and current funnel links.", "client", "high", 3, { status: "pending" }),
            ],
          },
          {
            id: "step-1-2",
            title: "Kickoff Alignment",
            description: "Turn raw inputs into a locked execution direction.",
            status: "pending",
            actions: [
              makeAction("action-1-3", "Review onboarding inputs", "Success manager reviews the business model and risk areas.", "manager", "high", 4),
              makeAction("action-1-4", "Run kickoff strategy call", "Confirm priorities, success metrics, and timeline.", "manager", "high", 5, { requiresApproval: true }),
            ],
          },
        ],
      },
      {
        id: "phase-2",
        title: "Strategy & Funnel Design",
        description: "Define funnel model, core messaging, and the customer journey.",
        status: "locked",
        objective: "Finalize the exact system that turns traffic into qualified calls and sales.",
        steps: [
          {
            id: "step-2-1",
            title: "Offer Positioning",
            description: "Clarify the promise, pricing, and mechanism.",
            status: "pending",
            actions: [
              makeAction("action-2-1", "Refine offer structure", "Package the offer for conversion and delivery.", "manager", "high", 7),
              makeAction("action-2-2", "Approve messaging direction", "Client signs off on the positioning and promise.", "client", "high", 8, { requiresApproval: true }),
            ],
          },
          {
            id: "step-2-2",
            title: "Funnel Mapping",
            description: "Build the high-level conversion flow.",
            status: "pending",
            actions: [
              makeAction("action-2-3", "Choose funnel type", "Select lead magnet, webinar, or VSL build based on stage.", "manager", "high", 9),
              makeAction("action-2-4", "Lock the funnel map", "Document the traffic to sale journey and handoff points.", "team", "medium", 10),
            ],
          },
        ],
      },
      {
        id: "phase-3",
        title: "Asset Creation",
        description: "Produce funnel pages, scripts, and core nurture assets.",
        status: "locked",
        objective: "Get the conversion assets built and ready for review.",
        steps: [
          {
            id: "step-3-1",
            title: "Core Assets",
            description: "Create the pages, scripts, and CTA flow.",
            status: "pending",
            actions: [
              makeAction("action-3-1", "Build landing page stack", "Create opt-in, thank-you, and sales/VSL page structure.", "team", "high", 14),
              makeAction("action-3-2", "Draft VSL or sales script", "Build the core conversion script and approval copy.", "manager", "high", 15),
            ],
          },
          {
            id: "step-3-2",
            title: "Email Engine",
            description: "Prepare the nurture and sales sequence.",
            status: "pending",
            actions: [
              makeAction("action-3-3", "Write nurture emails", "Draft welcome, nurture, and CTA sequence.", "team", "medium", 16),
              makeAction("action-3-4", "Approve conversion copy", "Client reviews copy tone and final messaging.", "client", "medium", 17, { requiresApproval: true }),
            ],
          },
        ],
      },
      {
        id: "phase-4",
        title: "Traffic & Content System",
        description: "Set up the lead engine and repurposing workflow.",
        status: "locked",
        objective: "Make sure the content and traffic machine can feed the funnel consistently.",
        steps: [
          {
            id: "step-4-1",
            title: "Content Pipeline",
            description: "Map long-form content into short-form distribution.",
            status: "pending",
            actions: [
              makeAction("action-4-1", "Create weekly content pipeline", "Map YouTube into shorts, reels, and posts.", "manager", "medium", 20),
              makeAction("action-4-2", "Upload source content", "Client shares raw footage or topic bank for repurposing.", "client", "high", 18),
            ],
          },
          {
            id: "step-4-2",
            title: "Traffic Setup",
            description: "Prepare ads or organic CTA flow.",
            status: "pending",
            actions: [
              makeAction("action-4-3", "Prepare ad creatives and hooks", "Build the first traffic experiments.", "team", "medium", 21),
              makeAction("action-4-4", "QA lead capture path", "Test opt-ins, email tags, and attribution.", "team", "medium", 22),
            ],
          },
        ],
      },
      {
        id: "phase-5",
        title: "Sales & Conversion System",
        description: "Connect lead flow to booking, sales calls, and close tracking.",
        status: "locked",
        objective: "Turn incoming demand into predictable booked calls and paid conversions.",
        steps: [
          {
            id: "step-5-1",
            title: "Sales Pipeline",
            description: "Install booking and follow-up infrastructure.",
            status: "pending",
            actions: [
              makeAction("action-5-1", "Configure booking flow", "Set up qualification steps and call booking assets.", "team", "high", 26),
              makeAction("action-5-2", "Finalize sales script", "Lock the sales narrative and objection handling flow.", "manager", "high", 27),
            ],
          },
          {
            id: "step-5-2",
            title: "CRM Tracking",
            description: "Track leads, calls, and closes inside the system.",
            status: "pending",
            actions: [
              makeAction("action-5-3", "Set up CRM board", "Create pipeline stages and attribution tracking.", "team", "medium", 28),
              makeAction("action-5-4", "Review pipeline with client", "Client confirms the qualification and handoff flow.", "client", "medium", 29, { requiresApproval: true }),
            ],
          },
        ],
      },
      {
        id: "phase-6",
        title: "Automation & Operations",
        description: "Reduce manual work and connect the backend systems.",
        status: "locked",
        objective: "Make execution repeatable and easier to scale.",
        steps: [
          {
            id: "step-6-1",
            title: "Automation Rules",
            description: "Trigger follow-up and operational steps automatically.",
            status: "pending",
            actions: [
              makeAction("action-6-1", "Map automation triggers", "Define triggers for opt-ins, bookings, and missed steps.", "manager", "medium", 33),
              makeAction("action-6-2", "Implement backend automations", "Connect notifications, tags, and handoffs.", "team", "medium", 34),
            ],
          },
          {
            id: "step-6-2",
            title: "Operations QA",
            description: "Confirm the system works end to end.",
            status: "pending",
            actions: [
              makeAction("action-6-3", "Run internal QA sprint", "Test handoffs, forms, automations, and reporting.", "team", "medium", 35),
              makeAction("action-6-4", "Review operations dashboard", "Client sees the command center and next responsibilities.", "client", "low", 36),
            ],
          },
        ],
      },
      {
        id: "phase-7",
        title: "Optimization & Scaling",
        description: "Track performance, iterate, and scale what works.",
        status: "locked",
        objective: "Use performance data to improve conversion and accelerate growth.",
        steps: [
          {
            id: "step-7-1",
            title: "Performance Tracking",
            description: "Track CPL, conversion, revenue, and output.",
            status: "pending",
            actions: [
              makeAction("action-7-1", "Launch performance scoreboard", "Create KPI views for leads, calls, and revenue.", "manager", "medium", 42),
              makeAction("action-7-2", "Log first optimization hypotheses", "Capture quick wins and tests for the next sprint.", "manager", "medium", 43),
            ],
          },
          {
            id: "step-7-2",
            title: "Scale Loop",
            description: "Increase output and budget based on signal.",
            status: "pending",
            actions: [
              makeAction("action-7-3", "Ship optimization sprint", "Improve hooks, funnel pages, email copy, or CTA flow.", "team", "medium", 45),
              makeAction("action-7-4", "Approve scale roadmap", "Client signs off on the next sprint priorities.", "client", "medium", 46, { requiresApproval: true }),
            ],
          },
        ],
      },
    ],
    deliverables: [
      { id: "deliverable-1", title: "Strategy Brief", type: "strategy", status: "in_progress", linkedPhaseId: "phase-1", version: 2, approvalRequired: true },
      { id: "deliverable-2", title: "Funnel Blueprint", type: "funnel", status: "queued", linkedPhaseId: "phase-2", version: 1, approvalRequired: true },
      { id: "deliverable-3", title: "Email Sequence", type: "email", status: "queued", linkedPhaseId: "phase-3", version: 1, approvalRequired: false },
      { id: "deliverable-4", title: "Content Pipeline", type: "content", status: "queued", linkedPhaseId: "phase-4", version: 1, approvalRequired: false },
    ],
    updates: [
      {
        id: "update-1",
        title: "Mission initialized",
        message: "Your Tier 5 project tracker is live. We are collecting the inputs needed to start execution.",
        type: "system",
        createdAt: today,
      },
      {
        id: "update-2",
        title: "Current focus locked",
        message: "The immediate goal is to finish onboarding and strategic alignment so production can move quickly.",
        type: "milestone",
        createdAt: today,
      },
    ],
    teamMembers: [
      { id: "team-admin", name: "Agency Owner", role: "admin", focus: "Strategy and escalation control" },
      { id: "team-manager", name: "Success Manager", role: "manager", focus: "Client delivery and weekly reviews" },
      { id: "team-executor-1", name: "Content Executor", role: "executor", focus: "Content, assets, and publishing flow" },
      { id: "team-executor-2", name: "Video Editor", role: "executor", focus: "VSL, clips, and repurposing outputs" },
    ],
    sopTemplates: [
      {
        id: "sop-onboarding",
        title: "Client Onboarding SOP",
        purpose: "Start every client with clarity, trust, and execution readiness.",
        steps: [
          { id: "sop-onb-1", title: "Send welcome email", description: "Confirm onboarding timeline and communication format.", owner: "manager" },
          { id: "sop-onb-2", title: "Collect requirements", description: "Capture offer, audience, assets, and current systems.", owner: "client" },
          { id: "sop-onb-3", title: "Lock kickoff call", description: "Define targets, milestones, and first sprint actions.", owner: "manager" },
        ],
      },
      {
        id: "sop-weekly-review",
        title: "Weekly Review SOP",
        purpose: "Keep execution predictable and unblock delivery every week.",
        steps: [
          { id: "sop-review-1", title: "Audit completions", description: "Review what shipped and what slipped in the last 7 days.", owner: "manager" },
          { id: "sop-review-2", title: "Resolve blockers", description: "Escalate blocked actions and assign direct owners.", owner: "admin" },
          { id: "sop-review-3", title: "Set next priorities", description: "Publish next week priorities to team and client.", owner: "manager" },
        ],
      },
    ],
    funnelStages: [
      { id: "funnel-ads", title: "Ads", metricLabel: "CTR", metricValue: "2.8%", status: "stable" },
      { id: "funnel-landing", title: "Landing Page", metricLabel: "Opt-in", metricValue: "34%", status: "stable" },
      { id: "funnel-email", title: "Email", metricLabel: "Open rate", metricValue: "41%", status: "watch" },
      { id: "funnel-vsl", title: "VSL", metricLabel: "Watch %", metricValue: "52%", status: "watch" },
      { id: "funnel-call", title: "Call", metricLabel: "Booked", metricValue: "18%", status: "stable" },
      { id: "funnel-sale", title: "Sale", metricLabel: "Close", metricValue: "22%", status: "stable" },
    ],
    automationRules: [
      {
        id: "auto-1",
        title: "Advance step on completion",
        trigger: "If action status = completed",
        action: "Set next dependent action to in_progress and notify owner",
        enabled: true,
      },
      {
        id: "auto-2",
        title: "Deadline breach alert",
        trigger: "If due date passed and action not completed",
        action: "Mark as blocked and notify admin + manager",
        enabled: true,
      },
      {
        id: "auto-3",
        title: "New lead handoff",
        trigger: "If lead form submitted",
        action: "Notify sales manager and create follow-up action",
        enabled: true,
      },
    ],
    crmPipeline: [
      { id: "crm-lead", title: "Lead", count: 34 },
      { id: "crm-booked", title: "Booked", count: 16 },
      { id: "crm-showed", title: "Showed", count: 12 },
      { id: "crm-closed", title: "Closed", count: 7 },
    ],
    contentPipeline: [
      { id: "content-1", stage: "youtube", title: "Authority Episode #12", status: "completed" },
      { id: "content-2", stage: "clips", title: "5 short clips extracted", status: "in_progress" },
      { id: "content-3", stage: "reels", title: "Reel variations for hooks", status: "pending" },
      { id: "content-4", stage: "posts", title: "Carousel + static post set", status: "pending" },
    ],
    communicationThreads: [
      {
        id: "thread-client-1",
        topic: "VSL Script Approval",
        type: "client",
        linkedTo: "deliverable-2",
        lastMessage: "Client requested headline revision before final record.",
        unread: 1,
      },
      {
        id: "thread-internal-1",
        topic: "Traffic QA Handoff",
        type: "internal",
        linkedTo: "step-4-2",
        lastMessage: "Executor flagged landing form mismatch on mobile.",
        unread: 0,
      },
    ],
    executionColumns: [
      { id: "col-1", title: "Agreement and payment", status: "in_progress", owner: "client", notes: "Contract signed and onboarding payment confirmed." },
      { id: "col-2", title: "Client intake", status: "in_progress", owner: "client", notes: "Client submits intake form with offer and audience details." },
      { id: "col-3", title: "Data collection", status: "pending", owner: "client", notes: "Collect brand assets, links, testimonials, and current funnel data." },
      { id: "col-4", title: "Kickoff call", status: "pending", owner: "manager", notes: "Align goals, timeline, and execution priorities." },
      { id: "col-5", title: "Offer", status: "pending", owner: "manager", notes: "Refine promise, pricing, and delivery model." },
      { id: "col-6", title: "Validation", status: "pending", owner: "manager", notes: "Validate offer-market fit and core assumptions." },
      { id: "col-7", title: "Refinement funnel", status: "pending", owner: "team", notes: "Tighten conversion flow based on validation." },
      { id: "col-8", title: "Selection funnel", status: "pending", owner: "manager", notes: "Select the best funnel type for client stage." },
      { id: "col-9", title: "Mapping", status: "pending", owner: "team", notes: "Map end-to-end customer journey and handoffs." },
      { id: "col-10", title: "Message and positioning", status: "pending", owner: "manager", notes: "Finalize hooks, positioning, and messaging pillars." },
      { id: "col-11", title: "Website funnel vs funnel builder", status: "pending", owner: "team", notes: "Decide architecture and implementation route." },
      { id: "col-12", title: "Email sequence", status: "pending", owner: "team", notes: "Build welcome, nurture, and sales follow-up emails." },
      { id: "col-13", title: "Ad setup", status: "pending", owner: "team", notes: "Set creatives, targeting, and campaign structure." },
      { id: "col-14", title: "Organic content system", status: "pending", owner: "manager", notes: "Deploy repeatable YouTube-to-short-form pipeline." },
      { id: "col-15", title: "Sales process", status: "pending", owner: "manager", notes: "Set booking flow, qualification, and close script." },
      { id: "col-16", title: "CRM", status: "pending", owner: "team", notes: "Track leads, booked calls, and conversions." },
      { id: "col-17", title: "Thinking", status: "pending", owner: "admin", notes: "Strategic review, diagnostics, and next experiments." },
      { id: "col-18", title: "Automation setup", status: "pending", owner: "team", notes: "Set triggers, notifications, and workflow automations." },
      { id: "col-19", title: "Workflow management", status: "pending", owner: "manager", notes: "Run weekly ops, assignments, and unblockers." },
      { id: "col-20", title: "Lead optimization for scaling ads", status: "pending", owner: "manager", notes: "Improve CPL, conversion, and ROAS before scale." },
      { id: "col-21", title: "Hiring and managing sales teams", status: "pending", owner: "admin", notes: "Build sales org structure, training, and accountability." },
    ],
    updatedAt: today,
  };
}

export function normalizeProjectTracker(tracker: ProjectTracker): ProjectTracker {
  const baseline = createDefaultProjectTracker(
    tracker.clientId || "unknown-client",
    tracker.projectName?.replace(/'s Growth Engine$/, "") || "Client",
    tracker.programName,
  );

  return {
    ...baseline,
    ...tracker,
    teamMembers: tracker.teamMembers?.length ? tracker.teamMembers : baseline.teamMembers,
    sopTemplates: tracker.sopTemplates?.length ? tracker.sopTemplates : baseline.sopTemplates,
    funnelStages: tracker.funnelStages?.length ? tracker.funnelStages : baseline.funnelStages,
    automationRules: tracker.automationRules?.length ? tracker.automationRules : baseline.automationRules,
    crmPipeline: tracker.crmPipeline?.length ? tracker.crmPipeline : baseline.crmPipeline,
    contentPipeline: tracker.contentPipeline?.length ? tracker.contentPipeline : baseline.contentPipeline,
    communicationThreads: tracker.communicationThreads?.length ? tracker.communicationThreads : baseline.communicationThreads,
    executionColumns: tracker.executionColumns?.length ? tracker.executionColumns : baseline.executionColumns,
  };
}

function flattenActions(tracker: ProjectTracker) {
  return tracker.phases.flatMap((phase) =>
    phase.steps.flatMap((step) =>
      step.actions.map((action) => ({ phase, step, action })),
    ),
  );
}

export function getProjectCompletion(tracker: ProjectTracker) {
  const allActions = flattenActions(tracker);
  const completed = allActions.filter(({ action }) => action.status === "completed").length;
  const total = allActions.length || 1;
  return Math.round((completed / total) * 100);
}

export function getCurrentPhase(tracker: ProjectTracker) {
  return tracker.phases.find((phase) => phase.status !== "completed") || tracker.phases[tracker.phases.length - 1];
}

export function getVisibleActionBuckets(tracker: ProjectTracker) {
  const visible = flattenActions(tracker).filter(({ action }) => action.clientVisible);
  const clientQueue = visible.filter(({ action }) => action.owner === "client" && action.status !== "completed");
  const approvals = visible.filter(({ action }) => action.requiresApproval && action.status !== "completed");
  const blockers = visible.filter(({ action }) => action.status === "blocked");
  const nextActions = visible
    .filter(({ action }) => action.status !== "completed")
    .sort((a, b) => {
      const aTime = a.action.dueDate ? new Date(a.action.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
      const bTime = b.action.dueDate ? new Date(b.action.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    })
    .slice(0, 5);

  return { clientQueue, approvals, blockers, nextActions };
}

export function getProjectTrackerSummary(tracker: ProjectTracker) {
  const completion = getProjectCompletion(tracker);
  const currentPhase = getCurrentPhase(tracker);
  const { clientQueue, approvals, blockers, nextActions } = getVisibleActionBuckets(tracker);

  return {
    completion,
    currentPhaseTitle: currentPhase?.title || "No active phase",
    clientQueueCount: clientQueue.length,
    approvalCount: approvals.length,
    blockerCount: blockers.length,
    nextActions: nextActions.map(({ phase, step, action }) => ({
      id: action.id,
      title: action.title,
      owner: action.owner,
      status: action.status,
      phaseTitle: phase.title,
      stepTitle: step.title,
      dueDate: action.dueDate,
      priority: action.priority,
    })),
  };
}

