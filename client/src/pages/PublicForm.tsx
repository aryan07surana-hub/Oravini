import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { ChevronRight, Star, CheckCircle2, ArrowLeft } from "lucide-react";

const GOLD = "#d4b461";

type Question = {
  id: string;
  type: string;
  question: string;
  options?: string[];
  required: boolean;
  orderIdx: number;
};

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-3">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} onClick={() => onChange(n)} onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)}>
          <Star className={`w-10 h-10 transition-all ${(hover || value) >= n ? "text-yellow-400 fill-yellow-400" : "text-zinc-700"}`} />
        </button>
      ))}
    </div>
  );
}

function QuestionInput({ question, value, onChange }: { question: Question; value: string; onChange: (v: string) => void }) {
  const inputStyle = { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "14px 18px", color: "#fff", fontSize: 16, outline: "none", width: "100%" };

  if (question.type === "mcq") {
    const opts = (question.options as string[]) || [];
    return (
      <div className="flex flex-col gap-3 w-full">
        {opts.map((opt, i) => (
          <button
            key={i}
            data-testid={`mcq-option-${i}`}
            onClick={() => onChange(opt)}
            className="text-left px-5 py-4 rounded-xl text-sm font-medium transition-all hover:scale-[1.01]"
            style={{
              background: value === opt ? `${GOLD}18` : "rgba(255,255,255,0.04)",
              border: `1px solid ${value === opt ? GOLD + "60" : "rgba(255,255,255,0.1)"}`,
              color: value === opt ? GOLD : "rgba(255,255,255,0.8)",
            }}
          >
            <span className="mr-3 text-xs font-black opacity-50">{String.fromCharCode(65 + i)}</span>{opt}
          </button>
        ))}
      </div>
    );
  }

  if (question.type === "yes_no") {
    return (
      <div className="flex gap-4">
        {["Yes", "No"].map(opt => (
          <button
            key={opt}
            data-testid={`yesno-${opt.toLowerCase()}`}
            onClick={() => onChange(opt)}
            className="flex-1 py-4 rounded-xl text-sm font-bold transition-all hover:scale-[1.02]"
            style={{
              background: value === opt ? `${GOLD}18` : "rgba(255,255,255,0.04)",
              border: `1px solid ${value === opt ? GOLD + "60" : "rgba(255,255,255,0.1)"}`,
              color: value === opt ? GOLD : "rgba(255,255,255,0.6)",
            }}
          >{opt}</button>
        ))}
      </div>
    );
  }

  if (question.type === "rating") {
    return <StarRating value={parseInt(value) || 0} onChange={v => onChange(String(v))} />;
  }

  if (question.type === "long_text") {
    return (
      <textarea
        data-testid="input-long-text"
        value={value} onChange={e => onChange(e.target.value)}
        placeholder="Type your answer here..."
        rows={5} style={{ ...inputStyle, resize: "none" }}
      />
    );
  }

  const inputType = question.type === "email" ? "email" : question.type === "number" ? "number" : question.type === "phone" ? "tel" : "text";
  const placeholder = { email: "your@email.com", name: "Your full name", phone: "+1 234 567 8900", number: "Enter a number", text: "Type your answer..." }[question.type] || "Type your answer...";

  return (
    <input
      data-testid={`input-${question.type}`}
      type={inputType} value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={inputStyle}
    />
  );
}

export default function PublicForm() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [formData, setFormData] = useState<{ form: any; questions: Question[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [viewTracked, setViewTracked] = useState(false);

  useEffect(() => {
    fetch(`/api/public/forms/${slug}`)
      .then(r => r.json())
      .then(d => {
        if (d.message) { setError(d.message); setLoading(false); return; }
        setFormData(d);
        setLoading(false);
      })
      .catch(() => { setError("Failed to load form."); setLoading(false); });
  }, [slug]);

  useEffect(() => {
    if (formData && !viewTracked) {
      setViewTracked(true);
      fetch(`/api/public/forms/${slug}/view`, { method: "POST" });
    }
  }, [formData, viewTracked, slug]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#080809" }}>
      <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: GOLD, borderTopColor: "transparent" }} />
    </div>
  );

  if (error || !formData) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#080809" }}>
      <div className="text-center">
        <p className="text-white font-bold text-xl mb-2">Form not found</p>
        <p className="text-zinc-500 text-sm">{error || "This form is not available."}</p>
      </div>
    </div>
  );

  const { form, questions } = formData;
  const total = questions.length;
  const q = questions[current];
  const progress = total > 0 ? ((current) / total) * 100 : 0;
  const currentValue = q ? (answers[q.id] || "") : "";

  const canAdvance = !q?.required || currentValue.trim() !== "";

  const handleNext = () => {
    if (current < total - 1) { setCurrent(c => c + 1); }
    else handleSubmit();
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const nameQ = questions.find(q => q.type === "name");
    const emailQ = questions.find(q => q.type === "email");
    const respondentName = nameQ ? answers[nameQ.id] : undefined;
    const respondentEmail = emailQ ? answers[emailQ.id] : undefined;
    const answerPayload = questions.map(q => ({ questionId: q.id, value: answers[q.id] || "" })).filter(a => a.value);
    try {
      const r = await fetch(`/api/public/forms/${slug}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ respondentName, respondentEmail, answers: answerPayload }),
      });
      if (r.ok) setSubmitted(true);
      else setError("Submission failed. Please try again.");
    } catch { setError("Submission failed. Please try again."); }
    setSubmitting(false);
  };

  const settings = (form.settings || {}) as any;

  // Thank you screen
  if (submitted) return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#080809" }}>
      <div className="text-center max-w-md animate-in fade-in zoom-in duration-500">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: `${GOLD}18`, border: `2px solid ${GOLD}40` }}>
          <CheckCircle2 className="w-9 h-9" style={{ color: GOLD }} />
        </div>
        <h1 className="text-2xl font-black text-white mb-3">{settings.submitMessage || "Thank you!"}</h1>
        <p className="text-zinc-400 text-sm leading-relaxed">Your response has been recorded. We appreciate your time!</p>
      </div>
    </div>
  );

  if (total === 0) return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#080809" }}>
      <div className="text-center">
        <p className="text-white font-bold mb-2">{form.title}</p>
        <p className="text-zinc-500 text-sm">This form has no questions yet.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#080809" }}>
      {/* Progress bar */}
      <div className="h-1 w-full" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div className="h-full transition-all duration-500" style={{ width: `${progress}%`, background: GOLD }} />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-xl">
          {/* Form title (first question only) */}
          {current === 0 && (
            <div className="mb-8 animate-in fade-in slide-in-from-bottom-3 duration-500">
              <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: GOLD }}>{form.title}</p>
              {form.description && <p className="text-zinc-500 text-sm">{form.description}</p>}
            </div>
          )}

          {/* Question */}
          <div key={current} className="animate-in fade-in slide-in-from-bottom-4 duration-400">
            <div className="flex items-start gap-3 mb-6">
              <span className="text-xs font-black mt-1 flex-shrink-0" style={{ color: GOLD }}>{current + 1} →</span>
              <h2 className="text-xl font-bold text-white leading-snug">
                {q.question}
                {q.required && <span className="text-red-400 ml-1">*</span>}
              </h2>
            </div>

            <QuestionInput
              question={q}
              value={currentValue}
              onChange={val => setAnswers(a => ({ ...a, [q.id]: val }))}
            />

            <div className="flex items-center gap-4 mt-8">
              {current > 0 && (
                <button
                  data-testid="btn-prev"
                  onClick={() => setCurrent(c => c - 1)}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-zinc-400 hover:text-white transition-colors"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
              )}
              <button
                data-testid="btn-next"
                onClick={handleNext}
                disabled={!canAdvance || submitting}
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all hover:scale-105 disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ background: GOLD, color: "#000" }}
              >
                {submitting ? "Submitting..." : current === total - 1 ? "Submit" : "OK"} {!submitting && <ChevronRight className="w-4 h-4" />}
              </button>
              {!q.required && current < total - 1 && (
                <button onClick={() => setCurrent(c => c + 1)} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">Skip</button>
              )}
            </div>
          </div>

          <p className="text-zinc-700 text-xs mt-8 text-center">{current + 1} / {total}</p>
        </div>
      </div>

      {/* Branding */}
      <div className="py-4 text-center">
        <p className="text-[11px] text-zinc-700">Built with <span style={{ color: GOLD }}>Oravini</span></p>
      </div>
    </div>
  );
}
