import { useState, useEffect, useMemo, useRef } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { format, addDays, subDays, startOfWeek, isSameDay, isToday } from "date-fns";
import {
  CheckCircle2, Circle, Plus, Trash2, ChevronLeft, ChevronRight,
  Sparkles, Flame, Target, CalendarDays, ListTodo, TrendingUp, X, Loader2,
  Briefcase, Clock, CalendarClock, BarChart3, Zap, CalendarRange
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const GOLD = "#d4b461";
const STORAGE_KEY = import.meta.env.VITE_DAILY_TRACKER_STORAGE_KEY ?? "admin_daily_tracker_v1";
const BUSINESS_STORAGE_KEY = "admin_business_tracker_v1";
const CONTENT_CALENDAR_KEY = "admin_content_calendar_v1";

type Task = { id: string; text: string; done: boolean; sectionId: string };
type Section = { id: string; name: string };
type MainTab = { id: string; name: string; emoji: string; sections: Section[] };
type Habit = { id: string; name: string; emoji: string };
type ContentItem = { id: string; title: string; platform: string; scheduledTime: string; status: "pending" | "published" | "draft"; description: string };
type BusinessTask = { id: string; text: string; done: boolean; priority: "high" | "medium" | "low"; dueDate?: string };
type DayData = { tasks: Task[]; habits: Record<string, boolean>; note: string; aiPlan: string; businessTasks: BusinessTask[]; contentCalendar: ContentItem[]; aiContentPrompt: string };
type TrackerData = Record<string, DayData>;

const DEFAULT_TABS: MainTab[] = [
  { id: "consulting", name: "Consulting", emoji: "🤝", sections: [] },
  { id: "software",   name: "Software",   emoji: "💻", sections: [] },
];

function loadTabs(): MainTab[] {
  try { return JSON.parse(localStorage.getItem("admin_main_tabs_v1") || "null") || DEFAULT_TABS; }
  catch { return DEFAULT_TABS; }
}

function saveTabs(t: MainTab[]) {
  localStorage.setItem("admin_main_tabs_v1", JSON.stringify(t));
}

type ContentCalendarDay = {
  date: string;
  items: {
    time: string;
    platform: "instagram" | "youtube" | "linkedin" | "twitter" | "tiktok";
    contentType: "post" | "reel" | "story" | "video" | "article" | "tweet";
    topic: string;
    description: string;
    status: "planned" | "created" | "scheduled" | "published";
  }[];
};

const DEFAULT_HABITS: Habit[] = [
  { id: "workout", name: "Workout", emoji: "💪" },
  { id: "reading", name: "Reading", emoji: "📚" },
  { id: "water", name: "Drink Water", emoji: "💧" },
  { id: "nosugar", name: "No Junk Food", emoji: "🥗" },
  { id: "sleep", name: "Sleep 8hrs", emoji: "😴" },
];


function dateKey(d: Date) {
  return format(d, "yyyy-MM-dd");
}

function emptyDay(): DayData {
  return { tasks: [], habits: {}, note: "", aiPlan: "", businessTasks: [], contentCalendar: [], aiContentPrompt: "" };
}

function loadData(): TrackerData {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveData(data: TrackerData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export default function AdminDailyTracker() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [data, setData] = useState<TrackerData>(loadData);
  const [habits, setHabits] = useState<Habit[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("admin_habits_v1") || "null") || DEFAULT_HABITS;
    } catch { return DEFAULT_HABITS; }
  });
  const [mainTabs, setMainTabs] = useState<MainTab[]>(loadTabs);
  const [activeMainTabId, setActiveMainTabId] = useState<string>(() => loadTabs()[0]?.id ?? "consulting");
  const [sectionInputs, setSectionInputs] = useState<Record<string, string>>({});
  const [newSectionName, setNewSectionName] = useState("");
  const [showAddSection, setShowAddSection] = useState(false);
  const [newTabName, setNewTabName] = useState("");
  const [newTabEmoji, setNewTabEmoji] = useState("📁");
  const [showAddTab, setShowAddTab] = useState(false);
  const [newHabitName, setNewHabitName] = useState("");
  const [newHabitEmoji, setNewHabitEmoji] = useState("⭐");
  const [showAddHabit, setShowAddHabit] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"tasks" | "habits" | "progress">("tasks");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  const key = dateKey(selectedDate);
  const day: DayData = data[key] || emptyDay();

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function persistData(updated: TrackerData) {
    setSaveStatus("saving");
    saveData(updated);
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaveStatus("saved"), 300);
  }

  function updateDay(patch: Partial<DayData>) {
    const updated = { ...data, [key]: { ...day, ...patch } };
    setData(updated);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persistData(updated), 400);
  }

  function manualSave() {
    persistData(data);
    saveTabs(mainTabs);
    localStorage.setItem("admin_habits_v1", JSON.stringify(habits));
  }

  useEffect(() => {
    localStorage.setItem("admin_habits_v1", JSON.stringify(habits));
  }, [habits]);

  // Week strip
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Stats
  const totalTasks = day.tasks.length;
  const doneTasks = day.tasks.filter(t => t.done).length;
  const taskPct = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const doneHabits = habits.filter(h => day.habits[h.id]).length;
  const habitPct = habits.length ? Math.round((doneHabits / habits.length) * 100) : 0;
  const overallPct = Math.round((taskPct + habitPct) / 2);

  const streak = useMemo(() => {
    let count = 0;
    let d = new Date();
    for (let i = 0; i < 365; i++) {
      const k = dateKey(d);
      const dd = data[k];
      if (!dd) break;
      const tt = dd.tasks.length ? Math.round((dd.tasks.filter(t => t.done).length / dd.tasks.length) * 100) : 0;
      const hh = habits.length ? Math.round((habits.filter(h => dd.habits[h.id]).length / habits.length) * 100) : 0;
      if (Math.round((tt + hh) / 2) >= 50) { count++; d = subDays(d, 1); } else break;
    }
    return count;
  }, [data, habits]);

  const activeMainTab = mainTabs.find(t => t.id === activeMainTabId) ?? mainTabs[0];

  function updateTabs(next: MainTab[]) {
    setMainTabs(next);
    saveTabs(next);
  }

  function addTab() {
    if (!newTabName.trim()) return;
    const tab: MainTab = { id: Date.now().toString(), name: newTabName.trim(), emoji: newTabEmoji, sections: [] };
    const next = [...mainTabs, tab];
    updateTabs(next);
    setActiveMainTabId(tab.id);
    setNewTabName(""); setNewTabEmoji("📁"); setShowAddTab(false);
  }

  function deleteTab(tabId: string) {
    const tab = mainTabs.find(t => t.id === tabId);
    const sectionIds = tab?.sections.map(s => s.id) ?? [];
    const next = mainTabs.filter(t => t.id !== tabId);
    updateTabs(next);
    if (activeMainTabId === tabId) setActiveMainTabId(next[0]?.id ?? "");
    updateDay({ tasks: day.tasks.filter(t => !sectionIds.includes(t.sectionId)) });
  }

  function addSection() {
    if (!newSectionName.trim() || !activeMainTab) return;
    const sec: Section = { id: Date.now().toString(), name: newSectionName.trim() };
    const next = mainTabs.map(t => t.id === activeMainTab.id ? { ...t, sections: [...t.sections, sec] } : t);
    updateTabs(next);
    setNewSectionName(""); setShowAddSection(false);
  }

  function deleteSection(sectionId: string) {
    const next = mainTabs.map(t => ({ ...t, sections: t.sections.filter(s => s.id !== sectionId) }));
    updateTabs(next);
    updateDay({ tasks: day.tasks.filter(t => t.sectionId !== sectionId) });
  }

  function addTaskToSection(sectionId: string) {
    const text = (sectionInputs[sectionId] || "").trim();
    if (!text) return;
    const task: Task = { id: Date.now().toString(), text, done: false, sectionId };
    updateDay({ tasks: [...day.tasks, task] });
    setSectionInputs(prev => ({ ...prev, [sectionId]: "" }));
  }

  function toggleTask(id: string) {
    updateDay({ tasks: day.tasks.map(t => t.id === id ? { ...t, done: !t.done } : t) });
  }

  function deleteTask(id: string) {
    updateDay({ tasks: day.tasks.filter(t => t.id !== id) });
  }

  function toggleHabit(id: string) {
    updateDay({ habits: { ...day.habits, [id]: !day.habits[id] } });
  }

  function addHabit() {
    if (!newHabitName.trim()) return;
    setHabits([...habits, { id: Date.now().toString(), name: newHabitName.trim(), emoji: newHabitEmoji }]);
    setNewHabitName(""); setNewHabitEmoji("⭐"); setShowAddHabit(false);
  }

  function deleteHabit(id: string) {
    setHabits(habits.filter(h => h.id !== id));
  }

  async function generateAIPlan() {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai/day-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: aiPrompt.trim(), date: format(selectedDate, "MMMM d, yyyy") }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed");
      updateDay({ aiPlan: data.plan });
    } catch (err: any) {
      updateDay({ aiPlan: `Failed to generate plan: ${err.message}` });
    } finally {
      setAiLoading(false);
      setAiPrompt("");
    }
  }

  const last7 = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 6 - i);
    const k = dateKey(d);
    const dd = data[k];
    if (!dd) return { label: format(d, "EEE"), pct: 0, isToday: isToday(d) };
    const tt = dd.tasks.length ? Math.round((dd.tasks.filter(t => t.done).length / dd.tasks.length) * 100) : 0;
    const hh = habits.length ? Math.round((habits.filter(h => dd.habits[h.id]).length / habits.length) * 100) : 0;
    return { label: format(d, "EEE"), pct: Math.round((tt + hh) / 2), isToday: isToday(d) };
  }), [data, habits]);

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Daily Tracker</h1>
            <p className="text-zinc-400 text-sm mt-0.5">Plan your day, track habits, measure progress</p>
          </div>
          <div className="flex items-center gap-3">
            {saveStatus !== "idle" && (
              <span className={`text-xs font-medium transition-all ${saveStatus === "saved" ? "text-emerald-400" : "text-zinc-500"}`}>
                {saveStatus === "saving" ? "Saving..." : "✓ Saved"}
              </span>
            )}
            <button
              onClick={manualSave}
              className="px-3 py-1.5 rounded-xl text-xs font-bold border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white transition-all"
            >
              Save
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: `${GOLD}18`, border: `1px solid ${GOLD}40`, color: GOLD }}>
              <Flame className="w-3.5 h-3.5" />
              {streak} day streak
            </div>
          </div>
        </div>

        {/* Week Calendar Strip */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => setSelectedDate(d => subDays(d, 7))} className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors">
              <ChevronLeft className="w-4 h-4 text-zinc-400" />
            </button>
            <span className="text-sm font-semibold text-white">{format(weekStart, "MMMM yyyy")}</span>
            <button onClick={() => setSelectedDate(d => addDays(d, 7))} className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors">
              <ChevronRight className="w-4 h-4 text-zinc-400" />
            </button>
          </div>
          <div className="overflow-x-auto"><div className="grid grid-cols-7 gap-1.5 min-w-[400px]">
            {weekDays.map(d => {
              const k = dateKey(d);
              const dd = data[k];
              const tt = dd?.tasks.length ? Math.round((dd.tasks.filter(t => t.done).length / dd.tasks.length) * 100) : 0;
              const hh = habits.length && dd ? Math.round((habits.filter(h => dd.habits[h.id]).length / habits.length) * 100) : 0;
              const pct = dd ? Math.round((tt + hh) / 2) : -1;
              const selected = isSameDay(d, selectedDate);
              const today = isToday(d);
              return (
                <button
                  key={k}
                  onClick={() => setSelectedDate(d)}
                  className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl transition-all ${selected ? "bg-primary text-primary-foreground" : today ? "border border-primary/40 bg-primary/10" : "hover:bg-zinc-800"}`}
                >
                  <span className={`text-[10px] font-semibold uppercase ${selected ? "text-primary-foreground/70" : "text-zinc-500"}`}>{format(d, "EEE")}</span>
                  <span className={`text-sm font-bold ${selected ? "text-white" : today ? "text-primary" : "text-zinc-300"}`}>{format(d, "d")}</span>
                  {pct >= 0 && (
                    <div className={`w-1.5 h-1.5 rounded-full ${pct >= 80 ? "bg-emerald-400" : pct >= 50 ? "bg-yellow-400" : "bg-zinc-600"}`} />
                  )}
                </button>
              );
            })}
          </div></div>
        </div>

        {/* Selected date label */}
        <div className="flex items-center gap-3 mb-5">
          <CalendarDays className="w-4 h-4" style={{ color: GOLD }} />
          <span className="text-base font-bold text-white">{isToday(selectedDate) ? "Today — " : ""}{format(selectedDate, "EEEE, MMMM d")}</span>
          <div className="flex-1 h-px bg-zinc-800" />
          <span className="text-xs font-semibold" style={{ color: overallPct >= 80 ? "#4ade80" : overallPct >= 50 ? GOLD : "#71717a" }}>{overallPct}% complete</span>
        </div>

        {/* AI Plan Generator */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4" style={{ color: GOLD }} />
            <span className="text-sm font-bold text-white">AI Day Planner</span>
          </div>
          {day.aiPlan ? (
            <div className="relative">
              <pre className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed font-sans">{day.aiPlan}</pre>
              <button onClick={() => updateDay({ aiPlan: "" })} className="absolute top-0 right-0 p-1 rounded hover:bg-zinc-800 transition-colors">
                <X className="w-3.5 h-3.5 text-zinc-500" />
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                onKeyDown={e => e.key === "Enter" && generateAIPlan()}
                placeholder="What's your main goal for today? (e.g. close 2 deals, finish landing page...)"
                className="flex-1 bg-zinc-800/60 border-zinc-700 text-sm"
              />
              <Button onClick={generateAIPlan} disabled={aiLoading || !aiPrompt.trim()} size="sm" style={{ background: GOLD, color: "#000" }}>
                {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              </Button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 p-1 rounded-xl bg-zinc-900/60 border border-zinc-800 w-fit">
          {(["tasks", "habits", "progress"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${activeTab === tab ? "bg-primary text-primary-foreground" : "text-zinc-400 hover:text-white"}`}
            >
              {tab === "tasks" ? <span className="flex items-center gap-1.5"><ListTodo className="w-3.5 h-3.5" />Goals</span>
                : tab === "habits" ? <span className="flex items-center gap-1.5"><Target className="w-3.5 h-3.5" />{tab}</span>
                  : <span className="flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5" />{tab}</span>}
            </button>
          ))}
        </div>

        {/* TASKS TAB */}
        {activeTab === "tasks" && (
          <div className="space-y-5">
            {/* Progress */}
            <div className="flex items-center gap-3">
              <Progress value={taskPct} className="flex-1 h-2" />
              <span className="text-xs text-zinc-400 w-16 text-right">{doneTasks}/{totalTasks} done</span>
            </div>

            {/* Main tab selector row */}
            <div className="flex items-center gap-2 flex-wrap">
              {mainTabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveMainTabId(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                    activeMainTabId === tab.id
                      ? "text-black border-transparent"
                      : "text-zinc-400 border-zinc-800 hover:border-zinc-600 hover:text-white bg-zinc-900/40"
                  }`}
                  style={activeMainTabId === tab.id ? { background: GOLD, borderColor: GOLD } : {}}
                >
                  <span>{tab.emoji}</span>
                  <span>{tab.name}</span>
                </button>
              ))}

              {/* Add tab button */}
              {showAddTab ? (
                <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded-xl px-2 py-1">
                  <Input
                    value={newTabEmoji}
                    onChange={e => setNewTabEmoji(e.target.value)}
                    className="w-10 bg-transparent border-0 text-center text-base p-0 h-6 focus-visible:ring-0"
                    maxLength={2}
                  />
                  <Input
                    autoFocus
                    value={newTabName}
                    onChange={e => setNewTabName(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") addTab(); if (e.key === "Escape") setShowAddTab(false); }}
                    placeholder="Tab name..."
                    className="bg-transparent border-0 text-xs text-white p-0 h-6 w-28 focus-visible:ring-0"
                  />
                  <button onClick={addTab} className="text-xs font-bold px-2 py-0.5 rounded-lg" style={{ background: GOLD, color: "#000" }}>Add</button>
                  <button onClick={() => setShowAddTab(false)} className="text-zinc-500 hover:text-zinc-300"><X className="w-3.5 h-3.5" /></button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddTab(true)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-zinc-500 border border-dashed border-zinc-700 hover:border-zinc-500 hover:text-zinc-300 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" /> Add tab
                </button>
              )}

              {/* Delete active tab */}
              {mainTabs.length > 1 && activeMainTab && (
                <button
                  onClick={() => deleteTab(activeMainTab.id)}
                  className="ml-auto text-zinc-700 hover:text-red-400 transition-colors"
                  title={`Delete "${activeMainTab.name}" tab`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Active tab content */}
            {activeMainTab && (
              <div className="space-y-4">
                {/* Sections inside active tab */}
                {activeMainTab.sections.length === 0 && !showAddSection && (
                  <div className="py-8 text-center text-zinc-700 text-sm border border-dashed border-zinc-800 rounded-2xl">
                    No sections yet — add one below
                  </div>
                )}

                {activeMainTab.sections.map(sec => {
                  const secTasks = day.tasks.filter(t => t.sectionId === sec.id);
                  const secDone = secTasks.filter(t => t.done).length;
                  const inputVal = sectionInputs[sec.id] || "";

                  return (
                    <div key={sec.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
                      {/* Section header */}
                      <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-zinc-800/60 bg-zinc-900/50">
                        <p className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex-1">{sec.name}</p>
                        <span className="text-[10px] text-zinc-600">{secDone}/{secTasks.length}</span>
                        <button onClick={() => deleteSection(sec.id)} className="text-zinc-700 hover:text-red-400 transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Tasks */}
                      <div className="px-4 py-2 space-y-0.5">
                        {secTasks.length === 0 && (
                          <p className="text-xs text-zinc-700 py-2">No tasks yet</p>
                        )}
                        {secTasks.map(task => (
                          <div
                            key={task.id}
                            className={`flex items-center gap-3 py-2 border-b border-zinc-800/30 last:border-0 ${task.done ? "opacity-50" : ""}`}
                          >
                            <button onClick={() => toggleTask(task.id)} className="flex-shrink-0">
                              {task.done
                                ? <CheckCircle2 style={{ width: 17, height: 17 }} className="text-emerald-400" />
                                : <Circle style={{ width: 17, height: 17 }} className="text-zinc-600 hover:text-zinc-400 transition-colors" />}
                            </button>
                            <span className={`flex-1 text-sm ${task.done ? "line-through text-zinc-500" : "text-zinc-200"}`}>{task.text}</span>
                            <button onClick={() => deleteTask(task.id)} className="text-zinc-700 hover:text-red-400 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Inline add task */}
                      <div className="flex gap-2 px-4 pb-3 pt-1">
                        <Input
                          value={inputVal}
                          onChange={e => setSectionInputs(prev => ({ ...prev, [sec.id]: e.target.value }))}
                          onKeyDown={e => e.key === "Enter" && addTaskToSection(sec.id)}
                          placeholder="Add a task..."
                          className="flex-1 bg-zinc-800/50 border-zinc-700/50 text-sm h-8"
                        />
                        <Button onClick={() => addTaskToSection(sec.id)} size="sm" className="h-8 px-3" style={{ background: GOLD, color: "#000" }}>
                          <Plus className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}

                {/* Add section inside active tab */}
                {showAddSection ? (
                  <div className="rounded-2xl border border-zinc-700 bg-zinc-900/40 p-4 space-y-3">
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">New section in {activeMainTab.name}</p>
                    <div className="flex gap-2">
                      <Input
                        autoFocus
                        value={newSectionName}
                        onChange={e => setNewSectionName(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") addSection(); if (e.key === "Escape") setShowAddSection(false); }}
                        placeholder="Section name..."
                        className="flex-1 bg-zinc-800/60 border-zinc-700 text-sm"
                      />
                      <Button onClick={addSection} size="sm" style={{ background: GOLD, color: "#000" }}>Add</Button>
                      <Button onClick={() => setShowAddSection(false)} size="sm" variant="ghost" className="text-zinc-500">Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAddSection(true)}
                    className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors w-full py-2"
                  >
                    <Plus className="w-4 h-4" /> Add section
                  </button>
                )}
              </div>
            )}

            {/* Daily note */}
            <div>
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Daily Note</p>
              <Textarea
                value={day.note}
                onChange={e => updateDay({ note: e.target.value })}
                placeholder="Reflections, wins, blockers for today..."
                className="bg-zinc-800/60 border-zinc-700 text-sm resize-none"
                rows={3}
              />
            </div>
          </div>
        )}

        {/* HABITS TAB */}
        {activeTab === "habits" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Progress value={habitPct} className="flex-1 h-2" />
              <span className="text-xs text-zinc-400 w-20 text-right">{doneHabits}/{habits.length} habits</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {habits.map(habit => {
                const done = !!day.habits[habit.id];
                return (
                  <button
                    key={habit.id}
                    onClick={() => toggleHabit(habit.id)}
                    className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${done ? "border-emerald-500/40 bg-emerald-500/10" : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"}`}
                  >
                    <span className="text-2xl">{habit.emoji}</span>
                    <span className={`flex-1 text-sm font-medium ${done ? "text-emerald-300" : "text-zinc-300"}`}>{habit.name}</span>
                    {done
                      ? <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                      : <Circle className="w-5 h-5 text-zinc-700 flex-shrink-0" />}
                    <button
                      onClick={e => { e.stopPropagation(); deleteHabit(habit.id); }}
                      className="text-zinc-700 hover:text-red-400 transition-colors ml-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </button>
                );
              })}
            </div>

            {/* Add habit */}
            {showAddHabit ? (
              <div className="flex gap-2 items-center">
                <Input value={newHabitEmoji} onChange={e => setNewHabitEmoji(e.target.value)} className="w-16 bg-zinc-800/60 border-zinc-700 text-center text-lg" maxLength={2} />
                <Input value={newHabitName} onChange={e => setNewHabitName(e.target.value)} onKeyDown={e => e.key === "Enter" && addHabit()} placeholder="Habit name..." className="flex-1 bg-zinc-800/60 border-zinc-700 text-sm" />
                <Button onClick={addHabit} size="sm" style={{ background: GOLD, color: "#000" }}>Add</Button>
                <Button onClick={() => setShowAddHabit(false)} size="sm" variant="ghost" className="text-zinc-500">Cancel</Button>
              </div>
            ) : (
              <button onClick={() => setShowAddHabit(true)} className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
                <Plus className="w-4 h-4" /> Add habit
              </button>
            )}
          </div>
        )}

        {/* PROGRESS TAB */}
        {activeTab === "progress" && (
          <div className="space-y-6">
            {/* Today's summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: "Tasks", value: `${taskPct}%`, sub: `${doneTasks}/${totalTasks} done`, color: "text-blue-400" },
                { label: "Habits", value: `${habitPct}%`, sub: `${doneHabits}/${habits.length} done`, color: "text-emerald-400" },
                { label: "Overall", value: `${overallPct}%`, sub: "day score", color: overallPct >= 80 ? "text-emerald-400" : overallPct >= 50 ? "text-yellow-400" : "text-zinc-500" },
              ].map(s => (
                <div key={s.label} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 text-center">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{s.label}</p>
                  <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-zinc-600 mt-1">{s.sub}</p>
                </div>
              ))}
            </div>

            {/* 7-day bar chart */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
              <p className="text-sm font-bold text-white mb-4">Last 7 Days</p>
              <div className="flex items-end gap-2 h-28">
                {last7.map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-zinc-500">{d.pct > 0 ? `${d.pct}%` : ""}</span>
                    <div className="w-full rounded-t-md transition-all" style={{
                      height: `${Math.max(d.pct, 4)}%`,
                      background: d.isToday ? GOLD : d.pct >= 80 ? "#4ade80" : d.pct >= 50 ? "#facc15" : "#3f3f46",
                      minHeight: 4,
                    }} />
                    <span className={`text-[10px] font-semibold ${d.isToday ? "text-primary" : "text-zinc-500"}`}>{d.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Habit streak grid */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
              <p className="text-sm font-bold text-white mb-4">Habit History (Last 7 Days)</p>
              <div className="space-y-3">
                {habits.map(habit => (
                  <div key={habit.id} className="flex items-center gap-3">
                    <span className="text-base w-6">{habit.emoji}</span>
                    <span className="text-xs text-zinc-400 w-24 truncate">{habit.name}</span>
                    <div className="flex gap-1.5 flex-1">
                      {Array.from({ length: 7 }, (_, i) => {
                        const d = subDays(new Date(), 6 - i);
                        const k = dateKey(d);
                        const done = data[k]?.habits[habit.id];
                        return (
                          <div key={i} className={`flex-1 h-5 rounded ${done ? "bg-emerald-500/70" : "bg-zinc-800"}`} title={format(d, "MMM d")} />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  );
}
