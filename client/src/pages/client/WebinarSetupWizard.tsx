import YoutubeAccessDisclosure from "@/components/webinar-funnel/YoutubeAccessDisclosure";
import {webinarAssistantDraft} from "@shared/webinarAssistant";
import WebinarAssistant from "@/components/webinar-funnel/WebinarAssistant";
import CommunityLinksEditor from "@/components/webinar-funnel/CommunityLinksEditor";
import {communityLinksSchema} from "@shared/webinarCommunity";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import ClientLayout from "@/components/webinar-funnel/WebinarWorkspaceLayout";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { deckEmbed, formatIST, isValidCtaUrl, parseYouTubeVideoId } from "@shared/webinarFunnel";
import { CtaLinkInput } from "@/components/webinar-funnel/CtaLinkInput";
import {
  AlertCircle, ArrowLeft, ArrowRight, ArrowUpRight, Bell, CalendarClock, Check, CheckCircle2, ChevronRight, Copy,
  FileUp, Link2, Loader2, Radio, Sparkles, Upload, X, Youtube,
} from "lucide-react";
import { BackLink, btn, focusRing } from "@/components/webinar-funnel/ui";
import {
  Field, GOLD, fromISTInput, inputCls, inputErrStyle, inputStyle, toISTInput, uploadDeck, type WebinarFunnelFull,
} from "@/components/webinar-funnel/hostUtils";
import {
  WIZARD_STEP_COUNT, blankWizardState as blank, parseSavedWizardState, shouldPersistWizardState, type WizardState,
} from "@/components/webinar-funnel/wizardState";
import {
  SecretField, YOUTUBE_STATUS_KEY, consumeYoutubeConnectResult, startYoutubeConnect, useYoutubeConnection,
  type YoutubeBroadcastInfo, type YoutubeConnection, type YoutubeLiveStatus,
} from "@/components/webinar-funnel/youtube";

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

// Step indexes are persisted (wizardState.ts), so the count stays 5. Steps 1–2 are optional:
// hosts can connect YouTube (recommended) or skip straight to pasting a stream link.
const STEPS = [
  { title: "Connect YouTube", short: "Connect YouTube", blurb: "Recommended · optional" },
  { title: "Stream details", short: "Stream details", blurb: "Encoder or manual setup" },
  { title: "Your stream link", short: "Stream link", blurb: "Preview what viewers see" },
  { title: "Slides & offer", short: "Slides & offer", blurb: "Deck, CTA and pricing" },
  { title: "Schedule & publish", short: "Publish", blurb: "Go-live time and launch" },
];
const LINK_STEP = 2;

// ── Small building blocks ───────────────────────────────────────────────────
function CheckItem({ checked, onChange, children, testid }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode; testid?: string }) {
  return (
    // div+role (not <button>) because items contain links, which can't nest inside buttons
    <div role="checkbox" aria-checked={checked} tabIndex={0} onClick={() => onChange(!checked)} data-testid={testid}
      onKeyDown={e => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); onChange(!checked); } }}
      className={`w-full text-left flex items-start gap-3 p-3.5 rounded-lg transition-colors cursor-pointer select-none border ${checked ? "bg-white/[0.035] border-white/[0.12]" : "bg-white/[0.015] border-white/[0.07] hover:border-white/[0.12]"} ${focusRing}`}>
      <span className="mt-0.5 w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center transition-all"
        style={checked ? { background: GOLD, color: "#14110a" } : { border: "1.5px solid rgba(255,255,255,0.22)" }}>
        {checked && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
      </span>
      <span className="text-[13px] leading-relaxed text-zinc-300">{children}</span>
    </div>
  );
}

function ExtLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
      className={`inline-flex items-center gap-0.5 font-medium underline decoration-dotted underline-offset-2 hover:brightness-125 rounded ${focusRing}`} style={{ color: GOLD }}>
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
  const c = tone === "warn" ? { bg: "rgba(251,191,36,0.05)", bd: "rgba(251,191,36,0.2)", fg: "#fbbf24" } : { bg: "rgba(255,255,255,0.025)", bd: "rgba(255,255,255,0.08)", fg: GOLD };
  return (
    <div className="flex gap-2.5 p-3.5 rounded-lg text-[13px] leading-relaxed text-zinc-300" style={{ background: c.bg, border: `1px solid ${c.bd}` }}>
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

  const [s, setS] = useState<WizardState>(() => {
    const state=loadState(editingId)||blank();
    if(!editingId){try{const raw=sessionStorage.getItem('oravini:webinar-ai-draft');if(raw){const parsed=webinarAssistantDraft.safeParse(JSON.parse(raw));sessionStorage.removeItem('oravini:webinar-ai-draft');if(parsed.success)return {...state,title:parsed.data.title,description:[parsed.data.description,parsed.data.pageCopy].filter(Boolean).join("\n\n"),offerText:parsed.data.offerText};}}catch{}}
    return state;
  });
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
      communityLinks: prev.communityLinks.length?prev.communityLinks:(existing.communityLinks||[]),
      publish: existing.status !== "draft" || prev.publish,
      createdId: existing.id,
      ytBroadcastId: prev.ytBroadcastId || existing.youtubeBroadcastId || null,
    }));
  }, [existing]);

  useEffect(() => { persistState(editingId, s); }, [s, editingId]);

  // ── YouTube: coming back from "Connect YouTube" lands here with ?yt_connected / ?yt_error
  const yt = useYoutubeConnection();
  useEffect(() => {
    const result = consumeYoutubeConnectResult();
    if (!result) return;
    queryClient.invalidateQueries({ queryKey: YOUTUBE_STATUS_KEY });
    if (result.ok) toast({ title: "YouTube connected", description: "Now create your stream in one click." });
    else toast({ title: "Couldn't connect YouTube", description: result.error, variant: "destructive" });
  }, []);

  // Stream key/ingestion live only in memory (never in localStorage); re-fetched from the server on resume.
  const [ytInfo, setYtInfo] = useState<YoutubeBroadcastInfo | null>(null);
  const [creatingStream, setCreatingStream] = useState(false);
  useEffect(() => {
    const target = editingId || s.createdId;
    if (!s.ytBroadcastId || !target || ytInfo || !yt.data?.connected) return;
    apiRequest("GET", `/api/webinar-funnels/${target}/youtube/status`)
      .then((st: YoutubeLiveStatus) => {
        if (st.broadcastId && st.streamKey && st.ingestionAddress && st.watchUrl && st.studioUrl) {
          setYtInfo({ broadcastId: st.broadcastId, streamKey: st.streamKey, ingestionAddress: st.ingestionAddress, watchUrl: st.watchUrl, studioUrl: st.studioUrl, channelTitle: st.channelTitle });
        }
      })
      .catch(() => {});
  }, [s.ytBroadcastId, s.createdId, editingId, yt.data?.connected]);

  // Derived validation
  const videoId = parseYouTubeVideoId(s.youtube);
  const youtubeInvalid = s.youtube.trim() !== "" && !videoId;
  const videoCheck = useVideoCheck(videoId);
  const ctaUrlInvalid = s.ctaUrl.trim() !== "" && !isValidCtaUrl(s.ctaUrl);
  const ctaIncomplete = (!!s.ctaText.trim()) !== (!!s.ctaUrl.trim());
  const deckLinkInvalid = s.deckMode === "link" && s.deckUrl.trim() !== "" && !/^https?:\/\/\S+$/i.test(s.deckUrl.trim());
  const scheduledIso = fromISTInput(s.scheduledLocal);
  const offerExpiresIso = fromISTInput(s.offerExpiresLocal);

  const canContinue = [
    true, // Connect YouTube — recommended, never required
    true, // Stream details — optional guidance
    !youtubeInvalid,
    !ctaUrlInvalid && !ctaIncomplete && !deckLinkInvalid && communityLinksSchema.safeParse(s.communityLinks).success,
    !!s.title.trim() && !!scheduledIso && communityLinksSchema.safeParse(s.communityLinks).success,
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
    communityLinks: s.communityLinks,
    status: s.publish ? "published" : "draft",
  });

  // Creates (or reuses) the webinar as a draft so YouTube has a title + time, then
  // creates the broadcast + stream on the host's channel and fills in step 3's link.
  const createYoutubeStream = async () => {
    if (!s.title.trim() || !scheduledIso) {
      toast({ title: "Add a title and go-live time first", variant: "destructive" });
      return;
    }
    setCreatingStream(true);
    try {
      let targetId = editingId || s.createdId;
      const base = { title: s.title.trim(), scheduledAt: scheduledIso, hostName: s.hostName.trim() || null, description: s.description.trim() || null };
      if (targetId) {
        await apiRequest("PATCH", `/api/webinar-funnels/${targetId}`, base);
      } else {
        const row: WebinarFunnelFull = await apiRequest("POST", "/api/webinar-funnels", { ...base, status: "draft", remindersEnabled: s.remindersEnabled, durationMinutes: s.durationMinutes });
        targetId = row.id;
        queryClient.invalidateQueries({ queryKey: ["/api/webinar-funnels"] });
      }
      const info: YoutubeBroadcastInfo = await apiRequest("POST", `/api/webinar-funnels/${targetId}/youtube/broadcast`, {});
      setYtInfo(info);
      setS(prev => ({ ...prev, createdId: targetId, ytBroadcastId: info.broadcastId, youtube: info.watchUrl, streamScheduled: true }));
      toast({ title: "Your stream is ready on YouTube", description: "We've filled in your link for the next step." });
    } catch (e: any) {
      if (e?.data?.code === "youtube_not_connected") queryClient.invalidateQueries({ queryKey: YOUTUBE_STATUS_KEY });
      toast({ title: "Couldn't create the YouTube stream", description: e.message, variant: "destructive" });
    } finally {
      setCreatingStream(false);
    }
  };

  const finish = async () => {
    if(!communityLinksSchema.safeParse(s.communityLinks).success){toast({title:"Check your group links",description:"Each enabled group needs a label and valid HTTPS invite.",variant:"destructive"});return;}
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
      // Keep the YouTube broadcast's title/time in step with what was just saved (best effort).
      if (row.youtubeBroadcastId && yt.data?.connected) {
        apiRequest("POST", `/api/webinar-funnels/${row.id}/youtube/broadcast`, {}).catch(() => {});
      }
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
    return <ClientLayout><div className="max-w-5xl mx-auto px-4 sm:px-6 py-10"><div className="h-96 rounded-xl bg-white/[0.03] animate-pulse" aria-busy="true" aria-label="Loading webinar" /></div></ClientLayout>;
  }

  const stepNum = s.step + 1;
  const nextLabel = s.step === 4 ? (s.publish ? "Publish webinar" : "Save as draft")
    : s.step === 0 && !s.ytBroadcastId ? "Continue without connecting"
    : s.step === LINK_STEP && !s.youtube.trim() ? "Skip for now" : "Continue";

  return (
    <ClientLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
          <BackLink onClick={() => navigate("/tools/webinars")} />
          {!finished && (
            <button onClick={() => navigate(advancedHref)} data-testid="link-advanced-form" className={btn("ghost", "sm")}>
              Advanced: plain form <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="mb-8">
          <p className="text-xs font-medium text-zinc-500 mb-1.5">Guided setup</p>
          <h1 className="text-2xl sm:text-[28px] font-semibold text-white tracking-tight leading-tight break-words">
            {finished ? "You're ready to go live." : editingId ? `Set up “${existing?.title || "your webinar"}”` : "Launch a YouTube Live webinar"}
          </h1>
          {!finished && <p className="text-sm text-zinc-500 mt-1.5">Five short steps — the first two are optional. Progress saves automatically, so you can close the tab and pick up where you left off.</p>}
        </div>

        {finished ? (
          <FinishedRecap row={finished} onEdit={() => navigate(`/tools/webinars/${finished.id}`)} onAll={() => navigate("/tools/webinars")} />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
            {/* Step rail */}
            <nav aria-label="Setup steps" className="lg:sticky lg:top-6 self-start">
              {/* Mobile: compact progress */}
              <div className="lg:hidden" data-testid="wizard-progress-mobile">
                <div className="flex items-center justify-between text-xs text-zinc-500 mb-2">
                  <span>Step {stepNum} of {STEPS.length} · <b className="font-medium text-zinc-200">{STEPS[s.step].short}</b></span>
                  <span className="tabular-nums">{Math.round((s.step / STEPS.length) * 100)}%</span>
                </div>
                <div className="flex gap-1" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={stepNum} aria-label="Setup progress">
                  {STEPS.map((_, i) => <span key={i} className="h-1 flex-1 rounded-full" style={{ background: i <= s.step ? GOLD : "rgba(255,255,255,0.08)" }} />)}
                </div>
              </div>
              <ol className="hidden lg:block relative">
                {STEPS.map((st, i) => {
                  const done = i < s.step, active = i === s.step;
                  return (
                    <li key={i} className="relative pb-5 last:pb-0">
                      {i < STEPS.length - 1 && <span className="absolute left-[13px] top-8 bottom-0 w-px" style={{ background: done ? `${GOLD}66` : "rgba(255,255,255,0.08)" }} aria-hidden />}
                      <button type="button" onClick={() => i <= s.step && set("step", i)} disabled={i > s.step} data-testid={`rail-step-${i + 1}`}
                        aria-current={active ? "step" : undefined}
                        className={`flex items-start gap-3 text-left disabled:cursor-default group rounded-lg w-full ${focusRing}`}>
                        <span className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-semibold transition-colors"
                          style={active ? { background: GOLD, color: "#14110a" }
                            : done ? { background: "rgba(255,255,255,0.06)", color: GOLD, border: `1px solid ${GOLD}55` }
                            : { background: "transparent", color: "#71717a", border: "1px solid rgba(255,255,255,0.12)" }}>
                          {done ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : i + 1}
                        </span>
                        <span className="pt-0.5 min-w-0">
                          <span className={`block text-[13px] font-medium ${active ? "text-white" : done ? "text-zinc-300 group-hover:text-white" : "text-zinc-500"}`}>{st.short}</span>
                          <span className="block text-xs text-zinc-600">{st.blurb}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </nav>

            {/* Step card */}
            <section className="rounded-xl overflow-hidden border border-white/[0.08] bg-[#111115]" data-testid={`wizard-step-${stepNum}`} aria-labelledby="wizard-step-title">
              <div className="px-5 sm:px-7 pt-6 pb-5 border-b border-white/[0.06]">
                <p className="text-xs font-medium text-zinc-500 mb-1 tabular-nums">Step {stepNum} of {STEPS.length}{s.step < LINK_STEP ? " · optional" : ""}</p>
                <h2 id="wizard-step-title" className="text-lg sm:text-xl font-semibold text-white tracking-tight">{STEPS[s.step].title}</h2>
              </div>

              <div className="px-5 sm:px-7 py-6 space-y-4"><details className="rounded-xl border border-[#d4b461]/20"><summary className="p-4 text-sm text-[#d4b461] cursor-pointer">Draft with Webinar Assistant</summary><WebinarAssistant onApply={d=>{setS(prev=>({...prev,title:d.title,description:[d.description,d.pageCopy].filter(Boolean).join("\n\n"),offerText:d.offerText,communityLinks:prev.communityLinks.map((link,i)=>i===0?{...link,label:d.groupCtaText||link.label}:link)}));}}/></details>
                {s.step === 0 && (
                  <StepConnect s={s} set={set} yt={yt.data} ytLoading={yt.isLoading} ytInfo={ytInfo} creating={creatingStream}
                    onCreate={createYoutubeStream} scheduledIso={scheduledIso} onUseLink={() => set("step", LINK_STEP)} />
                )}
                {s.step === 1 && <StepStreamDetails s={s} set={set} ytInfo={ytInfo} />}
                {s.step === 2 && <Step3 s={s} set={set} videoId={videoId} invalid={youtubeInvalid} check={videoCheck} />}
                {s.step === 3 && <Step4 s={s} set={set} ctaUrlInvalid={ctaUrlInvalid} ctaIncomplete={ctaIncomplete} deckLinkInvalid={deckLinkInvalid} />}
                {s.step === 3 && <CommunityLinksEditor links={s.communityLinks} onChange={v=>set("communityLinks",v)}/>}
                {s.step === 4 && <Step5 s={s} set={set} scheduledIso={scheduledIso} existingStatus={existing?.status} />}
              </div>

              <div className="px-5 sm:px-7 py-4 flex items-center justify-between gap-3 border-t border-white/[0.06] bg-black/20">
                <button onClick={back} disabled={s.step === 0} data-testid="btn-wizard-back" className={`${btn("ghost", "sm")} disabled:invisible`}>
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <button onClick={next} disabled={!canContinue || saving} data-testid="btn-wizard-next"
                  className={btn(s.step === 0 && !s.ytBroadcastId ? "secondary" : "primary", "md")}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {nextLabel}
                  {!saving && <ArrowRight className="w-4 h-4" />}
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </ClientLayout>
  );
}

type StepProps = { s: WizardState; set: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void };

function StepConnect({ s, set, yt, ytLoading, ytInfo, creating, onCreate, scheduledIso, onUseLink }: StepProps & {
  yt: YoutubeConnection | undefined; ytLoading: boolean; ytInfo: YoutubeBroadcastInfo | null; creating: boolean;
  onCreate: () => void; scheduledIso: string | null; onUseLink: () => void;
}) {
  const toggle = (i: number, v: boolean) => set("checks1", s.checks1.map((c, j) => (j === i ? v : c)));
  const configured = yt?.configured !== false;
  const connected = !!yt?.connected;
  const created = !!s.ytBroadcastId;
  const [showEnable, setShowEnable] = useState(false);

  return (
    <>
      <p className="text-sm text-zinc-400 leading-relaxed">
        Connect your YouTube channel and Oravini schedules the stream and fills in the link for you. Prefer to do it yourself? Paste a stream link instead — attendees never need a YouTube account either way.
      </p>

      {ytLoading ? (
        <div className="h-28 rounded-lg bg-white/[0.03] animate-pulse" aria-busy="true" aria-label="Checking YouTube connection" />
      ) : configured ? (
        <div className="rounded-lg p-4 sm:p-5 space-y-4 border border-white/[0.1] bg-white/[0.02]" data-testid="yt-oneclick-card">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white flex items-center gap-2"><Youtube className="w-4 h-4 text-red-500" /> Connect YouTube <span className="text-[11px] font-medium text-zinc-500">Recommended</span></p>
              <p className="text-[13px] text-zinc-400 mt-1">
                {connected
                  ? <>Connected to <b className="font-medium text-zinc-200">{yt?.channelTitle || "your channel"}</b>. We'll schedule an unlisted stream and fill in your link.</>
                  : "We'll schedule the stream on your channel and grab the link — no copy-pasting."}
              </p>
            </div>
            {connected && created && <span className="text-xs font-medium text-emerald-400 flex items-center gap-1" data-testid="yt-stream-created"><CheckCircle2 className="w-3.5 h-3.5" /> Stream created</span>}
          </div>

          {!connected && <YoutubeAccessDisclosure/>}
          {!connected ? (
            <button type="button" onClick={() => startYoutubeConnect()} data-testid="btn-connect-youtube" className={btn("primary", "md")}>
              <Youtube className="w-4 h-4" /> Connect YouTube
            </button>
          ) : !created ? (
            <>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Webinar title" htmlFor="yt-title">
                  <input id="yt-title" data-testid="input-yt-title" value={s.title} onChange={e => set("title", e.target.value)} maxLength={200}
                    placeholder="How to get your first 10 clients" className={inputCls} style={inputStyle} />
                </Field>
                <Field label="Go-live (IST)" htmlFor="yt-scheduled" hint={scheduledIso ? formatIST(scheduledIso) : undefined}>
                  <input id="yt-scheduled" data-testid="input-yt-scheduled" type="datetime-local" value={s.scheduledLocal} onChange={e => set("scheduledLocal", e.target.value)} className={inputCls} style={inputStyle} />
                </Field>
              </div>
              <button type="button" onClick={onCreate} disabled={creating || !s.title.trim() || !scheduledIso} data-testid="btn-create-yt-stream" className={btn("primary", "md")}>
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Radio className="w-4 h-4" />}
                {creating ? "Creating your stream…" : "Create my stream on YouTube"}
              </button>
              <p className="text-xs text-zinc-500">Saves this webinar as a draft so you can finish the rest. You'll publish in the last step.</p>
            </>
          ) : (
            <p className="text-[13px] text-zinc-400">{ytInfo ? "Your stream link is filled in. Encoder details are on the next step." : <span className="inline-flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading stream details…</span>}</p>
          )}
        </div>
      ) : (
        <Callout>YouTube connect isn't available on this workspace yet, so paste your stream link instead — everything else works the same.</Callout>
      )}

      <div className="flex items-center gap-3 py-1" aria-hidden>
        <span className="h-px flex-1 bg-white/[0.07]" /><span className="text-xs text-zinc-600">or</span><span className="h-px flex-1 bg-white/[0.07]" />
      </div>
      <button type="button" onClick={onUseLink} data-testid="btn-use-stream-link" className={`${btn("secondary", "md")} w-full`}>
        <Link2 className="w-4 h-4" /> Paste a YouTube stream link instead
      </button>

      <div className="pt-2">
        <button type="button" onClick={() => setShowEnable(v => !v)} aria-expanded={showEnable} data-testid="btn-toggle-enable-help"
          className={`flex items-center gap-1 text-[13px] font-medium text-zinc-500 hover:text-zinc-300 rounded ${focusRing}`}>
          <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showEnable ? "rotate-90" : ""}`} />
          First time going live on this channel? Enable live streaming
        </button>
        {showEnable && (
          <div className="space-y-2 mt-3">
            <CheckItem checked={s.checks1[0]} onChange={v => toggle(0, v)} testid="check1-features">
              Open <ExtLink href="https://www.youtube.com/features">youtube.com/features</ExtLink> while signed in to the channel you'll stream from.
            </CheckItem>
            <CheckItem checked={s.checks1[1]} onChange={v => toggle(1, v)} testid="check1-verify">
              Verify your phone number if asked (<ExtLink href="https://www.youtube.com/verify">youtube.com/verify</ExtLink>) — YouTube texts you a code.
            </CheckItem>
            <CheckItem checked={s.checks1[2]} onChange={v => toggle(2, v)} testid="check1-enable">
              Under <b className="text-zinc-200">Live streaming</b>, click <b className="text-zinc-200">Enable</b>.
            </CheckItem>
            <Callout tone="warn">
              <b className="text-zinc-100">Plan for a 24-hour wait.</b> The first time a channel enables live streaming, YouTube can take up to 24 hours to activate it. Do this at least a day before your webinar.
            </Callout>
            <CheckItem checked={s.channelReady} onChange={v => set("channelReady", v)} testid="check-step1-done">
              <b className="text-white">Done</b> — live streaming is enabled on my channel.
            </CheckItem>
          </div>
        )}
      </div>
    </>
  );
}

function StepStreamDetails({ s, set, ytInfo }: StepProps & { ytInfo: YoutubeBroadcastInfo | null }) {
  const toggle = (i: number, v: boolean) => set("checks2", s.checks2.map((c, j) => (j === i ? v : c)));
  const created = !!s.ytBroadcastId;
  return (
    <>
      {created ? (
        <div className="space-y-3">
          {ytInfo ? (
            <>
              <p className="text-[13px] text-zinc-300 leading-relaxed">
                <b className="font-medium text-white">Going live from your webcam?</b> At go-live time, open <ExtLink href={ytInfo.studioUrl}>YouTube Studio</ExtLink> and click <b className="text-zinc-200">Go live</b>.
                {" "}<b className="font-medium text-white">Using OBS / Streamyard (custom RTMP)?</b> Paste these into <Path items={["Settings", "Stream", "Custom"]} />:
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                <SecretField label="Server (ingestion URL)" value={ytInfo.ingestionAddress} masked={false} testid="yt-ingestion" />
                <SecretField label="Stream key — keep private" value={ytInfo.streamKey} testid="yt-stream-key" />
              </div>
            </>
          ) : (
            <p className="text-[13px] text-zinc-500 flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading stream details…</p>
          )}
        </div>
      ) : (
        <>
          <p className="text-sm text-zinc-400 leading-relaxed">Setting it up yourself? Schedule the stream in YouTube Studio so you get a permanent link to embed on your Oravini page. Already have a link? Just continue.</p>
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
      )}
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
      <Field label="YouTube Live link" htmlFor="wizard-youtube" hint={status}>
        <div className="relative">
          <Link2 className="w-4 h-4 text-zinc-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input id="wizard-youtube" data-testid="input-youtube" value={s.youtube} onChange={e => set("youtube", e.target.value)} autoFocus
            placeholder="https://youtube.com/live/…" className={`${inputCls} pl-10`} style={invalid || check.state === "bad" ? inputErrStyle : inputStyle} />
        </div>
      </Field>

      <div>
        <p className="text-[13px] font-medium text-zinc-300 mb-2">What your viewers will see</p>
        <div className="relative w-full overflow-hidden rounded-lg bg-black" style={{ aspectRatio: "16 / 9", border: `1px solid ${videoId && check.state !== "bad" ? `${GOLD}40` : "rgba(255,255,255,0.08)"}` }} data-testid="embed-preview">
          {videoId ? (
            <iframe key={videoId} className="absolute inset-0 w-full h-full" src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?rel=0&modestbranding=1`}
              title="Stream preview" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen data-testid="embed-preview-frame" />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
              <div className="w-11 h-11 rounded-lg flex items-center justify-center mb-3 bg-white/[0.04] border border-white/[0.08]">
                <Radio className="w-5 h-5 text-zinc-400" />
              </div>
              <p className="text-sm font-medium text-zinc-200">Your stream preview appears here</p>
              <p className="text-xs text-zinc-500 mt-1">A scheduled stream shows a “Live in …” waiting screen until you start it.</p>
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
          <p className="text-[13px] font-medium text-zinc-300">Slides <span className="text-xs font-normal text-zinc-600">Optional · shown in the Slides tab</span></p>
          <div className="flex p-0.5 rounded-lg bg-white/[0.04]" role="group" aria-label="How to add slides">
            {(["upload", "link"] as const).map(m => (
              <button key={m} type="button" onClick={() => set("deckMode", m)} data-testid={`deck-mode-${m}`} aria-pressed={s.deckMode === m}
                className={`px-3 h-7 rounded-md text-xs font-medium transition-colors ${focusRing} ${s.deckMode === m ? "text-[#14110a]" : "text-zinc-400 hover:text-zinc-200"}`}
                style={s.deckMode === m ? { background: GOLD } : undefined}>
                {m === "upload" ? "Upload PDF" : "Paste link"}
              </button>
            ))}
          </div>
        </div>
        {s.deckMode === "upload" ? (
          embed && embed.kind === "pdf" ? (
            <div className="flex items-center gap-3 p-3.5 rounded-lg bg-white/[0.025] border border-white/[0.1]">
              <FileUp className="w-5 h-5 text-emerald-400" />
              <span className="text-[13px] text-zinc-300 flex-1 truncate">PDF deck ready</span>
              <a href={embed.src} target="_blank" rel="noopener noreferrer" className={`text-xs font-medium text-zinc-400 hover:text-white rounded ${focusRing}`}>Preview</a>
              <button type="button" onClick={() => set("deckUrl", "")} className={`p-1.5 rounded-md text-zinc-500 hover:text-red-300 hover:bg-red-500/10 ${focusRing}`} aria-label="Remove deck"><X className="w-3.5 h-3.5" /></button>
            </div>
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} data-testid="deck-dropzone"
              onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
              onDrop={e => { e.preventDefault(); setDrag(false); onFile(e.dataTransfer.files?.[0]); }}
              className={`w-full flex flex-col items-center justify-center gap-1.5 py-8 rounded-lg transition-colors ${focusRing}`}
              style={{ border: `1.5px dashed ${drag ? GOLD : "rgba(255,255,255,0.14)"}`, background: drag ? `${GOLD}0a` : "rgba(255,255,255,0.015)" }}>
              {uploading ? <Loader2 className="w-5 h-5 animate-spin text-zinc-300" /> : <Upload className="w-5 h-5 text-zinc-400" />}
              <span className="text-[13px] font-medium text-zinc-200">{uploading ? "Uploading…" : "Drop your PDF here or click to browse"}</span>
              <span className="text-xs text-zinc-500">Up to 25 MB · export from Keynote, PowerPoint or Canva as PDF</span>
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
          <div className="mt-3 relative w-full overflow-hidden rounded-lg bg-black border border-white/[0.08]" style={{ aspectRatio: "16 / 9" }}>
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
          <CtaLinkInput value={s.ctaUrl} onChange={v => set("ctaUrl", v)}
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
          <p className="text-[13px] font-medium text-zinc-300 mb-2">Preview — how it appears under the video</p>
          <div className="rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-4 bg-[#111115] border border-[#d4b461]/30">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em]" style={{ color: GOLD }}>Today's offer</p>
              {s.offerText && <p className="text-[15px] font-medium text-white mt-1.5 whitespace-pre-line break-words">{s.offerText}</p>}
              {s.offerPrice && <p className="text-lg font-semibold text-white mt-1">{s.offerPrice}</p>}
            </div>
            {s.ctaText && <span className={`${btn("primary", "lg")} flex-shrink-0 pointer-events-none`}>{s.ctaText} <ArrowUpRight className="w-4 h-4" /></span>}
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
      <Field label="Webinar title *" htmlFor="w5-title">
        <input id="w5-title" data-testid="input-title" value={s.title} onChange={e => set("title", e.target.value)} maxLength={200} autoFocus
          placeholder="How to get your first 10 coaching clients" className={inputCls} style={inputStyle} />
      </Field>
      <Field label="What will they learn?" optional htmlFor="w5-description" hint="Shown on the registration page.">
        <textarea id="w5-description" data-testid="input-description" value={s.description} onChange={e => set("description", e.target.value)} rows={3} maxLength={5000}
          placeholder="Three things you'll walk away with…" className={`${inputCls} resize-y`} style={inputStyle} />
      </Field>
      <div className="grid sm:grid-cols-[1fr_1.3fr_0.8fr] gap-4">
        <Field label="Host name" optional htmlFor="w5-host">
          <input id="w5-host" data-testid="input-host" value={s.hostName} onChange={e => set("hostName", e.target.value)} maxLength={120} placeholder="Your name" className={inputCls} style={inputStyle} />
        </Field>
        <Field label="Date & time (IST) *" htmlFor="w5-scheduled" hint={scheduledIso ? <span className={inPast ? "text-amber-400" : ""}>{formatIST(scheduledIso)}{inPast ? " — this is in the past" : ""}</span> : "Use the same time as your YouTube stream."}>
          <input id="w5-scheduled" data-testid="input-scheduled" type="datetime-local" value={s.scheduledLocal} onChange={e => set("scheduledLocal", e.target.value)} className={inputCls} style={inputStyle} />
        </Field>
        <Field label="Length" htmlFor="w5-duration" hint="For watch-time stats.">
          <select id="w5-duration" data-testid="input-duration" value={s.durationMinutes} onChange={e => set("durationMinutes", Number(e.target.value))} className={inputCls} style={inputStyle}>
            {[30, 45, 60, 75, 90, 120, 150, 180].map(m => <option key={m} value={m} style={{ background: "#111" }}>{m >= 60 ? `${m / 60 % 1 ? (m / 60).toFixed(1) : m / 60} hr` : `${m} min`}</option>)}
          </select>
        </Field>
      </div>

      <div className="grid sm:grid-cols-2 gap-3 pt-1">
        <label className="flex items-center justify-between gap-3 p-4 rounded-lg cursor-pointer bg-white/[0.02] border border-white/[0.08] hover:border-white/[0.14] transition-colors">
          <span className="flex items-start gap-3">
            <Bell className="w-4 h-4 mt-0.5 text-zinc-400" />
            <span><span className="block text-[13px] font-medium text-white">Email reminders</span><span className="block text-xs text-zinc-500">Inactive. Use the post-registration group links instead.</span></span>
          </span>
          <Switch checked={false} disabled data-testid="switch-reminders" />
        </label>
        <label className={`flex items-center justify-between gap-3 p-4 rounded-lg cursor-pointer transition-colors border ${s.publish ? "bg-emerald-500/[0.06] border-emerald-500/25" : "bg-white/[0.02] border-white/[0.08] hover:border-white/[0.14]"}`}>
          <span className="flex items-start gap-3">
            <Sparkles className={`w-4 h-4 mt-0.5 ${s.publish ? "text-emerald-400" : "text-zinc-400"}`} />
            <span><span className="block text-[13px] font-medium text-white">{existingStatus === "ended" ? "Keep live pages up" : "Publish now"}</span><span className="block text-xs text-zinc-500">{s.publish ? "Registration opens as soon as you finish." : "Saved as a draft — only you can see it."}</span></span>
          </span>
          <Switch checked={s.publish} onCheckedChange={v => set("publish", v)} data-testid="switch-publish" />
        </label>
      </div>

      {/* Recap */}
      <div className="rounded-lg p-4 bg-black/20 border border-white/[0.06]">
        <p className="text-[13px] font-medium text-zinc-300 mb-3">Final check</p>
        <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-[13px]">
          {[
            { ok: s.channelReady || !!s.ytBroadcastId, label: "Live streaming ready", soft: "Optional" },
            { ok: s.streamScheduled || !!s.ytBroadcastId, label: "Stream scheduled on YouTube", soft: "Optional" },
            { ok: !!parseYouTubeVideoId(s.youtube), label: "YouTube link added", soft: "Add it before go-live" },
            { ok: !!s.deckUrl, label: "Slides added", soft: "Optional" },
            { ok: !!(s.ctaText && s.ctaUrl), label: "CTA button set", soft: "Optional" },
            { ok: !!s.title.trim() && !!scheduledIso, label: "Title & time set" },
          ].map(i => (
            <li key={i.label} className="flex items-center gap-2">
              {i.ok ? <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" aria-hidden /> : <span className="w-4 h-4 rounded-full border border-zinc-700 flex-shrink-0" aria-hidden />}
              <span className={i.ok ? "text-zinc-300" : "text-zinc-500"}>{i.label}</span>
              {!i.ok && i.soft && <span className="text-xs text-zinc-600">· {i.soft}</span>}
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
    { t: "Up to the start", d: "Share the registration page. After signup, attendees join your group using the links you set. No automated email or SMS is sent." },
    { t: "10 minutes before", d: "Open YouTube Studio → Content → Live, open your scheduled stream, and connect your encoder or webcam so the preview is running." },
    { t: `At ${formatIST(row.scheduledAt).replace(/^\w+, /, "")}`, d: "Your Oravini live page switches from the countdown to LIVE automatically — no button to press here. Click “Go live” in YouTube Studio." },
    { t: "During the webinar", d: "Keep this webinar's Live room tab open to read chat, answer Q&A, and see how many are watching." },
    { t: "Afterwards", d: "Click “Mark ended” in the editor. The page becomes a replay (YouTube turns the live into a video automatically, or paste a separate replay link)." },
  ], [row]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]" data-testid="wizard-finished">
      <section className="rounded-xl p-6 sm:p-7 border border-white/[0.1] bg-[#111115]">
        <div className="flex items-center gap-2.5 mb-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <h2 className="text-xl font-semibold text-white tracking-tight">{published ? "Your webinar is published" : "Saved as a draft"}</h2>
        </div>
        <p className="text-sm text-zinc-400 mb-6 break-words">{row.title} · {formatIST(row.scheduledAt)}</p>

        <label htmlFor="recap-reg-link" className="block text-[13px] font-medium text-zinc-300 mb-1.5">Registration link — share this</label>
        <div className="flex items-center gap-2 mb-5">
          <input id="recap-reg-link" readOnly value={regUrl} data-testid="text-reg-link"
            onFocus={e => e.currentTarget.select()}
            className={`flex-1 min-w-0 h-11 px-3.5 rounded-lg text-[13px] text-white bg-black/40 border border-white/[0.1] ${focusRing}`} />
          <button onClick={() => copy(regUrl)} data-testid="btn-copy-reg-link" className={`${btn("primary", "md")} flex-shrink-0`}>
            <Copy className="w-4 h-4" /> Copy
          </button>
        </div>
        <p className="text-[13px] font-medium text-zinc-300 mb-1.5">Live room</p>
        <button onClick={() => copy(liveUrl)} className={`flex items-center gap-1.5 text-[13px] text-zinc-400 hover:text-white max-w-full rounded ${focusRing}`}>
          <Copy className="w-3.5 h-3.5 flex-shrink-0" /> <span className="truncate">{liveUrl}</span>
        </button>
        {!published && (
          <p className="text-[13px] text-amber-300 mt-5 rounded-lg bg-amber-500/[0.06] border border-amber-500/20 px-3 py-2.5">
            Drafts show “not found” to visitors — publish from the editor when you're ready.
          </p>
        )}

        <div className="flex flex-wrap gap-2 mt-6">
          <button onClick={onEdit} className={btn("secondary", "md")}>Open editor &amp; live room</button>
          {published && <a href={`/w/${row.slug}`} target="_blank" rel="noopener noreferrer" className={btn("secondary", "md")}>View page <ArrowUpRight className="w-3.5 h-3.5" /></a>}
          <button onClick={onAll} className={btn("ghost", "md")}>All webinars</button>
        </div>
      </section>

      <section className="rounded-xl p-6 sm:p-7 border border-white/[0.08] bg-white/[0.015]">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><CalendarClock className="w-4 h-4 text-zinc-400" /> What happens at go-live</h3>
        <ol className="relative space-y-5">
          {steps.map((st, i) => (
            <li key={i} className="relative pl-8">
              {i < steps.length - 1 && <span className="absolute left-[11px] top-6 -bottom-5 w-px bg-white/[0.08]" aria-hidden />}
              <span className="absolute left-0 top-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold bg-white/[0.06] text-zinc-300 border border-white/[0.1] tabular-nums" aria-hidden>{i + 1}</span>
              <p className="text-[13px] font-medium text-white">{st.t}</p>
              <p className="text-[13px] text-zinc-400 leading-relaxed mt-0.5">{st.d}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
