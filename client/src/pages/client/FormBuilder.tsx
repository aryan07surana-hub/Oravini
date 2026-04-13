import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import ClientLayout from "@/components/layout/ClientLayout";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Plus, Trash2, GripVertical, ChevronUp, ChevronDown, Save, Zap, Eye, Copy, CheckCircle2, X, BarChart2 } from "lucide-react";

const GOLD = "#d4b461";

const Q_TYPES = [
  { value: "text", label: "Short Text" },
  { value: "long_text", label: "Long Text" },
  { value: "email", label: "Email" },
  { value: "name", label: "Name" },
  { value: "phone", label: "Phone" },
  { value: "number", label: "Number" },
  { value: "mcq", label: "Multiple Choice" },
  { value: "yes_no", label: "Yes / No" },
  { value: "rating", label: "Star Rating" },
];

type DraftQuestion = {
  id?: string;
  type: string;
  question: string;
  options: string[];
  required: boolean;
};

function newQ(): DraftQuestion {
  return { type: "text", question: "", options: ["Option A", "Option B", "Option C"], required: false };
}

function QuestionEditor({ q, idx, total, onChange, onDelete, onMove }: {
  q: DraftQuestion; idx: number; total: number;
  onChange: (q: DraftQuestion) => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const inputBase = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: 13, outline: "none", width: "100%" };

  return (
    <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="flex items-start gap-3 mb-4">
        <div className="flex flex-col gap-1 pt-1">
          <button onClick={() => onMove(-1)} disabled={idx === 0} className="text-zinc-600 hover:text-zinc-300 disabled:opacity-20"><ChevronUp className="w-4 h-4" /></button>
          <button onClick={() => onMove(1)} disabled={idx === total - 1} className="text-zinc-600 hover:text-zinc-300 disabled:opacity-20"><ChevronDown className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 space-y-3">
          {/* Question text */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-black flex-shrink-0" style={{ color: GOLD }}>{idx + 1}.</span>
            <input
              data-testid={`q-text-${idx}`}
              value={q.question}
              onChange={e => onChange({ ...q, question: e.target.value })}
              placeholder="Type your question..."
              style={{ ...inputBase, flex: 1 }}
            />
          </div>

          {/* Type + required */}
          <div className="flex items-center gap-3">
            <select
              data-testid={`q-type-${idx}`}
              value={q.type}
              onChange={e => onChange({ ...q, type: e.target.value })}
              style={{ ...inputBase, width: "auto", paddingRight: 28, cursor: "pointer" }}
            >
              {Q_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <label className="flex items-center gap-2 cursor-pointer" data-testid={`q-required-${idx}`}>
              <div
                onClick={() => onChange({ ...q, required: !q.required })}
                className="w-9 h-5 rounded-full transition-colors relative flex-shrink-0"
                style={{ background: q.required ? GOLD : "rgba(255,255,255,0.1)" }}
              >
                <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: q.required ? "calc(100% - 18px)" : 2 }} />
              </div>
              <span className="text-xs text-zinc-500">Required</span>
            </label>
          </div>

          {/* MCQ options */}
          {q.type === "mcq" && (
            <div className="space-y-2 pl-1">
              {q.options.map((opt, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <span className="text-xs text-zinc-600 w-4">{String.fromCharCode(65 + oi)}</span>
                  <input
                    data-testid={`q-opt-${idx}-${oi}`}
                    value={opt}
                    onChange={e => { const opts = [...q.options]; opts[oi] = e.target.value; onChange({ ...q, options: opts }); }}
                    placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                    style={{ ...inputBase, flex: 1 }}
                  />
                  {q.options.length > 2 && (
                    <button onClick={() => onChange({ ...q, options: q.options.filter((_, i) => i !== oi) })} className="text-zinc-600 hover:text-red-400">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
              {q.options.length < 8 && (
                <button onClick={() => onChange({ ...q, options: [...q.options, `Option ${String.fromCharCode(65 + q.options.length)}`] })}
                  className="text-xs flex items-center gap-1.5 mt-1" style={{ color: GOLD }}>
                  <Plus className="w-3 h-3" /> Add option
                </button>
              )}
            </div>
          )}
        </div>
        <button data-testid={`btn-delete-q-${idx}`} onClick={onDelete} className="text-zinc-600 hover:text-red-400 mt-1 flex-shrink-0">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function FormBuilder() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [tab, setTab] = useState<"build" | "ai">("build");
  const [questions, setQuestions] = useState<DraftQuestion[]>([]);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [submitMsg, setSubmitMsg] = useState("Thank you for your response!");

  const { data: form, isLoading: formLoading } = useQuery<any>({
    queryKey: ["/api/forms", id],
    queryFn: () => apiRequest("GET", `/api/forms/${id}`),
  });

  const { data: savedQuestions } = useQuery<any[]>({
    queryKey: ["/api/forms", id, "questions"],
    queryFn: () => apiRequest("GET", `/api/forms/${id}/questions`),
    enabled: !!id,
  });

  useEffect(() => {
    if (form) {
      setFormTitle(form.title || "");
      setFormDesc(form.description || "");
      setSubmitMsg((form.settings as any)?.submitMessage || "Thank you for your response!");
    }
  }, [form]);

  useEffect(() => {
    if (savedQuestions) {
      setQuestions(savedQuestions.map((q: any) => ({
        id: q.id,
        type: q.type,
        question: q.question,
        options: (q.options as string[]) || [],
        required: q.required,
      })));
    }
  }, [savedQuestions]);

  const updateForm = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", `/api/forms/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/forms", id] }),
  });

  const saveQuestions = async (qs: DraftQuestion[]) => {
    setSaving(true);
    try {
      // Save form title/desc/settings first
      await updateForm.mutateAsync({
        title: formTitle,
        description: formDesc || null,
        settings: { submitMessage: submitMsg },
      });
      // Save questions
      await apiRequest("PUT", `/api/forms/${id}/questions`, {
        questions: qs.map((q, i) => ({
          ...(q.id ? { id: q.id } : {}),
          type: q.type,
          question: q.question,
          options: q.type === "mcq" ? q.options : null,
          required: q.required,
          orderIdx: i,
        })),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/forms", id, "questions"] });
      toast({ title: "Saved!", description: "Your form has been saved." });
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const publishForm = async () => {
    await saveQuestions(questions);
    const newStatus = form?.status === "published" ? "draft" : "published";
    await updateForm.mutateAsync({ status: newStatus });
    toast({ title: newStatus === "published" ? "Form published! 🎉" : "Form unpublished", description: newStatus === "published" ? "Share the link with your audience." : undefined });
  };

  const copyLink = () => {
    if (form?.status !== "published") { toast({ title: "Publish the form first", variant: "destructive" }); return; }
    const url = `${window.location.origin}/f/${form.slug}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copied!", description: url });
  };

  const aiGenerate = async () => {
    if (!aiPrompt.trim()) { toast({ title: "Enter a prompt first", variant: "destructive" }); return; }
    setAiGenerating(true);
    try {
      const result: any = await apiRequest("POST", "/api/forms/ai-generate", { prompt: aiPrompt, formType: form?.type || "form" });
      // Apply generated questions
      if (result.title && !formTitle) setFormTitle(result.title);
      if (result.description && !formDesc) setFormDesc(result.description || "");
      const generated: DraftQuestion[] = (result.questions || []).map((q: any) => ({
        type: q.type,
        question: q.question,
        options: q.options || [],
        required: q.required ?? false,
      }));
      setQuestions(prev => [...prev, ...generated]);
      setTab("build");
      toast({ title: `Generated ${generated.length} questions!`, description: "Review and edit before saving." });
    } catch (e: any) {
      toast({ title: "AI generation failed", description: e?.message || "Please try again.", variant: "destructive" });
    } finally {
      setAiGenerating(false);
    }
  };

  const moveQ = (idx: number, dir: -1 | 1) => {
    const newQ = [...questions];
    const target = idx + dir;
    if (target < 0 || target >= newQ.length) return;
    [newQ[idx], newQ[target]] = [newQ[target], newQ[idx]];
    setQuestions(newQ);
  };

  if (formLoading) return (
    <ClientLayout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: GOLD, borderTopColor: "transparent" }} />
      </div>
    </ClientLayout>
  );

  const publicUrl = `${window.location.origin}/f/${form?.slug}`;

  return (
    <ClientLayout>
      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate("/tools/forms")} className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white transition-colors" style={{ background: "rgba(255,255,255,0.04)" }}>
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <input
              data-testid="input-form-title-builder"
              value={formTitle}
              onChange={e => setFormTitle(e.target.value)}
              className="text-xl font-black text-white bg-transparent border-none outline-none w-full"
              placeholder="Untitled Form"
            />
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${form?.status === "published" ? "bg-emerald-500/15 text-emerald-400" : "bg-zinc-800 text-zinc-500"}`}>
                {form?.status === "published" ? "● Live" : "Draft"}
              </span>
              <span className="text-xs text-zinc-600">{questions.length} question{questions.length !== 1 ? "s" : ""}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {form?.status === "published" && (
              <button data-testid="btn-copy-link" onClick={copyLink} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <Copy className="w-3 h-3" /> Copy Link
              </button>
            )}
            <button data-testid="btn-view-responses" onClick={() => navigate(`/tools/forms/${id}/responses`)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <BarChart2 className="w-3 h-3" /> Responses
            </button>
            <button data-testid="btn-save" onClick={() => saveQuestions(questions)} disabled={saving} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:scale-105 disabled:opacity-50" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.8)" }}>
              <Save className="w-3.5 h-3.5" /> {saving ? "Saving..." : "Save"}
            </button>
            <button data-testid="btn-publish" onClick={publishForm} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:scale-105 disabled:opacity-50"
              style={{ background: form?.status === "published" ? "rgba(239,68,68,0.12)" : `${GOLD}18`, border: `1px solid ${form?.status === "published" ? "rgba(239,68,68,0.3)" : GOLD + "40"}`, color: form?.status === "published" ? "#f87171" : GOLD }}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              {form?.status === "published" ? "Unpublish" : "Publish"}
            </button>
          </div>
        </div>

        {/* Published link banner */}
        {form?.status === "published" && (
          <div className="mb-5 px-4 py-3 rounded-xl flex items-center gap-3" style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)" }}>
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-emerald-400 mb-0.5">Your form is live</p>
              <p className="text-xs text-zinc-500 truncate">{publicUrl}</p>
            </div>
            <button onClick={copyLink} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold flex-shrink-0" style={{ background: "rgba(52,211,153,0.12)", color: "#34d399" }}>
              <Copy className="w-3 h-3" /> Copy
            </button>
          </div>
        )}

        {/* Form settings */}
        <div className="mb-5 rounded-2xl p-5 space-y-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Form Settings</p>
          <div>
            <label className="text-xs text-zinc-600 block mb-1">Description</label>
            <input data-testid="input-form-desc" value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Add a short description (optional)" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: 13, outline: "none", width: "100%" }} />
          </div>
          <div>
            <label className="text-xs text-zinc-600 block mb-1">Thank-you message</label>
            <input data-testid="input-submit-msg" value={submitMsg} onChange={e => setSubmitMsg(e.target.value)} placeholder="Thank you for your response!" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: 13, outline: "none", width: "100%" }} />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <button data-testid="tab-build" onClick={() => setTab("build")} className="flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2"
            style={{ background: tab === "build" ? `${GOLD}18` : "transparent", color: tab === "build" ? GOLD : "rgba(255,255,255,0.35)", border: tab === "build" ? `1px solid ${GOLD}30` : "1px solid transparent" }}>
            Build Manually
          </button>
          <button data-testid="tab-ai" onClick={() => setTab("ai")} className="flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2"
            style={{ background: tab === "ai" ? `${GOLD}18` : "transparent", color: tab === "ai" ? GOLD : "rgba(255,255,255,0.35)", border: tab === "ai" ? `1px solid ${GOLD}30` : "1px solid transparent" }}>
            <Zap className="w-3.5 h-3.5" /> Generate with AI
          </button>
        </div>

        {/* Build tab */}
        {tab === "build" && (
          <div className="space-y-3">
            {questions.length === 0 && (
              <div className="text-center py-12 rounded-2xl" style={{ border: "1px dashed rgba(255,255,255,0.1)" }}>
                <p className="text-zinc-500 text-sm mb-4">No questions yet. Add your first question or use AI to generate the whole form.</p>
                <button data-testid="btn-add-first-q" onClick={() => setQuestions([newQ()])} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold" style={{ background: `${GOLD}18`, border: `1px solid ${GOLD}40`, color: GOLD }}>
                  <Plus className="w-4 h-4" /> Add Question
                </button>
              </div>
            )}
            {questions.map((q, idx) => (
              <QuestionEditor
                key={idx}
                q={q}
                idx={idx}
                total={questions.length}
                onChange={updated => setQuestions(qs => qs.map((x, i) => i === idx ? updated : x))}
                onDelete={() => setQuestions(qs => qs.filter((_, i) => i !== idx))}
                onMove={dir => moveQ(idx, dir)}
              />
            ))}
            {questions.length > 0 && (
              <button data-testid="btn-add-q" onClick={() => setQuestions(qs => [...qs, newQ()])} className="w-full py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.01]" style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.3)" }}>
                <Plus className="w-4 h-4" /> Add Question
              </button>
            )}
            {questions.length > 0 && (
              <div className="flex gap-3 pt-2">
                <button data-testid="btn-save-bottom" onClick={() => saveQuestions(questions)} disabled={saving} className="flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.01] disabled:opacity-50" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.8)" }}>
                  <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Changes"}
                </button>
                <button data-testid="btn-publish-bottom" onClick={publishForm} disabled={saving} className="flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.01] disabled:opacity-50"
                  style={{ background: form?.status === "published" ? "rgba(239,68,68,0.12)" : `${GOLD}18`, border: `1px solid ${form?.status === "published" ? "rgba(239,68,68,0.3)" : GOLD + "40"}`, color: form?.status === "published" ? "#f87171" : GOLD }}>
                  <CheckCircle2 className="w-4 h-4" />
                  {form?.status === "published" ? "Unpublish" : "Save & Publish"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* AI tab */}
        {tab === "ai" && (
          <div className="rounded-2xl p-6" style={{ background: "rgba(212,180,97,0.04)", border: "1px solid rgba(212,180,97,0.15)" }}>
            <div className="flex items-center gap-2 mb-5">
              <Zap className="w-4 h-4" style={{ color: GOLD }} />
              <p className="text-sm font-bold text-white">AI Form Generator</p>
            </div>
            <p className="text-xs text-zinc-500 mb-4 leading-relaxed">
              Describe what you want — the AI will generate a complete set of questions for you. Be as specific as you like: topic, style (MCQ, open-ended, etc.), number of questions, audience type.
            </p>
            <textarea
              data-testid="ai-prompt"
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              placeholder={`Examples:\n• "Create a 7-question audience quiz about skincare routines with MCQ answers"\n• "Build an event registration form collecting name, email, dietary requirements"\n• "Make a customer satisfaction survey for a fitness coaching service"`}
              rows={6}
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "14px", color: "#fff", fontSize: 13, outline: "none", width: "100%", resize: "none", lineHeight: 1.6 }}
            />
            <button
              data-testid="btn-ai-generate"
              onClick={aiGenerate}
              disabled={aiGenerating || !aiPrompt.trim()}
              className="w-full mt-4 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.01] disabled:opacity-40"
              style={{ background: `${GOLD}20`, border: `1px solid ${GOLD}50`, color: GOLD }}
            >
              <Zap className="w-4 h-4" />
              {aiGenerating ? "Generating your form..." : "Generate with AI"}
            </button>
            {questions.length > 0 && (
              <p className="text-xs text-zinc-600 text-center mt-3">
                {questions.length} question{questions.length !== 1 ? "s" : ""} in your form — new AI questions will be appended. Switch to Build tab to edit.
              </p>
            )}
          </div>
        )}
      </div>
    </ClientLayout>
  );
}
