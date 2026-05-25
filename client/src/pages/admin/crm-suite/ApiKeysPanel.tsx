import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Key, Copy, ShieldOff, Trash2, ExternalLink, X, CheckCircle2, AlertTriangle,
} from "lucide-react";

const GOLD = "#d4b461";
const GOLD_BRIGHT = "#f0c84b";

type ApiKey = {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  defaultTags: string[];
  defaultSource: string | null;
  allowedOrigins: string;
  rateLimitPerMin: number;
  usageCount: number;
  lastUsedAt: string | null;
  lastUsedIp: string | null;
  revokedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
};

const ALL_SCOPES = [
  { v: "contacts:write",      label: "Write contacts",      desc: "Create / upsert contacts (the main one)" },
  { v: "contacts:read",       label: "Read contacts",       desc: "Future use — search and read" },
  { v: "opportunities:write", label: "Write opportunities", desc: "Allow nested opportunity creation" },
  { v: "activities:write",    label: "Write activities",    desc: "Log notes/calls/emails on contacts" },
  { v: "tasks:write",         label: "Write tasks",         desc: "Allow nested task creation" },
];

export function ApiKeysPanel() {
  const { data: keys = [], isLoading } = useQuery<ApiKey[]>({ queryKey: ["/api/crm-suite/api-keys"] });
  const [showCreate, setShowCreate] = useState(false);
  const [justCreated, setJustCreated] = useState<{ id: string; secret: string; prefix: string; name: string } | null>(null);
  const [showCodeFor, setShowCodeFor] = useState<ApiKey | null>(null);
  const { toast } = useToast();

  const revokeMut = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/crm-suite/api-keys/${id}/revoke`),
    onSuccess: () => { toast({ title: "Key revoked" }); queryClient.invalidateQueries({ queryKey: ["/api/crm-suite/api-keys"] }); },
  });
  const delMut = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/crm-suite/api-keys/${id}`),
    onSuccess: () => { toast({ title: "Key deleted" }); queryClient.invalidateQueries({ queryKey: ["/api/crm-suite/api-keys"] }); },
  });

  return (
    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "18px 20px", gridColumn: "1 / -1" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: GOLD, letterSpacing: "0.12em", textTransform: "uppercase" }}>API Keys</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>
            Generate a key, drop a one-line script on any landing page, capture leads straight into the CRM.
          </div>
        </div>
        <button onClick={() => setShowCreate(true)}
          style={{ background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, color: "#000", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          <Plus className="w-3.5 h-3.5" /> Generate API key
        </button>
      </div>

      {isLoading ? (
        <div style={{ padding: 24, color: "rgba(255,255,255,0.4)", fontSize: 13 }}>Loading…</div>
      ) : keys.length === 0 ? (
        <div style={{ padding: "32px 16px", textAlign: "center", color: "rgba(255,255,255,0.5)", border: "1px dashed rgba(255,255,255,0.08)", borderRadius: 12 }}>
          <Key className="w-5 h-5" style={{ margin: "0 auto 8px", opacity: 0.5 }} />
          <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 4 }}>No API keys yet</div>
          <div style={{ fontSize: 12 }}>Click "Generate API key" — you'll get a one-line script tag for any landing page.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {keys.map(k => {
            const revoked = !!k.revokedAt;
            const expired = k.expiresAt && new Date(k.expiresAt) < new Date();
            return (
              <div key={k.id}
                style={{
                  display: "flex", flexDirection: "column", gap: 4,
                  background: revoked || expired ? "rgba(239,68,68,0.04)" : "rgba(255,255,255,0.02)",
                  border: `1px solid ${revoked || expired ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.06)"}`,
                  borderRadius: 12, padding: "14px 16px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: revoked ? "rgba(239,68,68,0.15)" : `${GOLD}14`, color: revoked ? "#ef4444" : GOLD, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Key className="w-4 h-4" />
                  </div>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{k.name}</span>
                      {revoked && <span style={pill("#ef4444")}>Revoked</span>}
                      {expired && !revoked && <span style={pill("#f59e0b")}>Expired</span>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 2, fontFamily: "ui-monospace, Menlo, monospace" }}>
                      <span>{k.prefix}…</span>
                      <span>·</span>
                      <span>{k.usageCount.toLocaleString()} call{k.usageCount === 1 ? "" : "s"}</span>
                      {k.lastUsedAt && <><span>·</span><span>last used {new Date(k.lastUsedAt).toLocaleString()}</span></>}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                      {(k.scopes || []).map(s => <span key={s} style={pill(GOLD)}>{s}</span>)}
                      {(k.defaultTags || []).slice(0, 3).map(t => <span key={t} style={pill("#a78bfa")}>tag: {t}</span>)}
                      {k.defaultSource && <span style={pill("#60a5fa")}>source: {k.defaultSource}</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <button onClick={() => setShowCodeFor(k)} style={smBtn(GOLD)}>
                      <ExternalLink className="w-3 h-3" /> Embed code
                    </button>
                    {!revoked && (
                      <button onClick={() => { if (confirm(`Revoke "${k.name}"? Existing landing pages will stop working immediately.`)) revokeMut.mutate(k.id); }} style={smBtn("#f59e0b")}>
                        <ShieldOff className="w-3 h-3" /> Revoke
                      </button>
                    )}
                    <button onClick={() => { if (confirm(`Permanently delete "${k.name}"?`)) delMut.mutate(k.id); }} style={smBtn("#ef4444")}>
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreate && <CreateKeyModal
        onClose={() => setShowCreate(false)}
        onCreated={(c) => { setJustCreated(c); setShowCreate(false); }}
      />}
      {justCreated && <SecretRevealModal data={justCreated} onClose={() => setJustCreated(null)} />}
      {showCodeFor && <EmbedCodeModal apiKey={showCodeFor} onClose={() => setShowCodeFor(null)} />}
    </div>
  );
}

function pill(color: string): React.CSSProperties {
  return { fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 99, background: `${color}18`, color, letterSpacing: "0.05em" };
}
function smBtn(color: string): React.CSSProperties {
  return { background: `${color}14`, border: `1px solid ${color}44`, color, borderRadius: 7, padding: "6px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 };
}

/* ─── Create modal ─── */
function CreateKeyModal({ onClose, onCreated }: { onClose: () => void; onCreated: (c: { id: string; secret: string; prefix: string; name: string }) => void }) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<string[]>(["contacts:write", "activities:write"]);
  const [defaultTags, setDefaultTags] = useState("");
  const [defaultSource, setDefaultSource] = useState("");
  const [allowedOrigins, setAllowedOrigins] = useState("*");
  const [rateLimitPerMin, setRateLimitPerMin] = useState("60");
  const [expiresAt, setExpiresAt] = useState("");

  const createMut = useMutation({
    mutationFn: () => apiRequest("POST", "/api/crm-suite/api-keys", {
      name: name.trim(),
      scopes,
      defaultTags: defaultTags.split(",").map(s => s.trim()).filter(Boolean),
      defaultSource: defaultSource.trim() || null,
      allowedOrigins: allowedOrigins.trim() || "*",
      rateLimitPerMin: parseInt(rateLimitPerMin || "60", 10),
      expiresAt: expiresAt || null,
    }),
    onSuccess: (r: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm-suite/api-keys"] });
      onCreated({ id: r.id, secret: r.secret, prefix: r.prefix, name: name.trim() });
    },
    onError: (e: any) => toast({ title: "Couldn't create", description: e.message, variant: "destructive" }),
  });

  const toggleScope = (v: string) => setScopes(s => s.includes(v) ? s.filter(x => x !== v) : [...s, v]);

  return (
    <div style={modalBackdrop()}>
      <div style={modalBox(560)}>
        <ModalHeader title="Generate API key" onClose={onClose} />
        <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 14, maxHeight: "75vh", overflowY: "auto" }}>          <Field label="Key name" hint="Internal label — e.g. Brandverse landing page">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Brandverse landing"
              style={inputStyle()} />
          </Field>

          <Field label="Scopes" hint="Pick what this key is allowed to do">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {ALL_SCOPES.map(s => {
                const active = scopes.includes(s.v);
                return (
                  <button key={s.v} type="button" onClick={() => toggleScope(s.v)}
                    style={{
                      textAlign: "left", padding: "10px 12px",
                      background: active ? `${GOLD}18` : "rgba(255,255,255,0.03)",
                      border: `1px solid ${active ? GOLD + "55" : "rgba(255,255,255,0.06)"}`,
                      borderRadius: 8, cursor: "pointer",
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 700, color: active ? GOLD : "#fff" }}>{s.label}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>{s.desc}</div>
                  </button>
                );
              })}
            </div>
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Default tags" hint="Comma-separated. Auto-applied to every contact.">
              <input value={defaultTags} onChange={e => setDefaultTags(e.target.value)} placeholder="brandverse-landing, hot-lead" style={inputStyle()} />
            </Field>
            <Field label="Default source" hint="Sets contact.source unless overridden.">
              <input value={defaultSource} onChange={e => setDefaultSource(e.target.value)} placeholder="brandverse-landing" style={inputStyle()} />
            </Field>
          </div>

          <Field label="Allowed origins" hint='Comma-separated, or "*" to allow any. e.g. https://yourdomain.com'>
            <input value={allowedOrigins} onChange={e => setAllowedOrigins(e.target.value)} placeholder="*" style={inputStyle()} />
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Rate limit / minute" hint="Requests-per-minute throttle">
              <input type="number" value={rateLimitPerMin} onChange={e => setRateLimitPerMin(e.target.value)} style={inputStyle()} />
            </Field>
            <Field label="Expires (optional)" hint="Leave blank for no expiry">
              <input type="datetime-local" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} style={inputStyle()} />
            </Field>
          </div>
        </div>

        <div style={{ padding: "14px 22px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} style={{ background: "none", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", borderRadius: 10, padding: "10px 18px", cursor: "pointer", fontSize: 13 }}>
            Cancel
          </button>
          <button
            onClick={() => name.trim() && createMut.mutate()}
            disabled={!name.trim() || createMut.isPending}
            style={{
              background: name.trim() ? `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})` : "rgba(255,255,255,0.04)",
              color: name.trim() ? "#000" : "rgba(255,255,255,0.3)",
              border: "none", borderRadius: 10, padding: "10px 22px", fontWeight: 800, fontSize: 13,
              cursor: name.trim() ? "pointer" : "not-allowed",
            }}
          >
            {createMut.isPending ? "Creating…" : "Generate key"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Secret reveal modal — shown ONCE ─── */
function SecretRevealModal({ data, onClose }: { data: { id: string; secret: string; prefix: string; name: string }; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(data.secret); setCopied(true); setTimeout(() => setCopied(false), 1600); };

  return (
    <div style={modalBackdrop()}>
      <div style={modalBox(560)}>
        <div style={{ padding: "20px 22px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <CheckCircle2 className="w-4 h-4" style={{ color: "#22c55e" }} />
            <div style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>Your API key is ready</div>
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 6, lineHeight: 1.6 }}>
            Copy it now. For security we hash it on save and won't be able to show it again.
          </div>
        </div>
        <div style={{ padding: 22 }}>
          <div style={{ background: "rgba(0,0,0,0.5)", border: `1px solid ${GOLD}44`, borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
            <code style={{ flex: 1, fontFamily: "ui-monospace, Menlo, monospace", fontSize: 13, color: GOLD, wordBreak: "break-all" }}>
              {data.secret}
            </code>
            <button onClick={copy}
              style={{ background: copied ? "#22c55e" : `${GOLD}22`, color: copied ? "#000" : GOLD, border: `1px solid ${copied ? "#22c55e" : GOLD + "55"}`, borderRadius: 8, padding: "6px 12px", fontSize: 11, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}
            >
              {copied ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />} {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <div style={{ marginTop: 12, padding: "10px 12px", background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 8, display: "flex", gap: 8, alignItems: "flex-start" }}>
            <AlertTriangle className="w-3.5 h-3.5" style={{ color: "#f59e0b", flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.7)", lineHeight: 1.6 }}>
              Store this somewhere safe. If you lose it you'll need to revoke it and generate a new one.
            </div>
          </div>
        </div>
        <div style={{ padding: "14px 22px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, color: "#000", border: "none", borderRadius: 10, padding: "10px 22px", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>
            Done — show me embed code
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Embed code panel ─── */
function EmbedCodeModal({ apiKey, onClose }: { apiKey: ApiKey; onClose: () => void }) {
  const [tab, setTab] = useState<"embed" | "form" | "curl" | "fetch">("embed");
  const [copied, setCopied] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "https://yourdomain.com";
  const placeholderKey = `<YOUR_API_KEY  // starts with ${apiKey.prefix}>`;

  const embedSnippet = `<!-- Drop this on any landing page. The form will be styled and wired up automatically. -->
<div id="oravini-form"></div>
<script
  src="${origin}/embed/crm-form.js"
  data-key="${placeholderKey}"
  data-target="#oravini-form"
  data-fields="name,email,phone,notes"
  data-submit="Send"
  data-success="Thanks. We'll be in touch shortly."
  data-tags="${(apiKey.defaultTags || []).join(",") || "landing"}"
  data-accent="#d4b461"
></script>`;

  const formSnippet = `<!-- Use your own form markup, just add the data-oravini-form attribute. -->
<form data-oravini-form>
  <input name="name"  placeholder="Full name" required />
  <input name="email" placeholder="Email"     required type="email" />
  <input name="phone" placeholder="Phone" />
  <textarea name="notes" placeholder="Tell us more"></textarea>
  <button type="submit">Send</button>
</form>
<script src="${origin}/embed/crm-form.js" data-key="${placeholderKey}"></script>`;

  const curlSnippet = `curl -X POST '${origin}/api/v1/crm/contacts' \\
  -H 'Authorization: Bearer ${placeholderKey}' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "firstName": "Aryan",
    "lastName":  "Surana",
    "email":     "aryan@example.com",
    "phone":     "+1-555-0100",
    "company":   "Oravini",
    "tags":      ["hot-lead"],
    "score":     80,
    "customFields": { "utm_source": "twitter", "campaign": "q4-launch" },
    "opportunity": { "title": "Tier 5 mentorship", "value": 5000 },
    "activity":    { "type": "note", "body": "Came in from the Brandverse landing page" }
  }'`;

  const fetchSnippet = `await fetch('${origin}/api/v1/crm/contacts', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ${placeholderKey}',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    firstName: 'Aryan',
    email: 'aryan@example.com',
    phone: '+1-555-0100',
    tags: ['hot-lead'],
    customFields: { utm_source: 'twitter' },
    opportunity: { title: 'Tier 5 mentorship', value: 5000 }
  })
});`;

  const snippet = tab === "embed" ? embedSnippet : tab === "form" ? formSnippet : tab === "curl" ? curlSnippet : fetchSnippet;
  const copy = () => { navigator.clipboard.writeText(snippet); setCopied(true); setTimeout(() => setCopied(false), 1500); };

  const TABS: [typeof tab, string][] = [["embed", "Embed (auto-form)"], ["form", "Wire up your own form"], ["curl", "cURL"], ["fetch", "fetch() / JS"]];

  return (
    <div style={modalBackdrop()}>
      <div style={modalBox(700)}>
        <ModalHeader title={`Embed code — ${apiKey.name}`} onClose={onClose} />
        <div style={{ padding: "0 22px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: 4 }}>
          {TABS.map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)}
              style={{
                background: "none", border: "none",
                color: tab === k ? GOLD : "rgba(255,255,255,0.5)",
                padding: "12px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer",
                borderBottom: tab === k ? `2px solid ${GOLD}` : "2px solid transparent",
              }}>
              {l}
            </button>
          ))}
        </div>
        <div style={{ padding: 22 }}>
          <div style={{ position: "relative" }}>
            <pre style={{
              background: "rgba(0,0,0,0.5)", border: `1px solid ${GOLD}22`, borderRadius: 10,
              padding: "16px 18px", fontFamily: "ui-monospace, Menlo, monospace",
              fontSize: 12, color: "rgba(255,255,255,0.85)", lineHeight: 1.7,
              maxHeight: 320, overflow: "auto", whiteSpace: "pre", margin: 0,
            }}>
              {snippet}
            </pre>
            <button onClick={copy}
              style={{ position: "absolute", top: 10, right: 10, background: copied ? "#22c55e" : `${GOLD}22`, color: copied ? "#000" : GOLD, border: `1px solid ${copied ? "#22c55e" : GOLD + "55"}`, borderRadius: 8, padding: "5px 10px", fontSize: 11, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}
            >
              {copied ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />} {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <div style={{ marginTop: 14, padding: "12px 14px", background: "rgba(212,180,97,0.06)", border: `1px solid ${GOLD}33`, borderRadius: 10, fontSize: 12, color: "rgba(255,255,255,0.7)", lineHeight: 1.7 }}>
            <strong style={{ color: GOLD }}>How it works:</strong> the embed script POSTs to{" "}
            <code style={{ background: "rgba(0,0,0,0.4)", padding: "1px 6px", borderRadius: 4 }}>POST /api/v1/crm/contacts</code>{" "}
            with your <code>Authorization: Bearer</code> header. Every field below is recognized — anything else is auto-saved to <code>customFields</code> on the contact:
            <div style={{ marginTop: 8, fontSize: 11, color: "rgba(255,255,255,0.55)", fontFamily: "ui-monospace, Menlo, monospace" }}>
              firstName · lastName · name · email · phone · company · title · status · source · lifecycleStage · score · city · country · timezone · instagram · youtube · linkedin · twitter · website · tags[] · customFields{"{}"} · notes · doNotContact · opportunity{"{title,value}"} · activity{"{type,body}"} · task{"{title,dueAt}"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── tiny styled primitives ─── */
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 800, color: GOLD, letterSpacing: "0.1em", textTransform: "uppercase" }}>{label}</div>
      {hint && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>{hint}</div>}
      <div style={{ marginTop: 6 }}>{children}</div>
    </div>
  );
}

function inputStyle(): React.CSSProperties {
  return { width: "100%", background: "rgba(255,255,255,0.04)", border: `1px solid ${GOLD}22`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 13, outline: "none", fontFamily: "inherit" };
}
function modalBackdrop(): React.CSSProperties {
  return { position: "fixed", inset: 0, zIndex: 350, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 };
}
function modalBox(width: number): React.CSSProperties {
  return { background: "#0a0a0c", border: `1px solid ${GOLD}33`, borderRadius: 16, width: `min(${width}px, 100%)`, maxHeight: "92vh", display: "flex", flexDirection: "column", overflow: "hidden" };
}
function modalHeader(title: string, onClose: () => void) {
  return (
    <div style={{ padding: "16px 22px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>{title}</div>
      <button onClick={onClose} style={{ background: "none", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)", borderRadius: 8, padding: "8px 10px", cursor: "pointer" }}>
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return modalHeader(title, onClose);
}
