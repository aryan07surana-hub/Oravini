// Settings → WhatsApp reminders: each account connects its OWN WhatsApp Business Cloud API
// credentials (bring-your-own-key). Webinar confirmations + 1h reminders then also go out on
// WhatsApp to registrants who left a phone number. The token is write-only from here.
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, MessageCircle, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

const GOLD = "#d4b461";
const KEY = ["/api/settings/whatsapp"];

type WhatsappSettings = {
  configured: boolean;
  enabled: boolean;
  displayNumber: string | null;
  phoneNumberId: string | null;
  templateName: string;
  tokenLast4?: string;
};

const inputCls = "w-full px-3 py-2 rounded-lg text-sm text-white placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-[#d4b461]/50";
const inputStyle = { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" };

export default function WhatsappSettingsCard() {
  const { toast } = useToast();
  const { data, isLoading } = useQuery<WhatsappSettings>({ queryKey: KEY });
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [displayNumber, setDisplayNumber] = useState("");
  const [templateName, setTemplateName] = useState("hello_world");
  const [enabled, setEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (!data) return;
    setPhoneNumberId(data.phoneNumberId ?? "");
    setDisplayNumber(data.displayNumber ?? "");
    setTemplateName(data.templateName || "hello_world");
    setEnabled(data.enabled);
  }, [data]);

  const save = async () => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        phoneNumberId: phoneNumberId.trim(),
        displayNumber: displayNumber.trim() || null,
        templateName: templateName.trim() || "hello_world",
        enabled,
      };
      if (accessToken.trim()) body.accessToken = accessToken.trim();
      const next = await apiRequest("PUT", "/api/settings/whatsapp", body);
      queryClient.setQueryData(KEY, next);
      setAccessToken("");
      toast({ title: "WhatsApp settings saved", description: enabled ? "Webinar reminders will also go out on WhatsApp." : "Saved — turn on the toggle to start sending." });
    } catch (e: any) {
      toast({ title: "Couldn't save", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    setTesting(true);
    try {
      const r = await apiRequest("POST", "/api/settings/whatsapp/test");
      toast({ title: "Test message sent", description: `Meta accepted it (HTTP ${r.metaStatus}) — check WhatsApp on ${r.to}.` });
    } catch (e: any) {
      toast({ title: "WhatsApp rejected the test", description: e.message, variant: "destructive" });
    } finally {
      setTesting(false);
    }
  };

  const configured = !!data?.configured;

  return (
    <div className="mt-4" data-testid="settings-whatsapp">
      <div className="rounded-2xl p-6" style={{ background: "rgba(212,180,97,0.04)", border: "1px solid rgba(212,180,97,0.14)" }}>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(212,180,97,0.12)", border: "1px solid rgba(212,180,97,0.25)" }}>
            <MessageCircle className="w-4 h-4" style={{ color: GOLD }} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-white">WhatsApp reminders</p>
            <p className="text-xs text-zinc-500">Use your own WhatsApp Business Cloud API to send webinar confirmations &amp; reminders</p>
          </div>
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin text-zinc-500" /> : (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md" style={configured
              ? { color: GOLD, background: "rgba(212,180,97,0.1)", border: "1px solid rgba(212,180,97,0.25)" }
              : { color: "#71717a", border: "1px solid rgba(255,255,255,0.08)" }} data-testid="settings-whatsapp-status">
              {configured ? (data?.enabled ? "Active" : "Configured · off") : "Not connected"}
            </span>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs text-zinc-400">Phone number ID</span>
            <input className={`${inputCls} mt-1`} style={inputStyle} value={phoneNumberId} onChange={e => setPhoneNumberId(e.target.value)} placeholder="e.g. 106540352242922" inputMode="numeric" data-testid="whatsapp-phone-number-id" />
          </label>
          <label className="block">
            <span className="text-xs text-zinc-400">Access token{data?.tokenLast4 ? <span className="text-zinc-600"> · ends in …{data.tokenLast4}</span> : null}</span>
            <input type="password" autoComplete="new-password" className={`${inputCls} mt-1`} style={inputStyle} value={accessToken} onChange={e => setAccessToken(e.target.value)} placeholder={configured ? "unchanged" : "Permanent system-user token"} data-testid="whatsapp-access-token" />
          </label>
          <label className="block">
            <span className="text-xs text-zinc-400">Display number <span className="text-zinc-600">(optional)</span></span>
            <input className={`${inputCls} mt-1`} style={inputStyle} value={displayNumber} onChange={e => setDisplayNumber(e.target.value)} placeholder="+91 98765 43210" data-testid="whatsapp-display-number" />
          </label>
          <label className="block">
            <span className="text-xs text-zinc-400">Approved template name</span>
            <input className={`${inputCls} mt-1`} style={inputStyle} value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="hello_world" data-testid="whatsapp-template-name" />
          </label>
        </div>

        <div className="flex items-center gap-3 flex-wrap mt-5">
          <button type="button" role="switch" aria-checked={enabled} onClick={() => setEnabled(v => !v)} className="flex items-center gap-2 text-xs font-semibold text-zinc-300" data-testid="whatsapp-enabled">
            <span className="relative w-9 h-5 rounded-full transition-colors" style={{ background: enabled ? GOLD : "rgba(255,255,255,0.1)" }}>
              <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: enabled ? 18 : 2 }} />
            </span>
            Send webinar reminders on WhatsApp
          </button>
          <div className="flex-1" />
          <button type="button" onClick={sendTest} disabled={!configured || testing} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-zinc-300 hover:text-white disabled:opacity-40" style={{ border: "1px solid rgba(255,255,255,0.1)" }} data-testid="whatsapp-send-test">
            {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Send test
          </button>
          <button type="button" onClick={save} disabled={saving || !phoneNumberId.trim() || (!configured && !accessToken.trim())} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-black hover:brightness-110 disabled:opacity-50" style={{ background: GOLD, color: "#0a0910" }} data-testid="whatsapp-save">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} Save
          </button>
        </div>
        <p className="text-[11px] text-zinc-600 mt-3 leading-relaxed">
          From Meta → WhatsApp → API Setup: copy the phone number ID and a permanent token. The test message goes to the phone number on your account. Your token is encrypted and never shown again.
        </p>
      </div>
    </div>
  );
}
