import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Star, X, Check, ClipboardList } from "lucide-react";

const GOLD = "#d4b461";

interface Props {
  webinarCode: string;
  viewerId: string;
  viewerName: string;
  viewerEmail?: string;
  onClose: () => void;
}

export function PostWebinarSurvey({ webinarCode, viewerId, viewerName, viewerEmail, onClose }: Props) {
  const [submitted, setSubmitted] = useState(false);
  const [rating, setRating] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [survey, setSurvey] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Fetch survey on mount
  useState(() => {
    fetch(`/api/webinars/public/${webinarCode}/survey`)
      .then(r => r.json())
      .then(data => { setSurvey(data); setLoading(false); })
      .catch(() => setLoading(false));
  });

  const submit = async () => {
    try {
      await fetch(`/api/webinars/public/${webinarCode}/survey/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ viewerId, viewerName, viewerEmail, answers, rating }),
      });
      setSubmitted(true);
    } catch {}
  };

  if (loading || !survey) return null;

  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <div className="w-full max-w-sm mx-4 rounded-2xl p-8 text-center" style={{ background: "#0c0c10", border: `1px solid ${GOLD}25` }}>
          <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: `${GOLD}20` }}>
            <Check className="w-7 h-7" style={{ color: GOLD }} />
          </div>
          <h3 className="text-lg font-black text-white mb-2">Thank You!</h3>
          <p className="text-sm text-zinc-400">Your feedback helps us improve.</p>
          <Button onClick={onClose} className="mt-6 font-bold" style={{ background: GOLD, color: "#000" }}>Done</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 rounded-2xl overflow-hidden" style={{ background: "#0c0c10", border: `1px solid ${GOLD}25` }}>
        {/* Header */}
        <div className="px-6 pt-6 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5" style={{ color: GOLD }} />
            <h3 className="text-base font-black text-white">{survey.title}</h3>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
        </div>

        {/* Questions */}
        <div className="px-6 pb-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {(survey.questions || []).map((q: any, i: number) => (
            <div key={q.id || i}>
              <p className="text-xs font-semibold text-zinc-300 mb-2">{q.question}</p>
              {q.type === "rating" ? (
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} onClick={() => { setRating(n); setAnswers({ ...answers, [q.id]: String(n) }); }}
                      className="p-1.5 transition-transform hover:scale-110">
                      <Star className="w-6 h-6" fill={n <= rating ? GOLD : "transparent"} style={{ color: n <= rating ? GOLD : "#52525b" }} />
                    </button>
                  ))}
                </div>
              ) : q.type === "mcq" ? (
                <div className="space-y-1">
                  {(q.options || []).map((opt: string, oi: number) => (
                    <button key={oi} onClick={() => setAnswers({ ...answers, [q.id]: opt })}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs transition-all"
                      style={{
                        background: answers[q.id] === opt ? `${GOLD}20` : "rgba(255,255,255,0.04)",
                        border: `1px solid ${answers[q.id] === opt ? `${GOLD}50` : "rgba(255,255,255,0.08)"}`,
                        color: answers[q.id] === opt ? GOLD : "#d4d4d8",
                      }}>
                      {opt}
                    </button>
                  ))}
                </div>
              ) : (
                <Textarea
                  value={answers[q.id] || ""}
                  onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })}
                  placeholder="Your answer…"
                  className="bg-zinc-800 border-zinc-700 text-white text-xs resize-none"
                  rows={2}
                />
              )}
            </div>
          ))}

          <Button onClick={submit} className="w-full h-10 font-black text-sm" style={{ background: GOLD, color: "#000" }}>
            Submit Feedback
          </Button>
        </div>
      </div>
    </div>
  );
}
