import PortalLayout from "./Layout";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BookOpen, Plus, Video, FileText, Link2, Pencil, Trash2,
  ChevronDown, ChevronUp, Globe, Lock, GripVertical
} from "lucide-react";

const GOLD = "#d4b461";

interface Lesson {
  id: string;
  title: string;
  type: "video" | "document" | "link";
  url: string;
  duration?: string;
}

interface Module {
  id: string;
  title: string;
  description: string;
  status: "draft" | "published";
  lessons: Lesson[];
}

const TYPE_ICONS: Record<string, any> = { video: Video, document: FileText, link: Link2 };
const TYPE_COLORS: Record<string, string> = {
  video: "text-blue-400",
  document: "text-green-400",
  link: "text-purple-400",
};

const INITIAL_MODULES: Module[] = [
  {
    id: "1", title: "Brand Strategy Fundamentals",
    description: "Core principles of building a memorable brand online.", status: "published",
    lessons: [
      { id: "l1", title: "What is Brand Identity?", type: "video", url: "", duration: "12 min" },
      { id: "l2", title: "Positioning Worksheet", type: "document", url: "" },
    ],
  },
  {
    id: "2", title: "Content Creation Masterclass",
    description: "From scripting to editing — create content that converts.", status: "draft",
    lessons: [
      { id: "l3", title: "Scripting for Reels", type: "video", url: "", duration: "18 min" },
    ],
  },
];

function LessonRow({ lesson, onDelete }: { lesson: Lesson; onDelete: () => void }) {
  const Icon = TYPE_ICONS[lesson.type] || FileText;
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent group">
      <GripVertical className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100" />
      <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${TYPE_COLORS[lesson.type]}`} />
      <span className="flex-1 text-sm text-foreground">{lesson.title}</span>
      {lesson.duration && <span className="text-[10px] text-muted-foreground">{lesson.duration}</span>}
      <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function CourseModules() {
  const { toast } = useToast();
  const [modules, setModules] = useState<Module[]>(INITIAL_MODULES);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ "1": true });
  const [moduleDialog, setModuleDialog] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [lessonDialog, setLessonDialog] = useState<string | null>(null);
  const [mTitle, setMTitle] = useState("");
  const [mDesc, setMDesc] = useState("");
  const [mStatus, setMStatus] = useState<"draft" | "published">("draft");
  const [lTitle, setLTitle] = useState("");
  const [lType, setLType] = useState<"video" | "document" | "link">("video");
  const [lUrl, setLUrl] = useState("");
  const [lDuration, setLDuration] = useState("");

  const openNewModule = () => {
    setEditingModule(null); setMTitle(""); setMDesc(""); setMStatus("draft"); setModuleDialog(true);
  };

  const openEditModule = (m: Module) => {
    setEditingModule(m); setMTitle(m.title); setMDesc(m.description); setMStatus(m.status); setModuleDialog(true);
  };

  const saveModule = () => {
    if (!mTitle.trim()) return;
    if (editingModule) {
      setModules((prev) => prev.map((m) => m.id === editingModule.id ? { ...m, title: mTitle, description: mDesc, status: mStatus } : m));
      toast({ title: "Module updated" });
    } else {
      const newModule: Module = { id: Date.now().toString(), title: mTitle, description: mDesc, status: mStatus, lessons: [] };
      setModules((prev) => [...prev, newModule]);
      toast({ title: "Module created" });
    }
    setModuleDialog(false);
  };

  const deleteModule = (id: string) => {
    setModules((prev) => prev.filter((m) => m.id !== id));
    toast({ title: "Module deleted" });
  };

  const addLesson = (moduleId: string) => {
    if (!lTitle.trim()) return;
    const lesson: Lesson = { id: Date.now().toString(), title: lTitle, type: lType, url: lUrl, duration: lDuration };
    setModules((prev) => prev.map((m) => m.id === moduleId ? { ...m, lessons: [...m.lessons, lesson] } : m));
    setLTitle(""); setLType("video"); setLUrl(""); setLDuration(""); setLessonDialog(null);
    toast({ title: "Lesson added" });
  };

  const deleteLesson = (moduleId: string, lessonId: string) => {
    setModules((prev) => prev.map((m) => m.id === moduleId ? { ...m, lessons: m.lessons.filter((l) => l.id !== lessonId) } : m));
  };

  const published = modules.filter((m) => m.status === "published").length;

  return (
    <PortalLayout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <BookOpen className="w-6 h-6" style={{ color: GOLD }} />
              Course Modules
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{published} published · {modules.length - published} draft</p>
          </div>
          <Button onClick={openNewModule} size="sm" className="gap-2" style={{ background: GOLD, color: "#0a0910" }}>
            <Plus className="w-4 h-4" /> New Module
          </Button>
        </div>

        {modules.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <BookOpen className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-sm">No modules yet. Create your first.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {modules.map((module) => (
              <div key={module.id} className="rounded-xl border border-border bg-card overflow-hidden">
                <div
                  className="flex items-center gap-3 p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => setExpanded((prev) => ({ ...prev, [module.id]: !prev[module.id] }))}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${GOLD}18` }}>
                    <BookOpen className="w-4 h-4" style={{ color: GOLD }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm text-foreground">{module.title}</p>
                      <Badge variant="outline" className={`text-[10px] gap-1 ${module.status === "published" ? "text-green-400 border-green-800" : "text-muted-foreground"}`}>
                        {module.status === "published" ? <Globe className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
                        {module.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{module.description}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <span className="text-xs text-muted-foreground">{module.lessons.length} lessons</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditModule(module)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-950" onClick={() => deleteModule(module.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                    {expanded[module.id] ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </div>

                {expanded[module.id] && (
                  <div className="border-t border-border px-4 py-3">
                    {module.lessons.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2">No lessons yet.</p>
                    ) : (
                      <div className="space-y-0.5 mb-3">
                        {module.lessons.map((lesson) => (
                          <LessonRow key={lesson.id} lesson={lesson} onDelete={() => deleteLesson(module.id, lesson.id)} />
                        ))}
                      </div>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs gap-1.5 mt-1"
                      onClick={() => { setLTitle(""); setLType("video"); setLUrl(""); setLDuration(""); setLessonDialog(module.id); }}
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Lesson
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={moduleDialog} onOpenChange={setModuleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingModule ? "Edit Module" : "New Module"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div><Label className="text-xs mb-1.5 block">Title</Label><Input value={mTitle} onChange={(e) => setMTitle(e.target.value)} placeholder="Module title" /></div>
            <div><Label className="text-xs mb-1.5 block">Description</Label><Textarea value={mDesc} onChange={(e) => setMDesc(e.target.value)} rows={2} placeholder="What will clients learn?" /></div>
            <div>
              <Label className="text-xs mb-1.5 block">Status</Label>
              <Select value={mStatus} onValueChange={(v: any) => setMStatus(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" style={{ background: GOLD, color: "#0a0910" }} onClick={saveModule} disabled={!mTitle.trim()}>
              {editingModule ? "Update Module" : "Create Module"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!lessonDialog} onOpenChange={(open) => { if (!open) setLessonDialog(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Lesson</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div><Label className="text-xs mb-1.5 block">Lesson Title</Label><Input value={lTitle} onChange={(e) => setLTitle(e.target.value)} placeholder="Lesson title" /></div>
            <div>
              <Label className="text-xs mb-1.5 block">Type</Label>
              <Select value={lType} onValueChange={(v: any) => setLType(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="document">Document</SelectItem>
                  <SelectItem value="link">Link</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs mb-1.5 block">URL</Label><Input value={lUrl} onChange={(e) => setLUrl(e.target.value)} placeholder="https://" /></div>
            <div><Label className="text-xs mb-1.5 block">Duration (optional)</Label><Input value={lDuration} onChange={(e) => setLDuration(e.target.value)} placeholder="15 min" /></div>
            <Button className="w-full" style={{ background: GOLD, color: "#0a0910" }} onClick={() => lessonDialog && addLesson(lessonDialog)} disabled={!lTitle.trim()}>
              Add Lesson
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
}
