import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import ClientLayout from "@/components/layout/ClientLayout";
import MindMap from "@/components/MindMap";
import { useToast } from "@/hooks/use-toast";
import {
  Instagram, ArrowLeft, Search, Plus, Trash2, Copy, CheckCircle,
  Loader2, Heart, MessageCircle, Lightbulb, Eye, BrainCircuit,
  Image, AlignLeft, TrendingUp, BarChart2
} from "lucide-react";

const GOLD = "#d4b461";
const PINK = "#e1306c";

const PHASES_IG = [
  { label: "Fetching Instagram posts", icon: "📸" },
  { label: "Scanning captions & engagement", icon: "🔍" },
  { label: "Running content analysis", icon: "🧠" },
  { label: "Building strategy & mind map", icon: "🗺️" },
];

function formatNum(n: any): string {
  if (!n) return "0";
  const num = parseInt(n);
  if (isNaN(num)) return String(n);
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
  return String(num);
}

export default function ContentAnalyserInstagram() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [urls, setUrls] = useState<string[]>([""]);
  const [activeTab, setActiveTab] = useState<"summary" | "posts" | "strategy" | "mindmap">("summary");
  const [copied, setCopied] = useState<string | null>(null);
  const [loadingPhase, setLoadingPhase] = useState(0);
  const [expandedPost, setExpandedPost] = useState<number | null>(0);

  const analyseMutation = useMutation({
    mutationFn: (urls: string[]) => apiRequest("POST", "/api/analyse/instagram", { urls }),
    onError: (err: any) => {
      toast({ title: "Analysis failed", description: err.message || "Make sure posts are public.", variant: "destructive" });
    },
  });

  const result = analyseMutation.data as any;
  const loading = analyseMutation.isPending;

  useEffect(() => {
    if (!loading) { setLoadingPhase(0); return; }
    setLoadingPhase(0);
    const t1 = setTimeout(() => setLoadingPhase(1), 6000);
    const t2 = setTimeout(() => setLoadingPhase(2), 16000);
    const t3 = setTimeout(() => setLoadingPhase(3), 30000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [loading]);

  const addUrl = () => { if (urls.length < 6) setUrls([...urls, ""]); };
  const removeUrl = (i: number) => setUrls(urls.filter((_, idx) => idx !== i));
  const updateUrl = (i: number, val: string) => { const n = [...urls]; n[i] = val; setUrls(n); };

  const handleAnalyse = () => {
    const validUrls = urls.map(u => u.trim()).filter(Boolean);
    if (!validUrls.length) return;
    analyseMutation.mutate(validUrls);
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

  const hasValidUrl = urls.some(u => u.trim().length > 0);

  return (
    <ClientLayout>
      <div style={{ minHeight: "calc(100vh - 64px)", background: "#060606", padding: "28px 20px", maxWidth: 900, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <button onClick={() => navigate("/content-analyser")} data-testid="btn-back-ig"
            style={{ display: "flex", alignItems: "center", gap: 5, color: "rgba(255,255,255,0.3)", fontSize: 12, background: "none", border: "none", cursor: "pointer", marginBottom: 14, padding: 0 }}
            onMouseEnter={e => { e.currentTarget.style.color = GOLD; }} onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.3)"; }}
          >
            <ArrowLeft style={{ width: 13, height: 13 }} /> Content Analyser
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <div style={{ width: 40, height: 40, borderRadius: 11, background: "rgba(225,48,108,0.1)", border: "1px solid rgba(225,48,108,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Instagram style={{ width: 19, height: 19, color: PINK }} />
            </div>
            <div>
              <h1 style={{ fontSize: 21, fontWeight: 900, color: "#fff", margin: 0 }}>Instagram Analyser</h1>
              <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.32)", margin: 0 }}>Post-by-post breakdown · Content strategy · Mind map · 3 credits</p>
            </div>
          </div>
        </div>

        {/* URL Inputs */}
        <div style={{ background: "rgba(255,255,255,0.028)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "18px 20px", marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 13 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.38)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Post URLs</label>
            <span style={{ fontSize: 10.5, color: "rgba(255,255,255,0.22)" }}>{urls.length}/6 links</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
            {urls.map((url, i) => (
              <div key={i} style={{ display: "flex", gap: 7 }}>
                <span style={{ width: 22, height: 38, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ width: 18, height: 18, borderRadius: "50%", background: `${PINK}15`, border: `1px solid ${PINK}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: PINK }}>{i + 1}</span>
                </span>
                <input value={url} onChange={e => updateUrl(i, e.target.value)}
                  onKeyDown={e => e.key === "Enter" && i === urls.length - 1 && addUrl()}
                  placeholder="https://www.instagram.com/p/... or /reel/..."
                  data-testid={`input-ig-url-${i}`}
                  style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 9, padding: "9px 13px", color: "#fff", fontSize: 13, outline: "none", fontFamily: "inherit" }}
                  onFocus={e => { e.target.style.borderColor = `${PINK}45`; }} onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.09)"; }}
                />
                {urls.length > 1 && (
                  <button onClick={() => removeUrl(i)} data-testid={`btn-remove-url-${i}`}
                    style={{ width: 38, height: 38, borderRadius: 9, background: "rgba(255,50,50,0.07)", border: "1px solid rgba(255,50,50,0.14)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Trash2 style={{ width: 13, height: 13, color: "rgba(255,100,100,0.65)" }} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 9 }}>
            {urls.length < 6 && (
              <button onClick={addUrl} data-testid="btn-add-ig-url"
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 8, cursor: "pointer", fontSize: 12.5, color: "rgba(255,255,255,0.42)", fontFamily: "inherit" }}>
                <Plus style={{ width: 12, height: 12 }} /> Add link
              </button>
            )}
            <button onClick={handleAnalyse} disabled={loading || !hasValidUrl} data-testid="btn-analyse-instagram"
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 20px", background: hasValidUrl && !loading ? PINK : "rgba(255,255,255,0.06)", color: hasValidUrl && !loading ? "#fff" : "rgba(255,255,255,0.28)", border: "none", borderRadius: 8, cursor: hasValidUrl && !loading ? "pointer" : "not-allowed", fontWeight: 800, fontSize: 13.5, fontFamily: "inherit", transition: "all 0.16s", marginLeft: "auto" }}>
              {loading ? <Loader2 style={{ width: 15, height: 15, animation: "spin 1s linear infinite" }} /> : <Search style={{ width: 15, height: 15 }} />}
              {loading ? "Analysing…" : "Analyse Posts"}
            </button>
          </div>
        </div>

        {/* Tip */}
        {!result && !loading && (
          <div style={{ background: "rgba(225,48,108,0.05)", border: "1px solid rgba(225,48,108,0.1)", borderRadius: 10, padding: "11px 16px", marginBottom: 20 }}>
            <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.36)", margin: 0, lineHeight: 1.6 }}>
              <strong style={{ color: PINK }}>Tips:</strong> Use direct post or reel URLs (instagram.com/p/... or /reel/...). Profiles must be public. Mix posts from different accounts to compare strategies.
            </p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ animation: "fadeIn 0.3s ease", textAlign: "center", padding: "30px 0" }}>
            {/* Animated scanning grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,60px)", gap: 6, justifyContent: "center", marginBottom: 28 }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ width: 60, height: 60, borderRadius: 10, background: `rgba(225,48,108,${0.08 + (i % 3) * 0.04})`, border: "1px solid rgba(225,48,108,0.15)", animation: `pulse 1.4s ease-in-out ${i * 0.15}s infinite alternate`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Image style={{ width: 20, height: 20, color: "rgba(225,48,108,0.4)" }} />
                </div>
              ))}
            </div>

            {/* Phase indicators */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 360, margin: "0 auto" }}>
              {PHASES_IG.map((phase, idx) => {
                const done = idx < loadingPhase;
                const active = idx === loadingPhase;
                return (
                  <div key={idx} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderRadius: 10, background: active ? `${PINK}10` : "rgba(255,255,255,0.02)", border: `1px solid ${active ? PINK + "30" : "rgba(255,255,255,0.06)"}`, transition: "all 0.3s" }}>
                    <span style={{ fontSize: 16 }}>{phase.icon}</span>
                    <span style={{ fontSize: 13, color: done ? "#4ade80" : active ? "#fff" : "rgba(255,255,255,0.3)", fontWeight: active ? 700 : 400 }}>{phase.label}</span>
                    {done && <CheckCircle style={{ width: 14, height: 14, color: "#4ade80", marginLeft: "auto" }} />}
                    {active && <Loader2 style={{ width: 13, height: 13, color: PINK, marginLeft: "auto", animation: "spin 1s linear infinite" }} />}
                  </div>
                );
              })}
            </div>
            <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.2)", marginTop: 20 }}>This takes 30–60 seconds · Instagram posts are scraped live</p>
          </div>
        )}

        {/* Results */}
        {result && !loading && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            {/* Post thumbnails row */}
            {result.posts?.length > 0 && (
              <div style={{ marginBottom: 18 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.28)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 10 }}>Analysed Posts ({result.posts.length})</span>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 8 }}>
                  {result.posts.map((post: any, i: number) => (
                    <a key={i} href={post.url || "#"} target="_blank" rel="noopener noreferrer" data-testid={`post-thumb-${i}`}
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, overflow: "hidden", textDecoration: "none", display: "block" }}>
                      <div style={{ aspectRatio: "1", background: "#0d0d0d", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
                        {post.thumbnail ? <img src={post.thumbnail} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Image style={{ width: 24, height: 24, color: "rgba(255,255,255,0.12)" }} />}
                        <div style={{ position: "absolute", bottom: 4, left: 4 }}>
                          <span style={{ fontSize: 9, color: "#fff", background: "rgba(0,0,0,0.6)", padding: "1px 5px", borderRadius: 4, fontWeight: 700 }}>#{i + 1}</span>
                        </div>
                      </div>
                      <div style={{ padding: "7px 8px 6px" }}>
                        <div style={{ display: "flex", gap: 7 }}>
                          <div style={{ display: "flex", gap: 3, alignItems: "center", fontSize: 9.5, color: "rgba(255,255,255,0.3)" }}>
                            <Heart style={{ width: 8, height: 8 }} />{formatNum(post.likes)}
                          </div>
                          <div style={{ display: "flex", gap: 3, alignItems: "center", fontSize: 9.5, color: "rgba(255,255,255,0.3)" }}>
                            <MessageCircle style={{ width: 8, height: 8 }} />{formatNum(post.comments)}
                          </div>
                          {post.views && <div style={{ display: "flex", gap: 3, alignItems: "center", fontSize: 9.5, color: "rgba(255,255,255,0.3)" }}>
                            <Eye style={{ width: 8, height: 8 }} />{formatNum(post.views)}
                          </div>}
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Key Takeaways */}
            {result.keyTakeaways?.length > 0 && (
              <div style={{ background: `${PINK}08`, border: `1px solid ${PINK}1e`, borderRadius: 13, padding: "16px 20px", marginBottom: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 13 }}>
                  <Lightbulb style={{ width: 14, height: 14, color: PINK }} />
                  <span style={{ fontSize: 11, fontWeight: 800, color: PINK, textTransform: "uppercase", letterSpacing: "0.1em" }}>Key Insights</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                  {result.keyTakeaways.map((t: string, i: number) => (
                    <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <span style={{ width: 20, height: 20, borderRadius: "50%", background: `${PINK}15`, border: `1px solid ${PINK}32`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9.5, fontWeight: 900, color: PINK, flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
                      <span style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", lineHeight: 1.6 }}>{t}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tabs */}
            <div style={{ display: "flex", gap: 4, marginBottom: 14, flexWrap: "wrap" }}>
              {([
                { id: "summary", label: "Overview", icon: <AlignLeft style={{ width: 12, height: 12 }} /> },
                { id: "posts", label: "Post by Post", icon: <BarChart2 style={{ width: 12, height: 12 }} /> },
                { id: "strategy", label: "Strategy", icon: <TrendingUp style={{ width: 12, height: 12 }} /> },
                { id: "mindmap", label: "Mind Map", icon: <BrainCircuit style={{ width: 12, height: 12 }} /> },
              ] as const).map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} data-testid={`tab-ig-${tab.id}`}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 15px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 700, fontFamily: "inherit", transition: "all 0.16s", background: activeTab === tab.id ? PINK : "rgba(255,255,255,0.045)", color: activeTab === tab.id ? "#fff" : "rgba(255,255,255,0.42)" }}>
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "22px 24px", minHeight: 300 }}>

              {/* ─── OVERVIEW ─── */}
              {activeTab === "summary" && result.overallSummary && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.32)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Content Overview</span>
                    <CopyBtn text={result.overallSummary} k="ig-summary" />
                  </div>
                  {result.overallSummary.split("\n").filter(Boolean).map((p: string, i: number) => (
                    <p key={i} style={{ fontSize: 13.5, color: "rgba(255,255,255,0.7)", lineHeight: 1.75, margin: "0 0 13px" }}>{p}</p>
                  ))}
                  {result.hookAnalysis && (
                    <div style={{ marginTop: 20, padding: "14px 18px", background: `${PINK}08`, border: `1px solid ${PINK}18`, borderRadius: 10 }}>
                      <p style={{ fontSize: 11, fontWeight: 800, color: PINK, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 10px" }}>🪝 Hook Analysis</p>
                      {result.hookAnalysis.split("\n").filter(Boolean).map((p: string, i: number) => (
                        <p key={i} style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", lineHeight: 1.7, margin: "0 0 10px" }}>{p}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ─── POST BY POST ─── */}
              {activeTab === "posts" && result.postByPost?.length > 0 && (
                <div>
                  <span style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.32)", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 14 }}>Post-by-Post Analysis</span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {result.postByPost.map((post: any, i: number) => {
                      const thumb = result.posts?.[i];
                      return (
                        <div key={i} style={{ background: "rgba(255,255,255,0.025)", border: `1px solid ${expandedPost === i ? PINK + "28" : "rgba(255,255,255,0.06)"}`, borderRadius: 12, overflow: "hidden", transition: "border-color 0.2s" }}>
                          <button onClick={() => setExpandedPost(expandedPost === i ? null : i)} data-testid={`ig-post-toggle-${i}`}
                            style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
                            {/* Thumbnail mini */}
                            {thumb?.thumbnail ? (
                              <div style={{ width: 36, height: 36, borderRadius: 8, overflow: "hidden", flexShrink: 0 }}>
                                <img src={thumb.thumbnail} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              </div>
                            ) : (
                              <span style={{ width: 36, height: 36, borderRadius: 8, background: `${PINK}15`, border: `1px solid ${PINK}25`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                <span style={{ fontSize: 11, fontWeight: 800, color: PINK }}>#{i + 1}</span>
                              </span>
                            )}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", margin: 0, lineHeight: 1.3 }}>{post.title || `Post ${i + 1}`}</p>
                              {post.contentType && <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.35)", margin: "2px 0 0" }}>{post.contentType}</p>}
                            </div>
                            {thumb && (
                              <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
                                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>♥ {formatNum(thumb.likes)}</span>
                                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>💬 {formatNum(thumb.comments)}</span>
                              </div>
                            )}
                            <span style={{ fontSize: 16, color: "rgba(255,255,255,0.25)", flexShrink: 0 }}>{expandedPost === i ? "−" : "+"}</span>
                          </button>

                          {expandedPost === i && (
                            <div style={{ padding: "0 16px 16px" }}>
                              {/* Caption */}
                              {thumb?.caption && (
                                <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "10px 12px", marginBottom: 12, fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.6, fontStyle: "italic", borderLeft: `2px solid ${PINK}40` }}>
                                  "{thumb.caption.length > 200 ? thumb.caption.slice(0, 200) + "…" : thumb.caption}"
                                </div>
                              )}
                              {/* Analysis blocks */}
                              {post.captionAnalysis && (
                                <Block color={PINK} title="Caption Analysis" content={post.captionAnalysis} />
                              )}
                              {post.engagementInsight && (
                                <Block color={GOLD} title="Engagement Insight" content={post.engagementInsight} />
                              )}
                              {post.keyPoints?.length > 0 && (
                                <div style={{ marginTop: 10 }}>
                                  <p style={{ fontSize: 10.5, fontWeight: 700, color: "rgba(255,255,255,0.32)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>Key Points</p>
                                  {post.keyPoints.map((pt: string, j: number) => (
                                    <div key={j} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                                      <span style={{ width: 4, height: 4, borderRadius: "50%", background: PINK, flexShrink: 0, marginTop: 8 }} />
                                      <span style={{ fontSize: 12.5, color: "rgba(255,255,255,0.6)", lineHeight: 1.6 }}>{pt}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ─── STRATEGY ─── */}
              {activeTab === "strategy" && result.contentStrategy && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.32)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Content Strategy Analysis</span>
                    <CopyBtn text={result.contentStrategy} k="strategy" />
                  </div>
                  {result.contentStrategy.split("\n").filter(Boolean).map((p: string, i: number) => (
                    <p key={i} style={{ fontSize: 13.5, color: "rgba(255,255,255,0.7)", lineHeight: 1.75, margin: "0 0 13px", borderLeft: "2px solid rgba(225,48,108,0.2)", paddingLeft: 14 }}>{p}</p>
                  ))}
                </div>
              )}

              {/* ─── MIND MAP ─── */}
              {activeTab === "mindmap" && result.mindmap && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.32)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Content Mind Map</span>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}><div style={{ width: 10, height: 10, borderRadius: "50%", background: GOLD }} /><span style={{ fontSize: 10, color: "rgba(255,255,255,0.28)" }}>Center</span></div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}><div style={{ width: 7, height: 7, borderRadius: "50%", background: "#4AC88E" }} /><span style={{ fontSize: 10, color: "rgba(255,255,255,0.28)" }}>Branch</span></div>
                    </div>
                  </div>
                  <MindMap data={result.mindmap} />
                </div>
              )}
            </div>
          </div>
        )}

        <style>{`
          @keyframes fadeIn { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }
          @keyframes spin { to { transform:rotate(360deg) } }
          @keyframes pulse { from { opacity:0.5 } to { opacity:1 } }
        `}</style>
      </div>
    </ClientLayout>
  );
}

function Block({ color, title, content }: { color: string; title: string; content: string }) {
  return (
    <div style={{ marginBottom: 10, padding: "10px 12px", background: `${color}08`, border: `1px solid ${color}18`, borderRadius: 8 }}>
      <p style={{ fontSize: 10.5, fontWeight: 800, color, textTransform: "uppercase" as const, letterSpacing: "0.07em", margin: "0 0 6px" }}>{title}</p>
      <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.65)", lineHeight: 1.65, margin: 0 }}>{content}</p>
    </div>
  );
}
