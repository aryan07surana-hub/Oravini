import { useState } from "react";
import { ArrowLeft, Check, LayoutTemplate, Monitor, Smartphone, X } from "lucide-react";
import { PAGE_TEMPLATES, TEMPLATE_CATEGORIES, type PageTemplate, type TemplateCategory } from "@shared/pageTemplates";
import ThemedPage from "./ThemedPage";

const GOLD = "#d4b461";
const PANEL = "#0a0a12";
const BORDER = "rgba(255,255,255,0.08)";

/** Live, scaled-down render of a template (real renderer, not a screenshot). */
export function TemplateThumb({ tpl, height = 220 }: { tpl: PageTemplate; height?: number }) {
  const W = 1280, scale = 0.25;
  return (
    <div className="relative w-full overflow-hidden" style={{ height, background: tpl.theme.palette.bg }}>
      <div style={{ width: W, transform: `scale(${scale})`, transformOrigin: "top left", position: "absolute", top: 0, left: 0 }}>
        <ThemedPage theme={tpl.theme} sections={tpl.sections} thumbnail />
      </div>
    </div>
  );
}

export default function TemplateGallery({ open, onClose, onSelect, initialCategory = "landing", title = "Choose a template", busy, confirmLabel = "Use this template" }: {
  open: boolean;
  onClose: () => void;
  onSelect: (tpl: PageTemplate) => void;
  initialCategory?: TemplateCategory;
  title?: string;
  busy?: boolean;
  confirmLabel?: string;
}) {
  const [cat, setCat] = useState<TemplateCategory>(initialCategory);
  const [preview, setPreview] = useState<PageTemplate | null>(null);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  if (!open) return null;
  const list = PAGE_TEMPLATES.filter(t => t.category === cat);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }} onClick={onClose} data-testid="template-gallery">
      <div className="w-full max-w-6xl h-[88vh] rounded-2xl overflow-hidden flex flex-col" style={{ background: PANEL, border: `1px solid ${BORDER}` }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: BORDER }}>
          {preview ? (
            <button onClick={() => setPreview(null)} className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-white"><ArrowLeft className="w-4 h-4" />All templates</button>
          ) : (
            <><LayoutTemplate className="w-5 h-5" style={{ color: GOLD }} /><p className="font-black text-white">{title}</p></>
          )}
          <div className="flex-1" />
          {preview && (
            <>
              <div className="flex gap-1 p-1 rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }}>
                {(["desktop", "mobile"] as const).map(d => (
                  <button key={d} onClick={() => setDevice(d)} className="px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1" style={{ background: device === d ? `${GOLD}20` : "transparent", color: device === d ? GOLD : "#71717a" }}>
                    {d === "desktop" ? <Monitor className="w-3.5 h-3.5" /> : <Smartphone className="w-3.5 h-3.5" />}{d === "desktop" ? "Desktop" : "Mobile"}
                  </button>
                ))}
              </div>
              <button data-testid="template-use" disabled={busy} onClick={() => onSelect(preview)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black disabled:opacity-50" style={{ background: GOLD, color: "#0a0910" }}>
                <Check className="w-3.5 h-3.5" />{busy ? "Applying…" : confirmLabel}
              </button>
            </>
          )}
          <button onClick={onClose} className="text-zinc-500 hover:text-white ml-2" aria-label="Close"><X className="w-5 h-5" /></button>
        </div>

        {preview ? (
          <div className="flex-1 overflow-auto p-4 flex justify-center" style={{ background: "#020204" }}>
            <div className="w-full overflow-hidden rounded-xl" style={{ maxWidth: device === "mobile" ? 390 : "100%", border: `1px solid ${BORDER}` }} data-testid="template-preview">
              <ThemedPage theme={preview.theme} sections={preview.sections} device={device} />
            </div>
          </div>
        ) : (
          <>
            <div className="flex gap-1 px-5 pt-4 flex-wrap">
              {TEMPLATE_CATEGORIES.map(c => {
                const count = PAGE_TEMPLATES.filter(t => t.category === c.id).length;
                return (
                  <button key={c.id} data-testid={`template-cat-${c.id}`} onClick={() => setCat(c.id)} className="px-3 py-1.5 rounded-full text-xs font-bold transition-colors"
                    style={{ background: cat === c.id ? `${GOLD}1c` : "rgba(255,255,255,0.03)", color: cat === c.id ? GOLD : "#a1a1aa", border: `1px solid ${cat === c.id ? GOLD + "45" : BORDER}` }}>
                    {c.label} <span className="opacity-60">{count}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex-1 overflow-auto p-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 content-start">
              {list.map(tpl => (
                <button key={tpl.id} data-testid={`template-card-${tpl.id}`} onClick={() => setPreview(tpl)}
                  className="text-left rounded-xl overflow-hidden transition-all hover:-translate-y-0.5 group" style={{ border: `1px solid ${BORDER}`, background: "#0e0e16" }}>
                  <TemplateThumb tpl={tpl} />
                  <div className="p-3.5">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-black text-white flex-1">{tpl.name}</p>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${tpl.theme.palette.primary}22`, color: tpl.theme.palette.primary }}>{tpl.theme.name}</span>
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-1">{tpl.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
