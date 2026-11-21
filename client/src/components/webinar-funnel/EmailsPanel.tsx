// Funnel editor → Emails tab: per-funnel overrides of the 3 segmented follow-up emails
// (attended / no-show / clicked offer) with a live preview, the sender in use, and the
// funnel's email send log (latest 100).
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Loader2, Mail, RotateCcw, Save, RefreshCw, Settings2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  FOLLOWUP_TEMPLATE_KEYS, FOLLOWUP_TEMPLATE_LABELS, FOLLOWUP_TEMPLATE_VARIABLES, TEMPLATE_BODY_MAX, TEMPLATE_SUBJECT_MAX,
  renderFollowupTemplate, type EmailTemplate, type FollowupTemplateKey, type FunnelEmailTemplateOverrides,
} from "@shared/webinarEmailTemplates";
import EmailLogList, { type EmailSendRow } from "@/components/email/EmailLogList";
import type { WebinarFunnelFull } from "./hostUtils";

const GOLD = "#d4b461";
const inputCls = "w-full px-3 py-2 rounded-lg text-sm text-white placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-[#d4b461]/50";
const inputStyle = { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", colorScheme: "dark" as const };
const card = { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" };

type TemplatesResponse = {
  defaults: Record<FollowupTemplateKey, EmailTemplate>;
  overrides: FunnelEmailTemplateOverrides;
};
type SenderStatus = { configured: boolean; fromEmail?: string; platformAvailable: boolean; lastError?: string | null };

function SenderStrip() {
  const { data } = useQuery<SenderStatus>({ queryKey: ["/api/settings/email-sender"] });
  if (!data) return null;
  const text = data.configured
    ? <>Sending from <b className="text-white">{data.fromEmail}</b> (your connected mailbox){data.lastError ? <span style={{ color: "#fca5a5" }}> · last send failed</span> : null}</>
    : data.platformAvailable
      ? <>Sending from Oravini's shared address. Connect your own mailbox so replies come to you.</>
      : <span style={{ color: "#fca5a5" }}>No email sender connected — registrants won't get confirmations, reminders or follow-ups.</span>;
  return (
    <div className="flex items-center gap-3 rounded-xl px-4 py-3 mb-5" style={card} data-testid="emails-sender-strip">
      <Mail className="w-4 h-4 shrink-0" style={{ color: GOLD }} />
      <p className="text-xs text-zinc-400 flex-1 min-w-0">{text}</p>
      <Link href="/settings/connections" className="flex items-center gap-1 text-xs font-semibold shrink-0 hover:brightness-110" style={{ color: GOLD }}>
        <Settings2 className="w-3.5 h-3.5" /> {data.configured ? "Manage" : "Connect"}
      </Link>
    </div>
  );
}

export function EmailsPanel({ webinar }: { webinar: WebinarFunnelFull }) {
  const { toast } = useToast();
  const tplKey = [`/api/webinar-funnels/${webinar.id}/email-templates`];
  const logKey = [`/api/webinar-funnels/${webinar.id}/email-log`];
  const { data, isLoading } = useQuery<TemplatesResponse>({ queryKey: tplKey });
  const { data: log, isFetching: logLoading } = useQuery<EmailSendRow[]>({ queryKey: logKey });

  const [active, setActive] = useState<FollowupTemplateKey>("followup_attended");
  const [drafts, setDrafts] = useState<Record<FollowupTemplateKey, EmailTemplate> | null>(null);
  const [saving, setSaving] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const lastFocused = useRef<"subject" | "body">("body");

  // Seed drafts from server (override if present, else default)
  useEffect(() => {
    if (!data || drafts) return;
    setDrafts(Object.fromEntries(FOLLOWUP_TEMPLATE_KEYS.map(k => [k, { ...(data.overrides[k] ?? data.defaults[k]) }])) as Record<FollowupTemplateKey, EmailTemplate>);
  }, [data, drafts]);

  const draft = drafts?.[active];
  const def = data?.defaults[active];
  const savedVersion = data ? (data.overrides[active] ?? data.defaults[active]) : undefined;
  const dirtyKeys = useMemo(() => !drafts || !data ? [] : FOLLOWUP_TEMPLATE_KEYS.filter(k => {
    const saved = data.overrides[k] ?? data.defaults[k];
    return drafts[k].subject !== saved.subject || drafts[k].bodyHtml !== saved.bodyHtml;
  }), [drafts, data]);
  const isCustom = (k: FollowupTemplateKey) => !!drafts && !!data && (drafts[k].subject.trim() !== data.defaults[k].subject.trim() || drafts[k].bodyHtml.trim() !== data.defaults[k].bodyHtml.trim());

  const sampleVars = useMemo(() => ({
    name: "Priya",
    webinarTitle: webinar.title,
    replayUrl: `${window.location.origin}/w/${webinar.slug}`,
    ctaUrl: webinar.ctaUrl && /^https?:\/\//i.test(webinar.ctaUrl) ? webinar.ctaUrl : "",
    ctaText: webinar.ctaText?.trim() || "Claim the offer",
  }), [webinar]);

  const previewSubject = draft ? renderFollowupTemplate(draft.subject, sampleVars, false) : "";
  const previewHtml = draft
    ? `<!doctype html><html><head><meta charset="utf-8"><base target="_blank"></head><body style="margin:0;background:#fff;color:#111">${renderFollowupTemplate(draft.bodyHtml, sampleVars)}</body></html>`
    : "";

  const update = (patch: Partial<EmailTemplate>) => setDrafts(d => d ? { ...d, [active]: { ...d[active], ...patch } } : d);

  const insertVar = (key: string) => {
    if (!draft) return;
    const token = `{{${key}}}`;
    const el = lastFocused.current === "subject" ? subjectRef.current : bodyRef.current;
    const field = lastFocused.current === "subject" ? "subject" : "bodyHtml";
    const value = draft[field];
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    update({ [field]: value.slice(0, start) + token + value.slice(end) });
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(start + token.length, start + token.length); });
  };

  const save = async () => {
    if (!drafts || !dirtyKeys.length) return;
    setSaving(true);
    try {
      const templates = Object.fromEntries(dirtyKeys.map(k => [k, isCustom(k) ? { subject: drafts[k].subject.trim(), bodyHtml: drafts[k].bodyHtml.trim() } : null]));
      const next = await apiRequest("PUT", `/api/webinar-funnels/${webinar.id}/email-templates`, { templates });
      queryClient.setQueryData(tplKey, next);
      setDrafts(Object.fromEntries(FOLLOWUP_TEMPLATE_KEYS.map(k => [k, { ...(next.overrides[k] ?? next.defaults[k]) }])) as Record<FollowupTemplateKey, EmailTemplate>);
      toast({ title: "Follow-up emails saved", description: "They'll be used for this webinar's follow-ups." });
    } catch (e: any) {
      toast({ title: "Couldn't save", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div data-testid="editor-emails-panel">
      <SenderStrip />

      <div className="rounded-2xl p-5 mb-6" style={card}>
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white">Follow-up emails</p>
            <p className="text-xs text-zinc-500">Each registrant gets one email an hour after the webinar ends, matched to what they did.{webinar.remindersEnabled === false && <span style={{ color: "#fca5a5" }}> Emails are turned off for this webinar (Details → reminders).</span>}</p>
          </div>
          <button type="button" onClick={save} disabled={saving || !dirtyKeys.length} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-black hover:brightness-110 disabled:opacity-40 shrink-0" style={{ background: GOLD, color: "#0a0910" }} data-testid="emails-save">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save{dirtyKeys.length > 1 ? ` (${dirtyKeys.length})` : ""}
          </button>
        </div>

        <div role="tablist" className="flex gap-1 p-1 rounded-lg mb-4 overflow-x-auto" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          {FOLLOWUP_TEMPLATE_KEYS.map(k => (
            <button key={k} type="button" role="tab" aria-selected={active === k} onClick={() => setActive(k)} data-testid={`emails-tab-${k}`}
              className={`flex-1 min-w-[96px] py-2 px-2 rounded-md text-xs font-bold transition-all whitespace-nowrap ${active === k ? "text-white" : "text-zinc-500 hover:text-zinc-300"}`}
              style={active === k ? { background: "rgba(255,255,255,0.06)", boxShadow: `inset 0 -2px 0 ${GOLD}` } : undefined}>
              {FOLLOWUP_TEMPLATE_LABELS[k].label}
              {isCustom(k) && <span className="ml-1.5 text-[9px] font-black uppercase tracking-wider" style={{ color: GOLD }}>custom</span>}
              {dirtyKeys.includes(k) && <span className="ml-1 text-zinc-400">•</span>}
            </button>
          ))}
        </div>

        {isLoading || !draft || !def ? (
          <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-zinc-500" /></div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="min-w-0">
              <p className="text-[11px] text-zinc-500 mb-3">{FOLLOWUP_TEMPLATE_LABELS[active].hint}</p>
              <label className="block mb-3">
                <span className="text-xs text-zinc-400">Subject</span>
                <input ref={subjectRef} onFocus={() => { lastFocused.current = "subject"; }} className={`${inputCls} mt-1`} style={inputStyle}
                  value={draft.subject} maxLength={TEMPLATE_SUBJECT_MAX} onChange={e => update({ subject: e.target.value })} data-testid="emails-subject" />
              </label>
              <label className="block">
                <span className="text-xs text-zinc-400">Body (HTML)</span>
                <textarea ref={bodyRef} onFocus={() => { lastFocused.current = "body"; }} className={`${inputCls} mt-1 font-mono text-xs leading-relaxed`} style={{ ...inputStyle, minHeight: 280, resize: "vertical" }}
                  value={draft.bodyHtml} maxLength={TEMPLATE_BODY_MAX} onChange={e => update({ bodyHtml: e.target.value })} spellCheck={false} data-testid="emails-body" />
              </label>

              <div className="mt-3">
                <p className="text-xs text-zinc-400 mb-1.5">Variables <span className="text-zinc-600">— click to insert at the cursor</span></p>
                <div className="flex flex-wrap gap-1.5">
                  {FOLLOWUP_TEMPLATE_VARIABLES.map(v => (
                    <button key={v.key} type="button" onMouseDown={e => e.preventDefault()} onClick={() => insertVar(v.key)} title={v.description}
                      className="px-2 py-1 rounded-md text-[11px] font-mono text-zinc-300 hover:text-white" style={{ background: "rgba(212,180,97,0.08)", border: "1px solid rgba(212,180,97,0.2)" }} data-testid={`emails-var-${v.key}`}>
                      {`{{${v.key}}}`}
                    </button>
                  ))}
                </div>
                <ul className="mt-2 space-y-0.5">
                  {FOLLOWUP_TEMPLATE_VARIABLES.map(v => (
                    <li key={v.key} className="text-[11px] text-zinc-600"><span className="font-mono text-zinc-500">{v.key}</span> — {v.description}</li>
                  ))}
                  <li className="text-[11px] text-zinc-600"><span className="font-mono text-zinc-500">{"{{#if ctaUrl}}…{{/if}}"}</span> — only shows the block when the variable is set</li>
                </ul>
              </div>

              <div className="flex gap-3 mt-4">
                {savedVersion && (draft.subject !== savedVersion.subject || draft.bodyHtml !== savedVersion.bodyHtml) && (
                  <button type="button" onClick={() => update({ ...savedVersion })} className="text-xs text-zinc-500 hover:text-zinc-300">Discard changes</button>
                )}
                {isCustom(active) && (
                  <button type="button" onClick={() => update({ subject: def.subject, bodyHtml: def.bodyHtml })} className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300" data-testid="emails-reset-default">
                    <RotateCcw className="w-3 h-3" /> Reset to default
                  </button>
                )}
              </div>
            </div>

            <div className="min-w-0">
              <p className="text-xs text-zinc-400 mb-1">Live preview <span className="text-zinc-600">— sample registrant "Priya"</span></p>
              <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="px-3 py-2 text-xs" style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <span className="text-zinc-500">Subject: </span><span className="text-white" data-testid="emails-preview-subject">{previewSubject}</span>
                </div>
                {/* Sandboxed: no scripts, no same-origin access — the owner's HTML can't touch the app. */}
                <iframe title="Email preview" sandbox="allow-popups" srcDoc={previewHtml} className="w-full bg-white" style={{ height: 420, border: 0 }} data-testid="emails-preview-frame" />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl p-5" style={card}>
        <div className="flex items-center gap-3 mb-2">
          <p className="text-sm font-bold text-white flex-1">Email log <span className="text-zinc-600 font-normal text-xs">· latest 100</span></p>
          <button type="button" onClick={() => queryClient.invalidateQueries({ queryKey: logKey })} className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300" data-testid="emails-log-refresh">
            <RefreshCw className={`w-3.5 h-3.5 ${logLoading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
        <EmailLogList rows={log} emptyText="No emails for this webinar yet. Confirmations appear here as people register." />
      </div>
    </div>
  );
}
