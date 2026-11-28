import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  ArrowRight, ArrowUpRight, Zap, Eye, MessageCircle, Radio, Sparkles, Video, LayoutGrid,
  Target, BarChart2, Crown, Flame, CalendarDays, Copy, Check, Users, Inbox,
} from "lucide-react";
import { useState } from "react";
import { DEMO_CSS, DmDemo, WebinarDemo, CalendarDemo, IdeasDemo, VideoDemo, StreakDemo } from "./DashboardDemos";

const ACC = "var(--c-accent)";

type WeekDay = { date: string; creditsUsed: number; actions: number };

interface Props {
  plan: string;
  goal: any;
  lifetimeTotalActions: number;
  contentPostCount: number;
  weekHistory: WeekDay[];
  streak?: number;
  onSetGoal?: () => void;
}

function nextStep(p: Props, webinarCount: number) {
  if (!p.goal) return { title: "Set your income goal", why: "Everything on this page gets sharper once Oravini knows your target.", cta: "Set goal", href: "/#goal" };
  if (p.lifetimeTotalActions === 0) return { title: "Generate your first content ideas", why: "Takes about a minute. Hooks and scripts built for your niche.", cta: "Open Content Ideas", href: "/ai-ideas" };
  if (p.contentPostCount === 0) return { title: "Track your first post", why: "Add one post and your results chart starts filling in.", cta: "Add a post", href: "/tracking/content" };
  if (webinarCount === 0) return { title: "Set up your first webinar", why: "Registration page, live room and follow-up in one flow.", cta: "Create webinar", href: "/tools/webinars" };
  return { title: "Plan this week's content", why: "Turn your latest numbers into the next set of ideas.", cta: "Open Content Ideas", href: "/ai-ideas" };
}

function Stat({ label, value, sub, icon: Icon, href }: { label: string; value: string | number; sub: string; icon: any; href: string }) {
  return (
    <Link href={href}>
      <div className="pro-card pro-hover group cursor-pointer p-5" tabIndex={0}>
        <div className="flex items-center gap-2.5 mb-4">
          <span className="w-8 h-8 rounded-[10px] flex items-center justify-center" style={{ background: "var(--c-tint)" }}><Icon className="w-4 h-4" style={{ color: ACC }} /></span>
          <span className="text-[13px] font-medium cm">{label}</span>
        </div>
        <p className="text-[30px] font-semibold ct leading-none tabular-nums tracking-[-0.02em]" data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>{value}</p>
        <p className="text-xs cm mt-2">{sub}</p>
      </div>
    </Link>
  );
}

function Section({ icon: Icon, title, sub, action, href, children, testid, className = "" }: { icon?: any; title: string; sub?: string; action?: string; href?: string; children: any; testid?: string; className?: string }) {
  return (
    <div className={`pro-card p-6 flex flex-col ${className}`} data-testid={testid}>
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="flex items-center gap-2.5">
          {Icon && <span className="w-8 h-8 rounded-[10px] flex items-center justify-center" style={{ background: "var(--c-tint)" }}><Icon className="w-4 h-4" style={{ color: ACC }} /></span>}
          <div><h3 className="text-[15px] font-semibold ct leading-tight">{title}</h3>{sub && <p className="text-xs cm mt-0.5">{sub}</p>}</div>
        </div>
        {action && href && <Link href={href}><span className="pro-link cursor-pointer text-[13px] font-medium inline-flex items-center gap-1 whitespace-nowrap">{action}<ArrowRight className="w-3.5 h-3.5" /></span></Link>}
      </div>
      {children}
    </div>
  );
}

function Empty({ icon: Icon, title, body, cta, href }: { icon: any; title: string; body: string; cta?: string; href?: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center py-6 px-4 rounded-xl" style={{ background: "var(--c-card2)", border: "1px dashed rgba(20,20,20,0.12)" }}>
      <span className="w-10 h-10 rounded-full flex items-center justify-center mb-3" style={{ background: "var(--c-card)", border: "1px solid var(--c-border)" }}><Icon className="w-[18px] h-[18px]" style={{ color: ACC }} /></span>
      <p className="text-sm font-medium ct">{title}</p>
      <p className="text-xs cm mt-1 max-w-[260px] leading-relaxed">{body}</p>
      {cta && href && <Link href={href}><span className="pro-btn-ghost cursor-pointer mt-4 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold">{cta}<ArrowRight className="w-3 h-3" /></span></Link>}
    </div>
  );
}

const STATUS: Record<string, { bg: string; fg: string }> = {
  new: { bg: "rgba(46,120,239,0.10)", fg: "#2e78ef" },
  contacted: { bg: "rgba(20,20,20,0.06)", fg: "rgba(20,20,20,0.6)" },
  qualified: { bg: "rgba(22,163,74,0.10)", fg: "#15803d" },
};
const initials = (n: string) => String(n || "?").trim().split(/\s+/).map(p => p[0]).slice(0, 2).join("").toUpperCase();

const QUICK = [
  { href: "/tools/webinars", label: "Webinars", desc: "Host and sell live", icon: Radio },
  { href: "/dm-automation", label: "DM Automation", desc: "Turn comments into DMs", icon: MessageCircle },
  { href: "/ai-ideas", label: "Content Ideas", desc: "Hooks and scripts", icon: Sparkles },
  { href: "/video-hosting", label: "Video Hosting", desc: "Host and share videos", icon: Video },
];

const DEMOS = [
  { href: "/dm-automation", label: "DM Automation", desc: "A comment turns into a DM, on its own.", Demo: DmDemo },
  { href: "/tools/webinars", label: "Webinars", desc: "Register, host live and follow up in one flow.", Demo: WebinarDemo },
  { href: "/ai-ideas", label: "Content Ideas", desc: "Hooks and scripts built for your niche.", Demo: IdeasDemo },
  { href: "/tracking/content/instagram/scheduler", label: "Content Scheduler", desc: "Plan the week and let posts go out.", Demo: CalendarDemo },
  { href: "/video-hosting", label: "Video Hosting", desc: "Host and share videos anywhere.", Demo: VideoDemo },
  { href: "/tracking", label: "Streak and goals", desc: "Stay consistent and watch your goal fill.", Demo: StreakDemo },
];

const MORE = [
  { href: "/ai-coach", label: "Content Coach" }, { href: "/tracking/competitor", label: "Competitor Study" },
  { href: "/ai-design", label: "Design Studio" }, { href: "/video-editor", label: "Video Editor" },
  { href: "/clip-finder", label: "Clip Finder" }, { href: "/pages-hub", label: "Pages & Funnels" },
  { href: "/carousel-studio", label: "Carousel Studio" }, { href: "/tracking", label: "Tracking" },
];

export default function DashboardOverview(props: Props) {
  const { data: credits } = useQuery<any>({ queryKey: ["/api/credits"], staleTime: 30000 });
  const { data: webinars } = useQuery<any[]>({ queryKey: ["/api/webinar-funnels"], staleTime: 60000 });
  const { data: leads } = useQuery<any[]>({ queryKey: ["/api/dm/leads"], staleTime: 60000 });
  const { data: igJobs } = useQuery<any>({ queryKey: ["/api/instagram/publishing/jobs"], staleTime: 60000, retry: false });
  const [copied, setCopied] = useState(false);
  const streak = props.streak ?? 0;
  const regTotal = (webinars || []).reduce((s, w) => s + (w.registrationCount || 0), 0);
  const nextWebinar = (webinars || [])
    .filter(w => w.status === "published" && new Date(w.scheduledAt).getTime() > Date.now())
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0];
  const recentLeads = [...(Array.isArray(leads) ? leads : [])]
    .sort((a, b) => new Date(b.createdAt || b.lastContactAt || 0).getTime() - new Date(a.createdAt || a.lastContactAt || 0).getTime())
    .slice(0, 5);
  const jobs: any[] = Array.isArray(igJobs?.jobs) ? igJobs.jobs.filter((j: any) => j.status === "scheduled") : [];
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + i); return d; });
  const postsOn = (d: Date) => jobs.filter(j => { const t = new Date(j.scheduled_at); return t.toDateString() === d.toDateString(); });
  const weekPostCount = days.reduce((n, d) => n + postsOn(d).length, 0);
  const copyLink = () => { if (!nextWebinar) return; navigator.clipboard?.writeText(`${window.location.origin}/w/${nextWebinar.slug}`); setCopied(true); setTimeout(() => setCopied(false), 1500); };

  const step = nextStep(props, (webinars || []).length);
  const week = props.weekHistory || [];
  const max = Math.max(1, ...week.map(d => d.actions));
  const totalWeek = week.reduce((s, d) => s + d.actions, 0);
  const isFree = props.plan === "free";

  return (
    <div className="calm dm space-y-8" data-testid="dashboard-overview">
      <style>{DEMO_CSS}</style>
      <style>{`
        .calm{--c-accent:#2e78ef;--c-text:#101828;--c-muted:#5b6475;--c-faint:#8a92a3;--c-card:#ffffff;--c-card2:#f7f8fa;--c-border:#e7e9ee;--c-tint:rgba(46,120,239,0.09);--c-line-a:rgba(46,120,239,0.28);--c-bar:#c9dcfb;font-family:Inter,ui-sans-serif,system-ui,sans-serif;font-feature-settings:"cv11","ss01";-webkit-font-smoothing:antialiased}
        .ct{color:var(--c-text)}.cm{color:var(--c-muted)}.cf{color:var(--c-faint)}
        .pro-card{background:var(--c-card);border:1px solid var(--c-border);border-radius:16px;box-shadow:0 1px 2px rgba(16,24,40,0.04),0 1px 1px rgba(16,24,40,0.02)}
        .pro-hover{transition:border-color 180ms ease,box-shadow 220ms ease,transform 260ms cubic-bezier(.16,1,.3,1)}
        .pro-hover:hover,.pro-hover:focus-visible{border-color:var(--c-line-a);box-shadow:0 6px 20px -8px rgba(46,120,239,0.25),0 1px 2px rgba(16,24,40,0.04);transform:translateY(-2px);outline:none}
        .pro-link{color:var(--c-accent)}.pro-link:hover{text-decoration:underline;text-underline-offset:3px}
        .pro-btn-ghost{background:var(--c-card);color:var(--c-accent);border:1px solid var(--c-line-a);transition:background-color 160ms}.pro-btn-ghost:hover{background:var(--c-tint)}
        .pro-eyebrow{font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--c-faint)}
        .calm button:focus-visible,.calm [tabindex]:focus-visible{outline:2px solid var(--c-accent);outline-offset:2px}
        @keyframes calmIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
        .calm>*{animation:calmIn 600ms cubic-bezier(0.16,1,0.3,1) both}
        .calm>*:nth-child(2){animation-delay:70ms}.calm>*:nth-child(3){animation-delay:140ms}
        .calm>*:nth-child(4){animation-delay:210ms}.calm>*:nth-child(5){animation-delay:280ms}
        .calm>*:nth-child(6){animation-delay:350ms}.calm>*:nth-child(7){animation-delay:420ms}
        .calm button{transition:background-color 200ms ease-in-out,transform 300ms cubic-bezier(0.16,1,0.3,1),opacity 200ms,box-shadow 200ms}
        .calm-bar{transition:height 700ms cubic-bezier(0.16,1,0.3,1),background-color 200ms}
        .calm-bar:hover{background:var(--c-accent)!important}
        .tool-card:hover .tool-arrow{background:#2e78ef;color:#fff}
        @media (prefers-reduced-motion:reduce){.calm>*{animation:none}.calm *{transition:none!important}}
      `}</style>
      {/* Do this next */}
      <div className="pro-card relative overflow-hidden p-7 lg:p-9" style={{ borderColor: "var(--c-line-a)", background: "linear-gradient(120deg,#f3f8ff 0%,#ffffff 62%)" }}>
        <div className="absolute -top-28 -right-20 w-80 h-80 rounded-full blur-3xl pointer-events-none" style={{ background: ACC, opacity: 0.07 }} />
        <div className="relative flex items-start justify-between gap-4 mb-5">
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ background: "var(--c-tint)", color: ACC }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: ACC }} />Do this next</span>
          <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5" style={{ background: "var(--c-card)", border: "1px solid var(--c-border)" }} data-testid="streak-counter" title="Days in a row you used a tool">
            <Flame className="w-3.5 h-3.5" style={{ color: streak > 0 ? "#f97316" : "var(--c-faint)" }} />
            <span className="text-[13px] font-semibold ct tabular-nums">{streak}</span>
            <span className="text-xs cm">day streak</span>
          </div>
        </div>
        <h2 className="relative text-[26px] lg:text-[32px] font-semibold ct leading-[1.15] tracking-[-0.02em] text-balance">{step.title}</h2>
        <p className="relative text-[15px] cm mt-3 max-w-[480px] leading-relaxed">{step.why}</p>
        <Link href={step.href}>
          <button className="relative mt-7 inline-flex items-center gap-2 rounded-full pl-6 pr-5 py-3 text-sm font-semibold hover:opacity-95 active:scale-[0.98]" style={{ background: ACC, color: "#fff", boxShadow: "0 1px 2px rgba(16,24,40,0.12), 0 8px 20px -8px rgba(46,120,239,0.55)" }} data-testid="button-next-step">
            {step.cta} <ArrowRight className="w-4 h-4" />
          </button>
        </Link>
      </div>

      {/* Live numbers */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Credits left" value={credits ? (credits.total ?? 0).toLocaleString() : "..."} sub={credits ? `of ${(credits.planAllowance ?? 0).toLocaleString()} this month` : "Loading"} icon={Zap} href="/credits" />
        <Stat label="Posts tracked" value={props.contentPostCount} sub="Across your platforms" icon={Eye} href="/tracking/content" />
        <Stat label="DM leads" value={leads ? leads.length : "..."} sub="Captured by DM automation" icon={MessageCircle} href="/dm-automation" />
        <Stat label="Registrations" value={webinars ? regTotal : "..."} sub={webinars ? `Across ${webinars.length} webinar${webinars.length === 1 ? "" : "s"}` : "Loading"} icon={Radio} href="/tools/webinars" />
      </div>

      {/* Product mini-demos */}
      <div>
        <div className="flex items-end justify-between mb-4">
          <div><h3 className="text-lg font-semibold ct tracking-[-0.01em]">Your toolkit</h3><p className="text-[13px] cm mt-0.5">Everything you use to grow, one click away.</p></div>
        </div>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {DEMOS.map(t => (
            <Link key={t.href} href={t.href}>
              <div className="pro-card pro-hover tool-card cursor-pointer p-2.5 h-full" tabIndex={0}>
                <div className="h-[222px] rounded-xl p-3" style={{ background: "linear-gradient(160deg,#e9f1fb 0%,#f6f9fe 100%)", border: "1px solid rgba(46,120,239,0.08)" }}><t.Demo /></div>
                <div className="flex items-center justify-between gap-3 px-2.5 pt-4 pb-2.5">
                  <div className="min-w-0"><p className="text-[15px] font-semibold ct leading-tight">{t.label}</p><p className="text-[13px] cm mt-1 leading-snug">{t.desc}</p></div>
                  <span className="tool-arrow shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors" style={{ background: "var(--c-card2)", color: "var(--c-muted)" }}><ArrowUpRight className="w-4 h-4" /></span>
                </div>
              </div>
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap mt-4">
          <span className="flex items-center gap-1.5 pro-eyebrow mr-1.5"><LayoutGrid className="w-3 h-3" /> More tools</span>
          {MORE.map(m => (
            <Link key={m.href} href={m.href}>
              <span className="cursor-pointer inline-block text-[13px] cm hover:text-[color:var(--c-accent)] hover:border-[color:var(--c-line-a)] hover:bg-[color:var(--c-tint)] px-3.5 py-1.5 rounded-full transition-colors" style={{ border: "1px solid var(--c-border)", background: "var(--c-card)" }}>{m.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Content calendar strip */}
      <Section icon={CalendarDays} title="Scheduled posts" sub="Next 7 days" action="Open scheduler" href="/tracking/content/instagram/scheduler" testid="content-calendar">
        <div className="grid grid-cols-7 gap-2 sm:gap-3">
          {days.map((d, i) => {
            const ps = postsOn(d);
            const on = ps.length > 0;
            return (
              <div key={i} className="rounded-xl px-1.5 py-3 text-center relative" style={{ background: on ? "var(--c-tint)" : "var(--c-card2)", border: `1px solid ${i === 0 ? ACC : on ? "var(--c-line-a)" : "var(--c-border)"}`, boxShadow: i === 0 ? "0 0 0 3px rgba(46,120,239,0.10)" : "none" }}>
                <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: i === 0 ? ACC : "var(--c-muted)" }}>{i === 0 ? "Today" : d.toLocaleDateString("en-US", { weekday: "short" })}</p>
                <p className="text-xl font-semibold ct leading-tight mt-1 tabular-nums">{d.getDate()}</p>
                <div className="h-4 mt-1.5 flex items-center justify-center gap-1">
                  {on ? <>{ps.slice(0, 3).map((_, k) => <span key={k} className="w-1.5 h-1.5 rounded-full" style={{ background: ACC }} />)}<span className="text-[11px] font-medium ml-0.5" style={{ color: ACC }}>{ps.length}</span></> : <span className="text-[11px] cf">-</span>}
                </div>
              </div>
            );
          })}
        </div>
        {weekPostCount === 0 && <p className="text-[13px] cm mt-4">Nothing scheduled this week. <Link href="/tracking/content/instagram/scheduler"><span className="pro-link cursor-pointer font-medium">Plan a post</span></Link></p>}
      </Section>

      {/* Upcoming webinar + recent DM leads */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Section icon={Radio} title="Upcoming webinar" sub={nextWebinar ? "Next one on your calendar" : undefined} testid="upcoming-webinar">
          {nextWebinar ? (
            <div className="flex-1 flex flex-col">
              <p className="text-lg font-semibold ct leading-snug tracking-[-0.01em]">{nextWebinar.title}</p>
              <p className="text-[13px] cm mt-1.5 inline-flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" />{new Date(nextWebinar.scheduledAt).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</p>
              <div className="flex items-center gap-4 mt-auto pt-5">
                <div className="rounded-xl px-4 py-2.5" style={{ background: "var(--c-card2)", border: "1px solid var(--c-border)" }}>
                  <p className="text-xl font-semibold ct tabular-nums leading-none">{nextWebinar.registrationCount || 0}</p><p className="text-[11px] cm mt-1">Registered</p>
                </div>
                <button onClick={copyLink} className="pro-btn-ghost ml-auto inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold" data-testid="button-copy-webinar-link">
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}{copied ? "Copied" : "Copy link"}
                </button>
              </div>
            </div>
          ) : (
            <Empty icon={Radio} title="No webinar coming up" body="Set up a registration page, live room and follow-up in one flow." cta="Schedule one" href="/tools/webinars" />
          )}
        </Section>

        <Section icon={Users} title="Recent DM leads" sub="Captured by DM automation" action="View all" href="/dm-automation" testid="recent-dm-leads">
          {recentLeads.length === 0 ? (
            <Empty icon={Inbox} title="No leads yet" body="They show up here once DM automation captures someone." cta="Set up DM automation" href="/dm-automation" />
          ) : (
            <ul className="-my-1">
              {recentLeads.map((l: any, idx: number) => {
                const st = STATUS[String(l.status || "new").toLowerCase()] || STATUS.new;
                return (
                  <li key={l.id} className="flex items-center gap-3 py-2.5" style={{ borderTop: idx === 0 ? "none" : "1px solid var(--c-border)" }}>
                    <span className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0" style={{ background: "var(--c-tint)", color: ACC }}>{initials(l.name)}</span>
                    <div className="min-w-0 flex-1"><p className="text-sm font-medium ct truncate">{l.name}</p>
                      {l.instagramHandle && <p className="text-xs cm truncate">@{String(l.instagramHandle).replace(/^@/, "")}</p>}</div>
                    <span className="text-[11px] font-medium capitalize rounded-full px-2.5 py-1" style={{ background: st.bg, color: st.fg }}>{l.status || "new"}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>
      </div>

      {/* Results this week + upgrade */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Section className="lg:col-span-2" icon={BarChart2} title="Results this week" sub={`${totalWeek} ${totalWeek === 1 ? "action" : "actions"} in the last 7 days`}>
          <div className="relative">
            <div className="absolute inset-x-0 top-0 bottom-6 flex flex-col justify-between pointer-events-none">
              {[0, 1, 2].map(k => <div key={k} className="w-full" style={{ borderTop: "1px dashed var(--c-border)" }} />)}
            </div>
            <div className="relative flex items-end gap-3 h-40">
              {week.map((d, i) => {
                const h = d.actions === 0 ? 3 : Math.max(10, Math.round((d.actions / max) * 100));
                const label = d.date ? new Date(d.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" }) : "";
                const today = i === week.length - 1;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                    {d.actions > 0 && <span className="text-[11px] font-medium tabular-nums" style={{ color: today ? ACC : "var(--c-muted)" }}>{d.actions}</span>}
                    <div className="w-full max-w-[56px] rounded-t-lg rounded-b-[4px] calm-bar" title={`${d.actions} actions`} style={{ height: `${h}%`, background: d.actions === 0 ? "var(--c-border)" : today ? ACC : `var(--c-bar)` }} />
                    <span className="text-[11px] h-4" style={{ color: today ? "var(--c-text)" : "var(--c-faint)", fontWeight: today ? 600 : 400 }}>{label}</span>
                  </div>
                );
              })}
            </div>
            {totalWeek === 0 && (
              <div className="absolute inset-0 bottom-6 flex items-center justify-center">
                <div className="rounded-2xl bg-white px-6 py-5 text-center" style={{ boxShadow: "0 8px 30px rgba(16,24,40,0.10)", border: "1px solid var(--c-border)" }}>
                  <p className="text-sm font-semibold ct">Your results will show up here</p>
                  <p className="text-xs cm mt-1">Use any tool and the week starts filling in.</p>
                  <Link href="/ai-ideas"><span className="cursor-pointer mt-3.5 inline-block rounded-full px-4 py-2 text-xs font-semibold" style={{ background: ACC, color: "#fff" }}>Try Content Ideas</span></Link>
                </div>
              </div>
            )}
          </div>
        </Section>

        {isFree ? (
          <Link href="/settings/plan">
            <div className="pro-card pro-hover cursor-pointer p-6 h-full flex flex-col justify-between" style={{ background: "linear-gradient(160deg,#f3f8ff 0%,#fff 70%)" }} tabIndex={0}>
              <div>
                <span className="w-8 h-8 rounded-[10px] flex items-center justify-center mb-4" style={{ background: "var(--c-tint)" }}><Crown className="w-4 h-4" style={{ color: ACC }} /></span>
                <p className="text-[15px] font-semibold ct">Need more credits?</p>
                <p className="text-[13px] cm mt-1.5 leading-relaxed">Paid plans add credits, advanced tools and better output.</p>
              </div>
              <span className="pro-link text-[13px] font-medium mt-6 inline-flex items-center gap-1">See plans <ArrowRight className="w-3.5 h-3.5" /></span>
            </div>
          </Link>
        ) : (
          <div className="pro-card p-6 flex flex-col justify-between">
            <div><span className="w-8 h-8 rounded-[10px] flex items-center justify-center mb-4" style={{ background: "var(--c-tint)" }}><Target className="w-4 h-4" style={{ color: ACC }} /></span><p className="text-[15px] font-semibold ct">Income goal</p>
              <p className="text-[13px] cm mt-1.5 leading-relaxed">{props.goal ? "Tracking toward your target." : "Not set yet."}</p></div>
            <Link href="/#goal"><span className="pro-link cursor-pointer text-[13px] font-medium mt-6 inline-flex items-center gap-1">{props.goal ? "Review" : "Set goal"} <ArrowRight className="w-3.5 h-3.5" /></span></Link>
          </div>
        )}
      </div>
    </div>
  );
}
