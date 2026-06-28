import SuperAdminLayout from "./Layout";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckSquare, Plus, Trash2, ChevronLeft, ChevronRight, Calendar, Flame } from "lucide-react";

const GOLD = "#d4b461";
const LS_KEY = "super_admin_todos_v1";
const HABITS_KEY = "super_admin_habits_v1";

type Priority = "high" | "medium" | "low";

interface Todo {
  id: string;
  text: string;
  done: boolean;
  priority: Priority;
  createdAt: string;
}

interface HabitEntry {
  name: string;
  done: boolean;
}

function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

function toKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function loadTodos(): Record<string, Todo[]> {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}"); } catch { return {}; }
}
function saveTodos(data: Record<string, Todo[]>) { localStorage.setItem(LS_KEY, JSON.stringify(data)); }

function loadHabits(): Record<string, HabitEntry[]> {
  try { return JSON.parse(localStorage.getItem(HABITS_KEY) || "{}"); } catch { return {}; }
}
function saveHabits(data: Record<string, HabitEntry[]>) { localStorage.setItem(HABITS_KEY, JSON.stringify(data)); }

const PRIORITY_STYLES: Record<Priority, string> = {
  high: "bg-red-900/60 text-red-300",
  medium: "bg-amber-900/60 text-amber-300",
  low: "bg-zinc-700 text-zinc-300",
};

const DEFAULT_HABITS = ["Exercise", "Read", "Meditate", "Review clients", "Plan tomorrow"];

function fmt(d: Date) {
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

export default function TodoList() {
  const { toast } = useToast();
  const [date, setDate] = useState(new Date());
  const dateKey = toKey(date);

  const [allTodos, setAllTodos] = useState<Record<string, Todo[]>>(loadTodos);
  const [allHabits, setAllHabits] = useState<Record<string, HabitEntry[]>>(loadHabits);

  const [newTodo, setNewTodo] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");

  const [newHabitName, setNewHabitName] = useState("");
  const [showHabitInput, setShowHabitInput] = useState(false);

  useEffect(() => { saveTodos(allTodos); }, [allTodos]);
  useEffect(() => { saveHabits(allHabits); }, [allHabits]);

  const todos = allTodos[dateKey] || [];
  const rawHabits = allHabits[dateKey];
  const habits: HabitEntry[] = rawHabits ?? DEFAULT_HABITS.map((name) => ({ name, done: false }));

  function setTodos(updater: (prev: Todo[]) => Todo[]) {
    setAllTodos((prev) => ({ ...prev, [dateKey]: updater(prev[dateKey] || []) }));
  }

  function setHabits(h: HabitEntry[]) {
    setAllHabits((prev) => ({ ...prev, [dateKey]: h }));
  }

  function addTodo() {
    if (!newTodo.trim()) return;
    setTodos((prev) => [
      ...prev,
      { id: uid(), text: newTodo.trim(), done: false, priority, createdAt: new Date().toISOString() },
    ]);
    setNewTodo("");
  }

  function toggleTodo(id: string) {
    setTodos((prev) => prev.map((t) => t.id === id ? { ...t, done: !t.done } : t));
  }

  function deleteTodo(id: string) {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  }

  function toggleHabit(idx: number) {
    const updated = habits.map((h, i) => i === idx ? { ...h, done: !h.done } : h);
    setHabits(updated);
  }

  function addHabit() {
    if (!newHabitName.trim()) return;
    setHabits([...habits, { name: newHabitName.trim(), done: false }]);
    setNewHabitName("");
    setShowHabitInput(false);
  }

  function deleteHabit(idx: number) {
    setHabits(habits.filter((_, i) => i !== idx));
  }

  function prevDay() { const d = new Date(date); d.setDate(d.getDate() - 1); setDate(d); }
  function nextDay() { const d = new Date(date); d.setDate(d.getDate() + 1); setDate(d); }
  function goToday() { setDate(new Date()); }

  const isToday = toKey(date) === toKey(new Date());
  const doneTodos = todos.filter((t) => t.done).length;
  const doneHabits = habits.filter((h) => h.done).length;

  const sorted = [...todos].sort((a, b) => {
    const p = { high: 0, medium: 1, low: 2 };
    if (a.done !== b.done) return a.done ? 1 : -1;
    return p[a.priority] - p[b.priority];
  });

  return (
    <SuperAdminLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <CheckSquare className="w-5 h-5" style={{ color: GOLD }} /> To-Do List
          </h1>
        </div>

        {/* Date navigation */}
        <div className="flex items-center gap-3">
          <button onClick={prevDay} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 text-center">
            <p className="font-semibold text-sm text-foreground">{fmt(date)}</p>
            {!isToday && (
              <button onClick={goToday} className="text-xs mt-0.5 transition-colors" style={{ color: GOLD }}>
                Back to today
              </button>
            )}
          </div>
          <button onClick={nextDay} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Progress summary */}
        {(todos.length > 0 || habits.length > 0) && (
          <div className="flex gap-3">
            {todos.length > 0 && (
              <div className="flex-1 rounded-xl border border-border bg-card p-3 text-center">
                <p className="text-2xl font-bold text-foreground">{doneTodos}<span className="text-base text-muted-foreground">/{todos.length}</span></p>
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

        {/* Add todo */}
        <div className="flex gap-2">
          <Input
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            placeholder="Add a task..."
            className="flex-1"
            onKeyDown={(e) => e.key === "Enter" && addTodo()}
          />
          <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
            <SelectTrigger className="w-28 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={addTodo} className="h-9 px-3"><Plus className="w-4 h-4" /></Button>
        </div>

        {/* Todo list */}
        {sorted.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No tasks for this day. Add one above.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sorted.map((t) => (
              <div key={t.id} className={`flex items-center gap-3 p-3 rounded-xl border bg-card transition-opacity group ${t.done ? "opacity-50" : ""}`}>
                <Checkbox
                  checked={t.done}
                  onCheckedChange={() => toggleTodo(t.id)}
                  className="flex-shrink-0"
                />
                <span className={`flex-1 text-sm ${t.done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                  {t.text}
                </span>
                <Badge className={`text-[10px] px-2 py-0 flex-shrink-0 ${PRIORITY_STYLES[t.priority]}`}>
                  {t.priority}
                </Badge>
                <button onClick={() => deleteTodo(t.id)} className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-border" />

        {/* Habit Tracker */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <Flame className="w-4 h-4" style={{ color: GOLD }} /> Daily Habits
            </h2>
            <button onClick={() => setShowHabitInput((v) => !v)} className="text-xs transition-colors" style={{ color: GOLD }}>
              + Add habit
            </button>
          </div>

          {showHabitInput && (
            <div className="flex gap-2">
              <Input value={newHabitName} onChange={(e) => setNewHabitName(e.target.value)} placeholder="Habit name..." className="h-8 text-sm" autoFocus onKeyDown={(e) => e.key === "Enter" && addHabit()} />
              <Button size="sm" onClick={addHabit} className="h-8">Add</Button>
              <Button size="sm" variant="outline" onClick={() => setShowHabitInput(false)} className="h-8">Cancel</Button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {habits.map((h, i) => (
              <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border bg-card group transition-all ${h.done ? "opacity-60" : ""}`}>
                <Checkbox checked={h.done} onCheckedChange={() => toggleHabit(i)} className="flex-shrink-0" />
                <span className={`flex-1 text-sm ${h.done ? "line-through text-muted-foreground" : "text-foreground"}`}>{h.name}</span>
                <button onClick={() => deleteHabit(i)} className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Google Calendar Embed */}
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
          <p className="text-[11px] text-muted-foreground">Make sure you&apos;re signed into oravini@gmail.com in your browser for the calendar to load.</p>
        </div>
      </div>
    </SuperAdminLayout>
  );
}
