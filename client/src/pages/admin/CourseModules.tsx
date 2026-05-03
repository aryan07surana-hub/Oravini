import { useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  BookOpen, Plus, Video, FileText, Link2, Pencil, Trash2, ChevronDown, ChevronUp, GripVertical, Lock, Globe
} from "lucide-react";

interface Module {
  id: string;
  title: string;
  description: string;
  status: "draft" | "published";
  lessons: Lesson[];
}

interface Lesson {
  id: string;
  title: string;
  type: "video" | "document" | "link";
  url: string;
  duration?: string;
}

const SAMPLE_MODULES: Module[] = [
  {
    id: "1",
    title: "Brand Strategy Fundamentals",
    description: "Core principles of building a memorable brand online.",
    status: "published",
    lessons: [
      { id: "l1", title: "What is Brand Identity?", type: "video", url: "", duration: "12 min" },
      { id: "l2", title: "Positioning Worksheet", type: "document", url: "", duration: "" },
    ],
  },
  {
    id: "2",
    title: "Content Creation Masterclass",
    description: "From scripting to editing — create content that converts.",
    status: "draft",
    lessons: [
      { id: "l3", title: "Scripting for Reels", type: "video", url: "", duration: "18 min" },
    ],
  },
];

const TYPE_ICONS: Record<string, any> = {
  video: Video,
  document: FileText,
  link: Link2,
};

const TYPE_COLORS: Record<string, string> = {
  video: "bg-red-500/10 text-red-400 border-red-500/20",
  document: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  link: "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

function ModuleCard({ mod, onDelete }: { mod: Module; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="border border-card-border" data-testid={`module-card-${mod.id}`}>
      <CardContent className="p-0">
        <div className="flex items-center gap-3 p-4">
          <div className="text-muted-foreground cursor-grab flex-shrink-0">
            <GripVertical className="w-4 h-4" />
          </div>
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-foreground">{mod.title}</p>
              <Badge
                variant="outline"
                className={`text-[10px] ${mod.status === "published" ? "border-green-500/30 text-green-400" : "border-muted-foreground/30 text-muted-foreground"}`}
              >
                {mod.status === "published" ? <Globe className="w-2.5 h-2.5 mr-1" /> : <Lock className="w-2.5 h-2.5 mr-1" />}
                {mod.status === "published" ? "Published" : "Draft"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{mod.description}</p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Badge variant="outline" className="text-[10px] border-card-border">{mod.lessons.length} lessons</Badge>
            <button
              onClick={() => setExpanded(e => !e)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              data-testid={`expand-module-${mod.id}`}
            >
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              data-testid={`delete-module-${mod.id}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {expanded && (
          <div className="border-t border-card-border px-4 pb-4 pt-3 space-y-2">
            {mod.lessons.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">No lessons yet. Add your first lesson.</p>
            ) : (
              mod.lessons.map((lesson, i) => {
                const Icon = TYPE_ICONS[lesson.type] || FileText;
                return (
                  <div key={lesson.id} className="flex items-center gap-3 p-3 rounded-lg bg-card border border-card-border" data-testid={`lesson-${lesson.id}`}>
                    <span className="text-[10px] text-muted-foreground font-bold w-4 flex-shrink-0">{i + 1}</span>
                    <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 border ${TYPE_COLORS[lesson.type]}`}>
                      <Icon className="w-3 h-3" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground">{lesson.title}</p>
                      {lesson.duration && <p className="text-[10px] text-muted-foreground mt-0.5">{lesson.duration}</p>}
                    </div>
                    <Badge variant="outline" className={`text-[10px] capitalize ${TYPE_COLORS[lesson.type]} border`}>{lesson.type}</Badge>
                  </div>
                );
              })
            )}
            <button className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-muted-foreground hover:text-primary border border-dashed border-card-border rounded-lg hover:border-primary/30 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add Lesson
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function CourseModules() {
  const { toast } = useToast();
  const [modules, setModules] = useState<Module[]>(SAMPLE_MODULES);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", status: "draft" as "draft" | "published" });

  const handleCreate = () => {
    if (!form.title.trim()) {
      toast({ title: "Title required", variant: "destructive" });
      return;
    }
    const newMod: Module = {
      id: Date.now().toString(),
      title: form.title.trim(),
      description: form.description.trim(),
      status: form.status,
      lessons: [],
    };
    setModules(m => [newMod, ...m]);
    setForm({ title: "", description: "", status: "draft" });
    setCreateOpen(false);
    toast({ title: "Module created", description: `"${newMod.title}" has been added.` });
  };

  const handleDelete = (id: string) => {
    setModules(m => m.filter(mod => mod.id !== id));
    toast({ title: "Module removed" });
  };

  const published = modules.filter(m => m.status === "published");
  const drafts = modules.filter(m => m.status === "draft");

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Course Modules</h1>
              <p className="text-xs text-muted-foreground">Manage course content and lessons for your clients</p>
            </div>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5" data-testid="button-create-module">
                <Plus className="w-4 h-4" /> New Module
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create Module</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Module Title *</Label>
                  <Input
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. Brand Strategy Fundamentals"
                    data-testid="input-module-title"
                    className="bg-card border-card-border"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</Label>
                  <Textarea
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="What will clients learn in this module?"
                    data-testid="input-module-description"
                    className="bg-card border-card-border resize-none"
                    rows={3}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</Label>
                  <Select value={form.status} onValueChange={(v: any) => setForm(f => ({ ...f, status: v }))}>
                    <SelectTrigger className="bg-card border-card-border" data-testid="select-module-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft — not visible to clients</SelectItem>
                      <SelectItem value="published">Published — visible to clients</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button onClick={handleCreate} className="flex-1" data-testid="button-save-module">Create Module</Button>
                  <Button variant="outline" onClick={() => setCreateOpen(false)} className="flex-1">Cancel</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Modules", value: modules.length, color: "text-primary" },
            { label: "Published", value: published.length, color: "text-green-400" },
            { label: "Drafts", value: drafts.length, color: "text-muted-foreground" },
          ].map(({ label, value, color }) => (
            <Card key={label} className="border border-card-border">
              <CardContent className="p-4 text-center">
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-muted-foreground mt-1">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {modules.length === 0 ? (
          <Card className="border border-card-border">
            <CardContent className="p-12 text-center">
              <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium text-foreground mb-1">No modules yet</p>
              <p className="text-xs text-muted-foreground mb-4">Create your first course module to get started.</p>
              <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Create First Module
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {modules.map(mod => (
              <ModuleCard key={mod.id} mod={mod} onDelete={() => handleDelete(mod.id)} />
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
