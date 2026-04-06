import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import ClientLayout from "@/components/layout/ClientLayout";
import MindMap from "@/components/MindMap";
import type { MindMapData } from "@/components/MindMap";
import { useToast } from "@/hooks/use-toast";
import {
  Youtube, ArrowLeft, Search, Copy, CheckCircle, Loader2,
  Eye, ThumbsUp, Clock, Calendar, Lightbulb, BrainCircuit,
  AlignLeft, MessageSquare, Download, FileText
} from "lucide-react";

const GOLD = "#d4b461";

function extractVideoId(url: string): string | null {
  const m = url.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/);
  return m?.[1] || null;
}

function formatNum(n: any): string {
  if (!n) return "—";
  const num = parseInt(String(n).replace(/,/g, ""));
  if (isNaN(num)) return String(n);
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
  return String(num);
}

function parseBold(text: string): JSX.Element {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1
          ? <strong key={i} style={{ color: "#fff", fontWeight: 700 }}>{part}</strong>
          : part
      )}
    </>
  );
}

function parseBoldHTML(text: string): string {
  return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
}

function BulletItem({ text }: { text: string }) {
  const lines = text.split(/\n/);
  const mainLine = lines[0].trim();
  const subLines = lines.slice(1).filter(l => l.trim().match(/^[-•]/)).map(l => l.replace(/^[-•]\s*/, "").trim());
  return (
    <div style={{ marginBottom: subLines.length ? 12 : 7 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(255,255,255,0.4)", flexShrink: 0, marginTop: 9 }} />
        <span style={{ fontSize: 14, color: "rgba(255,255,255,0.74)", lineHeight: 1.68 }}>{parseBold(mainLine)}</span>
      </div>
      {subLines.length > 0 && (
        <div style={{ marginLeft: 24, marginTop: 7, display: "flex", flexDirection: "column", gap: 5 }}>
          {subLines.map((sub, j) => (
            <div key={j} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ fontSize: 12, color: GOLD, flexShrink: 0, marginTop: 1, userSelect: "none" }}>—</span>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.62 }}>{parseBold(sub)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── PDF Export ────────────────────────────────────────────────────────────────
function exportPDF(result: any) {
  const w = window.open("", "_blank");
  if (!w) return;

  const video = result.video || {};
  const escHtml = (str = "") => String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const bold = (str = "") => parseBoldHTML(String(str));

  const mbmBlocks = (result.minuteByMinute || []).map((seg: any) => {
    const bullets = (seg.bullets || []).map((b: string) => {
      const lines = b.split("\n");
      const main = bold(escHtml(lines[0]));
      const subs = lines.slice(1).filter((l: string) => l.trim().match(/^[-•]/))
        .map((l: string) => `<li>${bold(escHtml(l.replace(/^[-•]\s*/, "")))}</li>`).join("");
      return `<li>${main}${subs ? `<ul class="subs">${subs}</ul>` : ""}</li>`;
    }).join("");
    return `
      <div class="seg">
        <div class="ts">[${escHtml(seg.timestamp)}]</div>
        <div class="seg-title">${escHtml(seg.title)}</div>
        <ul class="bullets">${bullets}</ul>
      </div>`;
  }).join("");

  const tkHTML = (result.keyTakeaways || []).map((t: string, i: number) =>
    `<div class="kt"><span class="ktn">${i + 1}</span><span>${bold(escHtml(t))}</span></div>`
  ).join("");

  const scriptParas = (result.speakerScript || "").split("\n").filter(Boolean)
    .map((p: string) => `<p>${bold(escHtml(p))}</p>`).join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>${escHtml(video.title || "Video Analysis")} — Oravini</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Georgia, "Times New Roman", serif; background: #fff; color: #1a1a2e; }
  .cover { background: linear-gradient(135deg, #0a0e22 0%, #111630 100%); color: #fff; padding: 48px 56px; page-break-after: always; }
  .brand { font-size: 11px; font-family: Arial, sans-serif; font-weight: 800; letter-spacing: 0.18em; color: ${GOLD}; text-transform: uppercase; margin-bottom: 40px; }
  .cover h1 { font-size: 28px; font-weight: 700; line-height: 1.3; margin-bottom: 16px; color: #fff; }
  .meta-row { display: flex; gap: 24px; flex-wrap: wrap; margin-top: 16px; }
  .meta-pill { font-family: Arial, sans-serif; font-size: 11px; color: rgba(255,255,255,0.45); display: flex; gap: 5px; align-items: center; }
  .divider { border: none; border-top: 1px solid rgba(255,255,255,0.12); margin: 28px 0; }
  .summary-preview { font-family: Arial, sans-serif; font-size: 13px; color: rgba(255,255,255,0.6); line-height: 1.7; max-width: 680px; }
  .badge { display: inline-block; font-family: Arial, sans-serif; font-size: 10px; font-weight: 700; background: ${GOLD}22; border: 1px solid ${GOLD}55; color: ${GOLD}; border-radius: 4px; padding: 2px 8px; }
  .gen-date { font-family: Arial, sans-serif; font-size: 10px; color: rgba(255,255,255,0.28); margin-top: 32px; }
  .body { padding: 40px 56px; }
  h2 { font-size: 18px; font-weight: 700; color: #1a1a2e; margin: 40px 0 16px; padding-bottom: 10px; border-bottom: 2px solid #f0e8d4; display: flex; align-items: center; gap: 10px; font-family: Arial, sans-serif; }
  h2 .badge2 { font-size: 9px; background: ${GOLD}; color: #000; border-radius: 4px; padding: 2px 7px; font-weight: 800; }
  .summary p { font-size: 14px; line-height: 1.8; margin-bottom: 14px; color: #2a2a3e; }
  .kt { display: flex; gap: 14px; align-items: flex-start; margin-bottom: 12px; }
  .ktn { width: 26px; height: 26px; border-radius: 50%; background: ${GOLD}; color: #000; font-size: 11px; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-family: Arial, sans-serif; }
  .kt > span:last-child { font-size: 13px; line-height: 1.65; color: #2a2a3e; padding-top: 3px; }
  .seg { margin-bottom: 22px; padding: 16px 20px; border-left: 3px solid ${GOLD}; background: #fafaf6; border-radius: 0 8px 8px 0; page-break-inside: avoid; }
  .ts { font-family: "Courier New", monospace; font-size: 11px; font-weight: 800; color: ${GOLD}; background: ${GOLD}18; border: 1px solid ${GOLD}40; border-radius: 4px; display: inline-block; padding: 1px 8px; margin-bottom: 6px; }
  .seg-title { font-size: 16px; font-weight: 700; color: #1a1a2e; margin-bottom: 10px; font-family: Arial, sans-serif; }
  .bullets { padding-left: 18px; }
  .bullets > li { font-size: 13px; line-height: 1.68; color: #2a2a3e; margin-bottom: 6px; }
  .subs { padding-left: 16px; margin-top: 4px; list-style: none; }
  .subs li::before { content: "— "; color: ${GOLD}; font-weight: 700; }
  .subs li { font-size: 12px; color: #444; margin-bottom: 4px; }
  .script p { font-size: 13.5px; line-height: 1.8; color: #2a2a3e; margin-bottom: 14px; border-left: 2px solid #e8ddc8; padding-left: 14px; }
  .footer { font-family: Arial, sans-serif; font-size: 10px; color: #aaa; text-align: center; margin-top: 48px; padding-top: 16px; border-top: 1px solid #eee; }
  @media print {
    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    .cover { page-break-after: always; }
    .seg { page-break-inside: avoid; }
  }
</style>
</head>
<body>
<!-- COVER PAGE -->
<div class="cover">
  <div class="brand">⬡ Oravini AI — Content Analysis Report</div>
  <h1>${escHtml(video.title || "Video Analysis")}</h1>
  <div class="meta-row">
    ${video.channel ? `<div class="meta-pill">📺 ${escHtml(video.channel)}</div>` : ""}
    ${video.duration ? `<div class="meta-pill">⏱ ${escHtml(video.duration)}</div>` : ""}
    ${video.views ? `<div class="meta-pill">👁 ${formatNum(video.views)} views</div>` : ""}
    ${video.likes ? `<div class="meta-pill">👍 ${formatNum(video.likes)} likes</div>` : ""}
    ${video.uploadDate ? `<div class="meta-pill">📅 ${escHtml(video.uploadDate)}</div>` : ""}
  </div>
  <hr class="divider"/>
  ${result.overallSummary ? `<p class="summary-preview">${escHtml(result.overallSummary.split("\n")[0]?.slice(0, 280) || "")}…</p>` : ""}
  <div style="margin-top:24px;display:flex;gap:12px;flex-wrap:wrap;">
    ${result.hasTranscript ? `<span class="badge">✓ Real transcript · ${result.transcriptSegments} segments</span>` : `<span class="badge">⚠ Metadata analysis</span>`}
    ${result.minuteByMinute?.length ? `<span class="badge">${result.minuteByMinute.length} segments</span>` : ""}
    ${result.keyTakeaways?.length ? `<span class="badge">${result.keyTakeaways.length} key takeaways</span>` : ""}
  </div>
  <p class="gen-date">Generated ${new Date().toLocaleDateString("en-US", { year:"numeric", month:"long", day:"numeric", hour:"2-digit", minute:"2-digit" })} · Oravini AI Platform</p>
</div>

<!-- BODY -->
<div class="body">
  ${result.overallSummary ? `
    <h2>📋 Overview <span class="badge2">Summary</span></h2>
    <div class="summary">
      ${result.overallSummary.split("\n").filter(Boolean).map((p: string) => `<p>${bold(escHtml(p))}</p>`).join("")}
    </div>` : ""}

  ${tkHTML ? `
    <h2>💡 Key Takeaways <span class="badge2">${result.keyTakeaways?.length}</span></h2>
    ${tkHTML}` : ""}

  ${mbmBlocks ? `
    <h2>🕐 Minute-by-Minute Breakdown <span class="badge2">${result.minuteByMinute?.length} segments</span></h2>
    ${mbmBlocks}` : ""}

  ${scriptParas ? `
    <h2>🎙 Speaker Script</h2>
    <div class="script">${scriptParas}</div>` : ""}

  <div class="footer">
    Generated by Oravini AI · oravini_ai · Analysis powered by Groq AI
  </div>
</div>
<script>window.onload = function() { setTimeout(function() { window.print(); }, 600); };</script>
</body>
</html>`;

  w.document.open();
  w.document.write(html);
  w.document.close();
}

// ── Loading Phases ────────────────────────────────────────────────────────────
const PHASES = [
  { label: "Fetching video metadata", sub: "Getting title, views, channel info", icon: "🎬" },
  { label: "Extracting full transcript", sub: "Pulling captions segment by segment", icon: "📝" },
  { label: "AI deep-scan in progress", sub: "Analysing every 90-second block", icon: "🧠" },
  { label: "Building mind map", sub: "Structuring themes and connections", icon: "🗺️" },
];

// ── Main Component ────────────────────────────────────────────────────────────
export default function ContentAnalyserYouTube() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [url, setUrl] = useState("");
  const [activeTab, setActiveTab] = useState<"summary" | "transcript" | "mindmap">("summary");
  const [copied, setCopied] = useState<string | null>(null);
  const [loadingPhase, setLoadingPhase] = useState(0);
  const [previewThumbnail, setPreviewThumbnail] = useState<string | null>(null);

  const analyseMutation = useMutation({
    mutationFn: (u: string) => apiRequest("POST", "/api/analyse/youtube", { url: u }),
    onError: (err: any) => {
      toast({ title: "Analysis failed", description: err.message || "Check the URL and try again.", variant: "destructive" });
    },
  });

  const result = analyseMutation.data as any;
  const loading = analyseMutation.isPending;

  useEffect(() => {
    if (!loading) { setLoadingPhase(0); return; }
    setLoadingPhase(0);
    const t1 = setTimeout(() => setLoadingPhase(1), 4000);
    const t2 = setTimeout(() => setLoadingPhase(2), 12000);
    const t3 = setTimeout(() => setLoadingPhase(3), 28000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [loading]);

  const handleAnalyse = () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    const vid = extractVideoId(trimmed);
    setPreviewThumbnail(vid ? `https://img.youtube.com/vi/${vid}/hqdefault.jpg` : null);
    analyseMutation.mutate(trimmed);
    setActiveTab("summary");
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const CopyBtn = ({ text, k }: { text: string; k: string }) => (
    <button onClick={() => handleCopy(text, k)} data-testid={`btn-copy-${k}`}
      style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 7, cursor: "pointer", fontSize: 11.5, color: copied === k ? "#4ade80" : "rgba(255,255,255,0.4)", fontFamily: "inherit", flexShrink: 0, transition: "all 0.15s" }}>
      {copied === k ? <CheckCircle style={{ width: 11, height: 11 }} /> : <Copy style={{ width: 11, height: 11 }} />}
      {copied === k ? "Copied!" : "Copy"}
    </button>
  );

  return (
    <ClientLayout>
      <div style={{ minHeight: "calc(100vh - 64px)", background: "#050505", padding: "28px 20px 60px", maxWidth: 940, margin: "0 auto" }}>

        {/* Back + Header */}
        <div style={{ marginBottom: 26 }}>
          <button onClick={() => navigate("/content-analyser")} data-testid="btn-back-yt"
            style={{ display: "flex", alignItems: "center", gap: 5, color: "rgba(255,255,255,0.26)", fontSize: 12, background: "none", border: "none", cursor: "pointer", marginBottom: 18, padding: 0, fontFamily: "inherit", transition: "color 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.color = GOLD; }} onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.26)"; }}>
            <ArrowLeft style={{ width: 13, height: 13 }} /> Content Analyser
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
            <div style={{ width: 44, height: 44, borderRadius: 13, background: "rgba(255,0,0,0.08)", border: "1px solid rgba(255,0,0,0.16)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Youtube style={{ width: 21, height: 21, color: "#ff4444" }} />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 900, color: "#fff", margin: 0, letterSpacing: "-0.025em" }}>YouTube Analyser</h1>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.28)", margin: 0 }}>Deep transcript scan · Minute-by-minute · Mind map · 2 credits</p>
            </div>
          </div>
        </div>

        {/* URL Input */}
        <div style={{ background: "rgba(255,255,255,0.022)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "18px 20px", marginBottom: 22 }}>
          <p style={{ fontSize: 10.5, fontWeight: 800, color: "rgba(255,255,255,0.28)", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 10px" }}>Video URL</p>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={url} onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAnalyse()}
              placeholder="https://www.youtube.com/watch?v=..."
              data-testid="input-youtube-url"
              style={{ flex: 1, background: "rgba(255,255,255,0.055)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 9, padding: "11px 15px", color: "#fff", fontSize: 14, outline: "none", fontFamily: "inherit" }}
              onFocus={e => { e.target.style.borderColor = `${GOLD}50`; }} onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.09)"; }}
            />
            <button onClick={handleAnalyse} disabled={loading || !url.trim()} data-testid="btn-analyse-youtube"
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "11px 22px", background: url.trim() && !loading ? GOLD : "rgba(255,255,255,0.05)", color: url.trim() && !loading ? "#000" : "rgba(255,255,255,0.22)", border: "none", borderRadius: 9, cursor: url.trim() && !loading ? "pointer" : "not-allowed", fontWeight: 800, fontSize: 14, fontFamily: "inherit", transition: "all 0.15s", whiteSpace: "nowrap", flexShrink: 0 }}>
              {loading ? <Loader2 style={{ width: 15, height: 15, animation: "spin 1s linear infinite" }} /> : <Search style={{ width: 15, height: 15 }} />}
              {loading ? "Analysing…" : "Analyse"}
            </button>
          </div>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.18)", margin: "9px 0 0" }}>Works with YouTube, Shorts, and youtu.be links · Deep scan using real captions</p>
        </div>

        {/* ── LOADING ── */}
        {loading && (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            {previewThumbnail && (
              <div style={{ position: "relative", width: "100%", maxWidth: 500, margin: "0 auto 32px", borderRadius: 16, overflow: "hidden", boxShadow: `0 0 60px ${GOLD}14` }}>
                <img src={previewThumbnail} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                  style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", display: "block", filter: "brightness(0.7)" }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.6))" }} />
                {/* Scan line */}
                <div style={{ position: "absolute", left: 0, right: 0, height: "2px", background: `linear-gradient(90deg, transparent 0%, ${GOLD} 50%, transparent 100%)`, animation: "scanLine 1.8s ease-in-out infinite" }} />
                {/* Corner brackets */}
                {[[{top:"12px"},{left:"12px"},"borderTop","borderLeft"],[{top:"12px"},{right:"12px"},"borderTop","borderRight"],[{bottom:"12px"},{left:"12px"},"borderBottom","borderLeft"],[{bottom:"12px"},{right:"12px"},"borderBottom","borderRight"]].map((pos, ci) => (
                  <div key={ci} style={{ position:"absolute", ...pos[0] as any, ...pos[1] as any, width:22, height:22, [pos[2] as string]:`2px solid ${GOLD}`, [pos[3] as string]:`2px solid ${GOLD}` }} />
                ))}
                {/* Center indicator */}
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", border: `2px solid ${GOLD}`, borderTopColor: "transparent", animation: "spin 1s linear infinite" }} />
                  <p style={{ fontSize: 10, color: GOLD, fontWeight: 800, letterSpacing: "0.14em", margin: 0 }}>SCANNING</p>
                </div>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: 420, margin: "0 auto" }}>
              {PHASES.map((phase, idx) => {
                const done = idx < loadingPhase;
                const active = idx === loadingPhase;
                return (
                  <div key={idx} style={{ display: "flex", alignItems: "center", gap: 13, padding: "11px 18px", borderRadius: 11, background: active ? `${GOLD}0d` : done ? "rgba(74,222,128,0.05)" : "rgba(255,255,255,0.02)", border: `1px solid ${active ? GOLD + "28" : done ? "rgba(74,222,128,0.15)" : "rgba(255,255,255,0.05)"}`, transition: "all 0.4s ease" }}>
                    <span style={{ fontSize: 18 }}>{phase.icon}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: 13, color: done ? "#4ade80" : active ? "#fff" : "rgba(255,255,255,0.26)", fontWeight: active ? 700 : done ? 600 : 400 }}>{phase.label}</p>
                      {active && <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>{phase.sub}</p>}
                    </div>
                    {done && <CheckCircle style={{ width: 15, height: 15, color: "#4ade80", flexShrink: 0 }} />}
                    {active && <Loader2 style={{ width: 13, height: 13, color: GOLD, flexShrink: 0, animation: "spin 1s linear infinite" }} />}
                  </div>
                );
              })}
            </div>
            <p style={{ textAlign: "center", fontSize: 11.5, color: "rgba(255,255,255,0.16)", marginTop: 18 }}>
              Deep scan takes 35–60 seconds · Every transcript segment is analysed
            </p>
          </div>
        )}

        {/* ── RESULTS ── */}
        {result && !loading && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>

            {/* Video card */}
            {result.video && (
              <div style={{ background: "rgba(255,255,255,0.022)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "18px 20px", marginBottom: 18, display: "flex", gap: 18, flexWrap: "wrap" }}>
                {result.video.thumbnail && (
                  <div style={{ flexShrink: 0, borderRadius: 10, overflow: "hidden", width: 210 }}>
                    <img src={result.video.thumbnail} alt="" style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", display: "block" }} />
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 10 }}>
                  <div>
                    <h2 style={{ fontSize: 17, fontWeight: 800, color: "#fff", margin: "0 0 4px", lineHeight: 1.3 }}>{result.video.title}</h2>
                    <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.36)", margin: 0 }}>{result.video.channel}</p>
                  </div>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    {result.video.views && <StatBadge icon={<Eye style={{ width: 11, height: 11 }} />} val={formatNum(result.video.views) + " views"} />}
                    {result.video.likes && <StatBadge icon={<ThumbsUp style={{ width: 11, height: 11 }} />} val={formatNum(result.video.likes)} />}
                    {result.video.duration && <StatBadge icon={<Clock style={{ width: 11, height: 11 }} />} val={result.video.duration} />}
                    {result.video.uploadDate && <StatBadge icon={<Calendar style={{ width: 11, height: 11 }} />} val={result.video.uploadDate} />}
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    {result.hasTranscript
                      ? <span style={{ fontSize: 10.5, fontWeight: 700, color: "#4ade80", background: "rgba(74,222,128,0.07)", border: "1px solid rgba(74,222,128,0.18)", borderRadius: 20, padding: "3px 10px" }}>✓ Real transcript · {result.transcriptSegments} segments</span>
                      : <span style={{ fontSize: 10.5, color: "rgba(255,255,255,0.28)", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, padding: "3px 10px" }}>⚠ No captions — metadata analysis</span>
                    }
                    {/* PDF Export */}
                    <button onClick={() => exportPDF(result)} data-testid="btn-export-pdf"
                      style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 13px", background: "rgba(212,180,97,0.1)", border: `1px solid ${GOLD}30`, borderRadius: 20, cursor: "pointer", fontSize: 10.5, fontWeight: 700, color: GOLD, fontFamily: "inherit", transition: "all 0.15s", marginLeft: "auto" }}
                      onMouseEnter={e => { e.currentTarget.style.background = `${GOLD}20`; }} onMouseLeave={e => { e.currentTarget.style.background = "rgba(212,180,97,0.1)"; }}>
                      <Download style={{ width: 11, height: 11 }} /> Export PDF
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Key Takeaways */}
            {result.keyTakeaways?.length > 0 && (
              <div style={{ background: `${GOLD}07`, border: `1px solid ${GOLD}1c`, borderRadius: 14, padding: "18px 22px", marginBottom: 18 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 15 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Lightbulb style={{ width: 15, height: 15, color: GOLD }} />
                    <span style={{ fontSize: 11, fontWeight: 800, color: GOLD, textTransform: "uppercase", letterSpacing: "0.1em" }}>Key Takeaways</span>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.06)", borderRadius: 20, padding: "1px 7px" }}>{result.keyTakeaways.length}</span>
                  </div>
                  <CopyBtn text={result.keyTakeaways.join("\n")} k="yt-kt" />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {result.keyTakeaways.map((t: string, i: number) => (
                    <div key={i} style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
                      <span style={{ width: 22, height: 22, borderRadius: "50%", background: `${GOLD}14`, border: `1px solid ${GOLD}32`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9.5, fontWeight: 900, color: GOLD, flexShrink: 0, marginTop: 2 }}>{i + 1}</span>
                      <span style={{ fontSize: 13.5, color: "rgba(255,255,255,0.74)", lineHeight: 1.65 }}>{parseBold(t)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tabs */}
            <div style={{ display: "flex", gap: 4, marginBottom: 14, flexWrap: "wrap" }}>
              {([
                { id: "summary",    label: "Breakdown",      icon: <AlignLeft style={{ width: 13, height: 13 }} />,  count: result.minuteByMinute?.length },
                { id: "transcript", label: "Speaker Script",  icon: <MessageSquare style={{ width: 13, height: 13 }} /> },
                { id: "mindmap",    label: "Mind Map",        icon: <BrainCircuit style={{ width: 13, height: 13 }} /> },
              ] as const).map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} data-testid={`tab-yt-${tab.id}`}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit", transition: "all 0.15s", background: activeTab === tab.id ? GOLD : "rgba(255,255,255,0.04)", color: activeTab === tab.id ? "#000" : "rgba(255,255,255,0.4)" }}>
                  {tab.icon} {tab.label}
                  {"count" in tab && tab.count ? <span style={{ fontSize: 10, background: activeTab === tab.id ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.08)", borderRadius: 20, padding: "1px 6px", marginLeft: 2 }}>{tab.count}</span> : null}
                </button>
              ))}
            </div>

            {/* Tab panel */}
            <div style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.055)", borderRadius: 14, padding: "26px 28px", minHeight: 400 }}>

              {/* ─── BREAKDOWN ─── */}
              {activeTab === "summary" && (
                <div>
                  {result.overallSummary && (
                    <div style={{ marginBottom: 28 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                        <span style={{ fontSize: 10.5, fontWeight: 800, color: "rgba(255,255,255,0.28)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Overview</span>
                        <CopyBtn text={result.overallSummary} k="yt-summary" />
                      </div>
                      {result.overallSummary.split("\n").filter(Boolean).map((p: string, i: number) => (
                        <p key={i} style={{ fontSize: 14, color: "rgba(255,255,255,0.68)", lineHeight: 1.78, margin: "0 0 14px" }}>{parseBold(p)}</p>
                      ))}
                    </div>
                  )}

                  {result.minuteByMinute?.length > 0 && (
                    <>
                      <div style={{ borderTop: "1px solid rgba(255,255,255,0.055)", marginBottom: 24 }} />
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
                        <div>
                          <span style={{ fontSize: 10.5, fontWeight: 800, color: "rgba(255,255,255,0.28)", textTransform: "uppercase", letterSpacing: "0.1em", display: "block" }}>Minute-by-Minute Breakdown</span>
                          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.18)" }}>{result.minuteByMinute.length} segments covering the full video</span>
                        </div>
                        <CopyBtn text={result.minuteByMinute.map((s: any) => `[${s.timestamp}] ${s.title}\n${(s.bullets||[]).join("\n")}`).join("\n\n")} k="yt-mbm" />
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                        {result.minuteByMinute.map((seg: any, i: number) => (
                          <div key={i} data-testid={`mbm-section-${i}`}
                            style={{ borderLeft: `2px solid ${GOLD}30`, paddingLeft: 20, paddingBottom: 28, marginLeft: 4, position: "relative" }}>
                            {/* Timeline dot */}
                            <div style={{ position: "absolute", left: -5, top: 4, width: 10, height: 10, borderRadius: "50%", background: GOLD, border: "2px solid #050505" }} />
                            {/* Timestamp */}
                            <div style={{ marginBottom: 6 }}>
                              <span style={{ fontSize: 11, fontWeight: 800, color: GOLD, background: `${GOLD}14`, border: `1px solid ${GOLD}28`, borderRadius: 6, padding: "2px 9px", fontFamily: "monospace", letterSpacing: "0.06em" }}>
                                [{seg.timestamp || `${String(Math.floor(i * 1.5)).padStart(2, "0")}:00`}]
                              </span>
                            </div>
                            {/* Title */}
                            <h3 style={{ fontSize: 16, fontWeight: 800, color: "#fff", margin: "0 0 12px", lineHeight: 1.3 }}>{seg.title}</h3>
                            {/* Bullets */}
                            <div style={{ paddingLeft: 2 }}>
                              {(seg.bullets || []).map((bullet: string, j: number) => (
                                <BulletItem key={j} text={bullet} />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ─── SPEAKER SCRIPT ─── */}
              {activeTab === "transcript" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
                    <div>
                      <span style={{ fontSize: 10.5, fontWeight: 800, color: "rgba(255,255,255,0.28)", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 3 }}>Speaker Script</span>
                      <span style={{ fontSize: 11.5, color: "rgba(255,255,255,0.22)" }}>
                        {result.hasTranscript ? "Reconstructed word-for-word from real transcript" : "AI-generated from video metadata and description"}
                      </span>
                    </div>
                    {result.speakerScript && <CopyBtn text={result.speakerScript} k="yt-script" />}
                  </div>
                  {result.speakerScript ? (
                    <div style={{ maxHeight: 600, overflowY: "auto", paddingRight: 8 }}>
                      {result.speakerScript.split("\n").filter(Boolean).map((para: string, i: number) => (
                        <p key={i} style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", lineHeight: 1.82, margin: "0 0 18px", borderLeft: `3px solid ${GOLD}20`, paddingLeft: 16 }}>{parseBold(para)}</p>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 13, textAlign: "center", padding: "40px 0" }}>No script available for this video.</p>
                  )}
                </div>
              )}

              {/* ─── MIND MAP ─── */}
              {activeTab === "mindmap" && (
                <div>
                  {result.mindmap ? (
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
                        <div>
                          <span style={{ fontSize: 10.5, fontWeight: 800, color: "rgba(255,255,255,0.28)", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 3 }}>Mind Map</span>
                          <span style={{ fontSize: 11.5, color: "rgba(255,255,255,0.2)" }}>
                            {result.mindmap.branches?.length} branches · Visual concept map
                          </span>
                        </div>
                        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                          <LegendDot color={GOLD} label="Center topic" size={11} />
                          <LegendDot color="#4A7CF7" label="Branch" size={8} />
                          <LegendDot color="rgba(255,255,255,0.4)" label="Node" size={6} />
                        </div>
                      </div>
                      <MindMap data={result.mindmap as MindMapData} />
                    </>
                  ) : (
                    <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 13, textAlign: "center", padding: "40px 0" }}>Mind map not available for this analysis.</p>
                  )}
                </div>
              )}
            </div>

            {/* Bottom export bar */}
            <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => exportPDF(result)} data-testid="btn-export-pdf-bottom"
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", background: "rgba(212,180,97,0.08)", border: `1px solid ${GOLD}25`, borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 700, color: GOLD, fontFamily: "inherit", transition: "all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.background = `${GOLD}18`; }} onMouseLeave={e => { e.currentTarget.style.background = "rgba(212,180,97,0.08)"; }}>
                <FileText style={{ width: 14, height: 14 }} /> Export Full Analysis as PDF
              </button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!result && !loading && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "90px 0", color: "rgba(255,255,255,0.1)", gap: 12, textAlign: "center" }}>
            <Youtube style={{ width: 48, height: 48 }} />
            <p style={{ fontSize: 15, margin: 0, fontWeight: 600 }}>Paste a YouTube URL above and click Analyse</p>
            <p style={{ fontSize: 12, margin: 0, color: "rgba(255,255,255,0.07)" }}>The AI will scan every 90 seconds of the video in detail</p>
          </div>
        )}

        <style>{`
          @keyframes fadeIn  { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }
          @keyframes spin    { to   { transform:rotate(360deg) } }
          @keyframes scanLine { 0% { top:0% } 100% { top:100% } }
        `}</style>
      </div>
    </ClientLayout>
  );
}

function StatBadge({ icon, val }: { icon: React.ReactNode; val: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "rgba(255,255,255,0.36)" }}>
      {icon} {val}
    </div>
  );
}

function LegendDot({ color, label, size }: { color: string; label: string; size: number }) {
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      <div style={{ width: size, height: size, borderRadius: "50%", background: color, flexShrink: 0 }} />
      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.26)" }}>{label}</span>
    </div>
  );
}
