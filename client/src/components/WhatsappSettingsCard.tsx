// Settings → WhatsApp reminders: each account connects its OWN WhatsApp Business Cloud API
// credentials (bring-your-own-key). When enabled, webinar confirmations + 1h reminders also go
// out as a fixed, no-parameter WhatsApp template — but only to registrants who explicitly ticked
// the WhatsApp opt-in on the registration form. The token is write-only from here.
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Loader2, MessageCircle, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

const GOLD = "#d4b461";
const KEY = ["/api/settings/whatsapp"];
const TEST_TEMPLATE = "hello_world";

type WhatsappSettings = {
  configured: boolean;
  enabled: boolean;
  costAcknowledged: boolean;
  displayNumber: string | null;
  phoneNumberId: string | null;
  templateName: string;
  templateLanguage: string;
  isTestTemplate: boolean;
  encryptionReady: boolean;
  tokenLast4?: string;
};

const inputCls = "w-full px-3 py-2 rounded-lg text-sm text-white placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-[#d4b461]/50";
const inputStyle = { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" };
const noteStyle = { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" };

export default function WhatsappSettingsCard() {
  const { toast } = useToast();
  const { data, isLoading } = useQuery<WhatsappSettings>({ queryKey: KEY });
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [displayNumber, setDisplayNumber] = useState("");
  const [templateName, setTemplateName] = useState(TEST_TEMPLATE);
  const [enabled, setEnabled] = useState(false);
  const [costAck, setCostAck] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (!data) return;
    setPhoneNumberId(data.phoneNumberId ?? "");
    setDisplayNumber(data.displayNumber ?? "");
    setTemplateName(data.templateName || TEST_TEMPLATE);
    setEnabled(data.enabled);
    setCostAck(data.costAcknowledged);
  }, [data]);

  const encryptionReady = data?.encryptionReady !== false;
  const configured = !!data?.configured;
  const isTestTemplate = (templateName.trim() || TEST_TEMPLATE) === TEST_TEMPLATE;
  const needsAck = enabled && !data?.costAcknowledged && !costAck;

  const save = async () => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        phoneNumberId: phoneNumberId.trim(),
        displayNumber: displayNumber.trim() || null,
        templateName: templateName.trim() || TEST_TEMPLATE,
        enabled,
        costAcknowledged: costAck,
      };
      if (accessToken.trim()) body.accessToken = accessToken.trim();
      const next = await apiRequest("PUT", "/api/settings/whatsapp", body);
      queryClient.setQueryData(KEY, next);
      setAccessToken("");
      toast({
        title: "WhatsApp settings saved",
        description: enabled
          ? "Opted-in registrants will also get the template on WhatsApp after each confirmation / 1-hour reminder email."
          : "Saved. Automatic sends are off.",
      });
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
      toast({ title: "Test message sent", description: `Meta accepted it (HTTP ${r.metaStatus}). Check WhatsApp on ${r.to}.` });
    } catch (e: any) {
      toast({ title: "WhatsApp rejected the test", description: e.message, variant: "destructive" });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="mt-4" data-testid="settings-whatsapp">
      <div className="rounded-2xl p-6" style={{ background: "rgba(212,180,97,0.04)", border: "1px solid rgba(212,180,97,0.14)" }}>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(212,180,97,0.12)", border: "1px solid rgba(212,180,97,0.25)" }}>
            <MessageCircle className="w-4 h-4" style={{ color: GOLD }} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-white">WhatsApp reminders</p>
            <p className="text-xs text-zinc-500">Use your own WhatsApp Business Cloud API account for webinar confirmations &amp; reminders</p>
          </div>
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin text-zinc-500" /> : (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md" style={configured
              ? { color: GOLD, background: "rgba(212,180,97,0.1)", border: "1px solid rgba(212,180,97,0.25)" }
              : { color: "#71717a", border: "1px solid rgba(255,255,255,0.08)" }} data-testid="settings-whatsapp-status">
              {configured ? (data?.enabled ? "Auto-send on" : "Connected · auto-send off") : "Not connected"}
            </span>
          )}
        </div>

        {!encryptionReady && (
          <div className="flex gap-2 p-3 rounded-lg mb-4 text-xs text-red-300" style={{ background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.25)" }} data-testid="whatsapp-encryption-missing">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Token encryption isn't configured on this server, so WhatsApp credentials can't be saved. Ask the Oravini admin to set TOKEN_ENCRYPTION_KEY.</span>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs text-zinc-400">Phone number ID</span>
            <input className={`${inputCls} mt-1`} style={inputStyle} value={phoneNumberId} onChange={e => setPhoneNumberId(e.target.value)} placeholder="Numeric ID from Meta → API Setup" inputMode="numeric" data-testid="whatsapp-phone-number-id" />
          </label>
          <label className="block">
            <span className="text-xs text-zinc-400">Access token{data?.tokenLast4 ? <span className="text-zinc-600"> · ends in …{data.tokenLast4}</span> : null}</span>
            <input type="password" autoComplete="new-password" className={`${inputCls} mt-1`} style={inputStyle} value={accessToken} onChange={e => setAccessToken(e.target.value)} placeholder={configured ? "unchanged" : "Permanent system-user token"} data-testid="whatsapp-access-token" />
          </label>
          <label className="block">
            <span className="text-xs text-zinc-400">Display number <span className="text-zinc-600">(optional, shown only to you)</span></span>
            <input className={`${inputCls} mt-1`} style={inputStyle} value={displayNumber} onChange={e => setDisplayNumber(e.target.value)} placeholder="+91 98765 43210" data-testid="whatsapp-display-number" />
          </label>
          <label className="block">
            <span className="text-xs text-zinc-400">Approved template name {isTestTemplate && <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase text-amber-300" style={{ border: "1px solid rgba(252,211,77,0.3)" }} data-testid="whatsapp-test-template-badge">Test only</span>}</span>
            <input className={`${inputCls} mt-1`} style={inputStyle} value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder={TEST_TEMPLATE} data-testid="whatsapp-template-name" />
          </label>
        </div>

        {/* What actually gets sent — stated plainly */}
        <div className="p-3 rounded-lg mt-4 text-[11px] text-zinc-400 leading-relaxed space-y-1.5" style={noteStyle} data-testid="whatsapp-template-guidance">
          <p><b className="text-zinc-300">What recipients get:</b> exactly your template's approved text. Oravini sends it with <b className="text-zinc-300">no variables</b> (language en_US), so the webinar title, time and join link are <b className="text-zinc-300">not</b> filled in. Those details are only in the email.</p>
          {isTestTemplate
            ? <p className="text-amber-300/90"><b>hello_world is Meta's test template.</b> It just says "Hello World", contains no webinar details, and from Meta's test number only reaches numbers you've added as test recipients. Use it to check your setup, not for real attendees.</p>
            : <p>For real attendees, create a <b className="text-zinc-300">Utility</b> template in Meta with <b className="text-zinc-300">no {"{{variables}}"}</b>, no header media or buttons that need values, in English (en_US), and wait for approval. Example text: "Thanks for registering for our webinar. Your join link and reminders are in your email."</p>}
          <p>Only registrants who tick the WhatsApp opt-in on your registration page get messages. Earlier registrants and anyone who just left a phone number get nothing.</p>
        </div>

        {/* Billing caveat — must be acknowledged before automatic sends can be turned on */}
        <div className="flex gap-2 p-3 rounded-lg mt-3 text-[11px] text-amber-200/90 leading-relaxed" style={{ background: "rgba(252,211,77,0.05)", border: "1px solid rgba(252,211,77,0.2)" }} data-testid="whatsapp-cost-caveat">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-300" />
          <div>
            <p><b>Meta may bill you.</b> Messages from Meta's free test number cost nothing, but on a real business number Meta can charge your own WhatsApp Business account for each template message, depending on its current pricing and your recipients' country. Oravini doesn't pay for, cap or track these charges. Check Meta's pricing before turning this on.</p>
            <label className="flex items-center gap-2 mt-2 cursor-pointer text-zinc-300">
              <input type="checkbox" checked={costAck || !!data?.costAcknowledged} disabled={!!data?.costAcknowledged} onChange={e => setCostAck(e.target.checked)} className="w-3.5 h-3.5 accent-[#d4b461]" data-testid="whatsapp-cost-ack" />
              I understand Meta may charge my WhatsApp Business account for these messages
            </label>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap mt-5">
          <button type="button" role="switch" aria-checked={enabled} onClick={() => setEnabled(v => !v)} className="flex items-center gap-2 text-xs font-semibold text-zinc-300" data-testid="whatsapp-enabled">
            <span className="relative w-9 h-5 rounded-full transition-colors" style={{ background: enabled ? GOLD : "rgba(255,255,255,0.1)" }}>
              <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: enabled ? 18 : 2 }} />
            </span>
            Automatically send to opted-in registrants
          </button>
          <div className="flex-1" />
          <button type="button" onClick={sendTest} disabled={!configured || testing || !encryptionReady} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-zinc-300 hover:text-white disabled:opacity-40" style={{ border: "1px solid rgba(255,255,255,0.1)" }} data-testid="whatsapp-send-test">
            {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Send test to my phone
          </button>
          <button type="button" onClick={save} disabled={saving || !encryptionReady || !phoneNumberId.trim() || (!configured && !accessToken.trim()) || needsAck} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-black hover:brightness-110 disabled:opacity-50" style={{ background: GOLD, color: "#0a0910" }} data-testid="whatsapp-save">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} Save
          </button>
        </div>
        {needsAck && <p className="text-[11px] text-amber-300 mt-2">Tick the billing acknowledgement above to turn on automatic sends.</p>}
        <p className="text-[11px] text-zinc-600 mt-3 leading-relaxed">
          From Meta → WhatsApp → API Setup: copy the phone number ID and create a permanent system-user token. "Send test" sends one template message to the phone number on your Oravini account. Your token is encrypted and never shown again.
        </p>
      </div>
    </div>
  );
}
