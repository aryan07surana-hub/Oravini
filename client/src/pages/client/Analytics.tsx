import { useQuery } from "@tanstack/react-query";
import ClientLayout from "@/components/layout/ClientLayout";
import {
  Smartphone, Mail, MonitorPlay, Radio, Workflow, CalendarPlus,
  TrendingUp, Users, Send, Eye, BarChart2, Activity, Loader2,
  AlertTriangle, CheckCircle2, Clock,
} from "lucide-react";
import { Link } from "wouter";

const GOLD = "#d4b461";

function StatCard({
  label, value, sub, icon: Icon, color = GOLD, href,
}: {
  label: string; value: string | number; sub?: string;
  icon: any; color?: string; href?: string;
}) {
  const inner = (
    <div
      className="rounded-2xl border border-zinc-800 p-5 flex items-start gap-4 hover:border-zinc-700 transition-colors cursor-pointer"
      style={{ background: "#0a0a0c" }}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}15` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-zinc-500 mb-1">{label}</p>
        <p className="text-2xl font-black text-white leading-none">{value}</p>
        {sub && <p className="text-xs text-zinc-600 mt-1">{sub}</p>}
      </div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : <div>{inner}</div>;
}

function SectionHeader({ icon: Icon, label, href, color = GOLD }: { icon: any; label: string; href: string; color?: string }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4" style={{ color }} />
        <h2 className="text-sm font-black text-white">{label}</h2>
      </div>
      <Link href={href}>
        <span className="text-xs font-medium transition-colors" style={{ color: GOLD }}>Open →</span>
      </Link>
    </div>
  );
}

function RatePill({ value, good = 90, ok = 75 }: { value: number | null; good?: number; ok?: number }) {
  if (value === null) return <span className="text-xs text-zinc-600">—</span>;
  const color = value >= good ? "#22c55e" : value >= ok ? GOLD : "#ef4444";
  const label = value >= good ? "healthy" : value >= ok ? "ok" : "low";
  return (
    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: `${color}15`, color }}>
      {value}% — {label}
    </span>
  );
}

export default function Analytics() {
  const { data, isLoading, error } = useQuery<any>({
    queryKey: ["/api/analytics/overview"],
    staleTime: 60000,
    queryFn: () => fetch("/api/analytics/overview", { credentials: "include" }).then(r => r.json()),
  });

  return (
    <ClientLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-black text-white">Platform Analytics</h1>
          <p className="text-sm text-zinc-500 mt-1">All your key metrics across every channel — one view.</p>
        </div>

        {isLoading && (
          <div className="flex items-center gap-3 text-zinc-500 py-12">
            <Loader2 className="w-5 h-5 animate-spin" />
            <p className="text-sm">Loading your analytics...</p>
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-900/50 bg-red-900/10 p-5 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-300">Could not load analytics. Try refreshing.</p>
          </div>
        )}

        {data && (
          <div className="space-y-8">
            {/* ── SMS ── */}
            <section>
              <SectionHeader icon={Smartphone} label="SMS Marketing" href="/sms-marketing" color="#3b82f6" />
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <StatCard label="SMS Contacts" value={data.sms.contacts.toLocaleString()} sub={`${data.sms.optedIn} opted-in`} icon={Users} color="#3b82f6" href="/sms-marketing" />
                <StatCard label="Campaigns Sent" value={data.sms.campaignsSent} sub={`${data.sms.delivered} msgs delivered`} icon={Send} color="#3b82f6" href="/sms-marketing" />
                <div className="rounded-2xl border border-zinc-800 p-5" style={{ background: "#0a0a0c" }}>
                  <p className="text-xs text-zinc-500 mb-2">Delivery Rate</p>
                  <RatePill value={data.sms.deliveryRate} good={90} ok={75} />
                  {data.sms.unreadThreads > 0 && (
                    <p className="text-xs text-amber-400 mt-2 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {data.sms.unreadThreads} unread thread{data.sms.unreadThreads !== 1 ? "s" : ""}
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* ── Email ── */}
            <section>
              <SectionHeader icon={Mail} label="Email Marketing" href="/email-marketing" color="#a855f7" />
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <StatCard label="Email Contacts" value={data.email.contacts.toLocaleString()} sub={`${data.email.subscribed} subscribed`} icon={Users} color="#a855f7" href="/email-marketing" />
                <StatCard label="Broadcasts Sent" value={data.email.sent} sub={`${data.email.activeSequences} active sequences`} icon={Send} color="#a855f7" href="/email-marketing" />
                <div className="rounded-2xl border border-zinc-800 p-5" style={{ background: "#0a0a0c" }}>
                  <p className="text-xs text-zinc-500 mb-2">Avg Open Rate</p>
                  {data.email.avgOpenRate !== null
                    ? <RatePill value={data.email.avgOpenRate} good={25} ok={15} />
                    : <p className="text-xs text-zinc-600">No campaigns sent yet</p>
                  }
                </div>
              </div>
            </section>

            {/* ── Video ── */}
            <section>
              <SectionHeader icon={MonitorPlay} label="Video Marketing" href="/video-marketing" color="#06b6d4" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard label="Hosted Videos" value={data.video.videos} icon={MonitorPlay} color="#06b6d4" href="/video-marketing" />
                <StatCard label="Total Views" value={data.video.totalViews.toLocaleString()} icon={Eye} color="#06b6d4" href="/video-marketing" />
                <StatCard label="Channels" value={data.video.channels} icon={Activity} color="#06b6d4" href="/video-marketing" />
                <StatCard label="Subscribers" value={data.video.totalSubs.toLocaleString()} icon={Users} color="#06b6d4" href="/video-marketing" />
              </div>
            </section>

            {/* ── Webinars ── */}
            <section>
              <SectionHeader icon={Radio} label="Webinars" href="/video-marketing" color="#f59e0b" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard label="Total Webinars" value={data.webinar.total} icon={Radio} color="#f59e0b" href="/video-marketing" />
                <StatCard label="Completed" value={data.webinar.completed} icon={CheckCircle2} color="#22c55e" href="/video-marketing" />
                {data.webinar.liveNow > 0 && (
                  <StatCard label="Live Now" value={data.webinar.liveNow} sub="🔴 Running" icon={Radio} color="#ef4444" href="/video-marketing" />
                )}
                <StatCard label="Total Views" value={data.webinar.totalViews.toLocaleString()} icon={Eye} color="#f59e0b" href="/video-marketing" />
              </div>
            </section>

            {/* ── DM + Scheduling row ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <section>
                <SectionHeader icon={Workflow} label="DM Automation" href="/dm-automation" color="#ec4899" />
                <div className="grid grid-cols-2 gap-3">
                  <StatCard label="Active Automations" value={data.dm.activeAutomations} icon={Workflow} color="#ec4899" href="/dm-automation" />
                  <StatCard label="DM Conversations" value={data.dm.conversations.toLocaleString()} icon={Users} color="#ec4899" href="/dm-hub" />
                </div>
              </section>

              <section>
                <SectionHeader icon={CalendarPlus} label="Scheduling" href="/scheduling" color="#84cc16" />
                <div className="grid grid-cols-2 gap-3">
                  <StatCard label="Posts Published" value={data.scheduling.published} icon={CheckCircle2} color="#22c55e" href="/scheduling" />
                  <StatCard label="Scheduled (Pending)" value={data.scheduling.pending} icon={Clock} color="#84cc16" href="/scheduling" />
                </div>
              </section>
            </div>

            {/* ── Insights banner ── */}
            <div className="rounded-2xl border p-5 space-y-3" style={{ borderColor: `${GOLD}25`, background: `${GOLD}06` }}>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" style={{ color: GOLD }} />
                <p className="text-sm font-black text-white">Quick Insights</p>
              </div>
              <ul className="space-y-1.5">
                {data.sms.deliveryRate !== null && data.sms.deliveryRate < 80 && (
                  <li className="flex items-start gap-2 text-xs text-amber-300">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-400" />
                    SMS delivery rate is {data.sms.deliveryRate}% — below the healthy 90% threshold. Check your contacts list for invalid numbers and ensure your Twilio number is verified.
                  </li>
                )}
                {data.sms.optedIn === 0 && data.sms.contacts > 0 && (
                  <li className="flex items-start gap-2 text-xs text-red-300">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-red-400" />
                    You have {data.sms.contacts} SMS contacts but none are opted-in — you can't send them messages. Set up a keyword (e.g. JOIN) so they can opt in.
                  </li>
                )}
                {data.email.subscribed > 0 && data.email.sent === 0 && (
                  <li className="flex items-start gap-2 text-xs text-zinc-300">
                    <BarChart2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: GOLD }} />
                    You have {data.email.subscribed} email subscribers but have never sent a broadcast. Time to send your first campaign.
                  </li>
                )}
                {data.video.videos > 0 && data.video.totalViews === 0 && (
                  <li className="flex items-start gap-2 text-xs text-zinc-300">
                    <Eye className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: GOLD }} />
                    You have {data.video.videos} video{data.video.videos !== 1 ? "s" : ""} hosted but 0 views. Share your video links or embed them on your site to drive views.
                  </li>
                )}
                {data.dm.activeAutomations === 0 && (
                  <li className="flex items-start gap-2 text-xs text-zinc-300">
                    <Workflow className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: GOLD }} />
                    No DM automations active. Set up a keyword trigger on Instagram to automate DM replies and capture leads 24/7.
                  </li>
                )}
                {data.sms.deliveryRate !== null && data.sms.deliveryRate >= 90 && data.email.avgOpenRate !== null && data.email.avgOpenRate >= 25 && (
                  <li className="flex items-start gap-2 text-xs text-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-emerald-400" />
                    Both SMS delivery ({data.sms.deliveryRate}%) and email open rate ({data.email.avgOpenRate}%) are healthy. Great work maintaining your list quality.
                  </li>
                )}
              </ul>
            </div>
          </div>
        )}
      </div>
    </ClientLayout>
  );
}
