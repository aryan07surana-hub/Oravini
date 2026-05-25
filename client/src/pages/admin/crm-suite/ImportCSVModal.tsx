import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, CheckCircle2, X } from "lucide-react";
import { parseCSV } from "./csv";

const GOLD = "#d4b461";

export function ImportCSVModal({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<{ headers: string[]; rows: Record<string, string>[] } | null>(null);
  const [dedupBy, setDedupBy] = useState<"email" | "phone" | "none">("email");

  const importMut = useMutation({
    mutationFn: (rows: Record<string, string>[]) => apiRequest("POST", "/api/crm-suite/contacts/import-csv", { rows, dedupBy }),
    onSuccess: (r: any) => {
      toast({ title: "Import complete", description: `+${r.inserted} new, ↻${r.updated} updated, ⏭${r.skipped} skipped` });
      queryClient.invalidateQueries();
      onClose();
    },
    onError: (e: any) => toast({ title: "Import failed", description: e.message, variant: "destructive" }),
  });

  const onFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      const t = String(e.target?.result || "");
      setText(t);
      setParsed(parseCSV(t));
    };
    reader.readAsText(file);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "#0a0a0c", border: `1px solid ${GOLD}33`, borderRadius: 16, width: "min(720px, 100%)", maxHeight: "88vh", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "18px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>Import contacts</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>Upload a CSV. Recognized columns: firstName, lastName, email, phone, company, title, status, source, score, tags (pipe or comma separated), notes.</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)", borderRadius: 8, padding: "8px 10px", cursor: "pointer" }}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div style={{ padding: 24, flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
          {!parsed && (
            <label
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) onFile(f); }}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10,
                padding: "44px 20px", border: `2px dashed ${GOLD}44`, borderRadius: 14, cursor: "pointer",
                background: "rgba(255,255,255,0.02)",
              }}
            >
              <Upload className="w-7 h-7" style={{ color: GOLD }} />
              <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>Drop a CSV here, or click to browse</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>Up to 5,000 rows per import</div>
              <input type="file" accept=".csv,text/csv" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
            </label>
          )}

          {parsed && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "rgba(212,180,97,0.06)", border: `1px solid ${GOLD}33`, borderRadius: 10 }}>
                <FileText className="w-4 h-4" style={{ color: GOLD }} />
                <div style={{ flex: 1, fontSize: 13, color: "#fff" }}>
                  <strong>{parsed.rows.length}</strong> row{parsed.rows.length === 1 ? "" : "s"} ready · {parsed.headers.length} columns detected
                </div>
                <button onClick={() => { setText(""); setParsed(null); }} style={{ background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "4px 10px", color: "rgba(255,255,255,0.6)", fontSize: 11, cursor: "pointer" }}>
                  Clear
                </button>
              </div>

              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: GOLD, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>Dedup strategy</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {([
                    ["email", "By email", "Update existing if same email"],
                    ["phone", "By phone", "Update existing if same phone"],
                    ["none", "Don't dedup", "Insert every row as a new contact"],
                  ] as const).map(([v, l, h]) => (
                    <button key={v} onClick={() => setDedupBy(v)}
                      style={{
                        flex: 1, textAlign: "left",
                        background: dedupBy === v ? `${GOLD}18` : "rgba(255,255,255,0.03)",
                        border: `1px solid ${dedupBy === v ? GOLD + "66" : "rgba(255,255,255,0.06)"}`,
                        color: dedupBy === v ? GOLD : "rgba(255,255,255,0.7)",
                        borderRadius: 10, padding: "10px 14px", cursor: "pointer",
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 700 }}>{l}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>{h}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: GOLD, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>Preview · first 5 rows</div>
                <div style={{ overflowX: "auto", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr>
                        {parsed.headers.map(h => (
                          <th key={h} style={{ textAlign: "left", padding: "8px 10px", background: "rgba(0,0,0,0.4)", color: "rgba(255,255,255,0.6)", borderBottom: "1px solid rgba(255,255,255,0.06)", whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parsed.rows.slice(0, 5).map((r, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                          {parsed.headers.map(h => (
                            <td key={h} style={{ padding: "8px 10px", color: "rgba(255,255,255,0.8)", whiteSpace: "nowrap", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis" }}>{r[h]}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        <div style={{ padding: "14px 24px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} style={{ background: "none", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", borderRadius: 10, padding: "10px 18px", cursor: "pointer", fontSize: 13 }}>
            Cancel
          </button>
          <button
            disabled={!parsed?.rows.length || importMut.isPending}
            onClick={() => parsed && importMut.mutate(parsed.rows)}
            style={{
              background: parsed?.rows.length ? `linear-gradient(135deg, ${GOLD}, #b8962e)` : "rgba(255,255,255,0.04)",
              color: parsed?.rows.length ? "#000" : "rgba(255,255,255,0.3)",
              border: "none", borderRadius: 10, padding: "10px 22px", fontWeight: 800, fontSize: 13,
              cursor: parsed?.rows.length ? "pointer" : "not-allowed",
              display: "flex", alignItems: "center", gap: 8,
            }}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {importMut.isPending ? "Importing…" : `Import ${parsed?.rows.length ?? 0} contacts`}
          </button>
        </div>
      </div>
    </div>
  );
}
