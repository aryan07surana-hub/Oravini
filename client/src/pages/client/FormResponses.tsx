import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import ClientLayout from "@/components/layout/ClientLayout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Eye, Users, Mail, ArrowLeft, Download, Copy, CheckCircle2, ExternalLink,
  TrendingUp, Clock, ChevronDown, ChevronUp, Globe, Smartphone, Monitor,
  BarChart2, Zap,
} from "lucide-react";
import { useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

const GOLD = "#d4b461";

function flagEmoji(code: string) {
  if (!code || code.length !== 2) return "🌍";
  return code.toUpperCase().split("").map(c => String.fromCodePoint(c.charCodeAt(0) + 0x1f1a5)).join("");
}

function StatCard({ label, value, icon: Icon, color, sub }: any) {
  return (
    <div className="rounded-2xl p-5 flex flex-col gap-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-3xl font-black text-white leading-none">{value}</p>
      {sub && <p className="text-xs text-zinc-600">{sub}</p>}
    </div>
  );
}

function ResponseCard({ sub, questions, index }: { sub: any; questions: any[]; index: number }) {
  const [expanded, setExpanded] = useState(true);
  const answeredCount = sub.answers.filter((a: any) => a.value).length;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div
        className="flex items-center gap-4 p-5 cursor-pointer"
        onClick={() => setExpanded(e => !e)}
        style={{ borderBottom: expanded ? "1px solid rgba(255,255,255,0.06)" : "none" }}
      >
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black text-black flex-shrink-0" style={{ background: GOLD }}>
          {(sub.respondentName?.[0] || String(index + 1)).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white">{sub.respondentName || `Anonymous Respondent #${index + 1}`}</p>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            {sub.respondentEmail && (
              <span className="text-xs text-zinc-500 flex items-center gap-1">
                <Mail className="w-3 h-3" />{sub.respondentEmail}
              </span>
            )}
            <span className="text-xs text-zinc-600 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(sub.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg" style={{ background: "rgba(52,211,153,0.1)", color: "#34d399" }}>
            {answeredCount} answer{answeredCount !== 1 ? "s" : ""}
          </span>
          {expanded ? <ChevronUp className="w-4 h-4 text-zinc-600" /> : <ChevronDown className="w-4 h-4 text-zinc-600" />}
        </div>
      </div>
      {expanded && (
        <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
          {sub.answers.map((ans: any, ai: number) => {
            const q = questions.find((q: any) => q.id === ans.questionId);
            if (!q) return null;
            return (
              <div key={ai} className="px-5 py-4">
                <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">{q.question}</p>
                <p className="text-sm text-white font-medium leading-relaxed">{ans.value || <span className="text-zinc-600 italic">No answer</span>}</p>
              </div>
            );
          })}
          {sub.answers.length === 0 && <div className="px-5 py-6 text-center text-zinc-600 text-sm">No answers recorded</div>}
        </div>
      )}
    </div>
  );
}

function BreakdownCard({ item, submissions, questions }: { item: any; submissions: any[]; questions: any[] }) {
  const { question, type, data, answers: textAnswers, total: tot } = item;
  const mostCommon = type === "mcq" && tot > 0
    ? Object.entries(data as Record<string, number>).sort(([, a], [, b]) => b - a)[0]
    : null;

  const pairedAnswers = type !== "mcq" ? (textAnswers || []).map((val: string, i: number) => {
    const sub = submissions[i];
    return { val, name: sub?.respondentName || `Respondent ${i + 1}` };
  }) : [];

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="px-6 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <p className="text-base font-bold text-white mb-1">{question.question}</p>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md" style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.4)" }}>
            {type === "mcq" ? "Multiple Choice" : type === "rating" ? "Star Rating" : type === "yes_no" ? "Yes / No" : "Open Answer"}
          </span>
          <span className="text-xs text-zinc-600">{tot} answer{tot !== 1 ? "s" : ""}</span>
        </div>
      </div>
      <div className="px-6 py-5">
        {type === "mcq" ? (
          <div className="space-y-5">
            {mostCommon && tot > 0 && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: `${GOLD}10`, border: `1px solid ${GOLD}25` }}>
                <TrendingUp className="w-4 h-4 flex-shrink-0" style={{ color: GOLD }} />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: GOLD }}>Most Common Answer</p>
                  <p className="text-sm font-bold text-white">
                    {mostCommon[0]} <span className="font-normal text-zinc-400 ml-1">— {mostCommon[1]} vote{mostCommon[1] !== 1 ? "s" : ""} ({Math.round((mostCommon[1] / tot) * 100)}%)</span>
                  </p>
                </div>
              </div>
            )}
            <div className="space-y-4">
              {Object.entries(data as Record<string, number>)
                .sort(([, a], [, b]) => b - a)
                .map(([opt, count]) => {
                  const pct = tot > 0 ? Math.round((count / tot) * 100) : 0;
                  const isTop = mostCommon?.[0] === opt;
                  return (
                    <div key={opt}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {isTop && <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: `${GOLD}18`, color: GOLD }}>Top</span>}
                          <span className="text-sm font-medium text-zinc-200">{opt}</span>
                        </div>
                        <span className="text-sm font-bold text-white">{count} <span className="text-xs font-normal text-zinc-500">({pct}%)</span></span>
                      </div>
                      <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: isTop ? GOLD : "rgba(255,255,255,0.2)" }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {pairedAnswers.length === 0 ? (
              <p className="text-sm text-zinc-600 text-center py-4">No answers yet</p>
            ) : pairedAnswers.map(({ val, name }: any, i: number) => (
              <div key={i} className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-black flex-shrink-0" style={{ background: GOLD }}>
                    {name[0].toUpperCase()}
                  </div>
                  <span className="text-[10px] font-semibold text-zinc-500">{name}</span>
                </div>
                <p className="text-sm text-zinc-200 leading-relaxed">{val || <span className="italic text-zinc-600">No answer</span>}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-4 py-3 rounded-xl shadow-xl" style={{ background: "#111113", border: "1px solid rgba(255,255,255,0.12)" }}>
      <p className="text-xs font-semibold text-zinc-400 mb-2">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="text-sm font-bold" style={{ color: p.color }}>
          {p.value} {p.name}
        </p>
      ))}
    </div>
  );
}

function AnalyticsTab({ analytics }: { analytics: any }) {
  if (!analytics) return <div className="py-16 text-center text-zinc-600 text-sm">Loading analytics…</div>;

  const { countries = [], devices = {}, dailyStats = [], conversionRate = 0, views = 0, submissions = 0 } = analytics;
  const totalDevices = (devices.mobile || 0) + (devices.tablet || 0) + (devices.desktop || 0);
  const hasData = views > 0;

  const fmtDate = (d: string) => {
    const dt = new Date(d + "T12:00:00Z");
    return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const chartData = dailyStats.map((d: any) => ({ ...d, date: fmtDate(d.date) }));
  const hasChartData = chartData.some((d: any) => d.views > 0 || d.submissions > 0);

  return (
    <div className="space-y-8">
      {/* Chart */}
      <div className="rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm font-bold text-white">Views & Responses</p>
            <p className="text-xs text-zinc-600 mt-0.5">Last 14 days</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ background: "#818cf8" }} /><span className="text-xs text-zinc-500">Views</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ background: GOLD }} /><span className="text-xs text-zinc-500">Responses</span></div>
          </div>
        </div>
        {!hasChartData ? (
          <div className="flex items-center justify-center h-32 text-zinc-700 text-sm">No data yet — share your form to start collecting responses</div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={chartData} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorSubs" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={GOLD} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={GOLD} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: "#52525b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#52525b", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="views" name="Views" stroke="#818cf8" strokeWidth={2} fill="url(#colorViews)" dot={false} />
              <Area type="monotone" dataKey="submissions" name="Responses" stroke={GOLD} strokeWidth={2} fill="url(#colorSubs)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Countries */}
        <div className="rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(129,140,248,0.12)", border: "1px solid rgba(129,140,248,0.2)" }}>
              <Globe className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <p className="text-sm font-bold text-white">Top Countries</p>
          </div>
          {countries.length === 0 ? (
            <p className="text-xs text-zinc-600 py-4 text-center">No country data yet. Data appears after first views.</p>
          ) : (
            <div className="space-y-3">
              {countries.map((c: any) => {
                const pct = views > 0 ? Math.round((c.count / views) * 100) : 0;
                return (
                  <div key={c.code}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg leading-none">{flagEmoji(c.code)}</span>
                        <span className="text-sm text-zinc-200">{c.name}</span>
                        <span className="text-[10px] font-mono text-zinc-600">{c.code}</span>
                      </div>
                      <span className="text-xs font-semibold text-zinc-400">{c.count} <span className="text-zinc-600">({pct}%)</span></span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: "rgba(129,140,248,0.6)" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Devices + Conversion */}
        <div className="space-y-4">
          {/* Conversion rate */}
          <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${GOLD}12`, border: `1px solid ${GOLD}25` }}>
                <Zap className="w-3.5 h-3.5" style={{ color: GOLD }} />
              </div>
              <p className="text-sm font-bold text-white">Conversion Funnel</p>
            </div>
            <div className="flex items-end gap-4">
              <div>
                <p className="text-3xl font-black" style={{ color: GOLD }}>{conversionRate}%</p>
                <p className="text-xs text-zinc-600 mt-1">view → response rate</p>
              </div>
              <div className="flex-1 flex items-end gap-3 pb-1">
                <div className="flex flex-col items-center gap-1 flex-1">
                  <div className="w-full rounded-t-md" style={{ height: 40, background: "rgba(129,140,248,0.4)" }} />
                  <p className="text-xs font-bold text-indigo-400">{views}</p>
                  <p className="text-[10px] text-zinc-600">Views</p>
                </div>
                <div className="flex flex-col items-center gap-1 flex-1">
                  <div
                    className="w-full rounded-t-md transition-all"
                    style={{
                      height: views > 0 ? Math.max(4, Math.round((submissions / views) * 40)) : 4,
                      background: `${GOLD}70`,
                    }}
                  />
                  <p className="text-xs font-bold" style={{ color: GOLD }}>{submissions}</p>
                  <p className="text-[10px] text-zinc-600">Responses</p>
                </div>
              </div>
            </div>
          </div>

          {/* Device breakdown */}
          <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.2)" }}>
                <BarChart2 className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <p className="text-sm font-bold text-white">Devices</p>
            </div>
            {totalDevices === 0 ? (
              <p className="text-xs text-zinc-600 py-2 text-center">No device data yet</p>
            ) : (
              <div className="space-y-3">
                {[
                  { key: "mobile", label: "Mobile", icon: Smartphone, color: "#34d399" },
                  { key: "desktop", label: "Desktop", icon: Monitor, color: "#818cf8" },
                  { key: "tablet", label: "Tablet", icon: Monitor, color: GOLD },
                ].map(({ key, label, icon: Icon, color }) => {
                  const count = (devices as any)[key] || 0;
                  const pct = totalDevices > 0 ? Math.round((count / totalDevices) * 100) : 0;
                  return (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <Icon className="w-3.5 h-3.5" style={{ color }} />
                          <span className="text-sm text-zinc-300">{label}</span>
                        </div>
                        <span className="text-xs font-semibold text-zinc-400">{count} <span className="text-zinc-600">({pct}%)</span></span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FormResponses() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"responses" | "analytics" | "crm" | "breakdown">("responses");
  const [copied, setCopied] = useState(false);

  const { data: formData } = useQuery<any>({
    queryKey: ["/api/forms", id],
    queryFn: () => apiRequest("GET", `/api/forms/${id}`),
  });
  const { data: responsesData, isLoading } = useQuery<any>({
    queryKey: ["/api/forms", id, "responses"] as any,
    queryFn: () => apiRequest("GET", `/api/forms/${id}/responses`),
  });

  const { analytics, submissions = [], questions = [] } = responsesData || {};
  const publicUrl = formData?.slug ? `${window.location.origin}/f/${formData.slug}` : "";

  const copyLink = () => {
    if (!publicUrl || formData?.status !== "published") {
      toast({ title: "Publish the form first to get your shareable link", variant: "destructive" });
      return;
    }
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
    toast({ title: "Link copied to clipboard!" });
  };

  const exportCSV = () => {
    if (!submissions.length) { toast({ title: "No responses to export yet" }); return; }
    const headers = ["Name", "Email", "Submitted At", ...questions.map((q: any) => q.question)];
    const rows = submissions.map((s: any) => [
      s.respondentName || "",
      s.respondentEmail || "",
      new Date(s.submittedAt).toLocaleString(),
      ...questions.map((q: any) => {
        const ans = s.answers.find((a: any) => a.questionId === q.id);
        return ans?.value || "";
      }),
    ]);
    const csv = [headers, ...rows].map(r => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${formData?.title || "responses"}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const publishMutation = useMutation({
    mutationFn: (status: string) => apiRequest("PATCH", `/api/forms/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forms", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/forms"] });
      toast({ title: formData?.status === "published" ? "Form unpublished" : "Form is now live! Share your link." });
    },
  });

  const breakdown = questions.map((q: any) => {
    const allAnswers = submissions.flatMap((s: any) =>
      s.answers.filter((a: any) => a.questionId === q.id).map((a: any) => a.value)
    );
    if (q.type === "mcq" && q.options) {
      const counts: Record<string, number> = {};
      (q.options as string[]).forEach((o: string) => { counts[o] = 0; });
      allAnswers.forEach((v: string) => { if (v in counts) counts[v]++; });
      return { question: q, type: "mcq", data: counts, total: allAnswers.length };
    }
    return { question: q, type: "text", answers: allAnswers, total: allAnswers.length };
  });

  const isPublished = formData?.status === "published";

  const TABS = [
    { id: "responses" as const, label: "Responses" },
    { id: "analytics" as const, label: "Analytics" },
    { id: "crm" as const, label: "Contacts" },
    { id: "breakdown" as const, label: "Breakdown" },
  ];

  return (
    <ClientLayout>
      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Back + Title */}
        <div className="flex items-start gap-4 mb-8">
          <button
            onClick={() => navigate("/tools/forms")}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-500 hover:text-white transition-colors flex-shrink-0 mt-0.5"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-black text-white leading-tight">{formData?.title || "Responses"}</h1>
            <p className="text-sm text-zinc-500 mt-1">Responses, analytics, and contacts</p>
          </div>
        </div>

        {/* Publish + share */}
        <div className="rounded-2xl p-5 mb-8" style={{ background: isPublished ? "rgba(52,211,153,0.06)" : "rgba(255,255,255,0.02)", border: `1px solid ${isPublished ? "rgba(52,211,153,0.2)" : "rgba(255,255,255,0.07)"}` }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-bold text-white">{isPublished ? "Your form is live" : "Form is not published yet"}</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                {isPublished ? "Anyone with the link can fill in this form" : "Publish it to get a shareable link for your audience"}
              </p>
            </div>
            <button
              data-testid="btn-publish"
              onClick={() => publishMutation.mutate(isPublished ? "draft" : "published")}
              disabled={publishMutation.isPending}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105 disabled:opacity-50 flex-shrink-0"
              style={{
                background: isPublished ? "rgba(239,68,68,0.12)" : `${GOLD}18`,
                border: `1px solid ${isPublished ? "rgba(239,68,68,0.3)" : GOLD + "40"}`,
                color: isPublished ? "#f87171" : GOLD,
              }}
            >
              <CheckCircle2 className="w-4 h-4" />
              {isPublished ? "Unpublish" : "Publish Form"}
            </button>
          </div>
          {isPublished && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <ExternalLink className="w-4 h-4 text-zinc-500 flex-shrink-0" />
              <p className="flex-1 text-sm text-zinc-300 truncate font-mono">{publicUrl}</p>
              <button
                data-testid="btn-copy-link"
                onClick={copyLink}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold flex-shrink-0 transition-all hover:scale-105"
                style={{ background: copied ? "rgba(52,211,153,0.15)" : `${GOLD}18`, border: `1px solid ${copied ? "rgba(52,211,153,0.3)" : GOLD + "40"}`, color: copied ? "#34d399" : GOLD }}
              >
                {copied ? <><CheckCircle2 className="w-3.5 h-3.5" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy Link</>}
              </button>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <StatCard label="Views" value={analytics?.views ?? 0} icon={Eye} color="#818cf8" sub="Form opens" />
          <StatCard label="Responses" value={analytics?.submissions ?? 0} icon={Users} color={GOLD} sub="Completed" />
          <StatCard
            label="Conversion"
            value={`${analytics?.conversionRate ?? 0}%`}
            icon={TrendingUp}
            color="#34d399"
            sub="Views → responses"
          />
          <StatCard label="Emails" value={analytics?.emailCaptures ?? 0} icon={Mail} color="#f472b6" sub="Collected" />
        </div>

        {/* Tab bar + export */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <div className="flex gap-1 p-1 rounded-xl flex-1 min-w-0" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            {TABS.map(({ id: tabId, label }) => (
              <button
                key={tabId}
                data-testid={`tab-${tabId}`}
                onClick={() => setActiveTab(tabId)}
                className="flex-1 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap"
                style={{
                  background: activeTab === tabId ? `${GOLD}18` : "transparent",
                  color: activeTab === tabId ? GOLD : "rgba(255,255,255,0.35)",
                  border: activeTab === tabId ? `1px solid ${GOLD}30` : "1px solid transparent",
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            data-testid="btn-export"
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all hover:scale-105 flex-shrink-0"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map(i => <div key={i} className="h-32 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.03)" }} />)}
          </div>
        ) : (
          <>
            {/* All Responses */}
            {activeTab === "responses" && (
              <div className="space-y-4">
                {submissions.length === 0 ? (
                  <div className="text-center py-20 rounded-2xl" style={{ border: "1px dashed rgba(255,255,255,0.08)" }}>
                    <Users className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                    <p className="text-white font-bold mb-2">No responses yet</p>
                    <p className="text-zinc-500 text-sm">Share your form link and responses will appear here.</p>
                  </div>
                ) : submissions.map((sub: any, i: number) => (
                  <ResponseCard key={sub.id} sub={sub} questions={questions} index={i} />
                ))}
              </div>
            )}

            {/* Analytics tab */}
            {activeTab === "analytics" && <AnalyticsTab analytics={analytics} />}

            {/* Contacts / CRM */}
            {activeTab === "crm" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <p className="text-sm font-bold text-white">
                    {submissions.filter((s: any) => s.respondentEmail || s.respondentName).length} contact{submissions.filter((s: any) => s.respondentEmail || s.respondentName).length !== 1 ? "s" : ""} collected
                  </p>
                  <p className="text-xs text-zinc-600">Add a "Name" or "Email" question to collect contacts</p>
                </div>
                {submissions.filter((s: any) => s.respondentEmail || s.respondentName).length === 0 ? (
                  <div className="text-center py-16 rounded-2xl" style={{ border: "1px dashed rgba(255,255,255,0.08)" }}>
                    <Mail className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                    <p className="text-zinc-500 text-sm">No contacts yet. Make sure your form has a Name or Email question.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {submissions.filter((s: any) => s.respondentEmail || s.respondentName).map((sub: any, i: number) => (
                      <div key={sub.id} data-testid={`crm-row-${i}`} className="flex items-center gap-4 px-5 py-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black text-black flex-shrink-0" style={{ background: GOLD }}>
                          {(sub.respondentName?.[0] || "?").toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-white">{sub.respondentName || "—"}</p>
                          <p className="text-xs text-zinc-500 mt-0.5">{sub.respondentEmail || "No email"}</p>
                        </div>
                        <p className="text-xs text-zinc-600 flex-shrink-0">
                          {new Date(sub.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Breakdown */}
            {activeTab === "breakdown" && (
              <div className="space-y-6">
                {breakdown.length === 0 ? (
                  <p className="text-center text-zinc-600 text-sm py-10">No questions in this form yet.</p>
                ) : breakdown.map((item: any) => (
                  <BreakdownCard key={item.question.id} item={item} submissions={submissions} questions={questions} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </ClientLayout>
  );
}
