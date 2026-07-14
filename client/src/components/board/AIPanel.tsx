import { useState, useRef } from "react";
import { GOLD } from "./types";

type Complexity = "simple" | "detailed" | "complex";

interface Props {
  onGenerate: (prompt: string, complexity: Complexity) => void;
  onGenerateFromImage: (prompt: string, file: File) => void;
  loading: boolean;
  onClose: () => void;
}

const SUGGESTIONS = [
  { icon: "🏗️", text: "Netflix microservices architecture with CDN, API gateway, caching layers, and databases" },
  { icon: "🔄", text: "E-commerce order fulfillment flow from cart to delivery with payment and inventory systems" },
  { icon: "🧠", text: "AI/ML pipeline: data ingestion → preprocessing → training → evaluation → deployment → monitoring" },
  { icon: "📊", text: "SaaS product roadmap Q1-Q4 with epics, features, dependencies, and team owners" },
  { icon: "🗺️", text: "Customer journey map: 5 stages, 4 touchpoints each, pain points, opportunities, KPIs" },
  { icon: "🏢", text: "Org chart for 80-person tech startup with all departments, reporting lines, and team sizes" },
  { icon: "🔐", text: "Security architecture: zero-trust network, identity management, threat detection, incident response" },
  { icon: "📱", text: "Mobile app user flow: onboarding, core features, settings, notifications, and edge cases" },
  { icon: "💰", text: "Startup fundraising process: pitch → due diligence → term sheet → legal → close" },
  { icon: "🚀", text: "CI/CD pipeline: code commit → build → test → staging → canary → production → rollback" },
];

const COMPLEXITY_OPTIONS: { value: Complexity; label: string; desc: string; nodes: string }[] = [
  { value: "simple",   label: "Quick",    desc: "Clean overview",      nodes: "15-25 nodes" },
  { value: "detailed", label: "Detailed", desc: "Full breakdown",      nodes: "25-45 nodes" },
  { value: "complex",  label: "Complex",  desc: "Enterprise-grade",   nodes: "40-70 nodes" },
];

export default function AIPanel({ onGenerate, onGenerateFromImage, loading, onClose }: Props) {
  const [tab, setTab] = useState<"prompt" | "image">("prompt");
  const [prompt, setPrompt] = useState("");
  const [complexity, setComplexity] = useState<Complexity>("detailed");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tab === "image") {
      if (imageFile) onGenerateFromImage(prompt || "Recreate this diagram as a structured interactive board, preserving all nodes, arrows, labels, and layout", imageFile);
    } else {
      if (prompt.trim()) onGenerate(prompt.trim(), complexity);
    }
  };

  const handleFile = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const canSubmit = tab === "image" ? !!imageFile : !!prompt.trim();

  return (
    <div style={{
      width: 340, height: "100%",
      background: "rgba(8,10,18,0.97)", borderLeft: `1px solid rgba(212,180,97,0.15)`,
      backdropFilter: "blur(24px)",
      display: "flex", flexDirection: "column",
      boxShadow: "-8px 0 40px rgba(0,0,0,0.5)",
      fontFamily: "system-ui, -apple-system, sans-serif",
    }}>
      {/* Header */}
      <div style={{
        padding: "16px 16px 12px", borderBottom: `1px solid rgba(255,255,255,0.05)`,
        background: "linear-gradient(180deg, rgba(212,180,97,0.06) 0%, transparent 100%)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: `${GOLD}22`, border: `1px solid ${GOLD}44`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>✦</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9" }}>AI Board Generator</div>
              <div style={{ fontSize: 10, color: "#64748b" }}>Powered by Groq Vision</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "2px 4px", borderRadius: 4 }}
            onMouseEnter={e => (e.currentTarget.style.color = "#94a3b8")}
            onMouseLeave={e => (e.currentTarget.style.color = "#475569")}>✕</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: `1px solid rgba(255,255,255,0.05)` }}>
        {(["prompt", "image"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: "10px 0", background: "none", border: "none",
            color: tab === t ? GOLD : "#475569",
            borderBottom: tab === t ? `2px solid ${GOLD}` : "2px solid transparent",
            fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            transition: "all 0.15s",
          }}>
            {t === "prompt" ? "📝 From Prompt" : "🖼️ From Image"}
          </button>
        ))}
      </div>

      {/* Body */}
      <form onSubmit={handleSubmit} style={{ padding: "12px 14px", borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
        {/* Image tab */}
        {tab === "image" && (
          <>
            {!imagePreview ? (
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
                onClick={() => fileRef.current?.click()}
                style={{
                  border: `2px dashed ${dragOver ? GOLD : `${GOLD}33`}`,
                  borderRadius: 10, padding: "28px 16px",
                  textAlign: "center", cursor: "pointer", marginBottom: 10,
                  background: dragOver ? `${GOLD}08` : "transparent",
                  transition: "all 0.15s",
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 8 }}>📸</div>
                <div style={{ color: "#94a3b8", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Drop any chart screenshot here</div>
                <div style={{ color: "#475569", fontSize: 11 }}>Flowcharts · Architecture · Miro · Lucidchart · Whiteboards</div>
                <div style={{ color: "#334155", fontSize: 10, marginTop: 6 }}>PNG · JPG · WebP · SVG</div>
              </div>
            ) : (
              <div style={{ position: "relative", marginBottom: 10, borderRadius: 8, overflow: "hidden", border: `1px solid ${GOLD}33` }}>
                <img src={imagePreview} alt="Diagram" style={{ width: "100%", display: "block", borderRadius: 8 }} />
                <button type="button" onClick={() => { setImageFile(null); setImagePreview(null); }}
                  style={{ position: "absolute", top: 6, right: 6,
                    background: "rgba(0,0,0,0.7)", border: "none", color: "#fff",
                    borderRadius: 4, cursor: "pointer", fontSize: 11, padding: "2px 7px", fontFamily: "inherit" }}>
                  ✕ Remove
                </button>
                <div style={{ position: "absolute", bottom: 6, left: 6, background: "rgba(0,0,0,0.7)", borderRadius: 4, padding: "2px 8px", fontSize: 10, color: "#22c55e" }}>
                  ✓ Ready to analyze
                </div>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
              onChange={e => handleFile(e.target.files?.[0] || null)} />
            <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
              placeholder="Optional: 'Make it more detailed', 'Add database layer', 'Focus on the authentication flow'..."
              rows={2}
              style={{ width: "100%", background: "rgba(15,23,42,0.6)", border: `1px solid rgba(255,255,255,0.07)`,
                borderRadius: 8, padding: "8px 10px", color: "#e2e8f0", fontSize: 12,
                resize: "none", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
          </>
        )}

        {/* Prompt tab */}
        {tab === "prompt" && (
          <>
            <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
              placeholder="E.g. 'Netflix microservices architecture' or 'E-commerce checkout flow with payment gateway'..."
              rows={4}
              style={{ width: "100%", background: "rgba(15,23,42,0.6)", border: `1px solid ${prompt ? `${GOLD}44` : "rgba(255,255,255,0.07)"}`,
                borderRadius: 8, padding: "10px 12px", color: "#e2e8f0", fontSize: 13,
                resize: "none", outline: "none", fontFamily: "inherit", boxSizing: "border-box",
                transition: "border-color 0.15s", lineHeight: 1.5 }} />

            {/* Complexity picker */}
            <div style={{ marginTop: 10, marginBottom: 2 }}>
              <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Complexity</div>
              <div style={{ display: "flex", gap: 6 }}>
                {COMPLEXITY_OPTIONS.map(opt => (
                  <div key={opt.value} onClick={() => setComplexity(opt.value)} style={{
                    flex: 1, padding: "7px 6px", borderRadius: 8, cursor: "pointer", textAlign: "center",
                    background: complexity === opt.value ? `${GOLD}18` : "rgba(255,255,255,0.03)",
                    border: `1px solid ${complexity === opt.value ? GOLD : "rgba(255,255,255,0.06)"}`,
                    transition: "all 0.15s",
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: complexity === opt.value ? GOLD : "#94a3b8" }}>{opt.label}</div>
                    <div style={{ fontSize: 9, color: "#475569", marginTop: 1 }}>{opt.nodes}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Submit */}
        <button type="submit" disabled={loading || !canSubmit} style={{
          marginTop: 10, width: "100%", padding: "11px 0",
          background: loading ? "rgba(212,180,97,0.15)" : canSubmit ? GOLD : "rgba(212,180,97,0.08)",
          color: loading ? "#64748b" : canSubmit ? "#000" : "#475569",
          border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700,
          cursor: loading || !canSubmit ? "not-allowed" : "pointer",
          fontFamily: "inherit", transition: "all 0.15s",
          boxShadow: canSubmit && !loading ? `0 4px 16px ${GOLD}33` : "none",
        }}>
          {loading ? (
            <span>⏳ Generating{tab === "image" ? " from image" : ""}…</span>
          ) : tab === "image" ? (
            <span>🔍 Analyze & Recreate Board</span>
          ) : (
            <span>✦ Generate Board</span>
          )}
        </button>
      </form>

      {/* Prompt suggestions */}
      {tab === "prompt" && (
        <div style={{ flex: 1, overflow: "auto", padding: "10px 14px" }}>
          <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
            Try these
          </div>
          {SUGGESTIONS.map((s, i) => (
            <div key={i} onClick={() => setPrompt(s.text)} style={{
              padding: "8px 10px", borderRadius: 8, cursor: "pointer",
              marginBottom: 4, border: "1px solid transparent",
              transition: "all 0.12s", display: "flex", gap: 8, alignItems: "flex-start",
            }}
              onMouseEnter={e => { e.currentTarget.style.background = `${GOLD}08`; e.currentTarget.style.borderColor = `${GOLD}22`; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; }}
            >
              <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>{s.icon}</span>
              <span style={{ color: "#94a3b8", fontSize: 11.5, lineHeight: 1.45 }}>{s.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Image tips */}
      {tab === "image" && (
        <div style={{ flex: 1, overflow: "auto", padding: "10px 14px" }}>
          <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
            What it can read
          </div>
          {[
            ["🗂️", "Flowcharts & process diagrams"],
            ["🏗️", "System architecture diagrams"],
            ["📋", "Org charts & hierarchy trees"],
            ["🧩", "Kanban boards & task boards"],
            ["🗺️", "Mind maps & concept maps"],
            ["📱", "Wireframes & user flows"],
            ["📸", "Whiteboard photos"],
            ["🔄", "Miro, Lucidchart, draw.io screenshots"],
          ].map(([icon, label]) => (
            <div key={label as string} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 4px", fontSize: 11.5, color: "#64748b" }}>
              <span>{icon}</span><span>{label}</span>
            </div>
          ))}
          <div style={{ marginTop: 10, padding: "8px 10px", borderRadius: 8, background: `${GOLD}08`, border: `1px solid ${GOLD}15`, fontSize: 10.5, color: "#64748b", lineHeight: 1.5 }}>
            💡 <strong style={{ color: "#94a3b8" }}>Tip:</strong> Higher resolution = better accuracy. Screenshot directly from your screen for best results.
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ padding: "8px 14px", borderTop: `1px solid rgba(255,255,255,0.04)`, fontSize: 10, color: "#334155", textAlign: "center" }}>
        {tab === "image" ? "Groq Vision · llama-3.2-90b-vision" : "Groq · llama-3.3-70b-versatile"}
      </div>
    </div>
  );
}
