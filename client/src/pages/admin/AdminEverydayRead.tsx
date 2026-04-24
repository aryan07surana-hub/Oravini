import { useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
    BookOpen, Plus, Trash2, Edit3, X, Save, Loader2,
    Clock, Tag, Star, FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const GOLD = "#d4b461";

const CATEGORIES = [
    "Books", "Playbooks", "Sales", "Marketing", "Psychology",
    "Communication", "Business", "Wealth", "Mindset", "Systems", "SOPs"
];

const DIFFICULTIES = ["beginner", "intermediate", "advanced", "elite"];
const PRIORITIES = ["low", "medium", "high", "must_read"];
const STATUSES = ["unread", "reading", "completed"];

type ReadingMaterial = {
    id: string;
    title: string;
    author: string | null;
    source: string | null;
    category: string;
    summary: string | null;
    keyTakeaways: string[] | null;
    actionableLessons: string[] | null;
    tags: string[] | null;
    difficulty: string;
    readTimeMinutes: number;
    priority: string;
    status: string;
    fileUrl: string | null;
    fileType: string | null;
    favorite: boolean;
    mustRead: boolean;
    userName?: string;
    userEmail?: string;
    createdAt: string;
};

export default function AdminEverydayRead() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const [form, setForm] = useState({
        title: "",
        author: "",
        source: "",
        category: "Books",
        summary: "",
        keyTakeaways: "",
        actionableLessons: "",
        tags: "",
        difficulty: "intermediate",
        readTimeMinutes: 10,
        priority: "medium",
        status: "unread",
        fileUrl: "",
        fileType: "",
    });

    const { data: materials, isLoading } = useQuery<ReadingMaterial[]>({
        queryKey: ["/api/admin/reading-materials"],
    });

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await apiRequest("POST", "/api/admin/reading-materials", data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/reading-materials"] });
            toast({ title: "Material added", description: "New reading material created successfully." });
            resetForm();
        },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: any }) => {
            const res = await apiRequest("PATCH", `/api/admin/reading-materials/${id}`, data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/reading-materials"] });
            toast({ title: "Updated", description: "Material updated successfully." });
            setEditingId(null);
        },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await apiRequest("DELETE", `/api/admin/reading-materials/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/reading-materials"] });
            toast({ title: "Deleted", description: "Material removed." });
        },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });

    function resetForm() {
        setForm({
            title: "", author: "", source: "", category: "Books", summary: "",
            keyTakeaways: "", actionableLessons: "", tags: "", difficulty: "intermediate",
            readTimeMinutes: 10, priority: "medium", status: "unread", fileUrl: "", fileType: "",
        });
        setShowForm(false);
        setEditingId(null);
    }

    function handleSubmit() {
        const payload = {
            ...form,
            keyTakeaways: form.keyTakeaways.split("\n").filter(Boolean),
            actionableLessons: form.actionableLessons.split("\n").filter(Boolean),
            tags: form.tags.split(",").map((t: string) => t.trim()).filter(Boolean),
            readTimeMinutes: Number(form.readTimeMinutes) || 10,
        };
        if (editingId) {
            updateMutation.mutate({ id: editingId, data: payload });
        } else {
            createMutation.mutate(payload);
        }
    }

    function startEdit(m: ReadingMaterial) {
        setEditingId(m.id);
        setForm({
            title: m.title,
            author: m.author || "",
            source: m.source || "",
            category: m.category,
            summary: m.summary || "",
            keyTakeaways: (m.keyTakeaways || []).join("\n"),
            actionableLessons: (m.actionableLessons || []).join("\n"),
            tags: (m.tags || []).join(", "),
            difficulty: m.difficulty,
            readTimeMinutes: m.readTimeMinutes,
            priority: m.priority,
            status: m.status,
            fileUrl: m.fileUrl || "",
            fileType: m.fileType || "",
        });
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    const stats = {
        total: materials?.length || 0,
        books: materials?.filter((m: any) => m.category === "Books").length || 0,
        mustRead: materials?.filter((m: any) => m.mustRead).length || 0,
        favorites: materials?.filter((m: any) => m.favorite).length || 0,
    };

    return (
        <AdminLayout>
            <div className="p-6 lg:p-8 max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                            <BookOpen className="w-6 h-6" style={{ color: GOLD }} />
                            Everyday Read
                        </h1>
                        <p className="text-zinc-400 text-sm mt-0.5">
                            Manage reading materials and daily knowledge drops for members
                        </p>
                    </div>
                    <Button
                        onClick={() => setShowForm(!showForm)}
                        size="sm"
                        style={{ background: GOLD, color: "#000" }}
                    >
                        {showForm ? <X className="w-4 h-4 mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
                        {showForm ? "Cancel" : "Add Material"}
                    </Button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                    {[
                        { label: "Total Materials", value: stats.total, icon: FileText },
                        { label: "Books", value: stats.books, icon: BookOpen },
                        { label: "Must Read", value: stats.mustRead, icon: Star },
                        { label: "Favorites", value: stats.favorites, icon: Star },
                    ].map((s) => (
                        <div key={s.label} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{s.label}</p>
                            <p className="text-2xl font-black text-white">{s.value}</p>
                        </div>
                    ))}
                </div>

                {/* Form */}
                {showForm && (
                    <Card className="mb-6 border-zinc-800 bg-zinc-900/60">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-bold text-white">
                                {editingId ? "Edit Material" : "New Reading Material"}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-zinc-500 uppercase tracking-wider mb-1 block">Title *</label>
                                    <Input
                                        value={form.title}
                                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                                        placeholder="e.g. $100M Offers"
                                        className="bg-zinc-800/60 border-zinc-700 text-white"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-zinc-500 uppercase tracking-wider mb-1 block">Author</label>
                                    <Input
                                        value={form.author}
                                        onChange={(e) => setForm({ ...form, author: e.target.value })}
                                        placeholder="e.g. Alex Hormozi"
                                        className="bg-zinc-800/60 border-zinc-700 text-white"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="text-xs text-zinc-500 uppercase tracking-wider mb-1 block">Category</label>
                                    <select
                                        value={form.category}
                                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                                        className="w-full bg-zinc-800/60 border border-zinc-700 rounded-md text-white text-sm px-3 py-2 outline-none"
                                    >
                                        {CATEGORIES.map((c) => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-zinc-500 uppercase tracking-wider mb-1 block">Difficulty</label>
                                    <select
                                        value={form.difficulty}
                                        onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                                        className="w-full bg-zinc-800/60 border border-zinc-700 rounded-md text-white text-sm px-3 py-2 outline-none"
                                    >
                                        {DIFFICULTIES.map((d) => (
                                            <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-zinc-500 uppercase tracking-wider mb-1 block">Priority</label>
                                    <select
                                        value={form.priority}
                                        onChange={(e) => setForm({ ...form, priority: e.target.value })}
                                        className="w-full bg-zinc-800/60 border border-zinc-700 rounded-md text-white text-sm px-3 py-2 outline-none"
                                    >
                                        {PRIORITIES.map((p) => (
                                            <option key={p} value={p}>{p.replace("_", " ").toUpperCase()}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="text-xs text-zinc-500 uppercase tracking-wider mb-1 block">Read Time (min)</label>
                                    <Input
                                        type="number"
                                        value={form.readTimeMinutes}
                                        onChange={(e) => setForm({ ...form, readTimeMinutes: Number(e.target.value) })}
                                        className="bg-zinc-800/60 border-zinc-700 text-white"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-zinc-500 uppercase tracking-wider mb-1 block">Status</label>
                                    <select
                                        value={form.status}
                                        onChange={(e) => setForm({ ...form, status: e.target.value })}
                                        className="w-full bg-zinc-800/60 border border-zinc-700 rounded-md text-white text-sm px-3 py-2 outline-none"
                                    >
                                        {STATUSES.map((s) => (
                                            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-zinc-500 uppercase tracking-wider mb-1 block">Source / Reference</label>
                                    <Input
                                        value={form.source}
                                        onChange={(e) => setForm({ ...form, source: e.target.value })}
                                        placeholder="e.g. Amazon, PDF link..."
                                        className="bg-zinc-800/60 border-zinc-700 text-white"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs text-zinc-500 uppercase tracking-wider mb-1 block">Summary</label>
                                <Textarea
                                    value={form.summary}
                                    onChange={(e) => setForm({ ...form, summary: e.target.value })}
                                    placeholder="Brief summary of the material..."
                                    className="bg-zinc-800/60 border-zinc-700 text-white resize-none"
                                    rows={3}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-zinc-500 uppercase tracking-wider mb-1 block">Key Takeaways (one per line)</label>
                                    <Textarea
                                        value={form.keyTakeaways}
                                        onChange={(e) => setForm({ ...form, keyTakeaways: e.target.value })}
                                        placeholder="Takeaway 1\nTakeaway 2\nTakeaway 3"
                                        className="bg-zinc-800/60 border-zinc-700 text-white resize-none"
                                        rows={4}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-zinc-500 uppercase tracking-wider mb-1 block">Actionable Lessons (one per line)</label>
                                    <Textarea
                                        value={form.actionableLessons}
                                        onChange={(e) => setForm({ ...form, actionableLessons: e.target.value })}
                                        placeholder="Lesson 1\nLesson 2\nLesson 3"
                                        className="bg-zinc-800/60 border-zinc-700 text-white resize-none"
                                        rows={4}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-zinc-500 uppercase tracking-wider mb-1 block">Tags (comma separated)</label>
                                    <Input
                                        value={form.tags}
                                        onChange={(e) => setForm({ ...form, tags: e.target.value })}
                                        placeholder="sales, negotiation, closing..."
                                        className="bg-zinc-800/60 border-zinc-700 text-white"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-zinc-500 uppercase tracking-wider mb-1 block">File URL</label>
                                    <Input
                                        value={form.fileUrl}
                                        onChange={(e) => setForm({ ...form, fileUrl: e.target.value })}
                                        placeholder="https://..."
                                        className="bg-zinc-800/60 border-zinc-700 text-white"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-2 justify-end">
                                <Button variant="ghost" size="sm" onClick={resetForm} className="text-zinc-400">
                                    Cancel
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleSubmit}
                                    disabled={createMutation.isPending || updateMutation.isPending || !form.title.trim()}
                                    style={{ background: GOLD, color: "#000" }}
                                >
                                    {(createMutation.isPending || updateMutation.isPending) && (
                                        <Loader2 className="w-4 h-4 animate-spin mr-1" />
                                    )}
                                    <Save className="w-4 h-4 mr-1" />
                                    {editingId ? "Update" : "Save"} Material
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Materials List */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-6 h-6 animate-spin" style={{ color: GOLD }} />
                    </div>
                ) : !materials?.length ? (
                    <div className="text-center py-20 text-zinc-600">
                        <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">No reading materials yet. Add your first one above.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {materials.map((m) => (
                            <div
                                key={m.id}
                                className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 hover:border-zinc-700 transition-colors"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="text-sm font-bold text-white">{m.title}</h3>
                                            {m.mustRead && (
                                                <Badge className="text-[10px] border-0" style={{ background: `${GOLD}25`, color: GOLD }}>
                                                    MUST READ
                                                </Badge>
                                            )}
                                            {m.favorite && (
                                                <Badge className="text-[10px] border-0" style={{ background: "rgba(244,63,94,0.2)", color: "#f43f5e" }}>
                                                    <Star className="w-3 h-3 mr-0.5" />
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                                            {m.author && <span className="text-xs text-zinc-400">by {m.author}</span>}
                                            <Badge variant="outline" className="text-[10px] border-zinc-700 text-zinc-400">
                                                {m.category}
                                            </Badge>
                                            <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                                                <Clock className="w-3 h-3" /> {m.readTimeMinutes}m
                                            </span>
                                            <Badge
                                                className="text-[10px] border-0"
                                                style={{
                                                    background:
                                                        m.difficulty === "beginner" ? "rgba(34,197,94,0.15)" :
                                                            m.difficulty === "intermediate" ? "rgba(250,204,21,0.15)" :
                                                                m.difficulty === "advanced" ? "rgba(249,115,22,0.15)" : "rgba(239,68,68,0.15)",
                                                    color:
                                                        m.difficulty === "beginner" ? "#4ade80" :
                                                            m.difficulty === "intermediate" ? "#facc15" :
                                                                m.difficulty === "advanced" ? "#fb923c" : "#f87171",
                                                }}
                                            >
                                                {m.difficulty}
                                            </Badge>
                                            <Badge
                                                className="text-[10px] border-0"
                                                style={{
                                                    background: m.status === "completed" ? "rgba(34,197,94,0.15)" :
                                                        m.status === "reading" ? "rgba(59,130,246,0.15)" : "rgba(120,113,108,0.15)",
                                                    color: m.status === "completed" ? "#4ade80" :
                                                        m.status === "reading" ? "#60a5fa" : "#a8a29e",
                                                }}
                                            >
                                                {m.status}
                                            </Badge>
                                        </div>
                                        {m.summary && (
                                            <p className="text-xs text-zinc-500 mt-2 line-clamp-2">{m.summary}</p>
                                        )}
                                        {(m.tags || []).length > 0 && (
                                            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                                <Tag className="w-3 h-3 text-zinc-600" />
                                                {m.tags!.map((t: string) => (
                                                    <span key={t} className="text-[10px] text-zinc-500 bg-zinc-800/60 px-2 py-0.5 rounded">
                                                        {t}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-zinc-400 hover:text-white" onClick={() => startEdit(m)}>
                                            <Edit3 className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0 text-zinc-400 hover:text-red-400"
                                            onClick={() => {
                                                if (confirm("Delete this material?")) deleteMutation.mutate(m.id);
                                            }}
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}

