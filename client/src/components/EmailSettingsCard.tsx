// Settings → Email sending: each account connects its OWN mailbox for Webinar Funnel emails
// (confirmations, 1-hour reminders, follow-ups). Free routes only: a Gmail / Google Workspace
// app password, or any SMTP server the account already has. The password is write-only from
// here — it's verified against the mail server, encrypted on the server, and never shown again.
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Mail, Send, Trash2, CheckCircle2, XCircle, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import EmailLogList, { type EmailSendRow } from "@/components/email/EmailLogList";

const GOLD = "#d4b461";
const KEY = ["/api/settings/email-sender"];
const LOG_KEY = ["/api/settings/email-sender/log"];

type Provider = "gmail_app_password" | "smtp";
type SenderSettings = {
  configured: boolean;
  provider?: Provider;
  fromName?: string | null;
  fromEmail?: string;
  host?: string | null;
  port?: number | null;
  secure?: boolean | null;
  username?: string;
  passLast4?: string | null;
  lastVerifiedAt?: string | null;
  lastError?: string | null;
  platformAvailable: boolean;
  encryptionReady: boolean;
  activeVia: "account" | "platform" | "none";
  usage24h?: { sent: number; sentViaAccount: number; failed: number; skipped: number };
  gmailDailyCap?: number;
};

const inputCls = "w-full px-3 py-2 rounded-lg text-sm text-white placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-[#d4b461]/50";
const inputStyle = { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" };

export default function EmailSettingsCard() {
  const { toast } = useToast();
  const { data, isLoading } = useQuery<SenderSettings>({ queryKey: KEY });
  const { data: log } = useQuery<EmailSendRow[]>({ queryKey: LOG_KEY });

  const [provider, setProvider] = useState<Provider>("gmail_app_password");
  const [fromName, setFromName] = useState("");
  const [gmailAddress, setGmailAddress] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [host, setHost] = useState("");
  const [port, setPort] = useState("587");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [showLog, setShowLog] = useState(false);

  useEffect(() => {
    if (!data?.configured) return;
    setProvider(data.provider ?? "gmail_app_password");
    setFromName(data.fromName ?? "");
    if (data.provider === "gmail_app_password") setGmailAddress(data.username ?? "");
    else {
      setFromEmail(data.fromEmail ?? "");
      setHost(data.host ?? "");
      setPort(String(data.port ?? 587));
      setUsername(data.username ?? "");
    }
  }, [data]);

  const configured = !!data?.configured;
  const sameAccount = configured && data?.provider === provider
    && (provider === "gmail_app_password" ? data?.username === gmailAddress.trim().toLowerCase() : data?.username === username.trim() && data?.host === host.trim().toLowerCase());
  const needsPassword = !sameAccount;
  const canSave = !!data?.encryptionReady && (provider === "gmail_app_password"
    ? !!gmailAddress.trim() && (!needsPassword || !!appPassword.trim())
    : !!fromEmail.trim() && !!host.trim() && !!username.trim() && (!needsPassword || !!password));

  const save = async () => {
    setSaving(true);
    setTestResult(null);
    try {
      const body = provider === "gmail_app_password"
        ? { provider, fromName: fromName.trim() || null, gmailAddress: gmailAddress.trim(), ...(appPassword.trim() ? { appPassword: appPassword.trim() } : {}) }
        : { provider, fromName: fromName.trim() || null, fromEmail: fromEmail.trim(), host: host.trim(), port: Number(port), username: username.trim(), ...(password ? { password } : {}) };
      await apiRequest("PUT", "/api/settings/email-sender", body);
      setAppPassword("");
      setPassword("");
      await queryClient.invalidateQueries({ queryKey: KEY });
      toast({ title: "Email sender connected", description: "Verified with your mail server. Webinar emails now go out from your address." });
    } catch (e: any) {
      toast({ title: "Couldn't connect", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const r = await apiRequest("POST", "/api/settings/email-sender/test");
      setTestResult({ ok: true, message: `Sent to ${r.to} from ${r.from}. Check your inbox (and spam).` });
    } catch (e: any) {
      setTestResult({ ok: false, message: e.message });
    } finally {
      setTesting(false);
      queryClient.invalidateQueries({ queryKey: LOG_KEY });
      queryClient.invalidateQueries({ queryKey: KEY });
    }
  };

  const disconnect = async () => {
    if (!confirm("Disconnect your email sender? Webinar emails will fall back to Oravini's shared sender (if available).")) return;
    setRemoving(true);
    try {
      await apiRequest("DELETE", "/api/settings/email-sender");
      setAppPassword(""); setPassword(""); setTestResult(null);
      await queryClient.invalidateQueries({ queryKey: KEY });
      toast({ title: "Email sender disconnected" });
    } catch (e: any) {
      toast({ title: "Couldn't disconnect", description: e.message, variant: "destructive" });
    } finally {
      setRemoving(false);
    }
  };

  const usage = data?.usage24h;
  const cap = data?.gmailDailyCap ?? 500;
  const gmailUsed = configured && data?.provider === "gmail_app_password" ? usage?.sentViaAccount ?? 0 : null;
  const status = isLoading ? null : configured
    ? (data?.lastError ? { label: "Needs attention", style: { color: "#fca5a5", border: "1px solid rgba(248,113,113,0.3)", background: "rgba(248,113,113,0.08)" } }
      : { label: "Connected", style: { color: GOLD, background: "rgba(212,180,97,0.1)", border: "1px solid rgba(212,180,97,0.25)" } })
    : { label: data?.platformAvailable ? "Using Oravini sender" : "Not set up", style: { color: "#71717a", border: "1px solid rgba(255,255,255,0.08)" } };

  return (
    <div className="mt-4" data-testid="settings-email-sender">
      <div className="rounded-2xl p-6" style={{ background: "rgba(212,180,97,0.04)", border: "1px solid rgba(212,180,97,0.14)" }}>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(212,180,97,0.12)", border: "1px solid rgba(212,180,97,0.25)" }}>
            <Mail className="w-4 h-4" style={{ color: GOLD }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white">Email sending</p>
            <p className="text-xs text-zinc-500">Send webinar confirmations, reminders &amp; follow-ups from your own address — free</p>
          </div>
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin text-zinc-500" /> : status && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md shrink-0" style={status.style} data-testid="settings-email-status">{status.label}</span>
          )}
        </div>

        {data && !data.encryptionReady && (
          <p className="text-xs rounded-lg px-3 py-2 mb-4" style={{ color: "#fca5a5", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)" }}>
            Connecting a mailbox is unavailable until the server's encryption key is configured. Passwords are never stored unencrypted.
          </p>
        )}
        {configured && data?.lastError && (
          <p className="text-xs rounded-lg px-3 py-2 mb-4 break-words" style={{ color: "#fca5a5", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)" }} data-testid="settings-email-last-error">
            Last send failed: {data.lastError}
          </p>
        )}

        <div className="flex gap-1 p-1 rounded-lg mb-4" role="radiogroup" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          {([
            { id: "gmail_app_password", label: "Gmail app password" },
            { id: "smtp", label: "Custom SMTP" },
          ] as const).map(o => (
            <button key={o.id} type="button" role="radio" aria-checked={provider === o.id} onClick={() => setProvider(o.id)} data-testid={`email-provider-${o.id}`}
              className={`flex-1 py-2 rounded-md text-xs font-bold transition-all ${provider === o.id ? "text-white" : "text-zinc-500 hover:text-zinc-300"}`}
              style={provider === o.id ? { background: "rgba(255,255,255,0.06)", boxShadow: `inset 0 -2px 0 ${GOLD}` } : undefined}>
              {o.label}
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-xs text-zinc-400">From name <span className="text-zinc-600">(optional — defaults to the webinar's host name)</span></span>
            <input className={`${inputCls} mt-1`} style={inputStyle} value={fromName} onChange={e => setFromName(e.target.value)} maxLength={80} placeholder="e.g. Priya from Acme Coaching" data-testid="email-from-name" />
          </label>

          {provider === "gmail_app_password" ? (
            <>
              <label className="block">
                <span className="text-xs text-zinc-400">Gmail / Google Workspace address</span>
                <input type="email" autoComplete="email" className={`${inputCls} mt-1`} style={inputStyle} value={gmailAddress} onChange={e => setGmailAddress(e.target.value)} placeholder="you@gmail.com" data-testid="email-gmail-address" />
              </label>
              <label className="block">
                <span className="text-xs text-zinc-400">App password{data?.passLast4 && sameAccount ? <span className="text-zinc-600"> · ends in …{data.passLast4}</span> : null}</span>
                <input type="password" autoComplete="new-password" className={`${inputCls} mt-1`} style={inputStyle} value={appPassword} onChange={e => setAppPassword(e.target.value)} placeholder={sameAccount ? "unchanged" : "abcd efgh ijkl mnop"} data-testid="email-app-password" />
              </label>
            </>
          ) : (
            <>
              <label className="block">
                <span className="text-xs text-zinc-400">From email</span>
                <input type="email" className={`${inputCls} mt-1`} style={inputStyle} value={fromEmail} onChange={e => setFromEmail(e.target.value)} placeholder="hello@yourdomain.com" data-testid="email-from-email" />
              </label>
              <div className="grid grid-cols-[1fr_96px] gap-2">
                <label className="block min-w-0">
                  <span className="text-xs text-zinc-400">SMTP host</span>
                  <input className={`${inputCls} mt-1`} style={inputStyle} value={host} onChange={e => setHost(e.target.value)} placeholder="smtp.yourdomain.com" autoCapitalize="none" data-testid="email-smtp-host" />
                </label>
                <label className="block">
                  <span className="text-xs text-zinc-400">Port</span>
                  <select className={`${inputCls} mt-1`} style={{ ...inputStyle, colorScheme: "dark" }} value={port} onChange={e => setPort(e.target.value)} data-testid="email-smtp-port">
                    {["587", "465", "2525", "25"].map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </label>
              </div>
              <label className="block">
                <span className="text-xs text-zinc-400">SMTP username</span>
                <input autoComplete="username" className={`${inputCls} mt-1`} style={inputStyle} value={username} onChange={e => setUsername(e.target.value)} placeholder="usually your full email" autoCapitalize="none" data-testid="email-smtp-username" />
              </label>
              <label className="block">
                <span className="text-xs text-zinc-400">SMTP password{data?.passLast4 && sameAccount ? <span className="text-zinc-600"> · ends in …{data.passLast4}</span> : null}</span>
                <input type="password" autoComplete="new-password" className={`${inputCls} mt-1`} style={inputStyle} value={password} onChange={e => setPassword(e.target.value)} placeholder={sameAccount ? "unchanged" : ""} data-testid="email-smtp-password" />
              </label>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap mt-5">
          {configured && (
            <button type="button" onClick={disconnect} disabled={removing} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-zinc-500 hover:text-red-300 disabled:opacity-40" data-testid="email-disconnect">
              {removing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Disconnect
            </button>
          )}
          <div className="flex-1" />
          <button type="button" onClick={sendTest} disabled={testing || (!configured && !data?.platformAvailable)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-zinc-300 hover:text-white disabled:opacity-40" style={{ border: "1px solid rgba(255,255,255,0.1)" }} data-testid="email-send-test">
            {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Send test to me
          </button>
          <button type="button" onClick={save} disabled={saving || !canSave} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-black hover:brightness-110 disabled:opacity-50" style={{ background: GOLD, color: "#0a0910" }} data-testid="email-save">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} {saving ? "Verifying…" : configured ? "Save" : "Verify & connect"}
          </button>
        </div>

        {testResult && (
          <div className="flex items-start gap-2 text-xs rounded-lg px-3 py-2 mt-3 break-words" role="status" data-testid={testResult.ok ? "email-test-ok" : "email-test-failed"}
            style={testResult.ok ? { color: "#86efac", background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)" } : { color: "#fca5a5", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)" }}>
            {testResult.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
            <span>{testResult.message}</span>
          </div>
        )}

        <p className="text-[11px] text-zinc-600 mt-3 leading-relaxed">
          {provider === "gmail_app_password"
            ? <>Turn on 2-Step Verification for the Google account, then create an app password at myaccount.google.com → Security → App passwords. Gmail allows about {cap} emails a day (Workspace ~2,000).</>
            : <>Use the SMTP details from your email host (your domain's mailbox, Zoho, etc.). Port 587 uses STARTTLS, 465 uses SSL. The connection is always encrypted.</>}
          {" "}We verify the login with your mail server before saving. Your password is encrypted and never shown again.
          {!configured && data?.platformAvailable && " Until you connect one, emails go out from Oravini's shared sender."}
        </p>

        {/* Usage + recent log */}
        <div className="mt-5 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <button type="button" onClick={() => setShowLog(v => !v)} className="w-full flex items-center gap-3 text-left" aria-expanded={showLog} data-testid="email-log-toggle">
            <span className="text-xs font-bold text-white">Last 24 hours</span>
            <span className="text-xs text-zinc-500 flex-1 min-w-0 truncate">
              {usage ? <>{usage.sent} sent{usage.failed ? <> · <span style={{ color: "#fca5a5" }}>{usage.failed} failed</span></> : null}{usage.skipped ? ` · ${usage.skipped} skipped` : ""}</> : "—"}
            </span>
            <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${showLog ? "rotate-180" : ""}`} />
          </button>
          {gmailUsed !== null && (
            <div className="mt-2" aria-label={`Gmail daily usage ${gmailUsed} of ${cap}`}>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, (gmailUsed / cap) * 100)}%`, background: gmailUsed / cap > 0.8 ? "#f87171" : GOLD }} />
              </div>
              <p className="text-[10px] text-zinc-600 mt-1">{gmailUsed} / ~{cap} Gmail daily limit</p>
            </div>
          )}
          {showLog && <div className="mt-3"><EmailLogList rows={log} showWebinar emptyText="No webinar emails yet." /></div>}
        </div>
      </div>
    </div>
  );
}
