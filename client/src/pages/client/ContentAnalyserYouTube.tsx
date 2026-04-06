import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import ClientLayout from "@/components/layout/ClientLayout";
import MindMap from "@/components/MindMap";
import { useToast } from "@/hooks/use-toast";
import {
  Youtube, ArrowLeft, Search, Copy, CheckCircle, Loader2,
  Eye, ThumbsUp, Clock, Calendar, Lightbulb, BrainCircuit,
  AlignLeft, MessageSquare
} from "lucide-react";

const GOLD = "#d4b461";

function extractVideoId(url: string): string | null {
  const m = url.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/);
  return m?.[1] || null;
}

function formatNum(n: any): string {
  if (!n) return "—";
  const num = parseInt(n);
  if (isNaN(num)) return String(n);
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
  return String(num);
}

// Parse **bold** markdown in text
function parseBold(text: string) {
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

// Render a bullet that may have nested sub-bullets (separated by \n-)
function BulletItem({ text }: { text: string }) {
  const lines = text.split(/\n/);
  const mainLine = lines[0];
  const subLines = lines.slice(1).filter(l => l.trim().startsWith("-")).map(l => l.replace(/^-\s*/, "").trim());

  return (
    <div style={{ marginBottom: subLines.length ? 10 : 6 }}>
      <div style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
        <span style={{ width: 5, height: 5, borderRadius: "50%", background: "rgba(255,255,255,0.45)", flexShrink: 0, marginTop: 8 }} />
        <span style={{ fontSize: 13.5, color: "rgba(255,255,255,0.72)", lineHeight: 1.65 }}>{parseBold(mainLine)}</span>
      </div>
      {subLines.length > 0 && (
        <div style={{ marginLeft: 22, marginTop: 5, display: "flex", flexDirection: "column", gap: 4 }}>
          {subLines.map((sub, j) => (
            <div key={j} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <span style={{ fontSize: 11, color: GOLD, flexShrink: 0, marginTop: 3 }}>—</span>
              <span style={{ fontSize: 12.5, color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>{parseBold(sub)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const PHASES = [
  { label: "Fetching video metadata", icon: "🎬" },
  { label: "Extracting transcript", icon: "📝" },
  { label: "Running AI analysis", icon: "🧠" },
  { label: "Building mind map", icon: "🗺️" },
];

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
    const t1 = setTimeout(() => setLoadingPhase(1), 3500);
    const t2 = setTimeout(() => setLoadingPhase(2), 10000);
    const t3 = setTimeout(() => setLoadingPhase(3), 24000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [loading]);

  const handleAnalyse = () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    const vid = extractVideoId(trimmed);
    if (vid) setPreviewThumbnail(`https://img.youtube.com/vi/${vid}/hqdefault.jpg`);
    else setPreviewThumbnail(null);
    analyseMutation.mutate(trimmed);
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const CopyBtn = ({ text, k }: { text: string; k: string }) => (
    <button onClick={() => handleCopy(text, k)} data-testid={`btn-copy-${k}`}
      style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 11px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, cursor: "pointer", fontSize: 12, color: copied === k ? "#4ade80" : "rgba(255,255,255,0.45)", fontFamily: "inherit", flexShrink: 0 }}>
      {copied === k ? <CheckCircle style={{ width: 11, height: 11 }} /> : <Copy style={{ width: 11, height: 11 }} />}
      {copied === k ? "Copied" : "Copy"}
    </button>
  );

  return (
    <ClientLayout>
      <div style={{ minHeight: "calc(100vh - 64px)", background: "#060606", padding: "28px 20px", maxWidth: 900, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 26 }}>
          <button onClick={() => navigate("/content-analyser")} data-testid="btn-back-yt"
            style={{ display: "flex", alignItems: "center", gap: 5, color: "rgba(255,255,255,0.28)", fontSize: 12, background: "none", border: "none", cursor: "pointer", marginBottom: 16, padding: 0, fontFamily: "inherit" }}
            onMouseEnter={e => { e.currentTarget.style.color = GOLD; }} onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.28)"; }}
          >
            <ArrowLeft style={{ width: 13, height: 13 }} /> Content Analyser
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(255,0,0,0.1)", border: "1px solid rgba(255,0,0,0.18)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Youtube style={{ width: 20, height: 20, color: "#ff4444" }} />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 900, color: "#fff", margin: 0, letterSpacing: "-0.02em" }}>YouTube Analyser</h1>
              <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.3)", margin: 0 }}>Transcript · Minute-by-minute · Mind map · 2 credits</p>
            </div>
          </div>
        </div>

        {/* URL Input */}
        <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "18px 20px", marginBottom: 22 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 10px" }}>Video URL</p>
          <div style={{ display: "flex", gap: 9 }}>
            <input value={url} onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAnalyse()}
              placeholder="https://www.youtube.com/watch?v=..."
              data-testid="input-youtube-url"
              style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 9, padding: "11px 15px", color: "#fff", fontSize: 14, outline: "none", fontFamily: "inherit" }}
              onFocus={e => { e.target.style.borderColor = `${GOLD}55`; }} onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; }}
            />
            <button onClick={handleAnalyse} disabled={loading || !url.trim()} data-testid="btn-analyse-youtube"
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "11px 22px", background: url.trim() && !loading ? GOLD : "rgba(255,255,255,0.06)", color: url.trim() && !loading ? "#000" : "rgba(255,255,255,0.25)", border: "none", borderRadius: 9, cursor: url.trim() && !loading ? "pointer" : "not-allowed", fontWeight: 800, fontSize: 14, fontFamily: "inherit", transition: "all 0.15s", whiteSpace: "nowrap" }}>
              {loading ? <Loader2 style={{ width: 15, height: 15, animation: "spin 1s linear infinite" }} /> : <Search style={{ width: 15, height: 15 }} />}
              {loading ? "Analysing…" : "Analyse"}
            </button>
          </div>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", margin: "9px 0 0" }}>Works with YouTube, YouTube Shorts, and youtu.be links</p>
        </div>

        {/* ── LOADING STATE ── */}
        {loading && (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            {previewThumbnail && (
              <div style={{ position: "relative", width: "100%", maxWidth: 480, margin: "0 auto 30px", borderRadius: 14, overflow: "hidden", boxShadow: `0 0 50px ${GOLD}18` }}>
                <img src={previewThumbnail} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                  style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", display: "block" }} />
                <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} />
                {/* Animated scan line */}
                <div style={{ position: "absolute", left: 0, right: 0, height: "2px", background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`, animation: "scanLine 1.8s ease-in-out infinite" }} />
                {/* Corner brackets */}
                {[["top:10px","left:10px","borderTop","borderLeft"],["top:10px","right:10px","borderTop","borderRight"],["bottom:10px","left:10px","borderBottom","borderLeft"],["bottom:10px","right:10px","borderBottom","borderRight"]].map((corners, ci) => (
                  <div key={ci} style={{ position: "absolute", ...Object.fromEntries(corners.slice(0, 2).map(c => { const [k,v] = c.split(":"); return [k, v]; })), width: 20, height: 20, [corners[2]]: `2px solid ${GOLD}`, [corners[3]]: `2px solid ${GOLD}` }} />
                ))}
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ width: 38, height: 38, borderRadius: "50%", border: `2px solid ${GOLD}`, borderTopColor: "transparent", animation: "spin 1s linear infinite", margin: "0 auto 10px" }} />
                    <p style={{ fontSize: 11, color: GOLD, fontWeight: 800, letterSpacing: "0.12em", margin: 0 }}>SCANNING</p>
                  </div>
                </div>
              </div>
            )}

            {/* Phases */}
            <div style={{ display: "flex", flexDirection: "column", gap: 7, maxWidth: 380, margin: "0 auto" }}>
              {PHASES.map((phase, idx) => {
                const done = idx < loadingPhase;
                const active = idx === loadingPhase;
                return (
                  <div key={idx} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderRadius: 10, background: active ? `${GOLD}10` : "rgba(255,255,255,0.025)", border: `1px solid ${active ? GOLD + "30" : "rgba(255,255,255,0.06)"}`, transition: "all 0.3s ease" }}>
                    <span style={{ fontSize: 16 }}>{phase.icon}</span>
                    <span style={{ flex: 1, fontSize: 13, color: done ? "#4ade80" : active ? "#fff" : "rgba(255,255,255,0.28)", fontWeight: active ? 700 : 400 }}>{phase.label}</span>
                    {done && <CheckCircle style={{ width: 14, height: 14, color: "#4ade80" }} />}
                    {active && <Loader2 style={{ width: 13, height: 13, color: GOLD, animation: "spin 1s linear infinite" }} />}
                  </div>
                );
              })}
            </div>
            <p style={{ textAlign: "center", fontSize: 11.5, color: "rgba(255,255,255,0.18)", marginTop: 18 }}>Analysis takes 25–45 seconds for longer videos</p>
          </div>
        )}

        {/* ── RESULTS ── */}
        {result && !loading && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>

            {/* Video card */}
            {result.video && (
              <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "18px 20px", marginBottom: 18, display: "flex", gap: 18, flexWrap: "wrap", alignItems: "flex-start" }}>
                {result.video.thumbnail && (
                  <div style={{ flexShrink: 0, borderRadius: 10, overflow: "hidden", width: 200 }}>
                    <img src={result.video.thumbnail} alt="" style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", display: "block" }} />
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 800, color: "#fff", margin: "0 0 4px", lineHeight: 1.35 }}>{result.video.title}</h2>
                  <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.38)", margin: "0 0 12px" }}>{result.video.channel}</p>
                  <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 12 }}>
                    {result.video.views && <StatPill icon={<Eye style={{ width: 11, height: 11 }} />} val={formatNum(result.video.views) + " views"} />}
                    {result.video.likes && <StatPill icon={<ThumbsUp style={{ width: 11, height: 11 }} />} val={formatNum(result.video.likes)} />}
                    {result.video.duration && <StatPill icon={<Clock style={{ width: 11, height: 11 }} />} val={result.video.duration} />}
                    {result.video.uploadDate && <StatPill icon={<Calendar style={{ width: 11, height: 11 }} />} val={result.video.uploadDate} />}
                  </div>
                  {result.hasTranscript
                    ? <span style={{ fontSize: 10.5, fontWeight: 700, color: "#4ade80", background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.18)", borderRadius: 20, padding: "3px 10px" }}>✓ Real transcript extracted ({result.transcriptSegments} segments)</span>
                    : <span style={{ fontSize: 10.5, color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "3px 10px" }}>⚠ No captions available — analysis from metadata</span>
                  }
                </div>
              </div>
            )}

            {/* Key takeaways */}
            {result.keyTakeaways?.length > 0 && (
              <div style={{ background: `${GOLD}08`, border: `1px solid ${GOLD}20`, borderRadius: 13, padding: "16px 20px", marginBottom: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 14 }}>
                  <Lightbulb style={{ width: 14, height: 14, color: GOLD }} />
                  <span style={{ fontSize: 11, fontWeight: 800, color: GOLD, textTransform: "uppercase", letterSpacing: "0.1em" }}>Key Takeaways</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                  {result.keyTakeaways.map((t: string, i: number) => (
                    <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <span style={{ width: 22, height: 22, borderRadius: "50%", background: `${GOLD}15`, border: `1px solid ${GOLD}35`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9.5, fontWeight: 900, color: GOLD, flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
                      <span style={{ fontSize: 13.5, color: "rgba(255,255,255,0.72)", lineHeight: 1.62 }}>{parseBold(t)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tabs */}
            <div style={{ display: "flex", gap: 4, marginBottom: 14, flexWrap: "wrap" }}>
              {([
                { id: "summary",    label: "Breakdown",     icon: <AlignLeft style={{ width: 13, height: 13 }} /> },
                { id: "transcript", label: "Speaker Script", icon: <MessageSquare style={{ width: 13, height: 13 }} /> },
                { id: "mindmap",    label: "Mind Map",       icon: <BrainCircuit style={{ width: 13, height: 13 }} /> },
              ] as const).map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} data-testid={`tab-yt-${tab.id}`}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit", transition: "all 0.15s", background: activeTab === tab.id ? GOLD : "rgba(255,255,255,0.045)", color: activeTab === tab.id ? "#000" : "rgba(255,255,255,0.42)" }}>
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            {/* Tab panel */}
            <div style={{ background: "rgba(255,255,255,0.018)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "24px 26px", minHeight: 350 }}>

              {/* ─── BREAKDOWN (minute-by-minute) ─── */}
              {activeTab === "summary" && (
                <div>
                  {/* Overall summary */}
                  {result.overallSummary && (
                    <div style={{ marginBottom: 28 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.28)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Overview</span>
                        <CopyBtn text={result.overallSummary} k="yt-summary" />
                      </div>
                      {result.overallSummary.split("\n").filter(Boolean).map((p: string, i: number) => (
                        <p key={i} style={{ fontSize: 13.5, color: "rgba(255,255,255,0.68)", lineHeight: 1.76, margin: "0 0 13px" }}>{parseBold(p)}</p>
                      ))}
                    </div>
                  )}

                  {/* Divider */}
                  {result.minuteByMinute?.length > 0 && (
                    <>
                      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", marginBottom: 24 }} />
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.28)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Minute-by-Minute Breakdown</span>
                        <CopyBtn text={result.minuteByMinute.map((s: any) => `[${s.timestamp}] ${s.title}\n${(s.bullets||[]).join("\n")}`).join("\n\n")} k="yt-mbm" />
                      </div>

                      {/* Segments — always expanded, notegpt style */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
                        {result.minuteByMinute.map((seg: any, i: number) => (
                          <div key={i} data-testid={`mbm-section-${i}`}>
                            {/* Timestamp badge */}
                            <div style={{ display: "inline-block", marginBottom: 6 }}>
                              <span style={{ fontSize: 11.5, fontWeight: 800, color: GOLD, background: `${GOLD}15`, border: `1px solid ${GOLD}28`, borderRadius: 6, padding: "3px 10px", fontFamily: "monospace", letterSpacing: "0.05em" }}>
                                [{seg.timestamp || `${String(i * 2).padStart(2, "0")}:00`}]
                              </span>
                            </div>
                            {/* Section title */}
                            <h3 style={{ fontSize: 15, fontWeight: 800, color: "#fff", margin: "0 0 10px", lineHeight: 1.3 }}>{seg.title}</h3>
                            {/* Bullets */}
                            <div style={{ paddingLeft: 4 }}>
                              {(seg.bullets || []).map((bullet: string, j: number) => (
                                <BulletItem key={j} text={bullet} />
                              ))}
                            </div>
                            {/* Segment separator */}
                            {i < result.minuteByMinute.length - 1 && (
                              <div style={{ borderBottom: "1px dashed rgba(255,255,255,0.06)", marginTop: 18 }} />
                            )}
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
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.28)", textTransform: "uppercase", letterSpacing: "0.1em", display: "block" }}>Speaker Script</span>
                      <span style={{ fontSize: 11.5, color: "rgba(255,255,255,0.2)" }}>
                        {result.hasTranscript ? "Reconstructed from real transcript" : "AI-generated from video metadata"}
                      </span>
                    </div>
                    {result.speakerScript && <CopyBtn text={result.speakerScript} k="yt-script" />}
                  </div>
                  {result.speakerScript ? (
                    <div style={{ maxHeight: 560, overflowY: "auto", paddingRight: 8 }}>
                      {result.speakerScript.split("\n").filter(Boolean).map((para: string, i: number) => (
                        <p key={i} style={{ fontSize: 14, color: "rgba(255,255,255,0.68)", lineHeight: 1.8, margin: "0 0 16px", borderLeft: `2px solid ${GOLD}22`, paddingLeft: 14 }}>{parseBold(para)}</p>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: "rgba(255,255,255,0.28)", fontSize: 13 }}>No script available.</p>
                  )}
                </div>
              )}

              {/* ─── MIND MAP ─── */}
              {activeTab === "mindmap" && result.mindmap && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.28)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Mind Map</span>
                    <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                      <Legend dot={GOLD} label="Center topic" />
                      <Legend dot="#4A7CF7" label="Branch" />
                      <Legend dot="rgba(255,255,255,0.4)" small label="Node" />
                    </div>
                  </div>
                  <MindMap data={result.mindmap} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!result && !loading && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 0", color: "rgba(255,255,255,0.1)", gap: 12, textAlign: "center" }}>
            <Youtube style={{ width: 44, height: 44 }} />
            <p style={{ fontSize: 14, margin: 0 }}>Paste a YouTube URL above and click Analyse</p>
            <p style={{ fontSize: 12, margin: 0, color: "rgba(255,255,255,0.08)" }}>Supports videos, Shorts, and playlists</p>
          </div>
        )}

        <style>{`
          @keyframes fadeIn { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
          @keyframes spin   { to   { transform:rotate(360deg) } }
          @keyframes scanLine { 0% { top:0% } 100% { top:100% } }
        `}</style>
      </div>
    </ClientLayout>
  );
}

function StatPill({ icon, val }: { icon: React.ReactNode; val: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "rgba(255,255,255,0.38)" }}>
      {icon} {val}
    </div>
  );
}

function Legend({ dot, label, small }: { dot: string; label: string; small?: boolean }) {
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      <div style={{ width: small ? 7 : 10, height: small ? 7 : 10, borderRadius: "50%", background: dot }} />
      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.28)" }}>{label}</span>
    </div>
  );
}
