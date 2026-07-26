import { type BoardNode, type BoardConnector, type NodeKind, type ConnectorStyle, uid, cid } from "./types";

export interface BoardTemplate {
  name: string;
  icon: string;
  category: string;
  desc: string;
  nodes: Omit<BoardNode, "id" | "zIndex">[];
  connectors: { fromIdx: number; toIdx: number; label?: string; color?: string; style?: ConnectorStyle }[];
}

/* ─── shorthand helpers ─────────────────────────────── */
type N = Omit<BoardNode, "id" | "zIndex">;
const nd = (kind: NodeKind, x: number, y: number, w: number, h: number, title: string, extra?: Partial<N>): N =>
  ({ kind, x, y, w, h, title, ...extra });
const lk = (fromIdx: number, toIdx: number, label?: string, color?: string, style?: ConnectorStyle) =>
  ({ fromIdx, toIdx, label, color, style });

/* ─── Template categories ────────────────────────────── */
export const TEMPLATE_CATEGORIES = ["All", "Process", "Strategy", "Engineering", "Planning", "Team", "AI & Tech", "Marketing"];

/* ─── All 20 templates ───────────────────────────────── */
export const TEMPLATES: BoardTemplate[] = [

  /* 1 ─ Process Flowchart */
  {
    name: "Process Flowchart",
    icon: "🔀",
    category: "Process",
    desc: "Decision branches with start/end terminals — drag & drop to reroute",
    nodes: [
      nd("terminator", 340, 40,  200, 55, "Start", { color: "#14532d", borderColor: "#22c55e" }),
      nd("process",    320, 155, 240, 70, "Receive Request", { color: "#1e3a5f" }),
      nd("process",    320, 285, 240, 70, "Validate Input",  { color: "#1e3a5f" }),
      nd("decision",   290, 420, 300, 120,"Input Valid?"),
      nd("process",    620, 440, 210, 70, "Return 400 Error", { color: "#450a0a" }),
      nd("process",    320, 610, 240, 70, "Process Request",  { color: "#1e3a5f" }),
      nd("process",    320, 740, 240, 70, "Build Response",   { color: "#1e3a5f" }),
      nd("terminator", 340, 870, 200, 55, "End", { color: "#14532d", borderColor: "#22c55e" }),
      nd("sticky-pink",  660, 290, 170, 80, "Validation Rules", { body: "Schema · Auth · Rate limit" }),
      nd("sticky-orange",660, 610, 170, 80, "Processing", { body: "DB query · Transform · Cache" }),
    ],
    connectors: [
      lk(0,1), lk(1,2), lk(2,3),
      lk(3,4, "No",  "#ef4444"),
      lk(3,5, "Yes", "#22c55e"),
      lk(4,7, "",    "#ef4444"),
      lk(5,6), lk(6,7),
    ],
  },

  /* 2 ─ Mind Map */
  {
    name: "Mind Map",
    icon: "🧠",
    category: "Strategy",
    desc: "Radial idea map — center topic with main branches and subtopics",
    nodes: [
      nd("sticky-yellow", 390, 250, 220, 90, "Central Idea", { body: "Your core concept" }),
      // Right branches
      nd("sticky-blue",  690, 80,  170, 65, "Topic A"),
      nd("sticky-blue",  700, 265, 170, 65, "Topic B"),
      nd("sticky-blue",  690, 450, 170, 65, "Topic C"),
      // Left branches
      nd("sticky-green", 120, 80,  170, 65, "Topic D"),
      nd("sticky-green", 110, 265, 170, 65, "Topic E"),
      nd("sticky-green", 120, 450, 170, 65, "Topic F"),
      // Right subtopics
      nd("text", 940, 55,  160, 45, "Sub-idea A1"),
      nd("text", 940, 120, 160, 45, "Sub-idea A2"),
      nd("text", 950, 238, 160, 45, "Sub-idea B1"),
      nd("text", 950, 298, 160, 45, "Sub-idea B2"),
      nd("text", 940, 420, 160, 45, "Sub-idea C1"),
      nd("text", 940, 480, 160, 45, "Sub-idea C2"),
      // Left subtopics
      nd("text", -120, 55,  160, 45, "Sub-idea D1"),
      nd("text", -120, 120, 160, 45, "Sub-idea D2"),
      nd("text", -130, 238, 160, 45, "Sub-idea E1"),
      nd("text", -130, 298, 160, 45, "Sub-idea E2"),
      nd("text", -120, 420, 160, 45, "Sub-idea F1"),
      nd("text", -120, 480, 160, 45, "Sub-idea F2"),
    ],
    connectors: [
      lk(0,1), lk(0,2), lk(0,3), lk(0,4), lk(0,5), lk(0,6),
      lk(1,7), lk(1,8), lk(2,9), lk(2,10), lk(3,11), lk(3,12),
      lk(4,13), lk(4,14), lk(5,15), lk(5,16), lk(6,17), lk(6,18),
    ],
  },

  /* 3 ─ Kanban Board */
  {
    name: "Kanban Board",
    icon: "📋",
    category: "Planning",
    desc: "4-column sprint board — Todo → In Progress → In Review → Done",
    nodes: [
      // Column headers (frames)
      nd("frame", 0,   0, 240, 560, "Todo"),
      nd("frame", 260, 0, 240, 560, "In Progress"),
      nd("frame", 520, 0, 240, 560, "In Review"),
      nd("frame", 780, 0, 240, 560, "Done"),
      // Todo cards
      nd("kanban-card", 20,  60, 200, 110, "Design new onboarding", { body: "Update the welcome flow for new users", priority: "high",   status: "todo", assignee: "JS" }),
      nd("kanban-card", 20, 185, 200, 110, "Write API docs",        { body: "Document all v2 endpoints",             priority: "medium", status: "todo", assignee: "KL" }),
      nd("kanban-card", 20, 310, 200, 110, "Set up analytics",      { body: "Integrate Mixpanel events",             priority: "low",    status: "todo", assignee: "AS" }),
      // In Progress cards
      nd("kanban-card", 280, 60,  200, 110, "Build board builder",  { body: "Miro-like canvas editor",   priority: "urgent", status: "inprogress", assignee: "AR" }),
      nd("kanban-card", 280, 185, 200, 110, "Auth refactor",        { body: "Migrate to JWT + refresh",  priority: "high",   status: "inprogress", assignee: "DM" }),
      // In Review cards
      nd("kanban-card", 540, 60,  200, 110, "Mobile responsive",    { body: "Viewport fixes across pages", priority: "high", status: "review", assignee: "PR" }),
      nd("kanban-card", 540, 185, 200, 110, "Performance audit",    { body: "Lighthouse score to 90+",    priority: "medium", status: "review", assignee: "JS" }),
      // Done cards
      nd("kanban-card", 800, 60,  200, 110, "Landing page v2",      { body: "Redesigned hero + CTA",   priority: "high", status: "done", assignee: "LM" }),
      nd("kanban-card", 800, 185, 200, 110, "Email sequences",      { body: "Onboarding email drip",   priority: "medium", status: "done", assignee: "AS" }),
    ],
    connectors: [],
  },

  /* 4 ─ Business Model Canvas */
  {
    name: "Business Model Canvas",
    icon: "🏛",
    category: "Strategy",
    desc: "Osterwalder's 9-block canvas — partners, activities, value prop, segments",
    nodes: [
      nd("frame", 0,   0,  230, 260, "Key Partners",      { borderColor: "#7c3aed" }),
      nd("frame", 240, 0,  230, 130, "Key Activities",    { borderColor: "#2563eb" }),
      nd("frame", 480, 0,  240, 260, "Value Proposition", { borderColor: "#d4b461" }),
      nd("frame", 730, 0,  230, 130, "Customer Relationships", { borderColor: "#059669" }),
      nd("frame", 970, 0,  230, 260, "Customer Segments", { borderColor: "#dc2626" }),
      nd("frame", 240, 140, 230, 120, "Key Resources",    { borderColor: "#2563eb" }),
      nd("frame", 730, 140, 230, 120, "Channels",         { borderColor: "#059669" }),
      nd("frame", 0,  270, 590, 130, "Cost Structure",    { borderColor: "#64748b" }),
      nd("frame", 600,270, 600, 130, "Revenue Streams",   { borderColor: "#d97706" }),
      // Content stickies
      nd("sticky-purple", 20,  50,  185, 75, "Strategic Partners", { body: "Suppliers · Alliances · JVs" }),
      nd("sticky-purple", 20, 140,  185, 75, "Investor Relations", { body: "Funding · Board · Advisors" }),
      nd("sticky-blue",  260,  25,  185, 70, "Content Production", { body: "Create & distribute" }),
      nd("sticky-blue",  260, 150,  185, 60, "AI Platform",        { body: "Models · APIs · Data" }),
      nd("sticky-yellow",500,  30,  195, 90, "AI-powered growth",  { body: "10x content output with intelligent automation" }),
      nd("sticky-yellow",500, 140,  195, 75, "Niche authority",    { body: "Become the go-to expert fast" }),
      nd("sticky-green", 750,  25,  185, 70, "1-on-1 coaching",    { body: "Weekly strategy calls" }),
      nd("sticky-green", 750, 150,  185, 60, "Community",          { body: "Private member group" }),
      nd("sticky-red",   990,  50,  185, 75, "Creators & coaches", { body: "10K-500K followers" }),
      nd("sticky-red",   990, 140,  185, 75, "B2B SaaS founders",  { body: "Scale with content" }),
      nd("sticky-teal",   25, 295,  260, 75, "Team · Tools · Ads", { body: "Fixed monthly overhead" }),
      nd("sticky-teal",  620, 295,  260, 75, "Monthly retainers",  { body: "Recurring subscriptions" }),
      nd("sticky-orange", 890, 295, 260, 75, "Enterprise licenses", { body: "Platform licensing deals" }),
    ],
    connectors: [],
  },

  /* 5 ─ SWOT Analysis */
  {
    name: "SWOT Analysis",
    icon: "🎯",
    category: "Strategy",
    desc: "Strengths · Weaknesses · Opportunities · Threats across 4 quadrants",
    nodes: [
      nd("frame",  0,  0, 380, 300, "Strengths",     { borderColor: "#22c55e" }),
      nd("frame",400,  0, 380, 300, "Weaknesses",    { borderColor: "#ef4444" }),
      nd("frame",  0,320, 380, 300, "Opportunities", { borderColor: "#3b82f6" }),
      nd("frame",400,320, 380, 300, "Threats",       { borderColor: "#f59e0b" }),
      // Strengths
      nd("sticky-green",  20,  50, 165, 75, "AI-first platform",   { body: "10x faster content creation" }),
      nd("sticky-green",  20, 145, 165, 75, "Strong community",    { body: "High retention & NPS" }),
      nd("sticky-green", 200,  50, 165, 75, "Proven ROI",          { body: "Avg 3x revenue in 90 days" }),
      nd("sticky-green", 200, 145, 165, 75, "Expert team",         { body: "10+ years niche experience" }),
      // Weaknesses
      nd("sticky-red",  420,  50, 165, 75, "High price point",    { body: "Limits TAM significantly" }),
      nd("sticky-red",  420, 145, 165, 75, "Manual onboarding",   { body: "Takes 2-3 weeks to get value" }),
      nd("sticky-red",  605,  50, 165, 75, "Limited integrations",{ body: "Missing key platforms" }),
      nd("sticky-red",  605, 145, 165, 75, "Small sales team",    { body: "Bottleneck on growth" }),
      // Opportunities
      nd("sticky-blue",  20, 370, 165, 75, "AI boom",             { body: "Market timing is perfect" }),
      nd("sticky-blue",  20, 465, 165, 75, "Global expansion",    { body: "Untapped markets in EU/APAC" }),
      nd("sticky-blue", 200, 370, 165, 75, "Platform play",       { body: "Become the Salesforce of content" }),
      nd("sticky-blue", 200, 465, 165, 75, "Enterprise segment",  { body: "High ACV, low churn" }),
      // Threats
      nd("sticky-orange",420, 370, 165, 75, "Big tech competitors",{ body: "Meta/Google entering space" }),
      nd("sticky-orange",420, 465, 165, 75, "Economic downturn",  { body: "Marketing budgets cut first" }),
      nd("sticky-orange",605, 370, 165, 75, "AI commoditization", { body: "Tools getting cheaper" }),
      nd("sticky-orange",605, 465, 165, 75, "Algorithm changes",  { body: "Platform dependency risk" }),
    ],
    connectors: [],
  },

  /* 6 ─ Customer Journey Map */
  {
    name: "Customer Journey Map",
    icon: "🧭",
    category: "Process",
    desc: "5-stage journey from Awareness → Advocacy with touchpoints & emotions",
    nodes: [
      // Stage headers
      nd("process",  60, 30, 180, 60, "Awareness",    { color: "#1e1b4b" }),
      nd("process", 270, 30, 180, 60, "Consideration",{ color: "#1e3a5f" }),
      nd("process", 480, 30, 180, 60, "Decision",     { color: "#14532d" }),
      nd("process", 690, 30, 180, 60, "Retention",    { color: "#451a03" }),
      nd("process", 900, 30, 180, 60, "Advocacy",     { color: "#4a044e" }),
      // Touchpoints row
      nd("sticky-blue",  60, 120, 180, 110, "Touchpoints", { body: "Social ads\nGoogle search\nWord of mouth" }),
      nd("sticky-blue", 270, 120, 180, 110, "Touchpoints", { body: "Website\nCase studies\nFree webinar" }),
      nd("sticky-blue", 480, 120, 180, 110, "Touchpoints", { body: "Demo call\nProposal\nTrial" }),
      nd("sticky-blue", 690, 120, 180, 110, "Touchpoints", { body: "Onboarding\nWeekly calls\nResults" }),
      nd("sticky-blue", 900, 120, 180, 110, "Touchpoints", { body: "Referral ask\nTestimonials\nAffiliate" }),
      // Emotions row
      nd("sticky-yellow",  60, 255, 180, 90, "🤔 Curious",    { body: "Problem aware, seeking solutions" }),
      nd("sticky-yellow", 270, 255, 180, 90, "🔍 Evaluating", { body: "Comparing options carefully" }),
      nd("sticky-yellow", 480, 255, 180, 90, "😰 Anxious",    { body: "Is this worth the investment?" }),
      nd("sticky-yellow", 690, 255, 180, 90, "😊 Satisfied",  { body: "Seeing early results & wins" }),
      nd("sticky-yellow", 900, 255, 180, 90, "🤩 Delighted",  { body: "Raving fan, tells everyone" }),
      // Opportunities row
      nd("sticky-green",  60, 370, 180, 90, "Opportunity", { body: "Better targeting, clearer pain messaging" }),
      nd("sticky-green", 270, 370, 180, 90, "Opportunity", { body: "More social proof, video testimonials" }),
      nd("sticky-green", 480, 370, 180, 90, "Opportunity", { body: "Reduce friction, clearer ROI calculator" }),
      nd("sticky-green", 690, 370, 180, 90, "Opportunity", { body: "Faster time-to-value, quick wins" }),
      nd("sticky-green", 900, 370, 180, 90, "Opportunity", { body: "Structured referral incentive program" }),
    ],
    connectors: [
      lk(0,1), lk(1,2), lk(2,3), lk(3,4),
    ],
  },

  /* 7 ─ Sprint Retrospective */
  {
    name: "Sprint Retrospective",
    icon: "🔄",
    category: "Planning",
    desc: "Went Well · To Improve · Action Items — run your retro in real time",
    nodes: [
      nd("frame",  0,  0, 280, 580, "✅ Went Well",   { borderColor: "#22c55e" }),
      nd("frame",300,  0, 280, 580, "🔧 To Improve",  { borderColor: "#f59e0b" }),
      nd("frame",600,  0, 280, 580, "🚀 Action Items", { borderColor: "#3b82f6" }),
      // Went well
      nd("sticky-green",  20,  60, 240, 90, "Shipping velocity",   { body: "We hit all 3 sprint goals" }),
      nd("sticky-green",  20, 170, 240, 90, "Cross-team collab",   { body: "Design-eng sync worked great" }),
      nd("sticky-green",  20, 280, 240, 90, "Code review quality", { body: "Thorough reviews, fewer bugs" }),
      nd("sticky-green",  20, 390, 240, 90, "Documentation",       { body: "All PRs had proper docs" }),
      // To improve
      nd("sticky-orange", 320,  60, 240, 90, "Estimation accuracy",{ body: "5 of 8 stories underestimated" }),
      nd("sticky-orange", 320, 170, 240, 90, "Meeting overload",   { body: "Too many unnecessary syncs" }),
      nd("sticky-orange", 320, 280, 240, 90, "Tech debt backlog",  { body: "Growing and unaddressed" }),
      nd("sticky-orange", 320, 390, 240, 90, "Late PR reviews",    { body: "PRs sitting 2+ days" }),
      // Action items
      nd("sticky-blue",  620,  60, 240, 90, "Use planning poker",  { body: "Owner: Aryan | Next sprint" }),
      nd("sticky-blue",  620, 170, 240, 90, "Cut standups to 10m", { body: "Owner: Dev Lead | Immediate" }),
      nd("sticky-blue",  620, 280, 240, 90, "Tech debt sprint",    { body: "Owner: CTO | Sprint +2" }),
      nd("sticky-blue",  620, 390, 240, 90, "24h PR SLA rule",     { body: "Owner: All | Immediate" }),
    ],
    connectors: [],
  },

  /* 8 ─ Product Roadmap */
  {
    name: "Product Roadmap",
    icon: "🗺",
    category: "Planning",
    desc: "Q1–Q4 feature timeline with priority tiers and team ownership",
    nodes: [
      // Quarter headers
      nd("process",  40, 0, 220, 55, "Q1 — Foundation",  { color: "#1e3a5f" }),
      nd("process", 280, 0, 220, 55, "Q2 — Growth",      { color: "#14532d" }),
      nd("process", 520, 0, 220, 55, "Q3 — Scale",       { color: "#451a03" }),
      nd("process", 760, 0, 220, 55, "Q4 — Expansion",   { color: "#4a044e" }),
      // Q1 features
      nd("kanban-card",  50,  80, 200, 110, "Board Builder", { body: "Miro-like canvas tool", priority: "urgent", status: "inprogress", assignee: "FE" }),
      nd("kanban-card",  50, 205, 200, 110, "AI Generation", { body: "Groq-powered board AI",  priority: "high",   status: "inprogress", assignee: "BE" }),
      nd("kanban-card",  50, 330, 200, 110, "Auth 2.0",      { body: "SSO + 2FA support",      priority: "high",   status: "todo",       assignee: "BE" }),
      // Q2 features
      nd("kanban-card", 290,  80, 200, 110, "Real-time collab",  { body: "Live multi-user boards", priority: "urgent", status: "todo", assignee: "FE" }),
      nd("kanban-card", 290, 205, 200, 110, "Integrations hub",  { body: "Notion · Slack · Jira",  priority: "high",   status: "todo", assignee: "BE" }),
      nd("kanban-card", 290, 330, 200, 110, "Mobile app MVP",    { body: "React Native board view", priority: "medium", status: "todo", assignee: "MO" }),
      // Q3 features
      nd("kanban-card", 530,  80, 200, 110, "Presenter mode",    { body: "Slide through board frames", priority: "medium", status: "todo", assignee: "FE" }),
      nd("kanban-card", 530, 205, 200, 110, "Analytics v2",      { body: "Board usage & engagement",  priority: "low",    status: "todo", assignee: "BE" }),
      nd("kanban-card", 530, 330, 200, 110, "Export suite",      { body: "PDF · SVG · PNG · CSV",     priority: "medium", status: "todo", assignee: "FE" }),
      // Q4 features
      nd("kanban-card", 770,  80, 200, 110, "Enterprise tier",   { body: "SSO · Audit logs · Admin",  priority: "high", status: "todo", assignee: "BE" }),
      nd("kanban-card", 770, 205, 200, 110, "API v2",            { body: "Public developer API",      priority: "medium", status: "todo", assignee: "BE" }),
      nd("kanban-card", 770, 330, 200, 110, "White-label",       { body: "Custom branded workspaces", priority: "low",    status: "todo", assignee: "PM" }),
    ],
    connectors: [lk(0,1), lk(1,2), lk(2,3)],
  },

  /* 9 ─ AI / LLM Pipeline */
  {
    name: "AI / LLM Pipeline",
    icon: "🤖",
    category: "AI & Tech",
    desc: "End-to-end LLM workflow — input → RAG → prompt → model → output",
    nodes: [
      // Main pipeline (horizontal)
      nd("person",      40,  200, 120, 120, "User", { body: "Natural language input" }),
      nd("process",    220,  220, 190, 80,  "Input Handler",    { color: "#1e1b4b" }),
      nd("ai-node",    470,  210, 220, 100, "Prompt Engineer",  { modelName: "LangChain", body: "Context injection + few-shot" }),
      nd("ai-node",    750,  210, 220, 100, "LLM Model",        { modelName: "GPT-4 / Claude", body: "Temperature: 0.7 · Max tokens: 4096" }),
      nd("process",   1030,  220, 190, 80,  "Response Parser",  { color: "#1e1b4b" }),
      nd("process",   1280,  220, 190, 80,  "Output Handler",   { color: "#1e1b4b" }),
      nd("person",    1520,  200, 120, 120, "User", { body: "Structured response" }),
      // Supporting components
      nd("database",   220,  60,  190, 80,  "Vector DB",        { body: "Pinecone · Weaviate · Chroma", color: "#1c1917" }),
      nd("process",    470,   60, 190, 80,  "RAG Retrieval",    { color: "#1c1917", body: "Semantic similarity search" }),
      nd("database",   470,  370, 190, 80,  "Conversation Memory", { body: "Redis · Session store", color: "#1c1917" }),
      nd("process",    750,   60, 220, 80,  "Tool/Function Calls", { color: "#1c1917", body: "Search · Code · APIs" }),
      nd("checklist",  1030,  60, 200, 160, "Safety Checks", {
        items: ["Content moderation", "PII detection", "Toxicity filter", "Rate limiting"],
        checked: [false, false, false, false],
      }),
      nd("ai-node",   1030,  370, 190, 80,  "Evaluator",        { modelName: "GPT-3.5", body: "Quality · Relevance · Accuracy" }),
      nd("database",  1280,   60, 190, 80,  "Audit Log",        { body: "Prompt + response history" }),
    ],
    connectors: [
      lk(0,1), lk(1,2, "", "#3b82f6"), lk(2,3, "prompt", "#d4b461"), lk(3,4), lk(4,5), lk(5,6),
      lk(7,8, "retrieve"), lk(8,2, "context", "#22c55e"),
      lk(3,10, "tools", "#8b5cf6"),
      lk(9,2, "history"),
      lk(4,11, "validate", "#ef4444"), lk(4,12, "score"),
      lk(5,13, "log"),
    ],
  },

  /* 10 ─ System Architecture */
  {
    name: "System Architecture",
    icon: "🏗",
    category: "Engineering",
    desc: "Multi-tier distributed system — client → CDN → load balancer → services → data",
    nodes: [
      // Client tier
      nd("browser",  60,  30, 150, 80, "Web App",    { body: "React · Vite", color: "#1e3a5f" }),
      nd("mobile",  230,  30, 150, 80, "Mobile App", { body: "React Native",  color: "#1e3a5f" }),
      // CDN
      nd("cloud",   470,  30, 220, 80, "CDN / Edge", { body: "Cloudflare · Assets · Cache", color: "#1c1917" }),
      // Load balancer
      nd("process", 470, 180, 220, 70, "Load Balancer", { body: "Nginx · Health checks · SSL", color: "#14532d" }),
      // App servers
      nd("server",  240, 320, 180, 90, "API Server 1", { body: "Node.js · Express", color: "#1e3a5f" }),
      nd("server",  440, 320, 180, 90, "API Server 2", { body: "Node.js · Express", color: "#1e3a5f" }),
      nd("server",  640, 320, 180, 90, "API Server 3", { body: "Node.js · Express", color: "#1e3a5f" }),
      // Message queue
      nd("process", 860, 180, 200, 70, "Message Queue", { body: "BullMQ · Redis Pub/Sub", color: "#451a03" }),
      // Microservices
      nd("component", 60,  480, 180, 80, "Auth Service",   { body: "JWT · OAuth · Sessions" }),
      nd("component", 260, 480, 180, 80, "Email Service",  { body: "Nodemailer · Templates" }),
      nd("component", 460, 480, 180, 80, "Media Service",  { body: "S3 · HLS · FFmpeg" }),
      nd("component", 660, 480, 180, 80, "AI Service",     { body: "Groq · OpenAI · Claude" }),
      nd("component", 860, 480, 180, 80, "Analytics",      { body: "Events · Reports" }),
      // Data tier
      nd("database", 100,  640, 190, 90, "Primary DB",     { body: "PostgreSQL · ACID",   color: "#1c1917" }),
      nd("database", 310,  640, 190, 90, "Read Replica",   { body: "Hot standby · Scale read", color: "#1c1917" }),
      nd("database", 520,  640, 190, 90, "Redis Cache",    { body: "Sessions · Rate limit · Pub/Sub", color: "#1c1917" }),
      nd("database", 730,  640, 190, 90, "Object Storage", { body: "S3 · Files · Videos", color: "#1c1917" }),
      nd("database", 940,  640, 190, 90, "Vector DB",      { body: "Pinecone · Embeddings", color: "#1c1917" }),
    ],
    connectors: [
      lk(0,2), lk(1,2), lk(2,3, "HTTPS"),
      lk(3,4), lk(3,5), lk(3,6),
      lk(4,8), lk(4,9), lk(5,10), lk(5,11), lk(6,12), lk(6,7),
      lk(7,9), lk(7,12),
      lk(8,13), lk(8,14),
      lk(4,15), lk(10,16), lk(11,17),
      lk(13,14, "replication"), lk(13,15, "write-through"),
    ],
  },

  /* 11 ─ OKR Framework */
  {
    name: "OKR Framework",
    icon: "🎖",
    category: "Strategy",
    desc: "Objective → Key Results → Initiatives — quarterly goal alignment",
    nodes: [
      nd("rounded-rect", 280, 20, 440, 80, "Objective: 10x revenue in 12 months", { color: "#92400e", borderColor: "#d4b461" }),
      // Key Results
      nd("process", 40,  180, 260, 75, "KR1: $1M ARR by Q4", { color: "#1e3a5f" }),
      nd("process", 320, 180, 260, 75, "KR2: 500 active clients", { color: "#14532d" }),
      nd("process", 600, 180, 260, 75, "KR3: NPS score > 70", { color: "#4a044e" }),
      // Initiatives under KR1
      nd("sticky-blue",  10, 330, 155, 90, "Launch affiliate program",   { body: "Target: 50 affiliates" }),
      nd("sticky-blue",  10, 440, 155, 90, "Cold outreach campaign",     { body: "500 qualified leads/mo" }),
      nd("sticky-blue", 175, 330, 155, 90, "Webinar series",             { body: "1 per week, 200 attendees" }),
      nd("sticky-blue", 175, 440, 155, 90, "Content SEO",                { body: "100 articles → 50K traffic" }),
      // Initiatives under KR2
      nd("sticky-green", 305, 330, 155, 90, "Reduce churn to <3%",      { body: "Success team expansion" }),
      nd("sticky-green", 305, 440, 155, 90, "Upsell existing clients",  { body: "Quarterly business reviews" }),
      nd("sticky-green", 470, 330, 155, 90, "Referral program",         { body: "20% fee for life" }),
      nd("sticky-green", 470, 440, 155, 90, "Enterprise plan launch",   { body: "Target 20 enterprise Qs" }),
      // Initiatives under KR3
      nd("sticky-purple", 585, 330, 155, 90, "Onboarding overhaul",     { body: "Time-to-value < 7 days" }),
      nd("sticky-purple", 585, 440, 155, 90, "Support SLA: < 2h",       { body: "Hire 2 success managers" }),
      nd("sticky-purple", 750, 330, 155, 90, "Monthly deep dives",      { body: "Strategy + results review" }),
      nd("sticky-purple", 750, 440, 155, 90, "Community platform",      { body: "Peer-to-peer learning hub" }),
    ],
    connectors: [
      lk(0,1), lk(0,2), lk(0,3),
      lk(1,4), lk(1,5), lk(1,6), lk(1,7),
      lk(2,8), lk(2,9), lk(2,10), lk(2,11),
      lk(3,12), lk(3,13), lk(3,14), lk(3,15),
    ],
  },

  /* 12 ─ Empathy Map */
  {
    name: "Empathy Map",
    icon: "❤",
    category: "Strategy",
    desc: "Says · Thinks · Does · Feels quadrants + Pains & Gains for your user",
    nodes: [
      nd("person",    380, 180, 130, 130, "Your User", { body: "Content Creator" }),
      nd("frame",       0,   0, 380, 310, "💬 Says",  { borderColor: "#3b82f6" }),
      nd("frame",     400,   0, 380, 310, "💭 Thinks", { borderColor: "#8b5cf6" }),
      nd("frame",       0, 320, 380, 310, "🏃 Does",   { borderColor: "#22c55e" }),
      nd("frame",     400, 320, 380, 310, "❤ Feels",   { borderColor: "#ec4899" }),
      nd("frame",       0, 645, 380, 230, "😣 Pains",  { borderColor: "#ef4444" }),
      nd("frame",     400, 645, 380, 230, "🌟 Gains",  { borderColor: "#d4b461" }),
      // Says
      nd("sticky-blue",  15,  50, 165, 75, "I need to post daily",  { body: "Consistency is killing me" }),
      nd("sticky-blue",  15, 145, 165, 75, "I wish I had more time", { body: "Takes 6 hours per video" }),
      nd("sticky-blue", 200,  50, 165, 75, "AI tools are the future", { body: "But hard to use correctly" }),
      nd("sticky-blue", 200, 145, 165, 75, "My views keep dropping", { body: "Algorithm is unpredictable" }),
      // Thinks
      nd("sticky-purple", 415,  50, 165, 75, "Am I good enough?",    { body: "Imposter syndrome daily" }),
      nd("sticky-purple", 415, 145, 165, 75, "Will this ever scale?", { body: "Feels like a treadmill" }),
      nd("sticky-purple", 600,  50, 165, 75, "ROI on my content",     { body: "No clear attribution" }),
      nd("sticky-purple", 600, 145, 165, 75, "Competitors growing",   { body: "They're doing something I'm not" }),
      // Does
      nd("sticky-green",  15, 370, 165, 75, "Posts 3x/week",          { body: "Despite exhaustion" }),
      nd("sticky-green",  15, 465, 165, 75, "Studies top creators",   { body: "Copying formats obsessively" }),
      nd("sticky-green", 200, 370, 165, 75, "Edits videos manually",  { body: "CapCut + Premiere for 5h" }),
      nd("sticky-green", 200, 465, 165, 75, "Tries every new tool",   { body: "Tool hopping problem" }),
      // Feels
      nd("sticky-pink",  415, 370, 165, 75, "Overwhelmed",   { body: "Too much to do alone" }),
      nd("sticky-pink",  415, 465, 165, 75, "Excited by AI", { body: "Hopeful about the future" }),
      nd("sticky-pink",  600, 370, 165, 75, "Lonely",        { body: "No community around them" }),
      nd("sticky-pink",  600, 465, 165, 75, "Determined",    { body: "Won't give up on the dream" }),
      // Pains
      nd("sticky-red",   15, 700, 165, 90, "No time for quality", { body: "Choose: quantity or quality" }),
      nd("sticky-red",  200, 700, 165, 90, "No clear strategy",   { body: "Posting without direction" }),
      // Gains
      nd("sticky-teal", 415, 700, 165, 90, "10x content speed",   { body: "AI handles the heavy lift" }),
      nd("sticky-teal", 600, 700, 165, 90, "Clear ROI metrics",   { body: "Know exactly what drives growth" }),
    ],
    connectors: [],
  },

  /* 13 ─ User Story Map */
  {
    name: "User Story Map",
    icon: "🗂",
    category: "Planning",
    desc: "Activities → User Tasks → Stories — horizontal journey for backlog planning",
    nodes: [
      // Activity headers
      nd("process",  60, 20, 200, 65, "Discover Platform", { color: "#1e1b4b" }),
      nd("process", 280, 20, 200, 65, "Sign Up",           { color: "#1e3a5f" }),
      nd("process", 500, 20, 200, 65, "Onboarding",        { color: "#14532d" }),
      nd("process", 720, 20, 200, 65, "Create Content",    { color: "#451a03" }),
      nd("process", 940, 20, 200, 65, "Publish & Analyse", { color: "#4a044e" }),
      // User Tasks (journey backbone)
      nd("sticky-blue",  60, 110, 180, 80, "Find via Google", { body: "SEO / Ads" }),
      nd("sticky-blue", 280, 110, 180, 80, "Create account",  { body: "Email or OAuth" }),
      nd("sticky-blue", 500, 110, 180, 80, "Complete survey", { body: "Niche + goals" }),
      nd("sticky-blue", 720, 110, 180, 80, "Use AI tools",    { body: "Ideas + scripts" }),
      nd("sticky-blue", 940, 110, 180, 80, "Schedule posts",  { body: "Multi-platform" }),
      // Stories — row 1 (MVP)
      nd("sticky-yellow",  60, 215, 175, 85, "View landing page",   { body: "As a visitor I want..." }),
      nd("sticky-yellow", 280, 215, 175, 85, "Email signup",        { body: "As a new user..." }),
      nd("sticky-yellow", 500, 215, 175, 85, "Watch intro video",   { body: "As a new user..." }),
      nd("sticky-yellow", 720, 215, 175, 85, "Generate AI ideas",   { body: "As a creator..." }),
      nd("sticky-yellow", 940, 215, 175, 85, "Post to Instagram",   { body: "As a creator..." }),
      // Stories — row 2
      nd("sticky-orange",  60, 315, 175, 80, "Read case studies",   { body: "Social proof" }),
      nd("sticky-orange", 280, 315, 175, 80, "OAuth with Google",   { body: "Faster signup" }),
      nd("sticky-orange", 500, 315, 175, 80, "Connect accounts",    { body: "Link IG/YT/TT" }),
      nd("sticky-orange", 720, 315, 175, 80, "Write with AI coach", { body: "AI caption help" }),
      nd("sticky-orange", 940, 315, 175, 80, "View analytics",      { body: "Engagement data" }),
    ],
    connectors: [
      lk(0,1), lk(1,2), lk(2,3), lk(3,4),
      lk(0,5), lk(1,6), lk(2,7), lk(3,8), lk(4,9),
      lk(5,10), lk(6,11), lk(7,12), lk(8,13), lk(9,14),
    ],
  },

  /* 14 ─ Sales Funnel */
  {
    name: "Sales Funnel",
    icon: "🏆",
    category: "Marketing",
    desc: "Full funnel from Awareness → Purchase with conversion metrics",
    nodes: [
      nd("process", 230,  20, 540, 75, "🌐 Awareness — 50,000 impressions/mo",  { color: "#1e1b4b" }),
      nd("process", 280,  115, 440, 75, "👀 Interest — 5,000 website visitors",  { color: "#1e3a5f" }),
      nd("process", 330, 210, 340, 75, "🤔 Consideration — 1,200 leads",         { color: "#14532d" }),
      nd("process", 380, 305, 240, 75, "🎯 Intent — 400 booked calls",           { color: "#451a03" }),
      nd("process", 430, 400, 140, 75, "💰 Purchase — 80 clients",               { color: "#713f12" }),
      nd("process", 480, 495,  40, 60, "🔄 Upsell — 30",                         { color: "#4a044e" }),
      // Metrics column
      nd("sticky-blue",  820,  20, 200, 75, "Conversion: 10%",   { body: "Organic: 60%\nPaid: 40%" }),
      nd("sticky-blue",  820, 115, 200, 75, "Conversion: 24%",   { body: "Avg time: 3.2 min" }),
      nd("sticky-blue",  820, 210, 200, 75, "Conversion: 33%",   { body: "Lead magnet: PDF" }),
      nd("sticky-blue",  820, 305, 200, 75, "Conversion: 20%",   { body: "Close rate on calls" }),
      nd("sticky-blue",  820, 400, 200, 75, "AOV: $4,800",       { body: "LTV: $14,400 avg" }),
      // Tactics column
      nd("sticky-orange",  10,  20, 200, 75, "📱 Social content", { body: "3 posts/day across platforms" }),
      nd("sticky-orange",  10, 115, 200, 75, "🔍 SEO articles",   { body: "10 new articles/week" }),
      nd("sticky-orange",  10, 210, 200, 75, "📧 Email sequence", { body: "7-email welcome drip" }),
      nd("sticky-orange",  10, 305, 200, 75, "📞 Strategy call",  { body: "45-min discovery call" }),
      nd("sticky-orange",  10, 400, 200, 75, "🤝 Onboarding",     { body: "Week 1 kickoff call" }),
    ],
    connectors: [
      lk(0,1, "10% CTR"), lk(1,2, "24% opt-in"), lk(2,3, "33% show"),
      lk(3,4, "20% close"), lk(4,5, "37% upsell"),
    ],
  },

  /* 15 ─ Data Pipeline */
  {
    name: "Data Pipeline",
    icon: "📊",
    category: "Engineering",
    desc: "Sources → Ingestion → Transform → Warehouse → Analytics → Dashboard",
    nodes: [
      // Sources
      nd("component",  40, 180, 160, 80, "App Events",     { body: "User actions · Clicks", color: "#1e3a5f" }),
      nd("component",  40, 290, 160, 80, "CRM Data",       { body: "Contacts · Deals",      color: "#1e3a5f" }),
      nd("component",  40, 400, 160, 80, "Payment Events", { body: "Stripe webhooks",       color: "#1e3a5f" }),
      nd("component",  40,  70, 160, 80, "Server Logs",    { body: "API · Error · Perf",    color: "#1e3a5f" }),
      // Ingestion
      nd("process",   270, 240, 200, 80, "Event Collector",  { body: "Kafka · Firehose", color: "#14532d" }),
      nd("process",   270, 360, 200, 80, "Batch ETL",        { body: "Airbyte · Fivetran", color: "#14532d" }),
      // Transform
      nd("process",   530, 240, 200, 80, "Stream Process",   { body: "Flink · Spark Streaming", color: "#451a03" }),
      nd("process",   530, 360, 200, 80, "DBT Transform",    { body: "SQL models · Tests", color: "#451a03" }),
      // Warehouse
      nd("database",  790, 280, 200, 90, "Data Warehouse",   { body: "Snowflake · BigQuery · Redshift", color: "#1c1917" }),
      nd("database",  790, 390, 200, 90, "Data Lake",        { body: "S3 · Parquet · Delta Lake", color: "#1c1917" }),
      // Analytics
      nd("process",  1050, 280, 200, 80, "dbt Models",       { body: "Dimensional models", color: "#1e1b4b" }),
      nd("ai-node",  1050, 380, 200, 80, "ML Platform",      { modelName: "SageMaker", body: "Forecasting · Anomaly" }),
      // Output
      nd("component",1310, 180, 180, 80, "Dashboard",        { body: "Looker · Metabase",  color: "#4a044e" }),
      nd("component",1310, 280, 180, 80, "Alerts",           { body: "PagerDuty · Slack",  color: "#4a044e" }),
      nd("component",1310, 380, 180, 80, "ML API",           { body: "Predictions served", color: "#4a044e" }),
    ],
    connectors: [
      lk(0,4), lk(3,4), lk(1,5), lk(2,5),
      lk(4,6), lk(5,7),
      lk(6,8), lk(7,8), lk(7,9),
      lk(8,10), lk(9,10), lk(8,11),
      lk(10,12), lk(10,13), lk(11,14),
    ],
  },

  /* 16 ─ Org Chart */
  {
    name: "Org Chart",
    icon: "🏢",
    category: "Team",
    desc: "Company hierarchy — CEO → executive team → department leads → ICs",
    nodes: [
      nd("person",    430, 20,  160, 90, "Aryan Surana", { body: "Founder & CEO" }),
      nd("person",    120, 190, 160, 90, "CTO",           { body: "Engineering" }),
      nd("person",    320, 190, 160, 90, "CMO",           { body: "Marketing" }),
      nd("person",    520, 190, 160, 90, "CPO",           { body: "Product" }),
      nd("person",    720, 190, 160, 90, "COO",           { body: "Operations" }),
      // Engineering
      nd("person",    30,  360, 150, 80, "Dev Lead",      { body: "Frontend · Backend" }),
      nd("person",   195,  360, 150, 80, "DevOps",        { body: "Infra · CI/CD" }),
      // Marketing
      nd("person",   300,  360, 150, 80, "Growth Lead",   { body: "Paid · SEO" }),
      nd("person",   465,  360, 150, 80, "Content Lead",  { body: "Video · Social" }),
      // Product
      nd("person",   630,  360, 150, 80, "PM",            { body: "Roadmap · UX" }),
      nd("person",   795,  360, 150, 80, "Designer",      { body: "UI · Brand" }),
    ],
    connectors: [
      lk(0,1), lk(0,2), lk(0,3), lk(0,4),
      lk(1,5), lk(1,6),
      lk(2,7), lk(2,8),
      lk(3,9), lk(3,10),
    ],
  },

  /* 17 ─ Feature Priority Matrix */
  {
    name: "Feature Priority (MoSCoW)",
    icon: "🥇",
    category: "Planning",
    desc: "Must Have → Should → Could → Won't — sort your backlog by priority",
    nodes: [
      nd("frame",   0,   0, 900, 140, "🔴 Must Have — Sprint 1", { borderColor: "#ef4444" }),
      nd("frame",   0, 160, 900, 140, "🟠 Should Have — Sprint 2", { borderColor: "#f59e0b" }),
      nd("frame",   0, 320, 900, 140, "🟡 Could Have — Sprint 3+", { borderColor: "#eab308" }),
      nd("frame",   0, 480, 900, 140, "⚪ Won't Have — Future", { borderColor: "#64748b" }),
      // Must Have features
      nd("kanban-card",  20,  50, 195, 85, "User Authentication", { body: "Login · Register · OAuth", priority: "urgent", status: "inprogress", assignee: "BE" }),
      nd("kanban-card", 230,  50, 195, 85, "Core Board Canvas",   { body: "Pan · Zoom · Nodes",      priority: "urgent", status: "inprogress", assignee: "FE" }),
      nd("kanban-card", 440,  50, 195, 85, "Real-time Save",      { body: "Auto-save every 5s",      priority: "urgent", status: "todo",       assignee: "BE" }),
      nd("kanban-card", 650,  50, 195, 85, "Template Gallery",    { body: "20+ built-in templates",  priority: "high",   status: "todo",       assignee: "FE" }),
      // Should Have
      nd("kanban-card",  20, 210, 195, 85, "AI Board Generation", { body: "Natural language → board", priority: "high",   status: "todo", assignee: "BE" }),
      nd("kanban-card", 230, 210, 195, 85, "Export PNG/PDF",      { body: "High-res board export",   priority: "high",   status: "todo", assignee: "FE" }),
      nd("kanban-card", 440, 210, 195, 85, "Connector routing",   { body: "Smart orthogonal paths",  priority: "medium", status: "todo", assignee: "FE" }),
      nd("kanban-card", 650, 210, 195, 85, "Comment threads",     { body: "Inline board comments",   priority: "medium", status: "todo", assignee: "BE" }),
      // Could Have
      nd("kanban-card",  20, 370, 195, 85, "Presenter mode",      { body: "Slide through frames",   priority: "medium", status: "todo", assignee: "FE" }),
      nd("kanban-card", 230, 370, 195, 85, "Version history",     { body: "Board snapshots",        priority: "low",    status: "todo", assignee: "BE" }),
      nd("kanban-card", 440, 370, 195, 85, "Voting / reactions",  { body: "Emoji reactions on nodes",priority: "low",   status: "todo", assignee: "FE" }),
      // Won't Have
      nd("kanban-card",  20, 530, 195, 85, "Video conferencing",  { body: "Out of scope for v1",    priority: "low", status: "todo", assignee: "PM" }),
      nd("kanban-card", 230, 530, 195, 85, "AI mind reading",     { body: "Cool but impossible",    priority: "low", status: "todo", assignee: "PM" }),
    ],
    connectors: [],
  },

  /* 18 ─ Risk Matrix */
  {
    name: "Risk Matrix",
    icon: "⚠️",
    category: "Strategy",
    desc: "2×2 Impact × Likelihood grid — identify, assess, and assign risks",
    nodes: [
      nd("frame",   0,   0, 400, 400, "🔴 Critical\nHigh Likelihood · High Impact",  { borderColor: "#ef4444", color: "#1f0000" }),
      nd("frame", 420,   0, 400, 400, "🟠 Mitigate\nLow Likelihood · High Impact",   { borderColor: "#f59e0b", color: "#1a0f00" }),
      nd("frame",   0, 420, 400, 400, "🟡 Monitor\nHigh Likelihood · Low Impact",    { borderColor: "#eab308", color: "#191400" }),
      nd("frame", 420, 420, 400, 400, "🟢 Accept\nLow Likelihood · Low Impact",      { borderColor: "#22c55e", color: "#001a0a" }),
      // Critical risks (top-left)
      nd("sticky-red",  20,  60, 175, 90, "Key employee leaves",  { body: "Mitigation: documentation, cross-training" }),
      nd("sticky-red",  20, 165, 175, 90, "Data breach",          { body: "Mitigation: encryption, audits, pen tests" }),
      nd("sticky-red", 205,  60, 175, 90, "Product-market fit loss", { body: "Mitigation: continuous customer interviews" }),
      nd("sticky-red", 205, 165, 175, 90, "Cash flow crisis",     { body: "Mitigation: 6mo runway minimum" }),
      // Mitigate risks (top-right)
      nd("sticky-orange", 440,  60, 175, 90, "Regulatory changes", { body: "Mitigation: legal counsel on retainer" }),
      nd("sticky-orange", 440, 165, 175, 90, "Infrastructure outage", { body: "Mitigation: multi-region failover" }),
      nd("sticky-orange", 625,  60, 175, 90, "Competitor copies features", { body: "Mitigation: move faster, brand moat" }),
      // Monitor risks (bottom-left)
      nd("sticky-yellow",  20, 440, 175, 90, "Algorithm changes",  { body: "Impact: reach drops 30%. Track weekly" }),
      nd("sticky-yellow",  20, 545, 175, 90, "Team burnout",       { body: "Impact: quality drops. Track morale" }),
      nd("sticky-yellow", 205, 440, 175, 90, "Scope creep",        { body: "Impact: delayed launch. Use MoSCoW" }),
      // Accept risks (bottom-right)
      nd("sticky-green",  440, 440, 175, 90, "Minor UX complaints", { body: "Accept and iterate in v1.1" }),
      nd("sticky-green",  440, 545, 175, 90, "Slow test coverage",  { body: "Acceptable for early stage" }),
    ],
    connectors: [],
  },

  /* 19 ─ Content Strategy */
  {
    name: "Content Strategy",
    icon: "📱",
    category: "Marketing",
    desc: "Pillars → Formats → Channels → KPIs — full content operation map",
    nodes: [
      nd("sticky-yellow", 340, 20, 220, 80, "Content Strategy 2024", { body: "90-day execution plan" }),
      // Pillars
      nd("process",  60, 175, 200, 65, "Education", { color: "#1e3a5f", body: "Teach your expertise" }),
      nd("process", 280, 175, 200, 65, "Inspiration", { color: "#14532d", body: "Motivate to take action" }),
      nd("process", 500, 175, 200, 65, "Entertainment", { color: "#451a03", body: "Make it fun + shareable" }),
      nd("process", 720, 175, 200, 65, "Authority", { color: "#4a044e", body: "Proof + credibility" }),
      // Formats for each pillar
      nd("sticky-blue",  30, 310, 130, 75, "How-to videos",    { body: "15-60 sec" }),
      nd("sticky-blue", 170, 310, 130, 75, "Tutorial carousels", { body: "8-12 slides" }),
      nd("sticky-green", 250, 310, 130, 75, "Quote graphics",   { body: "Shareable" }),
      nd("sticky-green", 390, 310, 130, 75, "Success stories",  { body: "Client wins" }),
      nd("sticky-orange", 470, 310, 130, 75, "Trending audios", { body: "Lip sync/react" }),
      nd("sticky-orange", 610, 310, 130, 75, "Behind scenes",   { body: "Day in the life" }),
      nd("sticky-purple", 690, 310, 130, 75, "Case studies",    { body: "Results-driven" }),
      nd("sticky-purple", 830, 310, 130, 75, "Expert collab",   { body: "Guest content" }),
      // Distribution channels
      nd("component",  60, 460, 140, 70, "Instagram", { body: "Reels · Stories · Posts", color: "#1e1b4b" }),
      nd("component", 220, 460, 140, 70, "YouTube",   { body: "Shorts · Long-form",      color: "#1e1b4b" }),
      nd("component", 380, 460, 140, 70, "TikTok",    { body: "Trends · Originals",      color: "#1e1b4b" }),
      nd("component", 540, 460, 140, 70, "LinkedIn",  { body: "Articles · Carousels",    color: "#1e1b4b" }),
      nd("component", 700, 460, 140, 70, "Newsletter",{ body: "Weekly digest · Tips",    color: "#1e1b4b" }),
      // KPIs
      nd("checklist", 60, 610, 230, 200, "KPIs to Track", {
        items: ["Follower growth rate", "Average views/post", "Engagement rate > 5%", "Weekly leads generated", "Email list growth"],
        checked: [false, false, false, false, false],
      }),
      nd("sticky-teal", 320, 610, 200, 90, "Frequency", { body: "IG: 2x/day\nYT: 3x/week\nTT: 3x/day\nLI: 1x/day" }),
      nd("sticky-teal", 540, 610, 200, 90, "Best Times",  { body: "7-9am EST\n12-2pm EST\n6-9pm EST" }),
    ],
    connectors: [
      lk(0,1), lk(0,2), lk(0,3), lk(0,4),
      lk(1,5), lk(1,6), lk(2,7), lk(2,8), lk(3,9), lk(3,10), lk(4,11), lk(4,12),
      lk(5,13), lk(6,14), lk(7,14), lk(9,15), lk(10,16), lk(11,16), lk(12,17),
    ],
  },

  /* 20 ─ Event Storming */
  {
    name: "Event Storming",
    icon: "⚡",
    category: "Engineering",
    desc: "DDD event storming — actors · commands · events · aggregates · policies",
    nodes: [
      // Legend
      nd("frame", 0, -80, 1100, 60, "Legend: 🟠 Events  🔵 Commands  🟡 Aggregates  🟣 Policies  👤 Actors  🔴 Hotspots", { borderColor: "#334155" }),
      // Actor
      nd("person",      40, 60,  140, 100, "Creator",     { body: "Platform user" }),
      nd("person",      40, 280, 140, 100, "Admin",       { body: "Platform admin" }),
      // Commands
      nd("sticky-blue", 220, 80,  180, 80, "Create Board",      { body: "POST /boards" }),
      nd("sticky-blue", 220, 180, 180, 80, "Add Node",          { body: "PUT /boards/:id/nodes" }),
      nd("sticky-blue", 220, 280, 180, 80, "Share Board",       { body: "POST /boards/:id/share" }),
      nd("sticky-blue", 220, 380, 180, 80, "Generate with AI",  { body: "POST /board/ai-generate" }),
      // Events
      nd("sticky-orange", 460, 80,  180, 80, "BoardCreated",   { body: "board.created event" }),
      nd("sticky-orange", 460, 180, 180, 80, "NodeAdded",      { body: "board.node.added" }),
      nd("sticky-orange", 460, 280, 180, 80, "BoardShared",    { body: "board.shared event" }),
      nd("sticky-orange", 460, 380, 180, 80, "AIBoardGenerated", { body: "board.ai.generated" }),
      // Aggregates
      nd("sticky-yellow", 700, 100, 180, 130, "Board Aggregate", { body: "- id\n- title\n- nodes[]\n- connectors[]\n- ownerId" }),
      nd("sticky-yellow", 700, 260, 180, 130, "AI Session",      { body: "- prompt\n- result\n- tokens\n- latency" }),
      // Policies
      nd("sticky-purple", 940, 80,  180, 80, "Notify collaborators", { body: "On: BoardShared" }),
      nd("sticky-purple", 940, 180, 180, 80, "Auto-save on change",  { body: "On: NodeAdded" }),
      nd("sticky-purple", 940, 280, 180, 80, "Deduct AI credits",    { body: "On: AIBoardGenerated" }),
      // Hotspot
      nd("sticky-red",    940, 380, 180, 80, "🔴 Conflict on concurrent edits", { body: "Need OT/CRDT resolution" }),
    ],
    connectors: [
      lk(1, 3), lk(1, 4), lk(1, 5),
      lk(2, 6),
      lk(3, 7, "triggers"), lk(4, 8, "triggers"), lk(5, 9, "triggers"), lk(6, 10, "triggers"),
      lk(7, 11), lk(8, 11), lk(9, 12), lk(10, 12),
      lk(7, 13), lk(8, 14), lk(10, 15),
    ],
  },
];

/* ─── applyTemplate ─────────────────────────────────────── */
export function applyTemplate(template: BoardTemplate, zCounter: number): {
  nodes: BoardNode[];
  connectors: BoardConnector[];
  zCounter: number;
} {
  const ids: string[] = [];
  const nodes: BoardNode[] = template.nodes.map((n, i) => {
    const id = uid();
    ids.push(id);
    return { ...n, id, zIndex: zCounter + i };
  });

  const connectors: BoardConnector[] = template.connectors
    .filter(c => c.fromIdx < ids.length && c.toIdx < ids.length)
    .map(c => ({
      id: cid(),
      fromId: ids[c.fromIdx],
      toId: ids[c.toIdx],
      label: c.label,
      color: c.color,
      style: c.style ?? "curved",
    }));

  return { nodes, connectors, zCounter: zCounter + template.nodes.length };
}

/* ─── SVG Thumbnails (one per template, by index) ─────── */
const THUMBS: React.FC[] = [
  /* 0 – Process Flowchart */
  () => (
    <svg viewBox="0 0 260 150" style={{ width: "100%", height: "100%" }}>
      <rect width="260" height="150" fill="#0d1117" rx="6" />
      <rect x="85" y="8"  width="90" height="22" rx="11" fill="#166534" />
      <rect x="75" y="40" width="110" height="22" rx="4"  fill="#1e3a5f" />
      <rect x="75" y="72" width="110" height="22" rx="4"  fill="#1e3a5f" />
      <polygon points="130,100 175,115 130,130 85,115" fill="#2d2560" />
      <rect x="75" y="137" width="110" height="22" rx="4"  fill="#1e3a5f" />
      <line x1="130" y1="30"  x2="130" y2="40"  stroke="#3b82f6" strokeWidth="1.5" markerEnd="url(#a)" />
      <line x1="130" y1="62"  x2="130" y2="72"  stroke="#3b82f6" strokeWidth="1.5" />
      <line x1="130" y1="94"  x2="130" y2="100" stroke="#3b82f6" strokeWidth="1.5" />
      <line x1="130" y1="130" x2="130" y2="137" stroke="#22c55e" strokeWidth="1.5" />
      <defs><marker id="a" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6Z" fill="#3b82f6"/></marker></defs>
    </svg>
  ),
  /* 1 – Mind Map */
  () => (
    <svg viewBox="0 0 260 150" style={{ width: "100%", height: "100%" }}>
      <rect width="260" height="150" fill="#0d1117" rx="6" />
      <ellipse cx="130" cy="75" rx="32" ry="22" fill="#d4b461" opacity="0.9" />
      {[[-1,-1],[1,-1],[-1,1],[1,1],[-1,0],[1,0]].map(([dx,dy],i) => {
        const cx2 = 130 + dx * 70, cy2 = 75 + dy * 40;
        const colors = ["#3b82f6","#22c55e","#f59e0b","#ec4899","#8b5cf6","#06b6d4"];
        return (
          <g key={i}>
            <line x1="130" y1="75" x2={cx2} y2={cy2} stroke={colors[i]} strokeWidth="1.5" opacity="0.6" />
            <rect x={cx2 - 22} y={cy2 - 10} width="44" height="20" rx="10" fill={colors[i]} opacity="0.8" />
          </g>
        );
      })}
      <text x="130" y="79" textAnchor="middle" fill="#0a0a0f" fontSize="9" fontWeight="700">Topic</text>
    </svg>
  ),
  /* 2 – Kanban Board */
  () => (
    <svg viewBox="0 0 260 150" style={{ width: "100%", height: "100%" }}>
      <rect width="260" height="150" fill="#0d1117" rx="6" />
      {[["#1e3a5f","To Do","#3b82f6"],["#1c2a1e","Doing","#22c55e"],["#1e1040","Done","#8b5cf6"]].map(([bg,lbl,ac],col) => (
        <g key={col}>
          <rect x={10+col*82} y="8" width="76" height="134" rx="6" fill={bg as string} />
          <rect x={14+col*82} y="12" width="68" height="16" rx="4" fill={ac as string} opacity="0.4" />
          <text x={52+col*82} y="24" textAnchor="middle" fill="#fff" fontSize="7" fontWeight="700">{lbl}</text>
          {[0,1,2].map(row => (
            <rect key={row} x={14+col*82} y={34+row*30} width="68" height="22" rx="4"
              fill="rgba(255,255,255,0.07)" stroke={`${ac}44`} strokeWidth="1" />
          ))}
        </g>
      ))}
    </svg>
  ),
  /* 3 – Business Model Canvas */
  () => (
    <svg viewBox="0 0 260 150" style={{ width: "100%", height: "100%" }}>
      <rect width="260" height="150" fill="#0d1117" rx="6" />
      {[
        [0,0,2,2,"#1e293b","Key\nPartners"],
        [2,0,1,1,"#1e3a5f","Key\nActivities"],
        [2,1,1,1,"#312e81","Key\nResources"],
        [3,0,1,2,"#1e40af","Value\nProp"],
        [4,0,1,1,"#1a3a2e","Customer\nRelations"],
        [4,1,1,1,"#1c2a0a","Channels"],
        [5,0,2,2,"#14532d","Customer\nSegments"],
        [0,2,3.5,1,"#3b1f00","Cost Structure"],
        [3.5,2,3.5,1,"#1a1a3e","Revenue Streams"],
      ].map(([cx,cy,cw,ch,fill,label],i) => (
        <g key={i}>
          <rect x={4+(cx as number)*36} y={4+(cy as number)*46} width={(cw as number)*36-3} height={(ch as number)*46-3}
            rx="3" fill={fill as string} stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
          <text x={4+(cx as number)*36+(cw as number)*18} y={4+(cy as number)*46+(ch as number)*23+3}
            textAnchor="middle" fill="#94a3b8" fontSize="6" fontWeight="600">{(label as string).split("\n")[0]}</text>
        </g>
      ))}
    </svg>
  ),
  /* 4 – SWOT */
  () => (
    <svg viewBox="0 0 260 150" style={{ width: "100%", height: "100%" }}>
      <rect width="260" height="150" fill="#0d1117" rx="6" />
      {[["S","Strengths","#14532d","#22c55e",0,0],["W","Weaknesses","#450a0a","#ef4444",1,0],
        ["O","Opportunities","#1e3a5f","#3b82f6",0,1],["T","Threats","#451a03","#f59e0b",1,1]].map(([ltr,nm,bg,ac,col,row]) => (
        <g key={ltr as string}>
          <rect x={8+(col as number)*124} y={8+(row as number)*67} width="120" height="63" rx="6" fill={bg as string} />
          <text x={68+(col as number)*124} y={32+(row as number)*67} textAnchor="middle" fill={ac as string} fontSize="18" fontWeight="900">{ltr}</text>
          <text x={68+(col as number)*124} y={46+(row as number)*67} textAnchor="middle" fill={ac as string} fontSize="8" opacity="0.8">{nm}</text>
          {[0,1,2].map(r => <rect key={r} x={16+(col as number)*124} y={52+(row as number)*67+r*7} width="105" height="4" rx="2" fill={`${ac}22`} />)}
        </g>
      ))}
    </svg>
  ),
  /* 5 – Customer Journey */
  () => (
    <svg viewBox="0 0 260 150" style={{ width: "100%", height: "100%" }}>
      <rect width="260" height="150" fill="#0d1117" rx="6" />
      {["Aware","Consider","Decide","Retain","Advocate"].map((s,i) => (
        <g key={i}>
          <rect x={4+i*50} y="10" width="46" height="130" rx="4" fill={`rgba(${[59,130,246][0]||59},${[130][0]||130},${[246][0]||246},${0.06+i*0.03})`} />
          <rect x={8+i*50} y="14" width="38" height="16" rx="8"
            fill={["#3b82f6","#8b5cf6","#d4b461","#22c55e","#ec4899"][i]} opacity="0.9" />
          <text x={27+i*50} y="26" textAnchor="middle" fill="#fff" fontSize="6" fontWeight="700">{s}</text>
          {[0,1,2].map(r => <rect key={r} x={10+i*50} y={38+r*32} width="34" height="24" rx="4" fill="rgba(255,255,255,0.06)" />)}
          {i < 4 && <path d={`M${50+i*50},75 L${52+i*50},75`} stroke="#475569" strokeWidth="1.5" strokeDasharray="3,2" />}
        </g>
      ))}
      {/* emotion line */}
      <polyline points="27,100 77,85 127,120 177,70 227,55" fill="none" stroke="#d4b461" strokeWidth="1.5" opacity="0.7" />
    </svg>
  ),
  /* 6 – Sprint Retrospective */
  () => (
    <svg viewBox="0 0 260 150" style={{ width: "100%", height: "100%" }}>
      <rect width="260" height="150" fill="#0d1117" rx="6" />
      {[["Went Well","#14532d","#22c55e"],["Improve","#451a03","#f59e0b"],["Actions","#1e3a5f","#3b82f6"]].map(([t,bg,ac],col) => (
        <g key={col}>
          <rect x={6+col*84} y="8" width="80" height="134" rx="6" fill={bg as string} />
          <text x={46+col*84} y="24" textAnchor="middle" fill={ac as string} fontSize="8" fontWeight="700">{t}</text>
          {[0,1,2,3].map(r => (
            <rect key={r} x={12+col*84} y={32+r*28} width="68" height="22" rx="4"
              fill={`${ac}18`} stroke={`${ac}33`} strokeWidth="1" />
          ))}
        </g>
      ))}
    </svg>
  ),
  /* 7 – Product Roadmap */
  () => (
    <svg viewBox="0 0 260 150" style={{ width: "100%", height: "100%" }}>
      <rect width="260" height="150" fill="#0d1117" rx="6" />
      {["Q1","Q2","Q3","Q4"].map((q,i) => (
        <g key={i}>
          <text x={32+i*60} y="20" textAnchor="middle" fill="#64748b" fontSize="9" fontWeight="700">{q}</text>
          <line x1={32+i*60} y1="24" x2={32+i*60} y2="142" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
        </g>
      ))}
      {[
        [0,"Feature Launch","#3b82f6",8,100],
        [1,"API v2","#22c55e",36,60],
        [0.5,"Mobile App","#8b5cf6",68,90],
        [2,"Analytics","#f59e0b",50,70],
        [2.5,"AI Features","#d4b461",100,50],
        [3,"Enterprise","#ec4899",60,80],
      ].map(([start,label,color,w,_h],i) => (
        <rect key={i} x={12+(start as number)*60} y={30+i*18} width={w as number} height="14" rx="7"
          fill={color as string} opacity="0.85" />
      ))}
    </svg>
  ),
  /* 8 – AI/LLM Pipeline */
  () => (
    <svg viewBox="0 0 260 150" style={{ width: "100%", height: "100%" }}>
      <rect width="260" height="150" fill="#0d1117" rx="6" />
      {["Input","Embed","Retrieve","Generate","Output"].map((s,i) => {
        const x = 6 + i * 50;
        const colors = ["#1e3a5f","#312e81","#3b0764","#1a1633","#14532d"];
        const bcs   = ["#3b82f6","#6366f1","#8b5cf6","#a78bfa","#22c55e"];
        return (
          <g key={i}>
            <rect x={x} y="55" width="44" height="40" rx="8" fill={colors[i]} stroke={bcs[i]} strokeWidth="1.5" />
            <text x={x+22} y="79" textAnchor="middle" fill={bcs[i]} fontSize="7" fontWeight="700">{s}</text>
            {i < 4 && <line x1={x+44} y1="75" x2={x+50} y2="75" stroke={bcs[i]} strokeWidth="1.5" />}
            {/* data blobs above */}
            <rect x={x+4} y="30" width="36" height="16" rx="4" fill={`${bcs[i]}22`} />
            <rect x={x+4} y="104" width="36" height="16" rx="4" fill={`${bcs[i]}22`} />
          </g>
        );
      })}
      <text x="130" y="15" textAnchor="middle" fill="#64748b" fontSize="8">✦ AI / LLM Pipeline</text>
    </svg>
  ),
  /* 9 – System Architecture */
  () => (
    <svg viewBox="0 0 260 150" style={{ width: "100%", height: "100%" }}>
      <rect width="260" height="150" fill="#0d1117" rx="6" />
      {[["Frontend","#1e3a5f","#3b82f6"],["API Layer","#1e293b","#64748b"],["Services","#312e81","#6366f1"],["Data Layer","#1a0533","#a78bfa"]].map(([label,bg,ac],row) => (
        <g key={row}>
          <rect x="8" y={8+row*34} width="244" height="28" rx="6" fill={bg as string} stroke={`${ac}44`} strokeWidth="1" />
          <text x="20" y={27+row*34} fill={ac as string} fontSize="8" fontWeight="700">{label}</text>
          {[0,1,2,3].map(col => (
            <rect key={col} x={56+col*50} y={12+row*34} width="40" height="20" rx="4"
              fill={`${ac}18`} stroke={`${ac}33`} strokeWidth="1" />
          ))}
        </g>
      ))}
    </svg>
  ),
  /* 10 – OKR */
  () => (
    <svg viewBox="0 0 260 150" style={{ width: "100%", height: "100%" }}>
      <rect width="260" height="150" fill="#0d1117" rx="6" />
      <rect x="80" y="8" width="100" height="28" rx="6" fill="#d4b461" opacity="0.9" />
      <text x="130" y="27" textAnchor="middle" fill="#0a0a0f" fontSize="9" fontWeight="700">Objective</text>
      {[0,1,2].map(i => {
        const x = 20 + i * 75;
        return (
          <g key={i}>
            <line x1="130" y1="36" x2={x+37} y2="52" stroke="#d4b461" strokeWidth="1" opacity="0.5" />
            <rect x={x} y="52" width="74" height="28" rx="6" fill="#1e3a5f" stroke="#3b82f644" strokeWidth="1" />
            <text x={x+37} y="70" textAnchor="middle" fill="#3b82f6" fontSize="8" fontWeight="700">KR {i+1}</text>
            {[0,1].map(r => (
              <g key={r}>
                <line x1={x+37} y1="80" x2={x+12+r*28} y2="96" stroke="#3b82f644" strokeWidth="1" />
                <rect x={x+r*28} y="96" width="34" height="20" rx="4" fill="#0f172a" stroke="#3b82f622" strokeWidth="1" />
              </g>
            ))}
          </g>
        );
      })}
    </svg>
  ),
  /* 11 – Empathy Map */
  () => (
    <svg viewBox="0 0 260 150" style={{ width: "100%", height: "100%" }}>
      <rect width="260" height="150" fill="#0d1117" rx="6" />
      {[["Think","#1e3a5f","#3b82f6",0,0],["See","#14532d","#22c55e",1,0],
        ["Feel","#3b0764","#8b5cf6",0,1],["Do","#451a03","#f59e0b",1,1]].map(([lbl,bg,ac,col,row]) => (
        <g key={lbl as string}>
          <rect x={4+(col as number)*128} y={4+(row as number)*71} width="124" height="67" rx="6" fill={bg as string} />
          <text x={66+(col as number)*128} y={30+(row as number)*71} textAnchor="middle" fill={ac as string} fontSize="10" fontWeight="700">{lbl}</text>
          {[0,1].map(r => <rect key={r} x={12+(col as number)*128} y={36+(row as number)*71+r*18} width="108" height="12" rx="3" fill={`${ac}18`} />)}
        </g>
      ))}
      {/* center person */}
      <circle cx="130" cy="75" r="14" fill="#1e293b" stroke="#d4b46155" strokeWidth="2" />
      <text x="130" y="79" textAnchor="middle" fill="#d4b461" fontSize="14">👤</text>
    </svg>
  ),
  /* 12 – User Story Map */
  () => (
    <svg viewBox="0 0 260 150" style={{ width: "100%", height: "100%" }}>
      <rect width="260" height="150" fill="#0d1117" rx="6" />
      {["Epic A","Epic B","Epic C","Epic D"].map((e,i) => (
        <g key={i}>
          <rect x={6+i*62} y="8" width="58" height="22" rx="4" fill="#1e3a5f" stroke="#3b82f644" strokeWidth="1" />
          <text x={35+i*62} y="23" textAnchor="middle" fill="#3b82f6" fontSize="7" fontWeight="700">{e}</text>
          {[0,1,2].map(r => (
            <rect key={r} x={10+i*62} y={38+r*30} width="50" height="22" rx="4"
              fill={["#fef3c7","#dcfce7","#dbeafe","#ede9fe"][i]+"18"}
              stroke={["#f59e0b","#22c55e","#3b82f6","#8b5cf6"][i]+"44"} strokeWidth="1" />
          ))}
        </g>
      ))}
      <line x1="4" y1="34" x2="256" y2="34" stroke="#ffffff11" strokeWidth="1" />
    </svg>
  ),
  /* 13 – Sales Funnel */
  () => (
    <svg viewBox="0 0 260 150" style={{ width: "100%", height: "100%" }}>
      <rect width="260" height="150" fill="#0d1117" rx="6" />
      {[["Awareness",220,8,"#1e3a5f","#3b82f6",20],
        ["Interest",170,36,"#312e81","#6366f1",45],
        ["Consideration",130,64,"#3b0764","#8b5cf6",65],
        ["Intent",90,92,"#1a0533","#a78bfa",85],
        ["Conversion",50,120,"#14532d","#22c55e",105]].map(([lbl,w,y,bg,ac,x]) => (
        <g key={lbl as string}>
          <rect x={x as number} y={y as number} width={w as number} height="22" rx="4" fill={bg as string} stroke={`${ac}44`} strokeWidth="1" />
          <text x={x as number+(w as number)/2} y={(y as number)+15} textAnchor="middle" fill={ac as string} fontSize="7" fontWeight="700">{lbl}</text>
        </g>
      ))}
    </svg>
  ),
  /* 14 – Data Pipeline */
  () => (
    <svg viewBox="0 0 260 150" style={{ width: "100%", height: "100%" }}>
      <rect width="260" height="150" fill="#0d1117" rx="6" />
      {["Source","Ingest","Transform","Validate","Load","Serve"].map((s,i) => {
        const x = 4 + i * 42;
        const colors = ["#1e3a5f","#1a2040","#312e81","#1e1040","#14532d","#1a3520"];
        const bcs = ["#3b82f6","#6366f1","#8b5cf6","#a78bfa","#22c55e","#4ade80"];
        return (
          <g key={i}>
            <rect x={x} y="30" width="38" height="90" rx="6" fill={colors[i]} stroke={`${bcs[i]}44`} strokeWidth="1" />
            <rect x={x+4} y="34" width="30" height="10" rx="3" fill={`${bcs[i]}33`} />
            <text x={x+19} y="140" textAnchor="middle" fill={bcs[i]} fontSize="6" fontWeight="700">{s}</text>
            {i < 5 && <line x1={x+38} y1="75" x2={x+42} y2="75" stroke={bcs[i]} strokeWidth="1.5" />}
          </g>
        );
      })}
    </svg>
  ),
  /* 15 – Org Chart */
  () => (
    <svg viewBox="0 0 260 150" style={{ width: "100%", height: "100%" }}>
      <rect width="260" height="150" fill="#0d1117" rx="6" />
      <rect x="100" y="6" width="60" height="22" rx="4" fill="#d4b461" opacity="0.9" />
      <text x="130" y="21" textAnchor="middle" fill="#0a0a0f" fontSize="8" fontWeight="700">CEO</text>
      {[["CTO","#1e3a5f","#3b82f6",50],["COO","#14532d","#22c55e",120],["CMO","#3b0764","#8b5cf6",190]].map(([t,bg,ac,x]) => (
        <g key={t as string}>
          <line x1="130" y1="28" x2={x as number+30} y2="48" stroke="#ffffff22" strokeWidth="1" />
          <rect x={x as number} y="48" width="60" height="22" rx="4" fill={bg as string} stroke={`${ac}44`} strokeWidth="1" />
          <text x={(x as number)+30} y="63" textAnchor="middle" fill={ac as string} fontSize="8" fontWeight="700">{t}</text>
          {[0,1].map(r => (
            <g key={r}>
              <line x1={(x as number)+30} y1="70" x2={(x as number)+10+r*24} y2="88" stroke="#ffffff11" strokeWidth="1" />
              <rect x={(x as number)+r*24} y="88" width="36" height="18" rx="3" fill="rgba(255,255,255,0.04)" />
            </g>
          ))}
        </g>
      ))}
    </svg>
  ),
  /* 16 – Feature Priority (MoSCoW) */
  () => (
    <svg viewBox="0 0 260 150" style={{ width: "100%", height: "100%" }}>
      <rect width="260" height="150" fill="#0d1117" rx="6" />
      {[["Must","#450a0a","#ef4444",0,0],["Should","#1e3a5f","#3b82f6",1,0],
        ["Could","#1c2a0a","#22c55e",0,1],["Won't","#1e293b","#64748b",1,1]].map(([lbl,bg,ac,col,row]) => (
        <g key={lbl as string}>
          <rect x={6+(col as number)*128} y={6+(row as number)*71} width="122" height="65" rx="6" fill={bg as string} />
          <text x={67+(col as number)*128} y={26+(row as number)*71} textAnchor="middle" fill={ac as string} fontSize="10" fontWeight="700">{lbl}</text>
          {[0,1,2].map(r => <rect key={r} x={14+(col as number)*128} y={30+(row as number)*71+r*13} width="106" height="9" rx="3" fill={`${ac}18`} />)}
        </g>
      ))}
    </svg>
  ),
  /* 17 – Risk Matrix */
  () => (
    <svg viewBox="0 0 260 150" style={{ width: "100%", height: "100%" }}>
      <rect width="260" height="150" fill="#0d1117" rx="6" />
      {[0,1,2,3].map(row => [0,1,2,3].map(col => {
        const heat = row + col;
        const fill = heat <= 1 ? "#14532d" : heat <= 3 ? "#451a03" : "#450a0a";
        const opacity = 0.3 + heat * 0.1;
        return (
          <rect key={`${row}-${col}`} x={20+col*55} y={10+row*32} width="52" height="28" rx="4"
            fill={fill} opacity={opacity} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
        );
      }))}
      <text x="130" y="148" textAnchor="middle" fill="#475569" fontSize="7">← Impact →</text>
      <text x="8" y="75" fill="#475569" fontSize="7" transform="rotate(-90,8,75)">Likelihood</text>
    </svg>
  ),
  /* 18 – Content Strategy */
  () => (
    <svg viewBox="0 0 260 150" style={{ width: "100%", height: "100%" }}>
      <rect width="260" height="150" fill="#0d1117" rx="6" />
      {["Blog","Social","Email","Video","SEO"].map((ch,col) => (
        <g key={ch}>
          <rect x={4+col*50} y="8" width="46" height="14" rx="3" fill={["#1e3a5f","#3b0764","#14532d","#451a03","#1e1040"][col]} />
          <text x={27+col*50} y="19" textAnchor="middle" fill="#94a3b8" fontSize="7" fontWeight="600">{ch}</text>
          {["W1","W2","W3","W4","W5","W6"].map((w,row) => {
            const has = Math.random() > 0.4;
            const colors = ["#3b82f6","#8b5cf6","#22c55e","#f59e0b","#ec4899"];
            return (
              <rect key={w} x={4+col*50} y={26+row*18} width="46" height="14" rx="3"
                fill={has ? `${colors[col]}22` : "rgba(255,255,255,0.02)"}
                stroke={has ? `${colors[col]}44` : "transparent"} strokeWidth="1" />
            );
          })}
        </g>
      ))}
    </svg>
  ),
  /* 19 – Event Storming */
  () => (
    <svg viewBox="0 0 260 150" style={{ width: "100%", height: "100%" }}>
      <rect width="260" height="150" fill="#0d1117" rx="6" />
      <line x1="10" y1="75" x2="250" y2="75" stroke="#ffffff11" strokeWidth="2" />
      {[
        [10,30,"#f97316","Event A"],
        [62,45,"#3b82f6","Cmd B"],
        [114,25,"#f97316","Event C"],
        [166,50,"#8b5cf6","Policy"],
        [218,30,"#f97316","Event D"],
        [30,95,"#eab308","User"],
        [82,100,"#f97316","Event E"],
        [134,90,"#ef4444","Hotspot"],
        [186,105,"#3b82f6","Cmd F"],
        [50,60,"#84cc16","Agg 1"],
        [160,65,"#84cc16","Agg 2"],
      ].map(([x,y,fill,lbl],i) => (
        <g key={i}>
          <rect x={x as number} y={(y as number)-11} width="44" height="22" rx="2" fill={fill as string} opacity="0.85" />
          <text x={(x as number)+22} y={(y as number)+4} textAnchor="middle" fill="#fff" fontSize="6" fontWeight="700">{lbl}</text>
        </g>
      ))}
    </svg>
  ),
];

/* ─── TemplateGalleryModal ─────────────────────────────── */
import { useState } from "react";

const GOLD = "#d4b461";
const CATS = ["All", "Process", "Strategy", "Engineering", "Planning", "Team", "AI & Tech", "Marketing"];

export function TemplateGalleryModal({
  onApply, onClose,
}: { onApply: (t: BoardTemplate) => void; onClose: () => void }) {
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("All");
  const [hovered, setHovered] = useState<number | null>(null);

  const filtered = TEMPLATES.filter(t => {
    const matchCat = cat === "All" || t.category === cat;
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.desc.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50000,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: "min(940px, 96vw)", maxHeight: "88vh",
        background: "#080c14", borderRadius: 20,
        border: "1px solid rgba(255,255,255,0.07)",
        boxShadow: "0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(212,180,97,0.08)",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}>
        {/* ── Header ── */}
        <div style={{
          padding: "20px 24px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          background: "linear-gradient(180deg, rgba(212,180,97,0.05) 0%, transparent 100%)",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: `${GOLD}22`, border: `1px solid ${GOLD}44`,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>✦</div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9" }}>Templates</div>
                <div style={{ fontSize: 11, color: "#475569" }}>{TEMPLATES.length} templates · Click to use</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {/* Search */}
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#475569", fontSize: 13 }}>🔍</span>
                <input
                  value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search templates..."
                  style={{
                    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 10, padding: "7px 12px 7px 32px", color: "#e2e8f0", fontSize: 13,
                    outline: "none", width: 200, fontFamily: "inherit",
                  }}
                />
              </div>
              <button onClick={onClose} style={{
                width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.08)", color: "#64748b", cursor: "pointer",
                fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center",
              }}>✕</button>
            </div>
          </div>

          {/* Category pills */}
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2, scrollbarWidth: "none" }}>
            {CATS.map(c => (
              <button key={c} onClick={() => setCat(c)} style={{
                padding: "5px 14px", borderRadius: 999, fontSize: 12, fontWeight: 600,
                cursor: "pointer", whiteSpace: "nowrap", border: "none", fontFamily: "inherit",
                background: cat === c ? GOLD : "rgba(255,255,255,0.06)",
                color: cat === c ? "#0a0a0f" : "#64748b",
                transition: "all 0.15s",
                boxShadow: cat === c ? `0 2px 12px ${GOLD}44` : "none",
              }}>{c}</button>
            ))}
          </div>
        </div>

        {/* ── Grid ── */}
        <div style={{
          flex: 1, overflow: "auto", padding: "20px 24px",
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16,
          alignContent: "start",
        }}>
          {filtered.length === 0 && (
            <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "60px 0", color: "#475569" }}>
              No templates match "{search}"
            </div>
          )}
          {filtered.map((t, _i) => {
            const idx = TEMPLATES.indexOf(t);
            const Thumb = THUMBS[idx];
            const isHov = hovered === idx;
            return (
              <div key={t.name}
                onClick={() => onApply(t)}
                onMouseEnter={() => setHovered(idx)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  borderRadius: 14, overflow: "hidden", cursor: "pointer",
                  border: `1px solid ${isHov ? `${GOLD}55` : "rgba(255,255,255,0.07)"}`,
                  background: isHov ? "rgba(212,180,97,0.04)" : "rgba(255,255,255,0.02)",
                  transition: "all 0.18s",
                  transform: isHov ? "translateY(-3px)" : "translateY(0)",
                  boxShadow: isHov ? `0 12px 32px rgba(0,0,0,0.5), 0 0 0 1px ${GOLD}22` : "none",
                }}>
                {/* Thumbnail */}
                <div style={{ height: 140, overflow: "hidden", position: "relative", background: "#0d1117" }}>
                  {Thumb ? <Thumb /> : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40 }}>{t.icon}</div>
                  )}
                  {/* hover overlay */}
                  {isHov && (
                    <div style={{
                      position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "opacity 0.15s",
                    }}>
                      <div style={{
                        padding: "9px 22px", background: GOLD, borderRadius: 10,
                        fontSize: 13, fontWeight: 700, color: "#0a0a0f",
                        boxShadow: `0 4px 16px ${GOLD}55`,
                      }}>Use Template</div>
                    </div>
                  )}
                </div>
                {/* Card footer */}
                <div style={{ padding: "10px 12px 12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                    <span style={{ fontSize: 14 }}>{t.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: isHov ? "#f1f5f9" : "#e2e8f0" }}>{t.name}</span>
                  </div>
                  <div style={{ fontSize: 10, color: "#475569", lineHeight: 1.4 }}>{t.desc}</div>
                  <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 999,
                      background: `${GOLD}18`, color: GOLD, letterSpacing: "0.06em",
                    }}>{t.category.toUpperCase()}</span>
                    <span style={{ fontSize: 9, color: "#334155" }}>· {t.nodes.length} nodes</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
