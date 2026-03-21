import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import ClientLayout from "@/components/layout/ClientLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Play, ExternalLink, Clapperboard, Filter, Search, ChevronRight,
  Youtube, Instagram, HardDrive, Globe, Loader2, Film, Sparkles,
  FolderOpen, ChevronDown, ChevronUp
} from "lucide-react";

const CATEGORIES = ["All", "Satisfying Reels", "Hooks & Openings", "Viral Formats", "Storytelling", "Sales & CTA", "Transitions", "Trending Styles", "General"];

const PLATFORM_ICONS: Record<string, any> = {
  youtube: Youtube,
  instagram: Instagram,
  drive: HardDrive,
  "drive-folder": HardDrive,
};

const PLATFORM_COLORS: Record<string, string> = {
  youtube:        "text-red-400   border-red-500/30   bg-red-500/10",
  instagram:      "text-pink-400  border-pink-500/30  bg-pink-500/10",
  drive:          "text-blue-400  border-blue-500/30  bg-blue-500/10",
  "drive-folder": "text-blue-400  border-blue-500/30  bg-blue-500/10",
};

function detectPlatform(url: string): string {
  if (/youtube\.com|youtu\.be/.test(url)) return "youtube";
  if (/instagram\.com/.test(url)) return "instagram";
  if (/drive\.google\.com\/drive\/folders/.test(url)) return "drive-folder";
  if (/drive\.google\.com/.test(url)) return "drive";
  return "other";
}

function getDriveFolderId(url: string): string | null {
  const m = url.match(/drive\.google\.com\/drive\/folders\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

function getEmbedUrl(url: string, platform: string): string {
  if (platform === "youtube") {
    const id = getYouTubeId(url);
    return id ? `https://www.youtube.com/embed/${id}?autoplay=1&rel=0` : url;
  }
  if (platform === "instagram") {
    const m = url.match(/instagram\.com\/(p|reel|tv)\/([A-Za-z0-9_-]+)/);
    return m ? `https://www.instagram.com/${m[1]}/${m[2]}/embed/` : url;
  }
  if (platform === "drive") {
    const m = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    return m ? `https://drive.google.com/file/d/${m[1]}/preview` : url;
  }
  return url;
}

function getThumbnail(url: string, platform: string, customThumb?: string | null): string | null {
  if (customThumb) return customThumb;
  if (platform === "youtube") {
    const id = getYouTubeId(url);
    return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : null;
  }
  return null;
}

function VideoPlayer({ url, platform, title, onClose }: { url: string; platform: string; title: string; onClose: () => void }) {
  const embedUrl = getEmbedUrl(url, platform);
  const isPortrait = platform === "instagram";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4" onClick={onClose}>
      <div className={`relative bg-black rounded-2xl overflow-hidden border border-white/10 shadow-2xl ${isPortrait ? "w-[340px]" : "w-full max-w-3xl"}`}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <p className="text-sm font-bold text-white truncate">{title}</p>
          <button onClick={onClose} className="text-white/60 hover:text-white text-xs px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">✕ Close</button>
        </div>
        <div style={{ aspectRatio: isPortrait ? "9/16" : "16/9" }}>
          <iframe src={embedUrl} className="w-full h-full" allow="autoplay; encrypted-media; fullscreen" allowFullScreen title={title} />
        </div>
        <div className="px-4 py-2 flex items-center justify-between border-t border-white/10">
          <p className="text-[10px] text-white/50">{platform} · click outside to close</p>
          <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 transition-colors">
            <ExternalLink className="w-3 h-3" />Open original
          </a>
        </div>
      </div>
    </div>
  );
}

function DriveFolderCard({ resource, embedUrl, platformColor, navigate }: {
  resource: any; embedUrl: string | null; platformColor: string; navigate: (path: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="col-span-1 sm:col-span-2 lg:col-span-3 bg-card border border-blue-400/20 rounded-2xl overflow-hidden hover:border-blue-400/40 transition-all"
      data-testid={`video-card-${resource.id}`}>
      <button onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-4 p-4 hover:bg-muted/5 transition-colors"
        data-testid={`btn-expand-folder-${resource.id}`}>
        <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-400/30 flex items-center justify-center flex-shrink-0">
          <FolderOpen className="w-5 h-5 text-blue-400" />
        </div>
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-foreground">{resource.title}</p>
            <Badge className={`text-[9px] px-1.5 py-0 border ${platformColor} font-semibold`}>
              <HardDrive className="w-2.5 h-2.5 mr-1" />Google Drive Folder
            </Badge>
            {resource.category && resource.category !== "General" && (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-primary/25 text-primary/80">{resource.category}</Badge>
            )}
          </div>
          {resource.description && (
            <p className="text-[11px] text-muted-foreground mt-0.5">{resource.description}</p>
          )}
          <p className="text-[10px] text-blue-400/70 mt-0.5">Click to browse videos inside this folder</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <a href={resource.url} target="_blank" rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="p-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-colors"
            data-testid={`btn-external-${resource.id}`}>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {expanded && embedUrl && (
        <div className="border-t border-blue-400/15">
          <div className="px-4 py-2 flex items-center gap-3 bg-blue-500/5">
            <span className="text-[10px] text-blue-400/80 font-semibold">Browse folder contents below — click any file to open it in Drive, or copy its link to analyze in the AI Video Editor</span>
            <Button size="sm" onClick={() => navigate("/video-editor")}
              className="ml-auto h-7 bg-primary/10 border border-primary/30 text-primary text-[10px] gap-1 rounded-xl flex-shrink-0">
              <Clapperboard className="w-3 h-3" />Open Editor
            </Button>
          </div>
          <iframe
            src={embedUrl}
            className="w-full border-0"
            style={{ height: "340px" }}
            title={resource.title}
            data-testid={`folder-embed-${resource.id}`}
          />
        </div>
      )}
    </div>
  );
}

export default function VideoLibrary() {
  const [, navigate] = useLocation();
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [playing, setPlaying] = useState<any>(null);

  const { data: resources = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/video-resources"] });

  const filtered = (resources as any[]).filter((r: any) => {
    const matchCat = activeCategory === "All" || r.category === activeCategory;
    const matchSearch = !search || r.title.toLowerCase().includes(search.toLowerCase()) || r.description?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <ClientLayout>
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
              <Film className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-foreground tracking-tight">Video Library</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Engaging reference videos — study, watch, and analyze in the AI Editor</p>
            </div>
          </div>
          <Button onClick={() => navigate("/video-editor")}
            className="bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary gap-2 rounded-xl font-semibold"
            data-testid="btn-open-editor">
            <Clapperboard className="w-4 h-4" />AI Video Editor
          </Button>
        </div>

        {/* Search + filters */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search videos…"
              className="w-full bg-card border border-card-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 transition-colors"
              data-testid="input-search" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                data-testid={`btn-category-${cat.toLowerCase().replace(/[^a-z]/g, "-")}`}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${activeCategory === cat ? "bg-primary text-primary-foreground border-primary" : "bg-card border-card-border text-muted-foreground hover:border-primary/30 hover:text-foreground"}`}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-20">
            <Film className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-muted-foreground text-sm font-medium">
              {resources.length === 0 ? "No videos added yet — check back soon!" : "No videos match your search."}
            </p>
          </div>
        )}

        {/* Grid */}
        {!isLoading && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((resource: any) => {
              const platform = resource.platform || detectPlatform(resource.url);
              const PlatformIcon = PLATFORM_ICONS[platform] || Globe;
              const platformColor = PLATFORM_COLORS[platform] || "text-muted-foreground border-muted/30 bg-muted/10";

              /* ── Drive Folder card ─────────────────────────────── */
              if (platform === "drive-folder") {
                const folderId = getDriveFolderId(resource.url);
                const embedUrl = folderId ? `https://drive.google.com/embeddedfolderview?id=${folderId}#grid` : null;
                return (
                  <DriveFolderCard key={resource.id} resource={resource} embedUrl={embedUrl} platformColor={platformColor} navigate={navigate} />
                );
              }

              /* ── Regular video card ───────────────────────────── */
              const thumb = getThumbnail(resource.url, platform, resource.thumbnailUrl);
              return (
                <div key={resource.id} className="group bg-card border border-card-border rounded-2xl overflow-hidden hover:border-primary/30 hover:shadow-[0_0_24px_rgba(212,180,97,0.08)] transition-all"
                  data-testid={`video-card-${resource.id}`}>
                  {/* Thumbnail / placeholder */}
                  <div className="relative overflow-hidden bg-muted/10" style={{ aspectRatio: "16/9" }}>
                    {thumb ? (
                      <img src={thumb} alt={resource.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
                        <PlatformIcon className="w-10 h-10 text-primary/30" />
                      </div>
                    )}
                    {/* Play overlay */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                      <button onClick={() => setPlaying(resource)}
                        className="w-14 h-14 rounded-full bg-primary/90 hover:bg-primary flex items-center justify-center shadow-lg hover:scale-110 transition-all"
                        data-testid={`btn-play-${resource.id}`}>
                        <Play className="w-5 h-5 text-black fill-black ml-0.5" />
                      </button>
                    </div>
                    {/* Platform badge */}
                    <div className="absolute top-2 right-2">
                      <Badge className={`text-[9px] px-1.5 py-0 border ${platformColor} font-semibold`}>
                        <PlatformIcon className="w-2.5 h-2.5 mr-1" />
                        {platform.charAt(0).toUpperCase() + platform.slice(1)}
                      </Badge>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-bold text-foreground leading-snug line-clamp-2">{resource.title}</p>
                    </div>
                    {resource.category && resource.category !== "General" && (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-primary/25 text-primary/80">{resource.category}</Badge>
                    )}
                    {resource.description && (
                      <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">{resource.description}</p>
                    )}
                    <div className="flex items-center gap-2 pt-1">
                      <Button size="sm" onClick={() => setPlaying(resource)}
                        className="flex-1 h-8 bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary text-[11px] font-bold gap-1.5 rounded-xl"
                        data-testid={`btn-watch-${resource.id}`}>
                        <Play className="w-3 h-3 fill-current" />Watch
                      </Button>
                      <Button size="sm"
                        onClick={() => navigate(`/video-editor?url=${encodeURIComponent(resource.url)}`)}
                        className="flex-1 h-8 bg-muted/10 hover:bg-muted/20 border border-muted/25 text-foreground text-[11px] font-semibold gap-1.5 rounded-xl"
                        data-testid={`btn-analyze-${resource.id}`}>
                        <Sparkles className="w-3 h-3 text-primary" />Analyze
                      </Button>
                      <a href={resource.url} target="_blank" rel="noopener noreferrer"
                        className="h-8 w-8 flex items-center justify-center border border-muted/25 rounded-xl bg-muted/10 hover:bg-muted/20 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                        data-testid={`btn-external-${resource.id}`}>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Video Player Modal */}
      {playing && (
        <VideoPlayer
          url={playing.url}
          platform={playing.platform || detectPlatform(playing.url)}
          title={playing.title}
          onClose={() => setPlaying(null)}
        />
      )}
    </ClientLayout>
  );
}
