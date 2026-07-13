import SuperAdminLayout from "./Layout";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckSquare, Plus, Trash2, ChevronLeft, ChevronRight, Calendar, Flame, X } from "lucide-react";

const GOLD = "#d4b461";
const TABS_KEY   = "super_admin_main_tabs_v1";
const TASKS_KEY  = "super_admin_todos_v2";
const HABITS_KEY = "super_admin_habits_v1";

// ─── Types ───────────────────────────────────────────────────────────────────
type Task    = { id: string; text: string; done: boolean; sectionId: string };
type Section = { id: string; name: string };
type MainTab = { id: string; name: string; emoji: string; sections: Section[] };
type HabitEntry = { name: string; done: boolean };

// ─── Storage helpers ─────────────────────────────────────────────────────────
const DEFAULT_TABS: MainTab[] = [
  { id: "consulting", name: "Consulting", emoji: "🤝", sections: [] },
  { id: "software",   name: "Software",   emoji: "💻", sections: [] },
];
const DEFAULT_HABITS = ["Exercise", "Read", "Meditate", "Review clients", "Plan tomorrow"];

function loadTabs(): MainTab[] {
  try { return JSON.parse(localStorage.getItem(TABS_KEY) || "null") || DEFAULT_TABS; }
  catch { return DEFAULT_TABS; }
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
function fmt(d: Date) {
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function TodoList() {
  const [date, setDate]           = useState(new Date());
  const dateKey                   = toKey(date);
  const isToday                   = dateKey === toKey(new Date());

  // tabs (global)
  const [mainTabs, setMainTabs]   = useState<MainTab[]>(loadTabs);
  const [activeTabId, setActiveTabId] = useState<string>(() => loadTabs()[0]?.id ?? "consulting");

  // tasks (per day)
  const [allTasks, setAllTasks]   = useState<Record<string, Task[]>>(loadTasks);
  const tasks: Task[]             = allTasks[dateKey] || [];

  // habits (per day)
  const [allHabits, setAllHabits] = useState<Record<string, HabitEntry[]>>(loadHabits);
  const habits: HabitEntry[]      = allHabits[dateKey] ?? DEFAULT_HABITS.map(n => ({ name: n, done: false }));

  // UI state
  const [sectionInputs, setSectionInputs] = useState<Record<string, string>>({});
  const [newSectionName, setNewSectionName] = useState("");
  const [showAddSection, setShowAddSection] = useState(false);
  const [newTabName, setNewTabName]   = useState("");
  const [newTabEmoji, setNewTabEmoji] = useState("📁");
  const [showAddTab, setShowAddTab]   = useState(false);
  const [newHabitName, setNewHabitName]   = useState("");
  const [showHabitInput, setShowHabitInput] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Persistence ─────────────────────────────────────────────────────────
  function flash() {
    setSaveStatus("saving");
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaveStatus("saved"), 300);
  }

  function updateTasks(next: Record<string, Task[]>) {
    setAllTasks(next);
    saveTasks(next);
    flash();
  }

  function updateHabits(next: Record<string, HabitEntry[]>) {
    setAllHabits(next);
    saveHabits(next);
    flash();
  }

  function updateTabs(next: MainTab[]) {
    setMainTabs(next);
    saveTabs(next);
    flash();
  }

  function manualSave() {
    saveTasks(allTasks);
    saveTabs(mainTabs);
    saveHabits(allHabits);
    flash();
  }

  // ── Active tab ───────────────────────────────────────────────────────────
  const activeTab = mainTabs.find(t => t.id === activeTabId) ?? mainTabs[0];

  // ── Tab actions ──────────────────────────────────────────────────────────
  function addTab() {
    if (!newTabName.trim()) return;
    const tab: MainTab = { id: uid(), name: newTabName.trim(), emoji: newTabEmoji, sections: [] };
    const next = [...mainTabs, tab];
    updateTabs(next);
    setActiveTabId(tab.id);
    setNewTabName(""); setNewTabEmoji("📁"); setShowAddTab(false);
  }

  function deleteTab(tabId: string) {
    const tab = mainTabs.find(t => t.id === tabId);
    const sectionIds = tab?.sections.map(s => s.id) ?? [];
    const nextTabs = mainTabs.filter(t => t.id !== tabId);
    updateTabs(nextTabs);
    if (activeTabId === tabId) setActiveTabId(nextTabs[0]?.id ?? "");
    const nextTasks = { ...allTasks, [dateKey]: tasks.filter(t => !sectionIds.includes(t.sectionId)) };
    updateTasks(nextTasks);
  }

  // ── Section actions ──────────────────────────────────────────────────────
  function addSection() {
    if (!newSectionName.trim() || !activeTab) return;
    const sec: Section = { id: uid(), name: newSectionName.trim() };
    const next = mainTabs.map(t => t.id === activeTab.id ? { ...t, sections: [...t.sections, sec] } : t);
    updateTabs(next);
    setNewSectionName(""); setShowAddSection(false);
  }

  function deleteSection(sectionId: string) {
    const next = mainTabs.map(t => ({ ...t, sections: t.sections.filter(s => s.id !== sectionId) }));
    updateTabs(next);
    const nextTasks = { ...allTasks, [dateKey]: tasks.filter(t => t.sectionId !== sectionId) };
    updateTasks(nextTasks);
  }

  // ── Task actions ─────────────────────────────────────────────────────────
  function addTask(sectionId: string) {
    const text = (sectionInputs[sectionId] || "").trim();
    if (!text) return;
    const task: Task = { id: uid(), text, done: false, sectionId };
    const next = { ...allTasks, [dateKey]: [...tasks, task] };
    updateTasks(next);
    setSectionInputs(prev => ({ ...prev, [sectionId]: "" }));
  }

  function toggleTask(id: string) {
    const next = { ...allTasks, [dateKey]: tasks.map(t => t.id === id ? { ...t, done: !t.done } : t) };
    updateTasks(next);
  }

  function deleteTask(id: string) {
    const next = { ...allTasks, [dateKey]: tasks.filter(t => t.id !== id) };
    updateTasks(next);
  }

  // ── Habit actions ────────────────────────────────────────────────────────
  function toggleHabit(idx: number) {
    const updated = habits.map((h, i) => i === idx ? { ...h, done: !h.done } : h);
    updateHabits({ ...allHabits, [dateKey]: updated });
  }

  function addHabit() {
    if (!newHabitName.trim()) return;
    updateHabits({ ...allHabits, [dateKey]: [...habits, { name: newHabitName.trim(), done: false }] });
    setNewHabitName(""); setShowHabitInput(false);
  }

  function deleteHabit(idx: number) {
    updateHabits({ ...allHabits, [dateKey]: habits.filter((_, i) => i !== idx) });
  }

  // ── Derived ──────────────────────────────────────────────────────────────
  const totalTasks = tasks.length;
  const doneTasks  = tasks.filter(t => t.done).length;
  const doneHabits = habits.filter(h => h.done).length;

  return (
    <SuperAdminLayout>
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <CheckSquare className="w-5 h-5" style={{ color: GOLD }} /> To-Do List
          </h1>
          <div className="flex items-center gap-3">
            {saveStatus !== "idle" && (
              <span className={`text-xs font-medium transition-all ${saveStatus === "saved" ? "text-emerald-500" : "text-muted-foreground"}`}>
                {saveStatus === "saving" ? "Saving..." : "✓ Saved"}
              </span>
            )}
            <button
              onClick={manualSave}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all"
            >
              Save
            </button>
          </div>
        </div>

        {/* Date navigator */}
        <div className="flex items-center gap-3">
          <button onClick={() => { const d = new Date(date); d.setDate(d.getDate() - 1); setDate(d); }} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 text-center">
            <p className="font-semibold text-sm text-foreground">{fmt(date)}</p>
            {!isToday && (
              <button onClick={() => setDate(new Date())} className="text-xs mt-0.5" style={{ color: GOLD }}>Back to today</button>
            )}
          </div>
          <button onClick={() => { const d = new Date(date); d.setDate(d.getDate() + 1); setDate(d); }} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Progress summary */}
        {(totalTasks > 0 || habits.length > 0) && (
          <div className="flex gap-3">
            {totalTasks > 0 && (
              <div className="flex-1 rounded-xl border border-border bg-card p-3 text-center">
                <p className="text-2xl font-bold text-foreground">{doneTasks}<span className="text-base text-muted-foreground">/{totalTasks}</span></p>
                <p className="text-xs text-muted-foreground mt-0.5">tasks done</p>
              </div>
            )}
            {habits.length > 0 && (
              <div className="flex-1 rounded-xl border border-border bg-card p-3 text-center">
                <p className="text-2xl font-bold text-foreground">{doneHabits}<span className="text-base text-muted-foreground">/{habits.length}</span></p>
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center justify-center gap-1"><Flame className="w-3 h-3" style={{ color: GOLD }} /> habits</p>
              </div>
            )}
          </div>
        )}

        {/* ── Main tab selector ── */}
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
              <span>{tab.emoji}</span>
              <span>{tab.name}</span>
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
                placeholder="Tab name..."
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

        {/* ── Active tab: sections + tasks ── */}
        {activeTab && (
          <div className="space-y-3">
            {activeTab.sections.length === 0 && !showAddSection && (
              <div className="py-8 text-center text-muted-foreground text-sm border border-dashed border-border rounded-xl">
                No sections yet — add one below
              </div>
            )}

            {activeTab.sections.map(sec => {
              const secTasks = tasks.filter(t => t.sectionId === sec.id);
              const secDone  = secTasks.filter(t => t.done).length;
              const inputVal = sectionInputs[sec.id] || "";

              return (
                <div key={sec.id} className="rounded-xl border border-border bg-card overflow-hidden">
                  {/* Section header */}
                  <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-card/80">
                    <p className="text-xs font-bold text-foreground uppercase tracking-wider flex-1">{sec.name}</p>
                    <span className="text-[10px] text-muted-foreground">{secDone}/{secTasks.length}</span>
                    <button onClick={() => deleteSection(sec.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Tasks */}
                  <div className="px-4 py-2 space-y-0.5">
                    {secTasks.length === 0 && (
                      <p className="text-xs text-muted-foreground py-2">No tasks yet</p>
                    )}
                    {secTasks.map(task => (
                      <div
                        key={task.id}
                        className={`flex items-center gap-3 py-2 border-b border-border/40 last:border-0 group ${task.done ? "opacity-50" : ""}`}
                      >
                        <Checkbox checked={task.done} onCheckedChange={() => toggleTask(task.id)} className="flex-shrink-0" />
                        <span className={`flex-1 text-sm ${task.done ? "line-through text-muted-foreground" : "text-foreground"}`}>{task.text}</span>
                        <button onClick={() => deleteTask(task.id)} className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Inline add */}
                  <div className="flex gap-2 px-4 pb-3 pt-1">
                    <Input
                      value={inputVal}
                      onChange={e => setSectionInputs(prev => ({ ...prev, [sec.id]: e.target.value }))}
                      onKeyDown={e => e.key === "Enter" && addTask(sec.id)}
                      placeholder="Add a task..."
                      className="flex-1 h-8 text-sm bg-background"
                    />
                    <Button onClick={() => addTask(sec.id)} size="sm" className="h-8 px-3 text-black" style={{ background: GOLD }}>
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}

            {/* Add section */}
            {showAddSection ? (
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">New section in {activeTab.name}</p>
                <div className="flex gap-2">
                  <Input
                    autoFocus
                    value={newSectionName}
                    onChange={e => setNewSectionName(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") addSection(); if (e.key === "Escape") setShowAddSection(false); }}
                    placeholder="Section name..."
                    className="flex-1 text-sm"
                  />
                  <Button onClick={addSection} size="sm" className="text-black" style={{ background: GOLD }}>Add</Button>
                  <Button onClick={() => setShowAddSection(false)} size="sm" variant="outline">Cancel</Button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddSection(true)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full py-1"
              >
                <Plus className="w-4 h-4" /> Add section
              </button>
            )}
          </div>
        )}

        <div className="border-t border-border" />

        {/* ── Daily Habits ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <Flame className="w-4 h-4" style={{ color: GOLD }} /> Daily Habits
            </h2>
            <button onClick={() => setShowHabitInput(v => !v)} className="text-xs transition-colors" style={{ color: GOLD }}>
              + Add habit
            </button>
          </div>

          {showHabitInput && (
            <div className="flex gap-2">
              <Input value={newHabitName} onChange={e => setNewHabitName(e.target.value)} placeholder="Habit name..." className="h-8 text-sm" autoFocus onKeyDown={e => e.key === "Enter" && addHabit()} />
              <Button size="sm" onClick={addHabit} className="h-8 text-black" style={{ background: GOLD }}>Add</Button>
              <Button size="sm" variant="outline" onClick={() => setShowHabitInput(false)} className="h-8">Cancel</Button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {habits.map((h, i) => (
              <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border border-border bg-card group transition-all ${h.done ? "opacity-60" : ""}`}>
                <Checkbox checked={h.done} onCheckedChange={() => toggleHabit(i)} className="flex-shrink-0" />
                <span className={`flex-1 text-sm ${h.done ? "line-through text-muted-foreground" : "text-foreground"}`}>{h.name}</span>
                <button onClick={() => deleteHabit(i)} className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ── Google Calendar ── */}
        <div className="border-t border-border pt-6 space-y-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <Calendar className="w-4 h-4" style={{ color: GOLD }} /> Google Calendar
          </h2>
          <div className="rounded-xl overflow-hidden border border-border" style={{ height: 500 }}>
            <iframe
              src="https://calendar.google.com/calendar/embed?src=oravini%40gmail.com&ctz=Asia%2FKolkata&showNav=1&showDate=1&showPrint=0&showTabs=1&showCalendars=0&showTitle=0&bgcolor=%230a0910&color=%23d4b461"
              style={{ border: 0, width: "100%", height: "100%", background: "#0a0910", filter: "invert(0.92) hue-rotate(180deg)" }}
              title="Google Calendar"
            />
          </div>
          <p className="text-[11px] text-muted-foreground">Make sure you&apos;re signed into oravini@gmail.com for the calendar to load.</p>
        </div>

      </div>
    </SuperAdminLayout>
  );
}
