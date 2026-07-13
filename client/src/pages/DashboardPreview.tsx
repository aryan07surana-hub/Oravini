import { useState, useEffect } from "react";
import { useLocation } from "wouter";
const oraviniLogoPath = "/oravini-logo.png";
import {
  LayoutDashboard, FileText, Users, Calendar, TrendingUp, Search,
  Sparkles, Palette, Bot, BarChart2, Clapperboard, Mic, Scissors,
  MonitorPlay, Layers, MessageCircle, Archive, BookOpen, BarChart,
  Mail, MessageSquare, ClipboardList, UserCheck, Lock, ArrowUpRight,
  CalendarPlus, Star, Globe, DollarSign, Activity, Zap, Play,
  CheckCircle2, ArrowRight, Eye, Phone, Target, Wand2, Image,
  FileSearch, GanttChart, Send, Hash, Brain, Filter, ChevronRight,
  Plus, TrendingDown, Video
} from "lucide-react";

const GOLD = "#d4b461";
const GOLD_BRIGHT = "#f0c84b";

/* ── Sidebar nav (exact match to real dashboard) ───────────── */
const SIDEBAR_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard" },
  { icon: FileText,        label: "Documents" },
  { icon: Users,           label: "Community" },
  { icon: Calendar,        label: "Scheduling" },
  { icon: TrendingUp,      label: "Tracking" },
  { icon: Search,          label: "Competitor Study" },
  { icon: Sparkles,        label: "Content Ideas" },
  { icon: Palette,         label: "Design Studio" },
  { icon: Bot,             label: "Content Coach" },
  { icon: BarChart,        label: "Content Analyser" },
  { icon: Clapperboard,    label: "Video Editor" },
  { icon: Mic,             label: "Oravini Recorder" },
  { icon: Scissors,        label: "Clip Finder" },
  { icon: MonitorPlay,     label: "Video Marketing" },
  { icon: Layers,          label: "Pages & Funnels" },
  { icon: MessageCircle,   label: "DM Automation" },
  { icon: Archive,         label: "Cortex Vault" },
  { icon: BookOpen,        label: "Skills" },
  { icon: BarChart2,       label: "Analytics" },
  { icon: Mail,            label: "Email & Workflows" },
  { icon: MessageSquare,   label: "SMS Marketing" },
  { icon: ClipboardList,   label: "Project Tracker" },
  { icon: UserCheck,       label: "CRM" },
];

/* ── Shared helpers ────────────────────────────────────────── */
function SectionHeader({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.22em", textTransform: "uppercase", color: GOLD, margin: "0 0 6px" }}>{eyebrow}</p>
      <h1 style={{ fontSize: "clamp(18px,2vw,24px)", fontWeight: 900, color: "#fff", margin: "0 0 4px", letterSpacing: "-0.02em" }}>{title}</h1>
      {sub && <p style={{ fontSize: 13, color: "rgba(255,255,255,0.38)", margin: 0 }}>{sub}</p>}
    </div>
  );
}

function StatCard({ label, value, sub, color, icon: Icon }: { label: string; value: string | number; sub?: string; color: string; icon?: any }) {
  return (
    <div style={{ background: `${color}0d`, border: `1px solid ${color}22`, borderRadius: 14, padding: "16px" }}>
      {Icon && <Icon style={{ width: 15, height: 15, color, marginBottom: 10 }} />}
      <p style={{ fontSize: 26, fontWeight: 900, color: "#fff", margin: "0 0 2px", lineHeight: 1 }}>{value}</p>
      <p style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.5)", margin: 0 }}>{label}</p>
      {sub && <p style={{ fontSize: 10, color: "rgba(255,255,255,0.28)", margin: "3px 0 0" }}>{sub}</p>}
    </div>
  );
}

function LockedCTA({ nav }: { nav: (p: string) => void }) {
  return (
    <div style={{ background: `linear-gradient(135deg,${GOLD}0a 0%,transparent 100%)`, border: `1px solid ${GOLD}20`, borderRadius: 16, padding: "22px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginTop: 24 }}>
      <div>
        <p style={{ fontSize: 14, fontWeight: 800, color: "#fff", margin: "0 0 4px" }}>Want to use this for real?</p>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.38)", margin: 0 }}>Create a free account — no credit card needed.</p>
      </div>
      <button onClick={() => nav("/login?tab=register")} style={{ background: `linear-gradient(135deg,${GOLD_BRIGHT},${GOLD})`, color: "#000", fontWeight: 800, fontSize: 13, border: "none", borderRadius: 10, padding: "11px 24px", cursor: "pointer", whiteSpace: "nowrap" }}>
        Start for Free →
      </button>
    </div>
  );
}

function LockBtn({ label, lockAction, icon: Icon, style: extraStyle }: { label: string; lockAction: () => void; icon?: any; style?: React.CSSProperties }) {
  return (
    <button onClick={lockAction} title="Create an account to use this"
      style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, padding: "7px 14px", borderRadius: 8, background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.3)", border: "1px solid rgba(255,255,255,0.09)", cursor: "pointer", fontWeight: 600, ...extraStyle }}>
      <Lock style={{ width: 10, height: 10 }} />
      {Icon && <Icon style={{ width: 11, height: 11 }} />}
      {label}
    </button>
  );
}

/* ══════════════════════════════════════════════════════════════
   SECTION VIEWS
══════════════════════════════════════════════════════════════ */

/* Dashboard — matches real screenshot layout */
function DashboardView({ nav, lockAction }: { nav: (p: string) => void; lockAction: () => void }) {
  return (
    <>
      {/* Mission Control header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)" }}>Mission Briefing</span>
            <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 8px", borderRadius: 999, background: `${GOLD}18`, color: GOLD, border: `1px solid ${GOLD}30` }}>Tier 5 · Elite</span>
          </div>
          <h1 style={{ fontSize: "clamp(20px,2.5vw,28px)", fontWeight: 900, color: "#fff", margin: "0 0 5px", letterSpacing: "-0.025em" }}>Your Mission Control</h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", margin: 0 }}>Current phase: <span style={{ color: "rgba(255,255,255,0.65)", fontWeight: 600 }}>Contract & Onboarding</span></p>
        </div>
        <LockBtn label="Book a Call" lockAction={lockAction} icon={CalendarPlus}
          style={{ padding: "10px 20px", borderRadius: 12, fontSize: 13, background: `${GOLD}15`, color: GOLD, border: `1px solid ${GOLD}35` }} />
      </div>

      {/* Mission Progress card */}
      <div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.025)", marginBottom: 16, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)" }}>Mission Progress</span>
            <span style={{ fontSize: 12, fontWeight: 900, color: GOLD }}>2%</span>
          </div>
          <div style={{ height: 6, borderRadius: 999, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: "2%", background: GOLD, borderRadius: 999 }} />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 1fr" }}>
          {[
            { label: "Next Action", value: "Submit your onboarding answers and upload your core assets.", isText: true, color: "rgba(255,255,255,0.6)" },
            { label: "Pending Tasks", value: "0", isText: false, color: "#a78bfa" },
            { label: "Awaiting Review", value: "9", isText: false, color: "#60a5fa" },
            { label: "Blockers", value: "0", isText: false, color: "#34d399" },
          ].map(({ label, value, isText, color }, i) => (
            <div key={label} style={{ padding: "14px 18px", borderLeft: i > 0 ? "1px solid rgba(255,255,255,0.05)" : "none", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              <p style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", margin: "0 0 6px" }}>{label}</p>
              {isText
                ? <p style={{ fontSize: 11.5, color, margin: 0, lineHeight: 1.5 }}>{value}</p>
                : <p style={{ fontSize: 30, fontWeight: 900, color, margin: 0, lineHeight: 1 }}>{value}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* Guided tour card */}
      <div style={{ borderRadius: 14, background: "linear-gradient(135deg,rgba(99,102,241,0.18) 0%,rgba(99,102,241,0.06) 100%)", border: "1px solid rgba(99,102,241,0.25)", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(99,102,241,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>🗺️</div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 800, color: "#fff", margin: "0 0 2px" }}>New here? Take the guided tour</p>
            <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.4)", margin: 0 }}>Your AI guide walks you through every tool in 3 minutes.</p>
          </div>
        </div>
        <LockBtn label="Take a Tour" lockAction={lockAction} style={{ background: "rgba(99,102,241,0.2)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.3)", whiteSpace: "nowrap" }} />
      </div>

      {/* Income Goal + Daily Quote */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
        <div style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.025)", padding: "18px" }}>
          <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", margin: "0 0 12px" }}>Income Goal</p>
          <p style={{ fontSize: 36, fontWeight: 900, color: "#fff", margin: "0 0 4px", lineHeight: 1 }}>$100</p>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", margin: 0 }}>in 6 months</p>
          <div style={{ marginTop: 14, display: "flex", gap: 7 }}>
            <LockBtn label="Edit" lockAction={lockAction} style={{ fontSize: 10, padding: "4px 10px" }} />
          </div>
        </div>
        <div style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.025)", padding: "18px" }}>
          <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", margin: "0 0 16px" }}>Daily Quote</p>
          <p style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.75)", margin: "0 0 10px", lineHeight: 1.6, fontStyle: "italic" }}>"Act as if what you do makes a difference. It does."</p>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", margin: 0 }}>July 13, 2026</p>
        </div>
      </div>

      {/* World Time */}
      <div style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)", padding: "16px 20px", marginBottom: 16 }}>
        <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", margin: "0 0 14px", display: "flex", alignItems: "center", gap: 6 }}>
          <Globe style={{ width: 11, height: 11 }} /> World Time
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          {[
            { label: "Your Time", flag: null, time: "07:18:28 PM", day: "Mon, Jul 13", color: "#fff" },
            { label: "Dubai",     flag: "🇦🇪",  time: "05:48:28 PM", day: "Mon, Jul 13", color: "#fff" },
            { label: "London",    flag: "🇬🇧",  time: "02:48:28 PM", day: "Mon, Jul 13", color: "#fff" },
          ].map(({ label, flag, time, day }) => (
            <div key={label} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: "14px", textAlign: "center" }}>
              <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.4)", margin: "0 0 8px", fontWeight: 600 }}>{flag ? `${flag} ` : ""}{label.toUpperCase()}</p>
              <p style={{ fontSize: 18, fontWeight: 800, color: "#fff", margin: "0 0 3px", letterSpacing: "0.02em", fontVariantNumeric: "tabular-nums" }}>{time}</p>
              <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.3)", margin: 0 }}>{day}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Creator Score */}
      <div style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.025)", padding: "18px 20px", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(52,211,153,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🌱</div>
            <div>
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", margin: "0 0 4px" }}>Creator Score</p>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <span style={{ fontSize: 34, fontWeight: 900, color: "#fff", lineHeight: 1 }}>30</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#34d399" }}>Just Starting</span>
              </div>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", margin: "3px 0 0" }}>Every legend starts somewhere. Let's go!</p>
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", margin: "0 0 5px" }}>Next: 🚀 Rising Creator</p>
            <div style={{ width: 120, height: 5, borderRadius: 999, background: "rgba(255,255,255,0.06)" }}>
              <div style={{ width: "30%", height: "100%", borderRadius: 999, background: "#34d399" }} />
            </div>
            <p style={{ fontSize: 9.5, color: "rgba(255,255,255,0.25)", margin: "4px 0 0" }}>30 pts to go</p>
          </div>
        </div>
      </div>

      {/* Since Joining */}
      <div style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)", padding: "16px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${GOLD}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🚀</div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 800, color: "#fff", margin: "0 0 2px" }}>Since Joining Oravini</p>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", margin: 0 }}>Member since Apr 21, 2026 · 83d ago</p>
            </div>
          </div>
          <span style={{ fontSize: 9.5, fontWeight: 800, padding: "4px 12px", borderRadius: 999, background: `${GOLD}15`, color: GOLD, border: `1px solid ${GOLD}28` }}>Tier 5 · Elite</span>
        </div>
      </div>

      <LockedCTA nav={nav} />
    </>
  );
}

/* Documents */
function DocumentsView({ nav, lockAction }: { nav: (p: string) => void; lockAction: () => void }) {
  const docs = [
    { name: "Brand Strategy Guide",        updated: "2 days ago",  icon: "📋", color: GOLD },
    { name: "Content SOP v3",              updated: "5 days ago",  icon: "📝", color: "#60a5fa" },
    { name: "Client Onboarding Checklist", updated: "1 week ago",  icon: "✅", color: "#34d399" },
    { name: "Launch Plan Q3",              updated: "2 weeks ago", icon: "🚀", color: "#a78bfa" },
    { name: "ICP Document",                updated: "3 weeks ago", icon: "🎯", color: "#f472b6" },
  ];
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <SectionHeader eyebrow="Workspace" title="Documents" sub="Your SOPs, strategies and reference files" />
        <LockBtn label="+ New Doc" lockAction={lockAction} style={{ marginTop: -24 }} />
      </div>
      {docs.map(d => (
        <div key={d.name} onClick={lockAction} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderRadius: 13, border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.025)", marginBottom: 10, cursor: "pointer" }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
          onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.025)")}>
          <span style={{ fontSize: 22 }}>{d.icon}</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13.5, fontWeight: 700, color: "#fff", margin: "0 0 2px" }}>{d.name}</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", margin: 0 }}>Updated {d.updated}</p>
          </div>
          <Lock style={{ width: 12, height: 12, color: "rgba(255,255,255,0.2)" }} />
        </div>
      ))}
      <LockedCTA nav={nav} />
    </>
  );
}

/* Scheduling */
function SchedulingView({ nav, lockAction }: { nav: (p: string) => void; lockAction: () => void }) {
  const posts = [
    { platform: "Instagram", time: "Mon 9:00 AM", content: "Why 99% of creators fail in year 1 🔥", status: "Scheduled", color: "#f472b6" },
    { platform: "LinkedIn",  time: "Mon 12:00 PM", content: "The one skill that changed my business completely", status: "Scheduled", color: "#60a5fa" },
    { platform: "YouTube",   time: "Tue 5:00 PM", content: "Content Strategy Masterclass (Full Video)", status: "Draft", color: "#f87171" },
    { platform: "X/Twitter", time: "Wed 8:00 AM", content: "Thread: 10 hooks that go viral every time", status: "Scheduled", color: "#fff" },
  ];
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <SectionHeader eyebrow="Publishing" title="Scheduling" sub="Schedule and auto-publish across all platforms" />
        <LockBtn label="+ Schedule Post" lockAction={lockAction} style={{ marginTop: -24 }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Scheduled", value: "12", color: GOLD },
          { label: "Published", value: "47", color: "#34d399" },
          { label: "Drafts",    value: "5",  color: "#a78bfa" },
        ].map(s => <StatCard key={s.label} label={s.label} value={s.value} color={s.color} />)}
      </div>
      {posts.map(p => (
        <div key={p.content} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderRadius: 13, border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.025)", marginBottom: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: `${p.color}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontSize: 14 }}>{p.platform === "Instagram" ? "📸" : p.platform === "LinkedIn" ? "💼" : p.platform === "YouTube" ? "🎬" : "🐦"}</span>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", margin: "0 0 2px" }}>{p.content}</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", margin: 0 }}>{p.platform} · {p.time}</p>
          </div>
          <span style={{ fontSize: 9.5, padding: "3px 10px", borderRadius: 999, background: p.status === "Scheduled" ? "rgba(52,211,153,0.12)" : "rgba(255,255,255,0.06)", color: p.status === "Scheduled" ? "#34d399" : "rgba(255,255,255,0.4)", border: `1px solid ${p.status === "Scheduled" ? "rgba(52,211,153,0.25)" : "rgba(255,255,255,0.08)"}`, fontWeight: 700 }}>{p.status}</span>
        </div>
      ))}
      <LockedCTA nav={nav} />
    </>
  );
}

/* Tracking */
function TrackingView({ nav, lockAction }: { nav: (p: string) => void; lockAction: () => void }) {
  return (
    <>
      <SectionHeader eyebrow="Growth" title="Tracking" sub="Track follower growth, reach and engagement across all platforms" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total Followers", value: "48.2K", sub: "+3.1K this month", color: GOLD, icon: Users },
          { label: "Total Views",     value: "2.4M",  sub: "+18% MoM",         color: "#34d399", icon: Eye },
          { label: "Engagement",      value: "6.8%",  sub: "3× platform avg",  color: "#60a5fa", icon: Activity },
          { label: "Link Clicks",     value: "4,812", sub: "last 30 days",     color: "#a78bfa", icon: ArrowRight },
        ].map(s => <StatCard key={s.label} {...s} />)}
      </div>
      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "18px", marginBottom: 16 }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", margin: "0 0 16px" }}>30-Day Follower Growth</p>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 80 }}>
          {[38,52,45,71,63,88,74,95,82,66,79,90,85,92,88].map((v, i) => (
            <div key={i} style={{ flex: 1, borderRadius: 4, background: i === 14 ? GOLD : `${GOLD}35`, height: `${v}%`, boxShadow: i === 14 ? `0 0 10px ${GOLD}50` : "none" }} />
          ))}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        {[
          { p: "Instagram", i: "📸", f: "31.4K", g: "+8.2%",  c: "#f472b6" },
          { p: "YouTube",   i: "🎬", f: "12.1K", g: "+12.4%", c: "#f87171" },
          { p: "LinkedIn",  i: "💼", f: "4.7K",  g: "+5.1%",  c: "#60a5fa" },
        ].map(({ p, i, f, g, c }) => (
          <div key={p} style={{ background: `${c}09`, border: `1px solid ${c}20`, borderRadius: 14, padding: "14px" }}>
            <p style={{ fontSize: 18, margin: "0 0 6px" }}>{i}</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", margin: "0 0 3px" }}>{p}</p>
            <p style={{ fontSize: 20, fontWeight: 900, color: "#fff", margin: "0 0 2px", lineHeight: 1 }}>{f}</p>
            <p style={{ fontSize: 11, color: "#34d399", fontWeight: 700, margin: 0 }}>{g}</p>
          </div>
        ))}
      </div>
      <LockedCTA nav={nav} />
    </>
  );
}

/* Competitor Study */
function CompetitorView({ nav, lockAction }: { nav: (p: string) => void; lockAction: () => void }) {
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <SectionHeader eyebrow="Growth & Intel" title="Competitor Study" sub="Deep-dive analysis of what's working in your niche" />
        <LockBtn label="+ Add Competitor" lockAction={lockAction} style={{ marginTop: -24 }} />
      </div>
      {[
        { h: "@garyvee",     f: "10.2M", eng: "4.8%", pattern: "Motivational storytelling + hustle content",  c: GOLD    },
        { h: "@alexhormozi", f: "4.7M",  eng: "7.2%", pattern: "Long-form value, contrarian takes, proof",     c: "#34d399"},
        { h: "@mrbeast",     f: "42M",   eng: "12.1%",pattern: "Extreme challenges, giveaways, high-production",c: "#60a5fa"},
      ].map(({ h, f, eng, pattern, c }) => (
        <div key={h} style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "18px", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: "50%", background: `${c}18`, border: `1px solid ${c}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🕵️</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 900, color: "#fff", margin: "0 0 2px" }}>{h}</p>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.38)", margin: 0 }}>{f} followers</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: 20, fontWeight: 900, color: c, margin: 0 }}>{eng}</p>
              <p style={{ fontSize: 9.5, color: "rgba(255,255,255,0.3)", margin: 0 }}>engagement</p>
            </div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "10px 12px" }}>
            <p style={{ fontSize: 9.5, fontWeight: 700, color: "rgba(255,255,255,0.3)", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.12em" }}>Top content pattern</p>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", margin: 0 }}>{pattern}</p>
          </div>
        </div>
      ))}
      <LockedCTA nav={nav} />
    </>
  );
}

/* Content Ideas */
function ContentIdeasView({ nav, lockAction }: { nav: (p: string) => void; lockAction: () => void }) {
  const ideas = [
    { hook: "Why 99% of creators fail in year 1 (and the 1 thing that saves you)", type: "Educational", viral: 9.4 },
    { hook: "I analysed 500 viral posts. Here's the formula nobody talks about.", type: "Authority", viral: 9.1 },
    { hook: "The exact DM script that booked me 12 calls this week", type: "Proof", viral: 9.6 },
    { hook: "Stop posting content. Do THIS instead.", type: "Contrarian", viral: 9.2 },
    { hook: "POV: You finally figured out what content to post every day", type: "Relatability", viral: 8.8 },
    { hook: "3 things I wish I knew before I hit 100K followers", type: "Storytelling", viral: 8.9 },
  ];
  return (
    <>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 24 }}>
        <div style={{ flex: 1 }}>
          <SectionHeader eyebrow="AI · Content" title="Content Ideas" sub="AI-generated hooks, scripts and formats tailored to your niche" />
        </div>
        <LockBtn label="Generate Ideas" lockAction={lockAction} icon={Sparkles} style={{ marginTop: -24, padding: "10px 18px", fontSize: 12 }} />
      </div>
      {ideas.map((idea, i) => (
        <div key={i} style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "16px 18px", marginBottom: 10, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: `${GOLD}14`, border: `1px solid ${GOLD}25`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, color: GOLD, fontSize: 14, flexShrink: 0 }}>{i + 1}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", margin: "0 0 4px", lineHeight: 1.4 }}>{idea.hook}</p>
            <span style={{ fontSize: 9.5, padding: "2px 8px", borderRadius: 999, background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>{idea.type}</span>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <p style={{ fontSize: 18, fontWeight: 900, color: idea.viral >= 9.3 ? "#34d399" : GOLD, margin: 0 }}>{idea.viral}</p>
            <p style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", margin: 0 }}>viral score</p>
          </div>
        </div>
      ))}
      <LockedCTA nav={nav} />
    </>
  );
}

/* Design Studio */
function DesignStudioView({ nav, lockAction }: { nav: (p: string) => void; lockAction: () => void }) {
  const templates = [
    { name: "Carousel Template",    type: "Carousel · 10 slides", color: "#f472b6", emoji: "🎨" },
    { name: "Quote Graphic",        type: "Static · 1080×1080",  color: GOLD,      emoji: "✨" },
    { name: "Story Template",       type: "Story · 1080×1920",   color: "#60a5fa", emoji: "📱" },
    { name: "YouTube Thumbnail",    type: "Thumbnail · 1280×720", color: "#f87171", emoji: "🎬" },
    { name: "LinkedIn Banner",      type: "Banner · 1584×396",   color: "#60a5fa", emoji: "💼" },
    { name: "Lead Magnet Cover",    type: "PDF Cover · A4",       color: "#34d399", emoji: "📄" },
  ];
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <SectionHeader eyebrow="Creative" title="Design Studio" sub="Create on-brand graphics, carousels and thumbnails with AI" />
        <LockBtn label="+ New Design" lockAction={lockAction} style={{ marginTop: -24 }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
        {templates.map(t => (
          <div key={t.name} onClick={lockAction} style={{ background: `${t.color}0a`, border: `1px solid ${t.color}20`, borderRadius: 14, padding: "20px 16px", cursor: "pointer", textAlign: "center" }}
            onMouseEnter={e => (e.currentTarget.style.background = `${t.color}18`)}
            onMouseLeave={e => (e.currentTarget.style.background = `${t.color}0a`)}>
            <p style={{ fontSize: 28, margin: "0 0 10px" }}>{t.emoji}</p>
            <p style={{ fontSize: 12.5, fontWeight: 800, color: "#fff", margin: "0 0 4px" }}>{t.name}</p>
            <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.38)", margin: "0 0 10px" }}>{t.type}</p>
            <span style={{ fontSize: 9.5, color: t.color, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}><Lock style={{ width: 9, height: 9 }} /> Unlock to use</span>
          </div>
        ))}
      </div>
      <LockedCTA nav={nav} />
    </>
  );
}

/* Content Coach */
function ContentCoachView({ nav, lockAction }: { nav: (p: string) => void; lockAction: () => void }) {
  const msgs = [
    { role: "ai",   text: "Hey! I'm your AI Content Coach. What content challenge are you working through today?" },
    { role: "user", text: "I'm struggling to stay consistent with posting. I keep running out of ideas." },
    { role: "ai",   text: "That's the #1 problem creators face. Here's what works: Build a Content Triad — 1 educational post, 1 relatable post, and 1 proof post per week. Want me to generate a 30-day content plan for your niche?" },
  ];
  return (
    <>
      <SectionHeader eyebrow="AI · Coaching" title="Content Coach" sub="Your AI coach that helps you think, strategise and grow faster" />
      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, overflow: "hidden", marginBottom: 14 }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <p style={{ fontSize: 12, fontWeight: 800, color: "#fff", margin: 0 }}>Session · Content Consistency</p>
        </div>
        <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
          {msgs.map((m, i) => (
            <div key={i} style={{ display: "flex", gap: 10, flexDirection: m.role === "user" ? "row-reverse" : "row" }}>
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: m.role === "ai" ? `${GOLD}18` : "rgba(99,102,241,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
                {m.role === "ai" ? "🤖" : "👤"}
              </div>
              <div style={{ maxWidth: "75%", padding: "11px 14px", borderRadius: 12, background: m.role === "ai" ? "rgba(255,255,255,0.04)" : "rgba(99,102,241,0.15)", border: `1px solid ${m.role === "ai" ? "rgba(255,255,255,0.07)" : "rgba(99,102,241,0.25)"}` }}>
                <p style={{ fontSize: 12.5, color: m.role === "ai" ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.8)", margin: 0, lineHeight: 1.6 }}>{m.text}</p>
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: "12px 18px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: 10 }}>
          <div style={{ flex: 1, background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "10px 14px" }}>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", margin: 0 }}>Type your message...</p>
          </div>
          <LockBtn label="Send" lockAction={lockAction} icon={Send} style={{ padding: "10px 16px" }} />
        </div>
      </div>
      <LockedCTA nav={nav} />
    </>
  );
}

/* Content Analyser */
function ContentAnalyserView({ nav, lockAction }: { nav: (p: string) => void; lockAction: () => void }) {
  const posts = [
    { title: "Why 99% of creators fail", views: "124K", eng: "8.4%", reach: "98K",  score: 94, color: "#34d399" },
    { title: "Content triad breakdown",  views: "67K",  eng: "6.1%", reach: "52K",  score: 78, color: GOLD },
    { title: "My morning routine 2026",  views: "31K",  eng: "4.2%", reach: "28K",  score: 61, color: "#60a5fa" },
  ];
  return (
    <>
      <SectionHeader eyebrow="AI · Analytics" title="Content Analyser" sub="Understand what's working and why — powered by AI" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Posts Analysed", value: "47",   sub: "this month",       color: GOLD      },
          { label: "Top Hook Score", value: "9.6",  sub: "your best post",   color: "#34d399" },
          { label: "Avg Engagement", value: "6.4%", sub: "3× platform avg",  color: "#60a5fa" },
          { label: "Viral Posts",    value: "3",    sub: "9.0+ score",       color: "#f472b6" },
        ].map(s => <StatCard key={s.label} {...s} />)}
      </div>
      {posts.map(p => (
        <div key={p.title} style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "16px 18px", marginBottom: 10, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", margin: "0 0 5px" }}>{p.title}</p>
            <div style={{ display: "flex", gap: 14 }}>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>👁 {p.views}</span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>💬 {p.eng}</span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>📡 {p.reach}</span>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 22, fontWeight: 900, color: p.color, margin: 0 }}>{p.score}</p>
            <p style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", margin: 0 }}>content score</p>
          </div>
        </div>
      ))}
      <LockedCTA nav={nav} />
    </>
  );
}

/* Video Editor */
function VideoEditorView({ nav, lockAction }: { nav: (p: string) => void; lockAction: () => void }) {
  return (
    <>
      <SectionHeader eyebrow="AI · Video" title="Video Editor" sub="AI-powered editing — captions, cuts, hooks and highlights" />
      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "32px", textAlign: "center", marginBottom: 18 }}>
        <p style={{ fontSize: 36, margin: "0 0 14px" }}>🎬</p>
        <p style={{ fontSize: 15, fontWeight: 800, color: "#fff", margin: "0 0 8px" }}>AI Video Editor</p>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", margin: "0 0 20px", lineHeight: 1.7 }}>Upload a raw video — AI adds captions, cuts filler words, adds B-roll cues and creates a hook-first edit automatically.</p>
        <LockBtn label="Upload Video to Edit" lockAction={lockAction} style={{ margin: "0 auto", padding: "11px 24px", fontSize: 13 }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {[
          { emoji: "✂️", label: "Auto-cut filler words",  desc: "Removes ums, ahs and silence",         color: "#f472b6" },
          { emoji: "💬", label: "Auto-captions",          desc: "Accurate captions in 30+ languages",   color: "#60a5fa" },
          { emoji: "🎯", label: "Hook detector",          desc: "Finds your strongest 3-second hook",   color: GOLD },
          { emoji: "🎞️", label: "B-roll suggestions",    desc: "AI suggests b-roll at key moments",    color: "#34d399" },
        ].map(f => (
          <div key={f.label} style={{ background: `${f.color}09`, border: `1px solid ${f.color}20`, borderRadius: 13, padding: "16px" }}>
            <p style={{ fontSize: 22, margin: "0 0 8px" }}>{f.emoji}</p>
            <p style={{ fontSize: 12.5, fontWeight: 800, color: "#fff", margin: "0 0 4px" }}>{f.label}</p>
            <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.38)", margin: 0 }}>{f.desc}</p>
          </div>
        ))}
      </div>
      <LockedCTA nav={nav} />
    </>
  );
}

/* Video Marketing */
function VideoMarketingView({ nav, lockAction }: { nav: (p: string) => void; lockAction: () => void }) {
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <SectionHeader eyebrow="Video Marketing" title="Video Marketing" sub="Webinars, VSL pages, video hosting & live analytics" />
        <LockBtn label="+ New Webinar" lockAction={lockAction} style={{ marginTop: -24 }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Live Webinars",   value: "3",      sub: "this month",       color: "#60a5fa", icon: Video },
          { label: "Registrations",   value: "847",    sub: "+34% vs last mo",  color: "#34d399", icon: Users },
          { label: "Avg Watch Time",  value: "68%",    sub: "above industry",   color: GOLD,      icon: Eye },
          { label: "Revenue",         value: "$12.4K", sub: "from webinars",    color: "#f472b6", icon: DollarSign },
        ].map(s => <StatCard key={s.label} {...s} />)}
      </div>
      {[
        { title: "How to Build a 6-Figure Personal Brand", date: "Jul 18 · 7PM GMT", regs: 312, status: "upcoming",   color: "#60a5fa" },
        { title: "Content Strategy Masterclass",            date: "Jul 11 · 6PM GMT", regs: 535, status: "completed",  color: "#34d399" },
        { title: "Monetise Your Audience in 90 Days",       date: "Jul 4 · 7PM GMT",  regs: 291, status: "completed",  color: "#34d399" },
      ].map(w => (
        <div key={w.title} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderRadius: 13, border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.025)", marginBottom: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: `${w.color}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Play style={{ width: 14, height: 14, color: w.color }} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", margin: "0 0 2px" }}>{w.title}</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.38)", margin: 0 }}>{w.date} · {w.regs} registrations</p>
          </div>
          <span style={{ fontSize: 9.5, padding: "3px 10px", borderRadius: 999, background: `${w.color}15`, color: w.color, fontWeight: 700, border: `1px solid ${w.color}28`, textTransform: "capitalize" }}>{w.status}</span>
        </div>
      ))}
      <LockedCTA nav={nav} />
    </>
  );
}

/* Pages & Funnels */
function FunnelsView({ nav, lockAction }: { nav: (p: string) => void; lockAction: () => void }) {
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <SectionHeader eyebrow="Funnels & Pages" title="Pages & Funnels" sub="Build, launch and track your entire sales funnel in one place" />
        <LockBtn label="+ New Funnel" lockAction={lockAction} style={{ marginTop: -24 }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Active Funnels", value: "4",     sub: "2 live, 2 drafts",   color: GOLD      },
          { label: "Total Leads",    value: "1,247", sub: "last 30 days",       color: "#34d399" },
          { label: "Conversions",    value: "8.4%",  sub: "above 3% avg",       color: "#60a5fa" },
          { label: "Revenue",        value: "$8.9K", sub: "funnel-attributed",  color: "#f472b6" },
        ].map(s => <StatCard key={s.label} {...s} />)}
      </div>
      {[
        { name: "Free Masterclass → 1:1 Call",      steps: 4, leads: 487, conv: "9.2%",  color: GOLD    },
        { name: "Lead Magnet → Email Sequence",      steps: 3, leads: 392, conv: "7.8%",  color: "#a78bfa"},
        { name: "VSL → Discovery Call",              steps: 5, leads: 228, conv: "11.4%", color: "#34d399"},
        { name: "Free Training → Group Programme",   steps: 4, leads: 140, conv: "6.1%",  color: "#60a5fa"},
      ].map(f => (
        <div key={f.name} style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "16px 18px", marginBottom: 10, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", margin: "0 0 4px" }}>{f.name}</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", margin: 0 }}>{f.steps} steps · {f.leads} leads</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 16, fontWeight: 900, color: f.color, margin: 0 }}>{f.conv}</p>
            <p style={{ fontSize: 9.5, color: "rgba(255,255,255,0.3)", margin: 0 }}>conversion</p>
          </div>
        </div>
      ))}
      <LockedCTA nav={nav} />
    </>
  );
}

/* DM Automation */
function DmAutomationView({ nav, lockAction }: { nav: (p: string) => void; lockAction: () => void }) {
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <SectionHeader eyebrow="Outreach" title="DM Automation" sub="Auto-respond to story replies, comments and keyword triggers" />
        <LockBtn label="+ New Flow" lockAction={lockAction} style={{ marginTop: -24 }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Active Flows",   value: "5",    color: GOLD      },
          { label: "DMs Sent",       value: "1,841",color: "#34d399" },
          { label: "Replies",        value: "312",  color: "#60a5fa" },
        ].map(s => <StatCard key={s.label} {...s} />)}
      </div>
      {[
        { trigger: "Story reply: 'send me more'",   action: "Send PDF + book a call link", sent: 284, color: GOLD    },
        { trigger: "Comment: 'link in bio'",         action: "Auto-reply with funnel link",  sent: 612, color: "#34d399"},
        { trigger: "New follower (10K+)",            action: "Send welcome + value DM",      sent: 945, color: "#60a5fa"},
      ].map(f => (
        <div key={f.trigger} style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "16px 18px", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 9.5, padding: "2px 8px", borderRadius: 999, background: `${f.color}15`, color: f.color, fontWeight: 700, border: `1px solid ${f.color}28` }}>Trigger</span>
            <p style={{ fontSize: 12.5, fontWeight: 700, color: "#fff", margin: 0 }}>{f.trigger}</p>
          </div>
          <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)", margin: "0 0 8px" }}>→ {f.action}</p>
          <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.3)", margin: 0 }}>{f.sent.toLocaleString()} messages sent</p>
        </div>
      ))}
      <LockedCTA nav={nav} />
    </>
  );
}

/* CRM */
function CRMView({ nav, lockAction }: { nav: (p: string) => void; lockAction: () => void }) {
  const contacts = [
    { name: "Marcus T.", stage: "Discovery Call",  value: "$4,200", score: 92, color: "#34d399" },
    { name: "Priya S.",  stage: "Proposal Sent",   value: "$6,800", score: 87, color: GOLD    },
    { name: "Jake R.",   stage: "Negotiation",      value: "$3,500", score: 74, color: "#60a5fa"},
    { name: "Aisha M.",  stage: "New Lead",         value: "$2,100", score: 61, color: "#a78bfa"},
    { name: "Tom H.",    stage: "Closed Won 🎉",    value: "$5,000", score: 100,color: "#f472b6"},
  ];
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <SectionHeader eyebrow="CRM & Outreach" title="CRM" sub="Track every lead, deal and client relationship" />
        <LockBtn label="+ Add Contact" lockAction={lockAction} style={{ marginTop: -24 }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total Leads",    value: "147",   sub: "active pipeline",   color: GOLD,      icon: Users },
          { label: "Pipeline Value", value: "$48K",  sub: "potential revenue", color: "#34d399", icon: DollarSign },
          { label: "Calls Booked",   value: "24",    sub: "this month",        color: "#60a5fa", icon: Phone },
          { label: "Closed",         value: "11",    sub: "$31K won",          color: "#f472b6", icon: CheckCircle2 },
        ].map(s => <StatCard key={s.label} {...s} />)}
      </div>
      {contacts.map(c => (
        <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 18px", borderRadius: 13, border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.025)", marginBottom: 9 }}>
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: `${c.color}20`, border: `1px solid ${c.color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: c.color, flexShrink: 0 }}>{c.name[0]}</div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", margin: "0 0 2px" }}>{c.name}</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", margin: 0 }}>{c.stage}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 13, fontWeight: 800, color: "#fff", margin: 0 }}>{c.value}</p>
            <p style={{ fontSize: 9, color: c.color, margin: 0, fontWeight: 700 }}>Score: {c.score}</p>
          </div>
        </div>
      ))}
      <LockedCTA nav={nav} />
    </>
  );
}

/* Email & Workflows */
function EmailWorkflowsView({ nav, lockAction }: { nav: (p: string) => void; lockAction: () => void }) {
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <SectionHeader eyebrow="CRM & Outreach" title="Email & Workflows" sub="Sequences, campaigns and automations for your list" />
        <LockBtn label="+ New Campaign" lockAction={lockAction} style={{ marginTop: -24 }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Subscribers",  value: "3,847", sub: "+241 this week",    color: GOLD,      icon: Mail },
          { label: "Open Rate",    value: "34.2%", sub: "industry: 21%",    color: "#34d399", icon: Eye },
          { label: "Click Rate",   value: "6.8%",  sub: "industry: 2.3%",  color: "#60a5fa", icon: ArrowRight },
          { label: "Revenue",      value: "$4.2K", sub: "email-attributed", color: "#f472b6", icon: DollarSign },
        ].map(s => <StatCard key={s.label} {...s} />)}
      </div>
      {[
        { name: "Welcome Sequence (5 emails)",       status: "Active",    opens: "48%", color: "#34d399" },
        { name: "Masterclass Promotion",             status: "Scheduled", opens: "—",   color: GOLD      },
        { name: "Re-engagement Campaign",            status: "Active",    opens: "22%", color: "#60a5fa" },
        { name: "Post-Webinar Follow-Up (3 emails)", status: "Draft",     opens: "—",   color: "#a78bfa" },
      ].map(c => (
        <div key={c.name} style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "14px 18px", marginBottom: 10, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", margin: "0 0 3px" }}>{c.name}</p>
            <span style={{ fontSize: 10.5, color: "rgba(255,255,255,0.35)" }}>Opens: <span style={{ color: "#fff", fontWeight: 600 }}>{c.opens}</span></span>
          </div>
          <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 999, background: `${c.color}15`, color: c.color, fontWeight: 700, border: `1px solid ${c.color}28` }}>{c.status}</span>
        </div>
      ))}
      <LockedCTA nav={nav} />
    </>
  );
}

/* Project Tracker */
function ProjectTrackerView({ nav, lockAction }: { nav: (p: string) => void; lockAction: () => void }) {
  const tasks = [
    { task: "Upload onboarding assets",    project: "Onboarding",     status: "In Progress", color: GOLD,      due: "Today" },
    { task: "Record launch webinar",       project: "Launch Plan",    status: "To Do",       color: "#60a5fa", due: "Jul 18" },
    { task: "Finalise email sequence",     project: "Email Funnel",   status: "In Review",   color: "#a78bfa", due: "Jul 15" },
    { task: "Competitor analysis report",  project: "Growth Intel",   status: "Done",        color: "#34d399", due: "Jul 10" },
    { task: "Design brand kit",            project: "Branding",       status: "To Do",       color: "#f472b6", due: "Jul 20" },
  ];
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <SectionHeader eyebrow="Workspace" title="Project Tracker" sub="Track every project, task and milestone in one place" />
        <LockBtn label="+ Add Task" lockAction={lockAction} style={{ marginTop: -24 }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "To Do",       value: "8",  color: "#60a5fa" },
          { label: "In Progress", value: "3",  color: GOLD      },
          { label: "In Review",   value: "2",  color: "#a78bfa" },
          { label: "Done",        value: "14", color: "#34d399" },
        ].map(s => <StatCard key={s.label} {...s} />)}
      </div>
      {tasks.map(t => (
        <div key={t.task} style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 18px", borderRadius: 13, border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.025)", marginBottom: 9 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: t.color, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", margin: "0 0 2px" }}>{t.task}</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", margin: 0 }}>{t.project} · Due {t.due}</p>
          </div>
          <span style={{ fontSize: 9.5, padding: "3px 10px", borderRadius: 999, background: `${t.color}15`, color: t.color, fontWeight: 700, border: `1px solid ${t.color}28`, whiteSpace: "nowrap" }}>{t.status}</span>
        </div>
      ))}
      <LockedCTA nav={nav} />
    </>
  );
}

/* Analytics */
function AnalyticsView({ nav, lockAction }: { nav: (p: string) => void; lockAction: () => void }) {
  return (
    <>
      <SectionHeader eyebrow="Analytics" title="Analytics" sub="Full performance dashboard across every platform and tool" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total Views",   value: "2.4M",  sub: "+18% MoM",         color: GOLD,      icon: Eye },
          { label: "Followers",     value: "48.2K", sub: "+3.1K this month", color: "#34d399", icon: TrendingUp },
          { label: "Engagement",    value: "6.8%",  sub: "3× platform avg",  color: "#60a5fa", icon: Activity },
          { label: "Credits Used",  value: "1,847", sub: "this month",       color: "#f472b6", icon: Zap },
        ].map(s => <StatCard key={s.label} {...s} />)}
      </div>
      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "18px", marginBottom: 16 }}>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", margin: "0 0 16px" }}>7-Day Activity</p>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 80 }}>
          {[42,67,55,88,71,95,82].map((v, i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{ width: "100%", borderRadius: 5, background: i === 6 ? GOLD : `${GOLD}40`, height: `${v}%`, boxShadow: i === 6 ? `0 0 12px ${GOLD}50` : "none" }} />
              <p style={{ fontSize: 8.5, color: i === 6 ? GOLD : "rgba(255,255,255,0.25)", margin: 0 }}>{["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][i]}</p>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        {[
          { platform: "Instagram", emoji: "📸", followers: "31.4K", growth: "+8.2%",  color: "#f472b6" },
          { platform: "YouTube",   emoji: "🎬", followers: "12.1K", growth: "+12.4%", color: "#f87171" },
          { platform: "LinkedIn",  emoji: "💼", followers: "4.7K",  growth: "+5.1%",  color: "#60a5fa" },
        ].map(p => (
          <div key={p.platform} style={{ background: `${p.color}09`, border: `1px solid ${p.color}20`, borderRadius: 14, padding: "14px" }}>
            <p style={{ fontSize: 18, margin: "0 0 6px" }}>{p.emoji}</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", margin: "0 0 3px" }}>{p.platform}</p>
            <p style={{ fontSize: 18, fontWeight: 900, color: "#fff", margin: "0 0 2px", lineHeight: 1 }}>{p.followers}</p>
            <p style={{ fontSize: 11, color: "#34d399", fontWeight: 700, margin: 0 }}>{p.growth}</p>
          </div>
        ))}
      </div>
      <LockedCTA nav={nav} />
    </>
  );
}

/* Generic fallback for remaining sections */
function GenericView({ label, nav, lockAction, emoji }: { label: string; nav: (p: string) => void; lockAction: () => void; emoji?: string }) {
  return (
    <>
      <SectionHeader eyebrow="Oravini Platform" title={label} sub="Part of your full Tier 5 Elite dashboard" />
      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "48px 32px", textAlign: "center", marginBottom: 20 }}>
        <p style={{ fontSize: 44, margin: "0 0 16px" }}>{emoji ?? "🔮"}</p>
        <p style={{ fontSize: 16, fontWeight: 800, color: "#fff", margin: "0 0 10px" }}>{label}</p>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", margin: "0 0 28px", lineHeight: 1.7, maxWidth: 400, marginLeft: "auto", marginRight: "auto" }}>
          This tool is live in the full platform. Create your free account to access it — no credit card needed.
        </p>
        <button onClick={() => nav("/login?tab=register")} style={{ background: `linear-gradient(135deg,${GOLD_BRIGHT},${GOLD})`, color: "#000", fontWeight: 800, fontSize: 14, border: "none", borderRadius: 11, padding: "13px 32px", cursor: "pointer" }}>
          Start for Free →
        </button>
      </div>
    </>
  );
}

/* ── Section router ────────────────────────────────────────── */
function SectionView({ section, nav, lockAction }: { section: string; nav: (p: string) => void; lockAction: () => void }) {
  const p = { nav, lockAction };
  switch (section) {
    case "Dashboard":          return <DashboardView {...p} />;
    case "Documents":          return <DocumentsView {...p} />;
    case "Community":          return <GenericView label="Community Forum" emoji="🌍" {...p} />;
    case "Scheduling":         return <SchedulingView {...p} />;
    case "Tracking":           return <TrackingView {...p} />;
    case "Competitor Study":   return <CompetitorView {...p} />;
    case "Content Ideas":      return <ContentIdeasView {...p} />;
    case "Design Studio":      return <DesignStudioView {...p} />;
    case "Content Coach":      return <ContentCoachView {...p} />;
    case "Content Analyser":   return <ContentAnalyserView {...p} />;
    case "Video Editor":       return <VideoEditorView {...p} />;
    case "Oravini Recorder":   return <GenericView label="Oravini Recorder" emoji="🎙️" {...p} />;
    case "Clip Finder":        return <GenericView label="Clip Finder" emoji="✂️" {...p} />;
    case "Video Marketing":    return <VideoMarketingView {...p} />;
    case "Pages & Funnels":    return <FunnelsView {...p} />;
    case "DM Automation":      return <DmAutomationView {...p} />;
    case "Cortex Vault":       return <GenericView label="Cortex Vault" emoji="🗄️" {...p} />;
    case "Skills":             return <GenericView label="Skills & Learning" emoji="📚" {...p} />;
    case "Analytics":          return <AnalyticsView {...p} />;
    case "Email & Workflows":  return <EmailWorkflowsView {...p} />;
    case "SMS Marketing":      return <GenericView label="SMS Marketing" emoji="📱" {...p} />;
    case "Project Tracker":    return <ProjectTrackerView {...p} />;
    case "CRM":                return <CRMView {...p} />;
    default:                   return <GenericView label={section} {...p} />;
  }
}

/* ── Intro screen ──────────────────────────────────────────── */
function IntroScreen({ onEnter }: { onEnter: () => void }) {
  const [phase, setPhase] = useState<0 | 1 | 2 | 3>(0);
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 400);
    const t2 = setTimeout(() => setPhase(2), 1600);
    const t3 = setTimeout(() => setPhase(3), 2700);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "#000", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
      <div style={{ position: "absolute", top: "50%", left: "50%", width: 600, height: 600, borderRadius: "50%", background: GOLD, opacity: 0.04, filter: "blur(120px)", transform: "translate(-50%,-50%)", pointerEvents: "none" }} />
      <div style={{ opacity: phase >= 1 ? 1 : 0, transform: phase >= 1 ? "translateY(0)" : "translateY(20px)", transition: "all 0.8s cubic-bezier(0.16,1,0.3,1)", marginBottom: 32 }}>
        <img src={oraviniLogoPath} alt="Oravini" style={{ width: 72, height: 72, borderRadius: 18, objectFit: "cover", objectPosition: "50% 32%", boxShadow: `0 0 60px rgba(212,180,97,0.4)` }} />
      </div>
      <div style={{ opacity: phase >= 2 ? 1 : 0, transform: phase >= 2 ? "translateY(0)" : "translateY(20px)", transition: "all 0.9s cubic-bezier(0.16,1,0.3,1)", marginBottom: 40 }}>
        <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.35em", textTransform: "uppercase", color: GOLD, marginBottom: 16 }}>Tier 5 · Elite Experience</p>
        <h1 style={{ fontSize: "clamp(28px,5vw,52px)", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.025em", marginBottom: 20, color: "#fff" }}>
          Welcome to <span style={{ color: GOLD }}>Oravini.</span>
        </h1>
        <p style={{ fontSize: "clamp(14px,2.2vw,18px)", color: "rgba(255,255,255,0.55)", lineHeight: 1.7, maxWidth: 480, margin: "0 auto" }}>
          An AI-powered platform built for creators who are serious about growth.
        </p>
        <p style={{ fontSize: "clamp(18px,3vw,26px)", fontWeight: 900, color: "#fff", marginTop: 16 }}>
          Be ready to be a <span style={{ color: GOLD }}>beast.</span> 🔥
        </p>
      </div>
      <div style={{ opacity: phase >= 3 ? 1 : 0, transform: phase >= 3 ? "translateY(0) scale(1)" : "translateY(12px) scale(0.96)", transition: "all 0.7s cubic-bezier(0.16,1,0.3,1)" }}>
        <button onClick={onEnter}
          style={{ background: `linear-gradient(135deg,${GOLD_BRIGHT},${GOLD})`, color: "#000", fontWeight: 900, fontSize: 16, border: "none", borderRadius: 14, padding: "16px 48px", cursor: "pointer", boxShadow: `0 0 60px rgba(212,180,97,0.4)` }}
          onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.04)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}>
          Enter the Platform →
        </button>
        <p style={{ marginTop: 14, fontSize: 12, color: "rgba(255,255,255,0.22)" }}>Full Tier 5 dashboard · All 23 tools · No login required</p>
      </div>
    </div>
  );
}

/* ── Main export ───────────────────────────────────────────── */
export default function DashboardPreview() {
  const [, nav] = useLocation();
  const [showIntro, setShowIntro] = useState(true);
  const [dashVisible, setDashVisible] = useState(false);
  const [activeSection, setActiveSection] = useState("Dashboard");
  const [toast, setToast] = useState(false);

  const lockAction = () => {
    setToast(true);
    setTimeout(() => setToast(false), 3000);
  };

  const handleEnter = () => {
    setShowIntro(false);
    setTimeout(() => setDashVisible(true), 50);
  };

  const goToPricing = () => {
    nav("/");
    setTimeout(() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" }), 350);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#09090b", color: "#fff", fontFamily: "'Inter', system-ui, sans-serif" }}>
      {showIntro && <IntroScreen onEnter={handleEnter} />}

      {/* Lock toast */}
      <div style={{ position: "fixed", bottom: 28, left: "50%", transform: `translateX(-50%) translateY(${toast ? "0" : "16px"})`, opacity: toast ? 1 : 0, transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)", zIndex: 9998, pointerEvents: toast ? "auto" : "none", display: "flex", alignItems: "center", gap: 12, background: "#1a1a1c", border: `1px solid ${GOLD}35`, borderRadius: 14, padding: "13px 20px", boxShadow: `0 8px 32px rgba(0,0,0,0.5),0 0 24px ${GOLD}14`, whiteSpace: "nowrap" }}>
        <Lock style={{ width: 14, height: 14, color: GOLD, flexShrink: 0 }} />
        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", fontWeight: 600 }}>This feature is live in your account</span>
        <button onClick={() => nav("/login?tab=register")} style={{ fontSize: 12, fontWeight: 800, color: "#000", background: `linear-gradient(135deg,${GOLD_BRIGHT},${GOLD})`, border: "none", borderRadius: 8, padding: "6px 14px", cursor: "pointer", flexShrink: 0 }}>
          Sign up free →
        </button>
      </div>

      <div style={{ opacity: dashVisible ? 1 : 0, transform: dashVisible ? "translateY(0)" : "translateY(16px)", transition: "all 0.7s cubic-bezier(0.16,1,0.3,1)", display: "flex", flexDirection: "column", height: "100vh" }}>

        {/* Top banner */}
        <div style={{ background: `linear-gradient(90deg,${GOLD}18,${GOLD}0a,${GOLD}18)`, borderBottom: `1px solid ${GOLD}22`, padding: "9px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: GOLD, boxShadow: `0 0 6px ${GOLD}` }} />
            <span style={{ fontSize: 11, color: GOLD, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase" }}>Tier 5 · Elite Preview</span>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginLeft: 4 }}>— Browse every tool. Sign up to go live.</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={goToPricing} style={{ background: "none", border: `1px solid ${GOLD}44`, borderRadius: 7, color: GOLD, fontSize: 11, fontWeight: 600, padding: "5px 14px", cursor: "pointer" }}>See Pricing</button>
            <button onClick={() => nav("/login?tab=register")} style={{ background: `linear-gradient(135deg,${GOLD_BRIGHT},${GOLD})`, border: "none", borderRadius: 7, color: "#000", fontSize: 11, fontWeight: 800, padding: "6px 16px", cursor: "pointer" }}>Create Free Account</button>
          </div>
        </div>

        {/* Layout */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

          {/* Sidebar */}
          <aside style={{ width: 220, background: "#0d0d0f", borderRight: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", flexShrink: 0 }}>
            {/* Logo */}
            <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
              <img src={oraviniLogoPath} alt="Oravini" style={{ height: 28, width: 28, objectFit: "cover", objectPosition: "50% 32%", borderRadius: 6 }} />
              <div>
                <p style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase", color: GOLD, lineHeight: 1, margin: 0 }}>ORAVINI</p>
                <p style={{ fontSize: 8, color: "rgba(255,255,255,0.28)", letterSpacing: "0.1em", textTransform: "uppercase", margin: "3px 0 0" }}>Tier 5 · Elite</p>
              </div>
              <div style={{ marginLeft: "auto", width: 7, height: 7, borderRadius: "50%", background: "#34d399", boxShadow: "0 0 6px #34d399" }} />
            </div>

            {/* Nav items */}
            <nav style={{ flex: 1, padding: "8px 8px", overflowY: "auto" }}>
              {SIDEBAR_ITEMS.map(({ icon: Icon, label }) => {
                const active = activeSection === label;
                return (
                  <button key={label}
                    onClick={() => setActiveSection(label)}
                    style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", borderRadius: 9, background: active ? `${GOLD}14` : "none", border: `1px solid ${active ? `${GOLD}28` : "transparent"}`, color: active ? GOLD : "rgba(255,255,255,0.5)", fontSize: 12.5, fontWeight: active ? 700 : 400, cursor: "pointer", transition: "all 0.1s", marginBottom: 1, textAlign: "left" }}
                    onMouseEnter={e => { if (!active) { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "rgba(255,255,255,0.8)"; }}}
                    onMouseLeave={e => { if (!active) { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}}>
                    <Icon style={{ width: 14, height: 14, flexShrink: 0 }} />
                    <span>{label}</span>
                  </button>
                );
              })}
            </nav>

            {/* User area */}
            <div style={{ padding: "10px 10px", borderTop: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", marginBottom: 8, borderRadius: 10, background: `${GOLD}08`, border: `1px solid ${GOLD}18` }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${GOLD}22`, border: `1px solid ${GOLD}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>👑</div>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.65)", margin: 0 }}>Elite Member</p>
                  <p style={{ fontSize: 9, color: GOLD, fontWeight: 600, margin: 0 }}>Tier 5 · Preview</p>
                </div>
              </div>
              <button onClick={() => nav("/login?tab=register")} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 0", borderRadius: 9, background: `linear-gradient(135deg,${GOLD_BRIGHT},${GOLD})`, border: "none", color: "#000", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>
                <ArrowUpRight style={{ width: 13, height: 13 }} /> Create Account
              </button>
            </div>
          </aside>

          {/* Main content */}
          <main style={{ flex: 1, overflowY: "auto", padding: "24px 28px", background: "#09090b" }}>
            <SectionView section={activeSection} nav={nav} lockAction={lockAction} />
            <div style={{ textAlign: "center", paddingBottom: 24, marginTop: 16 }}>
              <button onClick={() => nav("/")} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.18)", fontSize: 12, cursor: "pointer" }}
                onMouseEnter={e => (e.currentTarget.style.color = GOLD)}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.18)")}>
                ← Back to Oravini
              </button>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
