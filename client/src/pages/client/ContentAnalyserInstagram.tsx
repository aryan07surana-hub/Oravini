import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import ClientLayout from "@/components/layout/ClientLayout";
import MindMap from "@/components/MindMap";
import { useToast } from "@/hooks/use-toast";
import { Instagram, ArrowLeft, Search, Plus, Trash2, Copy, CheckCircle, Loader2, Heart, MessageCircle, Lightbulb, ChevronDown, ChevronUp, Image } from "lucide-react";

const GOLD = "#d4b461";
const PINK = "#e1306c";

export default function ContentAnalyserInstagram() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [urls, setUrls] = useState<string[]>([""]);
  const [activeTab, setActiveTab] = useState<"summary" | "breakdown" | "strategy" | "mindmap">("summary");
  const [copied, setCopied] = useState(false);
  const [expandedSection, setExpandedSection] = useState<number | null>(0);

  const analyseMutation = useMutation({
    mutationFn: (urls: string[]) => apiRequest("POST", "/api/analyse/instagram", { urls }),
    onError: (err: any) => {
      toast({ title: "Analysis failed", description: err.message || "Make sure the posts are public and URLs are correct.", variant: "destructive" });
    },
  });

  const result = analyseMutation.data as any;
  const loading = analyseMutation.isPending;

  const addUrl = () => { if (urls.length < 6) setUrls([...urls, ""]); };
  const removeUrl = (i: number) => setUrls(urls.filter((_, idx) => idx !== i));
  const updateUrl = (i: number, val: string) => { const n = [...urls]; n[i] = val; setUrls(n); };

  const handleAnalyse = () => {
    const validUrls = urls.map(u => u.trim()).filter(Boolean);
    if (!validUrls.length) return;
    analyseMutation.mutate(validUrls);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatNum = (n: any) => {
    if (!n) return "0";
    const num = parseInt(n);
    if (isNaN(num)) return String(n);
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return String(num);
  };

  const hasValidUrl = urls.some(u => u.trim().length > 0);

  return (
    <ClientLayout>
      <div style={{ minHeight: "calc(100vh - 64px)", background: "#060606", padding: "32px 24px", maxWidth: 900, margin: "0 auto" }}>
        {/* Back + Header */}
        <div style={{ marginBottom: 28 }}>
          <button onClick={() => navigate("/content-analyser")} data-testid="btn-back-analyser-ig"
            style={{ display: "flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.38)", fontSize: 13, background: "none", border: "none", cursor: "pointer", marginBottom: 18, padding: 0 }}
            onMouseEnter={e => { e.currentTarget.style.color = GOLD; }}
            onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.38)"; }}
          >
            <ArrowLeft style={{ width: 14, height: 14 }} /> Content Analyser
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(225,48,108,0.1)", border: "1px solid rgba(225,48,108,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Instagram style={{ width: 20, height: 20, color: PINK }} />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 900, color: "#fff", margin: 0 }}>Instagram Analyser</h1>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", margin: 0 }}>Add up to 6 post links for content analysis · 3 credits</p>
            </div>
          </div>
        </div>

        {/* URL Inputs */}
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "20px 24px", marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Instagram Post URLs</label>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>{urls.length}/6 links</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
            {urls.map((url, i) => (
              <div key={i} style={{ display: "flex", gap: 8 }}>
                <div style={{ width: 28, height: 42, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ width: 20, height: 20, borderRadius: "50%", background: `${PINK}18`, border: `1px solid ${PINK}35`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: PINK }}>{i + 1}</span>
                </div>
                <input
                  value={url}
                  onChange={e => updateUrl(i, e.target.value)}
                  onKeyDown={e => e.key === "Enter" && i === urls.length - 1 && addUrl()}
                  placeholder="https://www.instagram.com/p/..."
                  data-testid={`input-ig-url-${i}`}
                  style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: 13, outline: "none", fontFamily: "inherit" }}
                  onFocus={e => { e.target.style.borderColor = `${PINK}50`; }}
                  onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; }}
                />
                {urls.length > 1 && (
                  <button onClick={() => removeUrl(i)} data-testid={`btn-remove-url-${i}`}
                    style={{ width: 42, height: 42, borderRadius: 10, background: "rgba(255,50,50,0.07)", border: "1px solid rgba(255,50,50,0.15)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                  >
                    <Trash2 style={{ width: 14, height: 14, color: "rgba(255,100,100,0.7)" }} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            {urls.length < 6 && (
              <button onClick={addUrl} data-testid="btn-add-url"
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 9, cursor: "pointer", fontSize: 13, color: "rgba(255,255,255,0.5)", fontFamily: "inherit" }}
              >
                <Plus style={{ width: 13, height: 13 }} /> Add another link
              </button>
            )}
            <button
              onClick={handleAnalyse}
              disabled={loading || !hasValidUrl}
              data-testid="btn-analyse-instagram"
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 22px", background: hasValidUrl && !loading ? PINK : "rgba(255,255,255,0.07)", color: hasValidUrl && !loading ? "#fff" : "rgba(255,255,255,0.3)", border: "none", borderRadius: 9, cursor: hasValidUrl && !loading ? "pointer" : "not-allowed", fontWeight: 800, fontSize: 14, fontFamily: "inherit", transition: "all 0.18s", marginLeft: "auto" }}
            >
              {loading ? <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} /> : <Search style={{ width: 16, height: 16 }} />}
              {loading ? "Analysing…" : "Analyse"}
            </button>
          </div>
        </div>

        {/* Tips */}
        {!result && !loading && (
          <div style={{ background: "rgba(225,48,108,0.05)", border: "1px solid rgba(225,48,108,0.12)", borderRadius: 12, padding: "14px 18px", marginBottom: 24 }}>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", margin: 0, lineHeight: 1.6 }}>
              <strong style={{ color: PINK }}>Tips:</strong> Use direct post URLs (e.g. instagram.com/p/…) or reel URLs. Profiles must be public. You can mix posts from different accounts to compare styles.
            </p>
          </div>
        )}

        {/* Results */}
        {result && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            {/* Posts Grid */}
            {result.posts?.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 12 }}>Analysed Posts ({result.posts.length})</span>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
                  {result.posts.map((post: any, i: number) => (
                    <div key={i} data-testid={`post-card-${i}`}
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, overflow: "hidden", cursor: post.url ? "pointer" : "default" }}
                      onClick={() => post.url && window.open(post.url, "_blank")}
                    >
                      <div style={{ width: "100%", aspectRatio: "1", background: "#0d0d0d", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {post.thumbnail ? (
                          <img src={post.thumbnail} alt={`Post ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <Image style={{ width: 28, height: 28, color: "rgba(255,255,255,0.15)" }} />
                        )}
                      </div>
                      <div style={{ padding: "10px 10px 8px" }}>
                        <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.45)", margin: "0 0 8px", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{post.caption}</p>
                        <div style={{ display: "flex", gap: 8 }}>
                          <div style={{ display: "flex", gap: 4, alignItems: "center", fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
                            <Heart style={{ width: 9, height: 9 }} /> {formatNum(post.likes)}
                          </div>
                          <div style={{ display: "flex", gap: 4, alignItems: "center", fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
                            <MessageCircle style={{ width: 9, height: 9 }} /> {formatNum(post.comments)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Key Takeaways */}
            {result.keyTakeaways?.length > 0 && (
              <div style={{ background: `${PINK}0A`, border: `1px solid ${PINK}20`, borderRadius: 14, padding: "18px 22px", marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <Lightbulb style={{ width: 15, height: 15, color: PINK }} />
                  <span style={{ fontSize: 12, fontWeight: 800, color: PINK, textTransform: "uppercase", letterSpacing: "0.1em" }}>Key Insights</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {result.keyTakeaways.map((t: string, i: number) => (
                    <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <span style={{ width: 20, height: 20, borderRadius: "50%", background: `${PINK}15`, border: `1px solid ${PINK}35`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: PINK, flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
                      <span style={{ fontSize: 13, color: "rgba(255,255,255,0.78)", lineHeight: 1.55 }}>{t}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tabs */}
            <div style={{ display: "flex", gap: 4, marginBottom: 16, flexWrap: "wrap" }}>
              {(["summary", "breakdown", "strategy", "mindmap"] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} data-testid={`tab-ig-${tab}`}
                  style={{ padding: "7px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit", transition: "all 0.18s", background: activeTab === tab ? PINK : "rgba(255,255,255,0.05)", color: activeTab === tab ? "#fff" : "rgba(255,255,255,0.45)", textTransform: "capitalize", whiteSpace: "nowrap" }}
                >
                  {tab === "mindmap" ? "Mind Map" : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "24px 28px", minHeight: 260 }}>
              {activeTab === "summary" && result.summary && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Content Summary</span>
                    <button onClick={() => handleCopy(result.summary)} data-testid="btn-copy-ig-summary"
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
                  <span style={{ fontSize: 12, fontWeight: 800, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 18 }}>Content Breakdown</span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {result.breakdown.map((sec: any, i: number) => (
                      <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, overflow: "hidden" }}>
                        <button onClick={() => setExpandedSection(expandedSection === i ? null : i)} data-testid={`ig-section-toggle-${i}`}
                          style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
                        >
                          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                            <span style={{ width: 22, height: 22, borderRadius: "50%", background: `${PINK}12`, border: `1px solid ${PINK}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: PINK, flexShrink: 0 }}>{i + 1}</span>
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
                                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: PINK, flexShrink: 0, marginTop: 7 }} />
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

              {activeTab === "strategy" && result.contentStrategy && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Content Strategy Analysis</span>
                    <button onClick={() => handleCopy(result.contentStrategy)} data-testid="btn-copy-strategy"
                      style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, cursor: "pointer", fontSize: 12, color: "rgba(255,255,255,0.5)", fontFamily: "inherit" }}
                    >
                      {copied ? <CheckCircle style={{ width: 12, height: 12, color: "#4ade80" }} /> : <Copy style={{ width: 12, height: 12 }} />}
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  {result.contentStrategy.split("\n").filter(Boolean).map((para: string, i: number) => (
                    <p key={i} style={{ fontSize: 14, color: "rgba(255,255,255,0.72)", lineHeight: 1.75, margin: "0 0 14px" }}>{para}</p>
                  ))}
                </div>
              )}

              {activeTab === "mindmap" && result.mindmap && (
                <div>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 20 }}>Content Mind Map</span>
                  <MindMap data={result.mindmap} />
                  <div style={{ display: "flex", gap: 16, marginTop: 20, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <div style={{ width: 16, height: 8, borderRadius: 4, background: GOLD }} />
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Central Theme</span>
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

        {loading && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 0", gap: 16 }}>
            <Loader2 style={{ width: 36, height: 36, color: PINK, animation: "spin 1s linear infinite" }} />
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", margin: 0 }}>Scraping posts and running AI analysis…</p>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.22)", margin: 0 }}>This may take 30–60 seconds</p>
          </div>
        )}

        <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </ClientLayout>
  );
}
