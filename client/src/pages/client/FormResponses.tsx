import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import ClientLayout from "@/components/layout/ClientLayout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { BarChart2, Eye, Users, Mail, ArrowLeft, Download, Copy, CheckCircle2 } from "lucide-react";
import { useState } from "react";

const GOLD = "#d4b461";

function StatCard({ label, value, icon: Icon, color }: any) {
  return (
    <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4" style={{ color }} />
        <span className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">{label}</span>
      </div>
      <p className="text-3xl font-black text-white">{value}</p>
    </div>
  );
}

export default function FormResponses() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"responses" | "crm" | "breakdown">("responses");

  const { data: formData } = useQuery<any>({ queryKey: ["/api/forms", id] });
  const { data: responsesData, isLoading } = useQuery<any>({ queryKey: ["/api/forms", id, "responses"] as any, queryFn: () => apiRequest("GET", `/api/forms/${id}/responses`) });

  const { analytics, submissions = [], questions = [] } = responsesData || {};

  const exportCSV = () => {
    if (!submissions.length) { toast({ title: "No responses to export" }); return; }
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
    const a = document.createElement("a"); a.href = url; a.download = `${formData?.title || "responses"}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const copyLink = () => {
    if (formData?.status !== "published") { toast({ title: "Publish the form first to get a shareable link", variant: "destructive" }); return; }
    const url = `${window.location.origin}/f/${formData.slug}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copied!", description: url });
  };

  const publishMutation = useMutation({
    mutationFn: (status: string) => apiRequest("PATCH", `/api/forms/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forms", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/forms"] });
      toast({ title: formData?.status === "published" ? "Form unpublished" : "Form published! Share the link now." });
    },
  });

  // Answer breakdown per question
  const breakdown = questions.map((q: any) => {
    const allAnswers = submissions.flatMap((s: any) => s.answers.filter((a: any) => a.questionId === q.id).map((a: any) => a.value));
    if (q.type === "mcq" && q.options) {
      const counts: Record<string, number> = {};
      (q.options as string[]).forEach((o: string) => { counts[o] = 0; });
      allAnswers.forEach((v: string) => { if (v in counts) counts[v]++; });
      return { question: q, type: "mcq", data: counts, total: allAnswers.length };
    }
    return { question: q, type: "text", answers: allAnswers, total: allAnswers.length };
  });

  return (
    <ClientLayout>
      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate("/tools/forms")} className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white transition-colors" style={{ background: "rgba(255,255,255,0.04)" }}>
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-black text-white">{formData?.title || "Form Responses"}</h1>
            <p className="text-xs text-zinc-500">Analytics, responses, and CRM contacts</p>
          </div>
          <div className="flex items-center gap-2">
            <button data-testid="btn-copy-link" onClick={copyLink} className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white transition-all" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <Copy className="w-3.5 h-3.5" /> Copy Link
            </button>
            <button data-testid="btn-publish" onClick={() => publishMutation.mutate(formData?.status === "published" ? "draft" : "published")} className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:scale-105"
              style={{ background: formData?.status === "published" ? "rgba(239,68,68,0.12)" : `${GOLD}18`, border: `1px solid ${formData?.status === "published" ? "rgba(239,68,68,0.3)" : GOLD + "40"}`, color: formData?.status === "published" ? "#f87171" : GOLD }}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              {formData?.status === "published" ? "Unpublish" : "Publish & Share"}
            </button>
            <button data-testid="btn-export" onClick={exportCSV} className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white transition-all" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <StatCard label="Total Views" value={analytics?.views ?? 0} icon={Eye} color="#818cf8" />
          <StatCard label="Responses" value={analytics?.submissions ?? 0} icon={Users} color={GOLD} />
          <StatCard label="Emails Captured" value={analytics?.emailCaptures ?? 0} icon={Mail} color="#34d399" />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          {([["responses", "All Responses"], ["crm", "CRM / Contacts"], ["breakdown", "Answer Breakdown"]] as const).map(([tab, label]) => (
            <button key={tab} data-testid={`tab-${tab}`} onClick={() => setActiveTab(tab)}
              className="flex-1 py-2 rounded-lg text-xs font-bold transition-all"
              style={{ background: activeTab === tab ? `${GOLD}18` : "transparent", color: activeTab === tab ? GOLD : "rgba(255,255,255,0.35)", border: activeTab === tab ? `1px solid ${GOLD}30` : "1px solid transparent" }}>
              {label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.03)" }} />)}</div>
        ) : (
          <>
            {/* All Responses */}
            {activeTab === "responses" && (
              <div className="space-y-3">
                {submissions.length === 0 ? (
                  <div className="text-center py-16">
                    <BarChart2 className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                    <p className="text-zinc-500 text-sm">No responses yet. Share your form link to start collecting data.</p>
                  </div>
                ) : submissions.map((sub: any, i: number) => (
                  <div key={sub.id} data-testid={`response-${i}`} className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-black" style={{ background: GOLD }}>
                          {(sub.respondentName?.[0] || String(i + 1)).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{sub.respondentName || `Respondent ${i + 1}`}</p>
                          {sub.respondentEmail && <p className="text-xs text-zinc-500">{sub.respondentEmail}</p>}
                        </div>
                      </div>
                      <p className="text-xs text-zinc-600">{new Date(sub.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                      {sub.answers.map((ans: any) => {
                        const q = questions.find((q: any) => q.id === ans.questionId);
                        return q ? (
                          <div key={ans.id} className="px-3 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.03)" }}>
                            <p className="text-[10px] text-zinc-600 mb-0.5 truncate">{q.question}</p>
                            <p className="text-xs text-zinc-300 font-medium">{ans.value || "—"}</p>
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* CRM */}
            {activeTab === "crm" && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-semibold text-white">{submissions.filter((s: any) => s.respondentEmail).length} contacts collected</p>
                </div>
                <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Name</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Email</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {submissions.filter((s: any) => s.respondentEmail || s.respondentName).length === 0 ? (
                        <tr><td colSpan={3} className="text-center py-10 text-zinc-600 text-xs">No contacts yet — add a Name or Email question to your form to collect contacts.</td></tr>
                      ) : submissions.filter((s: any) => s.respondentEmail || s.respondentName).map((sub: any, i: number) => (
                        <tr key={sub.id} data-testid={`crm-row-${i}`} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                          <td className="px-4 py-3 text-xs text-white font-medium">{sub.respondentName || "—"}</td>
                          <td className="px-4 py-3 text-xs text-zinc-400">{sub.respondentEmail || "—"}</td>
                          <td className="px-4 py-3 text-xs text-zinc-600">{new Date(sub.submittedAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Breakdown */}
            {activeTab === "breakdown" && (
              <div className="space-y-4">
                {breakdown.length === 0 ? (
                  <p className="text-center text-zinc-600 text-sm py-10">No questions in this form yet.</p>
                ) : breakdown.map(({ question, type, data, answers: textAnswers, total: tot }: any) => (
                  <div key={question.id} className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <p className="text-sm font-bold text-white mb-1">{question.question}</p>
                    <p className="text-xs text-zinc-600 mb-4">{tot} answer{tot !== 1 ? "s" : ""}</p>
                    {type === "mcq" ? (
                      <div className="space-y-2">
                        {Object.entries(data as Record<string, number>).map(([opt, count]) => {
                          const pct = tot > 0 ? Math.round((count / tot) * 100) : 0;
                          return (
                            <div key={opt}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-zinc-300">{opt}</span>
                                <span className="text-xs font-bold" style={{ color: GOLD }}>{count} ({pct}%)</span>
                              </div>
                              <div className="h-2 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: GOLD }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {(textAnswers || []).slice(0, 20).map((a: string, i: number) => (
                          <div key={i} className="px-3 py-2 rounded-lg text-xs text-zinc-300" style={{ background: "rgba(255,255,255,0.03)" }}>{a || "—"}</div>
                        ))}
                        {(textAnswers || []).length === 0 && <p className="text-xs text-zinc-600">No answers yet</p>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </ClientLayout>
  );
}
