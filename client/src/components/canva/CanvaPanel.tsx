import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Layers, ExternalLink, RefreshCw, Unlink, Plus, Image,
  Video, FileText, Loader2, CheckCircle, AlertCircle, Sparkles,
  Download, Eye, Instagram, Youtube, Layout, Wand2, Film,
} from "lucide-react";

const DESIGN_TYPES = [
  { id: "instagram-reel",    label: "Instagram Reel",   icon: Video,     badge: "9:16",  color: "from-pink-500/20 to-purple-500/20 border-pink-500/30" },
  { id: "instagram-post",    label: "Instagram Post",   icon: Instagram, badge: "1:1",   color: "from-pink-500/20 to-orange-500/20 border-pink-500/30" },
  { id: "youtube-thumbnail", label: "YouTube Thumb",    icon: Youtube,   badge: "16:9",  color: "from-red-500/20 to-red-500/10 border-red-500/30" },
  { id: "tiktok-video",      label: "TikTok Video",     icon: Video,     badge: "9:16",  color: "from-cyan-500/20 to-blue-500/20 border-cyan-500/30" },
  { id: "presentation",      label: "Presentation",     icon: Layout,    badge: "16:9",  color: "from-blue-500/20 to-blue-500/10 border-blue-500/30" },
  { id: "doc",               label: "Canva Doc",        icon: FileText,  badge: "Doc",   color: "from-green-500/20 to-green-500/10 border-green-500/30" },
];

const PLATFORM_DEFAULT_DESIGN: Record<string, string> = {
  instagram: "instagram-reel",
  youtube:   "youtube-thumbnail",
  tiktok:    "tiktok-video",
};

interface CanvaPanelProps {
  result?: any;
  platform?: string;
}

export default function CanvaPanel({ result, platform }: CanvaPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState(PLATFORM_DEFAULT_DESIGN[platform || "instagram"] || "instagram-reel");
  const [createdDesigns, setCreatedDesigns] = useState<any[]>([]);
  const [uploadingUrl, setUploadingUrl] = useState("");
  const [uploadedAssets, setUploadedAssets] = useState<any[]>([]);

  const { data: canvaStatus, isLoading: statusLoading } = useQuery<any>({
    queryKey: ["/api/canva/status"],
    refetchInterval: 60000,
  });

  const { data: designsData, isLoading: designsLoading, refetch: refetchDesigns } = useQuery<any>({
    queryKey: ["/api/canva/designs"],
    enabled: canvaStatus?.connected === true,
  });

  const createFromVideoMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/canva/create-from-video", {
      title: result?.title || "My Video Design",
      concept: result?.summary || "",
      platform: platform || "instagram",
      designType: selectedType,
    }),
    onSuccess: (data: any) => {
      const design = data?.design;
      if (design) {
        setCreatedDesigns(prev => [design, ...prev]);
        toast({ title: "Design created in Canva!", description: "Click 'Open in Canva' to edit it" });
      }
      refetchDesigns();
    },
    onError: (err: any) => toast({ title: "Failed to create design", description: err.message, variant: "destructive" }),
  });

  const uploadAssetMutation = useMutation({
    mutationFn: (url: string) => apiRequest("POST", "/api/canva/assets/upload-url", { url, name: result?.title || "Brandverse Asset" }),
    onSuccess: (data: any) => {
      setUploadedAssets(prev => [data, ...prev]);
      setUploadingUrl("");
      toast({ title: "Asset uploaded to Canva!", description: "Available in your Canva assets library" });
    },
    onError: (err: any) => toast({ title: "Upload failed", description: err.message, variant: "destructive" }),
  });

  const disconnectMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", "/api/canva/disconnect"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/canva/status"] });
      toast({ title: "Canva disconnected" });
    },
  });

  const handleConnect = () => {
    window.location.href = "/api/canva/oauth/start";
  };

  if (statusLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  if (!canvaStatus?.connected) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-br from-[#7d2ae8]/20 via-[#7d2ae8]/10 to-transparent border border-[#7d2ae8]/30 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#7d2ae8]/20 border border-[#7d2ae8]/30 flex items-center justify-center flex-shrink-0">
              <Layers className="w-6 h-6 text-[#7d2ae8]" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-black text-foreground mb-1">Connect Canva</h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                Link your Canva account to create stunning designs directly from your video plan — thumbnails, Reel covers, social posts, and more. All inside Brandverse.
              </p>
              <Button onClick={handleConnect} data-testid="btn-canva-connect"
                className="bg-[#7d2ae8] hover:bg-[#6b20d0] text-white font-bold gap-2 rounded-xl">
                <Layers className="w-4 h-4" />
                Connect Canva Account
              </Button>
            </div>
          </div>
        </div>

        {/* What you can do */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-foreground uppercase tracking-wider">What you unlock</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: Video,    title: "Reel Covers",      desc: "9:16 vertical ready for Instagram & TikTok" },
              { icon: Image,    title: "YT Thumbnails",    desc: "16:9 eye-catching YouTube thumbnails" },
              { icon: Wand2,    title: "AI Pre-filled",    desc: "Your title + concept auto-sent to Canva" },
              { icon: Film,     title: "Storyboard Frames",desc: "Upload AI frames directly to your Canva library" },
              { icon: Sparkles, title: "Brand Templates",  desc: "Access your brand kit and team templates" },
              { icon: Download, title: "Export Back",      desc: "Designs link back here for reference" },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-muted/5 border border-muted/20 rounded-xl">
                <item.icon className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] font-bold text-foreground">{item.title}</p>
                  <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connected header */}
      <div className="flex items-center justify-between gap-3 p-4 bg-[#7d2ae8]/10 border border-[#7d2ae8]/30 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#7d2ae8]/20 border border-[#7d2ae8]/30 flex items-center justify-center">
            <Layers className="w-4.5 h-4.5 text-[#7d2ae8]" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Canva Connected</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
              <span className="text-[10px] text-green-400 font-semibold">Ready to design</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => refetchDesigns()} className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground" data-testid="btn-canva-refresh">
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => disconnectMutation.mutate()} className="h-7 text-[10px] text-muted-foreground hover:text-red-400 gap-1" data-testid="btn-canva-disconnect">
            <Unlink className="w-3 h-3" />Disconnect
          </Button>
        </div>
      </div>

      {/* ── Create Design from this Video ──────────────────────────────────── */}
      <div className="space-y-3">
        <p className="text-xs font-bold text-foreground flex items-center gap-2">
          <Wand2 className="w-3.5 h-3.5 text-primary" />
          Create Design from This Video
        </p>
        {result?.title && (
          <div className="px-3 py-2 bg-primary/5 border border-primary/20 rounded-xl">
            <p className="text-[10px] text-muted-foreground">Video title auto-loaded:</p>
            <p className="text-xs text-primary font-semibold mt-0.5">"{result.title}"</p>
          </div>
        )}

        {/* Design type selector */}
        <div className="grid grid-cols-3 gap-2">
          {DESIGN_TYPES.map(type => (
            <button key={type.id} onClick={() => setSelectedType(type.id)}
              data-testid={`btn-canva-type-${type.id}`}
              className={`relative p-3 rounded-xl border text-center transition-all group ${selectedType === type.id ? `bg-gradient-to-br ${type.color} shadow-lg` : "bg-muted/5 border-muted/20 hover:border-muted/40"}`}>
              {selectedType === type.id && (
                <CheckCircle className="absolute top-1.5 right-1.5 w-3 h-3 text-primary" />
              )}
              <type.icon className={`w-4 h-4 mx-auto mb-1.5 ${selectedType === type.id ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`} />
              <p className={`text-[10px] font-bold leading-tight ${selectedType === type.id ? "text-primary" : "text-foreground"}`}>{type.label}</p>
              <Badge className={`mt-1 text-[8px] px-1.5 py-0 ${selectedType === type.id ? "bg-primary/20 text-primary border-primary/30 border" : "bg-muted/20 text-muted-foreground border-muted/30 border"}`}>
                {type.badge}
              </Badge>
            </button>
          ))}
        </div>

        <Button onClick={() => createFromVideoMutation.mutate()} disabled={createFromVideoMutation.isPending}
          className="w-full bg-[#7d2ae8]/20 hover:bg-[#7d2ae8]/30 border border-[#7d2ae8]/40 text-[#c09bf5] font-bold h-11 rounded-2xl gap-2"
          data-testid="btn-canva-create">
          {createFromVideoMutation.isPending
            ? <><Loader2 className="w-4 h-4 animate-spin" />Creating in Canva…</>
            : <><Plus className="w-4 h-4" />Create {DESIGN_TYPES.find(t => t.id === selectedType)?.label || "Design"} in Canva</>
          }
        </Button>
      </div>

      {/* ── Created Designs ────────────────────────────────────────────────── */}
      {createdDesigns.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-foreground">Designs Created This Session</p>
          {createdDesigns.map((design: any, i) => (
            <div key={design.id || i} className="flex items-center gap-3 p-3 bg-muted/5 border border-muted/20 rounded-xl" data-testid={`canva-design-${i}`}>
              {design.thumbnail?.url ? (
                <img src={design.thumbnail.url} alt="Design thumb" className="w-12 h-8 rounded-lg object-cover border border-muted/20" />
              ) : (
                <div className="w-12 h-8 rounded-lg bg-[#7d2ae8]/10 border border-[#7d2ae8]/20 flex items-center justify-center flex-shrink-0">
                  <Layers className="w-4 h-4 text-[#7d2ae8]" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">{design.title || "Untitled"}</p>
                <p className="text-[10px] text-muted-foreground font-mono truncate">{design.id}</p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {design.urls?.view_url && (
                  <a href={design.urls.view_url} target="_blank" rel="noopener noreferrer"
                    className="p-1.5 rounded-lg bg-muted/10 hover:bg-muted/20 transition-colors text-muted-foreground hover:text-foreground"
                    title="Preview">
                    <Eye className="w-3.5 h-3.5" />
                  </a>
                )}
                {design.urls?.edit_url && (
                  <a href={design.urls.edit_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-[#7d2ae8]/20 hover:bg-[#7d2ae8]/30 border border-[#7d2ae8]/30 rounded-lg text-[10px] text-[#c09bf5] font-semibold transition-colors"
                    data-testid={`btn-canva-edit-${i}`}>
                    <ExternalLink className="w-3 h-3" />Edit
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Upload Runware thumbnails to Canva ─────────────────────────────── */}
      {result && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-foreground flex items-center gap-2">
            <Download className="w-3.5 h-3.5 text-primary" />
            Upload AI Thumbnails to Canva Library
          </p>
          <p className="text-[10px] text-muted-foreground">Paste a Runware-generated image URL to add it directly to your Canva asset library</p>
          <div className="flex gap-2">
            <input
              value={uploadingUrl}
              onChange={e => setUploadingUrl(e.target.value)}
              placeholder="https://... (AI generated image URL)"
              className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50"
              data-testid="input-canva-asset-url"
            />
            <Button size="sm" onClick={() => uploadingUrl && uploadAssetMutation.mutate(uploadingUrl)}
              disabled={uploadAssetMutation.isPending || !uploadingUrl.trim()}
              className="bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary flex-shrink-0 h-auto px-3 rounded-xl gap-1"
              data-testid="btn-canva-upload-asset">
              {uploadAssetMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Upload
            </Button>
          </div>
          {uploadedAssets.length > 0 && (
            <div className="space-y-1.5">
              {uploadedAssets.map((asset: any, i) => (
                <div key={i} className="flex items-center gap-2 p-2 bg-green-500/5 border border-green-500/20 rounded-lg">
                  <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                  <p className="text-[10px] text-green-400 font-semibold">Uploaded to Canva</p>
                  <p className="text-[10px] text-muted-foreground truncate">{asset?.asset?.id || "Asset uploaded"}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Recent Canva Designs ────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-foreground">Recent Canva Designs</p>
          <Button variant="ghost" size="sm" onClick={() => refetchDesigns()} className="h-6 text-[10px] text-muted-foreground gap-1">
            <RefreshCw className="w-3 h-3" />Refresh
          </Button>
        </div>

        {designsLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          </div>
        )}

        {!designsLoading && designsData?.items?.length > 0 && (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {designsData.items.map((design: any, i: number) => (
              <div key={design.id || i} className="flex items-center gap-3 p-3 bg-muted/5 border border-muted/20 rounded-xl hover:border-muted/40 transition-colors" data-testid={`canva-recent-${i}`}>
                {design.thumbnail?.url ? (
                  <img src={design.thumbnail.url} alt="thumb" className="w-12 h-8 rounded-lg object-cover border border-muted/20 flex-shrink-0" />
                ) : (
                  <div className="w-12 h-8 rounded-lg bg-[#7d2ae8]/10 border border-[#7d2ae8]/20 flex items-center justify-center flex-shrink-0">
                    <Layers className="w-3.5 h-3.5 text-[#7d2ae8]" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{design.title || "Untitled"}</p>
                  <p className="text-[10px] text-muted-foreground">{design.page_count ? `${design.page_count} page${design.page_count !== 1 ? "s" : ""}` : ""}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {design.urls?.view_url && (
                    <a href={design.urls.view_url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg bg-muted/10 hover:bg-muted/20 text-muted-foreground hover:text-foreground transition-colors" title="Preview">
                      <Eye className="w-3 h-3" />
                    </a>
                  )}
                  {design.urls?.edit_url && (
                    <a href={design.urls.edit_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-2 py-1 bg-[#7d2ae8]/15 hover:bg-[#7d2ae8]/25 border border-[#7d2ae8]/25 rounded-lg text-[9px] text-[#c09bf5] font-semibold transition-colors">
                      <ExternalLink className="w-3 h-3" />Open
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {!designsLoading && (!designsData?.items || designsData.items.length === 0) && (
          <div className="text-center py-6">
            <Layers className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">No designs yet — create your first one above</p>
          </div>
        )}
      </div>

      {/* ── Tips ────────────────────────────────────────────────────────────── */}
      <div className="p-4 bg-[#7d2ae8]/5 border border-[#7d2ae8]/20 rounded-xl">
        <p className="text-[10px] font-bold text-[#c09bf5] uppercase tracking-wider mb-2">Pro Tips</p>
        <div className="space-y-1.5">
          {[
            "Create a Reel cover first — it sets the visual tone for your whole campaign",
            "Upload your AI-generated thumbnails from the Visuals tab to your Canva library",
            "Use Canva's Brand Kit to stay on-brand across all designs",
            "Design opens directly in Canva — edit, animate, and download from there",
          ].map((tip, i) => (
            <p key={i} className="text-[10px] text-muted-foreground flex items-start gap-1.5">
              <span className="text-[#7d2ae8] flex-shrink-0 mt-0.5">•</span>{tip}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
