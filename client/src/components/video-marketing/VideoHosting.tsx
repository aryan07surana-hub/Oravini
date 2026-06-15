import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Upload, Link2, Play, Trash2, Eye, BarChart3, Code2, Lock,
  Copy, Check, Film, Zap, Shield, Timer, ArrowLeft, Settings2,
  ExternalLink, Plus, Video, RefreshCw, Gauge, Activity,
  Share2, Subtitles, MonitorPlay,
} from "lucide-react";

const GOLD = "#d4b461";

// ── Progress presets — AI-friendly labels ────────────────────────────────────

const PROGRESS_PRESETS = [
  {
    id: "fast-start",
    name: "Fast Start",
    subtitle: "Hook early, slow down",
    desc: "Bar moves fast in the first 25%, then gradually slows. Viewers feel '20% in' before they even think about leaving — reduces early drop-off significantly.",
    tag: "Best for VSLs",
    tagColor: "#a78bfa",
    bars: [90, 65, 40, 20],
    color: "#a78bfa",
    segments: "0-25%: 10s, 25-50%: 15s, 50-75%: 20s, 75-100%: 35s",
  },
  {
    id: "slow-start",
    name: "Slow Start",
    subtitle: "Build suspense, reward loyalty",
    desc: "Bar moves slow at first, then speeds up in the second half. Late viewers feel like they're almost done — keeps them watching.",
    tag: "Best for courses",
    tagColor: "#60a5fa",
    bars: [20, 40, 65, 90],
    color: "#60a5fa",
    segments: "0-25%: 40s, 25-50%: 20s, 50-75%: 15s, 75-100%: 10s",
  },
  {
    id: "front-loaded",
    name: "Fast First Half",
    subtitle: "Get them past 50% fast",
    desc: "Once past 50%, viewers rarely quit. First half flies by so they cross the commitment threshold quickly.",
    tag: "⚡ Popular",
    tagColor: GOLD,
    bars: [85, 80, 30, 25],
    color: GOLD,
    segments: "0-25%: 8s, 25-50%: 8s, 50-75%: 25s, 75-100%: 35s",
  },
  {
    id: "steady",
    name: "Steady",
    subtitle: "Real time, no tricks",
    desc: "Standard progress bar at true video speed. Best for trust-first content where authenticity matters.",
    bars: [50, 50, 50, 50],
    color: "#34d399",
    segments: "0-100%: Even pace",
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function VideoTypeBadge({ type }: { type: string }) {
  const cfg = type === "vsl"
    ? { label: "VSL", bg: "#a78bfa20", color: "#a78bfa", border: "#a78bfa40" }
    : type === "webinar"
    ? { label: "Webinar", bg: `${GOLD}15`, color: GOLD, border: `${GOLD}35` }
    : { label: "Standard", bg: "rgba(255,255,255,0.06)", color: "#a1a1aa", border: "rgba(255,255,255,0.1)" };
  return (
    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
      {cfg.label}
    </span>
  );
}

// ── Progress Bar Mini Visual ─────────────────────────────────────────────────

function ProgressBarVisual({ bars, color, active }: { bars: number[]; color: string; active: boolean }) {
  return (
    <div className="flex items-end gap-1 h-8 mt-2.5">
      {bars.map((h, i) => (
        <div
          key={i}
          className="flex-1 rounded-t-sm"
          style={{
            height: `${h}%`,
            background: active ? color : `${color}30`,
            transition: "background 0.2s, height 0.2s",
          }}
        />
      ))}
    </div>
  );
}

// ── Progress Section ─────────────────────────────────────────────────────────

function ProgressSection({ video, onUpdate }: { video: any; onUpdate: (data: any) => void }) {
  let config: any = null;
  try {
    config = video.progressBarConfig
      ? (typeof video.progressBarConfig === "string" ? JSON.parse(video.progressBarConfig) : video.progressBarConfig)
      : null;
  } catch {}

  const activeId = config?.enabled ? (config.style || "steady") : null;

  const selectPreset = (id: string) => {
    const preset = PROGRESS_PRESETS.find(p => p.id === id)!;
    onUpdate({
      progressBarConfig: JSON.stringify({ enabled: true, style: id, segments: preset.segments }),
    });
  };

  const disable = () => onUpdate({ progressBarConfig: null });

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-bold text-zinc-300 mb-0.5">Progress Bar Manipulation</p>
        <p className="text-[11px] text-zinc-500 leading-relaxed">
          Control how fast the progress bar moves, independent of actual video time. Top VSL creators use this to keep viewers watching longer.
        </p>
      </div>

      <div className="space-y-2">
        {PROGRESS_PRESETS.map(preset => {
          const isActive = activeId === preset.id;
          return (
            <div
              key={preset.id}
              onClick={() => selectPreset(preset.id)}
              className="p-3 rounded-xl cursor-pointer transition-all"
              style={{
                background: isActive ? `${preset.color}10` : "rgba(255,255,255,0.025)",
                border: `1px solid ${isActive ? preset.color + "45" : "rgba(63,63,70,0.4)"}`,
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <p className="text-xs font-bold" style={{ color: isActive ? preset.color : "#e4e4e7" }}>
                      {preset.name}
                    </p>
                    {preset.tag && (
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full" style={{ background: `${preset.tagColor}18`, color: preset.tagColor, border: `1px solid ${preset.tagColor}30` }}>
                        {preset.tag}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-500">{preset.subtitle}</p>
                </div>
                <div
                  className="w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all"
                  style={{
                    background: isActive ? preset.color : "transparent",
                    borderColor: isActive ? preset.color : "#52525b",
                  }}
                >
                  {isActive && <Check className="w-2.5 h-2.5 text-black" />}
                </div>
              </div>
              <ProgressBarVisual bars={preset.bars} color={preset.color} active={isActive} />
              {isActive && (
                <p className="text-[10px] text-zinc-500 mt-2 leading-relaxed">{preset.desc}</p>
              )}
            </div>
          );
        })}
      </div>

      {activeId && (
        <button onClick={disable} className="text-[10px] text-zinc-700 hover:text-zinc-400 transition-colors">
          × Disable progress manipulation
        </button>
      )}
    </div>
  );
}

// ── Embed Section (step-by-step) ─────────────────────────────────────────────

function EmbedSection({ video }: { video: any }) {
  const [copied, setCopied] = useState<string | null>(null);
  const [embedMode, setEmbedMode] = useState<"iframe" | "lightbox" | "popover">("iframe");
  const [customDomain, setCustomDomain] = useState("");
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const embedUrl = `${baseUrl}/embed/${video.id}`;
  const watchUrl = `${baseUrl}/watch-video/${video.id}`;

  const embedCodes: Record<string, string> = {
    iframe: `<iframe src="${embedUrl}" width="100%" frameborder="0" allowfullscreen allow="autoplay; fullscreen; encrypted-media" style="border-radius:12px; aspect-ratio:16/9; display:block;"></iframe>`,
    lightbox: `<!-- Add once on the page -->\n<script src="${baseUrl}/embed.js" async></script>\n\n<!-- Trigger anywhere -->\n<a href="#" data-oravini-video="${video.id}" data-style="lightbox">▶ Watch Video</a>`,
    popover: `<!-- Add once on the page -->\n<script src="${baseUrl}/embed.js" async></script>\n\n<!-- Trigger button -->\n<button data-oravini-video="${video.id}" data-style="popover">▶ Watch Video</button>`,
  };

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const modeMeta: Record<string, { label: string; icon: string; color: string; desc: string }> = {
    iframe:   { label: "Inline",    icon: "📺", color: "#34d399", desc: "Plays directly on your page inside the layout." },
    lightbox: { label: "Lightbox",  icon: "🔳", color: "#a78bfa", desc: "Pops up as a fullscreen overlay when clicked." },
    popover:  { label: "Popover",   icon: "💬", color: "#60a5fa", desc: "Floats near the button — like a tooltip player." },
  };

  return (
    <div className="space-y-5">

      {/* ── Share Page ── */}
      <div className="p-3.5 rounded-xl space-y-2.5" style={{ background: `${GOLD}08`, border: `1px solid ${GOLD}22` }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-white">Public Watch Page</p>
            <p className="text-[10px] text-zinc-500 mt-0.5">Share this link — opens a branded page with your player.</p>
          </div>
          <a href={watchUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] font-bold flex-shrink-0 px-2 py-1 rounded-lg transition-all hover:opacity-80"
            style={{ background: `${GOLD}18`, color: GOLD, border: `1px solid ${GOLD}30` }}>
            <ExternalLink className="w-3 h-3" /> Preview
          </a>
        </div>
        <div className="flex gap-2">
          <Input readOnly value={watchUrl} className="bg-black border-zinc-800 text-zinc-400 text-[10px] font-mono h-8 flex-1" />
          <Button variant="outline" size="sm" onClick={() => copy(watchUrl, "watch")} className="border-zinc-700 text-zinc-400 h-8 flex-shrink-0 px-2.5">
            {copied === "watch" ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
          </Button>
        </div>
      </div>

      {/* ── Embed on website ── */}
      <div className="space-y-3">
        <div>
          <p className="text-xs font-bold text-white mb-0.5">Embed on Your Website</p>
          <p className="text-[10px] text-zinc-500">Choose how it appears, copy one snippet.</p>
        </div>

        {/* Mode picker */}
        <div className="grid grid-cols-3 gap-1.5">
          {(["iframe", "lightbox", "popover"] as const).map(m => (
            <button key={m} onClick={() => setEmbedMode(m)}
              className="py-2.5 rounded-xl text-center transition-all"
              style={{
                background: embedMode === m ? `${modeMeta[m].color}14` : "rgba(255,255,255,0.02)",
                border: `1px solid ${embedMode === m ? modeMeta[m].color + "40" : "rgba(255,255,255,0.06)"}`,
                color: embedMode === m ? modeMeta[m].color : "#52525b",
              }}>
              <div className="text-base mb-0.5">{modeMeta[m].icon}</div>
              <div className="text-[10px] font-bold">{modeMeta[m].label}</div>
            </button>
          ))}
        </div>

        <p className="text-[10px] text-zinc-500 -mt-1">{modeMeta[embedMode].desc}</p>

        {/* Code block */}
        <div className="relative">
          <pre className="text-[9.5px] text-zinc-300 bg-black rounded-xl p-3 pr-8 overflow-x-auto whitespace-pre-wrap break-all font-mono leading-relaxed" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
            {embedCodes[embedMode]}
          </pre>
          <button onClick={() => copy(embedCodes[embedMode], "code")} className="absolute top-2 right-2 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors">
            {copied === "code" ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-600" />}
          </button>
        </div>
        {copied === "code" && <p className="text-[10px] text-green-400 flex items-center gap-1 -mt-1"><Check className="w-3 h-3" /> Copied to clipboard</p>}

        {/* Platform chips */}
        <div>
          <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-700 mb-1.5">Works on every builder</p>
          <div className="flex flex-wrap gap-1">
            {["Webflow", "WordPress", "Wix", "Squarespace", "Framer", "Shopify", "Any HTML"].map(p => (
              <span key={p} className="text-[9px] px-1.5 py-0.5 rounded-md" style={{ background: "rgba(255,255,255,0.04)", color: "#71717a", border: "1px solid rgba(255,255,255,0.07)" }}>{p}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Custom Domain ── */}
      <div className="p-3.5 rounded-xl space-y-2.5" style={{ background: "rgba(96,165,250,0.06)", border: "1px solid rgba(96,165,250,0.18)" }}>
        <div>
          <p className="text-xs font-bold text-white">Custom Domain</p>
          <p className="text-[10px] text-zinc-500 mt-0.5">Serve your embed from <span className="text-zinc-300 font-mono">video.yoursite.com</span> instead of oravini.com.</p>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="video.yoursite.com"
            value={customDomain}
            onChange={e => setCustomDomain(e.target.value.replace(/^https?:\/\//, ""))}
            className="bg-black border-zinc-800 text-zinc-300 text-xs h-8 font-mono flex-1"
          />
        </div>
        {customDomain && (
          <div className="space-y-1.5">
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600">DNS Setup (add this CNAME)</p>
            <div className="relative">
              <pre className="text-[9px] text-zinc-400 bg-black rounded-lg p-2.5 pr-7 font-mono" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
                {`CNAME  ${customDomain}  proxy.oravini.com`}
              </pre>
              <button onClick={() => copy(`CNAME  ${customDomain}  proxy.oravini.com`, "cname")} className="absolute top-1.5 right-1.5 p-1 rounded hover:bg-zinc-800">
                {copied === "cname" ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3 text-zinc-600" />}
              </button>
            </div>
            <p className="text-[9px] text-zinc-700">After adding CNAME, your embed URL becomes: <span className="text-zinc-500 font-mono">https://{customDomain}/embed/{video.id}</span></p>
          </div>
        )}
      </div>

      {/* How-to steps collapsed */}
      <div className="space-y-2" style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "12px" }}>
        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-700">Quick embed steps</p>
        {[
          { n: "1", c: GOLD,        label: "Copy the embed code above" },
          { n: "2", c: "#60a5fa",   label: "Open your website builder → add HTML/Embed block" },
          { n: "3", c: "#34d399",   label: "Paste inside the block" },
          { n: "4", c: "#a78bfa",   label: "Publish — player goes live with full analytics" },
        ].map(s => (
          <div key={s.n} className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[9px] font-black" style={{ background: `${s.c}14`, color: s.c, border: `1px solid ${s.c}30` }}>{s.n}</div>
            <p className="text-[10px] text-zinc-500">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Settings Panel ────────────────────────────────────────────────────────────

function SettingsPanel({ video, onUpdate }: { video: any; onUpdate: (data: any) => void }) {
  let endCfg: any = {};
  try { endCfg = video.endScreenConfig ? JSON.parse(video.endScreenConfig) : {}; } catch {}

  const saveEndScreen = (patch: any) => {
    onUpdate({ endScreenConfig: JSON.stringify({ ...endCfg, ...patch }) });
  };

  const Toggle = ({ label, sub, value, onChange, activeColor = "#34d399" }: {
    label: string; sub: string; value: boolean; onChange: () => void; activeColor?: string;
  }) => (
    <div className="flex items-start justify-between gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="flex-1">
        <p className="text-xs font-semibold text-white mb-0.5">{label}</p>
        <p className="text-[11px] text-zinc-500 leading-relaxed">{sub}</p>
      </div>
      <button
        onClick={onChange}
        className="w-10 h-6 rounded-full flex-shrink-0 relative transition-colors"
        style={{ background: value ? activeColor : "rgba(255,255,255,0.1)" }}
      >
        <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${value ? "left-5" : "left-1"}`} />
      </button>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* ── Player toggles ── */}
      <div className="space-y-2">
        <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: `${GOLD}55` }}>Player</p>
        <Toggle label="Lead Gate" sub="Require name + email before watching." value={!!video.leadGateEnabled} onChange={() => onUpdate({ leadGateEnabled: !video.leadGateEnabled })} activeColor="#f59e0b" />
        <Toggle label="Oravini Watermark" sub="Shows Oravini logo bottom-right (like Wistia)." value={video.showOraviniWatermark !== false} onChange={() => onUpdate({ showOraviniWatermark: !(video.showOraviniWatermark !== false) })} activeColor={GOLD} />
        <Toggle label="Resume Playback" sub="Viewers resume from where they left off." value={!!video.resumeEnabled} onChange={() => onUpdate({ resumeEnabled: !video.resumeEnabled })} />
        <Toggle label="Speed Control" sub="Let viewers adjust playback speed (0.5× – 2×)." value={video.allowSpeedControl !== false} onChange={() => onUpdate({ allowSpeedControl: !(video.allowSpeedControl !== false) })} />
        <Toggle label="Social Share Buttons" sub="Show share buttons (X, LinkedIn, copy link) in the player." value={!!video.socialShareEnabled} onChange={() => onUpdate({ socialShareEnabled: !video.socialShareEnabled })} activeColor="#60a5fa" />
        <Toggle label="Allow Download" sub="Show a download button on the public watch page." value={!!video.allowDownload} onChange={() => onUpdate({ allowDownload: !video.allowDownload })} activeColor="#a78bfa" />
      </div>

      {/* ── Brand color ── */}
      <div className="p-3 rounded-xl space-y-2" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <p className="text-xs font-semibold text-white">Player Brand Color</p>
        <p className="text-[11px] text-zinc-500">Tints progress bar, play button, CTAs.</p>
        <div className="flex items-center gap-3">
          <input type="color" value={video.brandColor || GOLD} onChange={e => onUpdate({ brandColor: e.target.value })} className="w-9 h-9 rounded-xl cursor-pointer" style={{ border: "1px solid rgba(255,255,255,0.1)", background: "none" }} />
          <span className="text-xs text-zinc-400 font-mono">{video.brandColor || GOLD}</span>
        </div>
      </div>

      {/* ── Captions ── */}
      <div className="space-y-2">
        <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: `${GOLD}55` }}>Captions</p>
        <div className="p-3 rounded-xl space-y-2" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <p className="text-xs font-semibold text-white">Caption / Subtitle File URL</p>
          <p className="text-[11px] text-zinc-500">Paste a .vtt or .srt URL. Viewers can toggle CC in the player.</p>
          <Input
            placeholder="https://your-cdn.com/captions.vtt"
            value={video.captionUrl || ""}
            onChange={e => onUpdate({ captionUrl: e.target.value })}
            className="bg-zinc-900 border-zinc-800 text-zinc-300 text-xs h-8"
          />
        </div>
      </div>

      {/* ── End Screen ── */}
      <div className="space-y-2">
        <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: `${GOLD}55` }}>End Screen</p>
        <div className="p-3 rounded-xl space-y-3" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-white mb-0.5">Enable End Screen</p>
              <p className="text-[11px] text-zinc-500">Show a CTA overlay when the video finishes — like Wistia.</p>
            </div>
            <button onClick={() => saveEndScreen({ enabled: !endCfg.enabled })} className="w-10 h-6 rounded-full flex-shrink-0 relative transition-colors" style={{ background: endCfg.enabled ? "#a78bfa" : "rgba(255,255,255,0.1)" }}>
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${endCfg.enabled ? "left-5" : "left-1"}`} />
            </button>
          </div>
          {endCfg.enabled && (
            <div className="space-y-2 pt-1 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <div>
                <Label className="text-[10px] text-zinc-500 mb-1 block">Headline / Message</Label>
                <Input placeholder="Ready to get started?" value={endCfg.ctaText || ""} onChange={e => saveEndScreen({ ctaText: e.target.value })} className="bg-zinc-900 border-zinc-800 text-zinc-300 text-xs h-8" />
              </div>
              <div>
                <Label className="text-[10px] text-zinc-500 mb-1 block">Button Text</Label>
                <Input placeholder="Get Started →" value={endCfg.ctaButtonText || ""} onChange={e => saveEndScreen({ ctaButtonText: e.target.value })} className="bg-zinc-900 border-zinc-800 text-zinc-300 text-xs h-8" />
              </div>
              <div>
                <Label className="text-[10px] text-zinc-500 mb-1 block">Button URL</Label>
                <Input placeholder="https://your-offer.com" value={endCfg.ctaUrl || ""} onChange={e => saveEndScreen({ ctaUrl: e.target.value })} className="bg-zinc-900 border-zinc-800 text-zinc-300 text-xs h-8" />
              </div>
              <Toggle label="Show Replay Button" sub="Let viewers watch again from end screen." value={endCfg.showReplay !== false} onChange={() => saveEndScreen({ showReplay: !(endCfg.showReplay !== false) })} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Heatmap Section ───────────────────────────────────────────────────────────

function AnalyticsSection({ videoId }: { videoId: string }) {
  const { data: heatmap = [], isLoading: heatLoading } = useQuery<any[]>({
    queryKey: ["heatmap", videoId],
    queryFn: () => fetch(`/api/video-analytics/${videoId}/heatmap`, { credentials: "include" }).then(r => r.json()),
    refetchInterval: 30000,
  });
  const { data: viewers = [] } = useQuery<any[]>({
    queryKey: ["viewers", videoId],
    queryFn: () => fetch(`/api/video-analytics/${videoId}/viewers`, { credentials: "include" }).then(r => r.json()),
  });
  const { data: daily = [] } = useQuery<any[]>({
    queryKey: ["daily", videoId],
    queryFn: () => fetch(`/api/video-analytics/${videoId}/daily?days=14`, { credentials: "include" }).then(r => r.json()),
  });

  // ── KPIs ────────────────────────────────────────────────────────────────────
  const totalPlays   = viewers.length;
  const uniqueViewers = new Set(viewers.map((v: any) => v.visitorId || v.sessionId)).size;
  const avgCompletion = totalPlays > 0
    ? Math.round(viewers.reduce((s: number, v: any) => s + (v.completionPct || 0), 0) / totalPlays)
    : 0;
  const watchViewers  = viewers.filter((v: any) => v.totalWatchSeconds > 0);
  const avgWatchSec   = watchViewers.length > 0
    ? Math.round(watchViewers.reduce((s: number, v: any) => s + (v.totalWatchSeconds || 0), 0) / watchViewers.length)
    : 0;
  const ctaClicks     = viewers.filter((v: any) => v.ctaClicked).length;
  const leadCaptures  = viewers.filter((v: any) => v.leadCaptured).length;

  const fmtTime = (sec: number) => sec >= 60 ? `${Math.floor(sec / 60)}m ${sec % 60}s` : `${sec}s`;

  // ── Retention / drop-off curve ──────────────────────────────────────────────
  const maxView   = Math.max(1, ...heatmap.map((s: any) => s.viewCount || 0));
  const maxReplay = Math.max(1, ...heatmap.map((s: any) => s.replayCount || 0));
  const W = 400, H = 80;

  // Retention % = viewCount[i] / maxView * 100
  const retentionPts = heatmap.map((seg: any, i: number) => {
    const x = heatmap.length > 1 ? (i / (heatmap.length - 1)) * W : 0;
    const pct = (seg.viewCount || 0) / maxView;
    const y = H - Math.max(3, pct * (H - 6));
    return { x, y, pct, seg };
  });

  const polyline  = retentionPts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPath  = retentionPts.length > 0
    ? `M0,${H} L${retentionPts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" L")} L${W},${H} Z`
    : "";

  // Biggest drop-off second (largest single-step decline in viewCount)
  let bigDropIdx = -1, bigDropDelta = 0;
  for (let i = 1; i < heatmap.length; i++) {
    const delta = (heatmap[i - 1].viewCount || 0) - (heatmap[i].viewCount || 0);
    if (delta > bigDropDelta) { bigDropDelta = delta; bigDropIdx = i; }
  }
  const bigDropSec = bigDropIdx >= 0 ? heatmap[bigDropIdx]?.segmentSecond : null;
  const bigDropPct = bigDropIdx >= 0 ? Math.round(((heatmap[bigDropIdx]?.viewCount || 0) / maxView) * 100) : null;

  // ── Daily plays bar chart (SVG) ─────────────────────────────────────────────
  const dailyPlays = daily.map((d: any) => d.plays || 0);
  const maxDaily   = Math.max(1, ...dailyPlays);
  const BAR_W = 400, BAR_H = 60;

  // ── Heatmap bars color ───────────────────────────────────────────────────────
  const segmentColor = (seg: any) => {
    const vi = (seg.viewCount || 0) / maxView;
    const ri = (seg.replayCount || 0) / maxReplay;
    if (vi > 0.8 || ri > 0.5) return "#ef4444";
    if (vi > 0.5) return "#f59e0b";
    if (vi > 0.2) return "#34d399";
    return "rgba(255,255,255,0.08)";
  };

  const hotSpots = heatmap
    .filter((s: any) => (s.replayCount || 0) > 0)
    .sort((a: any, b: any) => b.replayCount - a.replayCount)
    .slice(0, 3);

  const kpis = [
    { label: "Plays",       value: totalPlays,            color: GOLD,       sub: "total" },
    { label: "Viewers",     value: uniqueViewers,          color: "#60a5fa",  sub: "unique" },
    { label: "Completion",  value: `${avgCompletion}%`,    color: "#34d399",  sub: "avg" },
    { label: "Watch Time",  value: avgWatchSec > 0 ? fmtTime(avgWatchSec) : "—", color: "#a78bfa", sub: "avg" },
    { label: "CTA Clicks",  value: ctaClicks,              color: "#f59e0b",  sub: "total" },
    { label: "Leads",       value: leadCaptures,           color: "#ec4899",  sub: "captured" },
  ];

  const isEmpty = !heatLoading && heatmap.length === 0 && viewers.length === 0;

  return (
    <div className="space-y-5">
      {/* KPI row — only when data exists */}
      {totalPlays > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {kpis.map(k => (
            <div key={k.label} className="p-2.5 rounded-xl text-center" style={{ background: `${k.color}08`, border: `1px solid ${k.color}18` }}>
              <p className="text-[8px] font-black uppercase tracking-widest mb-1 leading-none" style={{ color: `${k.color}70` }}>{k.label}</p>
              <p className="text-base font-black leading-none text-white">{k.value}</p>
              <p className="text-[8px] text-zinc-700 mt-0.5">{k.sub}</p>
            </div>
          ))}
        </div>
      )}

      {heatLoading ? (
        <div className="h-20 rounded-xl flex items-center justify-center" style={{ background: "rgba(8,8,12,0.9)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: GOLD, borderTopColor: "transparent" }} />
        </div>
      ) : isEmpty ? (
        <div className="py-10 rounded-xl flex flex-col items-center gap-3 text-center px-6" style={{ background: "rgba(8,8,12,0.9)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <BarChart3 className="w-6 h-6 text-zinc-700" />
          <div>
            <p className="text-xs font-bold text-zinc-400 mb-1">No analytics yet</p>
            <p className="text-[10px] text-zinc-600 leading-relaxed">Share your video using the <span className="text-zinc-400 font-bold">Share</span> tab — analytics populate automatically as people watch it.</p>
          </div>
        </div>
      ) : (
        <>
          {/* Retention / Drop-off Curve */}
          {heatmap.length > 1 && (
            <div className="rounded-xl overflow-hidden" style={{ background: "rgba(8,8,12,0.9)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="px-3 pt-3 pb-1 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-zinc-300">Viewer Retention</p>
                  <p className="text-[9px] text-zinc-600">% of viewers still watching at each second</p>
                </div>
                {bigDropSec != null && (
                  <div className="text-right flex-shrink-0">
                    <p className="text-[9px] font-bold text-red-400">⬇ {bigDropPct}% at {Math.floor(bigDropSec / 60)}:{String(bigDropSec % 60).padStart(2, "0")}</p>
                    <p className="text-[8px] text-zinc-700">biggest exit point</p>
                  </div>
                )}
              </div>
              <div className="px-2 pb-1 relative">
                <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: "75px" }} preserveAspectRatio="none">
                  <defs>
                    <linearGradient id={`ret-fill-${videoId}`} x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%"   stopColor="#34d399" stopOpacity="0.35" />
                      <stop offset="50%"  stopColor="#f59e0b" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity="0.15" />
                    </linearGradient>
                    <linearGradient id={`ret-line-${videoId}`} x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%"   stopColor="#34d399" />
                      <stop offset="50%"  stopColor="#f59e0b" />
                      <stop offset="100%" stopColor="#ef4444" />
                    </linearGradient>
                  </defs>
                  {/* 100% and 50% guide lines */}
                  <line x1="0" y1="6"  x2={W} y2="6"  stroke="rgba(255,255,255,0.04)" strokeWidth="1" strokeDasharray="4,4" />
                  <line x1="0" y1={H / 2} x2={W} y2={H / 2} stroke="rgba(255,255,255,0.04)" strokeWidth="1" strokeDasharray="4,4" />
                  {/* Area fill */}
                  {areaPath && <path d={areaPath} fill={`url(#ret-fill-${videoId})`} />}
                  {/* Line */}
                  {polyline && (
                    <polyline
                      points={polyline}
                      fill="none"
                      stroke={`url(#ret-line-${videoId})`}
                      strokeWidth="2"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                  )}
                  {/* Drop-off marker */}
                  {bigDropIdx >= 0 && retentionPts[bigDropIdx] && (
                    <>
                      <line
                        x1={retentionPts[bigDropIdx].x} y1="0"
                        x2={retentionPts[bigDropIdx].x} y2={H}
                        stroke="#ef4444" strokeWidth="1" strokeDasharray="3,3" opacity="0.6"
                      />
                      <circle cx={retentionPts[bigDropIdx].x} cy={retentionPts[bigDropIdx].y} r="3" fill="#ef4444" opacity="0.9" />
                    </>
                  )}
                </svg>
                {/* Y labels */}
                <div className="absolute left-2 top-1 flex flex-col justify-between" style={{ height: "75px", pointerEvents: "none" }}>
                  <span className="text-[7px] text-zinc-700 leading-none">100%</span>
                  <span className="text-[7px] text-zinc-700 leading-none">50%</span>
                  <span className="text-[7px] text-zinc-700 leading-none">0%</span>
                </div>
              </div>
              <div className="flex justify-between px-3 pb-2.5">
                <span className="text-[8px] text-zinc-700">0:00</span>
                <div className="flex items-center gap-3">
                  {[{ c: "#34d399", l: "High" }, { c: "#f59e0b", l: "Mid" }, { c: "#ef4444", l: "Dropping" }].map(g => (
                    <div key={g.l} className="flex items-center gap-1">
                      <div className="w-2 h-0.5 rounded" style={{ background: g.c }} />
                      <span className="text-[8px] text-zinc-700">{g.l}</span>
                    </div>
                  ))}
                </div>
                <span className="text-[8px] text-zinc-700">
                  {heatmap.length > 0 ? `${Math.floor(heatmap[heatmap.length - 1].segmentSecond / 60)}:${String(heatmap[heatmap.length - 1].segmentSecond % 60).padStart(2, "0")}` : ""}
                </span>
              </div>
            </div>
          )}

          {/* Daily plays bar chart */}
          {daily.length > 0 && (
            <div className="rounded-xl overflow-hidden" style={{ background: "rgba(8,8,12,0.9)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="px-3 pt-3 pb-1 flex items-center justify-between">
                <p className="text-[10px] font-bold text-zinc-400">Daily Plays</p>
                <p className="text-[9px] text-zinc-700">last {daily.length} days</p>
              </div>
              <div className="px-2 pb-2">
                <svg viewBox={`0 0 ${BAR_W} ${BAR_H}`} className="w-full" style={{ height: "55px" }} preserveAspectRatio="none">
                  {daily.map((d: any, i: number) => {
                    const barH = Math.max(2, ((d.plays || 0) / maxDaily) * (BAR_H - 4));
                    const barW = BAR_W / daily.length - 1.5;
                    const x = i * (BAR_W / daily.length);
                    const y = BAR_H - barH;
                    return (
                      <rect
                        key={i}
                        x={x}
                        y={y}
                        width={barW}
                        height={barH}
                        rx="2"
                        fill={GOLD}
                        opacity={0.7 + 0.3 * ((d.plays || 0) / maxDaily)}
                      />
                    );
                  })}
                </svg>
                <div className="flex justify-between mt-0.5 px-1">
                  <span className="text-[8px] text-zinc-700">{daily[0]?.date?.slice(5) || ""}</span>
                  <span className="text-[8px] text-zinc-700">{daily[daily.length - 1]?.date?.slice(5) || "today"}</span>
                </div>
              </div>
            </div>
          )}

          {/* Heatmap bar */}
          {heatmap.length > 0 && (
            <div className="rounded-xl overflow-hidden" style={{ background: "rgba(8,8,12,0.9)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="px-3 pt-3 pb-1">
                <p className="text-[10px] font-bold text-zinc-400">View Density Heatmap</p>
              </div>
              <div className="flex items-end gap-px px-2 py-1" style={{ height: "52px" }}>
                {heatmap.map((seg: any) => (
                  <div
                    key={seg.segmentSecond}
                    className="flex-1 rounded-t-sm min-w-[1px]"
                    title={`${seg.segmentSecond}s — ${seg.viewCount} views, ${seg.replayCount} replays`}
                    style={{
                      height: `${Math.max(8, ((seg.viewCount || 0) / maxView) * 100)}%`,
                      background: segmentColor(seg),
                      opacity: 0.85,
                    }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-4 px-3 pb-2">
                {[{ color: "#34d399", label: "Watched" }, { color: "#f59e0b", label: "Popular" }, { color: "#ef4444", label: "Replayed" }].map(l => (
                  <div key={l.label} className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-sm" style={{ background: l.color }} />
                    <span className="text-[9px] text-zinc-600">{l.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hot spots */}
          {hotSpots.length > 0 && (
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-700 mb-2">Most Replayed Moments</p>
              <div className="space-y-1">
                {hotSpots.map((seg: any, i: number) => (
                  <div key={seg.segmentSecond} className="flex items-center gap-3 px-3 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <span className="text-[10px] font-black w-5" style={{ color: i === 0 ? "#ef4444" : i === 1 ? "#f59e0b" : "#34d399" }}>#{i + 1}</span>
                    <span className="text-xs font-mono text-zinc-300">{Math.floor(seg.segmentSecond / 60)}:{String(seg.segmentSecond % 60).padStart(2, "0")}</span>
                    <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <div className="h-full rounded-full" style={{ width: `${(seg.replayCount / (hotSpots[0]?.replayCount || 1)) * 100}%`, background: i === 0 ? "#ef4444" : i === 1 ? "#f59e0b" : "#34d399" }} />
                    </div>
                    <span className="text-[10px] text-zinc-500 w-16 text-right">{seg.replayCount}× replay</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Viewer rows */}
          {viewers.length > 0 && (
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-700 mb-2">Recent Viewers</p>
              <div className="space-y-1">
                {viewers.slice(0, 6).map((v: any, i: number) => (
                  <div key={v.sessionId || i} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black flex-shrink-0" style={{ background: `${GOLD}18`, color: GOLD }}>
                      {(v.device || "?")[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-zinc-400 truncate leading-none">{v.referrerDomain || v.utmSource || v.device || "Direct"}</p>
                      {v.country && <p className="text-[9px] text-zinc-700 leading-none mt-0.5">{v.country}</p>}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <div className="h-1 w-10 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                        <div className="h-full rounded-full" style={{ width: `${v.completionPct || 0}%`, background: (v.completionPct || 0) > 70 ? "#34d399" : (v.completionPct || 0) > 40 ? "#f59e0b" : "#ef4444" }} />
                      </div>
                      <span className="text-[10px] font-bold" style={{ color: (v.completionPct || 0) > 70 ? "#34d399" : (v.completionPct || 0) > 40 ? "#f59e0b" : "#ef4444" }}>{v.completionPct || 0}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Video Studio ──────────────────────────────────────────────────────────────

function VideoStudio({
  video: initialVideo,
  onBack,
  onDelete,
}: {
  video: any;
  onBack: () => void;
  onDelete: (id: string) => void;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [video, setVideo] = useState(initialVideo);
  const [activeTab, setActiveTab] = useState("embed");
  const [iframeKey, setIframeKey] = useState(0);

  const updateMut = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", `/api/video-events/${video.id}`, data),
    onSuccess: (updated: any) => {
      const merged = { ...video, ...updated };
      setVideo(merged);
      qc.invalidateQueries({ queryKey: ["/api/video-events"] });
      setIframeKey(k => k + 1);
      toast({ title: "Saved" });
    },
    onError: (err: any) => toast({ title: "Save failed", description: err.message, variant: "destructive" }),
  });

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const embedUrl = `${baseUrl}/embed/${video.id}`;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-zinc-500 hover:text-white hover:bg-white/[0.05] transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Library
        </button>
        <span className="text-zinc-700 text-sm">/</span>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate">{video.title}</p>
          <VideoTypeBadge type={video.videoType || "standard"} />
          {video.leadGateEnabled && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 flex-shrink-0" style={{ background: "#f59e0b18", color: "#f59e0b", border: "1px solid #f59e0b30" }}>
              <Lock className="w-2.5 h-2.5" /> GATED
            </span>
          )}
        </div>
        <a
          href={embedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all hover:scale-105 flex-shrink-0"
          style={{ background: `${GOLD}15`, color: GOLD, border: `1px solid ${GOLD}30` }}
        >
          <ExternalLink className="w-3 h-3" /> Preview
        </a>
        <button
          onClick={() => { onDelete(video.id); onBack(); }}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-700 hover:text-red-400 hover:bg-red-400/10 transition-all flex-shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-start">

        {/* ── Left: Live Player ── */}
        <div className="lg:col-span-3 space-y-3">
          <div
            className="rounded-2xl overflow-hidden"
            style={{ aspectRatio: "16/9", background: "#000", border: `1px solid ${GOLD}18` }}
          >
            <iframe
              key={iframeKey}
              src={embedUrl}
              className="w-full h-full"
              allow="autoplay; fullscreen; encrypted-media"
              allowFullScreen
              title={video.title}
            />
          </div>
          <div className="flex items-center justify-between px-1">
            <p className="text-[11px] text-zinc-600 leading-relaxed">
              This is exactly what your visitors see — with Oravini branding, progress bar, lead gate, and analytics.
            </p>
            <a
              href={embedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-zinc-600 hover:text-white flex items-center gap-1 transition-colors flex-shrink-0 ml-3"
            >
              Open full page <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 rounded-xl flex items-center gap-2" style={{ background: "rgba(8,8,12,0.9)", border: `1px solid ${GOLD}14` }}>
              <Eye className="w-3.5 h-3.5 flex-shrink-0" style={{ color: `${GOLD}60` }} />
              <div>
                <p className="text-[8px] font-bold uppercase tracking-wider" style={{ color: `${GOLD}50` }}>Total Views</p>
                <p className="text-sm font-black text-white">{video.views || 0}</p>
              </div>
            </div>
            <div className="p-2.5 rounded-xl flex items-center gap-2" style={{ background: "rgba(8,8,12,0.9)", border: "1px solid rgba(52,211,153,0.14)" }}>
              {video.leadGateEnabled
                ? <><Lock className="w-3.5 h-3.5 flex-shrink-0 text-amber-400" /><div><p className="text-[8px] font-bold uppercase tracking-wider text-amber-400/50">Lead Gate</p><p className="text-sm font-black text-white">ON</p></div></>
                : <><Play className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "rgba(52,211,153,0.6)" }} /><div><p className="text-[8px] font-bold uppercase tracking-wider" style={{ color: "rgba(52,211,153,0.5)" }}>Status</p><p className="text-sm font-black text-white">Public</p></div></>
              }
            </div>
          </div>
        </div>

        {/* ── Right: Config Panel ── */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${GOLD}14`, background: "#08080c" }}>
            {/* Tab bar */}
            <div className="flex overflow-x-auto" style={{ borderBottom: `1px solid rgba(255,255,255,0.06)` }}>
              {[
                { id: "embed",    label: "Share",        icon: Share2,    color: "#34d399" },
                { id: "progress", label: "Progress Bar", icon: Gauge,     color: "#a78bfa" },
                { id: "analytics", label: "Analytics",  icon: BarChart3, color: "#f59e0b" },
                { id: "settings", label: "Settings",    icon: Settings2, color: GOLD },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-3 text-[10px] font-bold transition-all whitespace-nowrap"
                  style={{
                    color: activeTab === t.id ? t.color : "#52525b",
                    borderBottom: `2px solid ${activeTab === t.id ? t.color : "transparent"}`,
                    background: activeTab === t.id ? `${t.color}06` : "transparent",
                  }}
                >
                  <t.icon className="w-3 h-3" /> {t.label}
                </button>
              ))}
            </div>

            <div className="p-4 overflow-y-auto" style={{ maxHeight: "calc(100vh - 260px)", minHeight: "400px" }}>
              {activeTab === "embed"    && <EmbedSection video={video} />}
              {activeTab === "progress" && <ProgressSection video={video} onUpdate={data => updateMut.mutate(data)} />}
              {activeTab === "analytics" && <AnalyticsSection videoId={video.id} />}
              {activeTab === "settings" && <SettingsPanel video={video} onUpdate={data => updateMut.mutate(data)} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Video Card ────────────────────────────────────────────────────────────────

function VideoCard({ video, onClick, onDelete }: { video: any; onClick: () => void; onDelete: (id: string) => void }) {
  return (
    <div
      className="group rounded-2xl overflow-hidden cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-lg"
      style={{ border: `1px solid ${GOLD}12`, background: "#0a0a0e" }}
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div className="relative w-full" style={{ aspectRatio: "16/9", background: video.videoType === "vsl" ? "#130d1f" : "#0c0c14" }}>
        {video.thumbnailUrl ? (
          <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Film className="w-8 h-8" style={{ color: video.videoType === "vsl" ? "#a78bfa25" : `${GOLD}25` }} />
          </div>
        )}

        {/* Hover play overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "rgba(0,0,0,0.55)" }}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: `${GOLD}ee`, boxShadow: `0 0 24px ${GOLD}50` }}>
            <Play className="w-5 h-5 text-black ml-0.5" fill="black" />
          </div>
        </div>

        {/* Badges */}
        <div className="absolute top-2 left-2">
          <VideoTypeBadge type={video.videoType || "standard"} />
        </div>
        {video.duration && (
          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md text-[10px] font-bold" style={{ background: "rgba(0,0,0,0.8)", color: "#d4d4d8" }}>
            {video.duration}m
          </div>
        )}

        {/* Delete — always visible */}
        <button
          onClick={e => { e.stopPropagation(); onDelete(video.id); }}
          className="absolute top-2 right-2 w-6 h-6 rounded-lg flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-red-500/15 transition-all"
          style={{ background: "rgba(0,0,0,0.55)" }}
          title="Delete video"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      {/* Info */}
      <div className="px-3 py-2.5">
        <p className="text-sm font-bold text-white truncate mb-2">{video.title}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-500 flex items-center gap-0.5">
              <Eye className="w-2.5 h-2.5" /> {video.views || 0} views
            </span>
            {video.leadGateEnabled && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "#f59e0b18", color: "#f59e0b", border: "1px solid #f59e0b30" }}>GATED</span>
            )}
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg transition-all group-hover:opacity-100 opacity-70" style={{ background: `${GOLD}14`, color: GOLD }}>Open Studio →</span>
        </div>
      </div>
    </div>
  );
}

// ── Add Video Dialog (content only) ──────────────────────────────────────────

const DEFAULT_FORM = {
  title: "", description: "", videoUrl: "", thumbnailUrl: "",
  videoType: "standard", duration: "", category: "General",
};

function AddVideoDialog({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: (video: any) => void;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadMethod, setUploadMethod] = useState("url");
  const [form, setForm] = useState(DEFAULT_FORM);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  const createMut = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/video-events", data),
    onSuccess: async (created: any) => {
      await qc.invalidateQueries({ queryKey: ["/api/video-events"] });
      setForm(DEFAULT_FORM);
      onClose();
      onSuccess(created);
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith("video/")) {
      toast({ title: "Please select a video file", variant: "destructive" });
      return;
    }
    setUploadingFile(true);
    setUploadProgress(0);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const url = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener("progress", e => {
          if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
        });
        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try { resolve(JSON.parse(xhr.responseText).url); }
            catch { reject(new Error("Invalid server response")); }
          } else {
            let msg = `Upload failed (${xhr.status})`;
            try { const d = JSON.parse(xhr.responseText); if (d.message) msg = d.message; } catch {}
            reject(new Error(msg));
          }
        });
        xhr.addEventListener("error", () => reject(new Error("Network error")));
        xhr.open("POST", "/api/upload/video");
        xhr.send(fd);
      });
      setForm(f => ({ ...f, videoUrl: url, title: f.title || file.name.replace(/\.[^.]+$/, "") }));
      toast({ title: `${file.name} uploaded`, description: "Fill in the title and click Add Video" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploadingFile(false);
      setUploadProgress(0);
    }
  }, [toast]);

  const handleCreate = () => {
    if (!form.title || !form.videoUrl) {
      toast({ title: "Title and video URL required", variant: "destructive" });
      return;
    }
    createMut.mutate({
      title: form.title,
      description: form.description || null,
      videoUrl: form.videoUrl,
      thumbnailUrl: form.thumbnailUrl || null,
      duration: form.duration ? Number(form.duration) : null,
      category: form.category,
      videoType: form.videoType,
      isPublic: false,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-700 max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white font-bold flex items-center gap-2">
            <Plus className="w-4 h-4" style={{ color: GOLD }} /> Add Video
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Video type */}
          <div>
            <Label className="text-xs text-zinc-400 mb-2 block">Video Type</Label>
            <Select value={form.videoType} onValueChange={v => setForm({ ...form, videoType: v })}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                <SelectItem value="standard" className="text-zinc-300">🎬 Standard Video</SelectItem>
                <SelectItem value="vsl" className="text-zinc-300">⚡ VSL (Video Sales Letter)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Upload method */}
          <div>
            <Label className="text-xs text-zinc-400 mb-2 block">Video Source</Label>
            <Tabs value={uploadMethod} onValueChange={setUploadMethod}>
              <TabsList className="bg-zinc-800 border border-zinc-700 w-full">
                <TabsTrigger value="url" className="flex-1 text-xs">URL / Embed</TabsTrigger>
                <TabsTrigger value="upload" className="flex-1 text-xs">Upload File</TabsTrigger>
                <TabsTrigger value="drive" className="flex-1 text-xs">Google Drive</TabsTrigger>
              </TabsList>

              <TabsContent value="url" className="mt-3">
                <Input
                  placeholder="https://youtube.com/watch?v=... or Vimeo, direct MP4 URL..."
                  value={form.videoUrl}
                  onChange={e => setForm({ ...form, videoUrl: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
                <p className="text-xs text-zinc-500 mt-1.5">Supports YouTube, Vimeo, Wistia, Loom, and direct video URLs</p>
              </TabsContent>

              <TabsContent value="upload" className="mt-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                />
                <div
                  className="border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all"
                  style={{
                    borderColor: dragOver ? GOLD : "rgba(255,255,255,0.12)",
                    background: dragOver ? `${GOLD}08` : "rgba(255,255,255,0.02)",
                    pointerEvents: uploadingFile ? "none" : "auto",
                    opacity: uploadingFile ? 0.7 : 1,
                  }}
                  onClick={() => !uploadingFile && fileInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={e => { e.preventDefault(); setDragOver(false); e.dataTransfer.files[0] && handleFileUpload(e.dataTransfer.files[0]); }}
                >
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: `${GOLD}10`, border: `1px solid ${GOLD}25` }}>
                    <Upload className="w-6 h-6" style={{ color: `${GOLD}70` }} />
                  </div>
                  <p className="text-sm font-semibold text-white mb-1">
                    {uploadingFile ? `Uploading ${uploadProgress}%…` : dragOver ? "Drop to upload" : "Drag & drop or click to upload"}
                  </p>
                  <p className="text-xs text-zinc-500">MP4, MOV, WebM, AVI · up to 200MB</p>
                  {uploadingFile && (
                    <div className="mt-3 w-full bg-zinc-800 rounded-full h-2 overflow-hidden max-w-xs mx-auto">
                      <div className="h-full rounded-full transition-all" style={{ width: `${uploadProgress}%`, background: GOLD }} />
                    </div>
                  )}
                  {form.videoUrl?.startsWith("/uploads/") && (
                    <div className="mt-3 flex items-start gap-2 px-3 py-2.5 rounded-xl text-left" style={{ background: "#22c55e10", border: "1px solid #22c55e25" }}>
                      <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0 mt-1" />
                      <div>
                        <p className="text-xs font-bold text-green-400">Video uploaded!</p>
                        <p className="text-[11px] text-zinc-500 mt-0.5">↓ Now enter a title below, then click "Add Video" to open your studio.</p>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="drive" className="mt-3">
                <div className="rounded-xl p-5 text-center space-y-2" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <p className="text-xs font-bold text-zinc-400">Google Drive Import</p>
                  <p className="text-[11px] text-zinc-600 leading-relaxed">Connect your Google Drive to import videos directly — no re-uploading needed.</p>
                  <span className="inline-block text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ background: `${GOLD}12`, color: `${GOLD}80`, border: `1px solid ${GOLD}20` }}>Coming Soon</span>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Title + meta */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-xs text-zinc-400 mb-1.5 block">Title *</Label>
              <Input
                placeholder="Video title"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div>
              <Label className="text-xs text-zinc-400 mb-1.5 block">Duration (minutes)</Label>
              <Input
                type="number"
                placeholder="e.g. 45"
                value={form.duration}
                onChange={e => setForm({ ...form, duration: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div>
              <Label className="text-xs text-zinc-400 mb-1.5 block">Category</Label>
              <Input
                placeholder="e.g. Training"
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs text-zinc-400 mb-1.5 block">Description</Label>
            <Textarea
              placeholder="What is this video about?"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              className="bg-zinc-800 border-zinc-700 text-white resize-none"
              rows={2}
            />
          </div>

          <div>
            <Label className="text-xs text-zinc-400 mb-1.5 block">Thumbnail URL (optional)</Label>
            <Input
              placeholder="https://..."
              value={form.thumbnailUrl}
              onChange={e => setForm({ ...form, thumbnailUrl: e.target.value })}
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:items-center">
          <p className="text-[11px] text-zinc-600 flex-1">After adding, you'll see the live player and get your embed code.</p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose} className="text-zinc-400">Cancel</Button>
            <Button
              onClick={handleCreate}
              disabled={createMut.isPending || !form.title || !form.videoUrl}
              style={{ background: GOLD, color: "#000" }}
              className="font-semibold"
            >
              {createMut.isPending ? "Adding…" : "Add Video"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main VideoHosting ─────────────────────────────────────────────────────────

export default function VideoHosting({ onNavigate }: { onNavigate?: (tab: string) => void } = {}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [selectedVideo, setSelectedVideo] = useState<any | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [typeFilter, setTypeFilter] = useState<"all" | "vsl" | "standard">("all");

  const { data: _videos } = useQuery<any[]>({ queryKey: ["/api/video-events"] });
  const videos = (_videos ?? []) as any[];

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/video-events/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/video-events"] });
      toast({ title: "Video deleted" });
    },
  });

  // Studio view
  if (selectedVideo) {
    return (
      <VideoStudio
        video={selectedVideo}
        onBack={() => setSelectedVideo(null)}
        onDelete={id => deleteMut.mutate(id)}
      />
    );
  }

  // Library view
  const vslVideos = videos.filter(v => v.videoType === "vsl");
  const standardVideos = videos.filter(v => !v.videoType || v.videoType === "standard");
  const totalViews = videos.reduce((s, v) => s + (v.views || 0), 0);
  const leadGatedCount = videos.filter(v => v.leadGateEnabled).length;
  const filtered = typeFilter === "vsl" ? vslVideos : typeFilter === "standard" ? standardVideos : videos;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Videos", value: videos.length,      icon: Video,   color: GOLD },
          { label: "VSLs",         value: vslVideos.length,   icon: Zap,     color: "#a78bfa" },
          { label: "Total Views",  value: totalViews,          icon: Eye,     color: "#34d399" },
          { label: "Lead Gates",   value: leadGatedCount,      icon: Shield,  color: "#60a5fa" },
        ].map(s => (
          <div key={s.label} className="rounded-2xl p-4" style={{ background: "#0c0c10", border: `1px solid ${GOLD}14` }}>
            <div className="flex items-start justify-between mb-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: `${GOLD}55` }}>{s.label}</p>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${s.color}14`, border: `1px solid ${s.color}22` }}>
                <s.icon className="w-4 h-4" style={{ color: s.color }} />
              </div>
            </div>
            <p className="text-3xl font-black" style={{ background: `linear-gradient(135deg, #fff 0%, ${s.color} 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "-0.02em" }}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Library header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] mb-0.5" style={{ color: `${GOLD}50` }}>— Library —</p>
          <h3 className="text-2xl font-black" style={{ background: `linear-gradient(135deg, #fff 0%, ${GOLD} 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "-0.02em" }}>
            Video Library
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl overflow-hidden" style={{ border: `1px solid ${GOLD}14`, background: "#0c0c10" }}>
            {(["all", "vsl", "standard"] as const).map(k => (
              <button
                key={k}
                onClick={() => setTypeFilter(k)}
                className="px-3 py-1.5 text-xs font-bold transition-all capitalize"
                style={{ background: typeFilter === k ? GOLD : "transparent", color: typeFilter === k ? "#000" : "#71717a" }}
              >
                {k === "all" ? "All" : k === "vsl" ? "VSLs" : "Standard"}
              </button>
            ))}
          </div>
          <Button size="sm" style={{ background: GOLD, color: "#000" }} className="font-semibold gap-1.5" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" /> Add Video
          </Button>
        </div>
      </div>

      {/* Video grid */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl py-14 text-center px-6" style={{ border: `1px solid ${GOLD}14`, background: "#08080c" }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: `${GOLD}10`, border: `1px solid ${GOLD}20` }}>
            <Film className="w-6 h-6" style={{ color: `${GOLD}80` }} />
          </div>
          <p className="text-sm font-semibold text-white mb-1">No videos yet</p>
          <p className="text-xs text-zinc-500 mb-8">Upload a video or paste a URL — then see it live and get your embed code.</p>
          {/* How it works */}
          <div className="flex items-center justify-center gap-0 max-w-sm mx-auto">
            {[
              { step: "1", label: "Upload video",    sub: "File or URL",         icon: Upload,      color: GOLD },
              { step: "2", label: "See it live",     sub: "Full Oravini player", icon: Play,        color: "#a78bfa" },
              { step: "3", label: "Copy embed code", sub: "1 click",             icon: Code2,       color: "#34d399" },
              { step: "4", label: "Paste on site",   sub: "Any website",         icon: ExternalLink, color: "#60a5fa" },
            ].map((s, i) => (
              <div key={s.step} className="flex items-center gap-0">
                <div className="flex flex-col items-center px-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2" style={{ background: `${s.color}14`, border: `1px solid ${s.color}28` }}>
                    <s.icon className="w-4 h-4" style={{ color: s.color }} />
                  </div>
                  <p className="text-[11px] font-bold text-white">{s.label}</p>
                  <p className="text-[10px] text-zinc-600 mt-0.5">{s.sub}</p>
                </div>
                {i < 3 && <div className="w-4 h-px flex-shrink-0" style={{ background: `${GOLD}18` }} />}
              </div>
            ))}
          </div>
          <Button size="sm" style={{ background: GOLD, color: "#000" }} className="font-semibold gap-1.5 mt-8" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" /> Add your first video
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(v => (
            <VideoCard
              key={v.id}
              video={v}
              onClick={() => setSelectedVideo(v)}
              onDelete={id => deleteMut.mutate(id)}
            />
          ))}
        </div>
      )}

      {/* Add video dialog */}
      <AddVideoDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={created => {
          if (created?.id) setSelectedVideo(created);
        }}
      />
    </div>
  );
}
