import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import AdminLayout from "@/components/layout/AdminLayout";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Film, Plus, Trash2, Edit2, ExternalLink, X, Loader2, Save,
  Youtube, Instagram, HardDrive, Globe, Check, Eye
} from "lucide-react";

const CATEGORIES = ["General", "Hooks & Openings", "Viral Formats", "Storytelling", "Sales & CTA", "Transitions", "Trending Styles"];

function detectPlatform(url: string): string {
  if (/youtube\.com|youtu\.be/.test(url)) return "youtube";
  if (/instagram\.com/.test(url)) return "instagram";
  if (/drive\.google\.com/.test(url)) return "drive";
  return "other";
}

function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

function getAutoThumb(url: string): string {
  const ytId = getYouTubeId(url);
  if (ytId) return `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`;
  return "";
}

const PLATFORM_LABELS: Record<string, string> = {
  youtube: "YouTube", instagram: "Instagram", drive: "Google Drive", other: "Other"
};
const PLATFORM_COLORS: Record<string, string> = {
  youtube: "text-red-400 bg-red-500/10 border-red-500/30",
  instagram: "text-pink-400 bg-pink-500/10 border-pink-500/30",
  drive: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  other: "text-muted-foreground bg-muted/10 border-muted/30",
};

interface ResourceForm {
  title: string;
  url: string;
  description: string;
  category: string;
  platform: string;
  thumbnailUrl: string;
}

const EMPTY_FORM: ResourceForm = { title: "", url: "", description: "", category: "General", platform: "", thumbnailUrl: "" };

function ResourceDialog({ item, onClose }: { item?: any; onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const isEdit = !!item;
  const [form, setForm] = useState<ResourceForm>(item ? {
    title: item.title || "", url: item.url || "", description: item.description || "",
    category: item.category || "General", platform: item.platform || "", thumbnailUrl: item.thumbnailUrl || ""
  } : { ...EMPTY_FORM });

  const autoThumb = form.url ? getAutoThumb(form.url) : "";
  const detectedPlatform = form.url ? detectPlatform(form.url) : "";

  const mutation = useMutation({
    mutationFn: () => isEdit
      ? apiRequest("PATCH", `/api/video-resources/${item.id}`, { ...form, platform: form.platform || detectedPlatform })
      : apiRequest("POST", "/api/video-resources", { ...form, platform: form.platform || detectedPlatform }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/video-resources"] });
      toast({ title: isEdit ? "Video updated!" : "Video added to library!" });
      onClose();
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const set = (key: keyof ResourceForm, val: string) => setForm(f => ({ ...f, [key]: val }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-card border border-card-border rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-card-border">
          <h2 className="text-sm font-black text-foreground">{isEdit ? "Edit Video" : "Add Video to Library"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 space-y-4">
          {/* URL */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Video URL *</label>
            <input value={form.url} onChange={e => set("url", e.target.value)}
              placeholder="YouTube, Instagram, or Google Drive link"
              className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50"
              data-testid="input-resource-url" />
            {detectedPlatform && (
              <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-semibold ${PLATFORM_COLORS[detectedPlatform]}`}>
                <Check className="w-3 h-3" />Detected: {PLATFORM_LABELS[detectedPlatform]}
              </div>
            )}
          </div>
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Title *</label>
            <input value={form.title} onChange={e => set("title", e.target.value)}
              placeholder="Video title"
              className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50"
              data-testid="input-resource-title" />
          </div>
          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Description</label>
            <textarea value={form.description} onChange={e => set("description", e.target.value)}
              placeholder="What makes this video worth studying?"
              rows={2}
              className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 resize-none"
              data-testid="input-resource-description" />
          </div>
          {/* Category */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Category</label>
            <select value={form.category} onChange={e => set("category", e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/50"
              data-testid="select-resource-category">
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {/* Auto thumbnail preview */}
          {autoThumb && (
            <div className="flex items-center gap-3 p-3 bg-muted/5 border border-muted/20 rounded-xl">
              <img src={autoThumb} alt="thumb" className="w-20 h-12 rounded-lg object-cover border border-muted/20" />
              <div>
                <p className="text-[10px] text-muted-foreground font-semibold">Auto-detected thumbnail</p>
                <p className="text-[9px] text-muted-foreground">From YouTube</p>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 px-6 py-4 border-t border-card-border">
          <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl h-9 text-xs border-border">Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.title || !form.url}
            className="flex-1 bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary font-bold rounded-xl h-9 text-xs gap-1.5"
            data-testid="btn-save-resource">
            {mutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {isEdit ? "Save Changes" : "Add to Library"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function VideoResources() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);

  const { data: resources = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/video-resources"] });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/video-resources/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/video-resources"] }); toast({ title: "Video removed from library" }); },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
              <Film className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-foreground tracking-tight">Video Library</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Add reference videos for clients — YouTube, Instagram, Google Drive</p>
            </div>
          </div>
          <Button onClick={() => { setEditItem(null); setShowDialog(true); }}
            className="bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary gap-2 rounded-xl font-bold"
            data-testid="btn-add-video">
            <Plus className="w-4 h-4" />Add Video
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Videos", value: (resources as any[]).length },
            { label: "YouTube", value: (resources as any[]).filter((r: any) => (r.platform || "").includes("youtube") || /youtube|youtu\.be/.test(r.url)).length },
            { label: "Drive Videos", value: (resources as any[]).filter((r: any) => (r.platform || "").includes("drive") || /drive\.google/.test(r.url)).length },
          ].map((stat, i) => (
            <div key={i} className="bg-card border border-card-border rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-primary">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* List */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        )}

        {!isLoading && (resources as any[]).length === 0 && (
          <div className="text-center py-20 border border-dashed border-border rounded-2xl">
            <Film className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-muted-foreground text-sm font-medium mb-4">No videos added yet</p>
            <Button onClick={() => setShowDialog(true)} className="bg-primary/10 border border-primary/30 text-primary gap-2 rounded-xl">
              <Plus className="w-4 h-4" />Add your first video
            </Button>
          </div>
        )}

        {!isLoading && (resources as any[]).length > 0 && (
          <div className="space-y-2">
            {(resources as any[]).map((resource: any) => {
              const platform = resource.platform || detectPlatform(resource.url);
              const thumb = getYouTubeId(resource.url) ? `https://img.youtube.com/vi/${getYouTubeId(resource.url)}/mqdefault.jpg` : resource.thumbnailUrl;
              return (
                <div key={resource.id} className="flex items-center gap-4 p-4 bg-card border border-card-border rounded-2xl hover:border-primary/20 transition-colors"
                  data-testid={`resource-row-${resource.id}`}>
                  {/* Thumbnail */}
                  {thumb ? (
                    <img src={thumb} alt={resource.title} className="w-16 h-10 rounded-lg object-cover border border-muted/20 flex-shrink-0" />
                  ) : (
                    <div className="w-16 h-10 rounded-lg bg-muted/10 border border-muted/20 flex items-center justify-center flex-shrink-0">
                      <Film className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-foreground truncate">{resource.title}</p>
                      <Badge className={`text-[9px] px-1.5 py-0 border ${PLATFORM_COLORS[platform]}`}>{PLATFORM_LABELS[platform] || platform}</Badge>
                      {resource.category && <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-primary/25 text-primary/80">{resource.category}</Badge>}
                    </div>
                    {resource.description && <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{resource.description}</p>}
                    <p className="text-[10px] text-muted-foreground/50 font-mono truncate mt-0.5">{resource.url.slice(0, 60)}{resource.url.length > 60 ? "…" : ""}</p>
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <a href={resource.url} target="_blank" rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-muted/10 hover:bg-muted/20 text-muted-foreground hover:text-foreground transition-colors"
                      title="Open URL">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button onClick={() => { setEditItem(resource); setShowDialog(true); }}
                      className="p-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                      data-testid={`btn-edit-${resource.id}`} title="Edit">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => { if (confirm(`Remove "${resource.title}" from the library?`)) deleteMutation.mutate(resource.id); }}
                      className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                      data-testid={`btn-delete-${resource.id}`} title="Delete">
                      {deleteMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showDialog && (
        <ResourceDialog item={editItem} onClose={() => { setShowDialog(false); setEditItem(null); }} />
      )}
    </AdminLayout>
  );
}
