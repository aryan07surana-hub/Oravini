import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  ArrowRight, Zap, Eye, MessageCircle, Radio, Sparkles, Video, LayoutGrid,
  Target, BarChart2, Crown,
} from "lucide-react";

const GOLD = "#d4b461";

type WeekDay = { date: string; creditsUsed: number; actions: number };

interface Props {
  plan: string;
  goal: any;
  lifetimeTotalActions: number;
  contentPostCount: number;
  weekHistory: WeekDay[];
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
      <div className="group cursor-pointer rounded-2xl p-4 transition-colors" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = `${GOLD}40`)} onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)")}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">{label}</span>
          <Icon className="w-3.5 h-3.5" style={{ color: GOLD }} />
        </div>
        <p className="text-2xl font-black text-white leading-none tabular-nums" data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>{value}</p>
        <p className="text-[11px] text-zinc-500 mt-1.5">{sub}</p>
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
  const { data: webinars } = useQuery<any[]>({ queryKey: ["/api/webinars"], staleTime: 60000 });
  const { data: leads } = useQuery<any[]>({ queryKey: ["/api/dm/leads"], staleTime: 60000 });

  const step = nextStep(props, (webinars || []).length);
  const week = props.weekHistory || [];
  const max = Math.max(1, ...week.map(d => d.actions));
  const totalWeek = week.reduce((s, d) => s + d.actions, 0);
  const isFree = props.plan === "free";

  return (
    <div className="space-y-5" data-testid="dashboard-overview">
      {/* Do this next */}
      <div className="relative overflow-hidden rounded-3xl p-6 lg:p-7" style={{ background: `linear-gradient(135deg, ${GOLD}1c 0%, rgba(212,180,97,0.03) 70%)`, border: `1px solid ${GOLD}33` }}>
        <div className="absolute -top-24 -right-16 w-72 h-72 rounded-full blur-3xl pointer-events-none" style={{ background: GOLD, opacity: 0.08 }} />
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-3" style={{ color: GOLD }}>Do this next</p>
        <h2 className="text-xl lg:text-2xl font-black text-white leading-tight">{step.title}</h2>
        <p className="text-sm text-zinc-400 mt-1.5 max-w-xl">{step.why}</p>
        <Link href={step.href}>
          <button className="mt-5 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-black transition-opacity hover:opacity-90" style={{ background: GOLD }} data-testid="button-next-step">
            {step.cta} <ArrowRight className="w-4 h-4" />
          </button>
        </Link>
      </div>

      {/* Live numbers */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Credits left" value={credits ? (credits.total ?? 0).toLocaleString() : "..."} sub={credits ? `of ${(credits.planAllowance ?? 0).toLocaleString()} this month` : "loading"} icon={Zap} href="/credits" />
        <Stat label="Posts tracked" value={props.contentPostCount} sub="across your platforms" icon={Eye} href="/tracking/content" />
        <Stat label="DM leads" value={leads ? leads.length : "..."} sub="captured by DM automation" icon={MessageCircle} href="/dm-automation" />
        <Stat label="Webinars" value={webinars ? webinars.length : "..."} sub="created so far" icon={Radio} href="/tools/webinars" />
      </div>

      {/* Quick start */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white">Quick start</h3>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {QUICK.map(t => (
            <Link key={t.href} href={t.href}>
              <div className="cursor-pointer rounded-2xl p-4 h-full transition-all hover:-translate-y-0.5" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = `${GOLD}45`)} onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)")}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `${GOLD}15`, border: `1px solid ${GOLD}30` }}>
                  <t.icon className="w-4 h-4" style={{ color: GOLD }} />
                </div>
                <p className="text-sm font-bold text-white">{t.label}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{t.desc}</p>
              </div>
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap mt-3">
          <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-600 mr-1"><LayoutGrid className="w-3 h-3" /> More tools</span>
          {MORE.map(m => (
            <Link key={m.href} href={m.href}>
              <span className="cursor-pointer text-xs text-zinc-400 hover:text-white px-3 py-1.5 rounded-full transition-colors" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>{m.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Results this week + upgrade */}
      <div className="grid lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><BarChart2 className="w-4 h-4" style={{ color: GOLD }} /><h3 className="text-sm font-bold text-white">Results this week</h3></div>
            <span className="text-xs text-zinc-500">{totalWeek} {totalWeek === 1 ? "action" : "actions"} in 7 days</span>
          </div>
          <div className="flex items-end gap-2 h-32">
            {week.map((d, i) => {
              const h = d.actions === 0 ? 4 : Math.max(10, Math.round((d.actions / max) * 100));
              const label = d.date ? new Date(d.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" }) : "";
              const today = i === week.length - 1;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                  <div className="w-full rounded-md" title={`${d.actions} actions`} style={{ height: `${h}%`, background: d.actions === 0 ? "rgba(255,255,255,0.06)" : today ? GOLD : `${GOLD}70` }} />
                  <span className="text-[10px] text-zinc-600">{label}</span>
                </div>
              );
            })}
          </div>
          {totalWeek === 0 && <p className="text-xs text-zinc-500 mt-3">Nothing yet. Use any tool and this fills in.</p>}
        </div>

        {isFree ? (
          <Link href="/settings/plan">
            <div className="cursor-pointer rounded-2xl p-5 h-full flex flex-col justify-between" style={{ background: "rgba(129,140,248,0.06)", border: "1px solid rgba(129,140,248,0.2)" }}>
              <div>
                <Crown className="w-4 h-4 mb-3" style={{ color: "#a5b4fc" }} />
                <p className="text-sm font-bold text-white">Need more credits?</p>
                <p className="text-xs text-zinc-400 mt-1">Paid plans add credits, advanced tools and better output.</p>
              </div>
              <span className="text-xs font-semibold mt-4 inline-flex items-center gap-1" style={{ color: "#a5b4fc" }}>See plans <ArrowRight className="w-3 h-3" /></span>
            </div>
          </Link>
        ) : (
          <div className="rounded-2xl p-5 flex flex-col justify-between" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div><Target className="w-4 h-4 mb-3" style={{ color: GOLD }} /><p className="text-sm font-bold text-white">Income goal</p>
              <p className="text-xs text-zinc-400 mt-1">{props.goal ? "Tracking toward your target." : "Not set yet."}</p></div>
            <Link href="/#goal"><span className="cursor-pointer text-xs font-semibold mt-4 inline-flex items-center gap-1" style={{ color: GOLD }}>{props.goal ? "Review" : "Set goal"} <ArrowRight className="w-3 h-3" /></span></Link>
          </div>
        )}
      </div>
    </div>
  );
}
