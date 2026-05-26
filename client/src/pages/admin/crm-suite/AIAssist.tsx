import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Wand2, X, CheckCircle2, Bot, Mail, Lightbulb } from "lucide-react";

const GOLD = "#d4b461";
const GOLD_BRIGHT = "#f0c84b";

/* ─────────────────────────────────────────────────────────
   AI Pipeline Builder — describe your sales process, get a
   custom pipeline created with stages, colors, probabilities.
───────────────────────────────────────────────────────── */
export function AIPipelineBuilder({ onClose }: { onClose: () => void }) {
  const [description, setDescription] = useState("");
  const [name, setName] = useState("");
  const { toast } = useToast();

  const buildMut = useMutation({
    mutationFn: () => apiRequest("POST", "/api/crm-suite/ai/build-pipeline", { description, name: name || undefined }),
    onSuccess: (r: any) => {
      toast({
        title: r.aiUsed ? "AI built your pipeline" : "Pipeline created (default — AI offline)",
        description: `${r.stages?.length ?? 0} stages ready. Open Pipelines to see it.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/crm-suite/pipelines"] });
      queryClient.invalidateQueries({ queryKey: ["/api/crm-suite/dashboard"] });
      onClose();
    },
    onError: (e: any) => toast({ title: "Couldn't build pipeline", description: e.message, variant: "destructive" }),
  });

  const presets = [
    { label: "Coaching / Consulting", text: "I sell 1-on-1 coaching packages. Leads come from Instagram DMs and discovery calls. I want to track from first DM to discovery call to package signed." },
    { label: "Course / Digital Product", text: "I sell an online course. Leads come from a webinar funnel. I want to track from webinar registration to attendance to checkout to refund window." },
    { label: "Agency / Done-For-You", text: "I run an agency offering monthly retainers. Leads come from inbound + outbound. I want to track from first call to scope, proposal, contract, kickoff." },
    { label: "SaaS / Software", text: "I sell a SaaS subscription. Leads come from a free trial. I want to track from trial signup to activation to upgrade to expansion." },
  ];

  return (
    <div style={modalBackdrop()}>
      <div style={modalBox(620)}>
        <Header title="Build a pipeline with AI" icon={<Wand2 className="w-4 h-4" style={{ color: GOLD }} />} onClose={onClose} />
        <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 12, maxHeight: "75vh", overflowY: "auto" }}>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.7 }}>
            Describe your sales process in plain English. AI will craft the right stages, colors, and probabilities.
          </div>

          <div>
            <Label>Pipeline name (optional)</Label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Coaching Sales Pipeline" style={inputStyle()} />
          </div>

          <div>
            <Label>What do you sell? How does the process work?</Label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={5}
              placeholder="e.g. I sell 1-on-1 coaching packages. Leads come from Instagram DMs, do a discovery call, then sign for a 12-week program. I want to track every stage from DM to signed contract."
              style={{ ...inputStyle(), resize: "vertical", minHeight: 120, fontFamily: "inherit" }}
            />
          </div>

          <div>
            <Label>Quick presets</Label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
              {presets.map(p => (
                <button key={p.label} onClick={() => setDescription(p.text)} style={pill()}>{p.label}</button>
              ))}
            </div>
          </div>
        </div>

        <Footer
          onCancel={onClose}
          submitLabel={buildMut.isPending ? "Building…" : "Build pipeline"}
          submitIcon={<Sparkles className="w-3.5 h-3.5" />}
          disabled={!description.trim() || buildMut.isPending}
          onSubmit={() => buildMut.mutate()}
        />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   AI Quick-Add — describe a lead, AI fills the form.
───────────────────────────────────────────────────────── */
export function AIQuickAddContact({ onClose }: { onClose: () => void }) {
  const [description, setDescription] = useState("");
  const [extracted, setExtracted] = useState<any | null>(null);
  const { toast } = useToast();

  const enrichMut = useMutation({
    mutationFn: () => apiRequest("POST", "/api/crm-suite/ai/enrich-contact", { description }),
    onSuccess: (r: any) => setExtracted(r.contact || null),
    onError: (e: any) => toast({ title: "AI enrichment failed", description: e.message, variant: "destructive" }),
  });

  const createMut = useMutation({
    mutationFn: () => apiRequest("POST", "/api/crm-suite/contacts", {
      ...extracted,
      source: "ai-quick-add",
    }),
    onSuccess: () => {
      toast({ title: "Contact added" });
      queryClient.invalidateQueries({ queryKey: ["/api/crm-suite/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/crm-suite/dashboard"] });
      onClose();
    },
    onError: (e: any) => toast({ title: "Couldn't save", description: e.message, variant: "destructive" }),
  });

  return (
    <div style={modalBackdrop()}>
      <div style={modalBox(580)}>
        <Header title="Quick-add contact with AI" icon={<Bot className="w-4 h-4" style={{ color: GOLD }} />} onClose={onClose} />
        <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 12, maxHeight: "75vh", overflowY: "auto" }}>
          {!extracted ? (
            <>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.7 }}>
                Paste anything — a DM, an email signature, a LinkedIn bio, your own notes. AI extracts the contact details.
              </div>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={6}
                placeholder={'e.g. "Just got a DM from Sarah — she runs a fitness studio in Austin, 50K Instagram followers, asking about my coaching package, ready to start in 2 weeks"'}
                style={{ ...inputStyle(), resize: "vertical", minHeight: 140, fontFamily: "inherit" }}
              />
            </>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: `${GOLD}10`, border: `1px solid ${GOLD}55`, borderRadius: 10 }}>
                <CheckCircle2 className="w-4 h-4" style={{ color: GOLD }} />
                <span style={{ fontSize: 12.5, color: "#fff" }}>Review what AI pulled out and edit before saving.</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Editable label="First name" value={extracted.firstName || ""} onChange={v => setExtracted({ ...extracted, firstName: v })} />
                <Editable label="Last name" value={extracted.lastName || ""} onChange={v => setExtracted({ ...extracted, lastName: v })} />
                <Editable label="Email" value={extracted.email || ""} onChange={v => setExtracted({ ...extracted, email: v })} />
                <Editable label="Phone" value={extracted.phone || ""} onChange={v => setExtracted({ ...extracted, phone: v })} />
                <Editable label="Company" value={extracted.company || ""} onChange={v => setExtracted({ ...extracted, company: v })} />
                <Editable label="Title" value={extracted.title || ""} onChange={v => setExtracted({ ...extracted, title: v })} />
                <Editable label="Instagram" value={extracted.instagram || ""} onChange={v => setExtracted({ ...extracted, instagram: v })} />
                <Editable label="Status" value={extracted.status || "lead"} onChange={v => setExtracted({ ...extracted, status: v })} />
                <Editable label="Score (0-100)" value={String(extracted.score ?? 0)} onChange={v => setExtracted({ ...extracted, score: parseInt(v) || 0 })} />
                <Editable label="Tags (comma)" value={(extracted.tags || []).join(", ")} onChange={v => setExtracted({ ...extracted, tags: v.split(",").map((s: string) => s.trim()).filter(Boolean) })} />
              </div>
              <Editable label="Notes" value={extracted.notes || ""} onChange={v => setExtracted({ ...extracted, notes: v })} multiline />
            </>
          )}
        </div>
        <Footer
          onCancel={onClose}
          submitLabel={extracted
            ? (createMut.isPending ? "Saving…" : "Save contact")
            : (enrichMut.isPending ? "Reading…" : "Extract with AI")}
          submitIcon={extracted ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
          disabled={extracted ? createMut.isPending : (!description.trim() || enrichMut.isPending)}
          onSubmit={() => extracted ? createMut.mutate() : enrichMut.mutate()}
        />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   AI suggest-action button — works inside a contact drawer.
   Pops a small modal with the suggested action + one-click apply.
───────────────────────────────────────────────────────── */
export function AISuggestAction({ contactId, onClose }: { contactId: string; onClose: () => void }) {
  const { toast } = useToast();
  const [suggestion, setSuggestion] = useState<any | null>(null);
  const fetchMut = useMutation({
    mutationFn: () => apiRequest("POST", `/api/crm-suite/ai/suggest-action/${contactId}`),
    onSuccess: (r: any) => setSuggestion(r.suggestion || null),
    onError: (e: any) => toast({ title: "AI unavailable", description: e.message, variant: "destructive" }),
  });

  const applyMut = useMutation({
    mutationFn: async () => {
      // Update the contact's score + tags
      const updates: any = {};
      if (typeof suggestion.scoreSuggestion === "number") updates.score = suggestion.scoreSuggestion;
      if (Array.isArray(suggestion.tagsToAdd) && suggestion.tagsToAdd.length) {
        // We'll let the server union tags via PATCH on contact; simpler: re-fetch and append
        // For now PATCH score only and create a task for the action
        updates.score = updates.score ?? undefined;
      }
      if (Object.keys(updates).length) {
        await apiRequest("PATCH", `/api/crm-suite/contacts/${contactId}`, updates);
      }
      // Log the suggestion as a system activity
      await apiRequest("POST", "/api/crm-suite/activities", {
        contactId, type: "system",
        title: `AI suggested: ${suggestion.title}`,
        body: suggestion.body,
        metadata: suggestion,
      });
      // For "wait" suggestions, create a follow-up task
      if (suggestion.action === "wait" && suggestion.waitDays > 0) {
        const due = new Date();
        due.setDate(due.getDate() + suggestion.waitDays);
        await apiRequest("POST", "/api/crm-suite/tasks", {
          contactId, title: `Follow up: ${suggestion.title}`,
          description: suggestion.body, dueAt: due.toISOString(),
          priority: "normal",
        });
      } else {
        // For other actionable suggestions, drop a task with today's date
        await apiRequest("POST", "/api/crm-suite/tasks", {
          contactId, title: suggestion.title,
          description: suggestion.body, priority: "normal",
        });
      }
    },
    onSuccess: () => {
      toast({ title: "Applied", description: "Activity logged + task created." });
      queryClient.invalidateQueries({ queryKey: [`/api/crm-suite/contacts/${contactId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/crm-suite/tasks"] });
      onClose();
    },
    onError: (e: any) => toast({ title: "Couldn't apply", description: e.message, variant: "destructive" }),
  });

  // Auto-fetch on open
  useState(() => { fetchMut.mutate(); return null; });

  return (
    <div style={modalBackdrop()}>
      <div style={modalBox(520)}>
        <Header title="AI: next-best action" icon={<Lightbulb className="w-4 h-4" style={{ color: GOLD }} />} onClose={onClose} />
        <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 12 }}>
          {fetchMut.isPending && !suggestion && (
            <div style={{ padding: 24, textAlign: "center", color: "rgba(255,255,255,0.5)" }}>Thinking…</div>
          )}
          {suggestion && (
            <>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 10px", borderRadius: 99, background: `${GOLD}22`, color: GOLD, textTransform: "uppercase", letterSpacing: "0.06em" }}>{suggestion.action}</span>
                {suggestion.waitDays > 0 && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.55)" }}>in {suggestion.waitDays} day{suggestion.waitDays === 1 ? "" : "s"}</span>}
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>{suggestion.title}</div>
              <div style={{ fontSize: 13.5, color: "rgba(255,255,255,0.7)", lineHeight: 1.7 }}>{suggestion.body}</div>
              {typeof suggestion.scoreSuggestion === "number" && (
                <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8 }}>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.55)" }}>Suggested score</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: GOLD }}>★ {suggestion.scoreSuggestion}</span>
                </div>
              )}
              {Array.isArray(suggestion.tagsToAdd) && suggestion.tagsToAdd.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {suggestion.tagsToAdd.map((t: string) => (
                    <span key={t} style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 99, background: "rgba(212,180,97,0.1)", border: "1px solid rgba(212,180,97,0.3)", color: GOLD }}>+{t}</span>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        <Footer
          onCancel={onClose}
          submitLabel={applyMut.isPending ? "Applying…" : "Apply (log + create task)"}
          submitIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
          disabled={!suggestion || applyMut.isPending}
          onSubmit={() => applyMut.mutate()}
        />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   AI Email drafter
───────────────────────────────────────────────────────── */
export function AIEmailDrafter({ contactId, onClose }: { contactId: string; onClose: () => void }) {
  const { toast } = useToast();
  const [goal, setGoal] = useState("");
  const [tone, setTone] = useState("warm, direct");
  const [length, setLength] = useState<"short" | "medium" | "long">("medium");
  const [draft, setDraft] = useState<{ subject: string; body: string } | null>(null);

  const draftMut = useMutation({
    mutationFn: () => apiRequest("POST", `/api/crm-suite/ai/draft-email/${contactId}`, { goal, tone, length }),
    onSuccess: (r: any) => setDraft(r.draft || null),
    onError: (e: any) => toast({ title: "AI unavailable", description: e.message, variant: "destructive" }),
  });

  const logMut = useMutation({
    mutationFn: () => apiRequest("POST", "/api/crm-suite/activities", {
      contactId, type: "email",
      title: `Email drafted: ${draft?.subject || ""}`,
      body: `${draft?.subject ? `Subject: ${draft?.subject}\n\n` : ""}${draft?.body || ""}`,
    }),
    onSuccess: () => {
      toast({ title: "Logged on contact timeline" });
      queryClient.invalidateQueries({ queryKey: [`/api/crm-suite/contacts/${contactId}`] });
      onClose();
    },
  });

  const copy = () => {
    if (!draft) return;
    navigator.clipboard.writeText(`Subject: ${draft.subject}\n\n${draft.body}`);
    toast({ title: "Copied to clipboard" });
  };

  return (
    <div style={modalBackdrop()}>
      <div style={modalBox(640)}>
        <Header title="AI: draft an email" icon={<Mail className="w-4 h-4" style={{ color: GOLD }} />} onClose={onClose} />
        <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 12, maxHeight: "75vh", overflowY: "auto" }}>
          {!draft ? (
            <>
              <Editable label="Goal of the email" value={goal} onChange={setGoal} placeholder="e.g. Push them to book a discovery call" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Editable label="Tone" value={tone} onChange={setTone} placeholder="warm, direct, no fluff" />
                <div>
                  <Label>Length</Label>
                  <select value={length} onChange={e => setLength(e.target.value as any)} style={{ ...inputStyle(), cursor: "pointer", appearance: "none" }}>
                    <option value="short" style={{ background: "#0a0a0c" }}>Short (3-5 sentences)</option>
                    <option value="medium" style={{ background: "#0a0a0c" }}>Medium (5-7 sentences)</option>
                    <option value="long" style={{ background: "#0a0a0c" }}>Long (8-12 sentences)</option>
                  </select>
                </div>
              </div>
            </>
          ) : (
            <>
              <Editable label="Subject" value={draft.subject} onChange={v => setDraft({ ...draft, subject: v })} />
              <div>
                <Label>Body</Label>
                <textarea
                  value={draft.body}
                  onChange={e => setDraft({ ...draft, body: e.target.value })}
                  rows={12}
                  style={{ ...inputStyle(), resize: "vertical", minHeight: 280, fontFamily: "inherit" }}
                />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={copy} style={ghostBtn()}>Copy to clipboard</button>
                <button onClick={() => setDraft(null)} style={ghostBtn()}>Regenerate</button>
              </div>
            </>
          )}
        </div>
        <Footer
          onCancel={onClose}
          submitLabel={draft
            ? (logMut.isPending ? "Logging…" : "Log on timeline")
            : (draftMut.isPending ? "Drafting…" : "Generate draft")}
          submitIcon={draft ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
          disabled={draft ? logMut.isPending : draftMut.isPending}
          onSubmit={() => draft ? logMut.mutate() : draftMut.mutate()}
        />
      </div>
    </div>
  );
}

/* ─── shared primitives ─── */
function Header({ title, icon, onClose }: { title: string; icon: React.ReactNode; onClose: () => void }) {
  return (
    <div style={{ padding: "16px 22px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {icon}
        <div style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>{title}</div>
      </div>
      <button onClick={onClose} style={{ background: "none", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)", borderRadius: 8, padding: "8px 10px", cursor: "pointer" }}>
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
function Footer({ onCancel, onSubmit, submitLabel, submitIcon, disabled }: { onCancel: () => void; onSubmit: () => void; submitLabel: string; submitIcon: React.ReactNode; disabled?: boolean }) {
  return (
    <div style={{ padding: "14px 22px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "flex-end", gap: 10 }}>
      <button onClick={onCancel} style={ghostBtn()}>Cancel</button>
      <button
        onClick={onSubmit}
        disabled={!!disabled}
        style={{
          background: disabled ? "rgba(255,255,255,0.04)" : `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`,
          color: disabled ? "rgba(255,255,255,0.3)" : "#000",
          border: "none", borderRadius: 10, padding: "10px 18px", fontWeight: 800, fontSize: 13,
          cursor: disabled ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", gap: 8,
        }}
      >
        {submitIcon}
        {submitLabel}
      </button>
    </div>
  );
}
function Editable({ label, value, onChange, placeholder, multiline }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean }) {
  return (
    <div>
      <Label>{label}</Label>
      {multiline ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3}
          style={{ ...inputStyle(), resize: "vertical", minHeight: 80, fontFamily: "inherit" }} />
      ) : (
        <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={inputStyle()} />
      )}
    </div>
  );
}
function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 800, color: GOLD, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>{children}</div>;
}
function inputStyle(): React.CSSProperties {
  return { width: "100%", background: "rgba(255,255,255,0.04)", border: `1px solid ${GOLD}22`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 13, outline: "none", fontFamily: "inherit" };
}
function ghostBtn(): React.CSSProperties {
  return { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", borderRadius: 10, padding: "10px 16px", cursor: "pointer", fontSize: 12 };
}
function pill(): React.CSSProperties {
  return { background: "rgba(255,255,255,0.04)", border: `1px solid ${GOLD}33`, color: "rgba(255,255,255,0.85)", borderRadius: 99, padding: "6px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer" };
}
function modalBackdrop(): React.CSSProperties {
  return { position: "fixed", inset: 0, zIndex: 380, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 };
}
function modalBox(width: number): React.CSSProperties {
  return { background: "#0a0a0c", border: `1px solid ${GOLD}33`, borderRadius: 16, width: `min(${width}px, 100%)`, maxHeight: "92vh", display: "flex", flexDirection: "column", overflow: "hidden" };
}
