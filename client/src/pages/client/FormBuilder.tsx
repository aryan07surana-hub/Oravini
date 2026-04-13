import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import ClientLayout from "@/components/layout/ClientLayout";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown, Save, Zap, Copy, CheckCircle2, X, BarChart2, ExternalLink, Type, Mail, Phone, Hash, AlignLeft, Star, ToggleLeft, List, User, HelpCircle } from "lucide-react";

const GOLD = "#d4b461";

const Q_TYPES = [
  { value: "text", label: "Short Text", icon: Type, desc: "One-line answer" },
  { value: "long_text", label: "Paragraph", icon: AlignLeft, desc: "Multi-line answer" },
  { value: "email", label: "Email", icon: Mail, desc: "Captures email address" },
  { value: "name", label: "Name", icon: User, desc: "Captures full name" },
  { value: "phone", label: "Phone", icon: Phone, desc: "Phone number" },
  { value: "number", label: "Number", icon: Hash, desc: "Numeric input" },
  { value: "mcq", label: "Multiple Choice", icon: List, desc: "Pick one option" },
  { value: "yes_no", label: "Yes / No", icon: ToggleLeft, desc: "Simple yes or no" },
  { value: "rating", label: "Star Rating", icon: Star, desc: "Rate 1 to 5 stars" },
];

const Q_TYPE_MAP = Object.fromEntries(Q_TYPES.map(t => [t.value, t]));

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

function TypePickerModal({ current, onSelect, onClose }: { current: string; onSelect: (t: string) => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }} onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl p-5" style={{ background: "#0e0e10", border: "1px solid rgba(212,180,97,0.2)" }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-black text-white">Choose Question Type</p>
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-400"><X className="w-4 h-4" /></button>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {Q_TYPES.map(t => (
            <button
              key={t.value}
              onClick={() => { onSelect(t.value); onClose(); }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all hover:scale-[1.01]"
              style={{
                background: current === t.value ? `${GOLD}15` : "rgba(255,255,255,0.03)",
                border: `1px solid ${current === t.value ? GOLD + "50" : "rgba(255,255,255,0.07)"}`,
              }}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: current === t.value ? `${GOLD}20` : "rgba(255,255,255,0.05)" }}>
                <t.icon className="w-4 h-4" style={{ color: current === t.value ? GOLD : "rgba(255,255,255,0.4)" }} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: current === t.value ? GOLD : "rgba(255,255,255,0.85)" }}>{t.label}</p>
                <p className="text-[11px] text-zinc-600">{t.desc}</p>
              </div>
              {current === t.value && <CheckCircle2 className="w-4 h-4 ml-auto flex-shrink-0" style={{ color: GOLD }} />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function QuestionEditor({ q, idx, total, onChange, onDelete, onMove }: {
  q: DraftQuestion; idx: number; total: number;
  onChange: (q: DraftQuestion) => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const [showTypePicker, setShowTypePicker] = useState(false);
  const qType = Q_TYPE_MAP[q.type] || Q_TYPE_MAP["text"];
  const inputStyle = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "14px 16px", color: "#fff", fontSize: 14, outline: "none", width: "100%" };

  return (
    <>
      <div className="rounded-2xl" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.09)" }}>
        {/* Question header bar */}
        <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-black flex-shrink-0" style={{ background: GOLD }}>
            {idx + 1}
          </div>
          <button
            data-testid={`q-type-btn-${idx}`}
            onClick={() => setShowTypePicker(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-[1.02] flex-shrink-0"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}
          >
            <qType.icon className="w-3.5 h-3.5" />
            {qType.label}
            <ChevronDown className="w-3 h-3 opacity-50" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-1">
            <button onClick={() => onMove(-1)} disabled={idx === 0} className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-600 hover:text-zinc-300 disabled:opacity-20 transition-colors" style={{ background: "rgba(255,255,255,0.04)" }}>
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onMove(1)} disabled={idx === total - 1} className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-600 hover:text-zinc-300 disabled:opacity-20 transition-colors" style={{ background: "rgba(255,255,255,0.04)" }}>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            <button data-testid={`btn-delete-q-${idx}`} onClick={onDelete} className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-600 hover:text-red-400 transition-colors ml-1" style={{ background: "rgba(255,255,255,0.04)" }}>
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Question body */}
        <div className="px-5 pb-5 pt-4 space-y-4">
          {/* Question text */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-2">Question</label>
            <input
              data-testid={`q-text-${idx}`}
              value={q.question}
              onChange={e => onChange({ ...q, question: e.target.value })}
              placeholder={`e.g. ${q.type === "email" ? "What's your email address?" : q.type === "name" ? "What's your full name?" : q.type === "rating" ? "How would you rate us?" : q.type === "mcq" ? "Which option best describes you?" : "Type your question here..."}`}
              style={inputStyle}
            />
          </div>

          {/* MCQ options */}
          {q.type === "mcq" && (
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-3">Answer Options</label>
              <div className="space-y-2.5">
                {q.options.map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black flex-shrink-0" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}>
                      {String.fromCharCode(65 + oi)}
                    </div>
                    <input
                      data-testid={`q-opt-${idx}-${oi}`}
                      value={opt}
                      onChange={e => { const opts = [...q.options]; opts[oi] = e.target.value; onChange({ ...q, options: opts }); }}
                      placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                      style={{ ...inputStyle, padding: "10px 14px", fontSize: 13, flex: 1 }}
                    />
                    {q.options.length > 2 && (
                      <button onClick={() => onChange({ ...q, options: q.options.filter((_, i) => i !== oi) })} className="text-zinc-700 hover:text-red-400 transition-colors flex-shrink-0">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
                {q.options.length < 8 && (
                  <button
                    onClick={() => onChange({ ...q, options: [...q.options, `Option ${String.fromCharCode(65 + q.options.length)}`] })}
                    className="flex items-center gap-2 text-xs font-semibold mt-1 transition-colors hover:opacity-80"
                    style={{ color: GOLD }}
                  >
                    <Plus className="w-3.5 h-3.5" /> Add another option
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Required toggle */}
          <div className="flex items-center justify-between pt-1">
            <div>
              <p className="text-xs font-semibold text-zinc-400">Required</p>
              <p className="text-[11px] text-zinc-600 mt-0.5">Respondent must answer this question</p>
            </div>
            <button
              data-testid={`q-required-${idx}`}
              onClick={() => onChange({ ...q, required: !q.required })}
              className="w-11 h-6 rounded-full transition-colors relative flex-shrink-0"
              style={{ background: q.required ? GOLD : "rgba(255,255,255,0.1)" }}
            >
              <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all" style={{ left: q.required ? "calc(100% - 22px)" : 2 }} />
            </button>
          </div>
        </div>
      </div>

      {showTypePicker && (
        <TypePickerModal
          current={q.type}
          onSelect={type => onChange({ ...q, type, options: type === "mcq" ? ["Option A", "Option B", "Option C"] : q.options })}
          onClose={() => setShowTypePicker(false)}
        />
      )}
    </>
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
  const [copied, setCopied] = useState(false);

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forms", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/forms"] });
    },
  });

  const saveQuestions = async (qs: DraftQuestion[], showToast = true) => {
    setSaving(true);
    try {
      await updateForm.mutateAsync({
        title: formTitle,
        description: formDesc || null,
        settings: { submitMessage: submitMsg },
      });
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
      if (showToast) toast({ title: "Saved!", description: "Your form has been updated." });
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const publishForm = async () => {
    await saveQuestions(questions, false);
    const newStatus = form?.status === "published" ? "draft" : "published";
    await updateForm.mutateAsync({ status: newStatus });
    toast({
      title: newStatus === "published" ? "Form published!" : "Form unpublished",
      description: newStatus === "published" ? "Your form is now live and accepting responses." : undefined,
    });
  };

  const copyLink = () => {
    if (form?.status !== "published") {
      toast({ title: "Publish the form first to get your link", variant: "destructive" });
      return;
    }
    const url = `${window.location.origin}/f/${form.slug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
    toast({ title: "Link copied!" });
  };

  const aiGenerate = async () => {
    if (!aiPrompt.trim()) { toast({ title: "Enter a prompt first", variant: "destructive" }); return; }
    setAiGenerating(true);
    try {
      const result: any = await apiRequest("POST", "/api/forms/ai-generate", { prompt: aiPrompt, formType: form?.type || "form" });
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
      toast({ title: `${generated.length} questions generated!`, description: "Review and edit them below, then save." });
    } catch (e: any) {
      toast({ title: "AI generation failed", description: e?.message || "Please try again.", variant: "destructive" });
    } finally {
      setAiGenerating(false);
    }
  };

  const moveQ = (idx: number, dir: -1 | 1) => {
    const arr = [...questions];
    const target = idx + dir;
    if (target < 0 || target >= arr.length) return;
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    setQuestions(arr);
  };

  if (formLoading) return (
    <ClientLayout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: GOLD, borderTopColor: "transparent" }} />
      </div>
    </ClientLayout>
  );

  const publicUrl = `${window.location.origin}/f/${form?.slug}`;
  const isPublished = form?.status === "published";

  return (
    <ClientLayout>
      <div className="max-w-2xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="flex items-start gap-4 mb-8">
          <button
            onClick={() => navigate("/tools/forms")}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-500 hover:text-white transition-colors flex-shrink-0 mt-1"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <input
              data-testid="input-form-title-builder"
              value={formTitle}
              onChange={e => setFormTitle(e.target.value)}
              className="text-2xl font-black text-white bg-transparent border-none outline-none w-full"
              placeholder="Untitled Form"
            />
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${isPublished ? "bg-emerald-500/15 text-emerald-400" : "bg-zinc-800 text-zinc-500"}`}>
                {isPublished ? "● Live" : "Draft"}
              </span>
              <span className="text-xs text-zinc-600">{questions.length} question{questions.length !== 1 ? "s" : ""}</span>
            </div>
          </div>
        </div>

        {/* Published banner */}
        {isPublished && (
          <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl mb-6" style={{ background: "rgba(52,211,153,0.07)", border: "1px solid rgba(52,211,153,0.2)" }}>
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-emerald-400 mb-0.5">Form is live</p>
              <p className="text-xs text-zinc-500 truncate">{publicUrl}</p>
            </div>
            <button
              data-testid="btn-copy-link"
              onClick={copyLink}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold flex-shrink-0 transition-all"
              style={{ background: copied ? "rgba(52,211,153,0.15)" : `${GOLD}15`, border: `1px solid ${copied ? "rgba(52,211,153,0.3)" : GOLD + "30"}`, color: copied ? "#34d399" : GOLD }}
            >
              {copied ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? "Copied!" : "Copy Link"}
            </button>
          </div>
        )}

        {/* Form settings */}
        <div className="rounded-2xl p-6 mb-8" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-4">Form Settings</p>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-zinc-400 block mb-2">Description <span className="text-zinc-700 font-normal">(optional)</span></label>
              <input
                data-testid="input-form-desc"
                value={formDesc}
                onChange={e => setFormDesc(e.target.value)}
                placeholder="Describe what this form is for..."
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 12, padding: "12px 16px", color: "#fff", fontSize: 14, outline: "none", width: "100%" }}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-400 block mb-2">Thank-you message <span className="text-zinc-700 font-normal">(shown after submit)</span></label>
              <input
                data-testid="input-submit-msg"
                value={submitMsg}
                onChange={e => setSubmitMsg(e.target.value)}
                placeholder="Thank you for your response!"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 12, padding: "12px 16px", color: "#fff", fontSize: 14, outline: "none", width: "100%" }}
              />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <button
            data-testid="tab-build"
            onClick={() => setTab("build")}
            className="flex-1 py-2.5 rounded-lg text-xs font-bold transition-all"
            style={{ background: tab === "build" ? `${GOLD}18` : "transparent", color: tab === "build" ? GOLD : "rgba(255,255,255,0.35)", border: tab === "build" ? `1px solid ${GOLD}30` : "1px solid transparent" }}
          >
            Build Manually
          </button>
          <button
            data-testid="tab-ai"
            onClick={() => setTab("ai")}
            className="flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2"
            style={{ background: tab === "ai" ? `${GOLD}18` : "transparent", color: tab === "ai" ? GOLD : "rgba(255,255,255,0.35)", border: tab === "ai" ? `1px solid ${GOLD}30` : "1px solid transparent" }}
          >
            <Zap className="w-3.5 h-3.5" /> Generate with AI
          </button>
        </div>

        {/* Build tab */}
        {tab === "build" && (
          <div>
            {questions.length === 0 ? (
              <div className="text-center py-16 rounded-2xl" style={{ border: "1px dashed rgba(255,255,255,0.1)" }}>
                <HelpCircle className="w-10 h-10 text-zinc-700 mx-auto mb-4" />
                <p className="text-white font-bold mb-2">No questions yet</p>
                <p className="text-zinc-500 text-sm mb-6">Add your first question manually, or use AI to generate a full form automatically.</p>
                <div className="flex gap-3 justify-center">
                  <button
                    data-testid="btn-add-first-q"
                    onClick={() => setQuestions([newQ()])}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105"
                    style={{ background: `${GOLD}18`, border: `1px solid ${GOLD}40`, color: GOLD }}
                  >
                    <Plus className="w-4 h-4" /> Add Question
                  </button>
                  <button
                    onClick={() => setTab("ai")}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}
                  >
                    <Zap className="w-4 h-4" /> Use AI Instead
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
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

                {/* Add question button */}
                <button
                  data-testid="btn-add-q"
                  onClick={() => setQuestions(qs => [...qs, newQ()])}
                  className="w-full py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.005]"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.3)" }}
                >
                  <Plus className="w-4 h-4" /> Add Another Question
                </button>
              </div>
            )}

            {/* Save + Publish row */}
            {questions.length > 0 && (
              <div className="flex gap-3 mt-8">
                <button
                  data-testid="btn-save"
                  onClick={() => saveQuestions(questions)}
                  disabled={saving}
                  className="flex-1 py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.01] disabled:opacity-50"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.8)" }}
                >
                  <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Draft"}
                </button>
                <button
                  data-testid="btn-publish"
                  onClick={publishForm}
                  disabled={saving}
                  className="flex-1 py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.01] disabled:opacity-50"
                  style={{
                    background: isPublished ? "rgba(239,68,68,0.12)" : `${GOLD}18`,
                    border: `1px solid ${isPublished ? "rgba(239,68,68,0.3)" : GOLD + "40"}`,
                    color: isPublished ? "#f87171" : GOLD,
                  }}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isPublished ? "Unpublish Form" : "Save & Publish"}
                </button>
              </div>
            )}

            {/* Responses link */}
            {questions.length > 0 && (
              <button
                data-testid="btn-view-responses"
                onClick={() => navigate(`/tools/forms/${id}/responses`)}
                className="w-full mt-3 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:scale-[1.005]"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.4)" }}
              >
                <BarChart2 className="w-4 h-4" /> View Responses & Analytics
              </button>
            )}
          </div>
        )}

        {/* AI tab */}
        {tab === "ai" && (
          <div className="rounded-2xl p-7" style={{ background: "rgba(212,180,97,0.04)", border: "1px solid rgba(212,180,97,0.15)" }}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${GOLD}18`, border: `1px solid ${GOLD}30` }}>
                <Zap className="w-4 h-4" style={{ color: GOLD }} />
              </div>
              <div>
                <p className="text-sm font-black text-white">AI Form Generator</p>
                <p className="text-xs text-zinc-500 mt-0.5">Describe what you want — AI builds the whole form</p>
              </div>
            </div>

            <div className="space-y-4">
              <textarea
                data-testid="ai-prompt"
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                placeholder={`Describe your form in plain English. For example:\n\n• "Create a 7-question audience quiz about skincare, with multiple choice answers"\n• "Make an event registration form collecting name, email, and dietary preferences"\n• "Build a customer satisfaction survey for a fitness coaching business"`}
                rows={7}
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 14,
                  padding: "16px",
                  color: "#fff",
                  fontSize: 14,
                  outline: "none",
                  width: "100%",
                  resize: "none",
                  lineHeight: 1.7,
                }}
              />

              <button
                data-testid="btn-ai-generate"
                onClick={aiGenerate}
                disabled={aiGenerating || !aiPrompt.trim()}
                className="w-full py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.01] disabled:opacity-40"
                style={{ background: `${GOLD}20`, border: `1px solid ${GOLD}50`, color: GOLD }}
              >
                <Zap className="w-4 h-4" />
                {aiGenerating ? "Generating your form..." : "Generate Form with AI"}
              </button>

              {questions.length > 0 && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <p className="text-xs text-zinc-400">
                    You already have {questions.length} question{questions.length !== 1 ? "s" : ""}. New AI questions will be added after them.
                    <button onClick={() => setTab("build")} className="ml-2 font-semibold hover:opacity-80 transition-opacity" style={{ color: GOLD }}>Switch to Build tab →</button>
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </ClientLayout>
  );
}
