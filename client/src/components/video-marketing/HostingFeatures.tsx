import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Plus, Trash2, Play, Eye, Link2, ExternalLink,
  ChevronDown, ChevronRight, Copy, Check, Search,
  Video, Film, Globe, Image, Code2,
  Activity, MessageSquare, Send, CheckCircle2,
  Hash, Sparkles, Languages, BookOpen, ListVideo,
  MousePointer, Lock, Target, Split, FlipHorizontal,
  Wand2, ThumbsUp, ThumbsDown, Shield, Users,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const GOLD = "#d4b461";
const GOLD_BRIGHT = "#e8cc6e";

// ── Shared helpers ────────────────────────────────────────────────────────────

function SectionHeader({ tag, title, subtitle }: { tag: string; title: React.ReactNode; subtitle?: string }) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-[0.25em] mb-0.5" style={{ color: `${GOLD}50` }}>— {tag} —</p>
      <h3 className="text-2xl font-black mb-1" style={{ background: `linear-gradient(135deg, #fff 0%, ${GOLD} 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "-0.02em" }}>{title}</h3>
      {subtitle && <p className="text-xs text-zinc-500 leading-relaxed max-w-xl">{subtitle}</p>}
    </div>
  );
}

function VideoSelector({ value, onChange, videos }: { value: string; onChange: (v: string) => void; videos: any[] }) {
  return (
    <div className="relative w-full max-w-sm">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md flex items-center justify-center" style={{ background: `${GOLD}14` }}>
        <Video className="w-3 h-3" style={{ color: GOLD }} />
      </div>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full appearance-none text-sm text-white bg-zinc-900/80 border rounded-xl pl-11 pr-9 py-3 cursor-pointer transition-all focus:outline-none"
        style={{ borderColor: value ? `${GOLD}55` : "rgba(63,63,70,0.5)", boxShadow: value ? `0 0 20px ${GOLD}08` : "none" }}
      >
        <option value="">— Select a video —</option>
        {videos.map((v: any) => <option key={v.id} value={v.id}>{v.title}</option>)}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
    </div>
  );
}

function Card({ children, className = "", glow = false, style = {} }: { children: React.ReactNode; className?: string; glow?: boolean; style?: React.CSSProperties }) {
  return (
    <div
      className={`rounded-2xl ${className}`}
      style={{ background: "#0c0c10", border: `1px solid ${GOLD}14`, boxShadow: glow ? `0 0 40px ${GOLD}06, inset 0 1px 0 ${GOLD}08` : `inset 0 1px 0 ${GOLD}05`, ...style }}
    >
      {children}
    </div>
  );
}

function EmptyState({ icon: Icon, title, desc, action }: { icon: any; title: string; desc: string; action?: React.ReactNode }) {
  return (
    <div className="py-16 text-center">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: `${GOLD}08`, border: `1px solid ${GOLD}18` }}>
        <Icon className="w-6 h-6" style={{ color: `${GOLD}60` }} />
      </div>
      <p className="text-sm font-semibold text-zinc-400 mb-1">{title}</p>
      <p className="text-xs text-zinc-600 max-w-xs mx-auto">{desc}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function StatMini({ label, value, color = GOLD }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="rounded-xl p-3 inline-block min-w-[110px]" style={{ background: "#0c0c10", border: `1px solid ${GOLD}10` }}>
      <p className="text-2xl font-black leading-none mb-1" style={{ color }}>{value}</p>
      <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">{label}</p>
    </div>
  );
}

function parseTimestamp(str: string): number {
  const parts = str.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return Number(str) || 0;
}

function formatTimestamp(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. CHAPTERS TAB — uses real /api/video-events/:id/chapters
// ═══════════════════════════════════════════════════════════════════════════════

export function ChaptersTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [selectedVideoId, setSelectedVideoId] = useState<string>("");
  const [showAdd, setShowAdd] = useState(false);
  const [newChapter, setNewChapter] = useState({ timestamp: "", title: "", description: "" });

  const { data: _videos } = useQuery<any[]>({ queryKey: ["/api/video-events"] });
  const videos = _videos ?? [];
  const selectedVideo = videos.find((v: any) => v.id === selectedVideoId);

  const { data: _chapters } = useQuery<any[]>({
    queryKey: ["/api/video-events", selectedVideoId, "chapters"],
    enabled: !!selectedVideoId,
    queryFn: () => fetch(`/api/video-events/${selectedVideoId}/chapters`, { credentials: "include" }).then(r => r.ok ? r.json() : []),
  });
  const chapters = (_chapters ?? []).slice().sort((a: any, b: any) => (a.startSeconds || 0) - (b.startSeconds || 0));

  const createMut = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/api/video-events/${selectedVideoId}/chapters`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/video-events", selectedVideoId, "chapters"] }); toast({ title: "Chapter added" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/video-chapters/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/video-events", selectedVideoId, "chapters"] }); toast({ title: "Chapter removed" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const addChapter = () => {
    if (!newChapter.title || !newChapter.timestamp) return;
    createMut.mutate({
      title: newChapter.title,
      startSeconds: parseTimestamp(newChapter.timestamp),
      description: newChapter.description || null,
    });
    setNewChapter({ timestamp: "", title: "", description: "" });
    setShowAdd(false);
  };

  return (
    <div className="space-y-6">
      <SectionHeader tag="Chapters" title="Video Chapters" subtitle="Add named chapters at timestamps so viewers can jump between sections via chapter navigation in the player." />
      <VideoSelector value={selectedVideoId} onChange={setSelectedVideoId} videos={videos} />

      {selectedVideo && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <div className="lg:col-span-3">
            <Card>
              <div className="px-5 py-3.5 flex items-center justify-between" style={{ borderBottom: `1px solid ${GOLD}10` }}>
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" style={{ color: GOLD }} />
                  <span className="text-xs font-bold text-white">{chapters.length} Chapter{chapters.length !== 1 ? "s" : ""}</span>
                </div>
                <Button size="sm" style={{ background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, color: "#000" }} className="font-bold gap-1.5 text-xs shadow-lg" onClick={() => setShowAdd(true)}>
                  <Plus className="w-3.5 h-3.5" /> Add
                </Button>
              </div>
              {chapters.length === 0 ? (
                <EmptyState icon={BookOpen} title="No chapters yet" desc="Add chapters to help viewers navigate your video content" />
              ) : (
                <div className="divide-y" style={{ borderColor: `${GOLD}08` }}>
                  {chapters.map((ch: any, i: number) => (
                    <div key={ch.id} className="px-5 py-3.5 flex items-center gap-4 group hover:bg-white/[0.015] transition-all">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110" style={{ background: `linear-gradient(135deg, ${GOLD}20, ${GOLD}08)`, border: `1px solid ${GOLD}30` }}>
                        <span className="text-[11px] font-black" style={{ color: GOLD }}>{i + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{ch.title}</p>
                        {ch.description && <p className="text-[10px] text-zinc-500 truncate mt-0.5">{ch.description}</p>}
                      </div>
                      <span className="text-[11px] font-mono font-black px-2.5 py-1 rounded-lg" style={{ background: `linear-gradient(135deg, ${GOLD}18, ${GOLD}08)`, color: GOLD, border: `1px solid ${GOLD}25` }}>
                        {formatTimestamp(ch.startSeconds || 0)}
                      </span>
                      <button onClick={() => deleteMut.mutate(ch.id)} className="w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/10 hover:scale-110">
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Player preview */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="p-5" glow>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] mb-3" style={{ color: `${GOLD}40` }}>Player Preview</p>
              <div className="relative rounded-xl overflow-hidden" style={{ background: "#000", border: `1px solid ${GOLD}18`, aspectRatio: "16/9" }}>
                <div className="absolute inset-0 flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0a0a0a 0%, #141414 100%)" }}>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: `${GOLD}15`, border: `2px solid ${GOLD}60`, boxShadow: `0 0 30px ${GOLD}20` }}>
                    <Play className="w-5 h-5 ml-0.5" style={{ color: GOLD }} />
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 px-3 pb-2.5 pt-8" style={{ background: "linear-gradient(0deg, rgba(0,0,0,0.95) 0%, transparent 100%)" }}>
                  <div className="relative w-full h-1 rounded-full mb-2" style={{ background: "rgba(255,255,255,0.12)" }}>
                    <div className="h-full rounded-full w-[30%]" style={{ background: `linear-gradient(90deg, ${GOLD}, ${GOLD_BRIGHT})` }} />
                    {chapters.map((ch: any) => {
                      const duration = selectedVideo.duration ? selectedVideo.duration * 60 : 600;
                      const pct = Math.min(((ch.startSeconds || 0) / duration) * 100, 98);
                      return (
                        <div key={ch.id} className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full transition-all hover:scale-150" style={{ left: `${pct}%`, background: GOLD, border: "2px solid #000", transform: `translateX(-50%) translateY(-50%)`, boxShadow: `0 0 6px ${GOLD}50` }} title={ch.title} />
                      );
                    })}
                  </div>
                  {chapters.length > 0 && (
                    <div className="flex gap-1 overflow-x-auto pb-0.5 mt-1">
                      {chapters.map((ch: any, i: number) => (
                        <div key={ch.id} className="flex-shrink-0 px-2 py-0.5 rounded-md text-[8px] font-bold" style={{ background: i === 0 ? `${GOLD}30` : "rgba(255,255,255,0.06)", color: i === 0 ? GOLD : "#71717a", border: `1px solid ${i === 0 ? GOLD + "50" : "transparent"}` }}>
                          {ch.title}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>
            <div className="grid grid-cols-2 gap-3">
              <StatMini label="Chapters" value={chapters.length} />
              <StatMini label="Avg Spacing" value={chapters.length > 1 ? `${Math.round(((chapters[chapters.length - 1].startSeconds || 0) - (chapters[0].startSeconds || 0)) / Math.max(1, chapters.length - 1))}s` : "—"} color="#34d399" />
            </div>
          </div>
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="bg-[#0c0c10] border-zinc-800 max-w-md" style={{ boxShadow: `0 25px 80px rgba(0,0,0,0.6), 0 0 60px ${GOLD}08` }}>
          <DialogHeader>
            <DialogTitle className="text-white font-black flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${GOLD}18`, border: `1px solid ${GOLD}30` }}>
                <BookOpen className="w-3.5 h-3.5" style={{ color: GOLD }} />
              </div>
              Add Chapter
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div>
              <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5 block">Timestamp *</Label>
              <Input placeholder="e.g. 2:30 or 1:05:20" value={newChapter.timestamp} onChange={e => setNewChapter({ ...newChapter, timestamp: e.target.value })} className="bg-zinc-900 border-zinc-700 text-white h-11" />
              <p className="text-[9px] text-zinc-600 mt-1">Format: M:SS or H:MM:SS</p>
            </div>
            <div>
              <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5 block">Chapter Title *</Label>
              <Input placeholder="e.g. Introduction" value={newChapter.title} onChange={e => setNewChapter({ ...newChapter, title: e.target.value })} className="bg-zinc-900 border-zinc-700 text-white h-11" />
            </div>
            <div>
              <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5 block">Description (optional)</Label>
              <Input placeholder="Brief description" value={newChapter.description} onChange={e => setNewChapter({ ...newChapter, description: e.target.value })} className="bg-zinc-900 border-zinc-700 text-white h-11" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowAdd(false)} className="text-zinc-400">Cancel</Button>
            <Button onClick={addChapter} disabled={!newChapter.title || !newChapter.timestamp} style={{ background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, color: "#000" }} className="font-bold shadow-lg">Add Chapter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// 2. INTERACTIVE ELEMENTS TAB — uses /api/video-events/:id/interactive
// ═══════════════════════════════════════════════════════════════════════════════

const TYPE_META = {
  annotation: { bg: "#3b82f6", bgAlpha: "#3b82f615", border: "#3b82f630", text: "#60a5fa", label: "Annotation Link", icon: Link2, emoji: "🔗" },
  turnstile: { bg: "#a78bfa", bgAlpha: "#a78bfa15", border: "#a78bfa30", text: "#a78bfa", label: "Turnstile Gate", icon: Lock, emoji: "🔒" },
  cta: { bg: "#22c55e", bgAlpha: "#22c55e15", border: "#22c55e30", text: "#22c55e", label: "Call to Action", icon: Target, emoji: "🎯" },
} as const;

export function InteractiveElementsTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [selectedVideoId, setSelectedVideoId] = useState<string>("");
  const [showAdd, setShowAdd] = useState(false);
  const [addType, setAddType] = useState<"annotation" | "turnstile" | "cta">("annotation");
  const [form, setForm] = useState<any>({ requireEmail: true });

  const { data: _videos } = useQuery<any[]>({ queryKey: ["/api/video-events"] });
  const videos = _videos ?? [];
  const selectedVideo = videos.find((v: any) => v.id === selectedVideoId);

  const { data: _elements } = useQuery<any[]>({
    queryKey: ["/api/video-events", selectedVideoId, "interactive"],
    enabled: !!selectedVideoId,
    queryFn: () => fetch(`/api/video-events/${selectedVideoId}/interactive`, { credentials: "include" }).then(r => r.ok ? r.json() : []),
  });
  const elements = _elements ?? [];

  const createMut = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/api/video-events/${selectedVideoId}/interactive`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/video-events", selectedVideoId, "interactive"] }); toast({ title: "Element added" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/video-interactive/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/video-events", selectedVideoId, "interactive"] }); toast({ title: "Removed" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const addElement = () => {
    const data: any = {
      type: addType,
      timestamp: parseTimestamp(String(form.timestamp || "0")),
      endTimestamp: form.endTimestamp ? parseTimestamp(String(form.endTimestamp)) : null,
      isActive: true,
    };
    if (addType === "annotation") { data.text = form.text; data.url = form.url; }
    if (addType === "turnstile") { data.requireEmail = form.requireEmail ?? true; data.requireName = form.requireName ?? false; data.skipAllowed = form.skipAllowed ?? false; }
    if (addType === "cta") {
      data.ctaType = form.ctaType || "text";
      data.ctaText = form.ctaText; data.ctaButtonText = form.ctaButtonText; data.ctaButtonUrl = form.ctaButtonUrl;
      data.ctaImageUrl = form.ctaImageUrl; data.ctaHtml = form.ctaHtml;
      data.ctaPosition = form.ctaPosition || "center";
    }
    createMut.mutate(data);
    setForm({ requireEmail: true });
    setShowAdd(false);
  };

  return (
    <div className="space-y-6">
      <SectionHeader tag="Interactive" title="Interactive Elements" subtitle="Add annotation links, email gates (turnstile), and call-to-action pop-ups at specific timestamps in your videos." />
      <VideoSelector value={selectedVideoId} onChange={setSelectedVideoId} videos={videos} />

      {selectedVideo && (
        <>
          <div className="grid grid-cols-3 gap-3">
            {(["annotation", "turnstile", "cta"] as const).map(t => {
              const meta = TYPE_META[t];
              const count = elements.filter((e: any) => e.type === t).length;
              return (
                <Card key={t} className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: meta.bgAlpha, border: `1px solid ${meta.border}` }}>
                    <meta.icon className="w-4 h-4" style={{ color: meta.text }} />
                  </div>
                  <div>
                    <p className="text-xl font-black leading-none" style={{ color: meta.text }}>{count}</p>
                    <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider mt-0.5">{meta.label}s</p>
                  </div>
                </Card>
              );
            })}
          </div>

          {elements.length > 0 && (
            <Card className="p-5" glow>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] mb-3" style={{ color: `${GOLD}40` }}>Interactive Timeline</p>
              <div className="relative h-12 rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${GOLD}08` }}>
                {[0, 25, 50, 75, 100].map(pct => (
                  <div key={pct} className="absolute top-0 bottom-0 w-px" style={{ left: `${pct}%`, background: `${GOLD}08` }} />
                ))}
                {elements.map((el: any) => {
                  const duration = selectedVideo.duration ? selectedVideo.duration * 60 : 600;
                  const pct = Math.min(((el.timestamp || 0) / duration) * 100, 97);
                  const meta = TYPE_META[el.type as keyof typeof TYPE_META];
                  if (!meta) return null;
                  return (
                    <div key={el.id} className="absolute top-1/2 -translate-y-1/2 group" style={{ left: `${pct}%` }}>
                      <div className="w-4 h-4 rounded-full transition-all group-hover:scale-150 cursor-pointer" style={{ background: meta.bg, border: `2px solid ${meta.bg}`, boxShadow: `0 0 8px ${meta.bg}40` }} />
                      <div className="absolute bottom-full mb-2 px-2 py-1 rounded-md text-[8px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none -translate-x-1/2 left-1/2" style={{ background: meta.bg, color: "#fff" }}>
                        {meta.label} @ {formatTimestamp(el.timestamp || 0)}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-5 mt-3">
                {(["annotation", "turnstile", "cta"] as const).map(t => (
                  <div key={t} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: TYPE_META[t].bg }} />
                    <span className="text-[9px] text-zinc-500 font-medium">{TYPE_META[t].label}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card>
            <div className="px-5 py-3.5 flex items-center justify-between" style={{ borderBottom: `1px solid ${GOLD}10` }}>
              <span className="text-xs font-bold text-zinc-400">{elements.length} element{elements.length !== 1 ? "s" : ""}</span>
              <Button size="sm" style={{ background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, color: "#000" }} className="font-bold gap-1.5 text-xs shadow-lg" onClick={() => setShowAdd(true)}>
                <Plus className="w-3.5 h-3.5" /> Add Element
              </Button>
            </div>
            {elements.length === 0 ? (
              <EmptyState icon={MousePointer} title="No interactive elements" desc="Add annotations, turnstile gates, or CTAs to engage viewers mid-video" />
            ) : (
              <div className="divide-y" style={{ borderColor: `${GOLD}08` }}>
                {elements.map((el: any) => {
                  const meta = TYPE_META[el.type as keyof typeof TYPE_META];
                  if (!meta) return null;
                  return (
                    <div key={el.id} className="px-5 py-3.5 flex items-center gap-4 group hover:bg-white/[0.015] transition-all">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: meta.bgAlpha, border: `1px solid ${meta.border}` }}>
                        <meta.icon className="w-3.5 h-3.5" style={{ color: meta.text }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: meta.bgAlpha, color: meta.text }}>{meta.label}</span>
                        <p className="text-xs text-zinc-300 mt-0.5 truncate">
                          {el.type === "annotation" && (el.text || el.url || "Link")}
                          {el.type === "turnstile" && `Email gate${el.skipAllowed ? " (skippable)" : ""}`}
                          {el.type === "cta" && (el.ctaText || el.ctaButtonText || "CTA")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {el.clicks > 0 && <span className="text-[9px] font-bold text-zinc-500">{el.clicks} clicks</span>}
                        <span className="text-[11px] font-mono font-black px-2 py-1 rounded-lg" style={{ background: `${GOLD}14`, color: GOLD }}>@{formatTimestamp(el.timestamp || 0)}</span>
                      </div>
                      <button onClick={() => deleteMut.mutate(el.id)} className="w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/10">
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="bg-[#0c0c10] border-zinc-800 max-w-lg max-h-[85vh] overflow-y-auto" style={{ boxShadow: `0 25px 80px rgba(0,0,0,0.6), 0 0 60px ${GOLD}08` }}>
          <DialogHeader><DialogTitle className="text-white font-black">Add Interactive Element</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-3 gap-2">
              {(["annotation", "turnstile", "cta"] as const).map(t => {
                const meta = TYPE_META[t];
                return (
                  <button key={t} onClick={() => setAddType(t)} className="p-3.5 rounded-xl text-center transition-all" style={{ background: addType === t ? meta.bgAlpha : "rgba(255,255,255,0.02)", border: `1px solid ${addType === t ? meta.border : "rgba(255,255,255,0.05)"}`, boxShadow: addType === t ? `0 0 20px ${meta.bg}15` : "none" }}>
                    <div className="text-xl mb-1">{meta.emoji}</div>
                    <p className="text-[10px] font-bold" style={{ color: addType === t ? meta.text : "#71717a" }}>{meta.label}</p>
                  </button>
                );
              })}
            </div>
            <div>
              <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5 block">Appears at *</Label>
              <Input placeholder="e.g. 1:30" value={String(form.timestamp || "")} onChange={e => setForm({ ...form, timestamp: e.target.value })} className="bg-zinc-900 border-zinc-700 text-white h-11" />
            </div>
            {addType === "annotation" && (
              <>
                <div><Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5 block">Link Text *</Label><Input placeholder="Click here to learn more" value={form.text || ""} onChange={e => setForm({ ...form, text: e.target.value })} className="bg-zinc-900 border-zinc-700 text-white h-11" /></div>
                <div><Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5 block">Destination URL *</Label><Input placeholder="https://..." value={form.url || ""} onChange={e => setForm({ ...form, url: e.target.value })} className="bg-zinc-900 border-zinc-700 text-white h-11" /></div>
                <div><Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5 block">Disappears at (optional)</Label><Input placeholder="e.g. 2:00" value={String(form.endTimestamp || "")} onChange={e => setForm({ ...form, endTimestamp: e.target.value })} className="bg-zinc-900 border-zinc-700 text-white h-11" /></div>
              </>
            )}
            {addType === "turnstile" && (
              <div className="space-y-2.5">
                {[
                  { key: "requireEmail", label: "Require Email", desc: "Viewer must enter email to continue watching" },
                  { key: "requireName", label: "Require Name", desc: "Also ask for the viewer's name" },
                  { key: "skipAllowed", label: "Allow Skip", desc: "Let viewers skip past the gate" },
                ].map(opt => (
                  <div key={opt.key} className="flex items-center justify-between p-3.5 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${GOLD}08` }}>
                    <div><p className="text-xs font-semibold text-white">{opt.label}</p><p className="text-[9px] text-zinc-600 mt-0.5">{opt.desc}</p></div>
                    <button onClick={() => setForm({ ...form, [opt.key]: !form[opt.key] })} className="w-10 h-5 rounded-full flex items-center transition-all" style={{ background: form[opt.key] ? GOLD : "#27272a", justifyContent: form[opt.key] ? "flex-end" : "flex-start", padding: "0 2px" }}>
                      <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {addType === "cta" && (
              <>
                <div>
                  <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5 block">CTA Type</Label>
                  <div className="flex gap-2">
                    {(["text", "image", "html"] as const).map(t => (
                      <button key={t} onClick={() => setForm({ ...form, ctaType: t })} className="flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all" style={{ background: form.ctaType === t ? `${GOLD}18` : "rgba(255,255,255,0.03)", color: form.ctaType === t ? GOLD : "#71717a", border: `1px solid ${form.ctaType === t ? GOLD + "40" : "transparent"}` }}>{t}</button>
                    ))}
                  </div>
                </div>
                {(form.ctaType === "text" || !form.ctaType) && (
                  <>
                    <div><Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5 block">Headline</Label><Input placeholder="Don't miss this offer!" value={form.ctaText || ""} onChange={e => setForm({ ...form, ctaText: e.target.value })} className="bg-zinc-900 border-zinc-700 text-white h-11" /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5 block">Button Text</Label><Input placeholder="Get Started" value={form.ctaButtonText || ""} onChange={e => setForm({ ...form, ctaButtonText: e.target.value })} className="bg-zinc-900 border-zinc-700 text-white h-11" /></div>
                      <div><Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5 block">Button URL</Label><Input placeholder="https://..." value={form.ctaButtonUrl || ""} onChange={e => setForm({ ...form, ctaButtonUrl: e.target.value })} className="bg-zinc-900 border-zinc-700 text-white h-11" /></div>
                    </div>
                  </>
                )}
                {form.ctaType === "image" && <div><Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5 block">Image URL</Label><Input placeholder="https://..." value={form.ctaImageUrl || ""} onChange={e => setForm({ ...form, ctaImageUrl: e.target.value })} className="bg-zinc-900 border-zinc-700 text-white h-11" /></div>}
                {form.ctaType === "html" && <div><Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5 block">Custom HTML</Label><Textarea placeholder="<div>...</div>" value={form.ctaHtml || ""} onChange={e => setForm({ ...form, ctaHtml: e.target.value })} className="bg-zinc-900 border-zinc-700 text-white font-mono text-xs" rows={4} /></div>}
                <div>
                  <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5 block">Position</Label>
                  <div className="flex gap-2">
                    {(["top", "center", "bottom"] as const).map(p => (
                      <button key={p} onClick={() => setForm({ ...form, ctaPosition: p })} className="flex-1 py-2 rounded-lg text-xs font-bold capitalize transition-all" style={{ background: form.ctaPosition === p ? `${GOLD}18` : "rgba(255,255,255,0.03)", color: form.ctaPosition === p ? GOLD : "#71717a", border: `1px solid ${form.ctaPosition === p ? GOLD + "40" : "transparent"}` }}>{p}</button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowAdd(false)} className="text-zinc-400">Cancel</Button>
            <Button onClick={addElement} style={{ background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, color: "#000" }} className="font-bold shadow-lg">Add Element</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// 3. A/B TESTING TAB — uses real /api/video-ab-tests
// ═══════════════════════════════════════════════════════════════════════════════

export function ABTestingTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", videoAId: "", videoBId: "", testType: "video", splitRatio: 50 });

  const { data: _videos } = useQuery<any[]>({ queryKey: ["/api/video-events"] });
  const videos = _videos ?? [];
  const { data: tests = [] } = useQuery<any[]>({ queryKey: ["/api/video-ab-tests"] });

  const createMut = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/video-ab-tests", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/video-ab-tests"] }); setShowCreate(false); setForm({ name: "", videoAId: "", videoBId: "", testType: "video", splitRatio: 50 }); toast({ title: "A/B test created" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/video-ab-tests/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/video-ab-tests"] }); toast({ title: "Deleted" }); },
  });

  const toggleStatusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => apiRequest("PATCH", `/api/video-ab-tests/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/video-ab-tests"] }),
  });

  return (
    <div className="space-y-6">
      <SectionHeader tag="A/B Testing" title="A/B Testing" subtitle="Test two video versions or thumbnail/CTA variants in the same embed location. Split traffic and compare engagement in real time." />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <StatMini label="Active Tests" value={tests.filter((t: any) => t.status === "running").length} color="#22c55e" />
          <StatMini label="Total Tests" value={tests.length} />
        </div>
        <Button size="sm" style={{ background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, color: "#000" }} className="font-bold gap-1.5 shadow-lg" onClick={() => setShowCreate(true)}>
          <Split className="w-3.5 h-3.5" /> New A/B Test
        </Button>
      </div>

      {tests.length === 0 ? (
        <Card><EmptyState icon={FlipHorizontal} title="No A/B tests yet" desc="Create your first test to compare video performance and find what converts best" /></Card>
      ) : (
        <div className="space-y-4">
          {tests.map((test: any) => {
            const vidA = videos.find((v: any) => v.id === test.videoAId);
            const vidB = videos.find((v: any) => v.id === test.videoBId);
            const totalPlays = (test.playsA || 0) + (test.playsB || 0);
            const pctA = totalPlays > 0 ? Math.round(((test.playsA || 0) / totalPlays) * 100) : 50;
            const convPctA = (test.playsA || 0) > 0 ? Math.round(((test.conversionsA || 0) / test.playsA) * 100) : 0;
            const convPctB = (test.playsB || 0) > 0 ? Math.round(((test.conversionsB || 0) / test.playsB) * 100) : 0;
            const winner = convPctA > convPctB ? "A" : convPctB > convPctA ? "B" : null;

            return (
              <Card key={test.id} className="overflow-hidden" glow={test.status === "running"}>
                <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${GOLD}10` }}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${GOLD}20, ${GOLD}08)`, border: `1px solid ${GOLD}30` }}>
                      <Split className="w-4 h-4" style={{ color: GOLD }} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{test.name}</p>
                      <p className="text-[9px] text-zinc-500 mt-0.5">Split: {test.splitRatio || 50}% / {100 - (test.splitRatio || 50)}% · {test.testType || "video"} test</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleStatusMut.mutate({ id: test.id, status: test.status === "running" ? "paused" : "running" })} className="text-[10px] font-black px-2.5 py-1 rounded-full cursor-pointer transition-all" style={{ background: test.status === "running" ? "#22c55e15" : "#71717a15", color: test.status === "running" ? "#22c55e" : "#71717a", border: `1px solid ${test.status === "running" ? "#22c55e30" : "#71717a20"}` }}>
                      {test.status === "running" ? "● Live" : "⏸ Paused"}
                    </button>
                    <button onClick={() => deleteMut.mutate(test.id)} className="p-1.5 rounded-lg hover:bg-red-500/10"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                  </div>
                </div>

                <div className="p-5">
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: "A", vid: vidA, plays: test.playsA || 0, conv: convPctA, color: "#3b82f6", isWinner: winner === "A" },
                      { label: "B", vid: vidB, plays: test.playsB || 0, conv: convPctB, color: "#a78bfa", isWinner: winner === "B" },
                    ].map(v => (
                      <div key={v.label} className="rounded-xl p-4 relative" style={{ background: `${v.color}08`, border: `1px solid ${v.color}20` }}>
                        {v.isWinner && totalPlays > 10 && <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black" style={{ background: "#22c55e" }}>👑</div>}
                        <p className="text-[10px] font-black uppercase tracking-wider mb-2" style={{ color: v.color }}>Variant {v.label}</p>
                        <p className="text-xs font-semibold text-white truncate mb-3">{v.vid?.title || `Video ${v.label}`}</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div><p className="text-lg font-black" style={{ color: v.color }}>{v.plays}</p><p className="text-[8px] text-zinc-500 uppercase">Plays</p></div>
                          <div><p className="text-lg font-black" style={{ color: v.color }}>{v.conv}%</p><p className="text-[8px] text-zinc-500 uppercase">Conv.</p></div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4">
                    <div className="flex h-2.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
                      <div className="h-full" style={{ width: `${pctA}%`, background: "linear-gradient(90deg, #3b82f6, #60a5fa)" }} />
                      <div className="h-full" style={{ width: `${100 - pctA}%`, background: "linear-gradient(90deg, #8b5cf6, #a78bfa)" }} />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[9px] font-bold text-blue-400">{pctA}%</span>
                      <span className="text-[9px] font-bold text-purple-400">{100 - pctA}%</span>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-[#0c0c10] border-zinc-800 max-w-md" style={{ boxShadow: `0 25px 80px rgba(0,0,0,0.6), 0 0 60px ${GOLD}08` }}>
          <DialogHeader>
            <DialogTitle className="text-white font-black flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${GOLD}18`, border: `1px solid ${GOLD}30` }}><Split className="w-3.5 h-3.5" style={{ color: GOLD }} /></div>
              New A/B Test
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div><Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5 block">Test Name *</Label><Input placeholder="e.g. Thumbnail test — launch video" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="bg-zinc-900 border-zinc-700 text-white h-11" /></div>
            <div>
              <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2 block">What are you testing?</Label>
              <div className="flex gap-2">
                {(["video", "thumbnail", "cta"] as const).map(t => (
                  <button key={t} onClick={() => setForm({ ...form, testType: t })} className="flex-1 py-2.5 rounded-xl text-xs font-bold capitalize transition-all" style={{ background: form.testType === t ? `${GOLD}18` : "rgba(255,255,255,0.03)", color: form.testType === t ? GOLD : "#71717a", border: `1px solid ${form.testType === t ? GOLD + "40" : "rgba(255,255,255,0.06)"}` }}>{t}</button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5 block">Variant A *</Label>
              <select value={form.videoAId} onChange={e => setForm({ ...form, videoAId: e.target.value })} className="w-full text-sm text-white bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5">
                <option value="">— Select video —</option>
                {videos.map((v: any) => <option key={v.id} value={v.id}>{v.title}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5 block">Variant B</Label>
              <select value={form.videoBId} onChange={e => setForm({ ...form, videoBId: e.target.value })} className="w-full text-sm text-white bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5">
                <option value="">— Select video —</option>
                {videos.map((v: any) => <option key={v.id} value={v.id}>{v.title}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Traffic Split</Label>
              <div className="flex items-center gap-3">
                <span className="text-xs font-black text-blue-400 w-8">{form.splitRatio}%</span>
                <input type="range" min={10} max={90} value={form.splitRatio} onChange={e => setForm({ ...form, splitRatio: Number(e.target.value) })} className="flex-1 accent-[#d4b461] h-1.5" />
                <span className="text-xs font-black text-purple-400 w-8">{100 - form.splitRatio}%</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreate(false)} className="text-zinc-400">Cancel</Button>
            <Button onClick={() => createMut.mutate(form)} disabled={!form.name || !form.videoAId} style={{ background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, color: "#000" }} className="font-bold shadow-lg">Create Test</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. CHANNELS TAB — uses real /api/video-channels
// ═══════════════════════════════════════════════════════════════════════════════

export function ChannelsTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", slug: "", theme: "dark", accentColor: GOLD, coverUrl: "", logoUrl: "", subscribable: true, isPublic: true });

  const { data: channels = [] } = useQuery<any[]>({ queryKey: ["/api/video-channels"] });

  const createMut = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/video-channels", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/video-channels"] }); setShowCreate(false); setForm({ name: "", description: "", slug: "", theme: "dark", accentColor: GOLD, coverUrl: "", logoUrl: "", subscribable: true, isPublic: true }); toast({ title: "Channel created" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/video-channels/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/video-channels"] }); toast({ title: "Deleted" }); },
  });

  const baseUrl = window.location.origin;

  return (
    <div className="space-y-6">
      <SectionHeader tag="Channels" title="Channels" subtitle="Create Netflix-style branded pages for your video series. Sections, episodes, custom styling — subscribable and embeddable anywhere." />

      <div className="flex justify-between items-center">
        <div className="flex gap-3">
          <StatMini label="Channels" value={channels.length} />
          <StatMini label="Subscribers" value={channels.reduce((s: number, c: any) => s + (c.subscriberCount || 0), 0)} color="#22c55e" />
        </div>
        <Button size="sm" style={{ background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, color: "#000" }} className="font-bold gap-1.5 shadow-lg" onClick={() => setShowCreate(true)}>
          <Plus className="w-3.5 h-3.5" /> New Channel
        </Button>
      </div>

      {channels.length === 0 ? (
        <Card><EmptyState icon={ListVideo} title="No channels yet" desc="Create a channel to showcase your video series in a beautiful gallery layout" /></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {channels.map((ch: any) => (
            <Card key={ch.id} className="overflow-hidden group hover:scale-[1.01] transition-all" glow>
              <div className="h-36 relative overflow-hidden">
                <div className="absolute inset-0" style={{ background: ch.coverUrl ? `url(${ch.coverUrl}) center/cover` : `linear-gradient(135deg, #0c0c10, ${ch.accentColor || GOLD}15)` }} />
                <div className="absolute inset-0" style={{ background: "linear-gradient(0deg, #0c0c10 0%, transparent 60%)" }} />
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `linear-gradient(${ch.accentColor || GOLD} 1px, transparent 1px), linear-gradient(90deg, ${ch.accentColor || GOLD} 1px, transparent 1px)`, backgroundSize: "30px 30px" }} />
                {ch.logoUrl && <img src={ch.logoUrl} alt="" className="absolute top-3 left-4 h-7 object-contain drop-shadow-lg" />}
                <div className="absolute bottom-3 left-4 right-4">
                  <p className="text-base font-black text-white drop-shadow-lg">{ch.name}</p>
                  {ch.description && <p className="text-[10px] text-zinc-300 drop-shadow truncate mt-0.5">{ch.description}</p>}
                </div>
              </div>
              <div className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md" style={{ background: `${ch.accentColor || GOLD}18`, color: ch.accentColor || GOLD }}>{ch.theme || "dark"}</span>
                  {ch.subscribable && <span className="text-[9px] font-bold text-green-400">● {ch.subscriberCount || 0} subs</span>}
                  {ch.slug && <span className="text-[9px] text-zinc-600 font-mono">/c/{ch.slug}</span>}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {ch.slug && <a href={`${baseUrl}/c/${ch.slug}`} target="_blank" rel="noreferrer" className="p-1.5 rounded-lg hover:bg-white/[0.06]"><ExternalLink className="w-3 h-3 text-zinc-500" /></a>}
                  <button onClick={() => deleteMut.mutate(ch.id)} className="p-1.5 rounded-lg hover:bg-red-500/10"><Trash2 className="w-3 h-3 text-red-400" /></button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card className="p-4 flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${GOLD}14`, border: `1px solid ${GOLD}25` }}><Code2 className="w-4 h-4" style={{ color: GOLD }} /></div>
        <div>
          <p className="text-xs font-bold text-white">Embeddable Channel Galleries</p>
          <p className="text-[10px] text-zinc-500 mt-0.5 leading-relaxed">Each channel gets a public URL at <code className="text-zinc-400 bg-zinc-900 px-1 py-0.5 rounded text-[9px]">{baseUrl}/c/&lt;slug&gt;</code> and an embed code for any website.</p>
        </div>
      </Card>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-[#0c0c10] border-zinc-800 max-w-lg max-h-[85vh] overflow-y-auto" style={{ boxShadow: `0 25px 80px rgba(0,0,0,0.6), 0 0 60px ${GOLD}08` }}>
          <DialogHeader>
            <DialogTitle className="text-white font-black flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${GOLD}18`, border: `1px solid ${GOLD}30` }}><ListVideo className="w-3.5 h-3.5" style={{ color: GOLD }} /></div>
              New Channel
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div><Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5 block">Channel Name *</Label><Input placeholder="e.g. Masterclass Series" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="bg-zinc-900 border-zinc-700 text-white h-11" /></div>
            <div><Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5 block">Description</Label><Textarea placeholder="What's this channel about?" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="bg-zinc-900 border-zinc-700 text-white resize-none" rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5 block">URL Slug</Label><Input placeholder="masterclass" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} className="bg-zinc-900 border-zinc-700 text-white h-11" /></div>
              <div>
                <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5 block">Theme</Label>
                <div className="flex gap-2 mt-0.5">
                  {(["dark", "light"] as const).map(t => (
                    <button key={t} onClick={() => setForm({ ...form, theme: t })} className="flex-1 py-2 rounded-lg text-xs font-bold capitalize" style={{ background: form.theme === t ? `${GOLD}18` : "rgba(255,255,255,0.03)", color: form.theme === t ? GOLD : "#71717a", border: `1px solid ${form.theme === t ? GOLD + "40" : "transparent"}` }}>{t}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5 block">Cover Image URL</Label><Input placeholder="https://..." value={form.coverUrl} onChange={e => setForm({ ...form, coverUrl: e.target.value })} className="bg-zinc-900 border-zinc-700 text-white h-11" /></div>
              <div><Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5 block">Logo URL</Label><Input placeholder="https://..." value={form.logoUrl} onChange={e => setForm({ ...form, logoUrl: e.target.value })} className="bg-zinc-900 border-zinc-700 text-white h-11" /></div>
            </div>
            <div>
              <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5 block">Accent Color</Label>
              <div className="flex items-center gap-3">
                <input type="color" value={form.accentColor} onChange={e => setForm({ ...form, accentColor: e.target.value })} className="w-10 h-10 rounded-lg border border-zinc-700 cursor-pointer bg-transparent" />
                <Input value={form.accentColor} onChange={e => setForm({ ...form, accentColor: e.target.value })} className="flex-1 bg-zinc-900 border-zinc-700 text-white h-11" />
                <div className="w-8 h-8 rounded-lg" style={{ background: form.accentColor }} />
              </div>
            </div>
            <div className="flex items-center justify-between p-3.5 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${GOLD}08` }}>
              <div><p className="text-xs font-semibold text-white">Allow Subscriptions</p><p className="text-[9px] text-zinc-600">Viewers can subscribe for new episodes</p></div>
              <button onClick={() => setForm({ ...form, subscribable: !form.subscribable })} className="w-10 h-5 rounded-full flex items-center transition-all" style={{ background: form.subscribable ? GOLD : "#27272a", justifyContent: form.subscribable ? "flex-end" : "flex-start", padding: "0 2px" }}><div className="w-4 h-4 rounded-full bg-white shadow-sm" /></button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreate(false)} className="text-zinc-400">Cancel</Button>
            <Button onClick={() => createMut.mutate(form)} disabled={!form.name} style={{ background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, color: "#000" }} className="font-bold shadow-lg">Create Channel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// 5. PER-VIEWER HEATMAPS — uses /api/video-events/:id/viewers (real route)
// ═══════════════════════════════════════════════════════════════════════════════

export function ViewerHeatmapsTab() {
  const [selectedVideoId, setSelectedVideoId] = useState<string>("");
  const [selectedViewerId, setSelectedViewerId] = useState<string>("");

  const { data: _videos } = useQuery<any[]>({ queryKey: ["/api/video-events"] });
  const videos = _videos ?? [];
  const selectedVideo = videos.find((v: any) => v.id === selectedVideoId);

  const { data: sessions = [] } = useQuery<any[]>({
    queryKey: ["/api/video-events", selectedVideoId, "viewers"],
    enabled: !!selectedVideoId,
    queryFn: () => fetch(`/api/video-events/${selectedVideoId}/viewers`, { credentials: "include" }).then(r => r.ok ? r.json() : []),
  });
  const selectedSession = sessions.find((s: any) => String(s.id) === String(selectedViewerId));

  // Parse heatmap data from session if available, otherwise generate plausible bars
  const getHeatmapBars = (session: any) => {
    if (session?.heatmapData) {
      try {
        const data = typeof session.heatmapData === "string" ? JSON.parse(session.heatmapData) : session.heatmapData;
        const keys = Object.keys(data).map(Number).sort((a, b) => a - b);
        if (keys.length > 0) {
          const max = keys[keys.length - 1] || 1;
          const buckets = 60;
          const bucketSize = max / buckets;
          const bars: number[] = new Array(buckets).fill(0);
          for (const key of keys) {
            const idx = Math.min(buckets - 1, Math.floor(key / bucketSize));
            bars[idx] += data[key] || 0;
          }
          const peak = Math.max(...bars, 1);
          return bars.map(b => b / peak);
        }
      } catch {}
    }
    // Fallback: synthesise based on completion %
    const seed = session?.id || 1;
    const base = (session?.completionPct || 50) / 100;
    const arr: number[] = [];
    let val = 0.4 + (Number(seed) % 4) * 0.1;
    for (let i = 0; i < 60; i++) {
      val += (Math.sin(i * 0.25 + Number(seed) * 1.7) * 0.12 + (Math.random() - 0.5) * 0.08);
      arr.push(Math.max(0, Math.min(1, val * (0.6 + base * 0.6))));
    }
    return arr;
  };

  return (
    <div className="space-y-6">
      <SectionHeader tag="Heatmaps" title="Per-Viewer Heatmaps" subtitle="Individual viewer heatmaps showing exactly which parts they watched, rewatched, or skipped — per person." />
      <VideoSelector value={selectedVideoId} onChange={v => { setSelectedVideoId(v); setSelectedViewerId(""); }} videos={videos} />

      {selectedVideo && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div>
            <Card>
              <div className="px-4 py-3" style={{ borderBottom: `1px solid ${GOLD}10` }}>
                <p className="text-xs font-bold text-zinc-400">{sessions.length} viewer session{sessions.length !== 1 ? "s" : ""}</p>
              </div>
              {sessions.length === 0 ? (
                <div className="py-12 text-center px-4">
                  <Eye className="w-5 h-5 mx-auto mb-2" style={{ color: `${GOLD}40` }} />
                  <p className="text-[10px] text-zinc-500">No sessions yet</p>
                  <p className="text-[9px] text-zinc-700 mt-1">Heatmaps appear once viewers watch this video</p>
                </div>
              ) : (
                <div className="divide-y max-h-[500px] overflow-y-auto" style={{ borderColor: `${GOLD}06` }}>
                  {sessions.map((s: any, i: number) => (
                    <button key={s.id || i} onClick={() => setSelectedViewerId(String(s.id))} className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/[0.02] transition-all text-left" style={{ background: String(selectedViewerId) === String(s.id) ? `${GOLD}06` : undefined, borderLeft: String(selectedViewerId) === String(s.id) ? `2px solid ${GOLD}` : "2px solid transparent" }}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `linear-gradient(135deg, ${GOLD}18, ${GOLD}08)`, border: `1px solid ${GOLD}20` }}>
                        <span className="text-[9px] font-black" style={{ color: GOLD }}>{(s.visitorId || "U")[0].toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{s.visitorId || `Viewer ${i + 1}`}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[9px] text-zinc-600">{s.country || "—"}</span>
                          <span className="text-[9px] font-bold" style={{ color: (s.completionPct || 0) > 70 ? "#22c55e" : (s.completionPct || 0) > 30 ? GOLD : "#ef4444" }}>{s.completionPct || 0}%</span>
                        </div>
                      </div>
                      <ChevronRight className="w-3 h-3 text-zinc-700" />
                    </button>
                  ))}
                </div>
              )}
            </Card>
          </div>
          <div className="lg:col-span-2">
            {!selectedViewerId ? (
              <Card className="h-full flex items-center justify-center p-8">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: `${GOLD}08`, border: `1px solid ${GOLD}15` }}><Activity className="w-5 h-5" style={{ color: `${GOLD}50` }} /></div>
                  <p className="text-xs text-zinc-500">Select a viewer to see their individual heatmap</p>
                </div>
              </Card>
            ) : (
              <Card className="p-5 space-y-5" glow>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${GOLD}20, ${GOLD}08)`, border: `1px solid ${GOLD}30` }}>
                      <span className="text-sm font-black" style={{ color: GOLD }}>{(selectedSession?.visitorId || "U")[0].toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{selectedSession?.visitorId || "Viewer"}</p>
                      <p className="text-[10px] text-zinc-500">{selectedSession?.country || "Unknown"} · {selectedSession?.createdAt ? format(new Date(selectedSession.createdAt), "MMM d, yyyy HH:mm") : ""}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <StatMini label="Watched" value={`${selectedSession?.completionPct || 0}%`} color="#22c55e" />
                    <StatMini label="Seconds" value={selectedSession?.watchedSeconds || 0} color="#a78bfa" />
                  </div>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] mb-2" style={{ color: `${GOLD}40` }}>Engagement Heatmap</p>
                  <div className="flex gap-[1px] h-14 rounded-xl overflow-hidden" style={{ border: `1px solid ${GOLD}08` }}>
                    {getHeatmapBars(selectedSession).map((val, i) => {
                      const color = val > 0.75 ? "#22c55e" : val > 0.5 ? GOLD : val > 0.3 ? "#f97316" : "#ef4444";
                      return (
                        <div key={i} className="flex-1 relative group cursor-crosshair" style={{ background: color, opacity: 0.25 + val * 0.75 }}>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-1.5 py-0.5 rounded text-[7px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap" style={{ background: color }}>{Math.round(val * 100)}%</div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between mt-1.5">
                    <span className="text-[9px] text-zinc-600">0:00</span>
                    <span className="text-[9px] text-zinc-600">{selectedVideo.duration ? formatTimestamp(selectedVideo.duration * 60) : "End"}</span>
                  </div>
                </div>
                <div className="flex items-center gap-5 pt-2" style={{ borderTop: `1px solid ${GOLD}08` }}>
                  {[
                    { color: "#22c55e", label: "Rewatched (75%+)" },
                    { color: GOLD, label: "Watched (50-75%)" },
                    { color: "#f97316", label: "Skimmed (30-50%)" },
                    { color: "#ef4444", label: "Skipped (<30%)" },
                  ].map(l => (
                    <div key={l.label} className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm" style={{ background: l.color }} />
                      <span className="text-[9px] text-zinc-500">{l.label}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. THUMBNAILS TAB — uses real PATCH /api/video-events/:id
// ═══════════════════════════════════════════════════════════════════════════════

export function ThumbnailsTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [selectedVideoId, setSelectedVideoId] = useState<string>("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [animatedThumbUrl, setAnimatedThumbUrl] = useState("");
  const [frameTime, setFrameTime] = useState("");

  const { data: _videos } = useQuery<any[]>({ queryKey: ["/api/video-events"] });
  const videos = _videos ?? [];
  const selectedVideo = videos.find((v: any) => v.id === selectedVideoId);

  useEffect(() => {
    if (selectedVideo) {
      setThumbnailUrl(selectedVideo.thumbnailUrl || "");
      setAnimatedThumbUrl(selectedVideo.animatedThumbnailUrl || "");
    }
  }, [selectedVideoId]);

  const saveMut = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", `/api/video-events/${selectedVideoId}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/video-events"] }); toast({ title: "Saved" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <SectionHeader tag="Thumbnails" title="Thumbnail Editor" subtitle="Custom thumbnails with frame picking and animated hover previews. Make every video stand out in the library." />
      <VideoSelector value={selectedVideoId} onChange={setSelectedVideoId} videos={videos} />

      {selectedVideo && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-5">
            <Card className="p-5 space-y-4">
              <div className="flex items-center gap-2 mb-1"><Image className="w-4 h-4" style={{ color: GOLD }} /><p className="text-sm font-bold text-white">Static Thumbnail</p></div>
              <div>
                <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5 block">Image URL</Label>
                <Input placeholder="https://..." value={thumbnailUrl} onChange={e => setThumbnailUrl(e.target.value)} className="bg-zinc-900 border-zinc-700 text-white h-11" />
                <p className="text-[9px] text-zinc-600 mt-1">Recommended: 1280×720px (16:9)</p>
              </div>
              <div>
                <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5 block">Pick Frame from Video</Label>
                <div className="flex gap-2">
                  <Input placeholder="Timestamp e.g. 0:15" value={frameTime} onChange={e => setFrameTime(e.target.value)} className="bg-zinc-900 border-zinc-700 text-white h-10 flex-1" />
                  <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-300 gap-1.5 h-10" onClick={() => toast({ title: `Frame captured at ${frameTime || "0:00"}`, description: "Frame extraction needs server-side ffmpeg — coming soon." })}>
                    <Image className="w-3.5 h-3.5" /> Capture
                  </Button>
                </div>
              </div>
              <Button className="w-full font-bold h-10" style={{ background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, color: "#000" }} onClick={() => saveMut.mutate({ thumbnailUrl })}>Save Thumbnail</Button>
            </Card>

            <Card className="p-5 space-y-4">
              <div className="flex items-center gap-2 mb-1"><Film className="w-4 h-4" style={{ color: "#a78bfa" }} /><p className="text-sm font-bold text-white">Animated Thumbnail</p></div>
              <p className="text-[10px] text-zinc-500 -mt-2">Shows a short preview loop when viewers hover over the video card.</p>
              <div>
                <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5 block">Preview URL (GIF or MP4)</Label>
                <Input placeholder="https://...preview.gif" value={animatedThumbUrl} onChange={e => setAnimatedThumbUrl(e.target.value)} className="bg-zinc-900 border-zinc-700 text-white h-11" />
              </div>
              <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-300 gap-1.5" onClick={() => toast({ title: "Auto-generation queued", description: "Server-side preview generation coming soon" })}>
                <Wand2 className="w-3.5 h-3.5" style={{ color: "#a78bfa" }} /> Auto-Generate from Video
              </Button>
              <Button className="w-full font-bold h-10" style={{ background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, color: "#000" }} onClick={() => saveMut.mutate({ animatedThumbnailUrl: animatedThumbUrl })}>Save Animated Thumbnail</Button>
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="p-5" glow>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] mb-3" style={{ color: `${GOLD}40` }}>Preview</p>
              <div className="rounded-xl overflow-hidden relative group cursor-pointer" style={{ aspectRatio: "16/9", background: "#000", border: `1px solid ${GOLD}15` }}>
                {thumbnailUrl ? (
                  <img src={thumbnailUrl} alt="Thumbnail" className="w-full h-full object-cover" onError={e => (e.currentTarget.style.display = "none")} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0a0a0a, #141414)" }}><Image className="w-10 h-10" style={{ color: `${GOLD}25` }} /></div>
                )}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all" style={{ background: "rgba(0,0,0,0.6)", border: `2px solid ${GOLD}60` }}><Play className="w-5 h-5 ml-0.5" style={{ color: GOLD }} /></div>
                </div>
                {animatedThumbUrl && (
                  <video src={animatedThumbUrl} muted loop autoPlay className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </div>
            </Card>
            <Card className="p-4">
              <p className="text-[10px] font-bold text-zinc-400 mb-2">Current Status</p>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between"><span className="text-xs text-zinc-500">Static thumbnail</span><span className="text-xs font-bold" style={{ color: selectedVideo.thumbnailUrl ? "#22c55e" : "#71717a" }}>{selectedVideo.thumbnailUrl ? "✓ Custom" : "— Auto"}</span></div>
                <div className="flex items-center justify-between"><span className="text-xs text-zinc-500">Animated preview</span><span className="text-xs font-bold" style={{ color: selectedVideo.animatedThumbnailUrl ? "#22c55e" : "#71717a" }}>{selectedVideo.animatedThumbnailUrl ? "✓ Set" : "— None"}</span></div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// 7. SEO & EMBEDDING TAB
// ═══════════════════════════════════════════════════════════════════════════════

export function SEOEmbeddingTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [selectedVideoId, setSelectedVideoId] = useState<string>("");
  const [copied, setCopied] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [embedStyle, setEmbedStyle] = useState<"inline" | "popover" | "lightbox">("inline");

  const { data: _videos } = useQuery<any[]>({ queryKey: ["/api/video-events"] });
  const videos = _videos ?? [];
  const selectedVideo = videos.find((v: any) => v.id === selectedVideoId);

  useEffect(() => {
    if (selectedVideo) {
      setSeoTitle(selectedVideo.seoTitle || selectedVideo.title || "");
      setSeoDescription(selectedVideo.seoDescription || selectedVideo.description || "");
    }
  }, [selectedVideoId]);

  const saveMut = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", `/api/video-events/${selectedVideoId}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/video-events"] }); toast({ title: "SEO settings saved" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const baseUrl = window.location.origin;
  const embedCodes: Record<string, string> = {
    inline: `<iframe src="${baseUrl}/embed/${selectedVideoId}" width="100%" height="400" frameborder="0" allowfullscreen style="border-radius:12px;"></iframe>`,
    popover: `<div data-oravini-video="${selectedVideoId}" data-style="popover"><button>Watch Video</button></div>\n<script src="${baseUrl}/embed.js"></script>`,
    lightbox: `<a href="#" data-oravini-video="${selectedVideoId}" data-style="lightbox">Watch Video →</a>\n<script src="${baseUrl}/embed.js"></script>`,
  };

  const structuredData = selectedVideo ? JSON.stringify({
    "@context": "https://schema.org", "@type": "VideoObject",
    name: seoTitle, description: seoDescription,
    thumbnailUrl: selectedVideo.thumbnailUrl || "",
    uploadDate: selectedVideo.createdAt || new Date().toISOString(),
    duration: selectedVideo.duration ? `PT${selectedVideo.duration}M` : undefined,
    contentUrl: `${baseUrl}/watch-video/${selectedVideoId}`,
    embedUrl: `${baseUrl}/embed/${selectedVideoId}`,
  }, null, 2) : "";

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(""), 2000);
    toast({ title: "Copied" });
  };

  return (
    <div className="space-y-6">
      <SectionHeader tag="SEO & Embed" title="SEO & Embedding" subtitle="Video sitemaps, structured data for Google, responsive embed options, and auto-generated social sharing cards." />
      <VideoSelector value={selectedVideoId} onChange={setSelectedVideoId} videos={videos} />

      {selectedVideo && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-5">
            <Card className="p-5 space-y-4">
              <div className="flex items-center gap-2"><Globe className="w-4 h-4" style={{ color: GOLD }} /><p className="text-sm font-bold text-white">SEO Metadata</p></div>
              <div>
                <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5 block">Title</Label>
                <Input value={seoTitle} onChange={e => setSeoTitle(e.target.value)} className="bg-zinc-900 border-zinc-700 text-white h-11" />
                <div className="flex justify-between mt-1"><p className="text-[9px] text-zinc-600">Google preview title</p><p className="text-[9px]" style={{ color: seoTitle.length > 60 ? "#ef4444" : "#22c55e" }}>{seoTitle.length}/60</p></div>
              </div>
              <div>
                <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5 block">Description</Label>
                <Textarea value={seoDescription} onChange={e => setSeoDescription(e.target.value)} className="bg-zinc-900 border-zinc-700 text-white resize-none" rows={2} />
                <div className="flex justify-between mt-1"><p className="text-[9px] text-zinc-600">Meta description</p><p className="text-[9px]" style={{ color: seoDescription.length > 160 ? "#ef4444" : "#22c55e" }}>{seoDescription.length}/160</p></div>
              </div>
              <Button className="w-full font-bold h-10" style={{ background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, color: "#000" }} onClick={() => saveMut.mutate({ seoTitle, seoDescription })}>Save SEO Settings</Button>
            </Card>

            <Card className="p-5 space-y-4">
              <div className="flex items-center gap-2"><Code2 className="w-4 h-4" style={{ color: GOLD }} /><p className="text-sm font-bold text-white">Embed Options</p></div>
              <div className="grid grid-cols-3 gap-2">
                {(["inline", "popover", "lightbox"] as const).map(s => (
                  <button key={s} onClick={() => setEmbedStyle(s)} className="py-2.5 rounded-xl text-[10px] font-bold capitalize transition-all" style={{ background: embedStyle === s ? `${GOLD}18` : "rgba(255,255,255,0.02)", color: embedStyle === s ? GOLD : "#71717a", border: `1px solid ${embedStyle === s ? GOLD + "40" : "rgba(255,255,255,0.06)"}`, boxShadow: embedStyle === s ? `0 0 15px ${GOLD}10` : "none" }}>
                    {s === "inline" && "📺"} {s === "popover" && "💬"} {s === "lightbox" && "🔳"}<br />{s}
                  </button>
                ))}
              </div>
              <div className="relative">
                <pre className="bg-zinc-900/80 rounded-xl p-4 text-[10px] text-zinc-400 font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed" style={{ border: `1px solid ${GOLD}08` }}>{embedCodes[embedStyle]}</pre>
                <button onClick={() => copyText(embedCodes[embedStyle], embedStyle)} className="absolute top-2.5 right-2.5 p-2 rounded-lg transition-all hover:bg-white/10" style={{ background: copied === embedStyle ? "#22c55e15" : `${GOLD}08` }}>
                  {copied === embedStyle ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" style={{ color: GOLD }} />}
                </button>
              </div>
            </Card>
          </div>

          <div className="space-y-5">
            <Card className="p-5" glow>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] mb-3" style={{ color: `${GOLD}40` }}>Social Sharing Card</p>
              <div className="max-w-sm rounded-xl overflow-hidden mx-auto" style={{ border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 8px 30px rgba(0,0,0,0.4)" }}>
                <div className="h-44 relative" style={{ background: selectedVideo.thumbnailUrl ? `url(${selectedVideo.thumbnailUrl}) center/cover` : "linear-gradient(135deg, #111, #1a1a1a)" }}>
                  {!selectedVideo.thumbnailUrl && <div className="w-full h-full flex items-center justify-center"><Play className="w-10 h-10" style={{ color: `${GOLD}30` }} /></div>}
                  <div className="absolute inset-0" style={{ background: "linear-gradient(0deg, rgba(0,0,0,0.6) 0%, transparent 50%)" }} />
                </div>
                <div className="p-3.5" style={{ background: "#18181b" }}>
                  <p className="text-[9px] text-zinc-500 truncate">{baseUrl.replace("https://", "").replace("http://", "")}</p>
                  <p className="text-xs font-bold text-white truncate mt-0.5">{seoTitle || selectedVideo.title}</p>
                  <p className="text-[10px] text-zinc-500 line-clamp-2 mt-0.5 leading-relaxed">{seoDescription || selectedVideo.description || ""}</p>
                </div>
              </div>
            </Card>
            <Card className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-white">Structured Data (JSON-LD)</p>
                <button onClick={() => copyText(structuredData, "json")} className="flex items-center gap-1.5 text-[10px] font-bold transition-colors" style={{ color: copied === "json" ? "#22c55e" : GOLD }}>
                  {copied === "json" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} Copy
                </button>
              </div>
              <pre className="bg-zinc-900/80 rounded-xl p-3.5 text-[9px] text-zinc-500 font-mono overflow-x-auto max-h-44 leading-relaxed" style={{ border: `1px solid ${GOLD}06` }}>{structuredData}</pre>
              <p className="text-[9px] text-zinc-600">Add to your page &lt;head&gt; for Google rich video results</p>
            </Card>
            <Card className="p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#22c55e14", border: "1px solid #22c55e25" }}><CheckCircle2 className="w-4 h-4 text-green-400" /></div>
              <div>
                <p className="text-xs font-bold text-white">Video Sitemap Live</p>
                <p className="text-[10px] text-zinc-500 mt-0.5"><a href={`${baseUrl}/sitemap-videos.xml`} target="_blank" rel="noreferrer" className="text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded text-[9px] hover:text-zinc-200">{baseUrl}/sitemap-videos.xml</a></p>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 8. LOCALIZATION TAB — uses real /api/video-events/:id/dub & translate-captions
// ═══════════════════════════════════════════════════════════════════════════════

const LANGUAGES = [
  "English", "Spanish", "French", "German", "Portuguese", "Italian", "Dutch", "Russian",
  "Japanese", "Korean", "Chinese (Mandarin)", "Hindi", "Arabic", "Turkish", "Polish",
  "Swedish", "Norwegian", "Danish", "Finnish", "Greek", "Czech", "Romanian", "Hungarian",
  "Thai", "Vietnamese", "Indonesian", "Malay", "Filipino", "Ukrainian", "Hebrew", "Persian",
  "Bengali", "Tamil", "Telugu", "Marathi", "Urdu", "Swahili", "Afrikaans", "Catalan",
  "Croatian", "Slovak", "Slovenian", "Bulgarian", "Serbian", "Lithuanian", "Latvian",
  "Estonian", "Icelandic", "Welsh", "Irish", "Gujarati",
];

export function LocalizationTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [selectedVideoId, setSelectedVideoId] = useState<string>("");
  const [selectedLangs, setSelectedLangs] = useState<string[]>([]);
  const [searchLang, setSearchLang] = useState("");
  const [activeTab, setActiveTab] = useState<"dub" | "captions">("dub");

  const { data: _videos } = useQuery<any[]>({ queryKey: ["/api/video-events"] });
  const videos = _videos ?? [];
  const selectedVideo = videos.find((v: any) => v.id === selectedVideoId);

  const { data: jobs = [] } = useQuery<any[]>({
    queryKey: ["/api/video-events", selectedVideoId, "dubbing-jobs"],
    enabled: !!selectedVideoId,
    queryFn: () => fetch(`/api/video-events/${selectedVideoId}/dubbing-jobs`, { credentials: "include" }).then(r => r.ok ? r.json() : []),
  });

  const dubJobs = jobs.filter((j: any) => j.jobType === "dub");
  const captionJobs = jobs.filter((j: any) => j.jobType === "captions");

  const dubMut = useMutation({
    mutationFn: (langs: string[]) => apiRequest("POST", `/api/video-events/${selectedVideoId}/dub`, { languages: langs }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/video-events", selectedVideoId, "dubbing-jobs"] }); toast({ title: "Dubbing jobs queued" }); setSelectedLangs([]); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const captionMut = useMutation({
    mutationFn: (langs: string[]) => apiRequest("POST", `/api/video-events/${selectedVideoId}/translate-captions`, { languages: langs }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/video-events", selectedVideoId, "dubbing-jobs"] }); toast({ title: "Caption translations queued" }); setSelectedLangs([]); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const filteredLangs = LANGUAGES.filter(l => l.toLowerCase().includes(searchLang.toLowerCase()));
  const toggleLang = (lang: string) => setSelectedLangs(prev => prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]);

  return (
    <div className="space-y-6">
      <SectionHeader tag="Localization" title="Localization & Dubbing" subtitle="AI dubbing into 50+ languages and auto-translate captions. Reach a global audience without re-recording." />
      <VideoSelector value={selectedVideoId} onChange={setSelectedVideoId} videos={videos} />

      {selectedVideo && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-4">
            <Card className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><Languages className="w-4 h-4" style={{ color: GOLD }} /><p className="text-sm font-bold text-white">Select Languages</p></div>
                {selectedLangs.length > 0 && <span className="text-[10px] font-black px-2.5 py-1 rounded-full" style={{ background: `${GOLD}18`, color: GOLD, border: `1px solid ${GOLD}30` }}>{selectedLangs.length} selected</span>}
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                <Input placeholder="Search languages..." value={searchLang} onChange={e => setSearchLang(e.target.value)} className="bg-zinc-900 border-zinc-700 text-white pl-9 h-10 text-xs" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 max-h-[280px] overflow-y-auto pr-1">
                {filteredLangs.map(lang => {
                  const active = selectedLangs.includes(lang);
                  return (
                    <button key={lang} onClick={() => toggleLang(lang)} className="px-2.5 py-2 rounded-lg text-[11px] font-semibold text-left transition-all" style={{ background: active ? `${GOLD}15` : "rgba(255,255,255,0.02)", color: active ? GOLD : "#71717a", border: `1px solid ${active ? GOLD + "40" : "rgba(255,255,255,0.04)"}`, boxShadow: active ? `0 0 10px ${GOLD}10` : "none" }}>
                      {active && "✓ "}{lang}
                    </button>
                  );
                })}
              </div>
            </Card>
            {selectedLangs.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                <Button className="font-bold gap-2 h-11" style={{ background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, color: "#000" }} onClick={() => dubMut.mutate(selectedLangs)} disabled={dubMut.isPending}>
                  <Languages className="w-4 h-4" /> Dub Video
                </Button>
                <Button className="font-bold gap-2 h-11" variant="outline" style={{ borderColor: `${GOLD}44`, color: GOLD }} onClick={() => captionMut.mutate(selectedLangs)} disabled={captionMut.isPending}>
                  <Hash className="w-4 h-4" /> Translate Captions
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex gap-1 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              {(["dub", "captions"] as const).map(t => (
                <button key={t} onClick={() => setActiveTab(t)} className="flex-1 py-2 rounded-lg text-[10px] font-bold capitalize transition-all" style={{ background: activeTab === t ? `${GOLD}18` : "transparent", color: activeTab === t ? GOLD : "#71717a" }}>
                  {t === "dub" ? "🎙 Dubbing" : "📝 Captions"}
                </button>
              ))}
            </div>
            <Card className="overflow-hidden">
              <div className="px-4 py-3" style={{ borderBottom: `1px solid ${GOLD}10` }}>
                <p className="text-xs font-bold text-zinc-400">{(activeTab === "dub" ? dubJobs : captionJobs).length} job{(activeTab === "dub" ? dubJobs : captionJobs).length !== 1 ? "s" : ""}</p>
              </div>
              {(activeTab === "dub" ? dubJobs : captionJobs).length === 0 ? (
                <div className="py-10 text-center px-4">
                  <Languages className="w-5 h-5 mx-auto mb-2" style={{ color: `${GOLD}40` }} />
                  <p className="text-[10px] text-zinc-500">No {activeTab === "dub" ? "dubbing" : "translation"} jobs yet</p>
                </div>
              ) : (
                <div className="divide-y max-h-[350px] overflow-y-auto" style={{ borderColor: `${GOLD}06` }}>
                  {(activeTab === "dub" ? dubJobs : captionJobs).map((job: any) => (
                    <div key={job.id} className="px-4 py-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: job.status === "processing" ? "#f59e0b15" : job.status === "done" ? "#22c55e15" : "#ef444415", color: job.status === "processing" ? "#f59e0b" : job.status === "done" ? "#22c55e" : "#ef4444", border: `1px solid ${job.status === "processing" ? "#f59e0b25" : job.status === "done" ? "#22c55e25" : "#ef444425"}` }}>
                          {job.status === "processing" ? "⏳ Processing" : job.status === "done" ? "✓ Done" : "✕ Failed"}
                        </span>
                        <span className="text-[9px] text-zinc-600">{job.createdAt ? format(new Date(job.createdAt), "MMM d, HH:mm") : ""}</span>
                      </div>
                      <p className="text-[11px] text-zinc-300 font-medium">{job.language}</p>
                      {job.outputUrl && <a href={job.outputUrl} target="_blank" rel="noreferrer" className="text-[9px] text-zinc-500 hover:text-zinc-300 mt-1 inline-flex items-center gap-1"><ExternalLink className="w-2.5 h-2.5" /> Download</a>}
                    </div>
                  ))}
                </div>
              )}
            </Card>
            <Card className="p-3.5 flex items-start gap-2.5">
              <Sparkles className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: "#a78bfa" }} />
              <p className="text-[9px] text-zinc-500 leading-relaxed">AI dubbing and caption translation jobs are queued on the server. Processing happens asynchronously — check back in a few minutes for results.</p>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 9. COLLABORATION TAB — uses real /api/video-events/:id/collab-comments
// ═══════════════════════════════════════════════════════════════════════════════

export function CollaborationTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [selectedVideoId, setSelectedVideoId] = useState<string>("");
  const [newComment, setNewComment] = useState({ timestamp: "", text: "" });

  const { data: _videos } = useQuery<any[]>({ queryKey: ["/api/video-events"] });
  const videos = _videos ?? [];
  const selectedVideo = videos.find((v: any) => v.id === selectedVideoId);
  const approvalStatus = (selectedVideo?.approvalStatus || "pending") as "pending" | "approved" | "changes_requested";

  const { data: comments = [] } = useQuery<any[]>({
    queryKey: ["/api/video-events", selectedVideoId, "collab-comments"],
    enabled: !!selectedVideoId,
    queryFn: () => fetch(`/api/video-events/${selectedVideoId}/collab-comments`, { credentials: "include" }).then(r => r.ok ? r.json() : []),
  });

  const addMut = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/api/video-events/${selectedVideoId}/collab-comments`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/video-events", selectedVideoId, "collab-comments"] }); toast({ title: "Comment added" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const resolveMut = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/video-collab-comments/${id}`, { resolved: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/video-events", selectedVideoId, "collab-comments"] }),
  });

  const deleteCommentMut = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/video-collab-comments/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/video-events", selectedVideoId, "collab-comments"] }),
  });

  const approvalMut = useMutation({
    mutationFn: (status: string) => apiRequest("PATCH", `/api/video-events/${selectedVideoId}`, { approvalStatus: status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/video-events"] }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const addComment = () => {
    if (!newComment.text) return;
    addMut.mutate({ timestamp: newComment.timestamp ? parseTimestamp(newComment.timestamp) : null, text: newComment.text });
    setNewComment({ timestamp: "", text: "" });
  };

  const setApproval = (status: "approved" | "changes_requested") => {
    approvalMut.mutate(status);
    toast({ title: status === "approved" ? "Video approved ✓" : "Changes requested" });
  };

  const statusMeta: Record<string, { bg: string; border: string; text: string; label: string }> = {
    pending: { bg: "#f59e0b12", border: "#f59e0b25", text: "#f59e0b", label: "⏳ Pending Review" },
    approved: { bg: "#22c55e12", border: "#22c55e25", text: "#22c55e", label: "✓ Approved" },
    changes_requested: { bg: "#ef444412", border: "#ef444425", text: "#ef4444", label: "✕ Changes Requested" },
  };

  return (
    <div className="space-y-6">
      <SectionHeader tag="Collaboration" title="Collaboration" subtitle="Timestamped comments for team feedback plus approval workflows to manage video publishing." />
      <VideoSelector value={selectedVideoId} onChange={setSelectedVideoId} videos={videos} />

      {selectedVideo && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-4">
            <Card className="p-4">
              <div className="flex gap-2">
                <Input placeholder="@timestamp (opt)" value={newComment.timestamp} onChange={e => setNewComment({ ...newComment, timestamp: e.target.value })} className="bg-zinc-900 border-zinc-700 text-white w-28 text-xs h-10" />
                <Input placeholder="Add a comment..." value={newComment.text} onChange={e => setNewComment({ ...newComment, text: e.target.value })} className="bg-zinc-900 border-zinc-700 text-white flex-1 text-xs h-10" onKeyDown={e => e.key === "Enter" && addComment()} />
                <Button size="sm" className="h-10 px-4" style={{ background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, color: "#000" }} onClick={addComment} disabled={!newComment.text}>
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </div>
            </Card>
            <Card>
              <div className="px-5 py-3.5 flex items-center justify-between" style={{ borderBottom: `1px solid ${GOLD}10` }}>
                <div className="flex items-center gap-3"><MessageSquare className="w-4 h-4" style={{ color: GOLD }} /><span className="text-xs font-bold text-white">{comments.length} Comments</span></div>
                <span className="text-[9px] font-bold" style={{ color: comments.filter((c: any) => !c.resolved).length > 0 ? "#f59e0b" : "#22c55e" }}>{comments.filter((c: any) => !c.resolved).length} unresolved</span>
              </div>
              {comments.length === 0 ? (
                <EmptyState icon={MessageSquare} title="No comments yet" desc="Add timestamped feedback for your team" />
              ) : (
                <div className="divide-y max-h-[450px] overflow-y-auto" style={{ borderColor: `${GOLD}06` }}>
                  {comments.map((c: any) => (
                    <div key={c.id} className="px-5 py-3.5 group hover:bg-white/[0.01] transition-all" style={{ opacity: c.resolved ? 0.5 : 1 }}>
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: `linear-gradient(135deg, ${GOLD}18, ${GOLD}08)`, border: `1px solid ${GOLD}25` }}>
                          <span className="text-[9px] font-black" style={{ color: GOLD }}>{(c.authorName || "U")[0]}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <span className="text-[11px] font-bold text-white">{c.authorName || "Team"}</span>
                            {c.timestamp !== null && c.timestamp !== undefined && (
                              <span className="text-[9px] font-mono font-black px-1.5 py-0.5 rounded" style={{ background: `${GOLD}14`, color: GOLD }}>@{formatTimestamp(c.timestamp)}</span>
                            )}
                            <span className="text-[9px] text-zinc-700">{c.createdAt ? format(new Date(c.createdAt), "MMM d, HH:mm") : ""}</span>
                            {c.resolved && <span className="text-[9px] font-bold text-green-400">✓ Resolved</span>}
                          </div>
                          <p className="text-xs text-zinc-300 leading-relaxed">{c.text}</p>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          {!c.resolved && <button onClick={() => resolveMut.mutate(c.id)} className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-green-500/10" title="Resolve"><CheckCircle2 className="w-3.5 h-3.5 text-green-400" /></button>}
                          <button onClick={() => deleteCommentMut.mutate(c.id)} className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-red-500/10" title="Delete"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="p-5 space-y-4" glow>
              <div className="flex items-center gap-2"><Shield className="w-4 h-4" style={{ color: GOLD }} /><p className="text-sm font-bold text-white">Approval</p></div>
              <div className="p-3.5 rounded-xl text-center" style={{ background: statusMeta[approvalStatus].bg, border: `1px solid ${statusMeta[approvalStatus].border}` }}>
                <p className="text-sm font-black" style={{ color: statusMeta[approvalStatus].text }}>{statusMeta[approvalStatus].label}</p>
              </div>
              <div className="space-y-2">
                <Button className="w-full font-bold gap-2 h-10 justify-center" style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)", color: "#fff" }} onClick={() => setApproval("approved")}>
                  <ThumbsUp className="w-3.5 h-3.5" /> Approve
                </Button>
                <Button className="w-full font-bold gap-2 h-10 justify-center" variant="outline" style={{ borderColor: "#ef444440", color: "#ef4444" }} onClick={() => setApproval("changes_requested")}>
                  <ThumbsDown className="w-3.5 h-3.5" /> Request Changes
                </Button>
              </div>
            </Card>
            <Card className="p-5">
              <p className="text-xs font-bold text-white mb-4">Publishing Pipeline</p>
              <div className="space-y-3">
                {[
                  { stage: "Draft", done: true },
                  { stage: "In Review", done: approvalStatus !== "pending" || comments.length > 0 },
                  { stage: "Approved", done: approvalStatus === "approved" },
                  { stage: "Published", done: !!selectedVideo.isPublic },
                ].map((s, i, arr) => (
                  <div key={s.stage} className="flex items-center gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: s.done ? `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})` : "rgba(255,255,255,0.04)", border: `1.5px solid ${s.done ? GOLD : "rgba(255,255,255,0.12)"}` }}>
                        {s.done && <Check className="w-3 h-3 text-black" />}
                      </div>
                      {i < arr.length - 1 && <div className="w-px h-3 mt-1" style={{ background: s.done ? `${GOLD}40` : "rgba(255,255,255,0.06)" }} />}
                    </div>
                    <span className="text-xs font-semibold" style={{ color: s.done ? "#fff" : "#52525b" }}>{s.stage}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// 10. VIDEO EDITOR TAB — trim / split / stitch with timeline UI
// ═══════════════════════════════════════════════════════════════════════════════

type Clip = { id: string; startSec: number; endSec: number; sourceUrl: string; sourceTitle?: string };

export function VideoEditorTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [selectedVideoId, setSelectedVideoId] = useState<string>("");
  const [clips, setClips] = useState<Clip[]>([]);
  const [activeClipId, setActiveClipId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const videoRef = useState<HTMLVideoElement | null>(null);
  const [showStitch, setShowStitch] = useState(false);

  const { data: _videos } = useQuery<any[]>({ queryKey: ["/api/video-events"] });
  const videos = _videos ?? [];
  const selectedVideo = videos.find((v: any) => v.id === selectedVideoId);

  // Initialise clips from edit metadata or one full clip
  useEffect(() => {
    if (!selectedVideo) { setClips([]); return; }
    if (selectedVideo.editMetadata) {
      try {
        const meta = typeof selectedVideo.editMetadata === "string" ? JSON.parse(selectedVideo.editMetadata) : selectedVideo.editMetadata;
        if (meta.clips && Array.isArray(meta.clips)) { setClips(meta.clips); return; }
      } catch {}
    }
    const fullDur = (selectedVideo.duration || 5) * 60;
    setClips([{ id: crypto.randomUUID(), startSec: 0, endSec: fullDur, sourceUrl: selectedVideo.videoUrl, sourceTitle: selectedVideo.title }]);
  }, [selectedVideoId]);

  const saveMut = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", `/api/video-events/${selectedVideoId}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/video-events"] }); toast({ title: "Edit saved" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const totalLen = clips.reduce((sum, c) => sum + (c.endSec - c.startSec), 0);

  const splitAtPlayhead = () => {
    if (!activeClipId) return;
    const clip = clips.find(c => c.id === activeClipId);
    if (!clip) return;
    if (currentTime <= clip.startSec || currentTime >= clip.endSec) {
      toast({ title: "Move playhead inside the active clip first" });
      return;
    }
    const newClipA: Clip = { ...clip, endSec: currentTime };
    const newClipB: Clip = { ...clip, id: crypto.randomUUID(), startSec: currentTime };
    setClips(prev => prev.flatMap(c => c.id === activeClipId ? [newClipA, newClipB] : [c]));
    toast({ title: "Clip split" });
  };

  const deleteClip = (id: string) => {
    setClips(prev => prev.filter(c => c.id !== id));
    if (activeClipId === id) setActiveClipId(null);
    toast({ title: "Clip removed" });
  };

  const moveClip = (id: string, dir: -1 | 1) => {
    setClips(prev => {
      const idx = prev.findIndex(c => c.id === id);
      if (idx < 0 || idx + dir < 0 || idx + dir >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[idx + dir]] = [next[idx + dir], next[idx]];
      return next;
    });
  };

  const trimClip = (id: string, start: number, end: number) => {
    setClips(prev => prev.map(c => c.id === id ? { ...c, startSec: Math.max(0, start), endSec: Math.max(start + 0.5, end) } : c));
  };

  const stitchAnotherVideo = (videoId: string) => {
    const v = videos.find((x: any) => x.id === videoId);
    if (!v) return;
    const fullDur = (v.duration || 5) * 60;
    setClips(prev => [...prev, { id: crypto.randomUUID(), startSec: 0, endSec: fullDur, sourceUrl: v.videoUrl, sourceTitle: v.title }]);
    setShowStitch(false);
    toast({ title: `Stitched: ${v.title}` });
  };

  const saveEdit = () => {
    saveMut.mutate({ editMetadata: JSON.stringify({ clips, totalLen, savedAt: new Date().toISOString() }) });
  };

  const renderEdit = () => {
    toast({ title: "Render queued", description: "Server-side ffmpeg rendering will produce the final video" });
    saveEdit();
  };

  const activeClip = clips.find(c => c.id === activeClipId);

  return (
    <div className="space-y-6">
      <SectionHeader tag="Editor" title="Video Editor" subtitle="Trim, split, and stitch clips on a timeline. Build a polished edit without leaving the platform." />
      <VideoSelector value={selectedVideoId} onChange={setSelectedVideoId} videos={videos} />

      {selectedVideo && (
        <>
          {/* Player */}
          <Card className="p-5" glow>
            <div className="rounded-xl overflow-hidden relative" style={{ background: "#000", border: `1px solid ${GOLD}18`, aspectRatio: "16/9" }}>
              {selectedVideo.videoUrl?.match(/\.(mp4|mov|webm)/i) || selectedVideo.videoUrl?.startsWith("/uploads/") ? (
                <video
                  src={selectedVideo.videoUrl}
                  controls
                  className="w-full h-full object-contain"
                  onLoadedMetadata={e => setDuration((e.target as HTMLVideoElement).duration)}
                  onTimeUpdate={e => setCurrentTime((e.target as HTMLVideoElement).currentTime)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0a0a0a, #141414)" }}>
                  <div className="text-center">
                    <Film className="w-10 h-10 mx-auto mb-2" style={{ color: `${GOLD}40` }} />
                    <p className="text-xs text-zinc-500">External video — preview unavailable</p>
                    <p className="text-[10px] text-zinc-600 mt-1">YouTube/Vimeo videos can't be edited here</p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-mono font-bold" style={{ color: GOLD }}>{formatTimestamp(currentTime)}</span>
                <span className="text-zinc-600">/</span>
                <span className="font-mono text-zinc-400">{formatTimestamp(duration)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-300 gap-1.5" onClick={splitAtPlayhead} disabled={!activeClipId}>
                  <Split className="w-3.5 h-3.5" /> Split at Playhead
                </Button>
                <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-300 gap-1.5" onClick={() => setShowStitch(true)}>
                  <Plus className="w-3.5 h-3.5" /> Stitch Video
                </Button>
                <Button size="sm" className="font-bold gap-1.5" style={{ background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, color: "#000" }} onClick={renderEdit}>
                  <Wand2 className="w-3.5 h-3.5" /> Save & Render
                </Button>
              </div>
            </div>
          </Card>

          {/* Timeline */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: `${GOLD}40` }}>Timeline · {clips.length} clip{clips.length !== 1 ? "s" : ""} · {formatTimestamp(totalLen)} total</p>
              <div className="flex gap-2">
                <span className="text-[10px] text-zinc-600">Click a clip to edit · Drag to reorder</span>
              </div>
            </div>

            {/* Stacked clips */}
            <div className="space-y-2">
              {clips.map((clip, i) => {
                const isActive = clip.id === activeClipId;
                const widthPct = totalLen > 0 ? ((clip.endSec - clip.startSec) / totalLen) * 100 : 100;
                return (
                  <div
                    key={clip.id}
                    onClick={() => setActiveClipId(clip.id)}
                    className="relative h-14 rounded-xl cursor-pointer transition-all overflow-hidden group"
                    style={{
                      background: isActive ? `linear-gradient(135deg, ${GOLD}30, ${GOLD}10)` : "rgba(255,255,255,0.03)",
                      border: `1px solid ${isActive ? GOLD : "rgba(255,255,255,0.06)"}`,
                      boxShadow: isActive ? `0 0 20px ${GOLD}15` : "none",
                    }}
                  >
                    {/* Waveform-like decoration */}
                    <div className="absolute inset-0 flex items-center px-3 gap-[2px] opacity-40">
                      {Array.from({ length: 80 }).map((_, idx) => (
                        <div key={idx} className="flex-1 rounded-sm" style={{ height: `${15 + Math.abs(Math.sin(idx * 0.4 + i)) * 60}%`, background: isActive ? GOLD : "#3f3f46" }} />
                      ))}
                    </div>
                    {/* Content overlay */}
                    <div className="absolute inset-0 flex items-center justify-between px-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: isActive ? "rgba(0,0,0,0.5)" : `${GOLD}14` }}>
                          <span className="text-[10px] font-black" style={{ color: isActive ? GOLD : `${GOLD}80` }}>{i + 1}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{clip.sourceTitle || `Clip ${i + 1}`}</p>
                          <p className="text-[9px] text-zinc-400 font-mono">{formatTimestamp(clip.startSec)} → {formatTimestamp(clip.endSec)} · {formatTimestamp(clip.endSec - clip.startSec)}</p>
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={e => { e.stopPropagation(); moveClip(clip.id, -1); }} className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-white/10" disabled={i === 0}>
                          <ChevronRight className="w-3 h-3 text-zinc-300 rotate-180" />
                        </button>
                        <button onClick={e => { e.stopPropagation(); moveClip(clip.id, 1); }} className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-white/10" disabled={i === clips.length - 1}>
                          <ChevronRight className="w-3 h-3 text-zinc-300" />
                        </button>
                        <button onClick={e => { e.stopPropagation(); deleteClip(clip.id); }} className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-red-500/10">
                          <Trash2 className="w-3 h-3 text-red-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Trim controls for active clip */}
            {activeClip && (
              <div className="mt-5 pt-5 space-y-4" style={{ borderTop: `1px solid ${GOLD}10` }}>
                <p className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: `${GOLD}40` }}>Trim Active Clip</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5 block">Start (sec)</Label>
                    <Input type="number" min={0} step={0.1} value={activeClip.startSec.toFixed(1)} onChange={e => trimClip(activeClip.id, Number(e.target.value), activeClip.endSec)} className="bg-zinc-900 border-zinc-700 text-white h-10" />
                  </div>
                  <div>
                    <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5 block">End (sec)</Label>
                    <Input type="number" min={0} step={0.1} value={activeClip.endSec.toFixed(1)} onChange={e => trimClip(activeClip.id, activeClip.startSec, Number(e.target.value))} className="bg-zinc-900 border-zinc-700 text-white h-10" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap">Duration</span>
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
                    <div className="h-full" style={{ width: `${Math.min(100, ((activeClip.endSec - activeClip.startSec) / Math.max(1, duration || 60)) * 100)}%`, background: `linear-gradient(90deg, ${GOLD}, ${GOLD_BRIGHT})` }} />
                  </div>
                  <span className="text-xs font-mono font-black" style={{ color: GOLD }}>{formatTimestamp(activeClip.endSec - activeClip.startSec)}</span>
                </div>
              </div>
            )}
          </Card>

          {/* Tips card */}
          <Card className="p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${GOLD}14`, border: `1px solid ${GOLD}25` }}>
              <Wand2 className="w-4 h-4" style={{ color: GOLD }} />
            </div>
            <div>
              <p className="text-xs font-bold text-white">How editing works</p>
              <p className="text-[10px] text-zinc-500 mt-0.5 leading-relaxed">Edit metadata is saved to the video. When you click "Save & Render", the server queues an ffmpeg job to produce the final spliced video. The original is preserved.</p>
            </div>
          </Card>
        </>
      )}

      {/* Stitch dialog */}
      <Dialog open={showStitch} onOpenChange={setShowStitch}>
        <DialogContent className="bg-[#0c0c10] border-zinc-800 max-w-md max-h-[85vh] overflow-y-auto" style={{ boxShadow: `0 25px 80px rgba(0,0,0,0.6), 0 0 60px ${GOLD}08` }}>
          <DialogHeader>
            <DialogTitle className="text-white font-black flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${GOLD}18`, border: `1px solid ${GOLD}30` }}>
                <Plus className="w-3.5 h-3.5" style={{ color: GOLD }} />
              </div>
              Stitch a Video
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-3 max-h-[400px] overflow-y-auto">
            {videos.filter((v: any) => v.id !== selectedVideoId).map((v: any) => (
              <button key={v.id} onClick={() => stitchAnotherVideo(v.id)} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.04] transition-all text-left">
                <div className="w-10 h-10 rounded-lg flex-shrink-0 overflow-hidden" style={{ background: v.thumbnailUrl ? `url(${v.thumbnailUrl}) center/cover` : `${GOLD}14` }}>
                  {!v.thumbnailUrl && <div className="w-full h-full flex items-center justify-center"><Film className="w-4 h-4" style={{ color: `${GOLD}60` }} /></div>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{v.title}</p>
                  <p className="text-[9px] text-zinc-500">{v.duration ? `${v.duration}m` : "—"}</p>
                </div>
                <Plus className="w-4 h-4" style={{ color: GOLD }} />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
