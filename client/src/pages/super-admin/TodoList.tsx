import SuperAdminLayout from "./Layout";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckSquare, Plus, Trash2, ChevronLeft, ChevronRight, Flame, X, RotateCcw } from "lucide-react";

const GOLD = "#d4b461";
const TABS_KEY   = "super_admin_main_tabs_v1";
const TASKS_KEY  = "super_admin_todos_v2";
const HABITS_KEY = "super_admin_habits_v1";

type Task       = { id: string; text: string; done: boolean; sectionId: string };
type Section    = { id: string; name: string };
type MainTab    = { id: string; name: string; emoji: string; sections: Section[] };
type HabitEntry = { name: string; done: boolean };

const DEFAULT_TABS: MainTab[] = [
  { id: "consulting", name: "Consulting", emoji: "🤝", sections: [] },
  { id: "software",   name: "Software",   emoji: "💻", sections: [] },
];
const DEFAULT_HABITS = ["Exercise", "Read", "Meditate", "Review clients", "Plan tomorrow"];

const DAY_NAMES   = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function loadTabs(): MainTab[] {
  try { return JSON.parse(localStorage.getItem(TABS_KEY) || "null") || DEFAULT_TABS; } catch { return DEFAULT_TABS; }
}
function saveTabs(t: MainTab[]) { localStorage.setItem(TABS_KEY, JSON.stringify(t)); }

function loadTasks(): Record<string, Task[]> {
  try { return JSON.parse(localStorage.getItem(TASKS_KEY) || "{}"); } catch { return {}; }
}
function saveTasks(d: Record<string, Task[]>) { localStorage.setItem(TASKS_KEY, JSON.stringify(d)); }

function loadHabits(): Record<string, HabitEntry[]> {
  try { return JSON.parse(localStorage.getItem(HABITS_KEY) || "{}"); } catch { return {}; }
}
function saveHabits(d: Record<string, HabitEntry[]>) { localStorage.setItem(HABITS_KEY, JSON.stringify(d)); }

function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
function toKey(d: Date) { return d.toISOString().slice(0, 10); }

function startOfWeek(d: Date): Date {
  const day = new Date(d);
  day.setDate(day.getDate() - day.getDay());
  return day;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export default function TodoList() {
  const today = new Date();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekStart, setWeekStart]       = useState(() => startOfWeek(new Date()));
  const dateKey = toKey(selectedDate);
  const isToday = dateKey === toKey(today);

  const [mainTabs, setMainTabs]       = useState<MainTab[]>(loadTabs);
  const [activeTabId, setActiveTabId] = useState<string>(() => loadTabs()[0]?.id ?? "consulting");
  const [allTasks, setAllTasks]       = useState<Record<string, Task[]>>(loadTasks);
  const [allHabits, setAllHabits]     = useState<Record<string, HabitEntry[]>>(loadHabits);

  const tasks: Task[]        = allTasks[dateKey] || [];
  const habits: HabitEntry[] = allHabits[dateKey] ?? DEFAULT_HABITS.map(n => ({ name: n, done: false }));

  const [sectionInputs, setSectionInputs]   = useState<Record<string, string>>({});
  const [newSectionName, setNewSectionName] = useState("");
  const [showAddSection, setShowAddSection] = useState(false);
  const [newTabName, setNewTabName]         = useState("");
  const [newTabEmoji, setNewTabEmoji]       = useState("📁");
  const [showAddTab, setShowAddTab]         = useState(false);
  const [newHabitName, setNewHabitName]     = useState("");
  const [showHabitInput, setShowHabitInput] = useState(false);
  const [saveStatus, setSaveStatus]         = useState<"idle" | "saving" | "saved">("idle");

  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function flash() {
    setSaveStatus("saving");
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaveStatus("saved"), 300);
  }

  function updateTasks(next: Record<string, Task[]>)       { setAllTasks(next);  saveTasks(next);  flash(); }
  function updateHabits(next: Record<string, HabitEntry[]>){ setAllHabits(next); saveHabits(next); flash(); }
  function updateTabs(next: MainTab[])                      { setMainTabs(next);  saveTabs(next);   flash(); }
  function manualSave() { saveTasks(allTasks); saveTabs(mainTabs); saveHabits(allHabits); flash(); }

  const activeTab = mainTabs.find(t => t.id === activeTabId) ?? mainTabs[0];
  const weekDays  = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  function selectDay(d: Date) {
    setSelectedDate(d);
    const ws = startOfWeek(d);
    if (toKey(ws) !== toKey(weekStart)) setWeekStart(ws);
  }

  function prevWeek() { setWeekStart(addDays(weekStart, -7)); setSelectedDate(addDays(selectedDate, -7)); }
  function nextWeek() { setWeekStart(addDays(weekStart,  7)); setSelectedDate(addDays(selectedDate,  7)); }

  function dayTaskInfo(d: Date) {
    const t = allTasks[toKey(d)] || [];
    return { total: t.length, done: t.filter(x => x.done).length };
  }

  // ── Tab actions ──────────────────────────────────────────────────────────────
  function addTab() {
    if (!newTabName.trim()) return;
    const tab: MainTab = { id: uid(), name: newTabName.trim(), emoji: newTabEmoji, sections: [] };
    updateTabs([...mainTabs, tab]);
    setActiveTabId(tab.id);
    setNewTabName(""); setNewTabEmoji("📁"); setShowAddTab(false);
  }

  function deleteTab(tabId: string) {
    const sids = mainTabs.find(t => t.id === tabId)?.sections.map(s => s.id) ?? [];
    const next  = mainTabs.filter(t => t.id !== tabId);
    updateTabs(next);
    if (activeTabId === tabId) setActiveTabId(next[0]?.id ?? "");
    updateTasks({ ...allTasks, [dateKey]: tasks.filter(t => !sids.includes(t.sectionId)) });
  }

  // ── Section actions ──────────────────────────────────────────────────────────
  function addSection() {
    if (!newSectionName.trim() || !activeTab) return;
    const sec: Section = { id: uid(), name: newSectionName.trim() };
    updateTabs(mainTabs.map(t => t.id === activeTab.id ? { ...t, sections: [...t.sections, sec] } : t));
    setNewSectionName(""); setShowAddSection(false);
  }

  function deleteSection(sectionId: string) {
    updateTabs(mainTabs.map(t => ({ ...t, sections: t.sections.filter(s => s.id !== sectionId) })));
    updateTasks({ ...allTasks, [dateKey]: tasks.filter(t => t.sectionId !== sectionId) });
  }

  // ── Task actions ─────────────────────────────────────────────────────────────
  function addTask(sectionId: string) {
    const text = (sectionInputs[sectionId] || "").trim();
    if (!text) return;
    updateTasks({ ...allTasks, [dateKey]: [...tasks, { id: uid(), text, done: false, sectionId }] });
    setSectionInputs(prev => ({ ...prev, [sectionId]: "" }));
  }

  function toggleTask(id: string) {
    updateTasks({ ...allTasks, [dateKey]: tasks.map(t => t.id === id ? { ...t, done: !t.done } : t) });
  }

  function deleteTask(id: string) {
    updateTasks({ ...allTasks, [dateKey]: tasks.filter(t => t.id !== id) });
  }

  // ── Habit actions ────────────────────────────────────────────────────────────
  function toggleHabit(idx: number) {
    updateHabits({ ...allHabits, [dateKey]: habits.map((h, i) => i === idx ? { ...h, done: !h.done } : h) });
  }

  function addHabit() {
    if (!newHabitName.trim()) return;
    updateHabits({ ...allHabits, [dateKey]: [...habits, { name: newHabitName.trim(), done: false }] });
    setNewHabitName(""); setShowHabitInput(false);
  }

  function deleteHabit(idx: number) {
    updateHabits({ ...allHabits, [dateKey]: habits.filter((_, i) => i !== idx) });
  }

  const totalTasks = tasks.length;
  const doneTasks  = tasks.filter(t => t.done).length;
  const doneHabits = habits.filter(h => h.done).length;
  const weekMonth  = `${MONTH_NAMES[weekStart.getMonth()]} ${weekStart.getFullYear()}`;

  return (
    <SuperAdminLayout>
      <div className="max-w-3xl mx-auto space-y-5">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <CheckSquare className="w-5 h-5" style={{ color: GOLD }} /> To-Do List
          </h1>
          <div className="flex items-center gap-3">
            {saveStatus !== "idle" && (
              <span className={`text-xs font-medium transition-all ${saveStatus === "saved" ? "text-emerald-500" : "text-muted-foreground"}`}>
                {saveStatus === "saving" ? "Saving…" : "✓ Saved"}
              </span>
            )}
            <button onClick={manualSave} className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-border text-muted-foreground hover:text-foreground transition-all">
              Save
            </button>
          </div>
        </div>

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
                  className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
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
              const key        = toKey(d);
              const isSelected = key === dateKey;
              const isTodayDay = key === toKey(today);
              const info       = dayTaskInfo(d);
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
                  <div className="flex gap-0.5 h-1.5 items-center mt-0.5">
                    {info.total > 0 && Array.from({ length: Math.min(info.total, 5) }, (_, j) => (
                      <div
                        key={j}
                        className="w-1 h-1 rounded-full flex-shrink-0"
                        style={{
                          background: isSelected
                            ? j < info.done ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.2)"
                            : j < info.done ? GOLD : "currentColor",
                          opacity: isSelected ? 1 : j < info.done ? 1 : 0.3,
                        }}
                      />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Date label + progress ───────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <p className="font-bold text-foreground flex items-center gap-2">
            {selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            {isToday && (
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold text-black" style={{ background: GOLD }}>
                Today
              </span>
            )}
          </p>
          {(totalTasks > 0 || habits.length > 0) && (
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {totalTasks > 0 && <span><span className="font-bold text-foreground">{doneTasks}/{totalTasks}</span> tasks</span>}
              {habits.length > 0 && <span><span className="font-bold text-foreground">{doneHabits}/{habits.length}</span> habits</span>}
            </div>
          )}
        </div>

        {/* ── Daily Routine ───────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5" style={{ color: GOLD }} /> Daily Routine
            </h2>
            <button
              onClick={() => setShowHabitInput(v => !v)}
              className="text-xs font-semibold transition-colors"
              style={{ color: GOLD }}
            >
              + Add
            </button>
          </div>

          {showHabitInput && (
            <div className="flex gap-2 px-4 py-2.5 border-b border-border bg-background/40">
              <Input
                autoFocus
                value={newHabitName}
                onChange={e => setNewHabitName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") addHabit(); if (e.key === "Escape") setShowHabitInput(false); }}
                placeholder="New routine item…"
                className="h-8 text-sm flex-1"
              />
              <Button size="sm" onClick={addHabit} className="h-8 text-black" style={{ background: GOLD }}>Add</Button>
              <Button size="sm" variant="outline" onClick={() => setShowHabitInput(false)} className="h-8">Cancel</Button>
            </div>
          )}

          <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {habits.map((h, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border/50 group transition-all ${h.done ? "opacity-50" : ""}`}
              >
                <Checkbox checked={h.done} onCheckedChange={() => toggleHabit(i)} className="flex-shrink-0" />
                <span className={`flex-1 text-sm ${h.done ? "line-through text-muted-foreground" : "text-foreground"}`}>{h.name}</span>
                <button onClick={() => deleteHabit(i)} className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ── Tab strip ───────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 flex-wrap">
          {mainTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                activeTabId === tab.id
                  ? "border-transparent text-black"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 bg-card"
              }`}
              style={activeTabId === tab.id ? { background: GOLD } : {}}
            >
              {tab.emoji} {tab.name}
            </button>
          ))}

          {showAddTab ? (
            <div className="flex items-center gap-1.5 bg-card border border-border rounded-xl px-2 py-1">
              <Input
                value={newTabEmoji}
                onChange={e => setNewTabEmoji(e.target.value)}
                className="w-9 bg-transparent border-0 text-center text-base p-0 h-6 focus-visible:ring-0"
                maxLength={2}
              />
              <Input
                autoFocus
                value={newTabName}
                onChange={e => setNewTabName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") addTab(); if (e.key === "Escape") setShowAddTab(false); }}
                placeholder="Tab name…"
                className="bg-transparent border-0 text-xs p-0 h-6 w-24 focus-visible:ring-0"
              />
              <button onClick={addTab} className="text-xs font-bold px-2 py-0.5 rounded-lg text-black" style={{ background: GOLD }}>Add</button>
              <button onClick={() => setShowAddTab(false)} className="text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
            </div>
          ) : (
            <button
              onClick={() => setShowAddTab(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-muted-foreground border border-dashed border-border hover:border-foreground/30 hover:text-foreground transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> Add tab
            </button>
          )}

          {mainTabs.length > 1 && activeTab && (
            <button onClick={() => deleteTab(activeTab.id)} className="ml-auto text-muted-foreground hover:text-destructive transition-colors" title={`Delete "${activeTab.name}"`}>
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* ── Sections + tasks ────────────────────────────────────────────────── */}
        {activeTab && (
          <div className="space-y-3">
            {activeTab.sections.length === 0 && !showAddSection && (
              <div className="py-10 text-center text-muted-foreground text-sm border border-dashed border-border rounded-2xl">
                No sections yet — add one below
              </div>
            )}

            {activeTab.sections.map(sec => {
              const secTasks = tasks.filter(t => t.sectionId === sec.id);
              const secDone  = secTasks.filter(t => t.done).length;
              const inputVal = sectionInputs[sec.id] || "";

              return (
                <div key={sec.id} className="rounded-2xl border border-border bg-card overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border">
                    <p className="text-xs font-bold uppercase tracking-wider text-foreground flex-1">{sec.name}</p>
                    <span className="text-[10px] text-muted-foreground font-medium">{secDone}/{secTasks.length}</span>
                    <button onClick={() => deleteSection(sec.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="px-4 py-1">
                    {secTasks.length === 0 && (
                      <p className="text-xs text-muted-foreground py-3">No tasks yet</p>
                    )}
                    {secTasks.map(task => (
                      <div
                        key={task.id}
                        className={`flex items-center gap-3 py-2.5 border-b border-border/40 last:border-0 group ${task.done ? "opacity-50" : ""}`}
                      >
                        <Checkbox checked={task.done} onCheckedChange={() => toggleTask(task.id)} className="flex-shrink-0" />
                        <span className={`flex-1 text-sm ${task.done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                          {task.text}
                        </span>
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 px-4 pb-3 pt-1.5">
                    <Input
                      value={inputVal}
                      onChange={e => setSectionInputs(prev => ({ ...prev, [sec.id]: e.target.value }))}
                      onKeyDown={e => e.key === "Enter" && addTask(sec.id)}
                      placeholder="Add a task…"
                      className="flex-1 h-8 text-sm bg-background"
                    />
                    <Button onClick={() => addTask(sec.id)} size="sm" className="h-8 px-3 text-black" style={{ background: GOLD }}>
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}

            {showAddSection ? (
              <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">New section in {activeTab.name}</p>
                <div className="flex gap-2">
                  <Input
                    autoFocus
                    value={newSectionName}
                    onChange={e => setNewSectionName(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") addSection(); if (e.key === "Escape") setShowAddSection(false); }}
                    placeholder="Section name…"
                    className="flex-1 text-sm"
                  />
                  <Button onClick={addSection} size="sm" className="text-black" style={{ background: GOLD }}>Add</Button>
                  <Button onClick={() => setShowAddSection(false)} size="sm" variant="outline">Cancel</Button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddSection(true)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
              >
                <Plus className="w-4 h-4" /> Add section
              </button>
            )}
          </div>
        )}

      </div>
    </SuperAdminLayout>
  );
}
