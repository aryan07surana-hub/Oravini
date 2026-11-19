import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import {
  ArrowLeft, ArrowUp, Check, ExternalLink, History, LayoutTemplate, Loader2, Monitor, Palette, RotateCcw,
  Share2, Smartphone, Sparkles, Undo2, Wand2,
} from "lucide-react";
import ClientLayout from "@/components/layout/ClientLayout";
import ThemedPage, { applyFieldEdit } from "@/components/pages/ThemedPage";
import TemplateGallery from "@/components/pages/TemplateGallery";
import { ShareDomainModal } from "@/components/pages/ShareDomainPanel";
import { useToast } from "@/hooks/use-toast";
import type { PageSection, PageTheme } from "@shared/pageEngine";

const GOLD = "#d4b461";
const BG = "#040406";
const SIDEBAR = "#06060b";
const BORDER = "rgba(255,255,255,0.07)";

async function api(method: string, url: string, body?: any) {
  const r = await fetch(url, { method, credentials: "include", headers: body ? { "Content-Type": "application/json" } : {}, body: body ? JSON.stringify(body) : undefined });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.message || `Request failed (${r.status})`);
  return data;
}

const EXAMPLES = [
  "A waitlist page for an AI app that turns long videos into short clips, for YouTubers",
  "Free 5-day email course for new yoga teachers who want their first 20 private clients",
  "High-ticket business coaching for agency owners stuck at $20k/month, book a call",
  "Live webinar: how first-time home buyers in India can save ₹5 lakh on their loan",
];
const GEN_STAGES = ["Reading your brief…", "Choosing sections & structure…", "Writing the copy…", "Designing the theme…", "Placing imagery…"];

// ── /pages/new — prompt first ─────────────────────────────────────────────────
export function PageStudioNew() {
  const [, nav] = useLocation();
  const { toast } = useToast();
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(0);
  const [gallery, setGallery] = useState(false);
  const [tplBusy, setTplBusy] = useState(false);

  useEffect(() => {
    if (!busy) return;
    const i = setInterval(() => setStage(s => Math.min(s + 1, GEN_STAGES.length - 1)), 2500);
    return () => clearInterval(i);
  }, [busy]);

  const generate = async () => {
    if (prompt.trim().length < 8) return toast({ title: "Tell the AI a bit more", description: "Who is it for, and what should visitors do?" });
    setBusy(true); setStage(0);
    try {
      const page = await api("POST", "/api/page-studio/generate", { prompt: prompt.trim() });
      nav(`/pages/studio/${page.id}`);
    } catch (e: any) {
      toast({ title: "Generation failed", description: e.message, variant: "destructive" });
      setBusy(false);
    }
  };

  return (
    <ClientLayout>
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16" style={{ background: `radial-gradient(ellipse 80% 50% at 50% 0%, ${GOLD}14 0%, transparent 60%), ${BG}` }}>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6" style={{ background: `${GOLD}14`, border: `1px solid ${GOLD}30` }}><Sparkles className="w-7 h-7" style={{ color: GOLD }} /></div>
        <h1 className="text-3xl md:text-5xl font-black text-white text-center max-w-3xl leading-tight">What page should we build?</h1>
        <p className="text-zinc-400 mt-3 text-center max-w-xl">Describe your offer and audience. AI designs the whole page — sections, copy, colors, fonts and imagery. Then refine it by chat.</p>

        <div className="w-full max-w-2xl mt-10 rounded-2xl p-2" style={{ background: "#0c0c12", border: `1px solid ${GOLD}30`, boxShadow: `0 30px 90px -40px ${GOLD}` }}>
          <textarea data-testid="studio-prompt" value={prompt} onChange={e => setPrompt(e.target.value)} disabled={busy} rows={4} autoFocus
            onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) generate(); }}
            placeholder="e.g. A landing page for my 8-week strength program for busy dads over 35 — free intro call…"
            className="w-full bg-transparent resize-none outline-none text-white placeholder:text-zinc-600 p-4 text-base" />
          <div className="flex items-center gap-2 px-2 pb-1">
            <button onClick={() => setGallery(true)} disabled={busy} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white hover:bg-white/5"><LayoutTemplate className="w-4 h-4" />Start from a template</button>
            <div className="flex-1" />
            <button data-testid="studio-generate" onClick={generate} disabled={busy}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black disabled:opacity-70" style={{ background: GOLD, color: "#0a0910" }}>
              {busy ? <><Loader2 className="w-4 h-4 animate-spin" />{GEN_STAGES[stage]}</> : <><Wand2 className="w-4 h-4" />Generate page</>}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 justify-center mt-6 max-w-3xl">
          {EXAMPLES.map(ex => (
            <button key={ex} onClick={() => setPrompt(ex)} disabled={busy} className="px-3 py-1.5 rounded-full text-xs text-zinc-400 hover:text-white transition-colors" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}` }}>{ex}</button>
          ))}
        </div>
      </div>
      <TemplateGallery open={gallery} onClose={() => setGallery(false)} busy={tplBusy} confirmLabel="Use template"
        onSelect={async tpl => {
          setTplBusy(true);
          try { const page = await api("POST", "/api/page-studio/from-template", { templateId: tpl.id }); nav(`/pages/studio/${page.id}`); }
          catch (e: any) { toast({ title: "Couldn't create page", description: e.message, variant: "destructive" }); setTplBusy(false); }
        }} />
    </ClientLayout>
  );
}

// ── /pages/studio/:id — chat + live preview ──────────────────────────────────
type Msg = { role: "user" | "ai"; text: string; action?: string };
type Version = { id: string; version_no: number; source: string; label: string | null; created_at: string; theme_name: string | null; section_count: number };

const QUICK = [
  { label: "Punchier headline", msg: "Make the hero headline punchier and more specific" },
  { label: "Switch to light mode", msg: "Restyle the page in a clean light theme" },
  { label: "Add testimonials", msg: "Add a testimonials section with three specific results" },
  { label: "Regenerate page", msg: "Regenerate the whole page with a different structure and design" },
];

export default function PageStudio() {
  const [, params] = useRoute("/pages/studio/:id");
  const id = params?.id || "";
  const [, nav] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: page, isLoading } = useQuery<any>({ queryKey: [`/api/marketing-landing-pages/${id}`], queryFn: () => api("GET", `/api/marketing-landing-pages/${id}`), enabled: !!id });
  const { data: versions = [] } = useQuery<Version[]>({ queryKey: [`/api/page-studio/${id}/versions`], queryFn: () => api("GET", `/api/page-studio/${id}/versions`), enabled: !!id });

  const [sections, setSections] = useState<PageSection[]>([]);
  const [theme, setTheme] = useState<PageTheme | null>(null);
  const [title, setTitle] = useState("");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [showVersions, setShowVersions] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const hydrated = useRef<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  const pendingSave = useRef<Promise<any> | null>(null);
  const chatEnd = useRef<HTMLDivElement>(null);

  const hydrate = useCallback((p: any) => {
    setSections(Array.isArray(p.sections) ? p.sections : []);
    setTheme(p.theme || null);
    setTitle(p.title || "");
  }, []);

  useEffect(() => {
    if (!page || hydrated.current === page.id) return;
    hydrated.current = page.id;
    hydrate(page);
    setMessages([{ role: "ai", text: page.prompt ? `Here's your first version for: “${page.prompt}”. Tell me what to change — copy, sections, colors, fonts — or click any text on the page to edit it directly.` : "Tell me what to change — copy, sections, colors, fonts — or click any text to edit it directly." }]);
  }, [page, hydrate]);

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, thinking]);

  const persist = useCallback((body: Record<string, any>) => {
    setSaveState("saving");
    const p = api("PATCH", `/api/marketing-landing-pages/${id}`, body)
      .then(row => { qc.setQueryData([`/api/marketing-landing-pages/${id}`], row); setSaveState("saved"); setTimeout(() => setSaveState("idle"), 1500); return row; })
      .catch(e => { setSaveState("idle"); toast({ title: "Couldn't save", description: e.message, variant: "destructive" }); });
    pendingSave.current = p;
    return p;
  }, [id, qc, toast]);

  const onField = (sid: string, path: string, value: string) => {
    setSections(prev => {
      const next = applyFieldEdit(prev, sid, path, value);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => persist({ sections: next }), 600);
      return next;
    });
  };

  const flush = async () => {
    if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = undefined; await persist({ sections }); }
    else if (pendingSave.current) await pendingSave.current;
  };

  const afterChange = (p: any) => {
    qc.setQueryData([`/api/marketing-landing-pages/${id}`], p);
    hydrate(p);
    qc.invalidateQueries({ queryKey: [`/api/page-studio/${id}/versions`] });
  };

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || thinking) return;
    setInput("");
    setMessages(m => [...m, { role: "user", text: msg }]);
    setThinking(true);
    try {
      await flush();
      const out = await api("POST", `/api/page-studio/${id}/chat`, { message: msg });
      if (out.page) afterChange(out.page);
      setMessages(m => [...m, { role: "ai", text: out.reply, action: out.action }]);
    } catch (e: any) {
      setMessages(m => [...m, { role: "ai", text: `⚠️ ${e.message}` }]);
    } finally { setThinking(false); }
  };

  const undo = async () => {
    try { await flush(); const out = await api("POST", `/api/page-studio/${id}/undo`); afterChange(out.page); toast({ title: "Undone", description: out.version?.label }); }
    catch (e: any) { toast({ title: "Nothing to undo", description: e.message }); }
  };
  const restore = async (v: Version) => {
    try { await flush(); const out = await api("POST", `/api/page-studio/${id}/versions/${v.id}/restore`); afterChange(out.page); setShowVersions(false); toast({ title: `Restored version ${v.version_no}` }); }
    catch (e: any) { toast({ title: "Couldn't restore", description: e.message, variant: "destructive" }); }
  };
  const togglePublish = async () => {
    await flush();
    const row = await persist({ published: !page?.published });
    if (row) toast({ title: row.published ? "Published 🎉" : "Unpublished", description: row.published ? `${window.location.origin}/lp/${row.slug}` : "The public link is offline." });
  };

  if (isLoading || !page) return <div className="flex items-center justify-center min-h-screen" style={{ background: BG }}><Loader2 className="w-8 h-8 animate-spin" style={{ color: GOLD }} /></div>;

  return (
    <div className="flex flex-col h-screen" style={{ background: BG }}>
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b" style={{ borderColor: BORDER, background: SIDEBAR }}>
        <button onClick={() => nav("/pages-hub")} className="text-zinc-500 hover:text-white"><ArrowLeft className="w-4 h-4" /></button>
        <Sparkles className="w-4 h-4" style={{ color: GOLD }} />
        <input data-testid="studio-title" value={title} onChange={e => setTitle(e.target.value)} onBlur={() => title !== page.title && persist({ title })}
          className="bg-transparent text-sm font-black text-white outline-none min-w-0 w-64 focus:bg-white/5 rounded px-1.5 py-1" />
        <span className="text-[11px] text-zinc-600 w-16">{saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved ✓" : ""}</span>
        <div className="flex-1" />
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }}>
          {(["desktop", "mobile"] as const).map(d => (
            <button key={d} data-testid={`device-${d}`} onClick={() => setDevice(d)} className="px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1" style={{ background: device === d ? `${GOLD}20` : "transparent", color: device === d ? GOLD : "#71717a" }}>
              {d === "desktop" ? <Monitor className="w-3.5 h-3.5" /> : <Smartphone className="w-3.5 h-3.5" />}
            </button>
          ))}
        </div>
        <button data-testid="studio-undo" onClick={undo} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-zinc-300 hover:bg-white/5"><Undo2 className="w-3.5 h-3.5" />Undo</button>
        <div className="relative">
          <button data-testid="studio-versions" onClick={() => setShowVersions(v => !v)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-zinc-300 hover:bg-white/5"><History className="w-3.5 h-3.5" />Versions <span className="text-zinc-600">{versions.length}</span></button>
          {showVersions && (
            <div className="absolute right-0 top-full mt-1 w-80 max-h-96 overflow-auto rounded-xl z-50 p-1.5" style={{ background: "#0e0e18", border: `1px solid ${BORDER}`, boxShadow: "0 20px 60px rgba(0,0,0,0.7)" }}>
              {versions.map((v, i) => (
                <div key={v.id} className="flex items-start gap-2 p-2 rounded-lg hover:bg-white/5">
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded mt-0.5" style={{ background: i === 0 ? `${GOLD}25` : "rgba(255,255,255,0.06)", color: i === 0 ? GOLD : "#a1a1aa" }}>v{v.version_no}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white truncate">{v.label || v.source}</p>
                    <p className="text-[10px] text-zinc-600">{v.source} · {v.theme_name || "classic"} · {v.section_count} sections · {new Date(v.created_at).toLocaleTimeString()}</p>
                  </div>
                  {i > 0 && <button data-testid={`restore-v${v.version_no}`} onClick={() => restore(v)} className="text-[11px] font-bold flex items-center gap-1 px-2 py-1 rounded-md hover:bg-white/10" style={{ color: GOLD }}><RotateCcw className="w-3 h-3" />Restore</button>}
                </div>
              ))}
            </div>
          )}
        </div>
        <button data-testid="studio-share" onClick={() => setShareOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-zinc-300 hover:bg-white/5"><Share2 className="w-3.5 h-3.5" />Share</button>
        {page.published && <a href={`/lp/${page.slug}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-zinc-300 hover:bg-white/5"><ExternalLink className="w-3.5 h-3.5" />View</a>}
        <button data-testid="studio-publish" onClick={togglePublish}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-black" style={page.published ? { background: "rgba(52,211,153,0.12)", color: "#34d399", border: "1px solid rgba(52,211,153,0.3)" } : { background: GOLD, color: "#0a0910" }}>
          {page.published ? <><Check className="w-3.5 h-3.5" />Published</> : "Publish"}
        </button>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Chat */}
        <div className="w-[360px] flex-shrink-0 flex flex-col border-r" style={{ borderColor: BORDER, background: SIDEBAR }}>
          <div className="flex-1 overflow-y-auto p-4 space-y-3" data-testid="studio-chat">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : ""}`}>
                <div className="max-w-[88%] px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed"
                  style={m.role === "user" ? { background: `${GOLD}20`, color: "#fff", border: `1px solid ${GOLD}30` } : { background: "rgba(255,255,255,0.04)", color: "#d4d4d8", border: `1px solid ${BORDER}` }}>
                  {m.action && m.action !== "answer" && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider mb-1 mr-1" style={{ color: GOLD }}>
                      {m.action === "restyle" ? <Palette className="w-3 h-3" /> : <Wand2 className="w-3 h-3" />}{m.action}
                    </span>
                  )}
                  {m.text}
                </div>
              </div>
            ))}
            {thinking && <div className="flex items-center gap-2 text-xs text-zinc-500"><Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: GOLD }} />Designing…</div>}
            <div ref={chatEnd} />
          </div>
          <div className="px-3 pb-2 flex flex-wrap gap-1.5">
            {QUICK.map(q => <button key={q.label} onClick={() => send(q.msg)} disabled={thinking} className="px-2.5 py-1 rounded-full text-[11px] text-zinc-400 hover:text-white disabled:opacity-40" style={{ border: `1px solid ${BORDER}` }}>{q.label}</button>)}
          </div>
          <div className="p-3 border-t" style={{ borderColor: BORDER }}>
            <div className="flex items-end gap-2 rounded-xl p-2" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}` }}>
              <textarea data-testid="studio-chat-input" value={input} onChange={e => setInput(e.target.value)} rows={2}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Change the copy, add a section, try a new color scheme…" className="flex-1 bg-transparent resize-none outline-none text-sm text-white placeholder:text-zinc-600" />
              <button data-testid="studio-chat-send" onClick={() => send()} disabled={thinking || !input.trim()} className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-40" style={{ background: GOLD, color: "#0a0910" }}><ArrowUp className="w-4 h-4" /></button>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="flex-1 overflow-auto p-5 flex justify-center" style={{ background: "#020204" }} onClick={() => setSelected(null)}>
          <div className="w-full transition-all duration-300 rounded-xl overflow-hidden h-fit" data-testid="studio-preview"
            style={{ maxWidth: device === "mobile" ? 390 : 1280, border: `1px solid ${BORDER}`, boxShadow: "0 0 80px rgba(0,0,0,0.6)" }}>
            {!page.theme && (
              <div className="px-4 py-2.5 text-xs flex items-center gap-2" style={{ background: "#1c1606", color: GOLD }}>
                This page uses the classic design. Saving a theme switches the public page to the Studio renderer.
                <button className="underline font-bold" onClick={() => persist({ theme: { preset: "midnight_gold" } }).then(r => r && hydrate(r))}>Convert</button>
              </div>
            )}
            <ThemedPage theme={theme} sections={sections} editable device={device} onField={onField} selectedId={selected} onSelect={setSelected} />
          </div>
        </div>
      </div>

      <ShareDomainModal open={shareOpen} onClose={() => setShareOpen(false)} targetType="landing_page" targetId={page.id} published={!!page.published} />
    </div>
  );
}
