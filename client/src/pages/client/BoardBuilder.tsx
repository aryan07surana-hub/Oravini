import { useState, useRef, useCallback } from "react";
import ClientLayout from "@/components/layout/ClientLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toPng } from "html-to-image";
import {
  LayoutTemplate, Download, Plus, Trash2, ImageIcon,
  Wand2, ArrowRight, X, GripVertical, Type, AlignLeft,
  Columns2, GitBranch, List, ChevronDown,
} from "lucide-react";

const GOLD = "#d4b461";

type CardType = "title" | "timeline" | "comparison" | "steps" | "bullets" | "note";

interface TimelineItem { label: string; image?: string; }
interface CompSide { title: string; points: string[]; color: string; }
interface BoardCard {
  id: string;
  type: CardType;
  text?: string;
  items?: TimelineItem[];
  left?: CompSide;
  right?: CompSide;
  points?: string[];
  title?: string;
  noteText?: string;
}

function uid() { return Math.random().toString(36).slice(2, 9); }

/* ── Parser ── */
function parseScript(raw: string): BoardCard[] {
  if (!raw.trim()) return [];
  const cards: BoardCard[] = [];
  const blocks = raw.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);

  for (const block of blocks) {
    const lines = block.split("\n").map(l => l.trim()).filter(Boolean);
    if (!lines.length) continue;

    // Comparison block — detect "wrong path" / "right path" etc.
    const wIdx = lines.findIndex(l => /wrong|bad path|don.t|avoid/i.test(l));
    const rIdx = lines.findIndex(l => /right|good path|correct|the fix|the solution/i.test(l));
    if (wIdx !== -1 && rIdx !== -1 && wIdx !== rIdx) {
      const mid = Math.max(wIdx, rIdx) - (wIdx < rIdx ? 0 : 1);
      const splitAt = wIdx < rIdx ? rIdx : wIdx;
      const leftLines = lines.slice(0, splitAt);
      const rightLines = lines.slice(splitAt);
      cards.push({
        id: uid(), type: "comparison",
        left:  { title: leftLines[0]  || "The Wrong Path", points: leftLines.slice(1),  color: "#ef4444" },
        right: { title: rightLines[0] || "The Right Path", points: rightLines.slice(1), color: "#22c55e" },
      });
      continue;
    }

    // Single "X vs Y" line
    if (lines.length === 1 && /\bvs\.?\b/i.test(lines[0])) {
      const [l, r] = lines[0].split(/\bvs\.?\b/i);
      cards.push({
        id: uid(), type: "comparison",
        left:  { title: l?.trim() || "Option A", points: [], color: "#ef4444" },
        right: { title: r?.trim() || "Option B", points: [], color: "#22c55e" },
      });
      continue;
    }

    // Arrow chain → steps  (→ or -> or =>)
    const hasArrows = lines.some(l => /[→\->]|=>/.test(l));
    if (hasArrows) {
      const allSteps: string[] = [];
      for (const line of lines) {
        const pts = line.split(/→|->|=>/).map(s => s.trim()).filter(Boolean);
        allSteps.push(...pts);
      }
      cards.push({ id: uid(), type: "steps", title: "", points: allSteps });
      continue;
    }

    // Numbered list → timeline
    if (lines.every(l => /^\d+[\.\)]/.test(l)) && lines.length >= 2) {
      const items: TimelineItem[] = lines.map(l => ({ label: l.replace(/^\d+[\.\)]\s*/, "") }));
      cards.push({ id: uid(), type: "timeline", items });
      continue;
    }

    // Dash/bullet list
    if (lines.every(l => /^[-•*]/.test(l)) && lines.length >= 2) {
      const pts = lines.map(l => l.replace(/^[-•*]\s*/, ""));
      if (pts.length <= 6) {
        cards.push({ id: uid(), type: "timeline", items: pts.map(label => ({ label })) });
      } else {
        cards.push({ id: uid(), type: "bullets", title: "", points: pts });
      }
      continue;
    }

    // Short single line → title
    if (lines.length === 1 && lines[0].length <= 120) {
      cards.push({ id: uid(), type: "title", text: lines[0] });
      continue;
    }

    // Multi-line → bullets with first line as title
    cards.push({ id: uid(), type: "bullets", title: lines[0], points: lines.slice(1) });
  }

  return cards;
}

/* ── Card type meta ── */
const TYPE_META: Record<CardType, { label: string; icon: any }> = {
  title:      { label: "Title",      icon: Type },
  timeline:   { label: "Timeline",   icon: LayoutTemplate },
  comparison: { label: "Compare",    icon: Columns2 },
  steps:      { label: "Steps",      icon: GitBranch },
  bullets:    { label: "Bullets",    icon: List },
  note:       { label: "Note",       icon: AlignLeft },
};

/* ── Image upload helper ── */
function useImageUpload(onDone: (dataUrl: string) => void) {
  const ref = useRef<HTMLInputElement>(null);
  const open = () => ref.current?.click();
  const el = (
    <input
      ref={ref}
      type="file"
      accept="image/*"
      className="hidden"
      onChange={e => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => onDone(ev.target?.result as string);
        reader.readAsDataURL(file);
        e.target.value = "";
      }}
    />
  );
  return { open, el };
}

/* ── Renderers ── */
function TitleCard({ card }: { card: BoardCard }) {
  return (
    <div className="w-full flex items-center justify-center py-8 px-10 rounded-2xl border border-zinc-700 bg-zinc-900/60">
      <p className="text-2xl md:text-3xl font-black text-center text-white leading-snug">{card.text}</p>
    </div>
  );
}

function TimelineCard({ card, onUpdate }: { card: BoardCard; onUpdate: (c: BoardCard) => void }) {
  const items = card.items || [];

  function uploadImg(idx: number) {
    const input = document.createElement("input");
    input.type = "file"; input.accept = "image/*";
    input.onchange = () => {
      const file = input.files?.[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        const newItems = items.map((it, i) =>
          i === idx ? { ...it, image: ev.target?.result as string } : it
        );
        onUpdate({ ...card, items: newItems });
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }

  return (
    <div className="w-full rounded-2xl border border-zinc-700 bg-zinc-900/60 p-5 overflow-x-auto">
      <div className="flex gap-3 min-w-max">
        {items.map((item, idx) => (
          <div key={idx} className="flex flex-col items-center gap-2 w-28">
            <button
              onClick={() => uploadImg(idx)}
              className="w-28 h-20 rounded-xl border-2 border-dashed border-zinc-600 hover:border-primary/60 bg-zinc-800 flex items-center justify-center overflow-hidden transition-colors"
            >
              {item.image
                ? <img src={item.image} className="w-full h-full object-cover rounded-xl" alt="" />
                : <ImageIcon className="w-6 h-6 text-zinc-500" />
              }
            </button>
            <p className="text-[11px] text-center text-zinc-300 leading-tight">{item.label}</p>
            {idx < items.length - 1 && (
              <ArrowRight className="absolute hidden" />
            )}
          </div>
        ))}
      </div>
      {/* Arrow row overlay */}
      <div className="flex items-center gap-0 mt-1 px-14">
        {items.slice(0, -1).map((_, idx) => (
          <div key={idx} className="flex-1 flex items-center justify-center">
            <div className="h-px flex-1" style={{ background: `${GOLD}50` }} />
            <ArrowRight className="w-3 h-3 flex-shrink-0" style={{ color: GOLD }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function ComparisonCard({ card, onUpdate }: { card: BoardCard; onUpdate: (c: BoardCard) => void }) {
  const left  = card.left  || { title: "The Wrong Path", points: [], color: "#ef4444" };
  const right = card.right || { title: "The Right Path", points: [], color: "#22c55e" };

  function uploadSide(side: "left" | "right") {
    const input = document.createElement("input");
    input.type = "file"; input.accept = "image/*";
    input.onchange = () => {
      const file = input.files?.[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        onUpdate({ ...card, [side]: { ...card[side]!, image: ev.target?.result as string } } as BoardCard);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }

  function SideBox({ side, data }: { side: "left" | "right"; data: CompSide }) {
    return (
      <div className="flex-1 rounded-2xl border p-6" style={{ borderColor: `${data.color}40`, background: `${data.color}08` }}>
        <p className="text-base font-bold mb-3 text-center" style={{ color: data.color }}>{data.title}</p>
        {(data as any).image && (
          <img src={(data as any).image} className="w-full h-28 object-cover rounded-xl mb-3" alt="" />
        )}
        <div className="space-y-1.5">
          {data.points.map((pt, i) => (
            <p key={i} className="text-xs text-zinc-300 text-center leading-relaxed">{pt}</p>
          ))}
        </div>
        <button
          onClick={() => uploadSide(side)}
          className="mt-4 w-full text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors flex items-center justify-center gap-1"
        >
          <ImageIcon className="w-3 h-3" /> Add photo
        </button>
      </div>
    );
  }

  return (
    <div className="w-full rounded-2xl border border-zinc-700 bg-zinc-900/60 p-5">
      <div className="flex gap-4">
        <SideBox side="left"  data={left}  />
        <SideBox side="right" data={right} />
      </div>
    </div>
  );
}

function StepsCard({ card }: { card: BoardCard }) {
  const pts = card.points || [];
  return (
    <div className="w-full rounded-2xl border border-zinc-700 bg-zinc-900/60 p-6">
      {card.title && <p className="text-sm font-bold text-white mb-4 text-center">{card.title}</p>}
      <div className="flex flex-wrap items-center gap-2 justify-center">
        {pts.map((pt, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <div
              className="px-4 py-2 rounded-xl text-xs font-semibold text-center border"
              style={{ borderColor: `${GOLD}40`, background: `${GOLD}10`, color: "#fff" }}
            >
              {pt}
            </div>
            {idx < pts.length - 1 && (
              <ArrowRight className="w-4 h-4 flex-shrink-0" style={{ color: GOLD }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function BulletsCard({ card }: { card: BoardCard }) {
  const pts = card.points || [];
  return (
    <div className="w-full rounded-2xl border border-zinc-700 bg-zinc-900/60 p-6">
      {card.title && <p className="text-sm font-bold text-white mb-3">{card.title}</p>}
      <ul className="space-y-2">
        {pts.map((pt, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-zinc-300">
            <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: GOLD }} />
            {pt}
          </li>
        ))}
      </ul>
    </div>
  );
}

function NoteCard({ card }: { card: BoardCard }) {
  return (
    <div
      className="w-full rounded-2xl p-6 border"
      style={{ background: `${GOLD}08`, borderColor: `${GOLD}30` }}
    >
      <p className="text-sm text-zinc-300 leading-relaxed text-center italic">{card.noteText || card.text}</p>
    </div>
  );
}

function CardRenderer({ card, onUpdate }: { card: BoardCard; onUpdate: (c: BoardCard) => void }) {
  switch (card.type) {
    case "title":      return <TitleCard card={card} />;
    case "timeline":   return <TimelineCard card={card} onUpdate={onUpdate} />;
    case "comparison": return <ComparisonCard card={card} onUpdate={onUpdate} />;
    case "steps":      return <StepsCard card={card} />;
    case "bullets":    return <BulletsCard card={card} />;
    case "note":       return <NoteCard card={card} />;
    default:           return null;
  }
}

/* ── Type picker pill ── */
function TypePicker({ value, onChange }: { value: CardType; onChange: (t: CardType) => void }) {
  const [open, setOpen] = useState(false);
  const { icon: Icon, label } = TYPE_META[value];
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-zinc-400 bg-zinc-800 hover:bg-zinc-700 transition-colors"
      >
        <Icon className="w-3 h-3" />
        {label}
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <div className="absolute top-8 left-0 z-50 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl py-1 w-36">
          {(Object.keys(TYPE_META) as CardType[]).map(t => {
            const { icon: MIcon, label: mLabel } = TYPE_META[t];
            return (
              <button
                key={t}
                onClick={() => { onChange(t); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-700 transition-colors"
              >
                <MIcon className="w-3 h-3" />
                {mLabel}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Card wrapper (edit mode) ── */
function EditableCard({
  card,
  onUpdate,
  onDelete,
}: {
  card: BoardCard;
  onUpdate: (c: BoardCard) => void;
  onDelete: () => void;
}) {
  return (
    <div className="group relative">
      {/* Controls */}
      <div className="flex items-center gap-2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical className="w-4 h-4 text-zinc-600 cursor-grab" />
        <TypePicker value={card.type} onChange={type => onUpdate({ ...card, type })} />
        <div className="ml-auto">
          <button
            onClick={onDelete}
            className="p-1 rounded hover:bg-zinc-800 text-zinc-600 hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <CardRenderer card={card} onUpdate={onUpdate} />
    </div>
  );
}

/* ── Empty state ── */
function EmptyCanvas() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-20">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: `${GOLD}15` }}>
        <LayoutTemplate className="w-8 h-8" style={{ color: GOLD }} />
      </div>
      <p className="text-white font-bold text-lg">Your board is empty</p>
      <p className="text-zinc-500 text-sm max-w-xs">
        Paste your script in the panel on the left and click <strong className="text-zinc-300">Generate Board</strong> — or add sections manually.
      </p>
    </div>
  );
}

/* ── Main component ── */
export default function BoardBuilder() {
  const [script, setScript] = useState("");
  const [cards, setCards] = useState<BoardCard[]>([]);
  const [exporting, setExporting] = useState(false);
  const [bgDark, setBgDark] = useState(true);
  const canvasRef = useRef<HTMLDivElement>(null);

  function generate() {
    const parsed = parseScript(script);
    setCards(parsed.length ? parsed : [{ id: uid(), type: "title", text: "Your title goes here" }]);
  }

  function updateCard(id: string, updated: BoardCard) {
    setCards(cs => cs.map(c => c.id === id ? updated : c));
  }

  function deleteCard(id: string) {
    setCards(cs => cs.filter(c => c.id !== id));
  }

  function addCard(type: CardType) {
    const defaults: Record<CardType, Partial<BoardCard>> = {
      title:      { text: "Your title" },
      timeline:   { items: [{ label: "Step 1" }, { label: "Step 2" }, { label: "Step 3" }] },
      comparison: {
        left:  { title: "The Wrong Path", points: ["Point 1", "Point 2"], color: "#ef4444" },
        right: { title: "The Right Path", points: ["Point 1", "Point 2"], color: "#22c55e" },
      },
      steps:      { title: "", points: ["Start", "Middle", "End"] },
      bullets:    { title: "Key points", points: ["Point 1", "Point 2", "Point 3"] },
      note:       { noteText: "It's not your fault. Nobody showed you the system." },
    };
    setCards(cs => [...cs, { id: uid(), type, ...defaults[type] } as BoardCard]);
  }

  async function exportPng() {
    if (!canvasRef.current) return;
    setExporting(true);
    try {
      const dataUrl = await toPng(canvasRef.current, { pixelRatio: 2 });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = "oravini-board.png";
      a.click();
    } finally {
      setExporting(false);
    }
  }

  return (
    <ClientLayout>
      <div className="min-h-screen bg-background flex flex-col">

        {/* Header */}
        <div className="border-b border-zinc-800 px-6 py-4 flex items-center gap-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${GOLD}15` }}>
            <LayoutTemplate className="w-5 h-5" style={{ color: GOLD }} />
          </div>
          <div>
            <h1 className="text-base font-black text-white">Board Builder</h1>
            <p className="text-xs text-zinc-500">Paste your script → auto-generate a visual board for YouTube</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setBgDark(b => !b)}
              className="text-xs text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg border border-zinc-700 hover:border-zinc-500 transition-colors"
            >
              {bgDark ? "Light BG" : "Dark BG"}
            </button>
            <Button
              onClick={exportPng}
              disabled={!cards.length || exporting}
              size="sm"
              className="gap-2 font-bold"
              style={{ background: GOLD, color: "#000" }}
            >
              <Download className="w-4 h-4" />
              {exporting ? "Exporting…" : "Export PNG"}
            </Button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">

          {/* Left panel — Script input */}
          <div className="w-72 flex-shrink-0 border-r border-zinc-800 flex flex-col bg-zinc-950">
            <div className="p-4 flex-1 flex flex-col gap-3 overflow-y-auto">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Your Script</p>
              <Textarea
                data-testid="input-script"
                value={script}
                onChange={e => setScript(e.target.value)}
                placeholder={`Paste your outline or script here…\n\nExample:\n\nHow I went from 0 → 10k followers\n\n- Factory worker\n- Found FB ads\n- First campaign\n- Started scaling\n- Brand scaling\n\nWhy most beginners never sign their first client\n\nThe wrong path:\nlearn → overprepare\nmake it perfect → never start\nor never start at all\n\nThe right path:\noutreach → trial → proof\nretainer → scale\nrepeat`}
                className="flex-1 min-h-[320px] text-xs bg-zinc-900 border-zinc-700 text-zinc-300 resize-none font-mono leading-relaxed"
              />
              <Button
                data-testid="button-generate"
                onClick={generate}
                className="w-full gap-2 font-bold"
                style={{ background: GOLD, color: "#000" }}
              >
                <Wand2 className="w-4 h-4" />
                Generate Board
              </Button>

              <div className="border-t border-zinc-800 pt-3 mt-1">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Add section</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {(Object.keys(TYPE_META) as CardType[]).map(t => {
                    const { icon: Icon, label } = TYPE_META[t];
                    return (
                      <button
                        key={t}
                        data-testid={`add-card-${t}`}
                        onClick={() => addCard(t)}
                        className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-[11px] font-medium text-zinc-400 bg-zinc-800 hover:bg-zinc-700 hover:text-white transition-colors"
                      >
                        <Icon className="w-3 h-3 flex-shrink-0" />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Right — Canvas */}
          <div className="flex-1 overflow-auto p-6">
            <div
              ref={canvasRef}
              data-testid="board-canvas"
              className="min-h-full rounded-2xl p-8 transition-colors"
              style={{ background: bgDark ? "#0a0a0a" : "#ffffff", minWidth: 600 }}
            >
              {!cards.length ? (
                <EmptyCanvas />
              ) : (
                <div className="space-y-5">
                  {cards.map(card => (
                    <EditableCard
                      key={card.id}
                      card={card}
                      onUpdate={updated => updateCard(card.id, updated)}
                      onDelete={() => deleteCard(card.id)}
                    />
                  ))}
                  <button
                    data-testid="button-add-section"
                    onClick={() => addCard("title")}
                    className="w-full py-3 rounded-2xl border-2 border-dashed border-zinc-700 hover:border-primary/40 text-zinc-600 hover:text-zinc-400 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Add section
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </ClientLayout>
  );
}
