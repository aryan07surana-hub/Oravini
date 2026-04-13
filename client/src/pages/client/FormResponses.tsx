import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import ClientLayout from "@/components/layout/ClientLayout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Eye, Users, Mail, ArrowLeft, Download, Copy, CheckCircle2, ExternalLink, TrendingUp, User, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

const GOLD = "#d4b461";

function StatCard({ label, value, icon: Icon, color, sub }: any) {
  return (
    <div className="rounded-2xl p-6 flex flex-col gap-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-4xl font-black text-white leading-none">{value}</p>
      {sub && <p className="text-xs text-zinc-600">{sub}</p>}
    </div>
  );
}

function ResponseCard({ sub, questions, index }: { sub: any; questions: any[]; index: number }) {
  const [expanded, setExpanded] = useState(true);
  const answeredCount = sub.answers.filter((a: any) => a.value).length;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
      {/* Response header */}
      <div className="flex items-center gap-4 p-5 cursor-pointer" onClick={() => setExpanded(e => !e)}
        style={{ borderBottom: expanded ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black text-black flex-shrink-0" style={{ background: GOLD }}>
          {(sub.respondentName?.[0] || String(index + 1)).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white">{sub.respondentName || `Anonymous Respondent #${index + 1}`}</p>
          <div className="flex items-center gap-3 mt-0.5">
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

      {/* Answers */}
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
          {sub.answers.length === 0 && (
            <div className="px-5 py-6 text-center text-zinc-600 text-sm">No answers recorded</div>
          )}
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

  // For text answers, pair with respondent name
  const pairedAnswers = type !== "mcq" ? (textAnswers || []).map((val: string, i: number) => {
    const sub = submissions[i];
    return { val, name: sub?.respondentName || `Respondent ${i + 1}` };
  }) : [];

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
      {/* Question header */}
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
            {/* Most common callout */}
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

            {/* Bar chart */}
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
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, background: isTop ? GOLD : "rgba(255,255,255,0.2)" }} />
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Individual responses for MCQ */}
            {tot > 0 && (
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 16 }}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 mb-3">Who answered what</p>
                <div className="space-y-2">
                  {submissions.map((sub: any, i: number) => {
                    const ans = sub.answers.find((a: any) => a.questionId === question.id);
                    if (!ans?.value) return null;
                    return (
                      <div key={i} className="flex items-center justify-between px-3 py-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                        <div className="flex items-center gap-2.5">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-black flex-shrink-0" style={{ background: GOLD }}>
                            {(sub.respondentName?.[0] || String(i + 1)).toUpperCase()}
                          </div>
                          <span className="text-xs text-zinc-400">{sub.respondentName || `Respondent ${i + 1}`}</span>
                        </div>
                        <span className="text-xs font-semibold text-white">{ans.value}</span>
                      </div>
                    );
                  }).filter(Boolean)}
                </div>
              </div>
            )}
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

export default function FormResponses() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"responses" | "crm" | "breakdown">("responses");
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
      toast({
        title: formData?.status === "published" ? "Form unpublished" : "Form is now live! Share your link.",
      });
    },
  });

  // Answer breakdown per question
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
            <p className="text-sm text-zinc-500 mt-1">View responses, analytics, and captured contacts</p>
          </div>
        </div>

        {/* Publish + Share section */}
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

          {/* Shareable link */}
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
        <div className="grid grid-cols-3 gap-4 mb-10">
          <StatCard label="Total Views" value={analytics?.views ?? 0} icon={Eye} color="#818cf8" sub="People who opened the form" />
          <StatCard label="Responses" value={analytics?.submissions ?? 0} icon={Users} color={GOLD} sub="Completed submissions" />
          <StatCard label="Emails Captured" value={analytics?.emailCaptures ?? 0} icon={Mail} color="#34d399" sub="Contacts collected" />
        </div>

        {/* Export button */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            {([["responses", "All Responses"], ["crm", "Contacts / CRM"], ["breakdown", "Answer Breakdown"]] as const).map(([tab, label]) => (
              <button key={tab} data-testid={`tab-${tab}`} onClick={() => setActiveTab(tab)}
                className="px-4 py-2 rounded-lg text-xs font-bold transition-all"
                style={{
                  background: activeTab === tab ? `${GOLD}18` : "transparent",
                  color: activeTab === tab ? GOLD : "rgba(255,255,255,0.35)",
                  border: activeTab === tab ? `1px solid ${GOLD}30` : "1px solid transparent",
                }}>
                {label}
              </button>
            ))}
          </div>
          <button
            data-testid="btn-export"
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all hover:scale-105"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map(i => (
              <div key={i} className="h-32 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.03)" }} />
            ))}
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

            {/* CRM */}
            {activeTab === "crm" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <p className="text-sm font-bold text-white">
                    {submissions.filter((s: any) => s.respondentEmail || s.respondentName).length} contact{submissions.filter((s: any) => s.respondentEmail || s.respondentName).length !== 1 ? "s" : ""} collected
                  </p>
                  <p className="text-xs text-zinc-600">Add a "Name" or "Email" question to your form to collect contacts</p>
                </div>

                {submissions.filter((s: any) => s.respondentEmail || s.respondentName).length === 0 ? (
                  <div className="text-center py-16 rounded-2xl" style={{ border: "1px dashed rgba(255,255,255,0.08)" }}>
                    <Mail className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                    <p className="text-zinc-500 text-sm">No contacts yet. Make sure your form has a Name or Email question.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {submissions.filter((s: any) => s.respondentEmail || s.respondentName).map((sub: any, i: number) => (
                      <div key={sub.id} data-testid={`crm-row-${i}`} className="flex items-center gap-4 px-5 py-4 rounded-2xl"
                        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
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
