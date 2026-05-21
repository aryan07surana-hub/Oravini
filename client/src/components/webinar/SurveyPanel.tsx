import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ClipboardList, Plus, Trash2, Star, BarChart3, Users } from "lucide-react";

const GOLD = "#d4b461";

interface Props {
  webinarId: string;
}

export function SurveyPanel({ webinarId }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [title, setTitle] = useState("How was the webinar?");
  const [questions, setQuestions] = useState<{ id: string; type: string; question: string; options?: string[] }[]>([
    { id: "1", type: "rating", question: "Overall, how would you rate this webinar?" },
    { id: "2", type: "text", question: "What was the most valuable takeaway?" },
    { id: "3", type: "text", question: "What could we improve?" },
  ]);
  const [showResponses, setShowResponses] = useState(false);

  const { data: survey } = useQuery<any>({
    queryKey: [`/api/webinars/${webinarId}/survey`],
  });

  const { data: responses = [] } = useQuery<any[]>({
    queryKey: [`/api/webinars/${webinarId}/survey/responses`],
    enabled: !!survey,
  });

  const saveMut = useMutation({
    mutationFn: () => apiRequest("POST", `/api/webinars/${webinarId}/survey`, { title, questions, isActive: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/webinars/${webinarId}/survey`] });
      toast({ title: "Survey saved!" });
    },
  });

  const addQuestion = () => {
    setQuestions([...questions, { id: String(Date.now()), type: "text", question: "" }]);
  };

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const updateQuestion = (id: string, field: string, value: any) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, [field]: value } : q));
  };

  // Compute stats
  const avgRating = responses.length > 0
    ? (responses.reduce((s, r) => s + (r.rating || 0), 0) / responses.filter(r => r.rating).length).toFixed(1)
    : "–";

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-3 flex-shrink-0" style={{ borderBottom: `1px solid ${GOLD}12` }}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: `${GOLD}80` }}>Post-Webinar Survey</p>
          <div className="flex gap-1">
            {survey && (
              <Button size="sm" onClick={() => setShowResponses(!showResponses)}
                className="h-6 text-[10px] gap-1 bg-zinc-800 text-zinc-300 border-0">
                <BarChart3 className="w-3 h-3" /> {responses.length}
              </Button>
            )}
          </div>
        </div>
        {survey && (
          <div className="flex items-center gap-4 px-2.5 py-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.03)" }}>
            <div className="text-center">
              <p className="text-lg font-black" style={{ color: GOLD }}>{avgRating}</p>
              <p className="text-[9px] text-zinc-500">Avg Rating</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-black text-white">{responses.length}</p>
              <p className="text-[9px] text-zinc-500">Responses</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {showResponses ? (
          // Show Responses
          <>
            <p className="text-xs font-bold text-white mb-2">Survey Responses</p>
            {responses.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-6">No responses yet</p>
            ) : (
              responses.map((r: any, i: number) => (
                <div key={r.id || i} className="rounded-xl p-2.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold text-white">{r.viewerName || "Anonymous"}</span>
                    {r.rating && (
                      <span className="flex items-center gap-0.5 text-[10px] font-bold" style={{ color: GOLD }}>
                        <Star className="w-3 h-3" fill={GOLD} /> {r.rating}/5
                      </span>
                    )}
                  </div>
                  {Object.entries(r.answers || {}).map(([qId, answer]) => (
                    <p key={qId} className="text-[10px] text-zinc-400 mt-0.5">"{String(answer)}"</p>
                  ))}
                </div>
              ))
            )}
          </>
        ) : (
          // Edit Survey
          <>
            <div>
              <label className="text-[10px] text-zinc-400 mb-1 block">Survey Title</label>
              <Input value={title} onChange={e => setTitle(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white text-xs h-7" />
            </div>

            {questions.map((q, i) => (
              <div key={q.id} className="rounded-xl p-2.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-bold text-zinc-500">Q{i + 1}</span>
                  <select value={q.type} onChange={e => updateQuestion(q.id, "type", e.target.value)}
                    className="bg-zinc-800 border border-zinc-700 rounded text-[10px] text-white px-1.5 py-0.5">
                    <option value="rating">Rating (1-5)</option>
                    <option value="text">Text</option>
                    <option value="mcq">Multiple Choice</option>
                  </select>
                  <button onClick={() => removeQuestion(q.id)} className="ml-auto text-zinc-600 hover:text-red-400">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <Input value={q.question} onChange={e => updateQuestion(q.id, "question", e.target.value)}
                  placeholder="Your question…" className="bg-zinc-800 border-zinc-700 text-white text-xs h-7" />
              </div>
            ))}

            <button onClick={addQuestion}
              className="w-full py-2 rounded-xl text-[10px] font-bold text-zinc-400 flex items-center justify-center gap-1 transition-all hover:text-white"
              style={{ border: "1px dashed rgba(255,255,255,0.1)" }}>
              <Plus className="w-3 h-3" /> Add Question
            </button>

            <Button size="sm" onClick={() => saveMut.mutate()} className="w-full h-8 text-xs font-bold" style={{ background: GOLD, color: "#000" }}>
              {survey ? "Update Survey" : "Create Survey"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
