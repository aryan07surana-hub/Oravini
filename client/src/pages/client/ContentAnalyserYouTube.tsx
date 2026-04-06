import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import ClientLayout from "@/components/layout/ClientLayout";
import MindMap from "@/components/MindMap";
import { useToast } from "@/hooks/use-toast";
import { Youtube, ArrowLeft, Search, Copy, CheckCircle, Loader2, Eye, ThumbsUp, Clock, Calendar, Lightbulb, ChevronDown, ChevronUp } from "lucide-react";

const GOLD = "#d4b461";

export default function ContentAnalyserYouTube() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [url, setUrl] = useState("");
  const [activeTab, setActiveTab] = useState<"summary" | "breakdown" | "mindmap">("summary");
  const [copied, setCopied] = useState(false);
  const [expandedSection, setExpandedSection] = useState<number | null>(0);

  const analyseMutation = useMutation({
    mutationFn: (url: string) => apiRequest("POST", "/api/analyse/youtube", { url }),
    onError: (err: any) => {
      toast({ title: "Analysis failed", description: err.message || "Please check the URL and try again.", variant: "destructive" });
    },
  });

  const result = analyseMutation.data as any;
  const loading = analyseMutation.isPending;

  const handleAnalyse = () => {
    if (!url.trim()) return;
    analyseMutation.mutate(url.trim());
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatNum = (n: any) => {
    if (!n) return null;
    const num = parseInt(n);
    if (isNaN(num)) return String(n);
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return String(num);
  };

  return (
    <ClientLayout>
      <div style={{ minHeight: "calc(100vh - 64px)", background: "#060606", padding: "32px 24px", maxWidth: 900, margin: "0 auto" }}>
        {/* Back + Header */}
        <div style={{ marginBottom: 28 }}>
          <button onClick={() => navigate("/content-analyser")} data-testid="btn-back-analyser"
            style={{ display: "flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.38)", fontSize: 13, background: "none", border: "none", cursor: "pointer", marginBottom: 18, padding: 0 }}
            onMouseEnter={e => { e.currentTarget.style.color = GOLD; }}
            onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.38)"; }}
          >
            <ArrowLeft style={{ width: 14, height: 14 }} /> Content Analyser
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(255,0,0,0.12)", border: "1px solid rgba(255,0,0,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Youtube style={{ width: 20, height: 20, color: "#ff4444" }} />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 900, color: "#fff", margin: 0 }}>YouTube Analyser</h1>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", margin: 0 }}>Paste any YouTube URL to get a full AI analysis · 2 credits</p>
            </div>
          </div>
        </div>

        {/* URL Input */}
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "20px 24px", marginBottom: 24 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 12 }}>YouTube URL</label>
          <div style={{ display: "flex", gap: 10 }}>
            <input
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAnalyse()}
              placeholder="https://www.youtube.com/watch?v=..."
              data-testid="input-youtube-url"
              style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "11px 16px", color: "#fff", fontSize: 14, outline: "none", fontFamily: "inherit" }}
              onFocus={e => { e.target.style.borderColor = `${GOLD}60`; }}
              onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; }}
            />
            <button
              onClick={handleAnalyse}
              disabled={loading || !url.trim()}
              data-testid="btn-analyse-youtube"
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 22px", background: url.trim() && !loading ? GOLD : "rgba(255,255,255,0.07)", color: url.trim() && !loading ? "#000" : "rgba(255,255,255,0.3)", border: "none", borderRadius: 10, cursor: url.trim() && !loading ? "pointer" : "not-allowed", fontWeight: 800, fontSize: 14, fontFamily: "inherit", transition: "all 0.18s", whiteSpace: "nowrap" }}
            >
              {loading ? <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} /> : <Search style={{ width: 16, height: 16 }} />}
              {loading ? "Analysing…" : "Analyse"}
            </button>
          </div>
        </div>

        {/* Results */}
        {result && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            {/* Video Card */}
            {result.video && (
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "20px 24px", marginBottom: 20, display: "flex", gap: 20, flexWrap: "wrap" }}>
                {result.video.thumbnail && (
                  <div style={{ flexShrink: 0, borderRadius: 10, overflow: "hidden", width: 180, height: 101, background: "#111" }}>
                    <img src={result.video.thumbnail} alt={result.video.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 800, color: "#fff", margin: "0 0 6px", lineHeight: 1.3 }}>{result.video.title}</h2>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", margin: "0 0 12px" }}>{result.video.channel}</p>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                    {result.video.views && <Stat icon={<Eye style={{ width: 12, height: 12 }} />} val={formatNum(result.video.views) + " views"} />}
                    {result.video.likes && <Stat icon={<ThumbsUp style={{ width: 12, height: 12 }} />} val={formatNum(result.video.likes) + " likes"} />}
                    {result.video.duration && <Stat icon={<Clock style={{ width: 12, height: 12 }} />} val={result.video.duration} />}
                    {result.video.uploadDate && <Stat icon={<Calendar style={{ width: 12, height: 12 }} />} val={result.video.uploadDate} />}
                  </div>
                </div>
              </div>
            )}

            {/* Key Takeaways */}
            {result.keyTakeaways?.length > 0 && (
              <div style={{ background: `${GOLD}0A`, border: `1px solid ${GOLD}25`, borderRadius: 14, padding: "18px 22px", marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <Lightbulb style={{ width: 15, height: 15, color: GOLD }} />
                  <span style={{ fontSize: 12, fontWeight: 800, color: GOLD, textTransform: "uppercase", letterSpacing: "0.1em" }}>Key Takeaways</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {result.keyTakeaways.map((t: string, i: number) => (
                    <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <span style={{ width: 20, height: 20, borderRadius: "50%", background: `${GOLD}20`, border: `1px solid ${GOLD}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: GOLD, flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
                      <span style={{ fontSize: 13, color: "rgba(255,255,255,0.78)", lineHeight: 1.55 }}>{t}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tabs */}
            <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
              {(["summary", "breakdown", "mindmap"] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} data-testid={`tab-${tab}`}
                  style={{ padding: "8px 18px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit", transition: "all 0.18s", background: activeTab === tab ? GOLD : "rgba(255,255,255,0.05)", color: activeTab === tab ? "#000" : "rgba(255,255,255,0.45)", textTransform: "capitalize" }}
                >
                  {tab === "mindmap" ? "Mind Map" : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "24px 28px", minHeight: 300 }}>
              {activeTab === "summary" && result.summary && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Summary</span>
                    <button onClick={() => handleCopy(result.summary)} data-testid="btn-copy-summary"
                      style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, cursor: "pointer", fontSize: 12, color: "rgba(255,255,255,0.5)", fontFamily: "inherit" }}
                    >
                      {copied ? <CheckCircle style={{ width: 12, height: 12, color: "#4ade80" }} /> : <Copy style={{ width: 12, height: 12 }} />}
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  {result.summary.split("\n").filter(Boolean).map((para: string, i: number) => (
                    <p key={i} style={{ fontSize: 14, color: "rgba(255,255,255,0.72)", lineHeight: 1.75, margin: "0 0 14px" }}>{para}</p>
                  ))}
                </div>
              )}

              {activeTab === "breakdown" && result.breakdown?.length > 0 && (
                <div>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 18 }}>Section Breakdown</span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {result.breakdown.map((sec: any, i: number) => (
                      <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, overflow: "hidden" }}>
                        <button onClick={() => setExpandedSection(expandedSection === i ? null : i)} data-testid={`section-toggle-${i}`}
                          style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
                        >
                          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                            <span style={{ width: 22, height: 22, borderRadius: "50%", background: `${GOLD}15`, border: `1px solid ${GOLD}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: GOLD, flexShrink: 0 }}>{i + 1}</span>
                            <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{sec.section}</span>
                          </div>
                          {expandedSection === i ? <ChevronUp style={{ width: 14, height: 14, color: "rgba(255,255,255,0.3)" }} /> : <ChevronDown style={{ width: 14, height: 14, color: "rgba(255,255,255,0.3)" }} />}
                        </button>
                        {expandedSection === i && (
                          <div style={{ padding: "0 18px 16px" }}>
                            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", margin: "0 0 12px", lineHeight: 1.6 }}>{sec.content}</p>
                            {sec.keyPoints?.length > 0 && (
                              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                {sec.keyPoints.map((pt: string, j: number) => (
                                  <div key={j} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: GOLD, flexShrink: 0, marginTop: 7 }} />
                                    <span style={{ fontSize: 12.5, color: "rgba(255,255,255,0.55)", lineHeight: 1.55 }}>{pt}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "mindmap" && result.mindmap && (
                <div>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 20 }}>Mind Map</span>
                  <MindMap data={result.mindmap} />
                  <div style={{ display: "flex", gap: 16, marginTop: 20, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <div style={{ width: 16, height: 8, borderRadius: 4, background: GOLD }} />
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Central Topic</span>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <div style={{ width: 16, height: 8, borderRadius: 4, background: `${GOLD}25`, border: `1px solid ${GOLD}50` }} />
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Main Branch</span>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <div style={{ width: 16, height: 8, borderRadius: 4, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)" }} />
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Sub-point</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Empty / loading */}
        {!result && !loading && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 0", color: "rgba(255,255,255,0.18)", gap: 12 }}>
            <Youtube style={{ width: 40, height: 40 }} />
            <p style={{ fontSize: 14, margin: 0 }}>Paste a YouTube URL above and hit Analyse</p>
          </div>
        )}
        {loading && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 0", gap: 16 }}>
            <Loader2 style={{ width: 36, height: 36, color: GOLD, animation: "spin 1s linear infinite" }} />
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", margin: 0 }}>Fetching video data and running AI analysis…</p>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.22)", margin: 0 }}>This may take 20–40 seconds</p>
          </div>
        )}

        <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </ClientLayout>
  );
}

function Stat({ icon, val }: { icon: React.ReactNode; val: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "rgba(255,255,255,0.42)" }}>
      {icon} {val}
    </div>
  );
}
