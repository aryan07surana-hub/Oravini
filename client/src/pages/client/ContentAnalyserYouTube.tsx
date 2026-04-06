import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import ClientLayout from "@/components/layout/ClientLayout";
import MindMap from "@/components/MindMap";
import { useToast } from "@/hooks/use-toast";
import {
  Youtube, ArrowLeft, Search, Copy, CheckCircle, Loader2,
  Eye, ThumbsUp, Clock, Calendar, Lightbulb, ChevronDown, ChevronUp,
  FileText, BrainCircuit, AlignLeft, MessageSquare
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
  const [expandedMbm, setExpandedMbm] = useState<number | null>(0);
  const [loadingPhase, setLoadingPhase] = useState(0);
  const [previewThumbnail, setPreviewThumbnail] = useState<string | null>(null);

  const analyseMutation = useMutation({
    mutationFn: (url: string) => apiRequest("POST", "/api/analyse/youtube", { url }),
    onError: (err: any) => {
      toast({ title: "Analysis failed", description: err.message || "Check the URL and try again.", variant: "destructive" });
    },
  });

  const result = analyseMutation.data as any;
  const loading = analyseMutation.isPending;

  // Animate loading phases
  useEffect(() => {
    if (!loading) { setLoadingPhase(0); return; }
    setLoadingPhase(0);
    const t1 = setTimeout(() => setLoadingPhase(1), 3000);
    const t2 = setTimeout(() => setLoadingPhase(2), 9000);
    const t3 = setTimeout(() => setLoadingPhase(3), 22000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [loading]);

  const handleAnalyse = () => {
    if (!url.trim()) return;
    const vid = extractVideoId(url.trim());
    if (vid) setPreviewThumbnail(`https://img.youtube.com/vi/${vid}/hqdefault.jpg`);
    analyseMutation.mutate(url.trim());
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const CopyBtn = ({ text, k }: { text: string; k: string }) => (
    <button onClick={() => handleCopy(text, k)}
      style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 11px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, cursor: "pointer", fontSize: 12, color: copied === k ? "#4ade80" : "rgba(255,255,255,0.45)", fontFamily: "inherit", flexShrink: 0 }}>
      {copied === k ? <CheckCircle style={{ width: 11, height: 11 }} /> : <Copy style={{ width: 11, height: 11 }} />}
      {copied === k ? "Copied" : "Copy"}
    </button>
  );

  return (
    <ClientLayout>
      <div style={{ minHeight: "calc(100vh - 64px)", background: "#060606", padding: "28px 20px", maxWidth: 900, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <button onClick={() => navigate("/content-analyser")} data-testid="btn-back-yt"
            style={{ display: "flex", alignItems: "center", gap: 5, color: "rgba(255,255,255,0.3)", fontSize: 12, background: "none", border: "none", cursor: "pointer", marginBottom: 14, padding: 0 }}
            onMouseEnter={e => { e.currentTarget.style.color = GOLD; }} onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.3)"; }}
          >
            <ArrowLeft style={{ width: 13, height: 13 }} /> Content Analyser
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <div style={{ width: 40, height: 40, borderRadius: 11, background: "rgba(255,0,0,0.12)", border: "1px solid rgba(255,0,0,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Youtube style={{ width: 19, height: 19, color: "#ff4444" }} />
            </div>
            <div>
              <h1 style={{ fontSize: 21, fontWeight: 900, color: "#fff", margin: 0 }}>YouTube Analyser</h1>
              <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.32)", margin: 0 }}>Full transcript · Minute-by-minute · Mind map · 2 credits</p>
            </div>
          </div>
        </div>

        {/* URL Input */}
        <div style={{ background: "rgba(255,255,255,0.028)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "18px 20px", marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 9 }}>
            <input value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAnalyse()}
              placeholder="https://www.youtube.com/watch?v=..." data-testid="input-youtube-url"
              style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 9, padding: "10px 14px", color: "#fff", fontSize: 13.5, outline: "none", fontFamily: "inherit" }}
              onFocus={e => { e.target.style.borderColor = `${GOLD}55`; }} onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; }}
            />
            <button onClick={handleAnalyse} disabled={loading || !url.trim()} data-testid="btn-analyse-youtube"
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 20px", background: url.trim() && !loading ? GOLD : "rgba(255,255,255,0.06)", color: url.trim() && !loading ? "#000" : "rgba(255,255,255,0.28)", border: "none", borderRadius: 9, cursor: url.trim() && !loading ? "pointer" : "not-allowed", fontWeight: 800, fontSize: 13.5, fontFamily: "inherit", transition: "all 0.16s", whiteSpace: "nowrap" }}>
              {loading ? <Loader2 style={{ width: 15, height: 15, animation: "spin 1s linear infinite" }} /> : <Search style={{ width: 15, height: 15 }} />}
              {loading ? "Analysing…" : "Analyse"}
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            {/* Thumbnail with scan */}
            {previewThumbnail && (
              <div style={{ position: "relative", width: "100%", maxWidth: 460, margin: "0 auto 28px", borderRadius: 14, overflow: "hidden", boxShadow: `0 0 40px ${GOLD}20` }}>
                <img src={previewThumbnail} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                  style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", display: "block" }} />
                {/* Overlay */}
                <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)" }} />
                {/* Scan line */}
                <div style={{ position: "absolute", left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`, animation: "scanLine 1.8s ease-in-out infinite" }} />
                {/* Corner accents */}
                <div style={{ position: "absolute", top: 10, left: 10, width: 18, height: 18, borderTop: `2px solid ${GOLD}`, borderLeft: `2px solid ${GOLD}` }} />
                <div style={{ position: "absolute", top: 10, right: 10, width: 18, height: 18, borderTop: `2px solid ${GOLD}`, borderRight: `2px solid ${GOLD}` }} />
                <div style={{ position: "absolute", bottom: 10, left: 10, width: 18, height: 18, borderBottom: `2px solid ${GOLD}`, borderLeft: `2px solid ${GOLD}` }} />
                <div style={{ position: "absolute", bottom: 10, right: 10, width: 18, height: 18, borderBottom: `2px solid ${GOLD}`, borderRight: `2px solid ${GOLD}` }} />
                {/* Scanning text */}
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", border: `2px solid ${GOLD}`, borderTopColor: "transparent", animation: "spin 1s linear infinite", margin: "0 auto 10px" }} />
                    <p style={{ fontSize: 12, color: GOLD, fontWeight: 700, letterSpacing: "0.1em" }}>SCANNING</p>
                  </div>
                </div>
              </div>
            )}

            {/* Phase indicators */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 360, margin: "0 auto" }}>
              {PHASES.map((phase, idx) => {
                const done = idx < loadingPhase;
                const active = idx === loadingPhase;
                return (
                  <div key={idx} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderRadius: 10, background: active ? `${GOLD}12` : "rgba(255,255,255,0.025)", border: `1px solid ${active ? GOLD + "35" : "rgba(255,255,255,0.06)"}`, transition: "all 0.3s" }}>
                    <span style={{ fontSize: 16 }}>{phase.icon}</span>
                    <span style={{ fontSize: 13, color: done ? "#4ade80" : active ? "#fff" : "rgba(255,255,255,0.3)", fontWeight: active ? 700 : 400 }}>{phase.label}</span>
                    {done && <CheckCircle style={{ width: 14, height: 14, color: "#4ade80", marginLeft: "auto" }} />}
                    {active && <Loader2 style={{ width: 13, height: 13, color: GOLD, marginLeft: "auto", animation: "spin 1s linear infinite" }} />}
                  </div>
                );
              })}
            </div>
            <p style={{ textAlign: "center", fontSize: 11.5, color: "rgba(255,255,255,0.2)", marginTop: 20 }}>This takes 25–40 seconds for a thorough analysis</p>
          </div>
        )}

        {/* Results */}
        {result && !loading && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            {/* Video card */}
            {result.video && (
              <div style={{ background: "rgba(255,255,255,0.028)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "18px 20px", marginBottom: 18, display: "flex", gap: 18, flexWrap: "wrap", alignItems: "flex-start" }}>
                {result.video.thumbnail && (
                  <div style={{ flexShrink: 0, borderRadius: 10, overflow: "hidden", width: 190, background: "#111" }}>
                    <img src={result.video.thumbnail} alt={result.video.title} style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", display: "block" }} />
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 800, color: "#fff", margin: "0 0 5px", lineHeight: 1.3 }}>{result.video.title}</h2>
                  <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.42)", margin: "0 0 12px" }}>{result.video.channel}</p>
                  <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 10 }}>
                    {result.video.views && <Stat icon={<Eye style={{ width: 11, height: 11 }} />} val={formatNum(result.video.views) + " views"} />}
                    {result.video.likes && <Stat icon={<ThumbsUp style={{ width: 11, height: 11 }} />} val={formatNum(result.video.likes)} />}
                    {result.video.duration && <Stat icon={<Clock style={{ width: 11, height: 11 }} />} val={result.video.duration} />}
                    {result.video.uploadDate && <Stat icon={<Calendar style={{ width: 11, height: 11 }} />} val={result.video.uploadDate} />}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {result.hasTranscript && <span style={{ fontSize: 10.5, fontWeight: 700, color: "#4ade80", background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 20, padding: "3px 9px" }}>✓ Transcript extracted ({result.transcriptSegments} segments)</span>}
                    {!result.hasTranscript && <span style={{ fontSize: 10.5, color: "rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: "3px 9px" }}>⚠ No transcript (based on metadata only)</span>}
                  </div>
                </div>
              </div>
            )}

            {/* Key Takeaways */}
            {result.keyTakeaways?.length > 0 && (
              <div style={{ background: `${GOLD}09`, border: `1px solid ${GOLD}22`, borderRadius: 13, padding: "16px 20px", marginBottom: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 13 }}>
                  <Lightbulb style={{ width: 14, height: 14, color: GOLD }} />
                  <span style={{ fontSize: 11, fontWeight: 800, color: GOLD, textTransform: "uppercase", letterSpacing: "0.1em" }}>Key Takeaways</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                  {result.keyTakeaways.map((t: string, i: number) => (
                    <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <span style={{ width: 20, height: 20, borderRadius: "50%", background: `${GOLD}18`, border: `1px solid ${GOLD}38`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9.5, fontWeight: 900, color: GOLD, flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
                      <span style={{ fontSize: 13, color: "rgba(255,255,255,0.76)", lineHeight: 1.6 }}>{t}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tabs */}
            <div style={{ display: "flex", gap: 4, marginBottom: 14, flexWrap: "wrap" }}>
              {([
                { id: "summary", label: "Minute by Minute", icon: <AlignLeft style={{ width: 13, height: 13 }} /> },
                { id: "transcript", label: "Speaker Script", icon: <MessageSquare style={{ width: 13, height: 13 }} /> },
                { id: "mindmap", label: "Mind Map", icon: <BrainCircuit style={{ width: 13, height: 13 }} /> },
              ] as const).map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} data-testid={`tab-yt-${tab.id}`}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 700, fontFamily: "inherit", transition: "all 0.16s", background: activeTab === tab.id ? GOLD : "rgba(255,255,255,0.045)", color: activeTab === tab.id ? "#000" : "rgba(255,255,255,0.42)" }}>
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "22px 24px", minHeight: 320 }}>

              {/* ─── MINUTE BY MINUTE ─── */}
              {activeTab === "summary" && (
                <div>
                  {/* Overall summary first */}
                  {result.overallSummary && (
                    <div style={{ marginBottom: 24 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 13 }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.32)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Overall Summary</span>
                        <CopyBtn text={result.overallSummary} k="summary" />
                      </div>
                      {result.overallSummary.split("\n").filter(Boolean).map((p: string, i: number) => (
                        <p key={i} style={{ fontSize: 13.5, color: "rgba(255,255,255,0.7)", lineHeight: 1.75, margin: "0 0 12px" }}>{p}</p>
                      ))}
                    </div>
                  )}

                  {/* Minute by minute sections */}
                  {result.minuteByMinute?.length > 0 && (
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.32)", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 14 }}>Breakdown</span>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {result.minuteByMinute.map((seg: any, i: number) => (
                          <div key={i} style={{ background: "rgba(255,255,255,0.025)", border: `1px solid ${expandedMbm === i ? GOLD + "28" : "rgba(255,255,255,0.06)"}`, borderRadius: 11, overflow: "hidden", transition: "border-color 0.2s" }}>
                            <button onClick={() => setExpandedMbm(expandedMbm === i ? null : i)} data-testid={`mbm-toggle-${i}`}
                              style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
                              {/* Timestamp badge */}
                              <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 800, color: GOLD, background: `${GOLD}15`, border: `1px solid ${GOLD}30`, borderRadius: 6, padding: "2px 8px", fontFamily: "monospace", letterSpacing: "0.05em" }}>
                                [{seg.timestamp || `${String(Math.floor(i * 2)).padStart(2, "0")}:00`}]
                              </span>
                              <span style={{ flex: 1, fontSize: 13.5, fontWeight: 700, color: "#fff" }}>{seg.title}</span>
                              {expandedMbm === i
                                ? <ChevronUp style={{ width: 13, height: 13, color: "rgba(255,255,255,0.28)", flexShrink: 0 }} />
                                : <ChevronDown style={{ width: 13, height: 13, color: "rgba(255,255,255,0.28)", flexShrink: 0 }} />
                              }
                            </button>
                            {expandedMbm === i && (
                              <div style={{ padding: "2px 16px 16px 16px" }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                  {(seg.bullets || []).map((bullet: string, j: number) => (
                                    <div key={j} style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
                                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: GOLD, flexShrink: 0, marginTop: 8 }} />
                                      <span style={{ fontSize: 13, color: "rgba(255,255,255,0.68)", lineHeight: 1.65 }}>{bullet}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ─── SPEAKER SCRIPT ─── */}
              {activeTab === "transcript" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.32)", textTransform: "uppercase", letterSpacing: "0.1em", display: "block" }}>Speaker Script</span>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.22)" }}>
                        {result.hasTranscript ? "Reconstructed from extracted transcript" : "AI-generated based on video content"}
                      </span>
                    </div>
                    {result.speakerScript && <CopyBtn text={result.speakerScript} k="script" />}
                  </div>
                  {result.speakerScript ? (
                    <div style={{ maxHeight: 520, overflowY: "auto", paddingRight: 8 }}>
                      {result.speakerScript.split("\n").filter(Boolean).map((para: string, i: number) => (
                        <p key={i} style={{ fontSize: 13.5, color: "rgba(255,255,255,0.72)", lineHeight: 1.78, margin: "0 0 14px", borderLeft: "2px solid rgba(212,180,97,0.2)", paddingLeft: 14 }}>{para}</p>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 13 }}>No script available for this video.</p>
                  )}
                </div>
              )}

              {/* ─── MIND MAP ─── */}
              {activeTab === "mindmap" && result.mindmap && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.32)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Mind Map</span>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}><div style={{ width: 12, height: 12, borderRadius: "50%", background: GOLD }} /><span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>Center</span></div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}><div style={{ width: 8, height: 8, borderRadius: "50%", background: "#4A7CF7" }} /><span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>Branch</span></div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}><div style={{ width: 5, height: 5, borderRadius: "50%", background: "rgba(255,255,255,0.4)" }} /><span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>Node</span></div>
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
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "70px 0", color: "rgba(255,255,255,0.14)", gap: 10 }}>
            <Youtube style={{ width: 42, height: 42 }} />
            <p style={{ fontSize: 13.5, margin: 0 }}>Paste a YouTube URL above and hit Analyse</p>
          </div>
        )}

        <style>{`
          @keyframes fadeIn { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }
          @keyframes spin { to { transform:rotate(360deg) } }
          @keyframes scanLine { 0% { top:0% } 100% { top:100% } }
        `}</style>
      </div>
    </ClientLayout>
  );
}

function Stat({ icon, val }: { icon: React.ReactNode; val: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
      {icon} {val}
    </div>
  );
}
