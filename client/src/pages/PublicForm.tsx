import { useState, useEffect, useRef, KeyboardEvent } from "react";
import { useParams } from "wouter";
import { ChevronRight, Check, ArrowLeft, ArrowUp, ArrowDown, ChevronDown } from "lucide-react";

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
  description?: string;
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
    <div ref={ref} className="relative flex items-end gap-0 mt-6" style={{ borderBottom: "2px solid #191919" }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 pb-3 pr-3 flex-shrink-0 bg-transparent border-none outline-none"
        style={{ fontSize: 22 }}
      >
        <span>{selected.flag}</span>
        <ChevronDown className="w-3.5 h-3.5" style={{ color: "#8c8c8c" }} />
      </button>
      {open && (
        <div className="absolute bottom-full left-0 z-50 mb-2 w-56 rounded-xl overflow-hidden shadow-xl bg-white" style={{ border: "1px solid #e5e5e5" }}>
          <div className="max-h-60 overflow-y-auto">
            {DIAL_CODES.map(d => (
              <button
                key={d.code}
                type="button"
                onClick={() => { setSelected(d); setOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors hover:bg-gray-50"
                style={{ color: selected.code === d.code ? "#191919" : "#555", fontWeight: selected.code === d.code ? 700 : 400 }}
              >
                <span className="text-base">{d.flag}</span>
                <span>{d.code}</span>
                <span className="text-gray-400 ml-auto text-xs">{d.dial}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <input
        type="tel"
        value={phone}
        onChange={e => setPhone(e.target.value)}
        placeholder="(201) 555-0123"
        className="flex-1 pb-3 bg-transparent outline-none border-none"
        style={{ fontSize: 22, color: "#191919", caretColor: "#191919" }}
      />
    </div>
  );
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  const labels = ["", "Poor", "Fair", "Good", "Great", "Excellent"];
  return (
    <div className="mt-8">
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            onClick={() => onChange(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            className="transition-transform hover:scale-110 active:scale-95 text-3xl"
          >
            <span style={{ color: (hover || value) >= n ? "#f59e0b" : "#d1d5db" }}>★</span>
          </button>
        ))}
      </div>
      {(hover || value) > 0 && (
        <p className="text-sm mt-2 font-semibold" style={{ color: "#191919" }}>{labels[hover || value]}</p>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  paddingBottom: 12,
  paddingTop: 8,
  fontSize: 22,
  color: "#191919",
  background: "transparent",
  border: "none",
  borderBottom: "2px solid #d3d3d3",
  outline: "none",
  caretColor: "#191919",
  transition: "border-color 0.2s",
};

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
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 80);
  }, [question.id]);

  const handleKey = (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && onEnter) {
      e.preventDefault();
      onEnter();
    }
  };

  if (question.type === "mcq") {
    const opts = (question.options as string[]) || [];
    return (
      <div className="flex flex-col gap-2.5 mt-8">
        {opts.map((opt, i) => {
          const selected = value === opt;
          return (
            <button
              key={i}
              data-testid={`mcq-option-${i}`}
              onClick={() => {
                onChange(opt);
                setTimeout(() => onEnter?.(), 380);
              }}
              className="text-left flex items-center gap-4 px-4 py-3.5 transition-all duration-150 hover:border-gray-800 rounded-lg"
              style={{
                border: `2px solid ${selected ? "#191919" : "#d3d3d3"}`,
                background: selected ? "#f5f5f5" : "transparent",
                color: "#191919",
              }}
            >
              <span
                className="inline-flex items-center justify-center w-7 h-7 rounded flex-shrink-0 text-xs font-bold"
                style={{
                  background: selected ? "#191919" : "#f0f0f0",
                  color: selected ? "#fff" : "#555",
                  border: selected ? "none" : "1px solid #d3d3d3",
                }}
              >
                {selected ? <Check className="w-3.5 h-3.5" /> : String.fromCharCode(65 + i)}
              </span>
              <span className="text-base font-medium">{opt}</span>
            </button>
          );
        })}
      </div>
    );
  }

  if (question.type === "yes_no") {
    return (
      <div className="flex gap-3 mt-8">
        {["Yes", "No"].map(opt => {
          const selected = value === opt;
          return (
            <button
              key={opt}
              data-testid={`yesno-${opt.toLowerCase()}`}
              onClick={() => {
                onChange(opt);
                setTimeout(() => onEnter?.(), 380);
              }}
              className="flex items-center gap-3 px-6 py-3.5 transition-all duration-150 rounded-lg text-base font-semibold"
              style={{
                border: `2px solid ${selected ? "#191919" : "#d3d3d3"}`,
                background: selected ? "#191919" : "transparent",
                color: selected ? "#fff" : "#191919",
              }}
            >
              {opt === "Yes" ? "👍" : "👎"} {opt}
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
        className="w-full resize-none outline-none border-none bg-transparent"
        style={{ ...inputStyle, borderBottom: "2px solid #d3d3d3", fontSize: 20, lineHeight: 1.7, paddingTop: 16 }}
        onFocus={e => { e.currentTarget.style.borderBottomColor = "#191919"; }}
        onBlur={e => { e.currentTarget.style.borderBottomColor = "#d3d3d3"; }}
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
    number: "0",
    text: "Type your answer here...",
  }[question.type] ?? "Type your answer here...";

  return (
    <input
      ref={inputRef}
      data-testid={`input-${question.type}`}
      type={inputType}
      value={value}
      onChange={e => onChange(e.target.value)}
      onKeyDown={handleKey}
      placeholder={placeholder}
      autoFocus
      className="w-full outline-none border-none bg-transparent"
      style={{ ...inputStyle, color: "#191919" }}
      onFocus={e => { e.currentTarget.style.borderBottomColor = "#191919"; }}
      onBlur={e => { e.currentTarget.style.borderBottomColor = "#d3d3d3"; }}
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
          body: JSON.stringify({ device, browser, referrer, country: geo?.country, countryName: geo?.countryName }),
        }).catch(() => {});
      });
    }
  }, [formData, slug]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-7 h-7 rounded-full border-2 border-gray-800 border-t-transparent animate-spin" />
    </div>
  );

  if (error || !formData) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <p className="text-gray-900 font-bold text-xl mb-2">Form not found</p>
        <p className="text-gray-500 text-sm">{error || "This form is not available."}</p>
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

    const matched = evaluateLogic(q, val);
    if (matched) {
      if (matched.action === "redirect") { window.open(matched.target, "_blank", "noopener"); return; }
      if (matched.action === "end") { setEndMessage(matched.target || null); setPhase("done"); return; }
      if (matched.action === "jump") {
        const targetIdx = questions.findIndex(q2 => q2.id === matched.target);
        if (targetIdx !== -1 && targetIdx !== current) { navigate(targetIdx, targetIdx > current ? "up" : "down"); return; }
      }
    }

    if (current < total - 1) navigate(current + 1, "up");
    else handleSubmit();
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
      if (r.ok) setPhase("done");
      else setError("Submission failed. Please try again.");
    } catch { setError("Submission failed. Please try again."); }
    setSubmitting(false);
  };

  // ── Done ─────────────────────────────────────────────────────────────────
  if (phase === "done") return (
    <div className="min-h-screen flex flex-col bg-white">
      <div className="h-0.5 w-full bg-gray-900" />
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 bg-gray-900">
            <Check className="w-7 h-7 text-white" strokeWidth={3} />
          </div>
          <h1 className="text-3xl font-black text-gray-900 mb-3">{endMessage || settings.submitMessage || "Thank you!"}</h1>
          {!endMessage && <p className="text-gray-500 text-base leading-relaxed">Your response has been recorded.</p>}
        </div>
      </div>
      <div className="py-5 text-center">
        <p className="text-xs text-gray-400">Built with <span className="text-gray-700 font-semibold">Oravini</span></p>
      </div>
    </div>
  );

  // ── Welcome ───────────────────────────────────────────────────────────────
  if (phase === "welcome" || total === 0) return (
    <div className="min-h-screen flex flex-col bg-white">
      <div className="h-0.5 w-full bg-gray-100" />
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-2xl" style={{ animation: "tfSlideUp 0.45s cubic-bezier(.16,1,.3,1) both" }}>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-5">
            {form.type === "quiz" ? "Quiz" : form.type === "survey" ? "Survey" : form.type === "event" ? "Event" : "Form"}
          </p>
          <h1 className="font-black text-gray-900 leading-tight mb-4" style={{ fontSize: "clamp(28px, 5vw, 48px)" }}>{form.title}</h1>
          {form.description && (
            <p className="text-gray-500 text-lg leading-relaxed mb-6">{form.description}</p>
          )}
          {total > 0 && (
            <p className="text-gray-400 text-sm mb-10">{total} question{total !== 1 ? "s" : ""} · ~{Math.max(1, Math.round(total * 0.5))} min</p>
          )}
          {total === 0 ? (
            <p className="text-gray-400 text-sm">This form has no questions yet.</p>
          ) : (
            <button
              onClick={() => { setPhase("questions"); setCurrent(0); }}
              className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-lg text-base font-bold transition-all hover:opacity-90 active:scale-95"
              style={{ background: "#191919", color: "#fff" }}
            >
              Start <ChevronRight className="w-4 h-4" />
            </button>
          )}
          <p className="text-gray-300 text-xs mt-5">Press <kbd className="px-1.5 py-0.5 rounded text-[11px] border border-gray-200 text-gray-500">Enter ↵</kbd> to start</p>
        </div>
      </div>
      <div className="py-5 text-center">
        <p className="text-xs text-gray-400">Built with <span className="text-gray-700 font-semibold">Oravini</span></p>
      </div>
      <style>{`
        @keyframes tfSlideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes tfFromBottom { from { opacity: 0; transform: translateY(32px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes tfFromTop { from { opacity: 0; transform: translateY(-32px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );

  // ── Questions ─────────────────────────────────────────────────────────────
  const q = questions[current];
  const currentValue = q ? (answers[q.id] || "") : "";
  const canAdvance = !q?.required || currentValue.trim() !== "";

  return (
    <div
      className="min-h-screen flex flex-col bg-white"
      onKeyDown={e => {
        if (e.key === "Enter" && !["TEXTAREA"].includes((e.target as HTMLElement).tagName) && canAdvance) handleNext();
      }}
    >
      {/* Thin progress line */}
      <div className="h-0.5 w-full bg-gray-100">
        <div className="h-full transition-all duration-700 ease-out bg-gray-900" style={{ width: `${progress}%` }} />
      </div>

      {/* Nav arrows — top right */}
      <div className="flex justify-end gap-1.5 px-8 py-4">
        <button
          onClick={handleBack}
          disabled={current === 0 && phase === "questions"}
          className="w-8 h-8 rounded-md flex items-center justify-center transition-colors disabled:opacity-20"
          style={{ background: "#f5f5f5", color: "#191919" }}
        >
          <ArrowUp className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleNext}
          disabled={!canAdvance}
          className="w-8 h-8 rounded-md flex items-center justify-center transition-colors disabled:opacity-20"
          style={{ background: "#f5f5f5", color: "#191919" }}
        >
          <ArrowDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Main question area */}
      <div className="flex-1 flex items-center justify-center px-8 pb-16">
        <div className="w-full max-w-2xl">
          <div
            key={animKey}
            style={{ animation: `${animDir === "up" ? "tfFromBottom" : "tfFromTop"} 0.38s cubic-bezier(.16,1,.3,1) both` }}
          >
            {/* Question number badge */}
            <div className="flex items-center gap-2.5 mb-5">
              <span
                className="inline-flex items-center justify-center rounded text-xs font-black text-white flex-shrink-0"
                style={{ background: "#191919", minWidth: 24, height: 24, paddingInline: 6 }}
              >
                {current + 1}
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
              {q?.required && <span className="text-red-400 text-xs font-semibold">*</span>}
            </div>

            {/* Question text */}
            <h2
              className="font-bold text-gray-900 leading-snug mb-1"
              style={{ fontSize: "clamp(22px, 4vw, 34px)", fontStyle: "italic" }}
            >
              {q?.question}
            </h2>

            {/* Description */}
            {(q as any)?.description && (
              <p className="text-gray-400 text-base mt-1 mb-0" style={{ fontStyle: "italic" }}>{(q as any).description}</p>
            )}

            {/* Input */}
            {q && (
              <QuestionInput
                question={q}
                value={currentValue}
                onChange={val => setAnswers(a => ({ ...a, [q.id]: val }))}
                onEnter={canAdvance ? handleNext : undefined}
              />
            )}

            {/* OK button + hint */}
            <div className="flex items-center gap-3 mt-8 flex-wrap">
              <button
                data-testid="btn-next"
                onClick={handleNext}
                disabled={!canAdvance || submitting}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all hover:opacity-90 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ background: "#191919", color: "#fff" }}
              >
                {submitting ? "Submitting..." : current === total - 1 ? "Submit" : "OK"}
                {!submitting && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
              </button>

              {!submitting && (
                <span className="text-xs text-gray-400">
                  press <span className="font-semibold text-gray-600">Enter ↵</span>
                </span>
              )}

              {!q?.required && current < total - 1 && (
                <button
                  onClick={() => { setAnimDir("up"); setAnimKey(k => k + 1); setCurrent(c => c + 1); }}
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors ml-auto"
                >
                  Skip →
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="py-5 text-center">
        <p className="text-xs text-gray-400">Built with <span className="text-gray-700 font-semibold">Oravini</span></p>
      </div>

      <style>{`
        @keyframes tfFromBottom { from { opacity: 0; transform: translateY(32px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes tfFromTop { from { opacity: 0; transform: translateY(-32px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes tfSlideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        input::placeholder, textarea::placeholder { color: #b0b0b0; }
      `}</style>
    </div>
  );
}
