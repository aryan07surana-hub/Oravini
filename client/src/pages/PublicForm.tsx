import { useState, useEffect, useRef, KeyboardEvent } from "react";
import { useParams } from "wouter";
import { ChevronRight, Star, CheckCircle2, ArrowLeft, ArrowDown } from "lucide-react";

const GOLD = "#d4b461";

type LogicCondition = {
  operator: string;
  value: string;
  action: "jump" | "redirect" | "end";
  target: string;
};

type Question = {
  id: string;
  type: string;
  question: string;
  options?: string[];
  required: boolean;
  orderIdx: number;
  logic?: LogicCondition[];
};

function matchesCondition(op: string, answer: string, condValue: string): boolean {
  const a = answer.trim().toLowerCase();
  const v = condValue.trim().toLowerCase();
  const aNum = parseFloat(answer);
  const vNum = parseFloat(condValue);
  switch (op) {
    case "equals": return a === v;
    case "not_equals": return a !== v;
    case "contains": return a.includes(v);
    case "gt": return !isNaN(aNum) && !isNaN(vNum) && aNum > vNum;
    case "lt": return !isNaN(aNum) && !isNaN(vNum) && aNum < vNum;
    case "gte": return !isNaN(aNum) && !isNaN(vNum) && aNum >= vNum;
    case "lte": return !isNaN(aNum) && !isNaN(vNum) && aNum <= vNum;
    case "in": return condValue.split(",").map(s => s.trim().toLowerCase()).includes(a);
    default: return false;
  }
}

function evaluateLogic(q: Question, answer: string): LogicCondition | null {
  if (!q.logic?.length) return null;
  for (const cond of q.logic) {
    if (matchesCondition(cond.operator, answer, cond.value)) return cond;
  }
  return null;
}

function getDevice(): "mobile" | "tablet" | "desktop" {
  const ua = navigator.userAgent;
  if (/iPad|Android(?!.*Mobile)|Tablet/i.test(ua)) return "tablet";
  if (/Mobile|iPhone|Android/i.test(ua)) return "mobile";
  return "desktop";
}

function getBrowser(): string {
  const ua = navigator.userAgent;
  if (/Edg/i.test(ua)) return "Edge";
  if (/Chrome/i.test(ua)) return "Chrome";
  if (/Firefox/i.test(ua)) return "Firefox";
  if (/Safari/i.test(ua)) return "Safari";
  if (/OPR|Opera/i.test(ua)) return "Opera";
  return "Other";
}

async function fetchCountry(): Promise<{ country: string; countryName: string } | null> {
  try {
    const r = await fetch("https://cloudflare.com/cdn-cgi/trace", {
      signal: AbortSignal.timeout(3000),
    });
    const text = await r.text();
    const loc = text.match(/loc=([A-Z]{2})/)?.[1];
    if (!loc) return null;
    let countryName = loc;
    try {
      const dn = new Intl.DisplayNames(["en"], { type: "region" });
      countryName = dn.of(loc) || loc;
    } catch {}
    return { country: loc, countryName };
  } catch {
    return null;
  }
}

const DIAL_CODES = [
  { code: "US", dial: "+1", flag: "🇺🇸" },
  { code: "GB", dial: "+44", flag: "🇬🇧" },
  { code: "CA", dial: "+1", flag: "🇨🇦" },
  { code: "AU", dial: "+61", flag: "🇦🇺" },
  { code: "IN", dial: "+91", flag: "🇮🇳" },
  { code: "NG", dial: "+234", flag: "🇳🇬" },
  { code: "PH", dial: "+63", flag: "🇵🇭" },
  { code: "ZA", dial: "+27", flag: "🇿🇦" },
  { code: "AE", dial: "+971", flag: "🇦🇪" },
  { code: "SG", dial: "+65", flag: "🇸🇬" },
  { code: "DE", dial: "+49", flag: "🇩🇪" },
  { code: "FR", dial: "+33", flag: "🇫🇷" },
  { code: "BR", dial: "+55", flag: "🇧🇷" },
  { code: "MX", dial: "+52", flag: "🇲🇽" },
  { code: "JP", dial: "+81", flag: "🇯🇵" },
  { code: "KE", dial: "+254", flag: "🇰🇪" },
  { code: "GH", dial: "+233", flag: "🇬🇭" },
  { code: "EG", dial: "+20", flag: "🇪🇬" },
];

function PhoneInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [selected, setSelected] = useState(DIAL_CODES[0]);
  const [phone, setPhone] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    onChange(`${selected.dial} ${phone}`.trim());
  }, [selected, phone]);

  return (
    <div ref={ref} className="relative flex items-stretch rounded-xl overflow-visible mt-3" style={{ border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.04)" }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-4 py-4 text-sm font-semibold border-r flex-shrink-0"
        style={{ borderColor: "rgba(255,255,255,0.1)", minWidth: 100, background: "rgba(255,255,255,0.03)" }}
      >
        <span className="text-xl">{selected.flag}</span>
        <span className="text-zinc-300 text-sm">{selected.dial}</span>
        <ArrowDown className="w-3 h-3 text-zinc-600 ml-auto" />
      </button>
      {open && (
        <div className="absolute top-full left-0 z-50 mt-2 w-52 rounded-xl overflow-hidden shadow-2xl" style={{ background: "#111113", border: "1px solid rgba(255,255,255,0.12)" }}>
          <div className="max-h-60 overflow-y-auto">
            {DIAL_CODES.map(d => (
              <button
                key={d.code}
                type="button"
                onClick={() => { setSelected(d); setOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors hover:bg-white/5"
                style={{ color: selected.code === d.code ? GOLD : "rgba(255,255,255,0.8)" }}
              >
                <span className="text-base">{d.flag}</span>
                <span>{d.code}</span>
                <span className="text-zinc-500 ml-auto text-xs">{d.dial}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <input
        type="tel"
        value={phone}
        onChange={e => setPhone(e.target.value)}
        placeholder="Phone number"
        className="flex-1 px-4 py-4 text-white text-base bg-transparent outline-none placeholder:text-zinc-600"
        style={{ fontSize: 17 }}
      />
    </div>
  );
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  const labels = ["", "Poor", "Fair", "Good", "Great", "Excellent"];
  return (
    <div className="mt-4">
      <div className="flex gap-3">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            onClick={() => onChange(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            className="transition-transform hover:scale-110 active:scale-95"
          >
            <Star
              className={`w-12 h-12 transition-all duration-150 ${(hover || value) >= n ? "text-yellow-400 fill-yellow-400" : "text-zinc-700"}`}
            />
          </button>
        ))}
      </div>
      {(hover || value) > 0 && (
        <p className="text-sm mt-3 font-semibold transition-all" style={{ color: GOLD }}>
          {labels[hover || value]}
        </p>
      )}
    </div>
  );
}

function QuestionInput({
  question,
  value,
  onChange,
  onEnter,
}: {
  question: Question;
  value: string;
  onChange: (v: string) => void;
  onEnter?: () => void;
}) {
  const handleKey = (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && onEnter) {
      e.preventDefault();
      onEnter();
    }
  };

  if (question.type === "mcq") {
    const opts = (question.options as string[]) || [];
    return (
      <div className="flex flex-col gap-3 w-full mt-4">
        {opts.map((opt, i) => {
          const selected = value === opt;
          return (
            <button
              key={i}
              data-testid={`mcq-option-${i}`}
              onClick={() => {
                onChange(opt);
                setTimeout(() => onEnter?.(), 350);
              }}
              className="text-left px-5 py-4 rounded-xl text-base font-medium transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
              style={{
                background: selected ? `${GOLD}18` : "rgba(255,255,255,0.04)",
                border: `2px solid ${selected ? GOLD + "80" : "rgba(255,255,255,0.08)"}`,
                color: selected ? GOLD : "rgba(255,255,255,0.85)",
              }}
            >
              <span
                className="inline-flex items-center justify-center w-6 h-6 rounded text-[11px] font-black mr-3 flex-shrink-0"
                style={{ background: selected ? `${GOLD}25` : "rgba(255,255,255,0.08)", color: selected ? GOLD : "rgba(255,255,255,0.4)" }}
              >
                {String.fromCharCode(65 + i)}
              </span>
              {opt}
            </button>
          );
        })}
      </div>
    );
  }

  if (question.type === "yes_no") {
    return (
      <div className="flex gap-4 mt-4">
        {["Yes", "No"].map(opt => {
          const selected = value === opt;
          return (
            <button
              key={opt}
              data-testid={`yesno-${opt.toLowerCase()}`}
              onClick={() => {
                onChange(opt);
                setTimeout(() => onEnter?.(), 350);
              }}
              className="flex-1 py-5 rounded-xl text-base font-bold transition-all duration-200 hover:scale-[1.02] active:scale-[0.99]"
              style={{
                background: selected ? `${GOLD}18` : "rgba(255,255,255,0.04)",
                border: `2px solid ${selected ? GOLD + "80" : "rgba(255,255,255,0.08)"}`,
                color: selected ? GOLD : "rgba(255,255,255,0.7)",
              }}
            >
              {opt === "Yes" ? "👍  Yes" : "👎  No"}
            </button>
          );
        })}
      </div>
    );
  }

  if (question.type === "rating") {
    return (
      <StarRating
        value={parseInt(value) || 0}
        onChange={v => {
          onChange(String(v));
          setTimeout(() => onEnter?.(), 600);
        }}
      />
    );
  }

  if (question.type === "long_text") {
    return (
      <textarea
        data-testid="input-long-text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && onEnter) {
            e.preventDefault();
            onEnter();
          }
        }}
        placeholder="Type your answer here..."
        rows={4}
        autoFocus
        className="w-full mt-4 px-0 py-4 text-white bg-transparent outline-none placeholder:text-zinc-600 resize-none"
        style={{
          fontSize: 18,
          lineHeight: 1.7,
          borderBottom: "2px solid rgba(255,255,255,0.15)",
        }}
      />
    );
  }

  if (question.type === "phone") {
    return <PhoneInput value={value} onChange={onChange} />;
  }

  const inputType = question.type === "email" ? "email" : question.type === "number" ? "number" : "text";
  const placeholder = {
    email: "name@example.com",
    name: "Your full name",
    number: "Enter a number...",
    text: "Type your answer...",
  }[question.type] ?? "Type your answer...";

  return (
    <input
      data-testid={`input-${question.type}`}
      type={inputType}
      value={value}
      onChange={e => onChange(e.target.value)}
      onKeyDown={handleKey}
      placeholder={placeholder}
      autoFocus
      className="w-full mt-4 px-0 py-4 text-white bg-transparent outline-none placeholder:text-zinc-600"
      style={{
        fontSize: 20,
        borderBottom: "2px solid rgba(255,255,255,0.15)",
        transition: "border-color 0.2s",
      }}
    />
  );
}

export default function PublicForm() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [formData, setFormData] = useState<{ form: any; questions: Question[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [phase, setPhase] = useState<"welcome" | "questions" | "done">("welcome");
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [animDir, setAnimDir] = useState<"up" | "down">("up");
  const [animKey, setAnimKey] = useState(0);
  const [endMessage, setEndMessage] = useState<string | null>(null);
  const viewTracked = useRef(false);

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
    if (formData && !viewTracked.current) {
      viewTracked.current = true;
      const device = getDevice();
      const browser = getBrowser();
      const referrer = document.referrer || undefined;
      fetchCountry().then(geo => {
        fetch(`/api/public/forms/${slug}/view`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            device,
            browser,
            referrer,
            country: geo?.country,
            countryName: geo?.countryName,
          }),
        }).catch(() => {});
      });
    }
  }, [formData, slug]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#080809" }}>
      <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: GOLD, borderTopColor: "transparent" }} />
    </div>
  );

  if (error || !formData) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#080809" }}>
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <span className="text-2xl">404</span>
        </div>
        <p className="text-white font-bold text-xl mb-2">Form not found</p>
        <p className="text-zinc-500 text-sm">{error || "This form is not available."}</p>
      </div>
    </div>
  );

  const { form, questions } = formData;
  const total = questions.length;
  const settings = (form.settings || {}) as any;
  const progress = total > 0 ? ((current + (phase === "done" ? 1 : 0)) / total) * 100 : 0;

  const navigate = (idx: number, dir: "up" | "down") => {
    setAnimDir(dir);
    setAnimKey(k => k + 1);
    setCurrent(idx);
  };

  const handleNext = () => {
    const q = questions[current];
    const val = answers[q?.id] || "";
    if (q?.required && !val.trim()) return;

    // Evaluate logic conditions
    const matched = evaluateLogic(q, val);
    if (matched) {
      if (matched.action === "redirect") {
        window.open(matched.target, "_blank", "noopener");
        return;
      }
      if (matched.action === "end") {
        setEndMessage(matched.target || null);
        setPhase("done");
        return;
      }
      if (matched.action === "jump") {
        const targetIdx = questions.findIndex(q2 => q2.id === matched.target);
        if (targetIdx !== -1 && targetIdx !== current) {
          navigate(targetIdx, targetIdx > current ? "up" : "down");
          return;
        }
      }
    }

    if (current < total - 1) {
      navigate(current + 1, "up");
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (current > 0) navigate(current - 1, "down");
    else setPhase("welcome");
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
      if (r.ok) { setPhase("done"); }
      else setError("Submission failed. Please try again.");
    } catch { setError("Submission failed. Please try again."); }
    setSubmitting(false);
  };

  // Done screen
  if (phase === "done") return (
    <div className="min-h-screen flex flex-col" style={{ background: "#080809" }}>
      <div className="h-1 w-full" style={{ background: GOLD }} />
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-7" style={{ background: `${GOLD}15`, border: `2px solid ${GOLD}40` }}>
            <CheckCircle2 className="w-9 h-9" style={{ color: GOLD }} />
          </div>
          <h1 className="text-3xl font-black text-white mb-4">{endMessage || settings.submitMessage || "Thank you!"}</h1>
          {!endMessage && <p className="text-zinc-400 text-base leading-relaxed">Your response has been recorded. We appreciate your time!</p>}
        </div>
      </div>
      <div className="py-5 text-center">
        <p className="text-xs text-zinc-700">Built with <span style={{ color: GOLD }}>Oravini</span></p>
      </div>
    </div>
  );

  // Welcome screen
  if (phase === "welcome" || total === 0) return (
    <div className="min-h-screen flex flex-col" style={{ background: "#080809" }}>
      <div className="h-1 w-full" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div className="h-full transition-all duration-700" style={{ width: "0%", background: GOLD }} />
      </div>
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-xl">
          <div
            className="mb-8"
            style={{ animation: "fadeSlideUp 0.5s cubic-bezier(.16,1,.3,1) both" }}
          >
            <p className="text-xs font-bold uppercase tracking-[0.2em] mb-4" style={{ color: GOLD }}>
              {form.type === "quiz" ? "Quiz" : form.type === "survey" ? "Survey" : form.type === "event" ? "Event Registration" : "Form"}
            </p>
            <h1 className="text-4xl font-black text-white leading-tight mb-5">{form.title}</h1>
            {form.description && (
              <p className="text-zinc-400 text-lg leading-relaxed mb-8">{form.description}</p>
            )}
            {total > 0 && (
              <p className="text-zinc-600 text-sm mb-10">{total} question{total !== 1 ? "s" : ""} · Takes about {Math.max(1, Math.round(total * 0.5))} min</p>
            )}
            {total === 0 ? (
              <p className="text-zinc-500 text-sm">This form has no questions yet.</p>
            ) : (
              <button
                onClick={() => { setPhase("questions"); setCurrent(0); }}
                className="flex items-center gap-3 px-8 py-4 rounded-xl font-bold text-base transition-all hover:scale-105 active:scale-95"
                style={{ background: GOLD, color: "#000" }}
              >
                Start <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>
          <p className="text-zinc-700 text-xs mt-4">Press <kbd className="px-1.5 py-0.5 rounded text-[11px]" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>Enter ↵</kbd> to start</p>
        </div>
      </div>
      <div className="py-5 text-center">
        <p className="text-xs text-zinc-700">Built with <span style={{ color: GOLD }}>Oravini</span></p>
      </div>
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );

  // Question screens
  const q = questions[current];
  const currentValue = q ? (answers[q.id] || "") : "";
  const canAdvance = !q?.required || currentValue.trim() !== "";

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#080809" }}
      onKeyDown={e => {
        if (e.key === "Enter" && !["TEXTAREA", "INPUT"].includes((e.target as HTMLElement).tagName)) {
          if (canAdvance) handleNext();
        }
      }}
    >
      {/* Progress bar */}
      <div className="h-1 w-full" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div
          className="h-full transition-all duration-700 ease-out"
          style={{ width: `${progress}%`, background: GOLD }}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-xl">
            {/* Question */}
            <div
              key={animKey}
              style={{
                animation: `${animDir === "up" ? "slideFromBottom" : "slideFromTop"} 0.4s cubic-bezier(.16,1,.3,1) both`,
              }}
            >
              {/* Question number */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm font-black" style={{ color: GOLD }}>{current + 1}</span>
                <ChevronRight className="w-4 h-4" style={{ color: GOLD }} />
                <span className="text-xs text-zinc-600 uppercase tracking-wider font-semibold">
                  {q?.type === "mcq" ? "Multiple Choice" : q?.type === "rating" ? "Rating" : q?.type === "yes_no" ? "Yes / No" : q?.type === "email" ? "Email" : q?.type === "name" ? "Name" : q?.type === "phone" ? "Phone" : q?.type === "number" ? "Number" : "Open"}
                </span>
                {q?.required && <span className="text-red-400 text-xs">*required</span>}
              </div>

              {/* Question text */}
              <h2 className="text-2xl sm:text-3xl font-bold text-white leading-snug mb-2">
                {q?.question}
              </h2>

              {/* Input */}
              {q && (
                <QuestionInput
                  question={q}
                  value={currentValue}
                  onChange={val => setAnswers(a => ({ ...a, [q.id]: val }))}
                  onEnter={canAdvance ? handleNext : undefined}
                />
              )}

              {/* Navigation */}
              <div className="flex items-center gap-3 mt-8">
                <button
                  onClick={handleBack}
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white transition-colors flex-shrink-0"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>

                <button
                  data-testid="btn-next"
                  onClick={handleNext}
                  disabled={!canAdvance || submitting}
                  className="flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100"
                  style={{ background: GOLD, color: "#000" }}
                >
                  {submitting ? "Submitting..." : current === total - 1 ? "Submit" : "OK"}
                  {!submitting && <ChevronRight className="w-4 h-4" />}
                </button>

                <span className="text-xs text-zinc-700 ml-1">
                  press <span className="font-bold text-zinc-500">Enter ↵</span>
                </span>

                {!q?.required && current < total - 1 && (
                  <button
                    onClick={() => { setAnimDir("up"); setAnimKey(k => k + 1); setCurrent(c => c + 1); }}
                    className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors ml-auto"
                  >
                    Skip →
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          <p className="text-xs text-zinc-700">Built with <span style={{ color: GOLD }}>Oravini</span></p>
          <p className="text-xs font-semibold text-zinc-600">{current + 1} / {total}</p>
        </div>
      </div>

      <style>{`
        @keyframes slideFromBottom {
          from { opacity: 0; transform: translateY(32px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideFromTop {
          from { opacity: 0; transform: translateY(-32px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
