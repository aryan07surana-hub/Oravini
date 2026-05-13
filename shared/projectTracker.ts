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

export interface ClientOnboardingData {
  businessModel: string;
  currentRevenue: string;
  targetRevenue: string;
  mainPainPoints: string[];
  currentSystems: string[];
  teamSize: number;
  timeCommitment: string;
  successMetrics: string[];
  riskFactors: string[];
}

export interface ClientSuccessMetrics {
  onboardingScore: number;
  engagementLevel: "high" | "medium" | "low";
  responseTime: number;
  taskCompletionRate: number;
  satisfactionScore: number;
  retentionRisk: "low" | "medium" | "high";
  upsellPotential: "low" | "medium" | "high";
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
  onboardingData: ClientOnboardingData;
  successMetrics: ClientSuccessMetrics;
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
    targetDate: daysFromNow(90),
    currentFocus: "Complete onboarding inputs and lock the strategic foundation.",
    nextClientAction: "Submit your onboarding answers and upload your core assets.",
    onboardingData: {
      businessModel: "",
      currentRevenue: "",
      targetRevenue: "",
      mainPainPoints: [],
      currentSystems: [],
      teamSize: 1,
      timeCommitment: "",
      successMetrics: [],
      riskFactors: [],
    },
    successMetrics: {
      onboardingScore: 0,
      engagementLevel: "medium",
      responseTime: 24,
      taskCompletionRate: 0,
      satisfactionScore: 0,
      retentionRisk: "low",
      upsellPotential: "medium",
    },
    phases: [
      // ─── PHASE 1: CONTRACT & ONBOARDING ───
      {
        id: "phase-1",
        title: "Contract & Onboarding",
        description: "Lock the agreement, collect inputs, provision workspace, and set the tone for execution.",
        status: "in_progress",
        objective: "Get the client fully onboarded with all assets collected and workspace live within 72 hours.",
        steps: [
          {
            id: "step-1-1",
            title: "Agreement & Payment",
            description: "Execute contract and confirm payment.",
            status: "in_progress",
            actions: [
              makeAction("a-1-1", "Sign contract", "Execute the service agreement and confirm terms.", "client", "critical", 1, { status: "in_progress", requiresApproval: true }),
              makeAction("a-1-2", "Confirm payment", "Process onboarding payment and issue receipt.", "admin", "critical", 1, { clientVisible: false }),
              makeAction("a-1-3", "Send welcome email", "Automated welcome with next steps, timeline, and dashboard access.", "team", "high", 1),
            ],
          },
          {
            id: "step-1-2",
            title: "Client Intake",
            description: "Collect all business context, goals, and brand inputs.",
            status: "pending",
            actions: [
              makeAction("a-1-4", "Complete onboarding form", "Share niche, offer, audience, revenue, goals, pain points, current systems.", "client", "critical", 2, { requiresApproval: false }),
              makeAction("a-1-5", "Upload brand assets", "Provide logos, colors, testimonials, funnel links, content samples, competitor list.", "client", "high", 3),
              makeAction("a-1-6", "Review intake submissions", "Manager reviews all inputs for completeness and flags gaps.", "manager", "high", 4, { clientVisible: false }),
            ],
          },
          {
            id: "step-1-3",
            title: "Workspace Setup",
            description: "Provision dashboard, assign team, initialize tracker.",
            status: "pending",
            actions: [
              makeAction("a-1-7", "Provision client workspace", "Dashboard live, project tracker initialized, tools activated.", "team", "high", 2, { clientVisible: false }),
              makeAction("a-1-8", "Assign execution team", "Assign strategist, content executor, video editor, and support.", "admin", "high", 2, { clientVisible: false }),
              makeAction("a-1-9", "Schedule welcome call", "Book first 1-on-1 within 48 hours of signing.", "manager", "critical", 2),
            ],
          },
        ],
      },
      // ─── PHASE 2: DISCOVERY & STRATEGIC ALIGNMENT ───
      {
        id: "phase-2",
        title: "Discovery & Strategic Alignment",
        description: "Deep-dive into the business model, audience, competitors, and revenue goals before building anything.",
        status: "locked",
        objective: "Achieve full clarity on the client's market position, audience psychology, and revenue path.",
        steps: [
          {
            id: "step-2-1",
            title: "Business Audit",
            description: "Analyze current offer, pricing, delivery, and margins.",
            status: "pending",
            actions: [
              makeAction("a-2-1", "Audit business model", "Review current offer structure, pricing, delivery method, and profit margins.", "manager", "high", 5),
              makeAction("a-2-2", "Analyze audience", "Map who buys, why they buy, where they hang out, what language they use.", "manager", "high", 6),
              makeAction("a-2-3", "Map competitor landscape", "Identify 3-5 direct competitors, gaps, and positioning angles.", "team", "medium", 6),
            ],
          },
          {
            id: "step-2-2",
            title: "Revenue Engineering",
            description: "Reverse-engineer the numbers needed to hit revenue targets.",
            status: "pending",
            actions: [
              makeAction("a-2-4", "Revenue goal mapping", "Calculate leads, calls, and closes needed per month to hit target.", "manager", "high", 7),
              makeAction("a-2-5", "Identify revenue levers", "Determine which levers (traffic, conversion, price, retention) move fastest.", "manager", "medium", 7),
            ],
          },
          {
            id: "step-2-3",
            title: "Kickoff & Alignment",
            description: "Present findings and lock the 90-day execution plan.",
            status: "pending",
            actions: [
              makeAction("a-2-6", "Run kickoff strategy call", "Present audit findings, align on direction, confirm 90-day plan.", "manager", "critical", 8, { requiresApproval: true }),
              makeAction("a-2-7", "Client signs off on direction", "Formal approval of strategic direction before any building starts.", "client", "critical", 9, { requiresApproval: true }),
            ],
          },
        ],
      },
      // ─── PHASE 3: OFFER & POSITIONING ───
      {
        id: "phase-3",
        title: "Offer & Positioning",
        description: "Nail what the client is selling, how they talk about it, and who it's for.",
        status: "locked",
        objective: "Finalize offer structure, messaging, ICP, and content pillars so everything built after this is aligned.",
        steps: [
          {
            id: "step-3-1",
            title: "Offer Architecture",
            description: "Package the offer for maximum conversion and delivery clarity.",
            status: "pending",
            actions: [
              makeAction("a-3-1", "Finalize offer structure", "Define what's included, pricing tiers, delivery format, guarantee.", "manager", "high", 10),
              makeAction("a-3-2", "Build pricing presentation", "Create the pricing framework, payment plans, and urgency mechanics.", "manager", "high", 11),
              makeAction("a-3-3", "Client approves offer", "Sign off on final offer structure and pricing.", "client", "high", 12, { requiresApproval: true }),
            ],
          },
          {
            id: "step-3-2",
            title: "Messaging & Positioning",
            description: "Lock the core messaging that drives all content and copy.",
            status: "pending",
            actions: [
              makeAction("a-3-4", "Write core messaging", "One-liner, hook bank, pain/desire statements, transformation promise.", "manager", "high", 11),
              makeAction("a-3-5", "Document ICP", "Demographics, psychographics, buying triggers, objections.", "team", "medium", 12),
              makeAction("a-3-6", "Define content pillars", "3-5 recurring themes all content maps back to.", "manager", "medium", 13),
              makeAction("a-3-7", "Client approves positioning", "Confirm: this is how we talk about what you do.", "client", "high", 14, { requiresApproval: true }),
            ],
          },
        ],
      },
      // ─── PHASE 4: FUNNEL ARCHITECTURE & BUILD ───
      {
        id: "phase-4",
        title: "Funnel Architecture & Build",
        description: "Build the complete conversion machine — from opt-in to booked call.",
        status: "locked",
        objective: "Get every funnel asset built, tested, and approved so traffic can flow into revenue.",
        steps: [
          {
            id: "step-4-1",
            title: "Funnel Strategy",
            description: "Select funnel type and map the conversion journey.",
            status: "pending",
            actions: [
              makeAction("a-4-1", "Select funnel type", "Choose: lead magnet, VSL, webinar, or direct booking funnel.", "manager", "high", 15),
              makeAction("a-4-2", "Create lead magnet", "Design and write the free resource (PDF, quiz, mini-course).", "team", "high", 17),
            ],
          },
          {
            id: "step-4-2",
            title: "Page Build",
            description: "Build all funnel pages from opt-in to sale.",
            status: "pending",
            actions: [
              makeAction("a-4-3", "Build opt-in landing page", "Headline, copy, CTA, and form.", "team", "high", 18),
              makeAction("a-4-4", "Build thank-you / bridge page", "Next step after opt-in: watch VSL, book call, or join community.", "team", "medium", 19),
              makeAction("a-4-5", "Build sales / VSL page", "Long-form conversion page or video sales letter page.", "team", "high", 20),
            ],
          },
          {
            id: "step-4-3",
            title: "VSL & Sales Copy",
            description: "Write and produce the core conversion assets.",
            status: "pending",
            actions: [
              makeAction("a-4-6", "Write VSL script", "Hook, story, offer, CTA, objection handling.", "manager", "high", 19),
              makeAction("a-4-7", "Client records VSL", "Record the video sales letter using approved script.", "client", "high", 22),
              makeAction("a-4-8", "Edit & upload VSL", "Professional edit, captions, and upload to page.", "team", "high", 24),
            ],
          },
          {
            id: "step-4-4",
            title: "Email Engine",
            description: "Build the complete email nurture and sales sequence.",
            status: "pending",
            actions: [
              makeAction("a-4-9", "Write welcome sequence", "3-5 emails: welcome, value, story, CTA.", "team", "high", 20),
              makeAction("a-4-10", "Write nurture sequence", "5-7 emails: education, proof, authority, engagement.", "team", "medium", 22),
              makeAction("a-4-11", "Write sales sequence", "3-5 emails: urgency, scarcity, final CTA, last chance.", "team", "high", 23),
              makeAction("a-4-12", "Client approves email copy", "Review tone, messaging, and CTA flow.", "client", "medium", 25, { requiresApproval: true }),
            ],
          },
          {
            id: "step-4-5",
            title: "Booking & Conversion Flow",
            description: "Set up the path from interest to booked call.",
            status: "pending",
            actions: [
              makeAction("a-4-13", "Configure booking flow", "Qualification form, calendar integration, confirmation page.", "team", "high", 24),
              makeAction("a-4-14", "Set up reminder sequence", "Email + SMS reminders before the call.", "team", "medium", 25),
              makeAction("a-4-15", "Install conversion tracking", "UTMs, pixels, attribution mapping, dashboard.", "team", "medium", 25),
            ],
          },
          {
            id: "step-4-6",
            title: "Funnel QA & Launch",
            description: "Test everything end-to-end and go live.",
            status: "pending",
            actions: [
              makeAction("a-4-16", "Run full QA sprint", "Test: opt-in → emails → booking → confirmation → mobile.", "team", "critical", 26),
              makeAction("a-4-17", "Client approves funnel", "Final sign-off before traffic hits.", "client", "critical", 27, { requiresApproval: true }),
              makeAction("a-4-18", "Funnel goes live", "All pages published, emails connected, tracking active.", "team", "critical", 28),
            ],
          },
        ],
      },
      // ─── PHASE 5: CONTENT & TRAFFIC SYSTEM ───
      {
        id: "phase-5",
        title: "Content & Traffic System",
        description: "Turn on the attention engine — organic and paid traffic feeding the funnel.",
        status: "locked",
        objective: "Build a repeatable content machine that generates consistent leads without burning out.",
        steps: [
          {
            id: "step-5-1",
            title: "Content Strategy",
            description: "Map the full content system from long-form to distribution.",
            status: "pending",
            actions: [
              makeAction("a-5-1", "Map content strategy", "What to post, where, how often, what format, what CTA.", "manager", "high", 22),
              makeAction("a-5-2", "Plan long-form content", "YouTube/podcast episode topics for next 30 days.", "manager", "high", 23),
              makeAction("a-5-3", "Design repurposing system", "How long-form gets cut into reels, shorts, clips, carousels.", "team", "medium", 24),
            ],
          },
          {
            id: "step-5-2",
            title: "Content Production",
            description: "Produce the first batch and set up the pipeline.",
            status: "pending",
            actions: [
              makeAction("a-5-4", "Build content calendar", "Weekly schedule with topics, formats, platforms, CTAs.", "team", "medium", 25),
              makeAction("a-5-5", "Train AI content workers", "Trained on client voice, hooks, and style for draft generation.", "team", "high", 26),
              makeAction("a-5-6", "Client uploads source content", "Raw footage, topic ideas, or records first batch.", "client", "high", 25),
              makeAction("a-5-7", "Produce first content batch", "2 weeks of content ready to publish.", "team", "high", 28),
            ],
          },
          {
            id: "step-5-3",
            title: "Traffic Activation",
            description: "Turn on organic and paid traffic sources.",
            status: "pending",
            actions: [
              makeAction("a-5-8", "Set up organic CTA flow", "Bio links, pinned posts, story highlights, lead magnet links.", "team", "medium", 27),
              makeAction("a-5-9", "Prepare ad creatives", "Build first traffic experiments: creatives, hooks, targeting.", "team", "medium", 28),
              makeAction("a-5-10", "Launch paid traffic", "Ads live with budget, targeting, and attribution.", "team", "high", 30),
              makeAction("a-5-11", "Content goes live", "First posts published, distribution running.", "team", "critical", 29),
            ],
          },
        ],
      },
      // ─── PHASE 6: CRM & LEAD MANAGEMENT ───
      {
        id: "phase-6",
        title: "CRM & Lead Management",
        description: "Make sure no lead falls through the cracks — track, score, and follow up automatically.",
        status: "locked",
        objective: "Build a lead management system that turns inbound interest into predictable booked calls.",
        steps: [
          {
            id: "step-6-1",
            title: "Pipeline Architecture",
            description: "Define CRM stages and lead flow.",
            status: "pending",
            actions: [
              makeAction("a-6-1", "Build CRM pipeline", "Stages: Lead → Qualified → Booked → Showed → Proposal → Closed → Onboarded.", "team", "high", 30),
              makeAction("a-6-2", "Configure lead scoring", "Auto-score based on engagement, form answers, email behavior.", "team", "medium", 31),
              makeAction("a-6-3", "Set automation triggers", "Auto-tag on opt-in, auto-move on booking, auto-notify on no-show.", "team", "high", 32),
            ],
          },
          {
            id: "step-6-2",
            title: "Follow-Up System",
            description: "Build automated follow-up sequences for every scenario.",
            status: "pending",
            actions: [
              makeAction("a-6-4", "Build follow-up sequences", "Post-call (24h, 48h, 7d), no-show recovery, proposal follow-up.", "team", "high", 33),
              makeAction("a-6-5", "Set up reporting dashboard", "CPL, cost per call, show rate, close rate, revenue per lead.", "team", "medium", 34),
              makeAction("a-6-6", "Configure data hygiene rules", "Duplicate detection, dead lead archival, re-engagement triggers.", "team", "low", 35),
            ],
          },
          {
            id: "step-6-3",
            title: "Client CRM Training",
            description: "Train the client on reading and using the CRM.",
            status: "pending",
            actions: [
              makeAction("a-6-7", "Train client on CRM", "Walkthrough: read pipeline, move deals, add notes, run reports.", "manager", "high", 35),
              makeAction("a-6-8", "Client confirms CRM flow", "Sign off on pipeline stages and handoff protocol.", "client", "medium", 36, { requiresApproval: true }),
            ],
          },
        ],
      },
      // ─── PHASE 7: SALES SYSTEM & TEAM TRAINING ───
      {
        id: "phase-7",
        title: "Sales System & Team Training",
        description: "Turn booked calls into closed revenue — scripts, frameworks, training, and accountability.",
        status: "locked",
        objective: "Build a repeatable sales process that closes predictably whether the client sells or their team does.",
        steps: [
          {
            id: "step-7-1",
            title: "Sales Script & Framework",
            description: "Build the complete sales conversation structure.",
            status: "pending",
            actions: [
              makeAction("a-7-1", "Write sales script", "Discovery → pain → solution → offer → objections → close.", "manager", "critical", 36),
              makeAction("a-7-2", "Build call framework", "Step-by-step structure for every sales conversation.", "manager", "high", 37),
              makeAction("a-7-3", "Create objection handling matrix", "Top 10 objections with exact responses.", "manager", "high", 38),
              makeAction("a-7-4", "Build pricing presentation", "How to present pricing, payment plans, and urgency.", "manager", "high", 38),
            ],
          },
          {
            id: "step-7-2",
            title: "Sales Training & Practice",
            description: "Role play, drill, and iterate until the close rate is dialed.",
            status: "pending",
            actions: [
              makeAction("a-7-5", "Run role play sessions", "Recorded practice calls, scored against framework.", "manager", "high", 40),
              makeAction("a-7-6", "Define sales KPIs", "Calls/week, show rate, close rate, average deal size, revenue target.", "manager", "medium", 40),
              makeAction("a-7-7", "Client practices closes", "Client runs practice calls and gets feedback.", "client", "high", 42),
            ],
          },
          {
            id: "step-7-3",
            title: "Sales Team Build",
            description: "If applicable: hire, train, and ramp a sales team.",
            status: "pending",
            actions: [
              makeAction("a-7-8", "Create hiring framework", "Job description, interview script, trial close exercise, comp structure.", "admin", "medium", 42, { clientVisible: false }),
              makeAction("a-7-9", "Train sales team", "Playbook delivered, role plays done, accountability system set.", "manager", "high", 45),
              makeAction("a-7-10", "Lock handoff protocol", "When marketing hands to sales, what data transfers, who follows up.", "manager", "high", 44),
              makeAction("a-7-11", "Set accountability system", "Daily standup format, weekly scorecard, monthly review.", "admin", "medium", 45),
            ],
          },
        ],
      },
      // ─── PHASE 8: AUTOMATION & OPERATIONS ───
      {
        id: "phase-8",
        title: "Automation & Operations",
        description: "Remove manual work, connect backend systems, and make execution repeatable.",
        status: "locked",
        objective: "Automate every repeatable process so the system runs with minimal manual intervention.",
        steps: [
          {
            id: "step-8-1",
            title: "Automation Architecture",
            description: "Map and implement all automation triggers.",
            status: "pending",
            actions: [
              makeAction("a-8-1", "Document automation map", "Every trigger, condition, and action in the system.", "manager", "high", 44),
              makeAction("a-8-2", "Build email automations", "Welcome, nurture, sales, re-engagement, post-purchase all firing.", "team", "high", 46),
              makeAction("a-8-3", "Configure notification system", "Team gets pinged on new lead, booking, no-show, close.", "team", "medium", 46),
              makeAction("a-8-4", "Set up task automation", "Auto-create follow-up tasks, auto-assign to team members.", "team", "medium", 47),
            ],
          },
          {
            id: "step-8-2",
            title: "Operations & QA",
            description: "Set up workflow management and test everything.",
            status: "pending",
            actions: [
              makeAction("a-8-5", "Build workflow management system", "Weekly ops cadence, who does what, escalation rules.", "manager", "medium", 48),
              makeAction("a-8-6", "Run internal QA sprint", "Test every automation end-to-end, fix edge cases.", "team", "critical", 49),
              makeAction("a-8-7", "Client reviews operations dashboard", "See what's automated, what's manual, what they own.", "client", "medium", 50),
            ],
          },
        ],
      },
      // ─── PHASE 9: COMMUNITY & ECOSYSTEM LAUNCH ───
      {
        id: "phase-9",
        title: "Community & Ecosystem Launch",
        description: "Build and launch the community, membership, or group program ecosystem.",
        status: "locked",
        objective: "Create a thriving community that adds retention, engagement, and recurring revenue.",
        steps: [
          {
            id: "step-9-1",
            title: "Community Architecture",
            description: "Design the community structure and onboarding flow.",
            status: "pending",
            actions: [
              makeAction("a-9-1", "Select community platform", "Discord, Circle, Skool, or custom-built.", "manager", "high", 50),
              makeAction("a-9-2", "Design community structure", "Channels, roles, onboarding flow, content schedule.", "manager", "high", 51),
              makeAction("a-9-3", "Build member welcome sequence", "What happens when someone joins: DMs, intro post, first value.", "team", "medium", 52),
            ],
          },
          {
            id: "step-9-2",
            title: "Community Content & Launch",
            description: "Set up content schedule and go live.",
            status: "pending",
            actions: [
              makeAction("a-9-4", "Build community content schedule", "Weekly posts, live calls, challenges, engagement hooks.", "manager", "medium", 53),
              makeAction("a-9-5", "Set up moderation system", "Who moderates, response time, escalation, gamification.", "team", "medium", 54),
              makeAction("a-9-6", "Community goes live", "First members invited, onboarding running.", "team", "critical", 55),
              makeAction("a-9-7", "Train client on community management", "How to post, engage, run calls, handle issues.", "manager", "high", 56),
            ],
          },
        ],
      },
      // ─── PHASE 10: SOFTWARE & PLATFORM TRAINING ───
      {
        id: "phase-10",
        title: "Software & Platform Training",
        description: "Make sure the client and their team can use every system confidently.",
        status: "locked",
        objective: "Full competency handoff — client can operate, monitor, and manage their systems independently.",
        steps: [
          {
            id: "step-10-1",
            title: "Platform Training",
            description: "Walk through every tool and system.",
            status: "pending",
            actions: [
              makeAction("a-10-1", "Full platform walkthrough", "Dashboard, tools, navigation, settings, permissions.", "manager", "high", 57),
              makeAction("a-10-2", "CRM training session", "Read pipeline, move deals, add notes, run reports.", "manager", "high", 58),
              makeAction("a-10-3", "Content system training", "Use AI tools, approve drafts, schedule posts, read analytics.", "manager", "medium", 59),
              makeAction("a-10-4", "Automation overview session", "What's automated, how to pause/resume, how to troubleshoot.", "team", "medium", 59),
            ],
          },
          {
            id: "step-10-2",
            title: "Documentation & Handoff",
            description: "Deliver SOPs and confirm support protocol.",
            status: "pending",
            actions: [
              makeAction("a-10-5", "Funnel management training", "Read metrics, flag issues, request changes.", "manager", "medium", 60),
              makeAction("a-10-6", "Configure team access", "Add team members, set permissions, assign roles.", "team", "medium", 60),
              makeAction("a-10-7", "Deliver SOP documentation", "Written step-by-step for every recurring task.", "team", "high", 62),
              makeAction("a-10-8", "Confirm support protocol", "How to request changes, escalation path, response times.", "manager", "medium", 63, { requiresApproval: true }),
            ],
          },
        ],
      },
      // ─── PHASE 11: LAUNCH & REVENUE ACTIVATION ───
      {
        id: "phase-11",
        title: "Launch & Revenue Activation",
        description: "Everything is built. Turn it on, get leads flowing, and close the first deals.",
        status: "locked",
        objective: "Activate all systems, generate first revenue, and prove the machine works.",
        steps: [
          {
            id: "step-11-1",
            title: "Pre-Launch",
            description: "Final checks before going live.",
            status: "pending",
            actions: [
              makeAction("a-11-1", "Complete pre-launch checklist", "Every system tested, every page live, every automation firing.", "team", "critical", 64),
              makeAction("a-11-2", "Run soft launch", "Small traffic push to test conversion, collect data, identify friction.", "team", "high", 66),
              makeAction("a-11-3", "Data review & quick fixes", "Fix what's broken, optimize what's underperforming.", "team", "high", 68),
            ],
          },
          {
            id: "step-11-2",
            title: "Full Launch",
            description: "All systems go — traffic, content, ads, sales.",
            status: "pending",
            actions: [
              makeAction("a-11-4", "Execute full launch", "All traffic sources on, content machine running, ads live.", "team", "critical", 70),
              makeAction("a-11-5", "First leads flowing", "Opt-ins coming in, emails sending, bookings happening.", "team", "high", 72),
              makeAction("a-11-6", "First sales calls happening", "Leads showing up, script being used, objections handled.", "manager", "high", 73),
              makeAction("a-11-7", "First revenue closed", "Money in the bank. The system works.", "manager", "critical", 75),
            ],
          },
          {
            id: "step-11-3",
            title: "Launch Debrief",
            description: "Review results and celebrate wins.",
            status: "pending",
            actions: [
              makeAction("a-11-8", "Client celebration & debrief", "Review what worked, what to double down on.", "manager", "medium", 77),
              makeAction("a-11-9", "Document launch learnings", "What converted, what didn't, what to test next.", "team", "medium", 77, { clientVisible: false }),
            ],
          },
        ],
      },
      // ─── PHASE 12: OPTIMIZATION & SCALING ───
      {
        id: "phase-12",
        title: "Optimization & Scaling",
        description: "Make it better, make it bigger — optimize conversion and scale what works.",
        status: "locked",
        objective: "Use performance data to improve every metric and scale revenue predictably.",
        steps: [
          {
            id: "step-12-1",
            title: "Performance Tracking",
            description: "Build the scorecard and identify optimization opportunities.",
            status: "pending",
            actions: [
              makeAction("a-12-1", "Build performance scorecard", "Weekly KPIs: leads, calls, closes, revenue, CPL, ROAS.", "manager", "high", 78),
              makeAction("a-12-2", "Run conversion optimization sprint", "Test headlines, CTAs, email subjects, ad creatives.", "team", "high", 80),
              makeAction("a-12-3", "Optimize content performance", "Double down on what works, kill what doesn't, test new formats.", "team", "medium", 82),
              makeAction("a-12-4", "Optimize funnel conversion", "A/B test pages, improve load times, tighten copy.", "team", "medium", 83),
            ],
          },
          {
            id: "step-12-2",
            title: "Scale & Expand",
            description: "Increase budget, add platforms, expand the offer.",
            status: "pending",
            actions: [
              makeAction("a-12-5", "Make scale decision", "Increase budget, add platforms, hire team, or expand offer.", "admin", "high", 84),
              makeAction("a-12-6", "Client approves scale roadmap", "Next 30-60 day priorities locked.", "client", "high", 85, { requiresApproval: true }),
              makeAction("a-12-7", "Ongoing weekly reviews", "What shipped, what's stuck, what's next, revenue trend.", "manager", "medium", 87),
              makeAction("a-12-8", "Retention & upsell assessment", "Ready for Scale Your Software? Next tier? Renewal?", "admin", "medium", 90),
            ],
          },
        ],
      },
    ],
    deliverables: [
      { id: "d-1", title: "Strategy Brief", type: "strategy", status: "in_progress", linkedPhaseId: "phase-2", version: 1, approvalRequired: true },
      { id: "d-2", title: "Offer & Positioning Doc", type: "positioning", status: "queued", linkedPhaseId: "phase-3", version: 1, approvalRequired: true },
      { id: "d-3", title: "Funnel Blueprint", type: "funnel", status: "queued", linkedPhaseId: "phase-4", version: 1, approvalRequired: true },
      { id: "d-4", title: "VSL Script", type: "video", status: "queued", linkedPhaseId: "phase-4", version: 1, approvalRequired: true },
      { id: "d-5", title: "Email Sequences", type: "email", status: "queued", linkedPhaseId: "phase-4", version: 1, approvalRequired: false },
      { id: "d-6", title: "Content Calendar", type: "content", status: "queued", linkedPhaseId: "phase-5", version: 1, approvalRequired: false },
      { id: "d-7", title: "Sales Playbook", type: "sales", status: "queued", linkedPhaseId: "phase-7", version: 1, approvalRequired: true },
      { id: "d-8", title: "SOP Documentation", type: "operations", status: "queued", linkedPhaseId: "phase-10", version: 1, approvalRequired: false },
      { id: "d-9", title: "Community Playbook", type: "community", status: "queued", linkedPhaseId: "phase-9", version: 1, approvalRequired: false },
      { id: "d-10", title: "Performance Scorecard", type: "analytics", status: "queued", linkedPhaseId: "phase-12", version: 1, approvalRequired: false },
    ],
    updates: [
      {
        id: "update-1",
        title: "Mission initialized",
        message: "Your Tier 5 project tracker is live. The team is collecting inputs to start execution.",
        type: "system",
        createdAt: today,
      },
      {
        id: "update-2",
        title: "Execution plan locked",
        message: "12-phase buildout confirmed. First priority: complete onboarding and strategic alignment.",
        type: "milestone",
        createdAt: today,
      },
    ],
    teamMembers: [
      { id: "team-admin", name: "Agency Owner", role: "admin", focus: "Strategy, escalation, and scale decisions" },
      { id: "team-manager", name: "Success Manager", role: "manager", focus: "Client delivery, weekly reviews, and coordination" },
      { id: "team-executor-1", name: "Content Executor", role: "executor", focus: "Content production, assets, and publishing" },
      { id: "team-executor-2", name: "Video Editor", role: "executor", focus: "VSL, clips, reels, and repurposing" },
      { id: "team-executor-3", name: "Funnel Builder", role: "executor", focus: "Pages, emails, automations, and integrations" },
    ],
    sopTemplates: [
      {
        id: "sop-onboarding",
        title: "Client Onboarding SOP",
        purpose: "Start every client with clarity, trust, and execution readiness.",
        steps: [
          { id: "sop-onb-1", title: "Send welcome email", description: "Confirm timeline and communication format.", owner: "manager" },
          { id: "sop-onb-2", title: "Collect requirements", description: "Capture offer, audience, assets, and systems.", owner: "client" },
          { id: "sop-onb-3", title: "Lock kickoff call", description: "Define targets, milestones, and first sprint.", owner: "manager" },
        ],
      },
      {
        id: "sop-weekly-review",
        title: "Weekly Review SOP",
        purpose: "Keep execution predictable and unblock delivery every week.",
        steps: [
          { id: "sop-review-1", title: "Audit completions", description: "Review what shipped and what slipped.", owner: "manager" },
          { id: "sop-review-2", title: "Resolve blockers", description: "Escalate blocked actions and assign owners.", owner: "admin" },
          { id: "sop-review-3", title: "Set next priorities", description: "Publish next week priorities to team and client.", owner: "manager" },
        ],
      },
      {
        id: "sop-sales",
        title: "Sales Call SOP",
        purpose: "Ensure every sales call follows the proven framework.",
        steps: [
          { id: "sop-sales-1", title: "Pre-call prep", description: "Review lead data, notes, and qualification score.", owner: "manager" },
          { id: "sop-sales-2", title: "Run discovery", description: "Follow the call framework: pain, desire, solution.", owner: "manager" },
          { id: "sop-sales-3", title: "Close or next step", description: "Present offer, handle objections, close or book follow-up.", owner: "manager" },
          { id: "sop-sales-4", title: "Post-call update", description: "Update CRM, send follow-up, log outcome.", owner: "team" },
        ],
      },
    ],
    funnelStages: [
      { id: "funnel-traffic", title: "Traffic", metricLabel: "Visitors", metricValue: "—", status: "stable" },
      { id: "funnel-optin", title: "Opt-in", metricLabel: "Rate", metricValue: "—", status: "stable" },
      { id: "funnel-nurture", title: "Nurture", metricLabel: "Open rate", metricValue: "—", status: "stable" },
      { id: "funnel-vsl", title: "VSL/Sales", metricLabel: "Watch %", metricValue: "—", status: "stable" },
      { id: "funnel-booking", title: "Booking", metricLabel: "Booked", metricValue: "—", status: "stable" },
      { id: "funnel-show", title: "Show", metricLabel: "Show rate", metricValue: "—", status: "stable" },
      { id: "funnel-close", title: "Close", metricLabel: "Close rate", metricValue: "—", status: "stable" },
    ],
    automationRules: [
      { id: "auto-1", title: "Advance on completion", trigger: "Action status = completed", action: "Set next dependent action to in_progress and notify owner", enabled: true },
      { id: "auto-2", title: "Deadline breach alert", trigger: "Due date passed and action not completed", action: "Mark as blocked and notify admin + manager", enabled: true },
      { id: "auto-3", title: "New lead handoff", trigger: "Lead form submitted", action: "Notify sales manager and create follow-up action", enabled: true },
      { id: "auto-4", title: "No-show recovery", trigger: "Call marked as no-show", action: "Trigger re-engagement sequence and notify manager", enabled: true },
      { id: "auto-5", title: "Client approval reminder", trigger: "Approval pending > 48 hours", action: "Send reminder to client and notify manager", enabled: true },
    ],
    crmPipeline: [
      { id: "crm-lead", title: "Lead", count: 0 },
      { id: "crm-qualified", title: "Qualified", count: 0 },
      { id: "crm-booked", title: "Booked", count: 0 },
      { id: "crm-showed", title: "Showed", count: 0 },
      { id: "crm-proposal", title: "Proposal", count: 0 },
      { id: "crm-closed", title: "Closed", count: 0 },
      { id: "crm-onboarded", title: "Onboarded", count: 0 },
    ],
    contentPipeline: [
      { id: "content-1", stage: "youtube", title: "Long-form episode", status: "pending" },
      { id: "content-2", stage: "clips", title: "Short clips extracted", status: "pending" },
      { id: "content-3", stage: "reels", title: "Reel variations", status: "pending" },
      { id: "content-4", stage: "posts", title: "Carousel + static posts", status: "pending" },
    ],
    communicationThreads: [],
    executionColumns: [
      { id: "col-1", title: "Agreement & payment", status: "in_progress", owner: "client", notes: "Contract signed and onboarding payment confirmed." },
      { id: "col-2", title: "Client intake", status: "pending", owner: "client", notes: "Client submits intake form with offer and audience details." },
      { id: "col-3", title: "Asset collection", status: "pending", owner: "client", notes: "Collect brand assets, links, testimonials, and funnel data." },
      { id: "col-4", title: "Kickoff call", status: "pending", owner: "manager", notes: "Align goals, timeline, and execution priorities." },
      { id: "col-5", title: "Offer design", status: "pending", owner: "manager", notes: "Refine promise, pricing, and delivery model." },
      { id: "col-6", title: "Positioning & messaging", status: "pending", owner: "manager", notes: "Lock hooks, positioning, and messaging pillars." },
      { id: "col-7", title: "Funnel build", status: "pending", owner: "team", notes: "Build all pages, emails, and booking flow." },
      { id: "col-8", title: "VSL production", status: "pending", owner: "team", notes: "Script, record, edit, and publish VSL." },
      { id: "col-9", title: "Content system", status: "pending", owner: "team", notes: "Build repeatable content pipeline." },
      { id: "col-10", title: "Traffic activation", status: "pending", owner: "team", notes: "Launch organic and paid traffic sources." },
      { id: "col-11", title: "CRM setup", status: "pending", owner: "team", notes: "Build pipeline, scoring, and follow-ups." },
      { id: "col-12", title: "Sales training", status: "pending", owner: "manager", notes: "Script, framework, role play, and KPIs." },
      { id: "col-13", title: "Automation build", status: "pending", owner: "team", notes: "Connect all triggers and notifications." },
      { id: "col-14", title: "Community launch", status: "pending", owner: "manager", notes: "Platform, structure, content, and moderation." },
      { id: "col-15", title: "Platform training", status: "pending", owner: "manager", notes: "Full system walkthrough and SOP delivery." },
      { id: "col-16", title: "Launch execution", status: "pending", owner: "team", notes: "Go live, first leads, first revenue." },
      { id: "col-17", title: "Optimization", status: "pending", owner: "manager", notes: "Test, improve, and scale what works." },
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
