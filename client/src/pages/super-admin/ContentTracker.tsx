import SuperAdminLayout from "./Layout";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  BarChart3, ChevronLeft, ChevronRight, Plus, Trash2,
  X, Settings, RotateCcw, Check,
} from "lucide-react";

const GOLD = "#d4b461";
const PLATFORMS_KEY = "content_platforms_v1";
const POSTS_KEY     = "content_posts_v1";

type SubGoal = { label: string; postType: string; weeklyMin: number; weeklyMax: number };
type Platform = {
  id: string; name: string; emoji: string; color: string;
  weeklyMin: number; weeklyMax: number;
  postTypes: string[]; subGoals: SubGoal[];
};
type Post = { id: string; platformId: string; type: string; note: string };

const DEFAULT_PLATFORMS: Platform[] = [
  {
    id: "instagram", name: "Instagram", emoji: "📸", color: "#E1306C",
    weeklyMin: 7, weeklyMax: 8,
    postTypes: ["Reel", "Trial Reel", "Carousel", "Post", "Story"],
    subGoals: [{ label: "Carousels", postType: "Carousel", weeklyMin: 2, weeklyMax: 2 }],
  },
  {
    id: "linkedin", name: "LinkedIn", emoji: "💼", color: "#0077B5",
    weeklyMin: 5, weeklyMax: 6,
    postTypes: ["Post", "Article", "Video", "Newsletter"],
    subGoals: [],
  },
  {
    id: "twitter", name: "X / Twitter", emoji: "𝕏", color: "#888",
    weeklyMin: 6, weeklyMax: 6,
    postTypes: ["Tweet", "Thread", "Reply"],
    subGoals: [],
  },
  {
    id: "youtube", name: "YouTube", emoji: "▶️", color: "#FF0000",
    weeklyMin: 2, weeklyMax: 3,
    postTypes: ["Video", "Short", "Community Post"],
    subGoals: [],
  },
];

const DAY_NAMES   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function uid()            { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
function toKey(d: Date)   { return d.toISOString().slice(0, 10); }
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function startOfWeek(d: Date) { const r = new Date(d); r.setDate(r.getDate() - r.getDay()); return r; }

function loadPlatforms(): Platform[] {
  try { return JSON.parse(localStorage.getItem(PLATFORMS_KEY) || "null") || DEFAULT_PLATFORMS; } catch { return DEFAULT_PLATFORMS; }
}
function savePlatforms(p: Platform[]) { localStorage.setItem(PLATFORMS_KEY, JSON.stringify(p)); }
function loadPosts(): Record<string, Post[]> {
  try { return JSON.parse(localStorage.getItem(POSTS_KEY) || "{}"); } catch { return {}; }
}
function savePosts(p: Record<string, Post[]>) { localStorage.setItem(POSTS_KEY, JSON.stringify(p)); }

export default function ContentTracker() {
  const today = new Date();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekStart, setWeekStart]       = useState(() => startOfWeek(new Date()));
  const dateKey = toKey(selectedDate);
  const isToday = dateKey === toKey(today);

  const [platforms, setPlatforms]       = useState<Platform[]>(loadPlatforms);
  const [allPosts, setAllPosts]         = useState<Record<string, Post[]>>(loadPosts);
  const [showEditGoals, setShowEditGoals]       = useState(false);
  const [editingPlatforms, setEditingPlatforms] = useState<Platform[]>([]);
  const [addingPost, setAddingPost]     = useState<Record<string, { type: string; note: string } | null>>({});

  const weekDays  = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekKeys  = weekDays.map(toKey);
  const weekPosts = weekKeys.flatMap(k => allPosts[k] || []);
  const dayPosts  = allPosts[dateKey] || [];

  function weekCountFor(platformId: string) {
    return weekPosts.filter(p => p.platformId === platformId).length;
  }
  function weekSubCount(platformId: string, postType: string) {
    return weekPosts.filter(p => p.platformId === platformId && p.type === postType).length;
  }
  function dayCountFor(d: Date) { return (allPosts[toKey(d)] || []).length; }

  function updatePosts(next: Record<string, Post[]>) { setAllPosts(next); savePosts(next); }

  function addPost(platformId: string) {
    const state = addingPost[platformId];
    if (!state?.type) return;
    const post: Post = { id: uid(), platformId, type: state.type, note: state.note };
    updatePosts({ ...allPosts, [dateKey]: [...dayPosts, post] });
    setAddingPost(prev => ({ ...prev, [platformId]: null }));
  }

  function deletePost(postId: string) {
    updatePosts({ ...allPosts, [dateKey]: dayPosts.filter(p => p.id !== postId) });
  }

  function openEditGoals() {
    setEditingPlatforms(JSON.parse(JSON.stringify(platforms)));
    setShowEditGoals(true);
  }

  function saveGoals() {
    setPlatforms(editingPlatforms);
    savePlatforms(editingPlatforms);
    setShowEditGoals(false);
  }

  function selectDay(d: Date) {
    setSelectedDate(d);
    const ws = startOfWeek(d);
    if (toKey(ws) !== toKey(weekStart)) setWeekStart(ws);
  }

  function prevWeek() { setWeekStart(addDays(weekStart, -7)); setSelectedDate(addDays(selectedDate, -7)); }
  function nextWeek() { setWeekStart(addDays(weekStart,  7)); setSelectedDate(addDays(selectedDate,  7)); }

  const weekMonth = `${MONTH_NAMES[weekStart.getMonth()]} ${weekStart.getFullYear()}`;

  return (
    <SuperAdminLayout>
      <div className="max-w-3xl mx-auto space-y-5">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="w-5 h-5" style={{ color: GOLD }} /> Content Tracker
          </h1>
          <Button
            size="sm"
            variant="outline"
            onClick={showEditGoals ? () => setShowEditGoals(false) : openEditGoals}
            className="gap-1.5 text-xs"
          >
            <Settings className="w-3.5 h-3.5" />
            {showEditGoals ? "Close" : "Edit Goals"}
          </Button>
        </div>

        {/* ── Edit Goals Panel ────────────────────────────────────────────────── */}
        {showEditGoals && (
          <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Weekly Goals</p>
            {editingPlatforms.map((p, pi) => (
              <div key={p.id} className="space-y-2.5 pb-4 border-b border-border last:border-0 last:pb-0">
                <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <span className="text-base">{p.emoji}</span> {p.name}
                </p>
                <div className="flex items-center gap-3 ml-6">
                  <span className="text-xs text-muted-foreground w-24">Posts / week</span>
                  <Input
                    type="number" min={0} value={p.weeklyMin}
                    onChange={e => {
                      const next = [...editingPlatforms];
                      next[pi] = { ...next[pi], weeklyMin: +e.target.value };
                      setEditingPlatforms(next);
                    }}
                    className="h-7 w-14 text-xs text-center"
                  />
                  <span className="text-xs text-muted-foreground">–</span>
                  <Input
                    type="number" min={0} value={p.weeklyMax}
                    onChange={e => {
                      const next = [...editingPlatforms];
                      next[pi] = { ...next[pi], weeklyMax: +e.target.value };
                      setEditingPlatforms(next);
                    }}
                    className="h-7 w-14 text-xs text-center"
                  />
                </div>
                {p.subGoals.map((sg, si) => (
                  <div key={si} className="flex items-center gap-3 ml-6">
                    <span className="text-xs text-muted-foreground w-24">{sg.label} / week</span>
                    <Input
                      type="number" min={0} value={sg.weeklyMin}
                      onChange={e => {
                        const next = [...editingPlatforms];
                        const sgs  = [...next[pi].subGoals];
                        sgs[si] = { ...sgs[si], weeklyMin: +e.target.value, weeklyMax: +e.target.value };
                        next[pi] = { ...next[pi], subGoals: sgs };
                        setEditingPlatforms(next);
                      }}
                      className="h-7 w-14 text-xs text-center"
                    />
                  </div>
                ))}
              </div>
            ))}
            <Button onClick={saveGoals} size="sm" className="w-full text-black font-semibold" style={{ background: GOLD }}>
              Save Goals
            </Button>
          </div>
        )}

        {/* ── Week strip ─────────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <button onClick={prevWeek} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold text-muted-foreground">{weekMonth}</p>
              {!isToday && (
                <button
                  onClick={() => { setSelectedDate(today); setWeekStart(startOfWeek(today)); }}
                  className="flex items-center gap-1 text-xs font-semibold"
                  style={{ color: GOLD }}
                >
                  <RotateCcw className="w-3 h-3" /> Today
                </button>
              )}
            </div>
            <button onClick={nextWeek} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {weekDays.map((d, i) => {
              const k         = toKey(d);
              const isSelected = k === dateKey;
              const isTodayDay = k === toKey(today);
              const count      = dayCountFor(d);
              return (
                <button
                  key={i}
                  onClick={() => selectDay(d)}
                  className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl transition-all ${
                    isSelected
                      ? "text-black"
                      : isTodayDay
                      ? "border border-border bg-accent/40 text-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                  style={isSelected ? { background: GOLD } : {}}
                >
                  <span className="text-[9px] font-bold uppercase tracking-wider">{DAY_NAMES[d.getDay()]}</span>
                  <span className="text-base font-bold leading-none">{d.getDate()}</span>
                  <div className="h-1.5 flex gap-0.5 items-center mt-0.5">
                    {count > 0 && Array.from({ length: Math.min(count, 5) }).map((_, j) => (
                      <div key={j} className="w-1 h-1 rounded-full flex-shrink-0"
                        style={{ background: isSelected ? "rgba(0,0,0,0.5)" : GOLD }}
                      />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Weekly progress ─────────────────────────────────────────────────── */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
            Week of {weekDays[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            {" "}–{" "}
            {weekDays[6].toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {platforms.map(p => {
              const count = weekCountFor(p.id);
              const pct   = Math.min(100, p.weeklyMax > 0 ? (count / p.weeklyMax) * 100 : 0);
              const hit   = count >= p.weeklyMin;
              return (
                <div key={p.id} className="rounded-2xl border border-border bg-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg leading-none">{p.emoji}</span>
                      <span className="text-sm font-semibold text-foreground">{p.name}</span>
                    </div>
                    <div className="text-right leading-none">
                      <span className="text-xl font-bold" style={{ color: hit ? "#22c55e" : count > 0 ? GOLD : undefined }}>
                        {count}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {" "}/ {p.weeklyMin}{p.weeklyMax !== p.weeklyMin ? `–${p.weeklyMax}` : ""}
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="h-1.5 rounded-full bg-border overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: hit ? "#22c55e" : p.color }}
                    />
                  </div>

                  {/* Sub-goals */}
                  {p.subGoals.map((sg, i) => {
                    const sc  = weekSubCount(p.id, sg.postType);
                    const ok  = sc >= sg.weeklyMin;
                    return (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">📌 {sg.label}</span>
                        <span className="text-xs font-semibold" style={{ color: ok ? "#22c55e" : undefined }}>
                          {sc} / {sg.weeklyMin}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Daily log ───────────────────────────────────────────────────────── */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2 flex-wrap">
            {selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            {isToday && (
              <span className="px-2 py-0.5 rounded-full text-black text-[10px] font-bold" style={{ background: GOLD }}>Today</span>
            )}
            <span className="font-normal normal-case text-muted-foreground">
              · {dayPosts.length} post{dayPosts.length !== 1 ? "s" : ""} logged
            </span>
          </p>

          <div className="space-y-3">
            {platforms.map(p => {
              const pPosts = dayPosts.filter(post => post.platformId === p.id);
              const adding = addingPost[p.id];
              return (
                <div key={p.id} className="rounded-2xl border border-border bg-card overflow-hidden">
                  {/* Platform header */}
                  <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border">
                    <span className="text-base leading-none">{p.emoji}</span>
                    <span className="text-xs font-bold uppercase tracking-wider text-foreground flex-1">{p.name}</span>
                    <span className="text-[10px] text-muted-foreground mr-2">{pPosts.length} today</span>
                    <button
                      onClick={() =>
                        setAddingPost(prev => ({
                          ...prev,
                          [p.id]: adding ? null : { type: p.postTypes[0], note: "" },
                        }))
                      }
                      className="flex items-center gap-1 text-xs font-semibold transition-colors"
                      style={{ color: GOLD }}
                    >
                      {adding ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                      {adding ? "Cancel" : "Log post"}
                    </button>
                  </div>

                  {/* Logged posts */}
                  {pPosts.length > 0 && (
                    <div className="px-4 py-1">
                      {pPosts.map(post => (
                        <div
                          key={post.id}
                          className="flex items-center gap-2.5 py-2 border-b border-border/40 last:border-0 group"
                        >
                          <span
                            className="text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
                            style={{ background: `${p.color}22`, color: p.color }}
                          >
                            {post.type}
                          </span>
                          {post.note
                            ? <span className="flex-1 text-xs text-muted-foreground truncate">{post.note}</span>
                            : <span className="flex-1" />
                          }
                          <button
                            onClick={() => deletePost(post.id)}
                            className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add post form */}
                  {adding && (
                    <div className="flex gap-2 px-4 py-3 border-t border-border/50 bg-background/40 flex-wrap">
                      <select
                        value={adding.type}
                        onChange={e =>
                          setAddingPost(prev => ({ ...prev, [p.id]: { ...adding!, type: e.target.value } }))
                        }
                        className="h-8 text-xs bg-card border border-border rounded-lg px-2 text-foreground focus:outline-none"
                      >
                        {p.postTypes.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <Input
                        value={adding.note}
                        onChange={e =>
                          setAddingPost(prev => ({ ...prev, [p.id]: { ...adding!, note: e.target.value } }))
                        }
                        onKeyDown={e => e.key === "Enter" && addPost(p.id)}
                        placeholder="Note (optional)…"
                        className="h-8 text-sm flex-1 min-w-[120px]"
                      />
                      <Button
                        onClick={() => addPost(p.id)}
                        size="sm"
                        className="h-8 text-black gap-1 font-semibold"
                        style={{ background: GOLD }}
                      >
                        <Check className="w-3.5 h-3.5" /> Log
                      </Button>
                    </div>
                  )}

                  {/* Empty state */}
                  {pPosts.length === 0 && !adding && (
                    <div className="px-4 py-3 text-xs text-muted-foreground">Nothing logged today</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </SuperAdminLayout>
  );
}
