import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Instagram, CheckCircle2, Loader2, ShieldCheck, ChevronDown, ChevronUp, AlertTriangle,
  ArrowRight, ArrowLeft, X, Radio, Rocket, MessageCircle, Eye, Activity, RefreshCw, PartyPopper, Circle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  DM_WIZARD_STEPS, composeMessage, validateTemplateValues, labelEventType,
  type DmTemplate, type DmTemplateValues, type DmOnboardingProgress, type DmAutomationKind,
} from "@shared/dmOnboarding";
import { openMetaConnect, closeMetaConnectPopup } from "./metaConnect";

export interface OnboardingState {
  progress: DmOnboardingProgress;
  connection: { connected: boolean; igUsername: string | null; igAccountId: string | null; fbPageName: string | null; expiresAt: string | null };
  activeAutomations: number;
  automation: {
    kind: DmAutomationKind; id: string; name: string; keyword: string | null; matchType: string | null;
    postUrl: string | null; message: string; publicReply: string | null; isActive: boolean; triggerCount: number | null;
  } | null;
  showWizard: boolean;
  resumeStep: number;
  templates: DmTemplate[];
}

interface TestEvent {
  id: string; eventType: string; senderId: string | null; senderUsername: string | null;
  text: string | null; receivedAt: string | null; wouldMatch: boolean; reason: string;
}

export const ONBOARDING_QUERY_KEY = ["/api/dm/onboarding"];

const PERMISSIONS: { name: string; why: string }[] = [
  { name: "See your Instagram profile", why: "So we know which account to automate and can show your username." },
  { name: "Read & send Instagram messages", why: "To reply instantly when someone DMs you a keyword, comments, or mentions you." },
  { name: "See your Facebook Pages", why: "Instagram messaging runs through the Facebook Page linked to your account." },
  { name: "Manage Page settings & engagement", why: "So Instagram delivers new comments and DMs to us in real time (webhooks)." },
  { name: "Your email", why: "To match the connection to your Oravini account." },
];

const TROUBLESHOOTING: { q: string; a: string }[] = [
  { q: "Facebook asked me to “confirm it's you” / showed a security checkpoint", a: "That's Facebook's checkpoint, not us. Open facebook.com in a normal tab, complete the check (code or photo), then come back and click Connect again. It usually clears in a few minutes." },
  { q: "It connected the wrong Facebook or Instagram account", a: "The popup uses whichever Facebook profile is logged in on this browser. Go to facebook.com, log out (or switch profile), log in as the profile that manages your Page, then click Connect again. In the popup use “Edit settings” to tick only the right Page and Instagram account." },
  { q: "It says no Instagram account was found", a: "Your Instagram must be a Professional (Business or Creator) account and linked to a Facebook Page. In Instagram: Settings → Account type and tools → Switch to professional, then link your Page in Accounts Center. Then reconnect." },
  { q: "I skipped a permission or didn't tick my Page", a: "Click Connect again and, in the Meta popup, choose “Edit settings” and leave every Page, account and permission switched on." },
  { q: "Connected, but DMs never arrive", a: "In the Instagram app: Settings → Messages and story replies → Message controls → Connected tools → turn on “Allow access to messages”." },
];

function StepPill({ n, label, state }: { n: number; label: string; state: "done" | "current" | "todo" }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 border
        ${state === "done" ? "bg-green-500/20 border-green-500/40 text-green-400" : state === "current" ? "bg-primary/20 border-primary/50 text-primary" : "bg-muted/30 border-border text-muted-foreground"}`}>
        {state === "done" ? <CheckCircle2 className="w-3.5 h-3.5" /> : n}
      </span>
      <span className={`text-xs truncate ${state === "current" ? "text-foreground font-semibold" : "text-muted-foreground"}`}>{label}</span>
    </div>
  );
}

function MessagePreview({ text, label = "What they'll receive" }: { text: string; label?: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3">
      <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-2 flex items-center gap-1"><Eye className="w-3 h-3" />{label}</p>
      <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-primary/15 border border-primary/20 px-3 py-2 text-xs text-foreground whitespace-pre-wrap break-words">
        {text || <span className="text-muted-foreground italic">Your message will appear here</span>}
      </div>
    </div>
  );
}

function valuesFromAutomation(t: DmTemplate, a: OnboardingState["automation"]): DmTemplateValues {
  const v: DmTemplateValues = { ...t.defaults };
  if (!a) return v;
  if (a.keyword) v.keyword = a.keyword;
  if (a.message) { v.message = a.message; v.link = ""; }
  if (a.publicReply != null) v.publicReply = a.publicReply;
  if (a.postUrl) v.postUrl = a.postUrl;
  return v;
}

export function DMOnboardingWizard({ state, onClose, onOpenLogs }: {
  state: OnboardingState;
  onClose: () => void;
  onOpenLogs?: () => void;
}) {
  const { toast } = useToast();
  const connectedIg = state.connection.connected && !!state.connection.igAccountId;
  const [step, setStep] = useState<number>(() => state.resumeStep || 1);
  const [waitingForConnect, setWaitingForConnect] = useState(false);
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(state.progress.templateId);
  const selected = useMemo(() => state.templates.find(t => t.id === selectedId) ?? null, [selectedId, state.templates]);
  const [values, setValues] = useState<DmTemplateValues>(() => {
    const t = state.templates.find(x => x.id === state.progress.templateId);
    return t ? valuesFromAutomation(t, state.automation) : {};
  });
  const [replaceOpen, setReplaceOpen] = useState<{ message: string } | null>(null);
  const [live, setLive] = useState(!!state.progress.completedAt);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ONBOARDING_QUERY_KEY });

  // Poll for the connection while the user is in the Meta popup.
  const pollConnection = !connectedIg && step === 1;
  useEffect(() => {
    if (!pollConnection) return;
    const id = setInterval(() => { invalidate(); }, waitingForConnect ? 3000 : 10000);
    return () => clearInterval(id);
  }, [pollConnection, waitingForConnect]); // eslint-disable-line react-hooks/exhaustive-deps
  const wasConnected = useRef(connectedIg);
  useEffect(() => {
    if (connectedIg && !wasConnected.current) {
      closeMetaConnectPopup();
      setWaitingForConnect(false);
      toast({ title: "Instagram connected 🎉", description: state.connection.igUsername ? `@${state.connection.igUsername} is ready.` : undefined });
    }
    wasConnected.current = connectedIg;
  }, [connectedIg]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveStep = useMutation({
    mutationFn: (body: any) => apiRequest("PUT", "/api/dm/onboarding", body),
    onSuccess: invalidate,
  });
  const goTo = (n: number, completeStep?: number) => {
    setStep(n);
    saveStep.mutate({ currentStep: n, ...(completeStep ? { completeStep } : {}) });
  };

  const skip = useMutation({
    mutationFn: () => apiRequest("PUT", "/api/dm/onboarding", { dismissed: true }),
    onSuccess: () => { invalidate(); onClose(); toast({ title: "Setup saved", description: "Pick up where you left off any time with “Setup wizard”." }); },
  });

  const install = useMutation({
    mutationFn: (replaceExisting: boolean) => apiRequest("POST", "/api/dm/onboarding/install", { templateId: selectedId, values, replaceExisting }),
    onSuccess: () => { invalidate(); setStep(3); toast({ title: "Automation created", description: "It's paused until you go live. Let's test it." }); },
    onError: (e: any) => {
      if (e?.status === 409 && e?.data?.existing) { setReplaceOpen({ message: e.data.existing.message }); return; }
      toast({ title: "Couldn't create automation", description: e.message, variant: "destructive" });
    },
  });

  const startTest = useMutation({
    mutationFn: () => apiRequest("POST", "/api/dm/onboarding/test/start"),
    onSuccess: () => { invalidate(); queryClient.invalidateQueries({ queryKey: ["/api/dm/onboarding/test/events"] }); },
  });
  const listening = !!state.progress.testStartedAt && step === 3;
  const { data: testData } = useQuery<{ listening: boolean; events: TestEvent[]; received: boolean; matched: boolean }>({
    queryKey: ["/api/dm/onboarding/test/events"],
    queryFn: () => apiRequest("GET", "/api/dm/onboarding/test/events"),
    enabled: listening,
    refetchInterval: 3000,
  });
  const [listenSeconds, setListenSeconds] = useState(0);
  useEffect(() => {
    if (!listening || !state.progress.testStartedAt) return;
    const started = new Date(state.progress.testStartedAt).getTime();
    const tick = () => setListenSeconds(Math.max(0, Math.floor((Date.now() - started) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [listening, state.progress.testStartedAt]);

  const goLive = useMutation({
    mutationFn: () => apiRequest("POST", "/api/dm/onboarding/go-live"),
    onSuccess: () => {
      setLive(true);
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["/api/dm/triggers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dm/health"] });
    },
    onError: (e: any) => toast({ title: "Couldn't go live", description: e.message, variant: "destructive" }),
  });

  const pickTemplate = (t: DmTemplate) => {
    setSelectedId(t.id);
    setValues(t.id === state.progress.templateId ? valuesFromAutomation(t, state.automation) : { ...t.defaults });
  };

  const problems = selected ? validateTemplateValues(selected, values) : [];
  const installedTemplate = state.templates.find(t => t.id === state.progress.templateId) ?? null;
  const done = (n: number) => state.progress.completedSteps.includes(n) || (n === 1 && connectedIg);

  return (
    <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-5 space-y-5" data-testid="dm-onboarding-wizard">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
          <Rocket className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold text-foreground">Get your DM automation live in a few minutes</h2>
          <p className="text-xs text-muted-foreground">4 quick steps. Your progress is saved — you can leave and come back any time.</p>
        </div>
        {!live && (
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1" onClick={() => skip.mutate()} disabled={skip.isPending} data-testid="button-wizard-skip">
            Skip for now <X className="w-3.5 h-3.5" />
          </Button>
        )}
        {live && (
          <Button variant="ghost" size="sm" className="text-xs" onClick={onClose}><X className="w-4 h-4" /></Button>
        )}
      </div>

      {/* Stepper */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {DM_WIZARD_STEPS.map(s => (
          <button key={s.id} type="button" className="text-left disabled:cursor-not-allowed"
            disabled={live || (s.id > 1 && !connectedIg) || (s.id > 2 && !state.progress.automationId)}
            onClick={() => goTo(s.id)} data-testid={`wizard-step-${s.key}`}>
            <StepPill n={s.id} label={s.label} state={step === s.id && !live ? "current" : done(s.id) || live ? "done" : "todo"} />
          </button>
        ))}
      </div>
      <div className="h-1 rounded-full bg-muted/40 overflow-hidden">
        <div className="h-full bg-primary transition-all" style={{ width: `${live ? 100 : ((step - 1) / 4) * 100 + 12.5}%` }} />
      </div>

      {/* ── Done ───────────────────────────────────────────────────────────── */}
      {live && (
        <div className="text-center py-6 space-y-3" data-testid="wizard-live">
          <div className="w-14 h-14 rounded-full bg-green-500/15 flex items-center justify-center mx-auto"><PartyPopper className="w-7 h-7 text-green-400" /></div>
          <h3 className="text-lg font-bold text-foreground">You're live! 🎉</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {state.automation?.name ?? installedTemplate?.name ?? "Your automation"} is now running on @{state.connection.igUsername}. Every run shows up in Status &amp; Logs, and we'll warn you here if anything breaks.
          </p>
          <div className="flex justify-center gap-2">
            {onOpenLogs && <Button variant="outline" className="gap-2" onClick={() => { onOpenLogs(); onClose(); }}><Activity className="w-4 h-4" />Open Status &amp; Logs</Button>}
            <Button onClick={onClose}>Done</Button>
          </div>
        </div>
      )}

      {/* ── Step 1: Connect ────────────────────────────────────────────────── */}
      {!live && step === 1 && (
        <div className="grid md:grid-cols-2 gap-5" data-testid="wizard-connect">
          <div className="space-y-4">
            {connectedIg ? (
              <div className="p-4 rounded-xl border border-green-500/30 bg-green-500/10 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-green-400">Connected</p>
                  <p className="text-xs text-muted-foreground">@{state.connection.igUsername}{state.connection.fbPageName ? ` · Page: ${state.connection.fbPageName}` : ""}</p>
                </div>
              </div>
            ) : state.connection.connected ? (
              <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-amber-400">Facebook connected, but no Instagram account found</p>
                  <p className="text-xs text-muted-foreground">{state.connection.fbPageName ? `Page “${state.connection.fbPageName}” has` : "Your Page has"} no Instagram Professional account linked. See “It says no Instagram account was found” below, then connect again.</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Connect the Instagram account you want to automate. You'll log in with the Facebook profile that manages its Page — it takes about 30 seconds.</p>
            )}

            {connectedIg ? (
              <div className="flex gap-2">
                <Button className="flex-1 gap-2" onClick={() => goTo(2, 1)} data-testid="button-wizard-continue-connect">Continue <ArrowRight className="w-4 h-4" /></Button>
                <Button variant="outline" onClick={() => { openMetaConnect(); setWaitingForConnect(true); }}>Use a different account</Button>
              </div>
            ) : (
              <Button size="lg" className="w-full h-12 gap-2 text-base bg-gradient-to-r from-pink-500 via-fuchsia-500 to-orange-400 hover:opacity-90 text-white border-0"
                onClick={() => { openMetaConnect(); setWaitingForConnect(true); }} data-testid="button-wizard-connect">
                <Instagram className="w-5 h-5" />{state.connection.connected ? "Connect again" : "Connect Instagram"}
              </Button>
            )}

            {waitingForConnect && !connectedIg && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground p-3 rounded-lg bg-muted/20 border border-border" data-testid="wizard-waiting-connect">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                Waiting for Instagram… finish in the popup. This updates automatically.
                <button className="ml-auto underline" onClick={() => invalidate()}>Check now</button>
              </div>
            )}

            <div className="rounded-xl border border-border">
              <button className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold text-foreground" onClick={() => setShowTroubleshoot(v => !v)} data-testid="button-wizard-troubleshoot">
                <span className="flex items-center gap-2"><AlertTriangle className="w-3.5 h-3.5 text-amber-400" />Having trouble connecting?</span>
                {showTroubleshoot ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showTroubleshoot && (
                <div className="px-3 pb-3 space-y-3">
                  {TROUBLESHOOTING.map(t => (
                    <div key={t.q}>
                      <p className="text-xs font-semibold text-foreground">{t.q}</p>
                      <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">{t.a}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-muted/10 p-4 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2"><ShieldCheck className="w-3.5 h-3.5" />What we ask for, and why</p>
            <ul className="space-y-2.5">
              {PERMISSIONS.map(p => (
                <li key={p.name} className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">{p.name}</p>
                    <p className="text-[11px] text-muted-foreground">{p.why}</p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-muted-foreground border-t border-border pt-2">We never post for you, never see your password, and only message people who interact with you first. You can disconnect any time.</p>
          </div>
        </div>
      )}

      {/* ── Step 2: Template ───────────────────────────────────────────────── */}
      {!live && step === 2 && (
        <div className="space-y-4" data-testid="wizard-template">
          <p className="text-sm text-muted-foreground">Pick a ready-made automation. You can tweak the keyword and message before anything goes live.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {state.templates.map(t => (
              <button key={t.id} type="button" onClick={() => pickTemplate(t)} data-testid={`template-${t.id}`}
                className={`text-left p-3.5 rounded-xl border transition-colors ${selectedId === t.id ? "border-primary bg-primary/10 ring-1 ring-primary/40" : "border-border bg-card hover:border-primary/40"}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{t.emoji}</span>
                  <p className="text-sm font-semibold text-foreground">{t.name}</p>
                  {state.progress.templateId === t.id && state.progress.automationId && <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-semibold">Installed</span>}
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{t.tagline}</p>
              </button>
            ))}
          </div>

          {selected && (
            <div className="grid md:grid-cols-2 gap-4 p-4 rounded-xl border border-border bg-card" data-testid="template-form">
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">{selected.description}</p>
                {selected.fields.map(f => (
                  <div key={f.key} className="space-y-1">
                    <Label className="text-xs">{f.label}{f.required && <span className="text-red-400"> *</span>}</Label>
                    {f.multiline ? (
                      <Textarea rows={3} value={values[f.key] ?? ""} placeholder={f.placeholder} onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))} data-testid={`field-${f.key}`} />
                    ) : (
                      <Input value={values[f.key] ?? ""} placeholder={f.placeholder} onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))} data-testid={`field-${f.key}`} />
                    )}
                    {f.help && <p className="text-[10px] text-muted-foreground">{f.help}</p>}
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                <MessagePreview text={composeMessage(values.message, values.link)} />
                {selected.kind === "comment_reply" && (values.publicReply ?? "").trim() && (
                  <MessagePreview text={values.publicReply ?? ""} label="Public reply under their comment" />
                )}
                {problems.length > 0 && (
                  <ul className="text-[11px] text-amber-400 space-y-0.5">{problems.map(p => <li key={p}>• {p}</li>)}</ul>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-between">
            <Button variant="ghost" className="gap-1" onClick={() => goTo(1)}><ArrowLeft className="w-4 h-4" />Back</Button>
            <Button className="gap-2" disabled={!selected || problems.length > 0 || install.isPending} onClick={() => install.mutate(false)} data-testid="button-install-template">
              {install.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {state.progress.templateId === selectedId && state.progress.automationId ? "Save & continue" : "Install template"} <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 3: Test ───────────────────────────────────────────────────── */}
      {!live && step === 3 && installedTemplate && (
        <div className="grid md:grid-cols-2 gap-5" data-testid="wizard-test">
          <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground">Let's make sure Instagram is talking to us</p>
            <ol className="space-y-2 text-xs text-muted-foreground">
              <li className="flex gap-2"><span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center flex-shrink-0">1</span>Grab a second Instagram account (a friend's, or a spare one). Your own account won't trigger anything.</li>
              <li className="flex gap-2"><span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center flex-shrink-0">2</span>Click <strong className="text-foreground">Start listening</strong> below.</li>
              <li className="flex gap-2"><span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center flex-shrink-0">3</span>
                <span>{installedTemplate.testInstruction}{state.automation?.keyword ? <> Use <code className="px-1 py-0.5 rounded bg-muted text-foreground font-semibold">{state.automation.keyword}</code>.</> : null}</span>
              </li>
            </ol>
            <p className="text-[11px] text-muted-foreground p-2.5 rounded-lg bg-muted/20 border border-border">Your automation stays paused during the test, so the test account won't get a reply yet — we're checking that Instagram delivers the event to us and that your keyword matches. Real replies start when you go live.</p>
            <div className="flex gap-2">
              <Button className="gap-2" onClick={() => startTest.mutate()} disabled={startTest.isPending} data-testid="button-start-test">
                {listening ? <><RefreshCw className="w-4 h-4" />Restart test</> : <><Radio className="w-4 h-4" />Start listening</>}
              </Button>
              <Button variant="outline" onClick={() => setStep(2)}>Edit automation</Button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-muted/10 p-4 space-y-3 min-h-[220px]" data-testid="test-events">
            {!listening ? (
              <div className="h-full flex flex-col items-center justify-center text-center gap-2 py-8">
                <Radio className="w-8 h-8 text-muted-foreground/50" />
                <p className="text-xs text-muted-foreground">Click Start listening, then send the test from your second account.</p>
              </div>
            ) : !testData?.received ? (
              <div className="flex flex-col items-center justify-center text-center gap-2 py-6">
                <span className="relative flex h-4 w-4"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" /><span className="relative inline-flex rounded-full h-4 w-4 bg-primary" /></span>
                <p className="text-sm font-semibold text-foreground">Listening for Instagram events…</p>
                <p className="text-[11px] text-muted-foreground">{listenSeconds}s — events usually arrive within a few seconds.</p>
                {listenSeconds > 60 && (
                  <div className="text-left text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 space-y-1 mt-2" data-testid="test-no-events-help">
                    <p className="font-semibold">Nothing yet? Check:</p>
                    <p>• You sent it from a <em>different</em> account than @{state.connection.igUsername}.</p>
                    <p>• In Instagram: Settings → Messages and story replies → Message controls → Connected tools → “Allow access to messages” is on.</p>
                    <p>• If it still doesn't arrive, reconnect Instagram (step 1) and tick your Page in the popup.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <p className={`text-sm font-bold flex items-center gap-2 ${testData.matched ? "text-green-400" : "text-amber-400"}`} data-testid="test-result">
                  {testData.matched ? <><CheckCircle2 className="w-4 h-4" />We received it — and your automation matches!</> : <><AlertTriangle className="w-4 h-4" />We received it, but it didn't match yet</>}
                </p>
                {testData.events.slice(0, 5).map(e => (
                  <div key={e.id} className="p-2.5 rounded-lg border border-border bg-card text-xs space-y-1">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="w-3.5 h-3.5 text-primary" />
                      <span className="font-semibold text-foreground capitalize">{labelEventType(e.eventType)}</span>
                      <span className="text-muted-foreground">{e.senderUsername ? `from @${e.senderUsername}` : ""}</span>
                      <span className="ml-auto text-[10px] text-muted-foreground">{e.receivedAt ? formatDistanceToNow(new Date(e.receivedAt), { addSuffix: true }) : ""}</span>
                    </div>
                    {e.text && <p className="text-muted-foreground italic truncate">“{e.text}”</p>}
                    <p className={e.wouldMatch ? "text-green-400" : "text-amber-400"}>{e.wouldMatch ? "✓ " : "✗ "}{e.reason}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="md:col-span-2 flex justify-between">
            <Button variant="ghost" className="gap-1" onClick={() => goTo(2)}><ArrowLeft className="w-4 h-4" />Back</Button>
            <div className="flex gap-2">
              {!testData?.matched && <Button variant="ghost" className="text-xs text-muted-foreground" onClick={() => goTo(4)} data-testid="button-skip-test">Skip test</Button>}
              <Button className="gap-2" variant={testData?.matched ? "default" : "outline"} onClick={() => goTo(4, testData?.matched ? 3 : undefined)} data-testid="button-continue-test">Continue <ArrowRight className="w-4 h-4" /></Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 4: Go live ────────────────────────────────────────────────── */}
      {!live && step === 4 && (
        <div className="space-y-4" data-testid="wizard-golive">
          {!state.automation ? (
            <p className="text-sm text-muted-foreground">Pick a template first.</p>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-border bg-card p-4 space-y-2.5 text-xs">
                <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Summary</p>
                <Row label="Account" value={state.connection.igUsername ? `@${state.connection.igUsername}` : "—"} ok={connectedIg} />
                <Row label="Automation" value={`${installedTemplate?.emoji ?? ""} ${installedTemplate?.name ?? state.automation.name}`} ok />
                {state.automation.keyword && <Row label="Keyword" value={state.automation.keyword} ok />}
                {state.automation.postUrl && <Row label="Only on post" value={state.automation.postUrl} ok />}
                <Row label="Test" value={state.progress.completedSteps.includes(3) ? "Passed — events received & matched" : state.progress.testConfirmedAt ? "Event received (no match)" : "Skipped"} ok={state.progress.completedSteps.includes(3)} />
              </div>
              <div className="space-y-3">
                <MessagePreview text={state.automation.message} />
                {state.automation.kind === "comment_reply" && state.automation.publicReply && <MessagePreview text={state.automation.publicReply} label="Public reply" />}
              </div>
            </div>
          )}
          {!connectedIg && <p className="text-xs text-amber-400">Connect Instagram (step 1) before going live.</p>}
          <div className="flex justify-between">
            <Button variant="ghost" className="gap-1" onClick={() => goTo(3)}><ArrowLeft className="w-4 h-4" />Back</Button>
            <Button size="lg" className="gap-2 bg-green-600 hover:bg-green-500 text-white" disabled={!state.automation || !connectedIg || goLive.isPending} onClick={() => goLive.mutate()} data-testid="button-go-live">
              {goLive.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}Activate &amp; go live
            </Button>
          </div>
        </div>
      )}

      <Dialog open={!!replaceOpen} onOpenChange={o => !o && setReplaceOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Replace your current welcome message?</DialogTitle>
            <DialogDescription>You already have a welcome DM. We'll keep a copy of the old text in your setup history.</DialogDescription>
          </DialogHeader>
          <div className="text-xs p-3 rounded-lg bg-muted/30 border border-border whitespace-pre-wrap">{replaceOpen?.message}</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplaceOpen(null)}>Keep current</Button>
            <Button onClick={() => { setReplaceOpen(null); install.mutate(true); }}>Replace</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex items-start gap-2">
      {ok ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0 mt-0.5" /> : <Circle className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />}
      <span className="text-muted-foreground w-24 flex-shrink-0">{label}</span>
      <span className="text-foreground break-all">{value}</span>
    </div>
  );
}

/** Loads onboarding state; renders nothing while loading or on error (never blocks the page). */
export function useDmOnboarding(enabled = true) {
  return useQuery<OnboardingState>({
    queryKey: ONBOARDING_QUERY_KEY,
    queryFn: () => apiRequest("GET", "/api/dm/onboarding"),
    enabled,
    staleTime: 15000,
    retry: 1,
  });
}

export function DMOnboardingWizardSkeleton() {
  return <Skeleton className="h-48 w-full rounded-2xl" />;
}
