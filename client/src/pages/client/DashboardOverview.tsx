import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  ArrowRight, Zap, Eye, MessageCircle, Radio, Sparkles, Video, LayoutGrid,
  Target, BarChart2, Crown, Flame, CalendarDays, Copy, Check, Users,
} from "lucide-react";
import { useState } from "react";

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
      <div className="group cursor-pointer rounded-[20px] p-5 transition-colors" style={{ background: "var(--c-card)", border: "1px solid var(--c-border)" }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = `var(--c-line-a)`)} onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--c-border)")}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] cm">{label}</span>
          <Icon className="w-3.5 h-3.5" style={{ color: ACC }} />
        </div>
        <p className="text-[28px] font-medium ct leading-none tabular-nums tracking-tight" data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>{value}</p>
        <p className="text-[11px] cm mt-1.5">{sub}</p>
      </div>
    </Link>
  );
}

const QUICK = [
  { href: "/tools/webinars", label: "Webinars", desc: "Host and sell live", icon: Radio },
  { href: "/dm-automation", label: "DM Automation", desc: "Turn comments into DMs", icon: MessageCircle },
  { href: "/ai-ideas", label: "Content Ideas", desc: "Hooks and scripts", icon: Sparkles },
  { href: "/video-hosting", label: "Video Hosting", desc: "Host and share videos", icon: Video },
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
    <div className="calm space-y-9" data-testid="dashboard-overview">
      <style>{`
        .calm{--c-accent:#3d62d9;--c-text:#14161c;--c-muted:#5f6573;--c-faint:#9aa0ad;--c-card:#ffffff;--c-card2:#f5f6f8;--c-border:#e7e9ee;--c-tint:rgba(61,98,217,0.07);--c-line-a:rgba(61,98,217,0.28);--c-bar:#c9d3f3}
        .ct{color:var(--c-text)}.cm{color:var(--c-muted)}.cf{color:var(--c-faint)}
        .calm{box-shadow:none}.calm a>div,.calm .calm-card{box-shadow:0 1px 2px rgba(20,30,60,0.04)}
        @keyframes calmIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
        .calm>*{animation:calmIn 600ms cubic-bezier(0.16,1,0.3,1) both}
        .calm>*:nth-child(2){animation-delay:70ms}.calm>*:nth-child(3){animation-delay:140ms}
        .calm>*:nth-child(4){animation-delay:210ms}.calm>*:nth-child(5){animation-delay:280ms}
        .calm>*:nth-child(6){animation-delay:350ms}.calm>*:nth-child(7){animation-delay:420ms}
        .calm a>div,.calm button{transition:border-color 200ms ease-in-out,background-color 200ms ease-in-out,transform 300ms cubic-bezier(0.16,1,0.3,1),opacity 200ms}
        .calm-bar{transition:height 700ms cubic-bezier(0.16,1,0.3,1)}
        @media (prefers-reduced-motion:reduce){.calm>*{animation:none}.calm *{transition:none!important}}
      `}</style>
      {/* Do this next */}
      <div className="relative overflow-hidden rounded-[28px] p-8 lg:p-10" style={{ background: `linear-gradient(135deg, var(--c-tint) 0%, rgba(212,180,97,0.02) 70%)`, border: `1px solid var(--c-line-a)` }}>
        <div className="absolute -top-24 -right-16 w-72 h-72 rounded-full blur-3xl pointer-events-none" style={{ background: ACC, opacity: 0.08 }} />
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: ACC }}>Do this next</p>
          <div className="flex items-center gap-1.5 rounded-full px-3 py-1" style={{ background: "var(--c-card2)", border: `1px solid var(--c-line-a)` }} data-testid="streak-counter" title="Days in a row you used a tool">
            <Flame className="w-3.5 h-3.5" style={{ color: streak > 0 ? "#fb923c" : "var(--c-faint)" }} />
            <span className="text-xs font-bold ct tabular-nums">{streak}</span>
            <span className="text-[11px] cm">{streak === 1 ? "day streak" : "day streak"}</span>
          </div>
        </div>
        <h2 className="text-2xl lg:text-[32px] font-medium ct leading-[1.15] tracking-tight text-balance">{step.title}</h2>
        <p className="text-[15px] cm mt-3 max-w-[460px] leading-relaxed">{step.why}</p>
        <Link href={step.href}>
          <button className="mt-8 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90" style={{ background: ACC, boxShadow: "0 1px 2px rgba(20,30,60,0.15)" }} data-testid="button-next-step">
            {step.cta} <ArrowRight className="w-4 h-4" />
          </button>
        </Link>
      </div>

      {/* Live numbers */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Credits left" value={credits ? (credits.total ?? 0).toLocaleString() : "..."} sub={credits ? `of ${(credits.planAllowance ?? 0).toLocaleString()} this month` : "loading"} icon={Zap} href="/credits" />
        <Stat label="Posts tracked" value={props.contentPostCount} sub="across your platforms" icon={Eye} href="/tracking/content" />
        <Stat label="DM leads" value={leads ? leads.length : "..."} sub="captured by DM automation" icon={MessageCircle} href="/dm-automation" />
        <Stat label="Webinar registrations" value={webinars ? regTotal : "..."} sub={webinars ? `across ${webinars.length} webinar${webinars.length === 1 ? "" : "s"}` : "loading"} icon={Radio} href="/tools/webinars" />
      </div>

      {/* Quick start */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[15px] font-medium ct">Quick start</h3>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {QUICK.map(t => (
            <Link key={t.href} href={t.href}>
              <div className="cursor-pointer rounded-[20px] p-5 h-full transition-all hover:-translate-y-0.5" style={{ background: "var(--c-card)", border: "1px solid var(--c-border)" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = `var(--c-line-a)`)} onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--c-border)")}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `var(--c-tint)`, border: `1px solid var(--c-line-a)` }}>
                  <t.icon className="w-4 h-4" style={{ color: ACC }} />
                </div>
                <p className="text-sm font-bold ct">{t.label}</p>
                <p className="text-xs cm mt-0.5">{t.desc}</p>
              </div>
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap mt-3">
          <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] cf mr-1"><LayoutGrid className="w-3 h-3" /> More tools</span>
          {MORE.map(m => (
            <Link key={m.href} href={m.href}>
              <span className="cursor-pointer text-xs cm hover:text-[color:var(--c-text)] px-3 py-1.5 rounded-full transition-colors" style={{ border: "1px solid var(--c-border)" }}>{m.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Content calendar strip */}
      <div className="rounded-[20px] p-6" style={{ background: "var(--c-card)", border: "1px solid var(--c-border)" }} data-testid="content-calendar">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2"><CalendarDays className="w-4 h-4" style={{ color: ACC }} /><h3 className="text-[15px] font-medium ct">Scheduled posts, next 7 days</h3></div>
          <Link href="/tracking/content/instagram/scheduler"><span className="cursor-pointer text-xs font-semibold" style={{ color: ACC }}>Open scheduler</span></Link>
        </div>
        <div className="grid grid-cols-7 gap-3">
          {days.map((d, i) => {
            const ps = postsOn(d);
            return (
              <div key={i} className="rounded-xl px-2 py-3 text-center" style={{ background: ps.length ? `var(--c-tint)` : "var(--c-card2)", border: `1px solid ${ps.length ? `var(--c-line-a)` : "var(--c-border)"}` }}>
                <p className="text-[10px] uppercase tracking-wider cm">{i === 0 ? "Today" : d.toLocaleDateString("en-US", { weekday: "short" })}</p>
                <p className="text-lg font-black ct leading-tight mt-0.5">{d.getDate()}</p>
                <p className="text-[10px] mt-1" style={{ color: ps.length ? ACC : "var(--c-faint)" }}>{ps.length ? `${ps.length} post${ps.length > 1 ? "s" : ""}` : "none"}</p>
              </div>
            );
          })}
        </div>
        {weekPostCount === 0 && <p className="text-xs cm mt-3">No posts scheduled this week. Plan one in the scheduler.</p>}
      </div>

      {/* Upcoming webinar + recent DM leads */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-[20px] p-6" style={{ background: "var(--c-card)", border: "1px solid var(--c-border)" }} data-testid="upcoming-webinar">
          <div className="flex items-center gap-2 mb-3"><Radio className="w-4 h-4" style={{ color: ACC }} /><h3 className="text-[15px] font-medium ct">Upcoming webinar</h3></div>
          {nextWebinar ? (
            <>
              <p className="text-base font-bold ct leading-snug">{nextWebinar.title}</p>
              <p className="text-xs cm mt-1">{new Date(nextWebinar.scheduledAt).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</p>
              <div className="flex items-center gap-3 mt-4">
                <span className="text-xs cm"><span className="font-black ct text-lg tabular-nums mr-1">{nextWebinar.registrationCount || 0}</span>registered</span>
                <button onClick={copyLink} className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold" style={{ background: `var(--c-tint)`, color: ACC, border: `1px solid var(--c-line-a)` }} data-testid="button-copy-webinar-link">
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}{copied ? "Copied" : "Copy link"}
                </button>
              </div>
            </>
          ) : (
            <div><p className="text-sm cm">No webinar coming up.</p>
              <Link href="/tools/webinars"><span className="cursor-pointer text-xs font-semibold mt-3 inline-flex items-center gap-1" style={{ color: ACC }}>Schedule one <ArrowRight className="w-3 h-3" /></span></Link></div>
          )}
        </div>

        <div className="rounded-[20px] p-6" style={{ background: "var(--c-card)", border: "1px solid var(--c-border)" }} data-testid="recent-dm-leads">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2"><Users className="w-4 h-4" style={{ color: ACC }} /><h3 className="text-[15px] font-medium ct">Recent DM leads</h3></div>
            <Link href="/dm-automation"><span className="cursor-pointer text-xs font-semibold" style={{ color: ACC }}>View all</span></Link>
          </div>
          {recentLeads.length === 0 ? (
            <p className="text-sm cm">No leads yet. They show up here once DM automation captures someone.</p>
          ) : (
            <ul className="divide-y" style={{ borderColor: "var(--c-border)" }}>
              {recentLeads.map((l: any) => (
                <li key={l.id} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                  <div className="min-w-0"><p className="text-sm font-semibold ct truncate">{l.name}</p>
                    {l.instagramHandle && <p className="text-[11px] cm truncate">@{String(l.instagramHandle).replace(/^@/, "")}</p>}</div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider cm rounded-full px-2 py-0.5" style={{ border: "1px solid var(--c-border)" }}>{l.status || "new"}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Results this week + upgrade */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-[20px] p-6" style={{ background: "var(--c-card)", border: "1px solid var(--c-border)" }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><BarChart2 className="w-4 h-4" style={{ color: ACC }} /><h3 className="text-[15px] font-medium ct">Results this week</h3></div>
            <span className="text-xs cm">{totalWeek} {totalWeek === 1 ? "action" : "actions"} in 7 days</span>
          </div>
          <div className="flex items-end gap-3 h-36">
            {week.map((d, i) => {
              const h = d.actions === 0 ? 4 : Math.max(10, Math.round((d.actions / max) * 100));
              const label = d.date ? new Date(d.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" }) : "";
              const today = i === week.length - 1;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                  <div className="w-full rounded-lg calm-bar" title={`${d.actions} actions`} style={{ height: `${h}%`, background: d.actions === 0 ? "var(--c-border)" : today ? ACC : `var(--c-bar)` }} />
                  <span className="text-[10px] cf">{label}</span>
                </div>
              );
            })}
          </div>
          {totalWeek === 0 && <p className="text-xs cm mt-3">Nothing yet. Use any tool and this fills in.</p>}
        </div>

        {isFree ? (
          <Link href="/settings/plan">
            <div className="cursor-pointer rounded-[20px] p-6 h-full flex flex-col justify-between" style={{ background: "var(--c-card2)", border: "1px solid var(--c-border)" }}>
              <div>
                <Crown className="w-4 h-4 mb-3" style={{ color: ACC }} />
                <p className="text-sm font-bold ct">Need more credits?</p>
                <p className="text-xs cm mt-1">Paid plans add credits, advanced tools and better output.</p>
              </div>
              <span className="text-xs font-semibold mt-4 inline-flex items-center gap-1" style={{ color: ACC }}>See plans <ArrowRight className="w-3 h-3" /></span>
            </div>
          </Link>
        ) : (
          <div className="rounded-[20px] p-6 flex flex-col justify-between" style={{ background: "var(--c-card)", border: "1px solid var(--c-border)" }}>
            <div><Target className="w-4 h-4 mb-3" style={{ color: ACC }} /><p className="text-sm font-bold ct">Income goal</p>
              <p className="text-xs cm mt-1">{props.goal ? "Tracking toward your target." : "Not set yet."}</p></div>
            <Link href="/#goal"><span className="cursor-pointer text-xs font-semibold mt-4 inline-flex items-center gap-1" style={{ color: ACC }}>{props.goal ? "Review" : "Set goal"} <ArrowRight className="w-3 h-3" /></span></Link>
          </div>
        )}
      </div>
    </div>
  );
}
