export type CrmContact = {
  id: string;
  ownerId: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  title: string | null;
  source: string | null;
  status: "lead" | "prospect" | "customer" | "inactive";
  lifecycleStage: string | null;
  city: string | null;
  country: string | null;
  timezone: string | null;
  instagram: string | null;
  youtube: string | null;
  linkedin: string | null;
  twitter: string | null;
  website: string | null;
  score: number;
  tags: string[];
  customFields: Record<string, any>;
  notes: string | null;
  userId: string | null;
  lastContactedAt: string | null;
  doNotContact: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CrmStage = {
  id: string;
  pipelineId: string;
  name: string;
  color: string;
  position: number;
  probability: number;
  isWon: boolean;
  isLost: boolean;
  createdAt: string;
};

export type CrmPipeline = {
  id: string;
  name: string;
  description: string | null;
  color: string;
  isDefault: boolean;
  position: number;
  stages: CrmStage[];
  createdAt: string;
};

export type CrmOpportunity = {
  id: string;
  pipelineId: string;
  stageId: string;
  contactId: string | null;
  ownerId: string | null;
  title: string;
  description: string | null;
  valueCents: number;
  currency: string;
  status: "open" | "won" | "lost" | "abandoned";
  expectedCloseDate: string | null;
  closedAt: string | null;
  position: number;
  tags: string[];
  customFields: Record<string, any>;
  createdAt: string;
  updatedAt: string;
};

export type CrmActivity = {
  id: string;
  contactId: string | null;
  opportunityId: string | null;
  userId: string | null;
  type: "note" | "email" | "call" | "sms" | "meeting" | "task" | "stage_change" | "tag" | "system";
  title: string;
  body: string | null;
  metadata: Record<string, any> | null;
  occurredAt: string;
  createdAt: string;
};

export type CrmTask = {
  id: string;
  contactId: string | null;
  opportunityId: string | null;
  assigneeId: string | null;
  title: string;
  description: string | null;
  status: "open" | "done" | "snoozed";
  priority: "low" | "normal" | "high" | "urgent";
  dueAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CrmTag = {
  id: string;
  name: string;
  color: string;
  description: string | null;
  createdAt: string;
};

export const STATUS_COLORS: Record<CrmContact["status"], string> = {
  lead: "#60a5fa",
  prospect: "#a78bfa",
  customer: "#22c55e",
  inactive: "#71717a",
};

export const STATUS_LABEL: Record<CrmContact["status"], string> = {
  lead: "Lead",
  prospect: "Prospect",
  customer: "Customer",
  inactive: "Inactive",
};

export const ACTIVITY_ICON: Record<CrmActivity["type"], string> = {
  note: "📝",
  email: "✉️",
  call: "📞",
  sms: "💬",
  meeting: "📅",
  task: "✅",
  stage_change: "🔀",
  tag: "🏷️",
  system: "⚙️",
};

export function fullName(c: Pick<CrmContact, "firstName" | "lastName" | "email">): string {
  const n = [c.firstName, c.lastName].filter(Boolean).join(" ").trim();
  return n || c.email || "Unnamed contact";
}

export function initials(c: Pick<CrmContact, "firstName" | "lastName" | "email">): string {
  const f = (c.firstName || "").trim();
  const l = (c.lastName || "").trim();
  if (f || l) return ((f[0] || "") + (l[0] || "")).toUpperCase() || "?";
  return (c.email || "?").slice(0, 2).toUpperCase();
}

export function formatMoney(cents: number, currency = "USD"): string {
  const v = cents / 100;
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 10_000) return `$${Math.round(v / 1000)}K`;
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}K`;
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(v);
}

export function timeAgo(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const dy = Math.floor(h / 24);
  if (dy < 30) return `${dy}d ago`;
  return d.toLocaleDateString();
}


export type CrmSmartList = {
  id: string;
  name: string;
  description: string | null;
  filters: {
    q?: string;
    status?: string;
    tag?: string;
    source?: string;
    scoreMin?: number;
    scoreMax?: number;
    lastContactedDays?: number;
    doNotContact?: boolean;
  };
  ownerId: string | null;
  pinned: boolean;
  position: number;
  count?: number;
  createdAt: string;
};
