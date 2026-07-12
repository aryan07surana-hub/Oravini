import { useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import {
  format, startOfWeek, addDays, addWeeks, subWeeks, isToday, isSameWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight, CheckCircle2, Circle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const GOLD = "#d4b461";
const STORAGE_KEY = "admin_content_tracker_v2";

const PLATFORMS = [
  { id: "instagram", label: "Instagram", emoji: "📸", target: 6, accent: "#e1306c", bg: "rgba(225,48,108,0.12)", border: "rgba(225,48,108,0.3)" },
  { id: "twitter",   label: "X / Twitter", emoji: "𝕏", target: 6, accent: "#ffffff", bg: "rgba(255,255,255,0.07)", border: "rgba(255,255,255,0.15)" },
  { id: "linkedin",  label: "LinkedIn",   emoji: "💼", target: 6, accent: "#0a66c2", bg: "rgba(10,102,194,0.12)", border: "rgba(10,102,194,0.35)" },
  { id: "youtube",   label: "YouTube",    emoji: "▶️", target: 2, accent: "#ff0000", bg: "rgba(255,0,0,0.10)", border: "rgba(255,0,0,0.3)" },
] as const;

type PlatformId = typeof PLATFORMS[number]["id"];
type PostEntry = { done: boolean; note: string };
type WeekData = Record<PlatformId, PostEntry[]>; // [7] per platform
type AllData = Record<string, WeekData>; // weekKey -> data

function weekKey(weekStart: Date) {
  return format(weekStart, "yyyy-MM-dd");
}

function getWeekStart(ref: Date) {
  return startOfWeek(ref, { weekStartsOn: 1 });
}

function emptyWeek(): WeekData {
  const entry = (): PostEntry[] => Array.from({ length: 7 }, () => ({ done: false, note: "" }));
  return {
    instagram: entry(),
    twitter:   entry(),
    linkedin:  entry(),
    youtube:   entry(),
  };
}

function load(): AllData {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
}

function save(d: AllData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
}

export default function AdminContentTracker() {
  const [weekRef, setWeekRef] = useState(new Date());
  const [data, setData] = useState<AllData>(load);
  const [editCell, setEditCell] = useState<{ platform: PlatformId; dayIdx: number } | null>(null);
  const [noteInput, setNoteInput] = useState("");

  const ws = getWeekStart(weekRef);
  const wk = weekKey(ws);
  const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  const week: WeekData = data[wk] || emptyWeek();

  function updateData(next: WeekData) {
    const updated = { ...data, [wk]: next };
    setData(updated);
    save(updated);
  }

  function togglePost(platform: PlatformId, dayIdx: number) {
    const entries = [...week[platform]];
    entries[dayIdx] = { ...entries[dayIdx], done: !entries[dayIdx].done };
    updateData({ ...week, [platform]: entries });
  }

  function openNote(platform: PlatformId, dayIdx: number) {
    setEditCell({ platform, dayIdx });
    setNoteInput(week[platform][dayIdx].note);
  }

  function saveNote() {
    if (!editCell) return;
    const { platform, dayIdx } = editCell;
    const entries = [...week[platform]];
    entries[dayIdx] = { ...entries[dayIdx], note: noteInput.trim() };
    updateData({ ...week, [platform]: entries });
    setEditCell(null);
    setNoteInput("");
  }

  const isCurrentWeek = isSameWeek(new Date(), ws, { weekStartsOn: 1 });

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-7">
          <div>
            <h1 className="text-2xl font-bold text-white">Content Tracker</h1>
            <p className="text-zinc-400 text-sm mt-0.5">Weekly posting schedule — stay consistent, hit your targets</p>
          </div>
          {isCurrentWeek && (
            <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: `${GOLD}18`, border: `1px solid ${GOLD}40`, color: GOLD }}>
              This Week
            </span>
          )}
        </div>

        {/* Week navigator */}
        <div className="flex items-center justify-between mb-6 px-4 py-3 rounded-2xl border border-zinc-800 bg-zinc-900/40">
          <button
            onClick={() => setWeekRef(d => subWeeks(d, 1))}
            className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-zinc-400" />
          </button>
          <div className="text-center">
            <p className="text-sm font-bold text-white">
              {format(ws, "MMM d")} – {format(addDays(ws, 6), "MMM d, yyyy")}
            </p>
            {!isCurrentWeek && (
              <button
                onClick={() => setWeekRef(new Date())}
                className="text-[11px] mt-0.5 font-medium"
                style={{ color: GOLD }}
              >
                Jump to this week
              </button>
            )}
          </div>
          <button
            onClick={() => setWeekRef(d => addWeeks(d, 1))}
            className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-zinc-400" />
          </button>
        </div>

        {/* Platform summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-7">
          {PLATFORMS.map(p => {
            const done = week[p.id].filter(e => e.done).length;
            const pct = Math.round((done / p.target) * 100);
            return (
              <div
                key={p.id}
                className="rounded-2xl border p-4"
                style={{ background: p.bg, borderColor: p.border }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">{p.emoji}</span>
                  <span className="text-xs font-bold text-white truncate">{p.label}</span>
                </div>
                <div className="flex items-end justify-between mb-2">
                  <span className="text-2xl font-black text-white">{done}</span>
                  <span className="text-xs text-zinc-500 pb-0.5">/ {p.target} target</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(pct, 100)}%`,
                      background: done >= p.target ? "#4ade80" : p.accent,
                    }}
                  />
                </div>
                <p className="text-[10px] text-zinc-500 mt-1.5">
                  {done >= p.target ? "✅ Target hit!" : `${p.target - done} more to go`}
                </p>
              </div>
            );
          })}
        </div>

        {/* Weekly grid */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
          {/* Day header */}
          <div className="grid border-b border-zinc-800" style={{ gridTemplateColumns: "160px repeat(7, 1fr)" }}>
            <div className="px-4 py-3 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Platform</div>
            {days.map((d, i) => {
              const today = isToday(d);
              return (
                <div
                  key={i}
                  className="py-3 text-center border-l border-zinc-800"
                  style={today ? { background: `${GOLD}0a` } : {}}
                >
                  <p className={`text-[10px] font-semibold uppercase tracking-wider ${today ? "text-yellow-400" : "text-zinc-500"}`}>
                    {format(d, "EEE")}
                  </p>
                  <p className={`text-sm font-bold mt-0.5 ${today ? "text-yellow-300" : "text-zinc-300"}`}>
                    {format(d, "d")}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Platform rows */}
          {PLATFORMS.map((p, pi) => (
            <div
              key={p.id}
              className={`grid ${pi < PLATFORMS.length - 1 ? "border-b border-zinc-800/60" : ""}`}
              style={{ gridTemplateColumns: "160px repeat(7, 1fr)" }}
            >
              {/* Platform label */}
              <div className="px-4 py-4 flex items-center gap-2.5 border-r border-zinc-800/60">
                <span className="text-lg">{p.emoji}</span>
                <div>
                  <p className="text-xs font-bold text-white leading-tight">{p.label}</p>
                  <p className="text-[10px] text-zinc-600 mt-0.5">{p.target}/week</p>
                </div>
              </div>

              {/* Day cells */}
              {days.map((d, di) => {
                const entry = week[p.id][di];
                const today = isToday(d);
                return (
                  <div
                    key={di}
                    className="border-l border-zinc-800/60 py-3 px-1 flex flex-col items-center gap-1.5 group"
                    style={today ? { background: `${GOLD}06` } : {}}
                  >
                    <button
                      onClick={() => togglePost(p.id, di)}
                      className="transition-all duration-200"
                      title={entry.done ? "Mark as not posted" : "Mark as posted"}
                    >
                      {entry.done
                        ? <CheckCircle2 className="w-6 h-6" style={{ color: p.accent === "#ffffff" ? "#a3a3a3" : p.accent }} />
                        : <Circle className="w-6 h-6 text-zinc-700 group-hover:text-zinc-500 transition-colors" />}
                    </button>
                    <button
                      onClick={() => openNote(p.id, di)}
                      className={`text-[9px] font-medium leading-tight text-center px-1 rounded transition-all max-w-[52px] truncate ${
                        entry.note
                          ? "text-zinc-400 hover:text-zinc-200"
                          : "text-zinc-700 hover:text-zinc-500 opacity-0 group-hover:opacity-100"
                      }`}
                      title={entry.note || "Add note"}
                    >
                      {entry.note || "+ note"}
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Weekly total */}
        <div className="mt-4 flex items-center justify-end gap-2">
          <span className="text-xs text-zinc-600">Total posts this week:</span>
          <span className="text-sm font-bold text-white">
            {PLATFORMS.reduce((acc, p) => acc + week[p.id].filter(e => e.done).length, 0)}
          </span>
          <span className="text-xs text-zinc-600">/ {PLATFORMS.reduce((acc, p) => acc + p.target, 0)} target</span>
        </div>

      </div>

      {/* Note modal */}
      {editCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setEditCell(null)}>
          <div
            className="w-80 rounded-2xl border border-zinc-700 bg-zinc-900 p-5 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold text-white">
                {PLATFORMS.find(p => p.id === editCell.platform)?.emoji}{" "}
                {format(days[editCell.dayIdx], "EEEE, MMM d")}
              </p>
              <button onClick={() => setEditCell(null)} className="text-zinc-500 hover:text-zinc-300">
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              autoFocus
              value={noteInput}
              onChange={e => setNoteInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") saveNote(); if (e.key === "Escape") setEditCell(null); }}
              placeholder="Post title or note..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-200 outline-none focus:border-zinc-500 placeholder:text-zinc-600"
            />
            <div className="flex gap-2 mt-3">
              <Button onClick={saveNote} size="sm" className="flex-1" style={{ background: GOLD, color: "#000" }}>
                Save
              </Button>
              <Button onClick={() => setEditCell(null)} size="sm" variant="ghost" className="text-zinc-500">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
