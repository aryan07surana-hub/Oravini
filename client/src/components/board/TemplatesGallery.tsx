import { type BoardNode, type BoardConnector, type NodeKind, uid, cid } from "./types";

export interface BoardTemplate {
  name: string;
  icon: string;
  desc: string;
  nodes: Omit<BoardNode, "id" | "zIndex">[];
  connectors: Omit<BoardConnector, "id">[];
}

const _ = (x: number) => x;

const T: BoardTemplate[] = [
  {
    name: "Business Strategy",
    icon: "🎯",
    desc: "Mission, vision, OKRs, and strategic initiatives",
    nodes: [
      { kind: "sticky-yellow", x: _(300), y: _(40), w: 200, h: 100, title: "Mission", body: "Why we exist" },
      { kind: "sticky-blue", x: _(600), y: _(40), w: 200, h: 100, title: "Vision", body: "Where we're going" },
      { kind: "process", x: _(150), y: _(220), w: 180, h: 70, title: "OKR 1: Growth" },
      { kind: "process", x: _(400), y: _(220), w: 180, h: 70, title: "OKR 2: Product" },
      { kind: "process", x: _(650), y: _(220), w: 180, h: 70, title: "OKR 3: Team" },
      { kind: "star", x: _(220), y: _(370), w: 100, h: 100, title: "Q1" },
      { kind: "star", x: _(470), y: _(370), w: 100, h: 100, title: "Q2" },
      { kind: "star", x: _(720), y: _(370), w: 100, h: 100, title: "Q3" },
    ],
    connectors: [
      { fromId: "", toId: "", label: "inspires" },
      { fromId: "", toId: "", label: "aligns" },
      { fromId: "", toId: "", label: "aligns" },
      { fromId: "", toId: "", label: "" },
      { fromId: "", toId: "", label: "" },
      { fromId: "", toId: "", label: "" },
      { fromId: "", toId: "", label: "drives" },
      { fromId: "", toId: "", label: "drives" },
    ],
  },
  {
    name: "Customer Journey",
    icon: "🧭",
    desc: "Awareness → Consideration → Decision → Retention → Advocacy",
    nodes: [
      { kind: "terminator", x: _(40), y: _(180), w: 160, h: 60, title: "Awareness" },
      { kind: "decision", x: _(280), y: _(160), w: 180, h: 120, title: "Consideration" },
      { kind: "process", x: _(540), y: _(180), w: 180, h: 70, title: "Decision" },
      { kind: "sticky-green", x: _(800), y: _(40), w: 160, h: 140, title: "Retention", body: "Onboarding\nSupport\nLoyalty" },
      { kind: "sticky-purple", x: _(800), y: _(240), w: 160, h: 140, title: "Advocacy", body: "Referrals\nReviews\nCommunity" },
      { kind: "person", x: _(40), y: _(40), w: 100, h: 100, title: "User" },
    ],
    connectors: [
      { fromId: "", toId: "", label: "discovers" },
      { fromId: "", toId: "", label: "evaluates" },
      { fromId: "", toId: "", label: "purchases" },
      { fromId: "", toId: "", label: "onboards" },
      { fromId: "", toId: "", label: "" },
    ],
  },
  {
    name: "Sprint Retro",
    icon: "🔄",
    desc: "What went well, what to improve, action items, kudos",
    nodes: [
      { kind: "sticky-green", x: _(40), y: _(40), w: 220, h: 160, title: "What went well 💚", body: "• Shipped on time\n• Great collaboration\n• Clean code reviews" },
      { kind: "sticky-pink", x: _(300), y: _(40), w: 220, h: 160, title: "What to improve 🔴", body: "• More testing\n• Better estimates\n• Fewer interrupts" },
      { kind: "sticky-yellow", x: _(560), y: _(40), w: 220, h: 160, title: "Action items ⚡", body: "• Add e2e tests\n• Estimation workshop\n• Focus blocks" },
      { kind: "sticky-blue", x: _(300), y: _(260), w: 220, h: 100, title: "Kudos 👏", body: "Thanks to everyone!" },
      { kind: "process", x: _(400), y: _(420), w: 180, h: 70, title: "Sprint 12 Retro" },
    ],
    connectors: [
      { fromId: "", toId: "", label: "" },
      { fromId: "", toId: "", label: "" },
      { fromId: "", toId: "", label: "leads to" },
    ],
  },
  {
    name: "Competitive Analysis",
    icon: "📊",
    desc: "Compare 4 competitors across 6 dimensions",
    nodes: [
      { kind: "process", x: _(220), y: _(20), w: 140, h: 50, title: "Our Product" },
      { kind: "process", x: _(420), y: _(20), w: 140, h: 50, title: "Competitor A" },
      { kind: "process", x: _(620), y: _(20), w: 140, h: 50, title: "Competitor B" },
      { kind: "process", x: _(820), y: _(20), w: 140, h: 50, title: "Competitor C" },
      { kind: "sticky-yellow", x: _(20), y: _(120), w: 160, h: 60, title: "Pricing" },
      { kind: "sticky-blue", x: _(20), y: _(200), w: 160, h: 60, title: "Features" },
      { kind: "sticky-green", x: _(20), y: _(280), w: 160, h: 60, title: "UX" },
      { kind: "sticky-purple", x: _(20), y: _(360), w: 160, h: 60, title: "Support" },
      { kind: "sticky-orange", x: _(20), y: _(440), w: 160, h: 60, title: "Market Share" },
    ],
    connectors: [
      { fromId: "", toId: "", label: "" }, { fromId: "", toId: "", label: "" }, { fromId: "", toId: "", label: "" },
      { fromId: "", toId: "", label: "" }, { fromId: "", toId: "", label: "" }, { fromId: "", toId: "", label: "" },
      { fromId: "", toId: "", label: "" }, { fromId: "", toId: "", label: "" }, { fromId: "", toId: "", label: "" },
      { fromId: "", toId: "", label: "" }, { fromId: "", toId: "", label: "" }, { fromId: "", toId: "", label: "" },
    ],
  },
  {
    name: "Product Roadmap",
    icon: "🗺",
    desc: "Q1-Q4 with features, dependencies, and milestones",
    nodes: [
      { kind: "terminator", x: _(40), y: _(240), w: 140, h: 60, title: "Now" },
      { kind: "sticky-yellow", x: _(260), y: _(40), w: 200, h: 120, title: "Q1", body: "• Auth system\n• User dashboard\n• MVP launch" },
      { kind: "sticky-green", x: _(520), y: _(40), w: 200, h: 120, title: "Q2", body: "• Search feature\n• API release\n• Beta users" },
      { kind: "sticky-blue", x: _(780), y: _(40), w: 200, h: 120, title: "Q3", body: "• Mobile app\n• Analytics\n• Enterprise" },
      { kind: "sticky-purple", x: _(1040), y: _(40), w: 200, h: 120, title: "Q4", body: "• AI features\n• Scale infrastructure\n• 1M users" },
      { kind: "star", x: _(1040), y: _(240), w: 80, h: 80, title: "Goal" },
    ],
    connectors: [
      { fromId: "", toId: "", label: "starts" },
      { fromId: "", toId: "", label: "→" }, { fromId: "", toId: "", label: "→" }, { fromId: "", toId: "", label: "→" },
      { fromId: "", toId: "", label: "target" },
    ],
  },
  {
    name: "User Flow",
    icon: "🚶",
    desc: "SaaS onboarding: signup → setup → first value → retention",
    nodes: [
      { kind: "terminator", x: _(40), y: _(200), w: 140, h: 60, title: "Sign Up" },
      { kind: "process", x: _(260), y: _(200), w: 180, h: 70, title: "Onboarding" },
      { kind: "decision", x: _(520), y: _(180), w: 180, h: 120, title: "First Value?" },
      { kind: "process", x: _(780), y: _(200), w: 180, h: 70, title: "Core Feature" },
      { kind: "cloud", x: _(1040), y: _(190), w: 180, h: 90, title: "Retention" },
      { kind: "sticky-yellow", x: _(520), y: _(380), w: 160, h: 80, title: "Churn", body: "Re-engagement" },
    ],
    connectors: [
      { fromId: "", toId: "", label: "enters email" },
      { fromId: "", toId: "", label: "setup wizard" },
      { fromId: "", toId: "", label: "yes →" },
      { fromId: "", toId: "", label: "habit" },
      { fromId: "", toId: "", label: "no →" },
    ],
  },
  {
    name: "DB Schema",
    icon: "🗄",
    desc: "E-commerce schema: users, products, orders, payments",
    nodes: [
      { kind: "database", x: _(40), y: _(40), w: 170, h: 100, title: "Users" },
      { kind: "database", x: _(300), y: _(40), w: 170, h: 100, title: "Products" },
      { kind: "database", x: _(560), y: _(40), w: 170, h: 100, title: "Orders" },
      { kind: "database", x: _(820), y: _(40), w: 170, h: 100, title: "Payments" },
      { kind: "database", x: _(170), y: _(220), w: 170, h: 100, title: "Reviews" },
      { kind: "document", x: _(480), y: _(220), w: 170, h: 100, title: "Invoices" },
    ],
    connectors: [
      { fromId: "", toId: "", label: "has many" },
      { fromId: "", toId: "", label: "contains" },
      { fromId: "", toId: "", label: "has one" },
      { fromId: "", toId: "", label: "writes" },
      { fromId: "", toId: "", label: "generates" },
    ],
  },
  {
    name: "Org Chart",
    icon: "🏢",
    desc: "50-person startup with engineering, product, marketing",
    nodes: [
      { kind: "person", x: _(360), y: _(20), w: 100, h: 80, title: "CEO" },
      { kind: "person", x: _(110), y: _(160), w: 100, h: 80, title: "CPO" },
      { kind: "person", x: _(360), y: _(160), w: 100, h: 80, title: "CTO" },
      { kind: "person", x: _(610), y: _(160), w: 100, h: 80, title: "CMO" },
      { kind: "person", x: _(40), y: _(300), w: 100, h: 80, title: "Designer" },
      { kind: "person", x: _(190), y: _(300), w: 100, h: 80, title: "PM" },
      { kind: "person", x: _(340), y: _(300), w: 100, h: 80, title: "Engineer" },
      { kind: "person", x: _(490), y: _(300), w: 100, h: 80, title: "Engineer" },
      { kind: "person", x: _(640), y: _(300), w: 100, h: 80, title: "Marketer" },
    ],
    connectors: [
      { fromId: "", toId: "", label: "" }, { fromId: "", toId: "", label: "" }, { fromId: "", toId: "", label: "" },
      { fromId: "", toId: "", label: "" }, { fromId: "", toId: "", label: "" }, { fromId: "", toId: "", label: "" },
      { fromId: "", toId: "", label: "" }, { fromId: "", toId: "", label: "" },
    ],
  },
  {
    name: "Mind Map",
    icon: "🧠",
    desc: "Central idea with radiating branches and sub-ideas",
    nodes: [
      { kind: "process", x: _(340), y: _(160), w: 160, h: 70, title: "Main Idea" },
      { kind: "sticky-yellow", x: _(40), y: _(40), w: 160, h: 70, title: "Branch 1", body: "Detail A\nDetail B" },
      { kind: "sticky-green", x: _(600), y: _(40), w: 160, h: 70, title: "Branch 2", body: "Detail C\nDetail D" },
      { kind: "sticky-blue", x: _(40), y: _(280), w: 160, h: 70, title: "Branch 3", body: "Detail E" },
      { kind: "sticky-purple", x: _(600), y: _(280), w: 160, h: 70, title: "Branch 4", body: "Detail F\nDetail G" },
      { kind: "sticky-pink", x: _(340), y: _(320), w: 160, h: 70, title: "Branch 5", body: "Detail H" },
    ],
    connectors: [
      { fromId: "", toId: "", label: "" }, { fromId: "", toId: "", label: "" },
      { fromId: "", toId: "", label: "" }, { fromId: "", toId: "", label: "" },
      { fromId: "", toId: "", label: "" },
    ],
  },
  {
    name: "SWOT Analysis",
    icon: "⚡",
    desc: "Strengths, Weaknesses, Opportunities, Threats",
    nodes: [
      { kind: "sticky-green", x: _(40), y: _(40), w: 280, h: 180, title: "Strengths 💪", body: "• Strong engineering team\n• Good market fit\n• High retention rate\n• Brand recognition" },
      { kind: "sticky-pink", x: _(400), y: _(40), w: 280, h: 180, title: "Weaknesses ⚠️", body: "• Small sales team\n• Limited integrations\n• Documentation gaps\n• Mobile experience" },
      { kind: "sticky-blue", x: _(40), y: _(280), w: 280, h: 180, title: "Opportunities 🌟", body: "• AI market growth\n• New geography\n• Enterprise segment\n• Partnerships" },
      { kind: "sticky-orange", x: _(400), y: _(280), w: 280, h: 180, title: "Threats 🔥", body: "• New competitors\n• Market saturation\n• Regulatory changes\n• Downturn risk" },
      { kind: "process", x: _(220), y: _(520), w: 280, h: 70, title: "Strategic Actions" },
    ],
    connectors: [
      { fromId: "", toId: "", label: "" }, { fromId: "", toId: "", label: "" },
      { fromId: "", toId: "", label: "" }, { fromId: "", toId: "", label: "" },
      { fromId: "", toId: "", label: "inform" },
    ],
  },
  {
    name: "User Story Map",
    icon: "📋",
    desc: "Epics, stories, and tasks organized by release",
    nodes: [
      { kind: "sticky-yellow", x: _(40), y: _(20), w: 180, h: 60, title: "Epic: Auth" },
      { kind: "sticky-green", x: _(260), y: _(20), w: 180, h: 60, title: "Epic: Dashboard" },
      { kind: "sticky-blue", x: _(480), y: _(20), w: 180, h: 60, title: "Epic: Search" },
      { kind: "process", x: _(40), y: _(120), w: 160, h: 50, title: "Login" },
      { kind: "process", x: _(40), y: _(200), w: 160, h: 50, title: "Signup" },
      { kind: "process", x: _(260), y: _(120), w: 160, h: 50, title: "View Stats" },
      { kind: "process", x: _(260), y: _(200), w: 160, h: 50, title: "Profile" },
      { kind: "process", x: _(480), y: _(120), w: 160, h: 50, title: "Basic Search" },
      { kind: "process", x: _(480), y: _(200), w: 160, h: 50, title: "Advanced" },
      { kind: "terminator", x: _(320), y: _(320), w: 120, h: 50, title: "MVP" },
    ],
    connectors: [
      { fromId: "", toId: "", label: "" }, { fromId: "", toId: "", label: "" },
      { fromId: "", toId: "", label: "" }, { fromId: "", toId: "", label: "" },
      { fromId: "", toId: "", label: "" }, { fromId: "", toId: "", label: "" },
      { fromId: "", toId: "", label: "" }, { fromId: "", toId: "", label: "" },
    ],
  },
  {
    name: "Kanban Board",
    icon: "📌",
    desc: "To Do, In Progress, Review, Done columns",
    nodes: [
      { kind: "process", x: _(20), y: _(20), w: 120, h: 50, title: "Backlog" },
      { kind: "process", x: _(20), y: _(80), w: 120, h: 50, title: "To Do" },
      { kind: "sticky-yellow", x: _(200), y: _(20), w: 160, h: 100, title: "In Progress", body: "Feature X\nBug fix Y" },
      { kind: "sticky-blue", x: _(420), y: _(20), w: 160, h: 100, title: "Review", body: "PR #42\nPR #43" },
      { kind: "sticky-green", x: _(640), y: _(20), w: 160, h: 100, title: "Done ✅", body: "Auth system\nLanding page" },
      { kind: "sticky-orange", x: _(640), y: _(160), w: 160, h: 80, title: "Blocked 🚫", body: "Waiting on API" },
    ],
    connectors: [
      { fromId: "", toId: "", label: "" }, { fromId: "", toId: "", label: "" },
      { fromId: "", toId: "", label: "→" }, { fromId: "", toId: "", label: "→" },
    ],
  },
  {
    name: "Flowchart",
    icon: "🔀",
    desc: "Start → Process → Decision → End with branches",
    nodes: [
      { kind: "terminator", x: _(340), y: _(20), w: 140, h: 60, title: "Start" },
      { kind: "process", x: _(340), y: _(140), w: 180, h: 70, title: "Process Data" },
      { kind: "decision", x: _(340), y: _(280), w: 180, h: 120, title: "Valid?" },
      { kind: "process", x: _(40), y: _(480), w: 180, h: 70, title: "Handle Error" },
      { kind: "process", x: _(480), y: _(480), w: 180, h: 70, title: "Save & Continue" },
      { kind: "database", x: _(480), y: _(620), w: 160, h: 90, title: "Database" },
      { kind: "terminator", x: _(340), y: _(640), w: 140, h: 60, title: "End" },
    ],
    connectors: [
      { fromId: "", toId: "", label: "run" },
      { fromId: "", toId: "", label: "check" },
      { fromId: "", toId: "", label: "no" },
      { fromId: "", toId: "", label: "yes" },
      { fromId: "", toId: "", label: "store" },
      { fromId: "", toId: "", label: "done" },
    ],
  },
  {
    name: "Marketing Funnel",
    icon: "📈",
    desc: "Awareness → Interest → Consideration → Purchase → Retention",
    nodes: [
      { kind: "cloud", x: _(260), y: _(20), w: 300, h: 80, title: "Awareness" },
      { kind: "process", x: _(300), y: _(140), w: 220, h: 70, title: "Interest" },
      { kind: "decision", x: _(280), y: _(260), w: 260, h: 100, title: "Consideration" },
      { kind: "sticky-yellow", x: _(320), y: _(400), w: 180, h: 80, title: "Purchase" },
      { kind: "sticky-green", x: _(320), y: _(540), w: 180, h: 80, title: "Retention" },
    ],
    connectors: [
      { fromId: "", toId: "", label: "top of funnel" },
      { fromId: "", toId: "", label: "educate" },
      { fromId: "", toId: "", label: "convert" },
      { fromId: "", toId: "", label: "nurture" },
    ],
  },
  {
    name: "Project Timeline",
    icon: "📅",
    desc: "Phases with milestones and dependencies",
    nodes: [
      { kind: "terminator", x: _(40), y: _(200), w: 140, h: 60, title: "Phase 1" },
      { kind: "process", x: _(260), y: _(200), w: 180, h: 70, title: "Phase 2" },
      { kind: "process", x: _(520), y: _(200), w: 180, h: 70, title: "Phase 3" },
      { kind: "process", x: _(780), y: _(200), w: 180, h: 70, title: "Phase 4" },
      { kind: "star", x: _(40), y: _(40), w: 80, h: 80, title: "Kickoff" },
      { kind: "star", x: _(300), y: _(40), w: 80, h: 80, title: "Alpha" },
      { kind: "star", x: _(560), y: _(40), w: 80, h: 80, title: "Beta" },
      { kind: "star", x: _(820), y: _(40), w: 80, h: 80, title: "Launch" },
    ],
    connectors: [
      { fromId: "", toId: "", label: "2 weeks" },
      { fromId: "", toId: "", label: "4 weeks" },
      { fromId: "", toId: "", label: "4 weeks" },
      { fromId: "", toId: "", label: "ends" },
      { fromId: "", toId: "", label: "end" },
      { fromId: "", toId: "", label: "end" },
      { fromId: "", toId: "", label: "ends" },
    ],
  },
];

export const TEMPLATES = T;

export function applyTemplate(tpl: BoardTemplate, zOffset = 0): { nodes: BoardNode[]; connectors: BoardConnector[]; zCounter: number } {
  let z = 1 + zOffset;
  const nodeMap = new Map<string, string>();
  const nodes: BoardNode[] = tpl.nodes.map(n => {
    const id = uid();
    nodeMap.set(`n${tpl.nodes.indexOf(n)}`, id);
    return { ...n, id, zIndex: z++ };
  });

  const connectors: BoardConnector[] = tpl.connectors.map((c, i) => ({
    ...c,
    id: cid(),
    fromId: nodeMap.get(`n${i}`) || nodeMap.get(`n${Math.floor(i * (tpl.nodes.length - 1) / Math.max(1, tpl.connectors.length - 1))}`) || nodes[0]?.id || "",
    toId: nodeMap.get(`n${i + 1}`) || nodes[Math.min(i + 1, nodes.length - 1)]?.id || nodes[0]?.id || "",
  }));

  return { nodes, connectors, zCounter: z };
}
