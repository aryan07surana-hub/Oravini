import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Upload, Video, Link2, Play, Trash2, Eye, Clock, TrendingUp, Plus } from "lucide-react";

const GOLD = "#d4b461";

const PROGRESS_BAR_PRESETS = [
  { id: "slow-start", name: "Slow Start", desc: "Starts slow (20%), then speeds up", segments: "0-25%: 40s, 25-50%: 20s, 50-75%: 15s, 75-100%: 10s" },
  { id: "steady", name: "Steady Progress", desc: "Consistent speed throughout", segments: "0-100%: Even pace" },
  { id: "fast-start", name: "Fast Start", desc: "Starts fast, then slows down", segments: "0-25%: 10s, 25-50%: 15s, 50-75%: 20s, 75-100%: 30s" },
  { id: "custom", name: "Custom Segments", desc: "Define your own timing", segments: "Custom" },
];

export default function VideoHosting() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [uploadMethod, setUploadMethod] = useState("url");
  const [form, setForm] = useState({
    title: "", description: "", videoUrl: "", thumbnailUrl: "", videoType: "standard",
    progressBarEnabled: false, progressBarStyle: "steady", customProgressSegments: "", duration: "", category: "General"
  });

  const { data: videos = [] } = useQuery({ queryKey: ["/api/video-events"] });

  const createMut = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/video-events", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/video-events"] });
      setShowCreate(false);
      setForm({ title: "", description: "", videoUrl: "", thumbnailUrl: "", videoType: "standard", progressBarEnabled: false, progressBarStyle: "steady", customProgressSegments: "", duration: "", category: "General" });
      toast({ title: "Video added!" });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/video-events/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/video-events"] }); toast({ title: "Video deleted" }); },
  });

  const handleCreate = () => {
    if (!form.title || !form.videoUrl) return toast({ title: "Title and URL required", variant: "destructive" });
    const progressBarConfig = form.progressBarEnabled ? {
      enabled: true, style: form.progressBarStyle,
      segments: form.progressBarStyle === "custom" ? form.customProgressSegments : PROGRESS_BAR_PRESETS.find(p => p.id === form.progressBarStyle)?.segments
    } : null;
    createMut.mutate({
      title: form.title, description: form.description || null, videoUrl: form.videoUrl, thumbnailUrl: form.thumbnailUrl || null,
      duration: form.duration ? Number(form.duration) : null, category: form.category, videoType: form.videoType,
      progressBarConfig: progressBarConfig ? JSON.stringify(progressBarConfig) : null, isPublic: false
    });
  };

  const vslVideos = (videos as any[]).filter(v => v.videoType === "vsl");
  const webinarVideos = (videos as any[]).filter(v => v.videoType === "webinar");
  const standardVideos = (videos as any[]).filter(v => !v.videoType || v.videoType === "standard");

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Videos", value: videos.length, icon: Video, color: GOLD },
          { label: "VSLs", value: vslVideos.length, icon: Play, color: "#a78bfa" },
          { label: "Webinars", value: webinarVideos.length, icon: Video, color: "#60a5fa" },
          { label: "Total Views", value: (videos as any[]).reduce((s, v) => s + (v.views || 0), 0), icon: Eye, color: "#34d399" }
        ].map(s => (
          <Card key={s.label} className="bg-zinc-900/60 border-zinc-800">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-1">{s.label}</p>
                  <p className="text-2xl font-black text-white">{s.value}</p>
                </div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${s.color}18`, border: `1px solid ${s.color}33` }}>
                  <s.icon className="w-5 h-5" style={{ color: s.color }} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Video Hosting</h3>
          <p className="text-sm text-zinc-500">Upload VSLs, webinars, and standard videos</p>
        </div>
        <Button size="sm" style={{ background: GOLD, color: "#000" }} className="font-semibold gap-1.5" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" /> Add Video
        </Button>
      </div>

      <Tabs defaultValue="all">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="all">All Videos</TabsTrigger>
          <TabsTrigger value="vsl">VSLs</TabsTrigger>
          <TabsTrigger value="webinar">Webinars</TabsTrigger>
          <TabsTrigger value="standard">Standard</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-4"><VideoGrid videos={videos} onDelete={(id) => deleteMut.mutate(id)} /></TabsContent>
        <TabsContent value="vsl" className="mt-4"><VideoGrid videos={vslVideos} onDelete={(id) => deleteMut.mutate(id)} /></TabsContent>
        <TabsContent value="webinar" className="mt-4"><VideoGrid videos={webinarVideos} onDelete={(id) => deleteMut.mutate(id)} /></TabsContent>
        <TabsContent value="standard" className="mt-4"><VideoGrid videos={standardVideos} onDelete={(id) => deleteMut.mutate(id)} /></TabsContent>
      </Tabs>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-zinc-900 border-zinc-700 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-white font-bold">Add Video</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs text-zinc-400 mb-2 block">Video Type</Label>
              <Select value={form.videoType} onValueChange={(v) => setForm({ ...form, videoType: v })}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  <SelectItem value="vsl" className="text-zinc-300">VSL (Video Sales Letter)</SelectItem>
                  <SelectItem value="webinar" className="text-zinc-300">Webinar Recording</SelectItem>
                  <SelectItem value="standard" className="text-zinc-300">Standard Video</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-zinc-400 mb-2 block">Upload Method</Label>
              <Tabs value={uploadMethod} onValueChange={setUploadMethod}>
                <TabsList className="bg-zinc-800 border border-zinc-700 w-full">
                  <TabsTrigger value="url" className="flex-1">URL / Embed</TabsTrigger>
                  <TabsTrigger value="upload" className="flex-1">Upload File</TabsTrigger>
                  <TabsTrigger value="drive" className="flex-1">Google Drive</TabsTrigger>
                </TabsList>
                <TabsContent value="url" className="mt-3">
                  <Input placeholder="https://youtube.com/watch?v=... or Vimeo, Wistia, etc." value={form.videoUrl} onChange={(e) => setForm({ ...form, videoUrl: e.target.value })} className="bg-zinc-800 border-zinc-700 text-white" />
                  <p className="text-xs text-zinc-500 mt-1.5">Supports YouTube, Vimeo, Wistia, Loom, and direct video URLs</p>
                </TabsContent>
                <TabsContent value="upload" className="mt-3">
                  <div className="border-2 border-dashed border-zinc-700 rounded-lg p-8 text-center hover:border-zinc-600 transition-colors cursor-pointer">
                    <Upload className="w-8 h-8 text-zinc-500 mx-auto mb-2" />
                    <p className="text-sm text-zinc-400 mb-1">Click to upload or drag and drop</p>
                    <p className="text-xs text-zinc-600">MP4, MOV, AVI up to 2GB</p>
                  </div>
                </TabsContent>
                <TabsContent value="drive" className="mt-3">
                  <Button variant="outline" className="w-full border-zinc-700 text-zinc-300"><Link2 className="w-4 h-4 mr-2" /> Connect Google Drive</Button>
                  <p className="text-xs text-zinc-500 mt-1.5">Import videos directly from your Google Drive</p>
                </TabsContent>
              </Tabs>
            </div>

            <div>
              <Label className="text-xs text-zinc-400 mb-1.5 block">Title *</Label>
              <Input placeholder="Video title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="bg-zinc-800 border-zinc-700 text-white" />
            </div>

            <div>
              <Label className="text-xs text-zinc-400 mb-1.5 block">Description</Label>
              <Textarea placeholder="What is this video about?" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="bg-zinc-800 border-zinc-700 text-white resize-none" rows={2} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-zinc-400 mb-1.5 block">Duration (minutes)</Label>
                <Input type="number" placeholder="e.g. 45" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} className="bg-zinc-800 border-zinc-700 text-white" />
              </div>
              <div>
                <Label className="text-xs text-zinc-400 mb-1.5 block">Category</Label>
                <Input placeholder="e.g. Training" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="bg-zinc-800 border-zinc-700 text-white" />
              </div>
            </div>

            {form.videoType === "vsl" && (
              <div className="border border-zinc-800 rounded-lg p-4 space-y-4" style={{ background: "rgba(212,180,97,0.03)" }}>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-semibold text-white">Progress Bar Feature</Label>
                    <p className="text-xs text-zinc-500 mt-0.5">Customize video progress bar timing for VSLs</p>
                  </div>
                  <input type="checkbox" checked={form.progressBarEnabled} onChange={(e) => setForm({ ...form, progressBarEnabled: e.target.checked })} className="w-5 h-5 accent-[#d4b461]" />
                </div>

                {form.progressBarEnabled && (
                  <>
                    <div>
                      <Label className="text-xs text-zinc-400 mb-2 block">Progress Bar Style</Label>
                      <div className="grid grid-cols-1 gap-2">
                        {PROGRESS_BAR_PRESETS.map((preset) => (
                          <div key={preset.id} onClick={() => setForm({ ...form, progressBarStyle: preset.id })}
                            className={`p-3 rounded-lg border cursor-pointer transition-all ${form.progressBarStyle === preset.id ? "border-[#d4b461] bg-[#d4b461]/10" : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600"}`}>
                            <div className="flex items-start justify-between mb-1">
                              <p className="text-sm font-semibold text-white">{preset.name}</p>
                              {form.progressBarStyle === preset.id && <div className="w-4 h-4 rounded-full bg-[#d4b461] flex items-center justify-center"><div className="w-2 h-2 rounded-full bg-black" /></div>}
                            </div>
                            <p className="text-xs text-zinc-500 mb-1">{preset.desc}</p>
                            <p className="text-xs text-zinc-600 font-mono">{preset.segments}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {form.progressBarStyle === "custom" && (
                      <div>
                        <Label className="text-xs text-zinc-400 mb-1.5 block">Custom Segments</Label>
                        <Textarea placeholder="e.g. 0-20%: 30s, 20-50%: 20s, 50-100%: 15s" value={form.customProgressSegments} onChange={(e) => setForm({ ...form, customProgressSegments: e.target.value })} className="bg-zinc-800 border-zinc-700 text-white resize-none font-mono text-xs" rows={3} />
                        <p className="text-xs text-zinc-500 mt-1.5">Define time per segment (e.g., "0-25%: 40s" means first 25% takes 40 seconds)</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            <div>
              <Label className="text-xs text-zinc-400 mb-1.5 block">Thumbnail URL (optional)</Label>
              <Input placeholder="https://..." value={form.thumbnailUrl} onChange={(e) => setForm({ ...form, thumbnailUrl: e.target.value })} className="bg-zinc-800 border-zinc-700 text-white" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreate(false)} className="text-zinc-400">Cancel</Button>
            <Button onClick={handleCreate} disabled={createMut.isPending || !form.title || !form.videoUrl} style={{ background: GOLD, color: "#000" }} className="font-semibold">
              {createMut.isPending ? "Adding…" : "Add Video"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function VideoGrid({ videos, onDelete }: { videos: any[]; onDelete: (id: number) => void }) {
  if (videos.length === 0) return <div className="text-center py-12"><Video className="w-12 h-12 text-zinc-700 mx-auto mb-3" /><p className="text-sm text-zinc-500">No videos yet</p></div>;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {videos.map((v: any) => (
        <Card key={v.id} className="bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 transition-all overflow-hidden">
          <div className="h-40 flex items-center justify-center relative" style={{ background: v.thumbnailUrl ? `url(${v.thumbnailUrl}) center/cover no-repeat` : `linear-gradient(135deg, ${GOLD}10, rgba(18,14,30,0.6))` }}>
            {!v.thumbnailUrl && <Video className="w-12 h-12" style={{ color: `${GOLD}50` }} />}
            {v.videoType === "vsl" && <div className="absolute top-2 left-2 px-2 py-1 rounded-md text-[10px] font-bold bg-purple-500/90 text-white">VSL</div>}
            {v.videoType === "webinar" && <div className="absolute top-2 left-2 px-2 py-1 rounded-md text-[10px] font-bold bg-blue-500/90 text-white">WEBINAR</div>}
            {v.progressBarConfig && <div className="absolute top-2 right-2 px-2 py-1 rounded-md text-[10px] font-bold bg-zinc-900/80 text-zinc-300 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Progress Bar</div>}
          </div>
          <CardContent className="p-4">
            <h4 className="font-bold text-white text-sm line-clamp-1 mb-1">{v.title}</h4>
            {v.description && <p className="text-xs text-zinc-500 line-clamp-2 mb-2">{v.description}</p>}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs text-zinc-500">
                <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {v.views || 0}</span>
                {v.duration && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {v.duration}m</span>}
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 hover:text-red-400" onClick={() => onDelete(v.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
