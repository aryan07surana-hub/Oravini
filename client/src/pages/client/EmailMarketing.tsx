import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import {
  LayoutDashboard, Mail, GitBranch, Users, Wand2, BarChart3, Settings2,
  Plus, Zap, Play, Pause, Trash2, Edit3, ChevronRight, ChevronDown,
  Sparkles, Clock, Eye, MousePointerClick, TrendingUp, Send,
  CheckCircle, XCircle, AlertCircle, Copy, MoreHorizontal,
  ArrowDown, ArrowRight, Filter, Upload, Download, RefreshCw,
  Tag, Bell, ToggleLeft, ToggleRight, Server, Shield, Gauge,
  BookOpen, Target, Gift, Star, Repeat, ShoppingCart, MessageSquare,
  Rocket, Heart, Award, Calendar, X, ChevronLeft, Loader2,
  Bot, MessageCircle, AtSign, Link2, Link2Off, SendHorizonal, CornerDownLeft,
  PhoneCall, User,
} from "lucide-react";

const GOLD = "#d4b461";
const GOLD_DIM = "#d4b46133";
const BG = "#040406";

// ── Tier gate ─────────────────────────────────────────────────────────────────

function hasEmailAccess(plan: string | undefined | null): boolean {
  return ["growth", "pro", "elite"].includes(plan || "");
}

// ── Sequence type config ───────────────────────────────────────────────────────

const SEQ_TYPES = [
  { id: "nurture",       label: "Nurture Sequence",       icon: BookOpen,     color: "#22c55e", desc: "Build trust & educate subscribers over time" },
  { id: "welcome",       label: "Welcome / Onboarding",   icon: Heart,        color: "#3b82f6", desc: "Perfect first impressions for new subscribers" },
  { id: "upsell",        label: "Upsell Sequence",        icon: TrendingUp,   color: GOLD,      desc: "Convert customers to higher-value offers" },
  { id: "winback",       label: "Win-back Sequence",      icon: Repeat,       color: "#f97316", desc: "Re-engage cold or inactive subscribers" },
  { id: "launch",        label: "Product Launch",         icon: Rocket,       color: "#a855f7", desc: "Build hype and drive conversions at launch" },
  { id: "promo",         label: "Promotional",            icon: Gift,         color: "#ec4899", desc: "Time-sensitive offers and flash sales" },
  { id: "post_purchase", label: "Post-Purchase",          icon: ShoppingCart, color: "#06b6d4", desc: "Delight buyers and drive repeat revenue" },
  { id: "feedback",      label: "Feedback / Survey",      icon: MessageSquare,color: "#84cc16", desc: "Collect insights and social proof" },
  { id: "referral",      label: "Referral Program",       icon: Users,        color: "#f59e0b", desc: "Turn happy customers into advocates" },
  { id: "webinar",       label: "Webinar Invite",         icon: Calendar,     color: "#6366f1", desc: "Fill your webinars with qualified leads" },
  { id: "abandonment",   label: "Lead Abandonment",       icon: Target,       color: "#ef4444", desc: "Recover leads who didn't complete sign-up" },
  { id: "milestone",     label: "Milestone / Anniversary",icon: Award,        color: "#14b8a6", desc: "Celebrate customer milestones automatically" },
];

// ── SMTP providers ─────────────────────────────────────────────────────────────

const SMTP_PROVIDERS = [
  { id: "gmail",    label: "Gmail / Google Workspace", host: "smtp.gmail.com",    port: 587, note: "Use App Password, not your regular password" },
  { id: "outlook",  label: "Outlook / Microsoft 365",  host: "smtp.office365.com",port: 587, note: "Enable SMTP AUTH in admin center" },
  { id: "sendgrid", label: "SendGrid",                 host: "smtp.sendgrid.net", port: 587, note: "Username is always 'apikey'" },
  { id: "mailgun",  label: "Mailgun",                  host: "smtp.mailgun.org",  port: 587, note: "Find credentials in Mailgun dashboard" },
  { id: "ses",      label: "Amazon SES",               host: "email-smtp.us-east-1.amazonaws.com", port: 587, note: "Use SMTP credentials from SES console" },
  { id: "smtp2go",  label: "SMTP2GO",                  host: "mail.smtp2go.com",  port: 587, note: "Reliable transactional email provider" },
  { id: "custom",   label: "Custom SMTP",              host: "",                  port: 587, note: "Enter your own SMTP server details" },
];

// ── Workflow node types ────────────────────────────────────────────────────────

const TRIGGER_TYPES = [
  { id: "contact_added", label: "Contact Added to List",   icon: Users },
  { id: "tag_applied",   label: "Tag Applied",             icon: Tag },
  { id: "form_submitted",label: "Form Submitted",          icon: CheckCircle },
  { id: "purchase",      label: "Purchase Made",           icon: ShoppingCart },
  { id: "date_based",    label: "Date / Anniversary",      icon: Calendar },
  { id: "manual",        label: "Manual Trigger",          icon: Play },
];

const ACTION_TYPES = [
  { id: "send_email", label: "Send Email",    icon: Mail },
  { id: "wait",       label: "Wait / Delay",  icon: Clock },
  { id: "add_tag",    label: "Add Tag",       icon: Tag },
  { id: "remove_tag", label: "Remove Tag",    icon: XCircle },
  { id: "notify",     label: "Send Notification", icon: Bell },
  { id: "move_seq",   label: "Move to Sequence",  icon: ArrowRight },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

async function apiFetch(path: string, opts: RequestInit = {}) {
  const r = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    credentials: "include",
    ...opts,
  });
  if (!r.ok) {
    const e = await r.json().catch(() => ({ message: r.statusText }));
    throw new Error(e.message || "Request failed");
  }
  return r.json();
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; bg: string; label: string }> = {
    active:  { color: "#22c55e", bg: "#22c55e18", label: "Active" },
    draft:   { color: "#71717a", bg: "#71717a18", label: "Draft" },
    paused:  { color: "#f97316", bg: "#f9731618", label: "Paused" },
    archived:{ color: "#52525b", bg: "#52525b18", label: "Archived" },
  };
  const s = map[status] || map.draft;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
      style={{ color: s.color, background: s.bg, border: `1px solid ${s.color}30` }}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
      {s.label}
    </span>
  );
}

function StatCard({ label, value, sub, color = GOLD, icon: Icon }: any) {
  return (
    <div className="rounded-xl p-4 flex flex-col gap-2" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${GOLD}14` }}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.4)" }}>{label}</span>
        {Icon && <Icon className="w-4 h-4" style={{ color: `${color}80` }} />}
      </div>
      <span className="text-2xl font-black" style={{ color }}>{value}</span>
      {sub && <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>{sub}</span>}
    </div>
  );
}

// ── Nav config ─────────────────────────────────────────────────────────────────

const EM_NAV = [
  { id: "overview",   label: "Overview",        icon: LayoutDashboard },
  { id: "sequences",  label: "Sequences",        icon: Mail },
  { id: "workflow",   label: "Workflow Builder", icon: GitBranch },
  { id: "contacts",   label: "Contacts",         icon: Users },
  { id: "templates",  label: "AI Templates",     icon: Wand2 },
  { id: "analytics",  label: "Analytics",        icon: BarChart3 },
  { id: "smtp",       label: "SMTP & Delivery",  icon: Settings2 },
];

// ═══════════════════════════════════════════════════════════════════════════════
// OVERVIEW SECTION
// ═══════════════════════════════════════════════════════════════════════════════

function OverviewSection({ setActiveId, isEmailConnected }: { setActiveId: (id: string) => void; isEmailConnected: boolean }) {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ["/api/em/analytics"],
    queryFn: () => apiFetch("/api/em/analytics"),
  });

  if (isLoading) return <Loader state="Loading analytics..." />;

  const a = analytics || {};
  const openRate = a.totalSent > 0 ? ((a.totalOpened / a.totalSent) * 100).toFixed(1) : "—";
  const clickRate = a.totalSent > 0 ? ((a.totalClicked / a.totalSent) * 100).toFixed(1) : "—";

  return (
    <div className="space-y-6">
      {/* Email not connected banner */}
      {!isEmailConnected && (
        <button
          onClick={() => setActiveId("smtp")}
          className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-left transition-all hover:scale-[1.005]"
          style={{ background: `${GOLD}0c`, border: `2px dashed ${GOLD}40` }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${GOLD}20` }}>
            <Mail className="w-5 h-5" style={{ color: GOLD }} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-black text-white">Connect your email account to start sending</p>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
              Connect Gmail, Outlook, or SMTP to activate sequences and workflows
            </p>
          </div>
          <span className="flex-shrink-0 text-xs font-black px-3 py-1.5 rounded-xl"
            style={{ background: `linear-gradient(135deg, ${GOLD}, #b8962e)`, color: "#000" }}>
            Connect now →
          </span>
        </button>
      )}
      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Contacts" value={a.totalContacts?.toLocaleString() || "0"} sub="Active subscribers" icon={Users} />
        <StatCard label="Sequences" value={a.totalSequences || "0"} sub="Email sequences" icon={Mail} color="#3b82f6" />
        <StatCard label="Open Rate" value={openRate === "—" ? "—" : `${openRate}%`} sub="Industry avg: 21%" icon={Eye} color="#22c55e" />
        <StatCard label="Click Rate" value={clickRate === "—" ? "—" : `${clickRate}%`} sub="Industry avg: 2.6%" icon={MousePointerClick} color="#a855f7" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Emails Sent" value={a.totalSent?.toLocaleString() || "0"} sub="All time" icon={Send} color="#06b6d4" />
        <StatCard label="Opened" value={a.totalOpened?.toLocaleString() || "0"} sub="Unique opens" icon={Eye} color="#f59e0b" />
        <StatCard label="Clicked" value={a.totalClicked?.toLocaleString() || "0"} sub="Unique clicks" icon={MousePointerClick} color="#ec4899" />
        <StatCard label="Active Workflows" value={a.activeWorkflows || "0"} sub="Running automations" icon={GitBranch} color="#84cc16" />
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-sm font-bold mb-3" style={{ color: "rgba(255,255,255,0.6)" }}>QUICK ACTIONS</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { label: "Create AI Sequence", desc: "Generate a full email sequence with AI in 30 seconds", icon: Sparkles, color: GOLD, action: () => setActiveId("sequences") },
            { label: "Build a Workflow", desc: "Automate your email marketing with a visual workflow", icon: GitBranch, color: "#a855f7", action: () => setActiveId("workflow") },
            { label: "Import Contacts", desc: "Upload your email list and start sending", icon: Upload, color: "#22c55e", action: () => setActiveId("contacts") },
          ].map(q => (
            <button key={q.label} onClick={q.action}
              className="flex items-start gap-3 p-4 rounded-xl text-left transition-all hover:scale-[1.01]"
              style={{ background: `${q.color}0c`, border: `1px solid ${q.color}22` }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: `${q.color}22` }}>
                <q.icon className="w-4 h-4" style={{ color: q.color }} />
              </div>
              <div>
                <p className="text-sm font-bold text-white">{q.label}</p>
                <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{q.desc}</p>
              </div>
              <ChevronRight className="w-4 h-4 ml-auto flex-shrink-0 mt-0.5" style={{ color: q.color }} />
            </button>
          ))}
        </div>
      </div>

      {/* Sequence performance */}
      {a.sequences?.length > 0 && (
        <div>
          <h2 className="text-sm font-bold mb-3" style={{ color: "rgba(255,255,255,0.6)" }}>SEQUENCE PERFORMANCE</h2>
          <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${GOLD}14` }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.03)", borderBottom: `1px solid ${GOLD}10` }}>
                  {["Sequence", "Type", "Status", "Sent", "Open Rate", "Click Rate"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider"
                      style={{ color: "rgba(255,255,255,0.3)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {a.sequences.map((s: any) => {
                  const or = s.total_sent > 0 ? ((s.total_opened / s.total_sent) * 100).toFixed(1) : "—";
                  const cr = s.total_sent > 0 ? ((s.total_clicked / s.total_sent) * 100).toFixed(1) : "—";
                  const type = SEQ_TYPES.find(t => t.id === s.type);
                  return (
                    <tr key={s.id} style={{ borderBottom: `1px solid ${GOLD}08` }}>
                      <td className="px-4 py-3 font-medium text-white">{s.name}</td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
                          style={{ color: type?.color || GOLD, background: `${type?.color || GOLD}18` }}>
                          {type?.label || s.type}
                        </span>
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                      <td className="px-4 py-3 text-zinc-400">{s.total_sent}</td>
                      <td className="px-4 py-3 font-bold" style={{ color: or === "—" ? "#52525b" : "#22c55e" }}>{or}{or !== "—" && "%"}</td>
                      <td className="px-4 py-3 font-bold" style={{ color: cr === "—" ? "#52525b" : "#a855f7" }}>{cr}{cr !== "—" && "%"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Getting started (if no sequences) */}
      {(!a.sequences || a.sequences.length === 0) && (
        <div className="rounded-xl p-8 text-center" style={{ background: `${GOLD}06`, border: `1px dashed ${GOLD}30` }}>
          <Sparkles className="w-10 h-10 mx-auto mb-3" style={{ color: GOLD }} />
          <h3 className="text-lg font-black text-white mb-2">Start with an AI-generated sequence</h3>
          <p className="text-sm mb-4" style={{ color: "rgba(255,255,255,0.4)" }}>
            Tell the AI your offer and audience — it writes a complete sequence in 30 seconds.
          </p>
          <button onClick={() => setActiveId("sequences")}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-black transition-all hover:scale-105"
            style={{ background: `linear-gradient(135deg, ${GOLD}, #b8962e)` }}>
            <Sparkles className="w-4 h-4" /> Create My First Sequence
          </button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEQUENCES SECTION
// ═══════════════════════════════════════════════════════════════════════════════

function AIGenerateModal({ onClose, onCreated }: { onClose: () => void; onCreated: (seq: any) => void }) {
  const [step, setStep] = useState<"type" | "form" | "generating">("type");
  const [type, setType] = useState("");
  const [form, setForm] = useState({ offer: "", audience: "", goal: "", niche: "", emailCount: 5 });
  const [error, setError] = useState("");

  const generate = async () => {
    if (!form.offer.trim()) { setError("Describe your offer"); return; }
    setStep("generating");
    setError("");
    try {
      const seq = await apiFetch("/api/em/ai/generate-sequence", {
        method: "POST",
        body: JSON.stringify({ type, ...form }),
      });
      onCreated(seq);
      onClose();
    } catch (e: any) {
      setError(e.message);
      setStep("form");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}>
      <div className="w-full max-w-2xl rounded-2xl overflow-hidden" style={{ background: "#0a0a0e", border: `1px solid ${GOLD}30` }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid ${GOLD}15` }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${GOLD}22` }}>
              <Sparkles className="w-4 h-4" style={{ color: GOLD }} />
            </div>
            <div>
              <p className="font-black text-white">AI Sequence Generator</p>
              <p className="text-[10px]" style={{ color: `${GOLD}80` }}>
                {step === "type" ? "Step 1 — Choose sequence type" : step === "form" ? "Step 2 — Tell us about your offer" : "Generating your sequence..."}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6">
          {/* Step 1: Type selection */}
          {step === "type" && (
            <div>
              <p className="text-sm mb-4" style={{ color: "rgba(255,255,255,0.5)" }}>What kind of sequence do you want to create?</p>
              <div className="grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto pr-1">
                {SEQ_TYPES.map(t => (
                  <button key={t.id} onClick={() => { setType(t.id); setStep("form"); }}
                    className="flex items-start gap-3 p-3 rounded-xl text-left transition-all hover:scale-[1.01]"
                    style={{ background: `${t.color}0c`, border: `1px solid ${t.color}25` }}>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: `${t.color}22` }}>
                      <t.icon className="w-3.5 h-3.5" style={{ color: t.color }} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white leading-tight">{t.label}</p>
                      <p className="text-[10px] mt-0.5 leading-tight" style={{ color: "rgba(255,255,255,0.4)" }}>{t.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Form */}
          {step === "form" && (
            <div className="space-y-4">
              <button onClick={() => setStep("type")} className="flex items-center gap-1.5 text-xs mb-2" style={{ color: GOLD }}>
                <ChevronLeft className="w-3.5 h-3.5" /> Back to types
              </button>
              {error && <div className="text-xs text-red-400 px-3 py-2 rounded-lg" style={{ background: "#ef444418" }}>{error}</div>}
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>
                  Your offer / product <span style={{ color: GOLD }}>*</span>
                </label>
                <textarea value={form.offer} onChange={e => setForm(f => ({ ...f, offer: e.target.value }))}
                  placeholder="e.g. 'A 6-week coaching program that helps fitness coaches get 10 clients in 90 days'"
                  className="w-full h-20 px-3 py-2.5 rounded-xl text-sm text-white resize-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${GOLD}20`, outline: "none" }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>Target audience</label>
                  <input value={form.audience} onChange={e => setForm(f => ({ ...f, audience: e.target.value }))}
                    placeholder="e.g. online coaches, SaaS founders"
                    className="w-full px-3 py-2.5 rounded-xl text-sm text-white"
                    style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${GOLD}20`, outline: "none" }} />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>Niche / industry</label>
                  <input value={form.niche} onChange={e => setForm(f => ({ ...f, niche: e.target.value }))}
                    placeholder="e.g. fitness, marketing, finance"
                    className="w-full px-3 py-2.5 rounded-xl text-sm text-white"
                    style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${GOLD}20`, outline: "none" }} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>Goal of the sequence</label>
                <input value={form.goal} onChange={e => setForm(f => ({ ...f, goal: e.target.value }))}
                  placeholder="e.g. book a discovery call, purchase the $997 course"
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white"
                  style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${GOLD}20`, outline: "none" }} />
              </div>
              <div>
                <label className="block text-xs font-bold mb-2" style={{ color: "rgba(255,255,255,0.5)" }}>
                  Number of emails: <span style={{ color: GOLD }}>{form.emailCount}</span>
                </label>
                <input type="range" min={3} max={12} value={form.emailCount}
                  onChange={e => setForm(f => ({ ...f, emailCount: +e.target.value }))}
                  className="w-full accent-yellow-500" />
                <div className="flex justify-between text-[10px] mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>
                  <span>3 emails</span><span>12 emails</span>
                </div>
              </div>
              <button onClick={generate}
                className="w-full py-3 rounded-xl font-black text-sm text-black flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
                style={{ background: `linear-gradient(135deg, ${GOLD}, #b8962e)` }}>
                <Sparkles className="w-4 h-4" /> Generate Sequence with AI
              </button>
            </div>
          )}

          {/* Generating state */}
          {step === "generating" && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-2 border-t-transparent animate-spin"
                  style={{ borderColor: GOLD, borderTopColor: "transparent" }} />
                <Sparkles className="w-6 h-6 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ color: GOLD }} />
              </div>
              <div className="text-center">
                <p className="font-black text-white">AI is writing your sequence</p>
                <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>Crafting personalized emails for your audience...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmailStepCard({ step, index, onEdit, onDelete }: { step: any; index: number; onEdit: () => void; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const delay = step.delay_days > 0 ? `Day ${step.delay_days}` : step.delay_hours > 0 ? `+${step.delay_hours}h` : "Immediately";

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${GOLD}18` }}>
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer"
        style={{ background: "rgba(255,255,255,0.03)" }}
        onClick={() => setExpanded(e => !e)}>
        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-black"
          style={{ background: `${GOLD}22`, color: GOLD }}>
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate">{step.subject}</p>
          <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
            {delay} · {step.preview_text || "No preview text"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="p-1.5 rounded-lg transition-colors hover:bg-white/5"><Edit3 className="w-3.5 h-3.5 text-zinc-400" /></button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1.5 rounded-lg transition-colors hover:bg-white/5"><Trash2 className="w-3.5 h-3.5 text-zinc-400" /></button>
          {expanded ? <ChevronDown className="w-4 h-4 text-zinc-500" /> : <ChevronRight className="w-4 h-4 text-zinc-500" />}
        </div>
      </div>
      {expanded && (
        <div className="px-4 py-3 border-t" style={{ borderColor: `${GOLD}10` }}>
          <div className="flex gap-3 mb-2 text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>
            <span>Delay: <strong className="text-white">{delay}</strong></span>
            <span>·</span>
            <span>Optimized send time: <strong className="text-white">{step.send_time_optimized ? "Yes" : "No"}</strong></span>
          </div>
          <div className="rounded-lg p-3 text-xs" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${GOLD}10` }}>
            <div dangerouslySetInnerHTML={{ __html: step.body_html?.slice(0, 400) + (step.body_html?.length > 400 ? "..." : "") || "" }}
              className="text-zinc-400 leading-relaxed" />
          </div>
        </div>
      )}
    </div>
  );
}

function SequencesSection() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");

  const { data: sequences = [], isLoading } = useQuery({
    queryKey: ["/api/em/sequences"],
    queryFn: () => apiFetch("/api/em/sequences"),
  });

  const { data: selected, isLoading: loadingSelected } = useQuery({
    queryKey: ["/api/em/sequences", selectedId],
    queryFn: () => apiFetch(`/api/em/sequences/${selectedId}`),
    enabled: !!selectedId,
  });

  const toggleStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiFetch(`/api/em/sequences/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/em/sequences"] }),
  });

  const deleteSeq = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/em/sequences/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/em/sequences"] }); if (selectedId) setSelectedId(null); },
  });

  const deleteStep = useMutation({
    mutationFn: ({ seqId, stepId }: { seqId: string; stepId: string }) =>
      apiFetch(`/api/em/sequences/${seqId}/steps/${stepId}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/em/sequences", selectedId] }),
  });

  const filtered = sequences.filter((s: any) => filter === "all" || s.status === filter);

  if (selectedId && selected) {
    const typeConfig = SEQ_TYPES.find(t => t.id === selected.type);
    return (
      <div className="space-y-4">
        <button onClick={() => setSelectedId(null)} className="flex items-center gap-2 text-sm" style={{ color: GOLD }}>
          <ChevronLeft className="w-4 h-4" /> All Sequences
        </button>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: `${typeConfig?.color || GOLD}22` }}>
              {typeConfig && <typeConfig.icon className="w-5 h-5" style={{ color: typeConfig.color || GOLD }} />}
            </div>
            <div>
              <h2 className="text-lg font-black text-white">{selected.name}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <StatusBadge status={selected.status} />
                <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                  {selected.steps?.length || 0} emails · {typeConfig?.label}
                  {selected.ai_generated && " · AI Generated"}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => toggleStatus.mutate({ id: selected.id, status: selected.status === "active" ? "paused" : "active" })}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all"
              style={{
                background: selected.status === "active" ? "#f9731618" : `${GOLD}18`,
                border: `1px solid ${selected.status === "active" ? "#f97316" : GOLD}40`,
                color: selected.status === "active" ? "#f97316" : GOLD,
              }}>
              {selected.status === "active" ? <><Pause className="w-3.5 h-3.5" /> Pause</> : <><Play className="w-3.5 h-3.5" /> Activate</>}
            </button>
            <button onClick={() => deleteSeq.mutate(selected.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold"
              style={{ background: "#ef444418", border: "1px solid #ef444440", color: "#ef4444" }}>
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          </div>
        </div>

        {selected.description && (
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>{selected.description}</p>
        )}

        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.4)" }}>
            EMAIL STEPS ({selected.steps?.length || 0})
          </h3>
          <button className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all hover:scale-105"
            style={{ background: `${GOLD}18`, border: `1px solid ${GOLD}30`, color: GOLD }}>
            <Plus className="w-3 h-3" /> Add Email
          </button>
        </div>

        {loadingSelected ? <Loader state="Loading emails..." /> : (
          <div className="space-y-2">
            {selected.steps?.map((step: any, i: number) => (
              <div key={step.id} className="flex items-center gap-2">
                {i > 0 && (
                  <div className="absolute left-[22px] -mt-3 mb-3 w-px h-4" style={{ background: `${GOLD}20` }} />
                )}
                <div className="flex-1">
                  <EmailStepCard
                    step={step} index={i}
                    onEdit={() => {}}
                    onDelete={() => deleteStep.mutate({ seqId: selected.id, stepId: step.id })}
                  />
                </div>
              </div>
            ))}
            {(!selected.steps || selected.steps.length === 0) && (
              <div className="text-center py-8" style={{ color: "rgba(255,255,255,0.3)" }}>
                <Mail className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No emails in this sequence yet.</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showCreate && (
        <AIGenerateModal
          onClose={() => setShowCreate(false)}
          onCreated={(seq) => { qc.invalidateQueries({ queryKey: ["/api/em/sequences"] }); setSelectedId(seq.id); }}
        />
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }}>
          {["all", "active", "draft", "paused"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all"
              style={{
                background: filter === f ? `${GOLD}22` : "transparent",
                color: filter === f ? GOLD : "rgba(255,255,255,0.4)",
                border: filter === f ? `1px solid ${GOLD}30` : "1px solid transparent",
              }}>
              {f}
            </button>
          ))}
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-black transition-all hover:scale-105"
          style={{ background: `linear-gradient(135deg, ${GOLD}, #b8962e)` }}>
          <Sparkles className="w-4 h-4" /> Create with AI
        </button>
      </div>

      {isLoading ? <Loader state="Loading sequences..." /> : filtered.length === 0 ? (
        <div className="text-center py-16" style={{ color: "rgba(255,255,255,0.3)" }}>
          <Mail className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-base font-bold text-white mb-1">No sequences yet</p>
          <p className="text-sm mb-4">Create your first AI-powered email sequence in 30 seconds</p>
          <button onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-black"
            style={{ background: `linear-gradient(135deg, ${GOLD}, #b8962e)` }}>
            <Sparkles className="w-4 h-4" /> Generate First Sequence
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((seq: any) => {
            const typeConfig = SEQ_TYPES.find(t => t.id === seq.type);
            return (
              <div key={seq.id}
                className="flex items-center gap-3 px-4 py-3.5 rounded-xl cursor-pointer transition-all hover:scale-[1.005]"
                style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${GOLD}12` }}
                onClick={() => setSelectedId(seq.id)}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${typeConfig?.color || GOLD}18` }}>
                  {typeConfig && <typeConfig.icon className="w-4 h-4" style={{ color: typeConfig.color || GOLD }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-white truncate">{seq.name}</p>
                    {seq.ai_generated && <Sparkles className="w-3 h-3 flex-shrink-0" style={{ color: GOLD }} />}
                  </div>
                  <p className="text-[10px] mt-0.5 truncate" style={{ color: "rgba(255,255,255,0.3)" }}>
                    {typeConfig?.label} · {seq.total_sent || 0} sent
                  </p>
                </div>
                <StatusBadge status={seq.status} />
                <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "rgba(255,255,255,0.2)" }} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// WORKFLOW BUILDER SECTION
// ═══════════════════════════════════════════════════════════════════════════════

type WFNode = {
  id: string;
  type: "trigger" | "action" | "condition" | "branch";
  label: string;
  triggerType?: string;
  actionType?: string;
  conditionType?: string;
  config?: Record<string, any>;
  yesNextId?: string;
  noNextId?: string;
};

function WorkflowNodeCard({ node, onDelete, onEdit }: { node: WFNode; onDelete: () => void; onEdit: () => void }) {
  const isTrigger = node.type === "trigger";
  const isCondition = node.type === "condition";

  const colors = {
    trigger:   { bg: "#3b82f618", border: "#3b82f630", text: "#3b82f6", icon: Zap },
    action:    { bg: `${GOLD}18`, border: `${GOLD}30`, text: GOLD, icon: Mail },
    condition: { bg: "#a855f718", border: "#a855f730", text: "#a855f7", icon: GitBranch },
    branch:    { bg: "#22c55e18", border: "#22c55e30", text: "#22c55e", icon: ArrowRight },
  }[node.type] || { bg: `${GOLD}18`, border: `${GOLD}30`, text: GOLD, icon: Mail };

  const NodeIcon = colors.icon;

  return (
    <div className="relative">
      <div className="rounded-xl px-4 py-3 flex items-center gap-3"
        style={{ background: colors.bg, border: `1px solid ${colors.border}` }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: colors.bg }}>
          <NodeIcon className="w-4 h-4" style={{ color: colors.text }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: `${colors.text}80` }}>
            {node.type}
          </p>
          <p className="text-sm font-bold text-white truncate">{node.label}</p>
          {node.config?.delayDays > 0 && (
            <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
              Wait {node.config.delayDays} day{node.config.delayDays !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        {!isTrigger && (
          <div className="flex gap-1">
            <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
              <Edit3 className="w-3 h-3 text-zinc-500" />
            </button>
            <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
              <Trash2 className="w-3 h-3 text-zinc-500" />
            </button>
          </div>
        )}
      </div>

      {isCondition && (
        <div className="flex justify-around mt-1 text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>
          <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500" /> Yes branch</span>
          <span className="flex items-center gap-1"><XCircle className="w-3 h-3 text-red-400" /> No branch</span>
        </div>
      )}
    </div>
  );
}

function WorkflowSection() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newTrigger, setNewTrigger] = useState("contact_added");
  const [nodes, setNodes] = useState<WFNode[]>([]);
  const [aiGoal, setAiGoal] = useState("");
  const [aiOffer, setAiOffer] = useState("");
  const [generating, setGenerating] = useState(false);

  const { data: workflows = [], isLoading } = useQuery({
    queryKey: ["/api/em/workflows"],
    queryFn: () => apiFetch("/api/em/workflows"),
  });

  const createWF = useMutation({
    mutationFn: (data: any) => apiFetch("/api/em/workflows", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: (wf) => { qc.invalidateQueries({ queryKey: ["/api/em/workflows"] }); setSelectedId(wf.id); setShowNew(false); },
  });

  const saveWF = useMutation({
    mutationFn: ({ id, data }: any) => apiFetch(`/api/em/workflows/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/em/workflows"] }),
  });

  const deleteWF = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/em/workflows/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/em/workflows"] }); setSelectedId(null); },
  });

  const addNode = (type: WFNode["type"], label: string, extra: Partial<WFNode> = {}) => {
    const id = crypto.randomUUID();
    setNodes(n => [...n, { id, type, label, ...extra }]);
  };

  const generateAI = async () => {
    if (!aiGoal) return;
    setGenerating(true);
    try {
      const result = await apiFetch("/api/em/ai/generate-workflow", {
        method: "POST",
        body: JSON.stringify({ goal: aiGoal, trigger: newTrigger, offer: aiOffer }),
      });
      if (result.nodes) setNodes(result.nodes);
      if (result.name && !newName) setNewName(result.name);
    } catch {}
    setGenerating(false);
  };

  const selectedWF = (workflows as any[]).find((w: any) => w.id === selectedId);

  if (selectedId && selectedWF) {
    const wfNodes: WFNode[] = selectedWF.nodes || nodes;
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button onClick={() => setSelectedId(null)} className="flex items-center gap-2 text-sm" style={{ color: GOLD }}>
            <ChevronLeft className="w-4 h-4" /> All Workflows
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => saveWF.mutate({ id: selectedId, data: { status: selectedWF.status === "active" ? "paused" : "active" } })}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all"
              style={{ background: selectedWF.status === "active" ? "#f9731618" : `${GOLD}18`, border: `1px solid ${selectedWF.status === "active" ? "#f97316" : GOLD}40`, color: selectedWF.status === "active" ? "#f97316" : GOLD }}>
              {selectedWF.status === "active" ? <><Pause className="w-3 h-3" /> Pause</> : <><Play className="w-3 h-3" /> Activate</>}
            </button>
            <button onClick={() => deleteWF.mutate(selectedId)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold"
              style={{ background: "#ef444418", border: "1px solid #ef444440", color: "#ef4444" }}>
              <Trash2 className="w-3 h-3" /> Delete
            </button>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-black text-white">{selectedWF.name}</h2>
          <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>
            {selectedWF.description} · <StatusBadge status={selectedWF.status} />
          </p>
        </div>

        {/* Workflow canvas */}
        <div className="space-y-2">
          {wfNodes.length === 0 ? (
            <div className="text-center py-8" style={{ color: "rgba(255,255,255,0.3)" }}>
              <GitBranch className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No steps yet. Add nodes below.</p>
            </div>
          ) : wfNodes.map((node, i) => (
            <div key={node.id}>
              <WorkflowNodeCard node={node}
                onDelete={() => setNodes(n => n.filter(x => x.id !== node.id))}
                onEdit={() => {}} />
              {i < wfNodes.length - 1 && (
                <div className="flex justify-center my-1">
                  <ArrowDown className="w-4 h-4" style={{ color: `${GOLD}40` }} />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add node buttons */}
        <div className="pt-2">
          <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>ADD STEP</p>
          <div className="flex flex-wrap gap-2">
            {ACTION_TYPES.map(a => (
              <button key={a.id} onClick={() => addNode("action", a.label, { actionType: a.id })}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105"
                style={{ background: `${GOLD}12`, border: `1px solid ${GOLD}25`, color: GOLD }}>
                <a.icon className="w-3 h-3" /> {a.label}
              </button>
            ))}
            <button onClick={() => addNode("condition", "Check: Email Opened?", { conditionType: "opened_email" })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105"
              style={{ background: "#a855f712", border: "1px solid #a855f725", color: "#a855f7" }}>
              <GitBranch className="w-3 h-3" /> Add Condition
            </button>
          </div>
        </div>

        <button
          onClick={() => saveWF.mutate({ id: selectedId, data: { nodes: wfNodes } })}
          className="w-full py-2.5 rounded-xl font-bold text-sm text-black transition-all hover:scale-[1.01]"
          style={{ background: `linear-gradient(135deg, ${GOLD}, #b8962e)` }}>
          <CheckCircle className="w-4 h-4 inline mr-2" /> Save Workflow
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showNew && (
        <div className="rounded-2xl p-5 space-y-4" style={{ background: "#0a0a0e", border: `1px solid ${GOLD}30` }}>
          <div className="flex items-center justify-between">
            <p className="font-black text-white">New Workflow</p>
            <button onClick={() => setShowNew(false)}><X className="w-4 h-4 text-zinc-500" /></button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>Workflow Name</label>
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. New Lead Nurture"
                className="w-full px-3 py-2.5 rounded-xl text-sm text-white"
                style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${GOLD}20`, outline: "none" }} />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>Trigger</label>
              <select value={newTrigger} onChange={e => setNewTrigger(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm text-white"
                style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${GOLD}20`, outline: "none" }}>
                {TRIGGER_TYPES.map(t => <option key={t.id} value={t.id} style={{ background: "#0a0a0e" }}>{t.label}</option>)}
              </select>
            </div>
          </div>

          {/* AI Generate section */}
          <div className="rounded-xl p-4" style={{ background: `${GOLD}08`, border: `1px solid ${GOLD}20` }}>
            <p className="text-xs font-bold mb-2" style={{ color: GOLD }}>
              <Sparkles className="w-3.5 h-3.5 inline mr-1" /> Generate workflow steps with AI
            </p>
            <div className="space-y-2">
              <input value={aiGoal} onChange={e => setAiGoal(e.target.value)}
                placeholder="Workflow goal: e.g. 'Nurture new leads into booking a call'"
                className="w-full px-3 py-2 rounded-lg text-sm text-white"
                style={{ background: "rgba(0,0,0,0.3)", border: `1px solid ${GOLD}20`, outline: "none" }} />
              <input value={aiOffer} onChange={e => setAiOffer(e.target.value)}
                placeholder="Your offer: e.g. '6-week coaching program at $1,997'"
                className="w-full px-3 py-2 rounded-lg text-sm text-white"
                style={{ background: "rgba(0,0,0,0.3)", border: `1px solid ${GOLD}20`, outline: "none" }} />
              <button onClick={generateAI} disabled={generating || !aiGoal}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-black disabled:opacity-50"
                style={{ background: `linear-gradient(135deg, ${GOLD}, #b8962e)` }}>
                {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                {generating ? "Generating..." : "Generate Steps"}
              </button>
            </div>
          </div>

          <button
            onClick={() => createWF.mutate({ name: newName || "New Workflow", triggerType: newTrigger, nodes, description: aiGoal })}
            disabled={!newName}
            className="w-full py-2.5 rounded-xl font-bold text-sm text-black disabled:opacity-50"
            style={{ background: `linear-gradient(135deg, ${GOLD}, #b8962e)` }}>
            Create Workflow
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold" style={{ color: "rgba(255,255,255,0.5)" }}>AUTOMATION WORKFLOWS</h2>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm text-black"
          style={{ background: `linear-gradient(135deg, ${GOLD}, #b8962e)` }}>
          <Plus className="w-4 h-4" /> New Workflow
        </button>
      </div>

      {/* Workflow type templates */}
      <div>
        <p className="text-xs mb-2" style={{ color: "rgba(255,255,255,0.35)" }}>STARTER TEMPLATES</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {[
            { name: "Welcome → Nurture → Upsell", desc: "Classic 3-phase customer journey", icon: Rocket, color: "#22c55e" },
            { name: "Lead Magnet Delivery", desc: "Deliver lead magnet + follow-up sequence", icon: Gift, color: GOLD },
            { name: "Webinar Reminder Sequence", desc: "3 reminders before + replay follow-up", icon: Calendar, color: "#6366f1" },
            { name: "Purchase Onboarding", desc: "Deliver access + onboard new customers", icon: ShoppingCart, color: "#06b6d4" },
            { name: "Win-back Campaign", desc: "Re-engage subscribers after 60 days", icon: Repeat, color: "#f97316" },
            { name: "Referral Ask Sequence", desc: "Ask happy customers for referrals", icon: Heart, color: "#ec4899" },
          ].map(t => (
            <button key={t.name}
              onClick={() => { setNewName(t.name); setAiGoal(t.desc); setShowNew(true); }}
              className="flex items-center gap-3 p-3 rounded-xl text-left transition-all hover:scale-[1.01]"
              style={{ background: `${t.color}0a`, border: `1px solid ${t.color}20` }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `${t.color}22` }}>
                <t.icon className="w-3.5 h-3.5" style={{ color: t.color }} />
              </div>
              <div>
                <p className="text-xs font-bold text-white">{t.name}</p>
                <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>{t.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {isLoading ? <Loader state="Loading workflows..." /> : (workflows as any[]).length === 0 ? (
        <div className="text-center py-8" style={{ color: "rgba(255,255,255,0.3)" }}>
          <GitBranch className="w-10 h-10 mx-auto mb-2 opacity-20" />
          <p className="text-sm font-bold text-white mb-1">No workflows yet</p>
          <p className="text-xs">Use a template above or create a custom workflow</p>
        </div>
      ) : (
        <div>
          <p className="text-xs mb-2" style={{ color: "rgba(255,255,255,0.35)" }}>YOUR WORKFLOWS</p>
          <div className="space-y-2">
            {(workflows as any[]).map((wf: any) => (
              <div key={wf.id}
                onClick={() => setSelectedId(wf.id)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all hover:scale-[1.005]"
                style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${GOLD}12` }}>
                <GitBranch className="w-4 h-4 flex-shrink-0" style={{ color: GOLD }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{wf.name}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                    {(wf.nodes || []).length} steps · {wf.enrolled_count || 0} enrolled
                  </p>
                </div>
                <StatusBadge status={wf.status} />
                <ChevronRight className="w-4 h-4" style={{ color: "rgba(255,255,255,0.2)" }} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTACTS SECTION
// ═══════════════════════════════════════════════════════════════════════════════

function ContactsSection() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ email: "", firstName: "", lastName: "", tags: "" });
  const [search, setSearch] = useState("");
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["/api/em/contacts"],
    queryFn: () => apiFetch("/api/em/contacts"),
  });

  const addContact = useMutation({
    mutationFn: (data: any) => apiFetch("/api/em/contacts", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/em/contacts"] }); setShowAdd(false); setForm({ email: "", firstName: "", lastName: "", tags: "" }); },
  });

  const deleteContact = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/em/contacts/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/em/contacts"] }),
  });

  const handleCSV = async (file: File) => {
    setImporting(true);
    const text = await file.text();
    const lines = text.split("\n").filter(Boolean);
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/["']/g, ""));
    const emailIdx = headers.findIndex(h => h.includes("email"));
    const firstIdx = headers.findIndex(h => h.includes("first") || h === "name");
    const lastIdx = headers.findIndex(h => h.includes("last"));

    if (emailIdx === -1) { setImporting(false); return; }

    const batch = lines.slice(1).map(line => {
      const cols = line.split(",").map(c => c.trim().replace(/["']/g, ""));
      return { email: cols[emailIdx], firstName: firstIdx >= 0 ? cols[firstIdx] : undefined, lastName: lastIdx >= 0 ? cols[lastIdx] : undefined };
    }).filter(c => c.email);

    try {
      await apiFetch("/api/em/contacts/bulk", { method: "POST", body: JSON.stringify({ contacts: batch }) });
      qc.invalidateQueries({ queryKey: ["/api/em/contacts"] });
    } catch {}
    setImporting(false);
  };

  const filtered = (contacts as any[]).filter((c: any) =>
    !search || c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.first_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.last_name?.toLowerCase().includes(search.toLowerCase())
  );

  const subscribed = (contacts as any[]).filter((c: any) => c.subscribed).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total" value={(contacts as any[]).length} icon={Users} />
        <StatCard label="Subscribed" value={subscribed} color="#22c55e" icon={CheckCircle} />
        <StatCard label="Unsubscribed" value={(contacts as any[]).length - subscribed} color="#ef4444" icon={XCircle} />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search contacts..."
          className="flex-1 min-w-0 px-3 py-2.5 rounded-xl text-sm text-white"
          style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${GOLD}20`, outline: "none" }} />
        <input ref={fileRef} type="file" accept=".csv" className="hidden"
          onChange={e => e.target.files?.[0] && handleCSV(e.target.files[0])} />
        <button onClick={() => fileRef.current?.click()} disabled={importing}
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold transition-all"
          style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${GOLD}20`, color: "rgba(255,255,255,0.6)" }}>
          {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          Import CSV
        </button>
        <button onClick={() => setShowAdd(s => !s)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-black"
          style={{ background: `linear-gradient(135deg, ${GOLD}, #b8962e)` }}>
          <Plus className="w-4 h-4" /> Add Contact
        </button>
      </div>

      {showAdd && (
        <div className="rounded-xl p-4 space-y-3" style={{ background: "#0a0a0e", border: `1px solid ${GOLD}25` }}>
          <div className="grid grid-cols-2 gap-3">
            <input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
              placeholder="First name" className="px-3 py-2 rounded-lg text-sm text-white"
              style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${GOLD}15`, outline: "none" }} />
            <input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
              placeholder="Last name" className="px-3 py-2 rounded-lg text-sm text-white"
              style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${GOLD}15`, outline: "none" }} />
          </div>
          <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            placeholder="Email address *" className="w-full px-3 py-2 rounded-lg text-sm text-white"
            style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${GOLD}15`, outline: "none" }} />
          <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
            placeholder="Tags (comma separated): lead, vip, webinar" className="w-full px-3 py-2 rounded-lg text-sm text-white"
            style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${GOLD}15`, outline: "none" }} />
          <div className="flex gap-2">
            <button onClick={() => addContact.mutate({ ...form, tags: form.tags ? form.tags.split(",").map(t => t.trim()) : [] })}
              disabled={!form.email}
              className="flex-1 py-2 rounded-lg text-sm font-bold text-black disabled:opacity-50"
              style={{ background: `linear-gradient(135deg, ${GOLD}, #b8962e)` }}>
              Add Contact
            </button>
            <button onClick={() => setShowAdd(false)}
              className="px-4 py-2 rounded-lg text-sm font-bold"
              style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)" }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {isLoading ? <Loader state="Loading contacts..." /> : filtered.length === 0 ? (
        <div className="text-center py-12" style={{ color: "rgba(255,255,255,0.3)" }}>
          <Users className="w-10 h-10 mx-auto mb-2 opacity-20" />
          <p className="text-sm font-bold text-white mb-1">{search ? "No contacts found" : "No contacts yet"}</p>
          <p className="text-xs">{search ? "Try a different search" : "Import a CSV or add contacts manually"}</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${GOLD}12` }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.03)", borderBottom: `1px solid ${GOLD}10` }}>
                {["Name", "Email", "Tags", "Status", "Added", ""].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: "rgba(255,255,255,0.3)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c: any) => (
                <tr key={c.id} style={{ borderBottom: `1px solid ${GOLD}06` }}>
                  <td className="px-4 py-3 font-medium text-white">
                    {[c.first_name, c.last_name].filter(Boolean).join(" ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-400 text-xs">{c.email}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(c.tags || []).slice(0, 2).map((tag: string) => (
                        <span key={tag} className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase"
                          style={{ background: `${GOLD}18`, color: GOLD }}>{tag}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={c.subscribed ? "active" : "archived"} />
                  </td>
                  <td className="px-4 py-3 text-zinc-500 text-xs">
                    {new Date(c.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => deleteContact.mutate(c.id)}
                      className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
                      <Trash2 className="w-3.5 h-3.5 text-zinc-600 hover:text-red-400" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATES SECTION
// ═══════════════════════════════════════════════════════════════════════════════

const TEMPLATE_LIBRARY = [
  {
    id: "welcome_coach",
    name: "Coach Welcome Series",
    type: "welcome",
    emails: 5,
    desc: "Perfect for coaches onboarding new leads. Builds trust fast.",
    preview: "Welcome to [your world]! I'm so glad you're here...",
    tags: ["coaching", "welcome", "trust"],
  },
  {
    id: "saas_nurture",
    name: "SaaS Educational Drip",
    type: "nurture",
    emails: 7,
    desc: "Educate trial users on features to drive activation and conversion.",
    preview: "Did you know most users miss this one feature that changes everything?",
    tags: ["saas", "education", "activation"],
  },
  {
    id: "product_launch",
    name: "5-Day Product Launch",
    type: "launch",
    emails: 5,
    desc: "Pre-launch hype → open cart → urgency → cart close sequence.",
    preview: "Something big is coming. I've been working on this for 6 months...",
    tags: ["launch", "urgency", "revenue"],
  },
  {
    id: "webinar_invite",
    name: "Webinar Fill-up System",
    type: "webinar",
    emails: 4,
    desc: "Invite → confirm → 3 reminders → replay offer sequence.",
    preview: "You're invited to a live training that could change your business...",
    tags: ["webinar", "invite", "reminder"],
  },
  {
    id: "ecom_winback",
    name: "E-commerce Win-back",
    type: "winback",
    emails: 4,
    desc: "Re-engage customers who haven't purchased in 90 days.",
    preview: "We miss you. Seriously. Here's 20% off to come back...",
    tags: ["ecommerce", "winback", "discount"],
  },
  {
    id: "referral_ask",
    name: "Referral Ask Sequence",
    type: "referral",
    emails: 3,
    desc: "Turn happy customers into your best salespeople.",
    preview: "You've been killing it. I wanted to reach out personally...",
    tags: ["referral", "advocacy", "growth"],
  },
  {
    id: "post_purchase",
    name: "Post-Purchase Delight",
    type: "post_purchase",
    emails: 5,
    desc: "Onboard buyers, reduce refunds, and plant upsell seeds.",
    preview: "Your order is confirmed — but more importantly, here's how to get results...",
    tags: ["post-purchase", "onboarding", "upsell"],
  },
  {
    id: "abandoned_lead",
    name: "Lead Abandonment Recovery",
    type: "abandonment",
    emails: 3,
    desc: "Recover leads who saw your offer but didn't opt in.",
    preview: "I noticed you visited my page but didn't grab [lead magnet]...",
    tags: ["recovery", "leads", "conversion"],
  },
  {
    id: "high_ticket_upsell",
    name: "High-Ticket Upsell Path",
    type: "upsell",
    emails: 6,
    desc: "Move low-ticket buyers to $3k–$10k programs with conviction.",
    preview: "You've made incredible progress. I want to share something with you...",
    tags: ["upsell", "high-ticket", "premium"],
  },
];

function TemplatesSection({ onUseTemplate }: { onUseTemplate: (t: any) => void }) {
  const [filter, setFilter] = useState("all");

  const types = ["all", ...Array.from(new Set(TEMPLATE_LIBRARY.map(t => t.type)))];
  const filtered = TEMPLATE_LIBRARY.filter(t => filter === "all" || t.type === filter);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-black text-white mb-1">AI Template Library</h2>
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
          Pre-built sequences you can customize and deploy in minutes. Click any template to generate it with AI for your specific offer.
        </p>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {types.map(t => {
          const typeConf = SEQ_TYPES.find(s => s.id === t);
          return (
            <button key={t} onClick={() => setFilter(t)}
              className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider capitalize transition-all"
              style={{
                background: filter === t ? `${typeConf?.color || GOLD}22` : "rgba(255,255,255,0.04)",
                color: filter === t ? (typeConf?.color || GOLD) : "rgba(255,255,255,0.4)",
                border: `1px solid ${filter === t ? (typeConf?.color || GOLD) + "40" : "transparent"}`,
              }}>
              {t === "post_purchase" ? "Post-Purchase" : t}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {filtered.map(t => {
          const typeConf = SEQ_TYPES.find(s => s.id === t.type);
          return (
            <div key={t.id} className="rounded-xl p-4 space-y-3 transition-all hover:scale-[1.01]"
              style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${GOLD}12` }}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: `${typeConf?.color || GOLD}22` }}>
                    {typeConf && <typeConf.icon className="w-3.5 h-3.5" style={{ color: typeConf.color }} />}
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={{ color: typeConf?.color || GOLD, background: `${typeConf?.color || GOLD}18` }}>
                    {typeConf?.label}
                  </span>
                </div>
                <span className="text-[10px] font-bold" style={{ color: "rgba(255,255,255,0.3)" }}>
                  {t.emails} emails
                </span>
              </div>

              <div>
                <p className="text-sm font-black text-white">{t.name}</p>
                <p className="text-xs mt-1 leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>{t.desc}</p>
              </div>

              <div className="rounded-lg px-3 py-2" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${GOLD}08` }}>
                <p className="text-[10px] italic" style={{ color: "rgba(255,255,255,0.3)" }}>"{t.preview}"</p>
              </div>

              <div className="flex flex-wrap gap-1">
                {t.tags.map(tag => (
                  <span key={tag} className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}>
                    {tag}
                  </span>
                ))}
              </div>

              <button onClick={() => onUseTemplate(t)}
                className="w-full py-2 rounded-xl text-xs font-black text-black flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                style={{ background: `linear-gradient(135deg, ${GOLD}, #b8962e)` }}>
                <Sparkles className="w-3.5 h-3.5" /> Use This Template
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANALYTICS SECTION
// ═══════════════════════════════════════════════════════════════════════════════

function AnalyticsSection() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ["/api/em/analytics"],
    queryFn: () => apiFetch("/api/em/analytics"),
  });

  if (isLoading) return <Loader state="Loading analytics..." />;
  const a = analytics || {};

  const metrics = [
    { label: "Total Sent", value: a.totalSent || 0, icon: Send, color: "#3b82f6" },
    { label: "Opened", value: a.totalOpened || 0, icon: Eye, color: "#22c55e" },
    { label: "Clicked", value: a.totalClicked || 0, icon: MousePointerClick, color: "#a855f7" },
    { label: "Open Rate", value: a.totalSent > 0 ? `${((a.totalOpened / a.totalSent) * 100).toFixed(1)}%` : "—", icon: TrendingUp, color: GOLD },
    { label: "Click Rate", value: a.totalSent > 0 ? `${((a.totalClicked / a.totalSent) * 100).toFixed(1)}%` : "—", icon: MousePointerClick, color: "#ec4899" },
    { label: "Click-to-Open", value: a.totalOpened > 0 ? `${((a.totalClicked / a.totalOpened) * 100).toFixed(1)}%` : "—", icon: Target, color: "#f97316" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {metrics.map(m => (
          <StatCard key={m.label} label={m.label} value={typeof m.value === "number" ? m.value.toLocaleString() : m.value}
            icon={m.icon} color={m.color} />
        ))}
      </div>

      {/* Industry benchmarks */}
      <div className="rounded-xl p-5" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${GOLD}14` }}>
        <h3 className="text-sm font-black text-white mb-4">How you compare to industry averages</h3>
        <div className="space-y-4">
          {[
            { label: "Open Rate", yours: a.totalSent > 0 ? (a.totalOpened / a.totalSent * 100) : null, bench: 21.3, color: "#22c55e" },
            { label: "Click Rate", yours: a.totalSent > 0 ? (a.totalClicked / a.totalSent * 100) : null, bench: 2.6, color: "#a855f7" },
            { label: "Click-to-Open", yours: a.totalOpened > 0 ? (a.totalClicked / a.totalOpened * 100) : null, bench: 11, color: "#f97316" },
          ].map(b => {
            const pct = b.yours !== null ? Math.min(b.yours / (b.bench * 2) * 100, 100) : 0;
            const benchPct = 50;
            return (
              <div key={b.label}>
                <div className="flex justify-between mb-1.5">
                  <span className="text-xs font-bold text-white">{b.label}</span>
                  <div className="flex gap-3 text-[10px]">
                    <span style={{ color: "rgba(255,255,255,0.35)" }}>Industry: {b.bench}%</span>
                    <span style={{ color: b.color }}>Yours: {b.yours !== null ? `${b.yours.toFixed(1)}%` : "No data"}</span>
                  </div>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${b.color}80, ${b.color})` }} />
                </div>
                <div className="relative h-0">
                  <div className="absolute -top-2 h-3 w-px" style={{ left: `${benchPct}%`, background: "rgba(255,255,255,0.3)" }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Deliverability tips */}
      <div className="rounded-xl p-5" style={{ background: `${GOLD}06`, border: `1px solid ${GOLD}20` }}>
        <h3 className="text-sm font-black mb-3" style={{ color: GOLD }}>Deliverability Best Practices</h3>
        <div className="space-y-2">
          {[
            "Send from a custom domain email (not @gmail.com) to build sender reputation",
            "Warm up new sending domains gradually: 50/day → 100 → 250 → 500 over 4 weeks",
            "Maintain list hygiene: remove hard bounces immediately, soft bounces after 3 attempts",
            "Send emails on Tues–Thurs between 9–11am or 1–3pm in the recipient's timezone",
            "Keep subject lines under 60 chars. Avoid spam words: 'Free', 'Guaranteed', 'Buy now'",
            "Include a clear unsubscribe link — it actually improves deliverability",
            "Text-to-image ratio: at least 60% text. Avoid image-only emails",
            "Authenticate your domain with SPF, DKIM, and DMARC records",
          ].map((tip, i) => (
            <div key={i} className="flex items-start gap-2 text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
              <CheckCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: GOLD }} />
              {tip}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SMTP SECTION
// ═══════════════════════════════════════════════════════════════════════════════

function SmtpSection() {
  const qc = useQueryClient();
  const { data: smtpConfig, isLoading } = useQuery({
    queryKey: ["/api/em/smtp"],
    queryFn: () => apiFetch("/api/em/smtp"),
  });

  const [form, setForm] = useState({
    provider: "custom", host: "", port: 587, secure: false, username: "", password: "",
    fromName: "", fromEmail: "", replyTo: "", dailySendLimit: 500, warmingEnabled: false,
  });

  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<null | { ok: boolean; message: string }>(null);

  // Sync form from fetched config
  const syncDone = useRef(false);
  if (!isLoading && smtpConfig && !syncDone.current) {
    syncDone.current = true;
    setForm(f => ({
      ...f,
      provider: smtpConfig.provider || "custom",
      host: smtpConfig.host || "",
      port: smtpConfig.port || 587,
      secure: smtpConfig.secure || false,
      username: smtpConfig.username || "",
      fromName: smtpConfig.from_name || "",
      fromEmail: smtpConfig.from_email || "",
      replyTo: smtpConfig.reply_to || "",
      dailySendLimit: smtpConfig.daily_send_limit || 500,
      warmingEnabled: smtpConfig.warming_enabled || false,
    }));
  }

  const saveSmtp = useMutation({
    mutationFn: (data: any) => apiFetch("/api/em/smtp", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/em/smtp"] }); setSaved(true); setTimeout(() => setSaved(false), 3000); },
  });

  const { data: oauthStatus } = useQuery({
    queryKey: ["/api/em/oauth/status"],
    queryFn: () => apiFetch("/api/em/oauth/status"),
  });

  const disconnectOAuth = useMutation({
    mutationFn: (provider: string) => apiFetch(`/api/em/oauth/${provider}/disconnect`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/em/oauth/status"] }),
  });

  const handleProviderSelect = (p: typeof SMTP_PROVIDERS[0]) => {
    setForm(f => ({ ...f, provider: p.id, host: p.host, port: p.port }));
  };

  const testConn = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const r = await apiFetch("/api/em/smtp/test", { method: "POST", body: JSON.stringify({ host: form.host, port: form.port }) });
      setTestResult({ ok: true, message: r.message });
    } catch (e: any) {
      setTestResult({ ok: false, message: e.message });
    }
    setTesting(false);
  };

  if (isLoading) return <Loader state="Loading SMTP config..." />;

  const selectedProvider = SMTP_PROVIDERS.find(p => p.id === form.provider);

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Connected Accounts (OAuth) */}
      <div className="rounded-xl p-5 space-y-4" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${GOLD}14` }}>
        <div className="flex items-center gap-2">
          <AtSign className="w-4 h-4" style={{ color: GOLD }} />
          <p className="text-sm font-black text-white">Connected Accounts</p>
        </div>
        <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
          Send emails directly from your Gmail or Outlook — no SMTP credentials needed.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {/* Gmail */}
          {(() => {
            const gmail = oauthStatus?.gmail;
            return gmail?.connected ? (
              <div className="rounded-xl p-3" style={{ background: "#22c55e0c", border: "1px solid #22c55e25" }}>
                <div className="flex items-center gap-2 mb-2">
                  <Link2 className="w-3.5 h-3.5 text-green-500" />
                  <span className="text-xs font-bold text-green-500">Gmail Connected</span>
                </div>
                <p className="text-[11px] text-zinc-400 mb-3 truncate">{gmail.email}</p>
                <button onClick={() => disconnectOAuth.mutate("gmail")}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-bold transition-all hover:bg-white/5"
                  style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <Link2Off className="w-3 h-3" /> Disconnect
                </button>
              </div>
            ) : (
              <button onClick={() => { window.location.href = "/api/em/oauth/gmail/connect"; }}
                className="rounded-xl p-3 text-left transition-all hover:scale-[1.01]"
                style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${GOLD}15` }}>
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="w-3.5 h-3.5" style={{ color: GOLD }} />
                  <span className="text-xs font-bold text-white">Gmail</span>
                </div>
                <p className="text-[11px] mb-2" style={{ color: "rgba(255,255,255,0.35)" }}>Connect Google account</p>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold" style={{ color: GOLD }}>
                  Connect <ChevronRight className="w-3 h-3" />
                </span>
              </button>
            );
          })()}
          {/* Outlook */}
          {(() => {
            const outlook = oauthStatus?.outlook;
            return outlook?.connected ? (
              <div className="rounded-xl p-3" style={{ background: "#22c55e0c", border: "1px solid #22c55e25" }}>
                <div className="flex items-center gap-2 mb-2">
                  <Link2 className="w-3.5 h-3.5 text-green-500" />
                  <span className="text-xs font-bold text-green-500">Outlook Connected</span>
                </div>
                <p className="text-[11px] text-zinc-400 mb-3 truncate">{outlook.email}</p>
                <button onClick={() => disconnectOAuth.mutate("outlook")}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-bold transition-all hover:bg-white/5"
                  style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <Link2Off className="w-3 h-3" /> Disconnect
                </button>
              </div>
            ) : (
              <button onClick={() => { window.location.href = "/api/em/oauth/outlook/connect"; }}
                className="rounded-xl p-3 text-left transition-all hover:scale-[1.01]"
                style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${GOLD}15` }}>
                <div className="flex items-center gap-2 mb-2">
                  <MessageCircle className="w-3.5 h-3.5" style={{ color: "#0ea5e9" }} />
                  <span className="text-xs font-bold text-white">Outlook</span>
                </div>
                <p className="text-[11px] mb-2" style={{ color: "rgba(255,255,255,0.35)" }}>Connect Microsoft account</p>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold" style={{ color: "#0ea5e9" }}>
                  Connect <ChevronRight className="w-3 h-3" />
                </span>
              </button>
            );
          })()}
        </div>
      </div>

      <div>
        <h2 className="text-base font-black text-white mb-1">SMTP & Email Delivery</h2>
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
          Connect your SMTP provider to send emails. Your subscribers receive emails from your own domain for maximum deliverability.
        </p>
      </div>

      {smtpConfig?.is_verified && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold"
          style={{ background: "#22c55e12", border: "1px solid #22c55e30", color: "#22c55e" }}>
          <Shield className="w-4 h-4" /> SMTP Verified — Ready to send
        </div>
      )}

      {/* Provider selection */}
      <div>
        <label className="block text-xs font-bold mb-2" style={{ color: "rgba(255,255,255,0.5)" }}>Email Provider</label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {SMTP_PROVIDERS.map(p => (
            <button key={p.id} onClick={() => handleProviderSelect(p)}
              className="px-3 py-2.5 rounded-xl text-xs font-bold text-left transition-all"
              style={{
                background: form.provider === p.id ? `${GOLD}18` : "rgba(255,255,255,0.03)",
                border: `1px solid ${form.provider === p.id ? GOLD + "40" : GOLD + "10"}`,
                color: form.provider === p.id ? GOLD : "rgba(255,255,255,0.5)",
              }}>
              {p.label}
            </button>
          ))}
        </div>
        {selectedProvider?.note && (
          <p className="mt-2 text-[10px] px-3 py-2 rounded-lg" style={{ background: `${GOLD}08`, color: `${GOLD}90` }}>
            <AlertCircle className="w-3 h-3 inline mr-1" /> {selectedProvider.note}
          </p>
        )}
      </div>

      {/* Connection settings */}
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-bold mb-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>SMTP Host</label>
            <input value={form.host} onChange={e => setForm(f => ({ ...f, host: e.target.value }))}
              placeholder="smtp.example.com"
              className="w-full px-3 py-2.5 rounded-xl text-sm text-white font-mono"
              style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${GOLD}20`, outline: "none" }} />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>Port</label>
            <input type="number" value={form.port} onChange={e => setForm(f => ({ ...f, port: +e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl text-sm text-white font-mono"
              style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${GOLD}20`, outline: "none" }} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>Username</label>
            <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              placeholder="your@email.com"
              className="w-full px-3 py-2.5 rounded-xl text-sm text-white"
              style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${GOLD}20`, outline: "none" }} />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>Password / API Key</label>
            <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder="••••••••••••"
              className="w-full px-3 py-2.5 rounded-xl text-sm text-white"
              style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${GOLD}20`, outline: "none" }} />
          </div>
        </div>
      </div>

      {/* Sender identity */}
      <div>
        <p className="text-xs font-bold mb-2 uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.4)" }}>Sender Identity</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>From Name</label>
            <input value={form.fromName} onChange={e => setForm(f => ({ ...f, fromName: e.target.value }))}
              placeholder="Your Name"
              className="w-full px-3 py-2.5 rounded-xl text-sm text-white"
              style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${GOLD}20`, outline: "none" }} />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>From Email</label>
            <input value={form.fromEmail} onChange={e => setForm(f => ({ ...f, fromEmail: e.target.value }))}
              placeholder="hello@yourdomain.com"
              className="w-full px-3 py-2.5 rounded-xl text-sm text-white"
              style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${GOLD}20`, outline: "none" }} />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>Reply-To (optional)</label>
            <input value={form.replyTo} onChange={e => setForm(f => ({ ...f, replyTo: e.target.value }))}
              placeholder="replies@yourdomain.com"
              className="w-full px-3 py-2.5 rounded-xl text-sm text-white"
              style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${GOLD}20`, outline: "none" }} />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>Daily Send Limit</label>
            <input type="number" value={form.dailySendLimit} onChange={e => setForm(f => ({ ...f, dailySendLimit: +e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl text-sm text-white"
              style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${GOLD}20`, outline: "none" }} />
          </div>
        </div>
      </div>

      {/* Warming toggle */}
      <div className="flex items-center justify-between px-4 py-3 rounded-xl"
        style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${GOLD}12` }}>
        <div>
          <p className="text-sm font-bold text-white">Gradual warm-up mode</p>
          <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
            Increase daily send volume slowly to build sender reputation (recommended for new domains)
          </p>
        </div>
        <button onClick={() => setForm(f => ({ ...f, warmingEnabled: !f.warmingEnabled }))}
          className="flex-shrink-0 ml-4">
          {form.warmingEnabled
            ? <ToggleRight className="w-8 h-8" style={{ color: GOLD }} />
            : <ToggleLeft className="w-8 h-8 text-zinc-600" />}
        </button>
      </div>

      {testResult && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
          style={{
            background: testResult.ok ? "#22c55e12" : "#ef444412",
            border: `1px solid ${testResult.ok ? "#22c55e" : "#ef4444"}30`,
            color: testResult.ok ? "#22c55e" : "#ef4444",
          }}>
          {testResult.ok ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {testResult.message}
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={testConn} disabled={testing || !form.host}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50"
          style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${GOLD}20`, color: "rgba(255,255,255,0.6)" }}>
          {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Server className="w-4 h-4" />}
          Test Connection
        </button>
        <button onClick={() => saveSmtp.mutate(form)}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black text-black transition-all hover:scale-[1.01]"
          style={{ background: `linear-gradient(135deg, ${GOLD}, #b8962e)` }}>
          {saved ? <><CheckCircle className="w-4 h-4" /> Saved!</> : <><Shield className="w-4 h-4" /> Save SMTP Config</>}
        </button>
      </div>

      {/* DNS checklist */}
      <div className="rounded-xl p-5" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${GOLD}12` }}>
        <h3 className="text-sm font-black text-white mb-3">DNS Authentication Checklist</h3>
        <p className="text-xs mb-3" style={{ color: "rgba(255,255,255,0.4)" }}>
          Add these DNS records to your domain to maximize deliverability and avoid spam filters.
        </p>
        <div className="space-y-2">
          {[
            { record: "SPF", type: "TXT", value: "v=spf1 include:_spf.yourmailprovider.com ~all", desc: "Tells receiving servers which IPs can send on your behalf" },
            { record: "DKIM", type: "TXT", value: "Get this from your email provider's dashboard", desc: "Cryptographically signs emails to prove authenticity" },
            { record: "DMARC", type: "TXT", value: "v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com", desc: "Instructs servers what to do with emails that fail SPF/DKIM" },
          ].map(d => (
            <div key={d.record} className="rounded-lg p-3" style={{ background: "rgba(255,255,255,0.03)" }}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full"
                  style={{ background: `${GOLD}20`, color: GOLD }}>{d.record}</span>
                <span className="text-[10px] font-bold text-zinc-500">Type: {d.type}</span>
              </div>
              <p className="text-xs font-mono text-zinc-400 mb-1">{d.value}</p>
              <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>{d.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOADER HELPER
// ═══════════════════════════════════════════════════════════════════════════════

function Loader({ state }: { state: string }) {
  return (
    <div className="flex items-center justify-center py-16 gap-3" style={{ color: "rgba(255,255,255,0.3)" }}>
      <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: GOLD, borderTopColor: "transparent" }} />
      <span className="text-sm">{state}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// AI CHAT BUBBLE
// ═══════════════════════════════════════════════════════════════════════════════

function AIChatBubble() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const qc = useQueryClient();
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: history = [], isLoading: histLoading } = useQuery<any[]>({
    queryKey: ["/api/em/chat/history"],
    queryFn: () => apiFetch("/api/em/chat/history"),
    enabled: open,
  });

  const sendMsg = useMutation({
    mutationFn: (message: string) => apiFetch("/api/em/chat", { method: "POST", body: JSON.stringify({ message }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/em/chat/history"] }); setInput(""); },
  });

  const clearHistory = useMutation({
    mutationFn: () => apiFetch("/api/em/chat/history", { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/em/chat/history"] }),
  });

  useEffect(() => {
    if (open && bottomRef.current) bottomRef.current.scrollIntoView({ behavior: "smooth" });
  }, [history, open]);

  const handleSend = () => {
    if (!input.trim() || sendMsg.isPending) return;
    sendMsg.mutate(input.trim());
  };

  const SUGGESTIONS = [
    "Create a 5-email welcome sequence",
    "Write a win-back email for cold leads",
    "What's a good open rate for SaaS?",
  ];

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl transition-all hover:scale-105 active:scale-95"
        style={{ background: `linear-gradient(135deg, ${GOLD}, #b8962e)`, boxShadow: `0 0 24px ${GOLD}40` }}>
        {open ? <X className="w-5 h-5 text-black" /> : <Bot className="w-6 h-6 text-black" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-24 right-6 z-50 w-80 rounded-2xl flex flex-col overflow-hidden"
          style={{
            background: "rgba(4,4,6,0.98)",
            border: `1px solid ${GOLD}25`,
            boxShadow: `0 0 40px rgba(0,0,0,0.8), 0 0 20px ${GOLD}15`,
            height: "460px",
            backdropFilter: "blur(20px)",
          }}>
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0" style={{ borderBottom: `1px solid ${GOLD}15` }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${GOLD}20` }}>
              <Bot className="w-4 h-4" style={{ color: GOLD }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-white">Oravini AI</p>
              <p className="text-[10px]" style={{ color: `${GOLD}70` }}>Email marketing assistant</p>
            </div>
            <button onClick={() => clearHistory.mutate()} title="Clear history"
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-white/10"
              style={{ color: "rgba(255,255,255,0.35)" }}>
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {histLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: GOLD }} />
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-5">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 opacity-30"
                  style={{ background: `${GOLD}20` }}>
                  <Bot className="w-6 h-6" style={{ color: GOLD }} />
                </div>
                <p className="text-xs font-black text-white mb-1">AI Email Assistant</p>
                <p className="text-[11px] mb-4" style={{ color: "rgba(255,255,255,0.35)" }}>
                  Create sequences, improve subject lines, or ask any email marketing question.
                </p>
                <div className="space-y-1.5">
                  {SUGGESTIONS.map(s => (
                    <button key={s} onClick={() => setInput(s)}
                      className="block w-full text-left text-[11px] px-3 py-2 rounded-lg transition-all hover:bg-white/5"
                      style={{ color: `${GOLD}90`, border: `1px solid ${GOLD}15` }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              history.map((msg: any) => (
                <div key={msg.id} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                  <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5"
                    style={{ background: msg.role === "user" ? `${GOLD}25` : "rgba(255,255,255,0.08)" }}>
                    {msg.role === "user"
                      ? <User className="w-3 h-3" style={{ color: GOLD }} />
                      : <Bot className="w-3 h-3" style={{ color: "rgba(255,255,255,0.6)" }} />}
                  </div>
                  <div
                    className={`max-w-[82%] rounded-xl px-3 py-2 text-[12px] leading-relaxed ${msg.role === "user" ? "rounded-tr-sm" : "rounded-tl-sm"}`}
                    style={{
                      background: msg.role === "user" ? `${GOLD}18` : "rgba(255,255,255,0.05)",
                      color: msg.role === "user" ? GOLD : "rgba(255,255,255,0.82)",
                      border: `1px solid ${msg.role === "user" ? GOLD + "28" : "rgba(255,255,255,0.07)"}`,
                    }}>
                    {msg.content}
                    {msg.metadata?.action && (
                      <div className="mt-2 px-2 py-1 rounded-lg text-[10px] font-bold"
                        style={{ background: `${GOLD}10`, color: GOLD, border: `1px solid ${GOLD}20` }}>
                        <Zap className="w-3 h-3 inline mr-1" />
                        Action: {String(msg.metadata.action).replace(/_/g, " ")}
                      </div>
                    )}
                    {msg.metadata?.escalated && (
                      <div className="mt-2 flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px]"
                        style={{ background: "#ef444412", color: "#ef4444", border: "1px solid #ef444430" }}>
                        <PhoneCall className="w-3 h-3" /> Escalated to support team
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            {sendMsg.isPending && (
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center"
                  style={{ background: "rgba(255,255,255,0.08)" }}>
                  <Bot className="w-3 h-3" style={{ color: "rgba(255,255,255,0.6)" }} />
                </div>
                <div className="rounded-xl rounded-tl-sm px-3 py-2.5 flex gap-1 items-center"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                      style={{ background: GOLD, animationDelay: `${i * 150}ms` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 flex-shrink-0" style={{ borderTop: `1px solid ${GOLD}10` }}>
            <div className="flex gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Ask anything..."
                className="flex-1 px-3 py-2.5 rounded-xl text-[12px] text-white"
                style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${GOLD}18`, outline: "none" }}
              />
              <button onClick={handleSend} disabled={!input.trim() || sendMsg.isPending}
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all hover:scale-105 disabled:opacity-40"
                style={{ background: `linear-gradient(135deg, ${GOLD}, #b8962e)` }}>
                <SendHorizonal className="w-4 h-4 text-black" />
              </button>
            </div>
            <p className="text-[10px] mt-1.5 text-center" style={{ color: "rgba(255,255,255,0.2)" }}>
              <CornerDownLeft className="w-2.5 h-2.5 inline mr-0.5" />Enter to send · AI may escalate complex issues
            </p>
          </div>
        </div>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONNECT EMAIL SCREEN (onboarding gate)
// ═══════════════════════════════════════════════════════════════════════════════

function ConnectEmailScreen({ onContinue }: { onContinue: (tab?: string) => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 relative overflow-hidden" style={{ background: BG }}>
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full pointer-events-none opacity-[0.05]"
        style={{ background: `radial-gradient(circle, ${GOLD}, transparent)` }} />

      <div className="w-full max-w-lg relative z-10">
        {/* Step indicator */}
        <div className="flex items-center gap-1 mb-10 justify-center">
          {["Connect email", "Create sequence", "Launch & track"].map((s, i) => (
            <div key={s} className="flex items-center gap-1">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                style={{
                  background: i === 0 ? `${GOLD}22` : "rgba(255,255,255,0.04)",
                  border: `1px solid ${i === 0 ? GOLD + "40" : "rgba(255,255,255,0.08)"}`,
                }}>
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black"
                  style={{ background: i === 0 ? GOLD : "rgba(255,255,255,0.1)", color: i === 0 ? "#000" : "rgba(255,255,255,0.3)" }}>
                  {i + 1}
                </span>
                <span className="text-[11px] font-bold hidden sm:inline"
                  style={{ color: i === 0 ? GOLD : "rgba(255,255,255,0.3)" }}>{s}</span>
              </div>
              {i < 2 && <div className="w-6 h-px" style={{ background: "rgba(255,255,255,0.1)" }} />}
            </div>
          ))}
        </div>

        {/* Icon + title */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5 relative"
            style={{ background: `${GOLD}15`, border: `2px solid ${GOLD}35` }}>
            <Mail className="w-10 h-10" style={{ color: GOLD }} />
            <div className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${GOLD}, #b8962e)` }}>
              <Zap className="w-3.5 h-3.5 text-black" />
            </div>
          </div>
          <h1 className="text-3xl font-black text-white mb-3">Connect your email account</h1>
          <p className="text-sm leading-relaxed max-w-sm mx-auto" style={{ color: "rgba(255,255,255,0.45)" }}>
            Step 1 of 3 — Connect Gmail or Outlook to send campaigns, sequences, and workflows directly from your own inbox.
          </p>
        </div>

        {/* Connection options */}
        <div className="space-y-3 mb-6">
          {/* Gmail — primary */}
          <button
            onClick={() => { window.location.href = "/api/em/oauth/gmail/connect"; }}
            className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-left transition-all hover:scale-[1.01] active:scale-[0.99] group"
            style={{ background: `${GOLD}0d`, border: `2px solid ${GOLD}38` }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${GOLD}20` }}>
              <Mail className="w-6 h-6" style={{ color: GOLD }} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-base font-black text-white">Connect Gmail</p>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full"
                  style={{ background: `${GOLD}25`, color: GOLD }}>RECOMMENDED</span>
              </div>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                Gmail or Google Workspace — one click, no SMTP setup needed
              </p>
            </div>
            <ChevronRight className="w-5 h-5 flex-shrink-0 transition-transform group-hover:translate-x-0.5" style={{ color: GOLD }} />
          </button>

          {/* Outlook — secondary */}
          <button
            onClick={() => { window.location.href = "/api/em/oauth/outlook/connect"; }}
            className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-left transition-all hover:scale-[1.01] active:scale-[0.99] group"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "#0ea5e915" }}>
              <MessageCircle className="w-6 h-6 text-sky-400" />
            </div>
            <div className="flex-1">
              <p className="text-base font-black text-white">Connect Outlook</p>
              <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                Outlook or Microsoft 365
              </p>
            </div>
            <ChevronRight className="w-5 h-5 flex-shrink-0 text-zinc-600 transition-transform group-hover:translate-x-0.5" />
          </button>

          {/* SMTP manual */}
          <button
            onClick={() => onContinue("smtp")}
            className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-left transition-all hover:scale-[1.01] group"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(255,255,255,0.05)" }}>
              <Server className="w-6 h-6 text-zinc-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-zinc-400">Use SMTP / custom provider</p>
              <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.25)" }}>
                SendGrid, Mailgun, Amazon SES, or your own server
              </p>
            </div>
            <ChevronRight className="w-4 h-4 flex-shrink-0 text-zinc-700 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>

        {/* Why connect */}
        <div className="rounded-2xl p-4 mb-6" style={{ background: `${GOLD}06`, border: `1px solid ${GOLD}18` }}>
          <p className="text-[11px] font-black uppercase tracking-wider mb-3" style={{ color: `${GOLD}80` }}>
            Why connect your own email?
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[
              ["Inbox delivery", "Lands in primary, not spam"],
              ["Trusted sender", "Subscribers recognize you"],
              ["Your reputation", "Not shared with other senders"],
              ["Full tracking", "Opens, clicks, replies"],
            ].map(([title, desc]) => (
              <div key={title} className="flex items-start gap-2">
                <CheckCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: GOLD }} />
                <div>
                  <p className="text-[11px] font-bold text-white">{title}</p>
                  <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Skip */}
        <div className="text-center">
          <button onClick={() => onContinue()}
            className="text-xs transition-colors hover:text-zinc-400"
            style={{ color: "rgba(255,255,255,0.2)" }}>
            Skip for now — I'll set this up later
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TIER GATE
// ═══════════════════════════════════════════════════════════════════════════════

function EmailTierGate({ plan }: { plan: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-6" style={{ background: BG }}>
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
          style={{ background: `${GOLD}18`, border: `2px solid ${GOLD}40` }}>
          <Mail className="w-7 h-7" style={{ color: GOLD }} />
        </div>
        <h2 className="text-2xl font-black text-white mb-2">Email Marketing & Workflows</h2>
        <p className="mb-2" style={{ color: "rgba(255,255,255,0.5)" }}>
          AI-powered email sequences, visual workflow automations, and full SMTP delivery — available on Growth plan and above.
        </p>
        <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.3)" }}>
          Current plan: <span className="font-bold text-white capitalize">{plan || "Free"}</span>
        </p>
        <a href="/select-plan"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-black text-black"
          style={{ background: `linear-gradient(135deg, ${GOLD}, #b8962e)` }}>
          <Zap className="w-4 h-4" /> Upgrade to Growth
        </a>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PLATFORM SHELL
// ═══════════════════════════════════════════════════════════════════════════════

function EmailMarketingPlatform() {
  const [activeId, setActiveId] = useState("overview");
  const [skippedSetup, setSkippedSetup] = useState(false);
  const [, nav] = useLocation();

  const { data: oauthStatus, isLoading: oauthLoading } = useQuery({
    queryKey: ["/api/em/oauth/status"],
    queryFn: () => apiFetch("/api/em/oauth/status"),
    refetchOnWindowFocus: true,
  });

  const { data: smtpConfig } = useQuery({
    queryKey: ["/api/em/smtp"],
    queryFn: () => apiFetch("/api/em/smtp"),
  });

  const isEmailConnected =
    oauthStatus?.gmail?.connected ||
    oauthStatus?.outlook?.connected ||
    smtpConfig?.is_verified;

  const handleSetupContinue = (tab?: string) => {
    setSkippedSetup(true);
    if (tab) setActiveId(tab);
  };

  if (oauthLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: BG }}>
        <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: GOLD, borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (!isEmailConnected && !skippedSetup) {
    return <ConnectEmailScreen onContinue={handleSetupContinue} />;
  }

  const renderSection = () => {
    switch (activeId) {
      case "overview":   return <OverviewSection setActiveId={setActiveId} isEmailConnected={!!isEmailConnected} />;
      case "sequences":  return <SequencesSection />;
      case "workflow":   return <WorkflowSection />;
      case "contacts":   return <ContactsSection />;
      case "templates":  return <TemplatesSection onUseTemplate={(t) => { setActiveId("sequences"); }} />;
      case "analytics":  return <AnalyticsSection />;
      case "smtp":       return <SmtpSection />;
      default:           return null;
    }
  };

  return (
    <div className="flex min-h-screen relative" style={{ background: BG }}>
      {/* Grain */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.02] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        <filter id="em-grain"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
        <rect width="100%" height="100%" filter="url(#em-grain)"/>
      </svg>

      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 flex flex-col relative z-10"
        style={{ background: BG, borderRight: `1px solid ${GOLD}15`, minHeight: "100vh" }}>
        {/* Logo */}
        <div className="px-4 py-3" style={{ borderBottom: `1px solid ${GOLD}15` }}>
          <div className="flex gap-0.5 mb-3">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-2.5 flex-1 rounded-sm"
                style={{ background: i % 2 === 0 ? `${GOLD}22` : "transparent", border: `1px solid ${GOLD}12` }} />
            ))}
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${GOLD}, #b8962f)` }}>
              <Mail className="w-4 h-4 text-black" />
            </div>
            <div>
              <p className="text-[11px] font-black tracking-[0.2em] uppercase leading-none" style={{ color: GOLD }}>ORAVINI</p>
              <p className="text-[9px] mt-0.5 tracking-wide uppercase leading-none" style={{ color: `${GOLD}45` }}>Email & Workflows</p>
            </div>
          </div>
        </div>

        {/* Back to dashboard */}
        <div className="px-3 pt-3">
          <button onClick={() => nav("/dashboard")}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium transition-all hover:bg-white/5"
            style={{ color: "rgba(255,255,255,0.35)" }}>
            <ChevronLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          <p className="text-[9px] font-bold uppercase tracking-widest px-2 py-2" style={{ color: "rgba(255,255,255,0.2)" }}>
            Email Marketing
          </p>
          {EM_NAV.map(({ id, label, icon: Icon }) => {
            const active = activeId === id;
            return (
              <button key={id} onClick={() => setActiveId(id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group text-left"
                style={{
                  background: active ? `${GOLD}18` : "transparent",
                  color: active ? GOLD : "rgba(255,255,255,0.5)",
                  border: active ? `1px solid ${GOLD}30` : "1px solid transparent",
                  cursor: "pointer",
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)"; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}>
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">{label}</span>
                {active && <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: GOLD }} />}
              </button>
            );
          })}
        </nav>

        {/* Plan badge */}
        <div className="px-4 py-3" style={{ borderTop: `1px solid ${GOLD}12` }}>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: `${GOLD}08` }}>
            <Zap className="w-3.5 h-3.5" style={{ color: GOLD }} />
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: GOLD }}>AI Powered</span>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <div className="sticky top-0 z-20 px-6 py-3 flex items-center gap-3"
          style={{ background: "rgba(4,4,6,0.97)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${GOLD}14` }}>
          <div className="flex gap-0.5 mr-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="w-2 h-4 rounded-sm"
                style={{ background: i % 2 === 0 ? `${GOLD}20` : "transparent", border: `1px solid ${GOLD}12` }} />
            ))}
          </div>
          <div>
            <h1 className="text-sm font-black" style={{
              background: `linear-gradient(135deg, #fff 0%, ${GOLD} 100%)`,
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>
              {EM_NAV.find(n => n.id === activeId)?.label ?? "Email Marketing"}
            </h1>
            <p className="text-[9px] font-bold uppercase tracking-[0.15em] leading-none mt-0.5" style={{ color: `${GOLD}40` }}>
              ORAVINI · Email & Workflows
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-8">
          {renderSection()}
        </div>
      </main>

      <AIChatBubble />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export default function EmailMarketing() {
  const { user, isLoading } = useAuth();
  const [, nav] = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: BG }}>
        <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: GOLD, borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (!user) { nav("/login?redirect=/email-marketing"); return null; }

  const isAdmin = (user as any).role === "admin";
  if (!isAdmin && !hasEmailAccess(user.plan)) {
    return <EmailTierGate plan={user.plan} />;
  }

  return <EmailMarketingPlatform />;
}
