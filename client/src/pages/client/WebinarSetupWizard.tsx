import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import ClientLayout from "@/components/layout/ClientLayout";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { deckEmbed, formatIST, parseYouTubeVideoId } from "@shared/webinarFunnel";
import {
  AlertCircle, ArrowLeft, ArrowRight, ArrowUpRight, Bell, CalendarClock, Check, CheckCircle2, ChevronRight, Copy,
  FileUp, Link2, Loader2, PartyPopper, Radio, Sparkles, Upload, Wand2, X,
} from "lucide-react";
import {
  Field, GOLD, fromISTInput, inputCls, inputErrStyle, inputStyle, toISTInput, uploadDeck, type WebinarFunnelFull,
} from "@/components/webinar-funnel/hostUtils";
import {
  WIZARD_STEP_COUNT, blankWizardState as blank, parseSavedWizardState, shouldPersistWizardState, type WizardState,
} from "@/components/webinar-funnel/wizardState";

// ── Wizard state (persisted in localStorage so it's resumable; see wizardState.ts) ──
const storageKey = (id?: string) => `oravini:webinar-wizard:${id || "new"}`;
function loadState(id?: string): WizardState | null {
  try { return parseSavedWizardState(localStorage.getItem(storageKey(id))); } catch { return null; }
}
function persistState(id: string | undefined, s: WizardState) {
  if (!shouldPersistWizardState(s)) return;
  try { localStorage.setItem(storageKey(id), JSON.stringify(s)); } catch {}
}
function clearState(id?: string) {
  try { localStorage.removeItem(storageKey(id)); } catch {}
}

const STEPS = [
  { title: "Enable live streaming", short: "Enable streaming", blurb: "One-time YouTube setup" },
  { title: "Schedule your stream", short: "Schedule stream", blurb: "Create it in YouTube Studio" },
  { title: "Paste your link", short: "Paste link", blurb: "Preview what viewers see" },
  { title: "Slides & offer", short: "Slides & offer", blurb: "Deck, CTA and pricing" },
  { title: "Schedule & publish", short: "Publish", blurb: "Go-live time and launch" },
];

// ── Small building blocks ───────────────────────────────────────────────────
function CheckItem({ checked, onChange, children, testid }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode; testid?: string }) {
  return (
    // div+role (not <button>) because items contain links, which can't nest inside buttons
    <div role="checkbox" aria-checked={checked} tabIndex={0} onClick={() => onChange(!checked)} data-testid={testid}
      onKeyDown={e => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); onChange(!checked); } }}
      className="w-full text-left flex items-start gap-3 p-3.5 rounded-xl transition-all cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-[#d4b461]/50"
      style={{ background: checked ? "rgba(52,211,153,0.06)" : "rgba(255,255,255,0.02)", border: `1px solid ${checked ? "rgba(52,211,153,0.25)" : "rgba(255,255,255,0.06)"}` }}>
      <span className="mt-0.5 w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center transition-all"
        style={checked ? { background: "#34d399", color: "#0a0910" } : { border: "1.5px solid rgba(255,255,255,0.2)" }}>
        {checked && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
      </span>
      <span className="text-[13px] leading-relaxed text-zinc-300">{children}</span>
    </div>
  );
}

function ExtLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
      className="inline-flex items-center gap-0.5 font-semibold underline decoration-dotted underline-offset-2 hover:brightness-125" style={{ color: GOLD }}>
      {children}<ArrowUpRight className="w-3 h-3" />
    </a>
  );
}

function Path({ items }: { items: string[] }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1 align-middle">
      {items.map((it, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          <span className="px-1.5 py-0.5 rounded-md text-[11px] font-semibold text-zinc-200" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>{it}</span>
          {i < items.length - 1 && <ChevronRight className="w-3 h-3 text-zinc-600" />}
        </span>
      ))}
    </span>
  );
}

function Callout({ tone = "gold", children }: { tone?: "gold" | "warn"; children: React.ReactNode }) {
  const c = tone === "warn" ? { bg: "rgba(251,191,36,0.06)", bd: "rgba(251,191,36,0.22)", fg: "#fbbf24" } : { bg: `${GOLD}0d`, bd: `${GOLD}30`, fg: GOLD };
  return (
    <div className="flex gap-2.5 p-3.5 rounded-xl text-[12.5px] leading-relaxed text-zinc-300" style={{ background: c.bg, border: `1px solid ${c.bd}` }}>
      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: c.fg }} />
      <div>{children}</div>
    </div>
  );
}

// ── Step 3 preview with an embeddability check ─────────────────────────────
type VideoCheck = { state: "idle" | "checking" | "ok" | "bad" | "unknown"; reason?: string; title?: string | null };
function useVideoCheck(videoId: string | null) {
  const [check, setCheck] = useState<VideoCheck>({ state: "idle" });
  useEffect(() => {
    if (!videoId) { setCheck({ state: "idle" }); return; }
    let cancelled = false;
    setCheck({ state: "checking" });
    const t = setTimeout(async () => {
      try {
        const r = await apiRequest("GET", `/api/webinar-funnels/tools/check-video?id=${videoId}`);
        if (cancelled) return;
        if (r.ok === true) setCheck({ state: "ok", title: r.title });
        else if (r.ok === false) setCheck({ state: "bad", reason: r.reason });
        else setCheck({ state: "unknown" });
      } catch { if (!cancelled) setCheck({ state: "unknown" }); }
    }, 450);
    return () => { cancelled = true; clearTimeout(t); };
  }, [videoId]);
  return check;
}

// ── Main ────────────────────────────────────────────────────────────────────
export default function WebinarSetupWizard({ id }: { id?: string }) {
  const editingId = id && id !== "new" ? id : undefined;
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { data: existing, isLoading } = useQuery<WebinarFunnelFull | null>({ queryKey: [`/api/webinar-funnels/${editingId}`], enabled: !!editingId });

  const [s, setS] = useState<WizardState>(() => loadState(editingId) || blank());
  const hydrated = useRef(false);
  const set = <K extends keyof WizardState>(k: K, v: WizardState[K]) => setS(prev => ({ ...prev, [k]: v }));

  // Hydrate from an existing webinar once (resuming setup on a created webinar).
  useEffect(() => {
    if (!existing || hydrated.current) return;
    hydrated.current = true;
    setS(prev => ({
      ...prev,
      youtube: prev.youtube || existing.youtubeVideoId || "",
      deckUrl: prev.deckUrl || existing.deckUrl || "",
      deckMode: (prev.deckUrl || existing.deckUrl || "").startsWith("/uploads/") || !(prev.deckUrl || existing.deckUrl) ? prev.deckMode : "link",
      ctaText: prev.ctaText || existing.ctaText || "",
      ctaUrl: prev.ctaUrl || existing.ctaUrl || "",
      offerText: prev.offerText || existing.offerText || "",
      offerPrice: prev.offerPrice || existing.offerPrice || "",
      offerExpiresLocal: prev.offerExpiresLocal || toISTInput(existing.offerExpiresAt),
      title: prev.title || existing.title,
      description: prev.description || existing.description || "",
      hostName: prev.hostName || existing.hostName || "",
      scheduledLocal: prev.scheduledLocal || toISTInput(existing.scheduledAt),
      durationMinutes: existing.durationMinutes || prev.durationMinutes,
      remindersEnabled: existing.remindersEnabled ?? prev.remindersEnabled,
      publish: existing.status !== "draft" || prev.publish,
      createdId: existing.id,
    }));
  }, [existing]);

  useEffect(() => { persistState(editingId, s); }, [s, editingId]);

  // Derived validation
  const videoId = parseYouTubeVideoId(s.youtube);
  const youtubeInvalid = s.youtube.trim() !== "" && !videoId;
  const videoCheck = useVideoCheck(videoId);
  const ctaUrlInvalid = s.ctaUrl.trim() !== "" && !/^https?:\/\/\S+$/i.test(s.ctaUrl.trim());
  const ctaIncomplete = (!!s.ctaText.trim()) !== (!!s.ctaUrl.trim());
  const deckLinkInvalid = s.deckMode === "link" && s.deckUrl.trim() !== "" && !/^https?:\/\/\S+$/i.test(s.deckUrl.trim());
  const scheduledIso = fromISTInput(s.scheduledLocal);
  const offerExpiresIso = fromISTInput(s.offerExpiresLocal);

  const canContinue = [
    s.channelReady,
    s.streamScheduled,
    !youtubeInvalid,
    !ctaUrlInvalid && !ctaIncomplete && !deckLinkInvalid,
    !!s.title.trim() && !!scheduledIso,
  ][Math.min(s.step, 4)];

  const [saving, setSaving] = useState(false);
  const [finished, setFinished] = useState<WebinarFunnelFull | null>(null);

  const buildBody = () => ({
    title: s.title.trim(),
    description: s.description.trim() || null,
    hostName: s.hostName.trim() || null,
    scheduledAt: scheduledIso,
    youtube: s.youtube.trim() || null,
    ctaText: s.ctaText.trim() || null,
    ctaUrl: s.ctaUrl.trim() || null,
    deckUrl: s.deckUrl.trim() || null,
    offerText: s.offerText.trim() || null,
    offerPrice: s.offerPrice.trim() || null,
    offerExpiresAt: offerExpiresIso,
    durationMinutes: s.durationMinutes,
    remindersEnabled: s.remindersEnabled,
    status: s.publish ? "published" : "draft",
  });

  const finish = async () => {
    setSaving(true);
    try {
      const targetId = editingId || s.createdId;
      const body = buildBody();
      // Don't silently un-end an ended webinar when re-running setup.
      if (existing?.status === "ended" && s.publish) (body as any).status = "ended";
      const row: WebinarFunnelFull = targetId
        ? await apiRequest("PATCH", `/api/webinar-funnels/${targetId}`, body)
        : await apiRequest("POST", "/api/webinar-funnels", body);
      queryClient.invalidateQueries({ queryKey: ["/api/webinar-funnels"] });
      queryClient.setQueryData([`/api/webinar-funnels/${row.id}`], row);
      clearState(editingId);
      // Past the last step = finished; persistState() skips it so a revisit starts fresh.
      setS(prev => ({ ...prev, createdId: row.id, step: WIZARD_STEP_COUNT }));
      setFinished(row);
    } catch (e: any) {
      toast({ title: "Couldn't save your webinar", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const next = () => {
    if (!canContinue) return;
    if (s.step === 4) { finish(); return; }
    set("step", s.step + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const back = () => set("step", Math.max(0, s.step - 1));

  const advancedHref = editingId ? `/tools/webinars/${editingId}` : "/tools/webinars/new?mode=advanced";

  if (editingId && isLoading) {
    return <ClientLayout><div className="max-w-5xl mx-auto px-6 py-10"><div className="h-96 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.03)" }} /></div></ClientLayout>;
  }

  return (
    <ClientLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
          <button onClick={() => navigate("/tools/webinars")} className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-300">
            <ArrowLeft className="w-3.5 h-3.5" /> All webinars
          </button>
          {!finished && (
            <button onClick={() => navigate(advancedHref)} data-testid="link-advanced-form"
              className="text-[11px] font-semibold text-zinc-500 hover:text-zinc-200 px-3 py-1.5 rounded-lg transition-colors" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
              Advanced: plain form →
            </button>
          )}
        </div>

        <div className="mb-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] mb-2 flex items-center gap-1.5" style={{ color: GOLD }}><Wand2 className="w-3 h-3" /> Guided setup</p>
          <h1 className="text-2xl sm:text-[28px] font-black text-white tracking-tight leading-tight">
            {finished ? "You're ready to go live." : editingId ? `Set up “${existing?.title || "your webinar"}”` : "Launch a YouTube Live webinar"}
          </h1>
          {!finished && <p className="text-sm text-zinc-500 mt-1.5">Five short steps. Your progress saves automatically — close the tab and pick up where you left off.</p>}
        </div>

        {finished ? (
          <FinishedRecap row={finished} onEdit={() => navigate(`/tools/webinars/${finished.id}`)} onAll={() => navigate("/tools/webinars")} />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[230px_minmax(0,1fr)]">
            {/* Step rail */}
            <nav aria-label="Setup steps" className="lg:sticky lg:top-6 self-start">
              <div className="lg:hidden mb-1">
                <div className="flex items-center justify-between text-[11px] text-zinc-500 mb-2">
                  <span>Step {s.step + 1} of 5 · <b className="text-zinc-300">{STEPS[s.step].short}</b></span>
                  <span className="tabular-nums">{Math.round((s.step / 5) * 100)}%</span>
                </div>
                <div className="h-1 rounded-full bg-white/5 overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${((s.step + 1) / 5) * 100}%`, background: GOLD }} /></div>
              </div>
              <ol className="hidden lg:block relative">
                {STEPS.map((st, i) => {
                  const done = i < s.step, active = i === s.step;
                  return (
                    <li key={i} className="relative pb-6 last:pb-0">
                      {i < STEPS.length - 1 && <span className="absolute left-[15px] top-8 bottom-0 w-px" style={{ background: done ? `${GOLD}70` : "rgba(255,255,255,0.08)" }} />}
                      <button type="button" onClick={() => i <= s.step && set("step", i)} disabled={i > s.step} data-testid={`rail-step-${i + 1}`}
                        className="flex items-start gap-3 text-left disabled:cursor-default group">
                        <span className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-black transition-all"
                          style={active ? { background: GOLD, color: "#0a0910", boxShadow: `0 0 0 4px ${GOLD}22` }
                            : done ? { background: `${GOLD}22`, color: GOLD, border: `1px solid ${GOLD}55` }
                            : { background: "rgba(255,255,255,0.03)", color: "#52525b", border: "1px solid rgba(255,255,255,0.08)" }}>
                          {done ? <Check className="w-4 h-4" strokeWidth={3} /> : i + 1}
                        </span>
                        <span className="pt-1">
                          <span className={`block text-[13px] font-bold ${active ? "text-white" : done ? "text-zinc-300 group-hover:text-white" : "text-zinc-600"}`}>{st.short}</span>
                          <span className="block text-[11px] text-zinc-600">{st.blurb}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </nav>

            {/* Step card */}
            <section className="rounded-2xl overflow-hidden" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.025), rgba(255,255,255,0.01))", border: "1px solid rgba(255,255,255,0.07)" }} data-testid={`wizard-step-${s.step + 1}`}>
              <div className="px-5 sm:px-7 pt-6 pb-5 border-b border-white/[0.05]">
                <p className="text-[11px] font-bold tabular-nums mb-1" style={{ color: GOLD }}>STEP {String(s.step + 1).padStart(2, "0")}</p>
                <h2 className="text-lg sm:text-xl font-black text-white">{STEPS[s.step].title}</h2>
              </div>

              <div className="px-5 sm:px-7 py-6 space-y-4">
                {s.step === 0 && <Step1 s={s} set={set} />}
                {s.step === 1 && <Step2 s={s} set={set} />}
                {s.step === 2 && <Step3 s={s} set={set} videoId={videoId} invalid={youtubeInvalid} check={videoCheck} />}
                {s.step === 3 && <Step4 s={s} set={set} ctaUrlInvalid={ctaUrlInvalid} ctaIncomplete={ctaIncomplete} deckLinkInvalid={deckLinkInvalid} />}
                {s.step === 4 && <Step5 s={s} set={set} scheduledIso={scheduledIso} existingStatus={existing?.status} />}
              </div>

              <div className="px-5 sm:px-7 py-4 flex items-center justify-between gap-3 border-t border-white/[0.05]" style={{ background: "rgba(0,0,0,0.15)" }}>
                <button onClick={back} disabled={s.step === 0} data-testid="btn-wizard-back"
                  className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-200 disabled:opacity-0 transition-colors">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <div className="flex items-center gap-3">
                  {(s.step === 0 || s.step === 1) && !canContinue && (
                    <span className="hidden sm:inline text-[11px] text-zinc-600">Tick the box above to continue</span>
                  )}
                  <button onClick={next} disabled={!canContinue || saving} data-testid="btn-wizard-next"
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all hover:-translate-y-0.5 disabled:opacity-30 disabled:hover:translate-y-0"
                    style={{ background: GOLD, color: "#0a0910", boxShadow: canContinue ? `0 8px 30px -10px ${GOLD}` : "none" }}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {s.step === 4 ? (s.publish ? "Publish webinar" : "Save as draft") : s.step === 2 && !s.youtube.trim() ? "Skip for now" : "Continue"}
                    {!saving && <ArrowRight className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </ClientLayout>
  );
}

type StepProps = { s: WizardState; set: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void };

function Step1({ s, set }: StepProps) {
  const toggle = (i: number, v: boolean) => set("checks1", s.checks1.map((c, j) => (j === i ? v : c)));
  return (
    <>
      <p className="text-sm text-zinc-400 leading-relaxed">YouTube makes every channel switch on live streaming once. If you've streamed before, tick the box at the bottom and move on.</p>
      <div className="space-y-2">
        <CheckItem checked={s.checks1[0]} onChange={v => toggle(0, v)} testid="check1-features">
          Open <ExtLink href="https://www.youtube.com/features">youtube.com/features</ExtLink> while signed in to the channel you'll stream from.
        </CheckItem>
        <CheckItem checked={s.checks1[1]} onChange={v => toggle(1, v)} testid="check1-verify">
          Verify your phone number if asked (<ExtLink href="https://www.youtube.com/verify">youtube.com/verify</ExtLink>) — YouTube texts you a code.
        </CheckItem>
        <CheckItem checked={s.checks1[2]} onChange={v => toggle(2, v)} testid="check1-enable">
          Under <b className="text-zinc-200">Live streaming</b>, click <b className="text-zinc-200">Enable</b>.
        </CheckItem>
      </div>
      <Callout tone="warn">
        <b className="text-zinc-100">New to streaming? Plan for a 24-hour wait.</b> The first time a channel enables live streaming, YouTube can take up to 24 hours to activate it. Do this step at least a day before your webinar.
      </Callout>
      <div className="pt-2">
        <CheckItem checked={s.channelReady} onChange={v => set("channelReady", v)} testid="check-step1-done">
          <b className="text-white">I've done this</b> — live streaming is enabled on my channel.
        </CheckItem>
      </div>
    </>
  );
}

function Step2({ s, set }: StepProps) {
  const toggle = (i: number, v: boolean) => set("checks2", s.checks2.map((c, j) => (j === i ? v : c)));
  return (
    <>
      <p className="text-sm text-zinc-400 leading-relaxed">Scheduling the stream on YouTube first gives you a permanent link we can embed on your Oravini page — viewers never leave your site.</p>
      <div className="space-y-2">
        <CheckItem checked={s.checks2[0]} onChange={v => toggle(0, v)} testid="check2-studio">
          Open <ExtLink href="https://studio.youtube.com">YouTube Studio</ExtLink> and go to <Path items={["Create", "Go live"]} />
        </CheckItem>
        <CheckItem checked={s.checks2[1]} onChange={v => toggle(1, v)} testid="check2-schedule">
          Choose <Path items={["Manage", "Schedule stream"]} /> (or <b className="text-zinc-200">Schedule for later</b> on the setup screen). Add your title and the same date &amp; time you'll use here.
        </CheckItem>
        <CheckItem checked={s.checks2[2]} onChange={v => toggle(2, v)} testid="check2-visibility">
          Set visibility to <b className="text-zinc-200">Public</b> or <b className="text-zinc-200">Unlisted</b> and keep <b className="text-zinc-200">Allow embedding</b> on. Private streams can't be shown on your page.
        </CheckItem>
        <CheckItem checked={s.checks2[3]} onChange={v => toggle(3, v)} testid="check2-copy">
          Click <Path items={["Share", "Copy link"]} /> — it looks like <code className="text-[12px] text-zinc-200">youtube.com/live/AbC123…</code>
        </CheckItem>
      </div>
      <div className="pt-2">
        <CheckItem checked={s.streamScheduled} onChange={v => set("streamScheduled", v)} testid="check-step2-done">
          <b className="text-white">Done</b> — my stream is scheduled and I've copied the link.
        </CheckItem>
      </div>
    </>
  );
}

function Step3({ s, set, videoId, invalid, check }: StepProps & { videoId: string | null; invalid: boolean; check: VideoCheck }) {
  const status = invalid
    ? <span className="flex items-center gap-1.5 text-red-400"><AlertCircle className="w-3.5 h-3.5" /> We couldn't find a YouTube video ID in that link. Copy it from Share → Copy link.</span>
    : !videoId ? <span>Paste the link you copied. Any YouTube format works (youtube.com/live/…, youtu.be/…, watch?v=…). You can also add it later.</span>
    : check.state === "checking" ? <span className="flex items-center gap-1.5 text-zinc-400"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking the video with YouTube…</span>
    : check.state === "ok" ? <span className="flex items-center gap-1.5 text-emerald-400"><CheckCircle2 className="w-3.5 h-3.5" /> Found it{check.title ? <>: <b className="text-emerald-300 truncate max-w-[280px] inline-block align-bottom">{check.title}</b></> : ""} — embedding works.</span>
    : check.state === "bad" ? (
      <span className="flex items-start gap-1.5 text-red-400" data-testid="video-check-error"><AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        {check.reason === "embedding_disabled"
          ? "This video blocks embedding, so viewers would see “Video unavailable”. In YouTube Studio open the stream → Edit → turn on “Allow embedding”."
          : "YouTube says this video is private or doesn't exist. Make it Public or Unlisted, or check you copied the right link."}
      </span>
    )
    : <span className="flex items-center gap-1.5 text-zinc-400"><CheckCircle2 className="w-3.5 h-3.5" /> Video ID {videoId}. Check the preview below — if it says “Video unavailable”, turn on embedding in YouTube Studio.</span>;

  return (
    <>
      <Field label="YouTube Live link" hint={status}>
        <div className="relative">
          <Link2 className="w-4 h-4 text-zinc-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input data-testid="input-youtube" value={s.youtube} onChange={e => set("youtube", e.target.value)} autoFocus
            placeholder="https://youtube.com/live/…" className={`${inputCls} pl-10`} style={invalid || check.state === "bad" ? inputErrStyle : inputStyle} />
        </div>
      </Field>

      <div>
        <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-[0.12em] mb-2">What your viewers will see</p>
        <div className="relative w-full overflow-hidden rounded-xl" style={{ aspectRatio: "16 / 9", background: "#050408", border: `1px solid ${videoId && check.state !== "bad" ? `${GOLD}35` : "rgba(255,255,255,0.07)"}` }} data-testid="embed-preview">
          {videoId ? (
            <iframe key={videoId} className="absolute inset-0 w-full h-full" src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?rel=0&modestbranding=1`}
              title="Stream preview" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen data-testid="embed-preview-frame" />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ background: `${GOLD}10`, border: `1px solid ${GOLD}25` }}>
                <Radio className="w-5 h-5" style={{ color: GOLD }} />
              </div>
              <p className="text-sm font-semibold text-zinc-300">Your stream preview appears here</p>
              <p className="text-xs text-zinc-600 mt-1">A scheduled stream shows a “Live in …” waiting screen until you start it.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Step4({ s, set, ctaUrlInvalid, ctaIncomplete, deckLinkInvalid }: StepProps & { ctaUrlInvalid: boolean; ctaIncomplete: boolean; deckLinkInvalid: boolean }) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const embed = deckEmbed(s.deckUrl);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (!/\.pdf$/i.test(file.name) && file.type !== "application/pdf") return toast({ title: "Please choose a PDF", variant: "destructive" });
    if (file.size > 25 * 1024 * 1024) return toast({ title: "PDF must be under 25 MB", variant: "destructive" });
    setUploading(true);
    try {
      const url = await uploadDeck(file);
      set("deckUrl", url);
      toast({ title: "Deck uploaded", description: file.name });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      {/* Deck */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-[0.12em]">Slides <span className="normal-case tracking-normal font-medium text-zinc-600">optional · shown in the Slides tab</span></p>
          <div className="flex p-0.5 rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }}>
            {(["upload", "link"] as const).map(m => (
              <button key={m} type="button" onClick={() => set("deckMode", m)} data-testid={`deck-mode-${m}`}
                className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all ${s.deckMode === m ? "text-[#0a0910]" : "text-zinc-500 hover:text-zinc-300"}`}
                style={s.deckMode === m ? { background: GOLD } : undefined}>
                {m === "upload" ? "Upload PDF" : "Paste link"}
              </button>
            ))}
          </div>
        </div>
        {s.deckMode === "upload" ? (
          embed && embed.kind === "pdf" ? (
            <div className="flex items-center gap-3 p-3.5 rounded-xl" style={{ background: "rgba(52,211,153,0.05)", border: "1px solid rgba(52,211,153,0.2)" }}>
              <FileUp className="w-5 h-5 text-emerald-400" />
              <span className="text-[13px] text-zinc-300 flex-1 truncate">PDF deck ready</span>
              <a href={embed.src} target="_blank" rel="noopener noreferrer" className="text-[11px] font-semibold text-zinc-400 hover:text-white">Preview</a>
              <button type="button" onClick={() => set("deckUrl", "")} className="p-1 rounded text-zinc-500 hover:text-red-300" aria-label="Remove deck"><X className="w-3.5 h-3.5" /></button>
            </div>
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} data-testid="deck-dropzone"
              onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
              onDrop={e => { e.preventDefault(); setDrag(false); onFile(e.dataTransfer.files?.[0]); }}
              className="w-full flex flex-col items-center justify-center gap-1.5 py-7 rounded-xl transition-all"
              style={{ border: `1.5px dashed ${drag ? GOLD : "rgba(255,255,255,0.12)"}`, background: drag ? `${GOLD}08` : "rgba(255,255,255,0.015)" }}>
              {uploading ? <Loader2 className="w-5 h-5 animate-spin" style={{ color: GOLD }} /> : <Upload className="w-5 h-5" style={{ color: GOLD }} />}
              <span className="text-[13px] font-semibold text-zinc-300">{uploading ? "Uploading…" : "Drop your PDF here or click to browse"}</span>
              <span className="text-[11px] text-zinc-600">Up to 25 MB · export from Keynote, PowerPoint or Canva as PDF</span>
              <input ref={fileRef} type="file" accept="application/pdf,.pdf" className="hidden" data-testid="input-deck-file" onChange={e => onFile(e.target.files?.[0])} />
            </button>
          )
        ) : (
          <Field label="" hint={deckLinkInvalid ? <span className="text-red-400">Link must start with https://</span>
            : embed && embed.kind !== "pdf" ? <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {embed.label} link detected{embed.kind === "other" ? " — make sure it's publicly viewable" : ""}</span>
            : "Google Slides: File → Share → Publish to web (or “Anyone with the link”). Canva: Share → View-only link."}>
            <input data-testid="input-deck-url" value={s.deckUrl.startsWith("/uploads/") ? "" : s.deckUrl} onChange={e => set("deckUrl", e.target.value)}
              placeholder="https://docs.google.com/presentation/d/… or https://www.canva.com/design/…" className={inputCls} style={deckLinkInvalid ? inputErrStyle : inputStyle} />
          </Field>
        )}
        {embed && embed.kind !== "pdf" && !deckLinkInvalid && s.deckMode === "link" && (
          <div className="mt-3 relative w-full overflow-hidden rounded-xl" style={{ aspectRatio: "16 / 9", background: "#050408", border: "1px solid rgba(255,255,255,0.07)" }}>
            <iframe src={embed.src} title="Slides preview" className="absolute inset-0 w-full h-full" allowFullScreen data-testid="deck-preview" />
          </div>
        )}
      </div>

      <div className="h-px bg-white/[0.05]" />

      {/* CTA + offer */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Button text" hint="Appears under the video once you're live.">
          <input data-testid="input-cta-text" value={s.ctaText} onChange={e => set("ctaText", e.target.value)} maxLength={120}
            placeholder="Book your strategy call" className={inputCls} style={ctaIncomplete && !s.ctaText.trim() ? inputErrStyle : inputStyle} />
        </Field>
        <Field label="Button link" hint={ctaUrlInvalid ? <span className="text-red-400">Must start with https://</span> : ctaIncomplete ? <span className="text-amber-400">Add both the text and the link (or neither)</span> : "Opens in a new tab so the stream keeps playing."}>
          <input data-testid="input-cta-url" value={s.ctaUrl} onChange={e => set("ctaUrl", e.target.value)}
            placeholder="https://…" className={inputCls} style={ctaUrlInvalid || (ctaIncomplete && !s.ctaUrl.trim()) ? inputErrStyle : inputStyle} />
        </Field>
      </div>
      <Field label="Offer" optional hint="One or two lines under the video — what they get.">
        <textarea data-testid="input-offer-text" value={s.offerText} onChange={e => set("offerText", e.target.value)} rows={2} maxLength={1000}
          placeholder="12-week Creator Accelerator — weekly calls, templates, and a private community." className={`${inputCls} resize-y`} style={inputStyle} />
      </Field>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Price line" optional>
          <input data-testid="input-offer-price" value={s.offerPrice} onChange={e => set("offerPrice", e.target.value)} maxLength={120}
            placeholder="₹24,999 · webinar price ₹14,999" className={inputCls} style={inputStyle} />
        </Field>
        <Field label="Offer expires (IST)" optional hint={s.offerExpiresLocal ? `Countdown shows until ${formatIST(fromISTInput(s.offerExpiresLocal) || new Date())}` : "Adds an “Ends in” countdown; the button hides after."}>
          <input data-testid="input-offer-expires" type="datetime-local" value={s.offerExpiresLocal} onChange={e => set("offerExpiresLocal", e.target.value)} className={inputCls} style={inputStyle} />
        </Field>
      </div>

      {(s.ctaText || s.offerText || s.offerPrice) && (
        <div>
          <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-[0.12em] mb-2">Preview</p>
          <div className="rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4" style={{ background: `linear-gradient(135deg, ${GOLD}12, transparent 60%)`, border: `1px solid ${GOLD}30` }}>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: GOLD }}>Today's offer</p>
              {s.offerText && <p className="text-sm font-semibold text-white mt-1 whitespace-pre-line">{s.offerText}</p>}
              {s.offerPrice && <p className="text-lg font-black text-white mt-1">{s.offerPrice}</p>}
            </div>
            {s.ctaText && <span className="inline-flex items-center justify-center gap-1.5 px-5 py-3 rounded-xl text-sm font-black" style={{ background: GOLD, color: "#0a0910" }}>{s.ctaText} <ArrowUpRight className="w-4 h-4" /></span>}
          </div>
        </div>
      )}
    </>
  );
}

function Step5({ s, set, scheduledIso, existingStatus }: StepProps & { scheduledIso: string | null; existingStatus?: string }) {
  const inPast = scheduledIso ? new Date(scheduledIso).getTime() < Date.now() : false;
  return (
    <>
      <Field label="Webinar title *">
        <input data-testid="input-title" value={s.title} onChange={e => set("title", e.target.value)} maxLength={200} autoFocus
          placeholder="How to get your first 10 coaching clients" className={inputCls} style={inputStyle} />
      </Field>
      <Field label="What will they learn?" optional hint="Shown on the registration page.">
        <textarea data-testid="input-description" value={s.description} onChange={e => set("description", e.target.value)} rows={3} maxLength={5000}
          placeholder="Three things you'll walk away with…" className={`${inputCls} resize-y`} style={inputStyle} />
      </Field>
      <div className="grid sm:grid-cols-[1fr_1.3fr_0.8fr] gap-4">
        <Field label="Host name" optional>
          <input data-testid="input-host" value={s.hostName} onChange={e => set("hostName", e.target.value)} maxLength={120} placeholder="Your name" className={inputCls} style={inputStyle} />
        </Field>
        <Field label="Date & time (IST) *" hint={scheduledIso ? <span className={inPast ? "text-amber-400" : ""}>{formatIST(scheduledIso)}{inPast ? " — this is in the past" : ""}</span> : "Use the same time as your YouTube stream."}>
          <input data-testid="input-scheduled" type="datetime-local" value={s.scheduledLocal} onChange={e => set("scheduledLocal", e.target.value)} className={inputCls} style={inputStyle} />
        </Field>
        <Field label="Length" hint="For watch-time stats.">
          <select data-testid="input-duration" value={s.durationMinutes} onChange={e => set("durationMinutes", Number(e.target.value))} className={inputCls} style={inputStyle}>
            {[30, 45, 60, 75, 90, 120, 150, 180].map(m => <option key={m} value={m} style={{ background: "#111" }}>{m >= 60 ? `${m / 60 % 1 ? (m / 60).toFixed(1) : m / 60} hr` : `${m} min`}</option>)}
          </select>
        </Field>
      </div>

      <div className="grid sm:grid-cols-2 gap-3 pt-1">
        <label className="flex items-center justify-between gap-3 p-4 rounded-xl cursor-pointer" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <span className="flex items-start gap-3">
            <Bell className="w-4 h-4 mt-0.5" style={{ color: GOLD }} />
            <span><span className="block text-[13px] font-bold text-white">Email reminders</span><span className="block text-[11px] text-zinc-500">Confirmation + calendar invite, and a reminder 1 hour before.</span></span>
          </span>
          <Switch checked={s.remindersEnabled} onCheckedChange={v => set("remindersEnabled", v)} data-testid="switch-reminders" />
        </label>
        <label className="flex items-center justify-between gap-3 p-4 rounded-xl cursor-pointer" style={{ background: s.publish ? "rgba(52,211,153,0.05)" : "rgba(255,255,255,0.02)", border: `1px solid ${s.publish ? "rgba(52,211,153,0.25)" : "rgba(255,255,255,0.07)"}` }}>
          <span className="flex items-start gap-3">
            <Sparkles className="w-4 h-4 mt-0.5 text-emerald-400" />
            <span><span className="block text-[13px] font-bold text-white">{existingStatus === "ended" ? "Keep live pages up" : "Publish now"}</span><span className="block text-[11px] text-zinc-500">{s.publish ? "Registration opens as soon as you finish." : "Saved as a draft — only you can see it."}</span></span>
          </span>
          <Switch checked={s.publish} onCheckedChange={v => set("publish", v)} data-testid="switch-publish" />
        </label>
      </div>

      {/* Recap */}
      <div className="rounded-xl p-4" style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)" }}>
        <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-[0.12em] mb-3">Final check</p>
        <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-[12.5px]">
          {[
            { ok: s.channelReady, label: "Live streaming enabled" },
            { ok: s.streamScheduled, label: "Stream scheduled on YouTube" },
            { ok: !!parseYouTubeVideoId(s.youtube), label: "YouTube link added", soft: "Add it before go-live" },
            { ok: !!s.deckUrl, label: "Slides added", soft: "Optional" },
            { ok: !!(s.ctaText && s.ctaUrl), label: "CTA button set", soft: "Optional" },
            { ok: !!s.title.trim() && !!scheduledIso, label: "Title & time set" },
          ].map(i => (
            <li key={i.label} className="flex items-center gap-2">
              {i.ok ? <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" /> : <span className="w-4 h-4 rounded-full border border-zinc-700 flex-shrink-0" />}
              <span className={i.ok ? "text-zinc-300" : "text-zinc-500"}>{i.label}</span>
              {!i.ok && i.soft && <span className="text-[10px] text-zinc-600">· {i.soft}</span>}
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

function FinishedRecap({ row, onEdit, onAll }: { row: WebinarFunnelFull; onEdit: () => void; onAll: () => void }) {
  const { toast } = useToast();
  const regUrl = `${window.location.origin}/w/${row.slug}`;
  const liveUrl = `${regUrl}/live`;
  const published = row.status !== "draft";
  const copy = (u: string) => navigator.clipboard.writeText(u).then(() => toast({ title: "Link copied", description: u })).catch(() => toast({ title: "Copy this link", description: u }));
  const steps = useMemo(() => [
    { t: "Up to the start", d: "Share the registration link everywhere. Registrants get a confirmation email with a calendar invite" + (row.remindersEnabled ? ", then a reminder 1 hour before." : ".") },
    { t: "10 minutes before", d: "Open YouTube Studio → Content → Live, open your scheduled stream, and connect your encoder or webcam so the preview is running." },
    { t: `At ${formatIST(row.scheduledAt).replace(/^\w+, /, "")}`, d: "Your Oravini live page switches from the countdown to LIVE automatically — no button to press here. Click “Go live” in YouTube Studio." },
    { t: "During the webinar", d: "Keep this webinar's Live room tab open to read chat, answer Q&A, and see how many are watching." },
    { t: "Afterwards", d: "Click “Mark ended” in the editor. The page becomes a replay (YouTube turns the live into a video automatically, or paste a separate replay link)." },
  ], [row]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]" data-testid="wizard-finished">
      <section className="rounded-2xl p-6 sm:p-7 relative overflow-hidden" style={{ background: `linear-gradient(160deg, ${GOLD}16, rgba(255,255,255,0.015) 50%)`, border: `1px solid ${GOLD}35` }}>
        <PartyPopper className="w-7 h-7 mb-3" style={{ color: GOLD }} />
        <h2 className="text-xl font-black text-white">{published ? "Your webinar is published" : "Saved as a draft"}</h2>
        <p className="text-sm text-zinc-400 mt-1 mb-5">{row.title} · {formatIST(row.scheduledAt)}</p>

        <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-[0.12em] mb-1.5">Registration link — share this</p>
        <div className="flex items-center gap-2 mb-4">
          <code className="flex-1 min-w-0 truncate px-3.5 py-3 rounded-xl text-[13px] text-white" style={{ background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.08)" }} data-testid="text-reg-link">{regUrl}</code>
          <button onClick={() => copy(regUrl)} data-testid="btn-copy-reg-link" className="flex items-center gap-1.5 px-4 py-3 rounded-xl text-sm font-black flex-shrink-0" style={{ background: GOLD, color: "#0a0910" }}>
            <Copy className="w-4 h-4" /> Copy
          </button>
        </div>
        <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-[0.12em] mb-1.5">Live room</p>
        <button onClick={() => copy(liveUrl)} className="flex items-center gap-1.5 text-[13px] text-zinc-300 hover:text-white truncate max-w-full"><Copy className="w-3.5 h-3.5 flex-shrink-0" style={{ color: GOLD }} /> <span className="truncate">{liveUrl}</span></button>
        {!published && <p className="text-xs text-amber-400 mt-4">Drafts show “not found” to visitors — publish from the editor when you're ready.</p>}

        <div className="flex flex-wrap gap-2 mt-6">
          <button onClick={onEdit} className="px-4 py-2.5 rounded-xl text-sm font-bold" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}>Open editor &amp; live room</button>
          {published && <a href={`/w/${row.slug}`} target="_blank" rel="noopener noreferrer" className="px-4 py-2.5 rounded-xl text-sm font-bold text-zinc-300 inline-flex items-center gap-1.5" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>View page <ArrowUpRight className="w-3.5 h-3.5" /></a>}
          <button onClick={onAll} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-zinc-500 hover:text-zinc-300">All webinars</button>
        </div>
      </section>

      <section className="rounded-2xl p-6 sm:p-7" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <h3 className="text-sm font-black text-white mb-4 flex items-center gap-2"><CalendarClock className="w-4 h-4" style={{ color: GOLD }} /> What happens at go-live</h3>
        <ol className="relative space-y-5">
          {steps.map((st, i) => (
            <li key={i} className="relative pl-8">
              {i < steps.length - 1 && <span className="absolute left-[11px] top-6 -bottom-5 w-px bg-white/[0.08]" />}
              <span className="absolute left-0 top-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black" style={{ background: `${GOLD}18`, color: GOLD, border: `1px solid ${GOLD}40` }}>{i + 1}</span>
              <p className="text-[13px] font-bold text-white">{st.t}</p>
              <p className="text-[12.5px] text-zinc-400 leading-relaxed mt-0.5">{st.d}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
