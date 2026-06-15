import { useState, useRef } from "react";
import { GOLD } from "./types";

interface Props {
  onGenerate: (prompt: string) => void;
  onGenerateFromImage: (prompt: string, file: File) => void;
  loading: boolean;
  onClose: () => void;
}

const SUGGESTIONS = [
  "Q4 content strategy with 4 pillars, KPIs, and owner assignments",
  "Customer journey map: awareness → consideration → decision → retention",
  "Sprint retrospective: what went well, what to improve, action items",
  "Competitive analysis: compare 4 competitors across 6 dimensions",
  "Product roadmap: Q1-Q4 with features, dependencies, and milestones",
  "User flow for SaaS onboarding: signup → setup → first value → retention",
  "Database schema for an e-commerce platform with users, products, orders",
  "Organization chart for a 50-person startup with engineering, product, marketing",
];

export default function AIPanel({ onGenerate, onGenerateFromImage, loading, onClose }: Props) {
  const [tab, setTab] = useState<"prompt" | "image">("prompt");
  const [prompt, setPrompt] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tab === "image") {
      if (imageFile) onGenerateFromImage(prompt || "Recreate this diagram as a structured board", imageFile);
    } else {
      if (prompt.trim()) onGenerate(prompt.trim());
    }
  };

  const handleFile = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return alert("Only image files are supported");
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files[0]);
  };

  const canSubmit = tab === "image" ? !!imageFile : !!prompt.trim();

  return (
    <div style={{
      width: 320, height: "100%",
      background: "rgba(10,10,15,0.95)", borderLeft: `1px solid ${GOLD}22`,
      backdropFilter: "blur(20px)",
      display: "flex", flexDirection: "column",
      boxShadow: "-4px 0 24px rgba(0,0,0,0.4)",
      fontFamily: "inherit",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 16px", borderBottom: `1px solid ${GOLD}22`,
      }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: GOLD }}>🤖 AI Board Generator</div>
          <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>{tab === "image" ? "Upload a diagram to recreate" : "Describe your board in plain English"}</div>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 18 }}>✕</button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: `1px solid ${GOLD}11` }}>
        <button
          onClick={() => setTab("prompt")}
          style={{
            flex: 1, padding: "10px 0", background: "none", border: "none",
            color: tab === "prompt" ? GOLD : "#64748b",
            borderBottom: tab === "prompt" ? `2px solid ${GOLD}` : "2px solid transparent",
            fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            transition: "all 0.15s",
          }}
        >
          📝 Prompt
        </button>
        <button
          onClick={() => setTab("image")}
          style={{
            flex: 1, padding: "10px 0", background: "none", border: "none",
            color: tab === "image" ? GOLD : "#64748b",
            borderBottom: tab === "image" ? `2px solid ${GOLD}` : "2px solid transparent",
            fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            transition: "all 0.15s",
          }}
        >
          🖼️ From Image
        </button>
      </div>

      {/* Body */}
      <form onSubmit={handleSubmit} style={{ padding: "12px 16px", borderBottom: `1px solid ${GOLD}11` }}>
        {tab === "image" && (
          <>
            {/* Drop zone */}
            {!imagePreview ? (
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                style={{
                  border: `2px dashed ${GOLD}33`, borderRadius: 8, padding: "24px 16px",
                  textAlign: "center", cursor: "pointer", marginBottom: 8,
                  transition: "all 0.15s", color: "#64748b", fontSize: 12,
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = `${GOLD}66`; e.currentTarget.style.background = "rgba(212,180,97,0.05)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = `${GOLD}33`; e.currentTarget.style.background = "transparent"; }}
              >
                <div style={{ fontSize: 28, marginBottom: 6 }}>📤</div>
                <div>Drop a screenshot here or click to browse</div>
                <div style={{ fontSize: 10, marginTop: 4, color: "#475569" }}>PNG / JPG / WebP</div>
              </div>
            ) : (
              <div style={{ position: "relative", marginBottom: 8, borderRadius: 8, overflow: "hidden" }}>
                <img src={imagePreview} alt="Uploaded diagram" style={{ width: "100%", display: "block", borderRadius: 8 }} />
                <button
                  type="button"
                  onClick={() => { setImageFile(null); setImagePreview(null); }}
                  style={{
                    position: "absolute", top: 6, right: 6,
                    background: "rgba(0,0,0,0.6)", border: "none", color: "#fff",
                    borderRadius: 4, cursor: "pointer", fontSize: 12, padding: "2px 6px",
                    fontFamily: "inherit",
                  }}
                >
                  ✕ Remove
                </button>
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={e => handleFile(e.target.files?.[0] || null)}
            />
          </>
        )}

        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder={tab === "image" ? "Optional: describe what to change / add..." : "E.g. Q4 content strategy with 4 pillars..."}
          rows={3}
          style={{
            width: "100%", background: "rgba(15,23,42,0.8)", border: `1px solid ${GOLD}33`,
            borderRadius: 8, padding: 10, color: "#e2e8f0", fontSize: 13,
            resize: "none", outline: "none", fontFamily: "inherit",
          }}
        />
        <button
          type="submit"
          disabled={loading || !canSubmit}
          style={{
            marginTop: 8, width: "100%", padding: "10px 0",
            background: loading ? "rgba(212,180,97,0.3)" : GOLD,
            color: loading ? "#94a3b8" : "#000",
            border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: canSubmit ? 1 : 0.5,
            fontFamily: "inherit",
          }}
        >
          {loading
            ? "Generating..."
            : tab === "image"
              ? "🔍 Recreate Board from Image"
              : "✨ Generate Board"}
        </button>
      </form>

      {/* Suggestions */}
      {tab === "prompt" && (
        <div style={{ flex: 1, overflow: "auto", padding: "12px 16px" }}>
          <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
            Try these prompts
          </div>
          {SUGGESTIONS.map((s, i) => (
            <div
              key={i}
              onClick={() => setPrompt(s)}
              style={{
                padding: "8px 10px", borderRadius: 8, cursor: "pointer",
                fontSize: 12, color: "#94a3b8", lineHeight: 1.4, marginBottom: 4,
                border: "1px solid transparent",
                transition: "all 0.15s",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = "rgba(212,180,97,0.08)";
                e.currentTarget.style.borderColor = `${GOLD}22`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.borderColor = "transparent";
              }}
            >
              {s}
            </div>
          ))}
        </div>
      )}

      {tab === "image" && (
        <div style={{ flex: 1, overflow: "auto", padding: "12px 16px" }}>
          <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
            How it works
          </div>
          <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.6 }}>
            1. Upload a screenshot of any diagram or board<br />
            2. Optionally add a prompt (e.g. "add more detail")<br />
            3. AI vision will analyze the image and recreate every node and connector<br />
            4. You can then edit, drag, and connect as needed
          </div>
          <div style={{ fontSize: 10, color: "#475569", marginTop: 12, padding: "8px 10px", border: `1px solid ${GOLD}11`, borderRadius: 8, background: "rgba(212,180,97,0.04)" }}>
            💡 Best for: flowcharts, org charts, mind maps, wireframes, whiteboard photos, Miro/Mural screenshots
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ padding: "8px 16px", borderTop: `1px solid ${GOLD}11`, fontSize: 10, color: "#475569", textAlign: "center" }}>
        {tab === "image" ? "Uses Groq Vision · Costs 10 credits" : "Generates nodes + connectors via AI · Costs 5 credits"}
      </div>
    </div>
  );
}
