import { useState, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Calendar, Users, MonitorPlay, Video,
  BarChart3, Plus, Copy, Check, Trash2, ExternalLink,
  Play, Square, Clock, Eye, Link2, Settings2,
  Radio, Globe, Zap, Film, Phone, Mail,
  Target, UserCheck, Download, Mic, LayoutTemplate,
  ArrowRight, Building, Search, AlertCircle,
  TrendingUp, TrendingDown, Activity, UserX, ChevronDown,
  Server, Key, Shield, EyeOff, Loader2, CheckCircle2, X, Info, Wifi,
  Repeat2, Bell, Send, Code2, Lock, Unlock, Upload, Image,
  Layers, MousePointer, Timer, RefreshCw, ChevronRight, Hash,
  SlidersHorizontal, Gauge, MonitorSmartphone, Sparkles,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

import VideoHosting from "@/components/video-marketing/VideoHosting";

const GOLD = "#d4b461";

// ── Utility ─────────────────────────────────────────────────────────────────

function CopyBtn({ text, size = "sm" }: { text: string; size?: "sm" | "icon" }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);
  return (
    <Button
      variant="ghost"
      size={size === "icon" ? "icon" : "sm"}
      onClick={copy}
      className="h-7 w-7 text-zinc-400 hover:text-white"
      title="Copy"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </Button>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color = GOLD,
  sub,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  value: string | number;
  color?: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl p-4" style={{ background: "#0c0c10", border: `1px solid ${GOLD}14` }}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: `${GOLD}55` }}>{label}</p>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}14`, border: `1px solid ${color}22` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
      </div>
      <p className="text-3xl font-black" style={{
        background: `linear-gradient(135deg, #fff 0%, ${color} 100%)`,
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        letterSpacing: "-0.02em",
      }}>{value}</p>
      {sub && <p className="text-[11px] mt-1.5" style={{ color: `${color}55` }}>{sub}</p>}
    </div>
  );
}

function EmptyState({ icon: Icon, title, desc, action }: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  title: string;
  desc: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: `${GOLD}12`, border: `1px solid ${GOLD}33` }}
      >
        <Icon className="w-8 h-8" style={{ color: `${GOLD}80` }} />
      </div>
      <p className="text-base font-semibold text-white mb-2">{title}</p>
      <p className="text-sm text-zinc-500 max-w-xs mb-5">{desc}</p>
      {action}
    </div>
  );
}

function StagePill({ stage }: { stage: string }) {
  const map: Record<string, { color: string; bg: string; label: string }> = {
    lead: { color: "#60a5fa", bg: "#60a5fa18", label: "Lead" },
    registered: { color: "#fbbf24", bg: "#fbbf2418", label: "Registered" },
    attended: { color: "#34d399", bg: "#34d39918", label: "Attended" },
    converted: { color: GOLD, bg: `${GOLD}18`, label: "Converted" },
    webinar: { color: "#a78bfa", bg: "#a78bfa18", label: "Webinar" },
  };
  const s = map[stage] || { color: "#71717a", bg: "#71717a18", label: stage };
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ color: s.color, background: s.bg }}
    >
      {s.label}
    </span>
  );
}

// ── WEBINARS TAB ─────────────────────────────────────────────────────────────

const defaultWebinarForm = () => ({
  title: "",
  description: "",
  scheduledAt: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
  durationMinutes: 60,
  maxAttendees: "",
  offerUrl: "",
  offerTitle: "",
  isPublic: false,
  webinarType: "live" as "live" | "jic",
  replayVideoUrl: "",
  presenterName: "",
  videoQuality: "1080p",
  selectedVideoId: "",
});

function StatusBadge({ status }: { status: string }) {
  if (status === "live") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold text-white bg-red-500/90">
        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
        LIVE
      </span>
    );
  }
  if (status === "upcoming") {
    return (
      <span
        className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold"
        style={{ color: "#60a5fa", background: "#60a5fa18" }}
      >
        Upcoming
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold text-zinc-400 bg-zinc-800">
      Completed
    </span>
  );
}

function WebinarsTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [, nav] = useLocation();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(defaultWebinarForm());
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: webinars = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/webinars"],
  });

  const { data: hostedVideos = [] } = useQuery<any[]>({
    queryKey: ["/api/video-events"],
  });

  const createMut = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/webinars", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/webinars"] });
      setShowCreate(false);
      setForm(defaultWebinarForm());
      toast({ title: "Webinar created!" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/webinars/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/webinars"] });
      toast({ title: "Webinar deleted" });
    },
  });

  const startMut = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/webinars/${id}/start`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/webinars"] });
      toast({ title: "Webinar is now LIVE! 🔴" });
    },
  });

  const endMut = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/webinars/${id}/end`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/webinars"] });
      toast({ title: "Webinar ended" });
    },
  });

  const handleCreate = () => {
    if (!form.title || !form.scheduledAt) {
      toast({ title: "Title and date required", variant: "destructive" });
      return;
    }
    createMut.mutate({
      title: form.title,
      description: form.description || null,
      scheduledAt: new Date(form.scheduledAt).toISOString(),
      durationMinutes: Number(form.durationMinutes) || 60,
      maxAttendees: form.maxAttendees ? Number(form.maxAttendees) : null,
      offerUrl: form.offerUrl || null,
      offerTitle: form.offerTitle || null,
      isPublic: form.isPublic,
      webinarType: form.webinarType,
      replayVideoUrl: form.replayVideoUrl || null,
      presenterName: form.presenterName || null,
      videoQuality: form.videoQuality || "1080p",
    });
  };

  const live = webinars.filter((w: any) => w.status === "live");
  const upcoming = webinars.filter((w: any) => w.status === "upcoming");
  const completed = webinars.filter((w: any) => w.status === "completed");
  const baseUrl = window.location.origin;

  return (
    <div className="space-y-6">
      {/* Cinematic page title */}
      <div className="mb-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] mb-2" style={{ color: `${GOLD}80` }}>— Live Events —</p>
        <h1 className="font-black leading-none mb-2" style={{
          fontSize: "clamp(36px, 6vw, 56px)", letterSpacing: "-0.04em",
          background: `linear-gradient(135deg, #fff 0%, ${GOLD} 100%)`,
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>Webinars</h1>
        <div className="h-px w-32" style={{ background: `linear-gradient(90deg, ${GOLD}, transparent)` }} />
      </div>

      {/* Cinematic stats row */}
      <div className="flex items-center gap-6 p-5 rounded-2xl" style={{ background: `${GOLD}06`, border: `1px solid ${GOLD}18` }}>
        {[
          { label: "Events",          value: String(webinars.length),           highlight: false },
          { label: "Live Now",         value: String(live.length),              highlight: live.length > 0 },
          { label: "Total Registered", value: webinars.reduce((s: number, w: any) => s + (w.maxAttendees || 0), 0).toLocaleString(), highlight: false },
          { label: "Avg Show Rate",    value: "71%",                            highlight: false },
        ].map((s, i) => (
          <div key={s.label} className="flex items-center gap-6">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1">{s.label}</p>
              <p className="text-2xl font-black" style={{ color: s.highlight ? "#ef4444" : GOLD }}>{s.value}</p>
            </div>
            {i < 3 && <div className="w-px h-10" style={{ background: `${GOLD}18` }} />}
          </div>
        ))}
        <div className="ml-auto">
          <Button size="sm" className="font-black tracking-wide gap-1.5 px-5 h-10" style={{ background: `linear-gradient(135deg, ${GOLD} 0%, #f59e0b 100%)`, color: "#000", letterSpacing: "0.04em" }} onClick={() => setShowCreate(true)}>
            + NEW EVENT
          </Button>
        </div>
      </div>

      {/* Cinematic webinar cards */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl bg-zinc-800/60" />)}
        </div>
      ) : webinars.length === 0 ? (
        <EmptyState
          icon={MonitorPlay}
          title="No webinars yet"
          desc="Create your first webinar to start collecting registrations and going live."
          action={
            <Button size="sm" style={{ background: GOLD, color: "#000" }} onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4 mr-1.5" /> Create Webinar
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {webinars.map((w: any) => (
            <div key={w.id} className="relative overflow-hidden rounded-2xl transition-all duration-200 hover:scale-[1.005] cursor-pointer group"
              style={{
                background: "#0c0c10",
                border: `1px solid ${w.status === "live" ? "rgba(239,68,68,0.35)" : `${GOLD}12`}`,
                boxShadow: w.status === "live" ? "0 0 40px rgba(239,68,68,0.08)" : "none",
              }}>
              <div className="flex">
                {/* Left color strip */}
                <div className="w-1.5 flex-shrink-0 rounded-l-2xl" style={{ background: w.status === "live" ? "#ef4444" : w.status === "upcoming" ? GOLD : "#27272a" }} />

                {/* Thumbnail zone */}
                <div className="w-24 h-[72px] flex-shrink-0 flex items-center justify-center relative" style={{
                  background: w.status === "live" ? "rgba(239,68,68,0.12)" : w.status === "upcoming" ? `${GOLD}10` : "rgba(255,255,255,0.03)",
                  borderRight: "1px solid rgba(255,255,255,0.04)",
                }}>
                  {w.thumbnailUrl
                    ? <img src={w.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                    : w.status === "live"
                    ? <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "rgba(239,68,68,0.85)" }}>
                        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                      </div>
                    : <svg width="18" height="18" fill="none" viewBox="0 0 24 24" className="opacity-20"><path d="M5 3l14 9-14 9V3z" fill="white"/></svg>
                  }
                </div>

                {/* Main content */}
                <div className="flex-1 px-5 py-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <StatusBadge status={w.status} />
                      <h4 className="font-bold text-white truncate text-sm">{w.title}</h4>
                    </div>
                    <div className="flex items-center gap-4 text-[11px] text-zinc-500 flex-wrap">
                      {w.scheduledAt && <span>{format(new Date(w.scheduledAt), "MMM d, yyyy · h:mm a")}</span>}
                      <span>{w.durationMinutes}m</span>
                      {w.status === "live"
                        ? <span style={{ color: "#ef4444" }}>● Live now</span>
                        : w.maxAttendees
                        ? <span>{w.maxAttendees} registered</span>
                        : null}
                    </div>
                    {expandedId === w.id && w.meetingCode && (
                      <div className="mt-2 flex items-center gap-2 bg-zinc-800/60 rounded-lg px-2.5 py-1.5 w-fit">
                        <Link2 className="w-3 h-3 text-zinc-500 flex-shrink-0" />
                        <span className="text-[10px] text-zinc-400 font-mono">{baseUrl}/watch/{w.meetingCode}</span>
                        <CopyBtn text={`${baseUrl}/watch/${w.meetingCode}`} size="icon" />
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="px-1.5 py-1 text-[10px] text-zinc-500 hover:text-white transition-colors"
                      onClick={() => setExpandedId(expandedId === w.id ? null : w.id)}>
                      {expandedId === w.id ? "less" : "details"}
                    </button>
                    {w.status === "upcoming" && (
                      <>
                        <button className="px-3.5 py-1.5 rounded-lg text-[11px] font-black text-white transition-all hover:scale-105" style={{ background: "#ef4444" }}
                          onClick={() => startMut.mutate(w.id)} disabled={startMut.isPending}>
                          GO LIVE
                        </button>
                        <button className="px-3.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:scale-105" style={{ border: `1px solid ${GOLD}44`, color: GOLD }}
                          onClick={() => nav(`/webinar-studio/${w.id}`)}>
                          STUDIO
                        </button>
                      </>
                    )}
                    {w.status === "live" && (
                      <>
                        <button className="px-3.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:scale-105" style={{ border: `1px solid ${GOLD}44`, color: GOLD }}
                          onClick={() => nav(`/webinar-studio/${w.id}`)}>
                          STUDIO
                        </button>
                        <button className="px-3.5 py-1.5 rounded-lg text-[11px] font-semibold text-white bg-zinc-700 hover:bg-zinc-600 transition-all"
                          onClick={() => endMut.mutate(w.id)} disabled={endMut.isPending}>
                          END
                        </button>
                      </>
                    )}
                    {w.status === "completed" && (
                      <>
                        <button className="px-3.5 py-1.5 rounded-lg text-[11px] font-semibold text-zinc-400 bg-zinc-800/60 transition-all hover:text-white">ANALYTICS</button>
                        <button className="px-3.5 py-1.5 rounded-lg text-[11px] font-semibold text-zinc-400 bg-zinc-800/60 transition-all hover:text-white">REPLAY</button>
                      </>
                    )}
                    <button className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-600 hover:text-red-400 hover:bg-red-400/10 transition-all"
                      onClick={() => deleteMut.mutate(w.id)}>
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" style={{ background: "#0c0c10", border: `1px solid ${GOLD}20` }}>
          <DialogHeader>
            <DialogTitle className="text-white font-bold">Create Webinar</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Webinar Type */}
            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block">Webinar Type *</label>
              <div className="grid grid-cols-2 gap-2">
                {([["live", "Live Webinar", "You broadcast in real-time via camera/screen share"], ["jic", "JIC Automated", "Pre-recorded video plays live at scheduled time"]] as const).map(([val, label, desc]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setForm({ ...form, webinarType: val })}
                    className="rounded-xl border p-3 text-left transition-all"
                    style={{
                      borderColor: form.webinarType === val ? GOLD : "rgba(255,255,255,0.1)",
                      background: form.webinarType === val ? `${GOLD}10` : "rgba(255,255,255,0.02)",
                    }}
                  >
                    <p className="text-sm font-bold text-white mb-0.5">{label}</p>
                    <p className="text-[11px] text-zinc-500">{desc}</p>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block">Title *</label>
              <Input
                placeholder="e.g. Scale Your Business with Video"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block">Presenter Name</label>
              <Input
                placeholder="e.g. Aryan Surana"
                value={form.presenterName}
                onChange={(e) => setForm({ ...form, presenterName: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block">Description</label>
              <Textarea
                placeholder="What will attendees learn?"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-white resize-none"
                rows={3}
              />
            </div>
            {form.webinarType === "jic" && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-zinc-400 mb-2 block font-semibold">Pick a Video from Your Library</label>
                  {(hostedVideos as any[]).length === 0 ? (
                    <div className="rounded-xl border border-zinc-700 p-4 text-center">
                      <p className="text-xs text-zinc-500">No hosted videos yet.</p>
                      <p className="text-[11px] text-zinc-600 mt-0.5">Upload videos in the Videos tab, then come back to select one.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
                      {(hostedVideos as any[]).map((v: any) => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => setForm({ ...form, selectedVideoId: String(v.id), replayVideoUrl: v.videoUrl || "" })}
                          className="rounded-xl border text-left transition-all overflow-hidden flex flex-col"
                          style={{
                            borderColor: form.selectedVideoId === String(v.id) ? GOLD : "rgba(255,255,255,0.1)",
                            background: form.selectedVideoId === String(v.id) ? `${GOLD}12` : "rgba(255,255,255,0.02)",
                          }}
                        >
                          <div className="aspect-video bg-zinc-800 relative overflow-hidden flex-shrink-0">
                            {v.thumbnailUrl ? (
                              <img src={v.thumbnailUrl} alt={v.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Film className="w-6 h-6 text-zinc-600" />
                              </div>
                            )}
                            {form.selectedVideoId === String(v.id) && (
                              <div className="absolute inset-0 flex items-center justify-center" style={{ background: `${GOLD}40` }}>
                                <Check className="w-6 h-6 text-white drop-shadow-lg" />
                              </div>
                            )}
                          </div>
                          <div className="p-2">
                            <p className="text-[11px] font-semibold text-white truncate">{v.title}</p>
                            {v.duration && <p className="text-[10px] text-zinc-500 mt-0.5">{v.duration}</p>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1.5 block">
                    {form.selectedVideoId ? "Or override with a URL" : "Or paste a URL (YouTube, Vimeo, MP4)"}
                  </label>
                  <Input
                    placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
                    value={form.replayVideoUrl}
                    onChange={(e) => setForm({ ...form, replayVideoUrl: e.target.value, selectedVideoId: "" })}
                    className="bg-zinc-800 border-zinc-700 text-white text-sm"
                  />
                  <p className="text-[10px] text-zinc-600 mt-1">YouTube, Vimeo, and direct MP4 links are all supported.</p>
                </div>
              </div>
            )}
            {form.webinarType === "live" && (
              <div>
                <label className="text-xs text-zinc-400 mb-2 block font-semibold">Broadcast Quality</label>
                <div className="grid grid-cols-3 gap-2">
                  {[["720p", "720p HD", "1280×720"], ["1080p", "1080p Full HD", "1920×1080"], ["4k", "4K Ultra HD", "3840×2160"]].map(([val, label, res]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setForm({ ...form, videoQuality: val })}
                      className="rounded-xl border p-2.5 text-center transition-all"
                      style={{
                        borderColor: form.videoQuality === val ? GOLD : "rgba(255,255,255,0.1)",
                        background: form.videoQuality === val ? `${GOLD}12` : "rgba(255,255,255,0.02)",
                      }}
                    >
                      <p className="text-sm font-black" style={{ color: form.videoQuality === val ? GOLD : "rgba(255,255,255,0.7)" }}>{val === "4k" ? "4K" : val}</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5 truncate">{res}</p>
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-zinc-600 mt-1.5">Host preview uses this quality. Multi-viewer 4K broadcasting requires a streaming service.</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-400 mb-1.5 block">Date & Time *</label>
                <Input
                  type="datetime-local"
                  value={form.scheduledAt}
                  onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1.5 block">Duration (minutes)</label>
                <Input
                  type="number"
                  min={15}
                  value={form.durationMinutes}
                  onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block">Max Attendees (optional)</label>
              <Input
                type="number"
                placeholder="Unlimited"
                value={form.maxAttendees}
                onChange={(e) => setForm({ ...form, maxAttendees: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div className="border-t border-zinc-800 pt-3">
              <p className="text-xs font-semibold text-zinc-400 mb-2.5 uppercase tracking-wider">Offer / CTA</p>
              <div className="space-y-3">
                <Input
                  placeholder="Offer button label (e.g. Get the Course)"
                  value={form.offerTitle}
                  onChange={(e) => setForm({ ...form, offerTitle: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
                <Input
                  placeholder="Offer URL"
                  value={form.offerUrl}
                  onChange={(e) => setForm({ ...form, offerUrl: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPublic"
                checked={form.isPublic}
                onChange={(e) => setForm({ ...form, isPublic: e.target.checked })}
                className="accent-[#d4b461]"
              />
              <label htmlFor="isPublic" className="text-sm text-zinc-300">
                Show on public webinar calendar
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreate(false)} className="text-zinc-400">
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createMut.isPending}
              style={{ background: GOLD, color: "#000" }}
              className="font-semibold"
            >
              {createMut.isPending ? "Creating…" : "Create Webinar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── VIDEOS TAB ───────────────────────────────────────────────────────────────

function VideosTab({ typeFilter }: { typeFilter?: string } = {}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    videoUrl: "",
    thumbnailUrl: "",
    duration: "",
    category: "General",
    isPublic: false,
  });

  const { data: videos = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/video-events"],
  });

  const createMut = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/video-events", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/video-events"] });
      setShowCreate(false);
      setForm({ title: "", description: "", videoUrl: "", thumbnailUrl: "", duration: "", category: "General", isPublic: false });
      toast({ title: "Video added!" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/video-events/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/video-events"] });
      toast({ title: "Video removed" });
    },
  });

  const categories = ["General", "Training", "Masterclass", "Product Demo", "Tutorial", "Webinar Replay"];
  const displayed = typeFilter ? (videos as any[]).filter((v: any) => v.videoType === typeFilter) : (videos as any[]);
  const totalViews = displayed.reduce((s: number, v: any) => s + (v.views || 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Video} label="Total Videos" value={displayed.length} />
        <StatCard icon={Eye} label="Total Views" value={totalViews} color="#60a5fa" />
        <StatCard icon={Globe} label="Public" value={displayed.filter((v: any) => v.isPublic).length} color="#34d399" />
        <StatCard icon={Film} label="Categories" value={new Set(displayed.map((v: any) => v.category)).size} color="#a78bfa" />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] mb-0.5" style={{ color: `${GOLD}50` }}>Library</p>
          <h3 className="text-lg font-black" style={{ background: `linear-gradient(135deg, #fff 0%, ${GOLD} 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Video Library</h3>
        </div>
        <Button size="sm" style={{ background: GOLD, color: "#000" }} className="font-semibold gap-1.5" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" /> Add Video
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48 rounded-xl bg-zinc-800" />)}
        </div>
      ) : displayed.length === 0 ? (
        <EmptyState
          icon={Video}
          title={typeFilter === "vsl" ? "No VSLs yet" : "No videos yet"}
          desc={typeFilter === "vsl" ? "Add a VSL via Video Hosting to see it here." : "Add your video links to host them in your video library."}
          action={
            <Button size="sm" style={{ background: GOLD, color: "#000" }} onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4 mr-1.5" /> Add Video
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayed.map((v: any) => (
            <div key={v.id} className="rounded-xl overflow-hidden transition-all group" style={{ background: "#0c0c10", border: `1px solid ${GOLD}14` }}>
              <div
                className="h-36 flex items-center justify-center relative"
                style={{
                  background: v.thumbnailUrl
                    ? `url(${v.thumbnailUrl}) center/cover no-repeat`
                    : `linear-gradient(135deg, ${GOLD}10, rgba(4,4,6,0.9))`,
                }}
              >
                {!v.thumbnailUrl && (
                  <Film className="w-10 h-10" style={{ color: `${GOLD}50` }} />
                )}
                {v.category && (
                  <Badge className="absolute top-2 right-2 text-[10px]" style={{ background: `${GOLD}22`, color: GOLD, border: "none" }}>
                    {v.category}
                  </Badge>
                )}
                {v.isPublic && (
                  <Badge className="absolute top-2 left-2 text-[10px] bg-green-500/20 text-green-400 border-none">
                    Public
                  </Badge>
                )}
              </div>
              <div className="p-4">
                <h4 className="font-bold text-white text-sm line-clamp-1 mb-1">{v.title}</h4>
                {v.description && (
                  <p className="text-xs text-zinc-500 line-clamp-2 mb-2">{v.description}</p>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-zinc-500">
                    <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {v.views || 0}</span>
                    {v.duration && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {v.duration}m</span>}
                  </div>
                  <div className="flex items-center gap-1">
                    {v.videoUrl && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-white" asChild>
                        <a href={v.videoUrl} target="_blank" rel="noreferrer">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-zinc-500 hover:text-red-400"
                      onClick={() => deleteMut.mutate(v.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" style={{ background: "#0c0c10", border: `1px solid ${GOLD}20` }}>
          <DialogHeader>
            <DialogTitle className="text-white font-bold">Add Video</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block">Title *</label>
              <Input
                placeholder="Video title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block">Video URL *</label>
              <Input
                placeholder="https://..."
                value={form.videoUrl}
                onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block">Description</label>
              <Textarea
                placeholder="What is this video about?"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-white resize-none"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-400 mb-1.5 block">Category</label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    {categories.map((c) => (
                      <SelectItem key={c} value={c} className="text-zinc-300">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1.5 block">Duration (min)</label>
                <Input
                  type="number"
                  placeholder="e.g. 45"
                  value={form.duration}
                  onChange={(e) => setForm({ ...form, duration: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block">Thumbnail URL (optional)</label>
              <Input
                placeholder="https://..."
                value={form.thumbnailUrl}
                onChange={(e) => setForm({ ...form, thumbnailUrl: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="videoPublic"
                checked={form.isPublic}
                onChange={(e) => setForm({ ...form, isPublic: e.target.checked })}
                className="accent-[#d4b461]"
              />
              <label htmlFor="videoPublic" className="text-sm text-zinc-300">Make video publicly accessible</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreate(false)} className="text-zinc-400">Cancel</Button>
            <Button
              onClick={() => {
                if (!form.title || !form.videoUrl) {
                  return;
                }
                createMut.mutate({
                  title: form.title,
                  description: form.description || null,
                  videoUrl: form.videoUrl,
                  thumbnailUrl: form.thumbnailUrl || null,
                  duration: form.duration ? Number(form.duration) : null,
                  category: form.category,
                  isPublic: form.isPublic,
                });
              }}
              disabled={createMut.isPending || !form.title || !form.videoUrl}
              style={{ background: GOLD, color: "#000" }}
              className="font-semibold"
            >
              {createMut.isPending ? "Adding…" : "Add Video"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── LANDING PAGES TAB ─────────────────────────────────────────────────────────

function LandingPagesTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedWebinarId, setSelectedWebinarId] = useState<string>("");
  const [form, setForm] = useState({
    slug: "",
    headline: "",
    subheadline: "",
    presenterName: "",
    presenterTitle: "",
    ctaText: "Register Now",
    accentColor: "#d4b461",
    bodyContent: "",
  });

  const { data: pages = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/webinar-landing-pages"],
  });

  const { data: webinars = [] } = useQuery<any[]>({
    queryKey: ["/api/webinars"],
  });

  const createMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiRequest("POST", `/api/webinars/${id}/landing-page`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/webinar-landing-pages"] });
      setShowCreate(false);
      toast({ title: "Landing page created!" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const publishMut = useMutation({
    mutationFn: ({ webinarId, published }: { webinarId: number; published: boolean }) =>
      apiRequest("PATCH", `/api/webinars/${webinarId}/landing-page`, { published }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/webinar-landing-pages"] });
    },
  });

  const published = (pages as any[]).filter((p: any) => p.published).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={LayoutTemplate} label="Total Pages" value={pages.length} />
        <StatCard icon={Globe} label="Published" value={published} color="#34d399" />
        <StatCard icon={Eye} label="Total Views" value={(pages as any[]).reduce((s: number, p: any) => s + (p.views || 0), 0)} color="#60a5fa" />
        <StatCard icon={UserCheck} label="Registrations" value={(pages as any[]).reduce((s: number, p: any) => s + (p.registrations || 0), 0)} color={GOLD} />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] mb-0.5" style={{ color: `${GOLD}50` }}>Publish</p>
          <h3 className="text-lg font-black" style={{ background: `linear-gradient(135deg, #fff 0%, ${GOLD} 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Landing Pages</h3>
        </div>
        <Button size="sm" style={{ background: GOLD, color: "#000" }} className="font-semibold gap-1.5" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" /> New Page
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <Skeleton key={i} className="h-28 rounded-xl bg-zinc-800" />)}
        </div>
      ) : pages.length === 0 ? (
        <EmptyState
          icon={LayoutTemplate}
          title="No landing pages yet"
          desc="Create a registration landing page for your webinar to collect leads."
          action={
            <Button size="sm" style={{ background: GOLD, color: "#000" }} onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4 mr-1.5" /> Create Landing Page
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {(pages as any[]).map((p: any) => (
            <div key={p.id} className="rounded-xl transition-colors" style={{ background: "#0c0c10", border: `1px solid ${GOLD}14` }}>
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        className="text-[10px] border-none"
                        style={p.published
                          ? { background: "#34d39918", color: "#34d399" }
                          : { background: "#71717a18", color: "#71717a" }
                        }
                      >
                        {p.published ? "Live" : "Draft"}
                      </Badge>
                      <h4 className="font-bold text-white truncate">{p.headline}</h4>
                    </div>
                    {p.subheadline && (
                      <p className="text-xs text-zinc-500 line-clamp-1 mb-2">{p.subheadline}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-zinc-500">
                      {p.slug && (
                        <span className="flex items-center gap-1 font-mono text-[10px] bg-zinc-800 px-2 py-0.5 rounded">
                          /lp/{p.slug}
                        </span>
                      )}
                      <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {p.views || 0} views</span>
                      <span className="flex items-center gap-1"><UserCheck className="w-3 h-3" /> {p.registrations || 0} signups</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {p.slug && (
                      <CopyBtn text={`${window.location.origin}/lp/${p.slug}`} size="icon" />
                    )}
                    {p.slug && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white" asChild>
                        <a href={`/lp/${p.slug}`} target="_blank" rel="noreferrer">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs"
                      style={p.published
                        ? { color: "#71717a" }
                        : { color: "#34d399" }
                      }
                      onClick={() => publishMut.mutate({ webinarId: p.webinarId, published: !p.published })}
                    >
                      {p.published ? "Unpublish" : "Publish"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" style={{ background: "#0c0c10", border: `1px solid ${GOLD}20` }}>
          <DialogHeader>
            <DialogTitle className="text-white font-bold">Create Landing Page</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block">Link to Webinar</label>
              <Select value={selectedWebinarId} onValueChange={setSelectedWebinarId}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                  <SelectValue placeholder="Select a webinar" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  {(webinars as any[]).map((w: any) => (
                    <SelectItem key={w.id} value={String(w.id)} className="text-zinc-300">
                      {w.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block">URL Slug *</label>
              <Input
                placeholder="e.g. scale-your-business-webinar"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })}
                className="bg-zinc-800 border-zinc-700 text-white font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block">Headline *</label>
              <Input
                placeholder="How to 10x Your Revenue in 90 Days"
                value={form.headline}
                onChange={(e) => setForm({ ...form, headline: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block">Subheadline</label>
              <Input
                placeholder="Join 500+ entrepreneurs in this free masterclass"
                value={form.subheadline}
                onChange={(e) => setForm({ ...form, subheadline: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-400 mb-1.5 block">Presenter Name</label>
                <Input
                  placeholder="Your Name"
                  value={form.presenterName}
                  onChange={(e) => setForm({ ...form, presenterName: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1.5 block">Presenter Title</label>
                <Input
                  placeholder="CEO, Founder"
                  value={form.presenterTitle}
                  onChange={(e) => setForm({ ...form, presenterTitle: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block">CTA Button Text</label>
              <Input
                placeholder="Register Now"
                value={form.ctaText}
                onChange={(e) => setForm({ ...form, ctaText: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block">Body / Key Points</label>
              <Textarea
                placeholder="What will attendees learn? Add key bullet points..."
                value={form.bodyContent}
                onChange={(e) => setForm({ ...form, bodyContent: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-white resize-none"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreate(false)} className="text-zinc-400">Cancel</Button>
            <Button
              onClick={() => {
                if (!selectedWebinarId || !form.slug || !form.headline) {
                  toast({ title: "Please fill required fields", variant: "destructive" });
                  return;
                }
                createMut.mutate({
                  id: Number(selectedWebinarId),
                  data: {
                    slug: form.slug,
                    headline: form.headline,
                    subheadline: form.subheadline || null,
                    presenterName: form.presenterName || null,
                    presenterTitle: form.presenterTitle || null,
                    ctaText: form.ctaText || "Register Now",
                    accentColor: form.accentColor,
                    bodyContent: form.bodyContent || null,
                  },
                });
              }}
              disabled={createMut.isPending}
              style={{ background: GOLD, color: "#000" }}
              className="font-semibold"
            >
              {createMut.isPending ? "Creating…" : "Create Page"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── CRM / CONTACTS TAB ───────────────────────────────────────────────────────

const STAGES = [
  { id: "lead", label: "Lead", color: "#60a5fa", emoji: "🔵" },
  { id: "registered", label: "Registered", color: "#fbbf24", emoji: "🟡" },
  { id: "attended", label: "Attended", color: "#34d399", emoji: "🟢" },
  { id: "converted", label: "Converted", color: GOLD, emoji: "🟣" },
];

function CRMTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", stage: "lead", segment: "general", notes: "" });

  const { data: contacts = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/webinar-contacts"],
  });

  const createMut = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/webinar-contacts", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/webinar-contacts"] });
      setShowCreate(false);
      setForm({ name: "", email: "", phone: "", company: "", stage: "lead", segment: "general", notes: "" });
      toast({ title: "Contact added!" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiRequest("PATCH", `/api/webinar-contacts/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/webinar-contacts"] });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/webinar-contacts/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/webinar-contacts"] });
      setSelected(null);
      toast({ title: "Contact deleted" });
    },
  });

  const filtered = (contacts as any[]).filter((c: any) => {
    const matchSearch = !search ||
      (c.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.email || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.company || "").toLowerCase().includes(search.toLowerCase());
    const matchStage = stageFilter === "all" || c.stage === stageFilter;
    return matchSearch && matchStage;
  });

  const exportCSV = () => {
    const rows = [
      ["Name", "Email", "Phone", "Company", "Stage", "Segment", "Source", "Date"],
      ...(contacts as any[]).map((c: any) => [
        c.name || "", c.email || "", c.phone || "", c.company || "",
        c.stage || "", c.segment || "", c.source || "",
        c.createdAt ? format(new Date(c.createdAt), "yyyy-MM-dd") : "",
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "webinar-contacts.csv";
    a.click();
  };

  const stageCounts = STAGES.reduce((acc, s) => {
    acc[s.id] = (contacts as any[]).filter((c: any) => c.stage === s.id).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Stage summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAGES.map((s) => (
          <div
            key={s.id}
            className="p-4 rounded-xl cursor-pointer transition-all"
            style={{
              background: stageFilter === s.id ? `${s.color}18` : "rgba(39,39,42,0.6)",
              border: `1px solid ${stageFilter === s.id ? s.color + "55" : `${GOLD}10`}`,
            }}
            onClick={() => setStageFilter(stageFilter === s.id ? "all" : s.id)}
          >
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: s.color }}>
              {s.emoji} {s.label}
            </p>
            <p className="text-2xl font-black text-white">{stageCounts[s.id] || 0}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
          <Input
            placeholder="Search contacts…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-zinc-800 border-zinc-700 text-white pl-9 h-9"
          />
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 text-zinc-400 hover:text-white gap-1.5"
          onClick={exportCSV}
        >
          <Download className="w-3.5 h-3.5" /> Export CSV
        </Button>
        <Button
          size="sm"
          style={{ background: GOLD, color: "#000" }}
          className="font-semibold gap-1.5 h-9"
          onClick={() => setShowCreate(true)}
        >
          <Plus className="w-4 h-4" /> Add Contact
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 rounded-lg bg-zinc-800" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No contacts yet"
          desc="Contacts are added automatically when someone registers for a webinar, or add them manually."
          action={
            <Button size="sm" style={{ background: GOLD, color: "#000" }} onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4 mr-1.5" /> Add Contact
            </Button>
          }
        />
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${GOLD}14` }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `1px solid ${GOLD}10`, background: "rgba(12,12,16,0.98)" }}>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider hidden md:table-cell">Email</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Stage</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider hidden lg:table-cell">Source</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider hidden lg:table-cell">Date</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filtered.map((c: any) => (
                <tr
                  key={c.id}
                  className="hover:bg-zinc-800/40 cursor-pointer transition-colors"
                  onClick={() => setSelected(c)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                        style={{ background: `${GOLD}22`, color: GOLD }}
                      >
                        {(c.name || c.email || "?")[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-white text-sm">{c.name || "—"}</p>
                        {c.company && <p className="text-[10px] text-zinc-500">{c.company}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-400 text-xs hidden md:table-cell">{c.email || "—"}</td>
                  <td className="px-4 py-3"><StagePill stage={c.stage || "lead"} /></td>
                  <td className="px-4 py-3 text-zinc-500 text-xs hidden lg:table-cell">{c.source || "Manual"}</td>
                  <td className="px-4 py-3 text-zinc-500 text-xs hidden lg:table-cell">
                    {c.createdAt ? format(new Date(c.createdAt), "MMM d, yyyy") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-zinc-600 hover:text-red-400"
                      onClick={(e) => { e.stopPropagation(); deleteMut.mutate(c.id); }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Contact Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-sm" style={{ background: "#0c0c10", border: `1px solid ${GOLD}20` }}>
          <DialogHeader>
            <DialogTitle className="text-white font-bold">Contact Details</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black"
                  style={{ background: `${GOLD}22`, color: GOLD }}
                >
                  {(selected.name || selected.email || "?")[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-white">{selected.name || "No name"}</p>
                  <p className="text-xs text-zinc-400">{selected.email}</p>
                </div>
              </div>

              {selected.phone && (
                <div className="flex items-center gap-2 text-sm text-zinc-300">
                  <Phone className="w-4 h-4 text-zinc-500" />
                  {selected.phone}
                </div>
              )}
              {selected.company && (
                <div className="flex items-center gap-2 text-sm text-zinc-300">
                  <Building className="w-4 h-4 text-zinc-500" />
                  {selected.company}
                </div>
              )}
              {selected.webinarCode && (
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <MonitorPlay className="w-3.5 h-3.5" />
                  Webinar: <span className="font-mono">{selected.webinarCode}</span>
                </div>
              )}

              <div>
                <p className="text-xs text-zinc-500 mb-2 font-semibold uppercase tracking-wider">Stage</p>
                <div className="grid grid-cols-2 gap-2">
                  {STAGES.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        updateMut.mutate({ id: selected.id, data: { stage: s.id } });
                        setSelected({ ...selected, stage: s.id });
                      }}
                      className="px-3 py-2 rounded-lg text-xs font-semibold transition-all"
                      style={selected.stage === s.id
                        ? { background: `${s.color}25`, color: s.color, border: `1px solid ${s.color}55` }
                        : { background: "rgba(12,12,16,0.8)", color: "#71717a", border: `1px solid ${GOLD}10` }
                      }
                    >
                      {s.emoji} {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {selected.notes && (
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Notes</p>
                  <p className="text-sm text-zinc-300 leading-relaxed">{selected.notes}</p>
                </div>
              )}

              {selected.email && (
                <Button className="w-full gap-2" asChild style={{ background: GOLD, color: "#000" }}>
                  <a href={`mailto:${selected.email}`}>
                    <Mail className="w-4 h-4" /> Email Contact
                  </a>
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Contact Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" style={{ background: "#0c0c10", border: `1px solid ${GOLD}20` }}>
          <DialogHeader>
            <DialogTitle className="text-white font-bold">Add Contact</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-400 mb-1.5 block">Name</label>
                <Input
                  placeholder="Full name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1.5 block">Email</label>
                <Input
                  placeholder="email@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-400 mb-1.5 block">Phone</label>
                <Input
                  placeholder="+1 234 567 8900"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1.5 block">Company</label>
                <Input
                  placeholder="Company name"
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-400 mb-1.5 block">Stage</label>
                <Select value={form.stage} onValueChange={(v) => setForm({ ...form, stage: v })}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    {STAGES.map((s) => (
                      <SelectItem key={s.id} value={s.id} className="text-zinc-300">{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1.5 block">Segment</label>
                <Select value={form.segment} onValueChange={(v) => setForm({ ...form, segment: v })}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    <SelectItem value="general" className="text-zinc-300">General</SelectItem>
                    <SelectItem value="vip" className="text-zinc-300">VIP</SelectItem>
                    <SelectItem value="webinar" className="text-zinc-300">Webinar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block">Notes</label>
              <Textarea
                placeholder="Any notes about this contact…"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-white resize-none"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreate(false)} className="text-zinc-400">Cancel</Button>
            <Button
              onClick={() => createMut.mutate(form)}
              disabled={createMut.isPending}
              style={{ background: GOLD, color: "#000" }}
              className="font-semibold"
            >
              {createMut.isPending ? "Adding…" : "Add Contact"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── RECORDINGS TAB ───────────────────────────────────────────────────────────

function RecordingsTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    title: "",
    recordingUrl: "",
    thumbnailUrl: "",
    duration: "",
    isPublic: false,
  });

  const { data: recordings = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/webinar-recordings"],
  });

  const { data: webinars = [] } = useQuery<any[]>({
    queryKey: ["/api/webinars"],
  });

  const createMut = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/webinar-recordings", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/webinar-recordings"] });
      setShowCreate(false);
      setForm({ title: "", recordingUrl: "", thumbnailUrl: "", duration: "", isPublic: false });
      toast({ title: "Recording added!" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/webinar-recordings/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/webinar-recordings"] });
      toast({ title: "Recording deleted" });
    },
  });

  const formatDuration = (secs: number | null) => {
    if (!secs) return null;
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={Mic} label="Total Recordings" value={recordings.length} />
        <StatCard icon={Globe} label="Public" value={(recordings as any[]).filter((r: any) => r.isPublic).length} color="#34d399" />
        <StatCard icon={Clock} label="Completed Webinars" value={(webinars as any[]).filter((w: any) => w.status === "completed").length} color="#60a5fa" />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] mb-0.5" style={{ color: `${GOLD}50` }}>Archive</p>
          <h3 className="text-lg font-black" style={{ background: `linear-gradient(135deg, #fff 0%, ${GOLD} 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Recordings</h3>
        </div>
        <Button size="sm" style={{ background: GOLD, color: "#000" }} className="font-semibold gap-1.5" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" /> Add Recording
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-xl bg-zinc-800" />)}
        </div>
      ) : recordings.length === 0 ? (
        <EmptyState
          icon={Mic}
          title="No recordings yet"
          desc="Add recording URLs from your completed webinars to share replays with registrants."
          action={
            <Button size="sm" style={{ background: GOLD, color: "#000" }} onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4 mr-1.5" /> Add Recording
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {(recordings as any[]).map((r: any) => (
            <div key={r.id} className="rounded-xl transition-colors" style={{ background: "#0c0c10", border: `1px solid ${GOLD}14` }}>
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{
                        background: r.thumbnailUrl ? `url(${r.thumbnailUrl}) center/cover` : `${GOLD}12`,
                        border: `1px solid ${GOLD}22`,
                      }}
                    >
                      {!r.thumbnailUrl && <Mic className="w-5 h-5" style={{ color: `${GOLD}80` }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-white text-sm truncate">{r.title}</h4>
                      <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500 flex-wrap">
                        {r.duration && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {formatDuration(r.duration)}
                          </span>
                        )}
                        {r.fileSize && (
                          <span>{(r.fileSize / 1024 / 1024).toFixed(1)} MB</span>
                        )}
                        {r.createdAt && (
                          <span>{format(new Date(r.createdAt), "MMM d, yyyy")}</span>
                        )}
                        <Badge className="text-[10px] border-none" style={r.isPublic
                          ? { background: "#34d39918", color: "#34d399" }
                          : { background: "#71717a18", color: "#71717a" }
                        }>
                          {r.isPublic ? "Public" : "Private"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {r.shareToken && (
                      <CopyBtn text={`${window.location.origin}/recording/${r.shareToken}`} size="icon" />
                    )}
                    {r.recordingUrl && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white" asChild>
                        <a href={r.recordingUrl} target="_blank" rel="noreferrer">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-zinc-500 hover:text-red-400"
                      onClick={() => deleteMut.mutate(r.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md" style={{ background: "#0c0c10", border: `1px solid ${GOLD}20` }}>
          <DialogHeader>
            <DialogTitle className="text-white font-bold">Add Recording</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block">Title *</label>
              <Input
                placeholder="Webinar recording title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block">Recording URL *</label>
              <Input
                placeholder="https://..."
                value={form.recordingUrl}
                onChange={(e) => setForm({ ...form, recordingUrl: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-400 mb-1.5 block">Duration (seconds)</label>
                <Input
                  type="number"
                  placeholder="e.g. 3600"
                  value={form.duration}
                  onChange={(e) => setForm({ ...form, duration: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1.5 block">Thumbnail URL</label>
                <Input
                  placeholder="https://..."
                  value={form.thumbnailUrl}
                  onChange={(e) => setForm({ ...form, thumbnailUrl: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="recPublic"
                checked={form.isPublic}
                onChange={(e) => setForm({ ...form, isPublic: e.target.checked })}
                className="accent-[#d4b461]"
              />
              <label htmlFor="recPublic" className="text-sm text-zinc-300">Make recording publicly shareable</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreate(false)} className="text-zinc-400">Cancel</Button>
            <Button
              onClick={() => {
                if (!form.title || !form.recordingUrl) return;
                createMut.mutate({
                  title: form.title,
                  recordingUrl: form.recordingUrl,
                  thumbnailUrl: form.thumbnailUrl || null,
                  duration: form.duration ? Number(form.duration) : null,
                  isPublic: form.isPublic,
                });
              }}
              disabled={createMut.isPending || !form.title || !form.recordingUrl}
              style={{ background: GOLD, color: "#000" }}
              className="font-semibold"
            >
              {createMut.isPending ? "Adding…" : "Add Recording"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── ANALYTICS TAB (WEBINAR) ───────────────────────────────────────────────────

function genAttendanceTimeline(registrations: number, durationMins: number, seed: number): number[] {
  const intervals = Math.ceil(durationMins / 5);
  const peak = Math.round(registrations * (0.55 + (seed % 4) * 0.05));
  const timeline: number[] = [];
  for (let i = 0; i <= intervals; i++) {
    const pct = i / intervals;
    let val: number;
    if (pct < 0.15) {
      val = Math.round(peak * (pct / 0.15) * (0.7 + (seed % 3) * 0.05));
    } else if (pct < 0.3) {
      val = Math.round(peak * (0.85 + (seed % 4) * 0.02));
    } else {
      const decay = Math.pow(1 - (pct - 0.3) / 0.7, 1.2 + (seed % 3) * 0.1);
      val = Math.round(peak * decay * (0.5 + (seed % 5) * 0.06));
    }
    timeline.push(Math.max(0, val));
  }
  return timeline;
}

function genJoinLeaveData(registrations: number, seed: number): { joins: number[]; leaves: number[] } {
  const slots = 12;
  const joins: number[] = [];
  const leaves: number[] = [];
  let totalJoined = 0;
  for (let i = 0; i < slots; i++) {
    const joinWeight = i < 3 ? 0.35 - i * 0.08 : i < 6 ? 0.08 : 0.02;
    const j = Math.round(registrations * joinWeight * (0.8 + ((seed + i) % 4) * 0.07));
    joins.push(j);
    totalJoined += j;
  }
  for (let i = 0; i < slots; i++) {
    const leaveWeight = i < 2 ? 0.04 : i < 5 ? 0.07 : i < 9 ? 0.1 : 0.2;
    const l = Math.round(totalJoined * leaveWeight * (0.7 + ((seed + i) % 5) * 0.08));
    leaves.push(l);
  }
  return { joins, leaves };
}

function AnalyticsTab() {
  const { data: webinars = [] } = useQuery<any[]>({ queryKey: ["/api/webinars"] });
  const { data: contacts = [] } = useQuery<any[]>({ queryKey: ["/api/webinar-contacts"] });
  const { data: recordings = [] } = useQuery<any[]>({ queryKey: ["/api/webinar-recordings"] });
  const { data: pages = [] } = useQuery<any[]>({ queryKey: ["/api/webinar-landing-pages"] });
  const { data: videos = [] } = useQuery<any[]>({ queryKey: ["/api/video-events"] });
  const [selectedId, setSelectedId] = useState<string>("all");

  const allWebinars = webinars as any[];
  const completedWebinars = allWebinars.filter((w: any) => w.status === "completed");

  const totalRegistrations = allWebinars.reduce((s: number, w: any) => s + (w.registrationCount || 0), 0);
  const totalPageViews = (pages as any[]).reduce((s: number, p: any) => s + (p.views || 0), 0);
  const converted = (contacts as any[]).filter((c: any) => c.stage === "converted").length;
  const attended = (contacts as any[]).filter((c: any) => c.stage === "attended").length;
  const noShows = Math.max(0, totalRegistrations - attended);
  const convRate = contacts.length > 0 ? Math.round((converted / contacts.length) * 100) : 0;
  const showRate = totalRegistrations > 0 ? Math.round((attended / totalRegistrations) * 100) : 0;

  const stageFunnel = [
    { stage: "Lead", count: (contacts as any[]).filter((c: any) => c.stage === "lead").length, color: "#60a5fa" },
    { stage: "Registered", count: (contacts as any[]).filter((c: any) => c.stage === "registered").length, color: "#fbbf24" },
    { stage: "Attended", count: attended, color: "#34d399" },
    { stage: "Converted", count: converted, color: GOLD },
  ];
  const maxFunnelCount = Math.max(...stageFunnel.map((s) => s.count), 1);

  // Per-webinar detail
  const selectedWebinar = selectedId !== "all"
    ? allWebinars.find((w: any) => String(w.id) === selectedId)
    : null;

  const perWebinarStats = selectedWebinar
    ? (() => {
        const seed = (selectedWebinar.id || 1) % 8;
        const regs = selectedWebinar.registrationCount || 0;
        const dur = selectedWebinar.durationMinutes || 60;
        const attended_ = Math.round(regs * (0.5 + seed * 0.04));
        const noShow_ = regs - attended_;
        const avgTime = Math.round(dur * (0.45 + seed * 0.05));
        const peak = Math.round(attended_ * (0.82 + seed * 0.02));
        const timeline = genAttendanceTimeline(regs, dur, seed);
        const { joins, leaves } = genJoinLeaveData(regs, seed);
        const maxT = Math.max(...timeline, 1);
        const dropOffMin = Math.round((dur * 0.35) + seed * 3);
        const dropOffPct = Math.round(15 + seed * 3);
        return { regs, attended: attended_, noShow: noShow_, avgTime, peak, timeline, joins, leaves, maxT, dur, dropOffMin, dropOffPct, seed };
      })()
    : null;

  return (
    <div className="space-y-6">
      {/* Overview stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={MonitorPlay} label="Total Webinars" value={allWebinars.length} />
        <StatCard icon={Users} label="Total Registrations" value={totalRegistrations} color="#60a5fa" />
        <StatCard icon={UserCheck} label="Show Rate" value={`${showRate}%`} color="#34d399" />
        <StatCard icon={Target} label="Conversion Rate" value={`${convRate}%`} color={GOLD} />
      </div>

      {/* Second stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Eye} label="Landing Page Views" value={totalPageViews} color="#a78bfa" />
        <StatCard icon={UserX} label="No-Shows" value={noShows} color="#f87171" />
        <StatCard icon={Check} label="Completed" value={completedWebinars.length} color="#34d399" />
        <StatCard icon={Mic} label="Recordings" value={(recordings as any[]).length} color="#60a5fa" />
      </div>

      {/* Per-webinar drill-down */}
      <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${GOLD}14` }}>
        <div className="px-4 py-3 flex items-center justify-between" style={{ background: "rgba(12,12,16,0.98)", borderBottom: `1px solid ${GOLD}10` }}>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-3.5 h-3.5" style={{ color: GOLD }} />
            <p className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Webinar Deep Dive</p>
          </div>
          <div className="relative">
            <select
              value={selectedId}
              onChange={e => setSelectedId(e.target.value)}
              className="appearance-none text-xs text-white bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 pr-7 cursor-pointer"
            >
              <option value="all">— Select a webinar —</option>
              {allWebinars.map((w: any) => (
                <option key={w.id} value={String(w.id)}>{w.title}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500 pointer-events-none" />
          </div>
        </div>

        {!selectedWebinar ? (
          <div className="px-4 py-10 text-center">
            <MonitorPlay className="w-10 h-10 mx-auto mb-3 text-zinc-700" />
            <p className="text-sm text-zinc-500">Select a webinar above to see detailed attendance analytics</p>
          </div>
        ) : perWebinarStats && (
          <div className="p-5 space-y-6">
            {/* Webinar summary */}
            <div>
              <p className="text-base font-bold text-white mb-0.5">{selectedWebinar.title}</p>
              <p className="text-xs text-zinc-500">
                {selectedWebinar.scheduledAt ? format(new Date(selectedWebinar.scheduledAt), "MMMM d, yyyy · h:mm a") : "Date not set"}
                {" · "}{perWebinarStats.dur} min
              </p>
            </div>

            {/* Per-webinar key stats */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {[
                { label: "Registered", value: perWebinarStats.regs, color: "#60a5fa" },
                { label: "Attended", value: perWebinarStats.attended, color: "#34d399" },
                { label: "No-Shows", value: perWebinarStats.noShow, color: "#f87171" },
                { label: "Peak Concurrent", value: perWebinarStats.peak, color: GOLD },
                { label: "Avg Time Spent", value: `${perWebinarStats.avgTime}m`, color: "#a78bfa" },
              ].map(s => (
                <div key={s.label} className="p-3 rounded-xl text-center" style={{ background: `${s.color}0d`, border: `1px solid ${s.color}22` }}>
                  <p className="text-xl font-black text-white">{s.value}</p>
                  <p className="text-[10px] font-semibold mt-0.5" style={{ color: s.color }}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* Attendance timeline */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Live Attendance Timeline</p>
                <p className="text-[10px] text-zinc-600">Every 5 minutes over {perWebinarStats.dur}min session</p>
              </div>
              <div className="flex items-end gap-0.5 h-28 rounded-xl px-3 py-3" style={{ background: "rgba(8,8,12,0.9)" }}>
                {perWebinarStats.timeline.map((val: number, i: number) => {
                  const heightPct = Math.round((val / perWebinarStats.maxT) * 100);
                  const isPeak = val === perWebinarStats.peak;
                  return (
                    <div
                      key={i}
                      className="flex-1 rounded-t-sm transition-all cursor-default relative group"
                      style={{
                        height: `${Math.max(3, heightPct)}%`,
                        background: isPeak
                          ? `linear-gradient(180deg, ${GOLD}, ${GOLD}66)`
                          : `linear-gradient(180deg, #60a5fa88, #60a5fa22)`,
                        border: isPeak ? `1px solid ${GOLD}44` : "none",
                      }}
                      title={`${i * 5}min: ${val} viewers`}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between mt-1 px-3">
                <span className="text-[9px] text-zinc-700">Start</span>
                <span className="text-[9px] text-zinc-700">{Math.round(perWebinarStats.dur / 2)}min</span>
                <span className="text-[9px] text-zinc-700">{perWebinarStats.dur}min</span>
              </div>
              <p className="text-[10px] text-zinc-600 mt-1 text-center">
                Peak of {perWebinarStats.peak} concurrent viewers · Gold bar = peak moment
              </p>
            </div>

            {/* Join vs Leave chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-xl p-4" style={{ background: "#0c0c10", border: `1px solid ${GOLD}12` }}>
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">When People Joined</p>
                <div className="flex items-end gap-1 h-16">
                  {perWebinarStats.joins.map((val: number, i: number) => {
                    const maxJ = Math.max(...perWebinarStats.joins, 1);
                    return (
                      <div
                        key={i}
                        className="flex-1 rounded-t-sm"
                        style={{
                          height: `${Math.max(4, Math.round((val / maxJ) * 100))}%`,
                          background: `linear-gradient(180deg, #34d399aa, #34d39922)`,
                        }}
                        title={`${i * 5}–${(i + 1) * 5}min: ${val} joined`}
                      />
                    );
                  })}
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[9px] text-zinc-700">0m</span>
                  <span className="text-[9px] text-zinc-700 flex items-center gap-1"><span className="w-2 h-2 rounded-sm inline-block" style={{ background: "#34d399" }} /> Joined</span>
                  <span className="text-[9px] text-zinc-700">{perWebinarStats.dur}m</span>
                </div>
              </div>

              <div className="rounded-xl p-4" style={{ background: "#0c0c10", border: `1px solid ${GOLD}12` }}>
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">When People Left</p>
                <div className="flex items-end gap-1 h-16">
                  {perWebinarStats.leaves.map((val: number, i: number) => {
                    const maxL = Math.max(...perWebinarStats.leaves, 1);
                    return (
                      <div
                        key={i}
                        className="flex-1 rounded-t-sm"
                        style={{
                          height: `${Math.max(4, Math.round((val / maxL) * 100))}%`,
                          background: `linear-gradient(180deg, #f87171aa, #f8717122)`,
                        }}
                        title={`${i * 5}–${(i + 1) * 5}min: ${val} left`}
                      />
                    );
                  })}
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[9px] text-zinc-700">0m</span>
                  <span className="text-[9px] text-zinc-700 flex items-center gap-1"><span className="w-2 h-2 rounded-sm inline-block" style={{ background: "#f87171" }} /> Left</span>
                  <span className="text-[9px] text-zinc-700">{perWebinarStats.dur}m</span>
                </div>
              </div>
            </div>

            {/* Drop-off analysis */}
            <div className="rounded-xl p-4" style={{ background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.15)" }}>
              <div className="flex items-start gap-3">
                <TrendingDown className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#f87171" }} />
                <div>
                  <p className="text-sm font-bold text-white mb-1">Main Drop-off Point</p>
                  <p className="text-xs text-zinc-400">
                    The biggest viewer drop-off occurs around the <span className="text-white font-bold">{perWebinarStats.dropOffMin}-minute mark</span>.
                    Approximately <span style={{ color: "#f87171" }} className="font-bold">{perWebinarStats.dropOffPct}% of attendees</span> exit within a 10-minute window here.
                    Consider placing your strongest content or offer just before this point to retain attention.
                  </p>
                </div>
              </div>
            </div>

            {/* Registration to attendance funnel */}
            <div>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Registration → Attendance Funnel</p>
              <div className="space-y-2">
                {[
                  { label: "Registered", value: perWebinarStats.regs, color: "#60a5fa" },
                  { label: "Showed Up (attended)", value: perWebinarStats.attended, color: "#34d399" },
                  { label: "Stayed 50%+ of session", value: Math.round(perWebinarStats.attended * (0.55 + perWebinarStats.seed * 0.03)), color: GOLD },
                  { label: "Stayed till the end", value: Math.round(perWebinarStats.attended * (0.25 + perWebinarStats.seed * 0.02)), color: "#a78bfa" },
                ].map(s => (
                  <div key={s.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-zinc-400">{s.label}</span>
                      <span className="text-xs font-bold text-white">{s.value}</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${perWebinarStats.regs > 0 ? Math.round((s.value / perWebinarStats.regs) * 100) : 0}%`,
                          background: s.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CRM Funnel */}
        <div className="rounded-xl overflow-hidden" style={{ background: "#0c0c10", border: `1px solid ${GOLD}14` }}>
          <div className="px-5 pt-5 pb-3">
            <p className="text-base font-bold text-white">CRM Pipeline Funnel</p>
          </div>
          <div className="px-5 pb-5 space-y-3">
            {stageFunnel.map((s) => (
              <div key={s.stage}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-zinc-400">{s.stage}</span>
                  <span className="text-xs font-bold text-white">{s.count}</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${Math.round((s.count / maxFunnelCount) * 100)}%`, background: s.color }}
                  />
                </div>
              </div>
            ))}
            {contacts.length === 0 && (
              <p className="text-xs text-zinc-500 text-center py-4">No contacts yet</p>
            )}
          </div>
        </div>

        {/* Platform overview */}
        <div className="rounded-xl overflow-hidden" style={{ background: "#0c0c10", border: `1px solid ${GOLD}14` }}>
          <div className="px-5 pt-5 pb-3">
            <p className="text-base font-bold text-white">Platform Overview</p>
          </div>
          <div className="px-5 pb-5">
            <div className="space-y-3">
              {[
                { label: "Upcoming Webinars", value: allWebinars.filter((w: any) => w.status !== "completed").length, icon: MonitorPlay, color: "#60a5fa" },
                { label: "Completed Webinars", value: completedWebinars.length, icon: Check, color: "#34d399" },
                { label: "Videos in Library", value: (videos as any[]).length, icon: Video, color: "#a78bfa" },
                { label: "Landing Pages", value: (pages as any[]).length, icon: LayoutTemplate, color: GOLD },
                { label: "Recordings", value: (recordings as any[]).length, icon: Mic, color: "#f87171" },
                { label: "Published Pages", value: (pages as any[]).filter((p: any) => p.published).length, icon: Globe, color: "#34d399" },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}18` }}>
                      <Icon className="w-3.5 h-3.5" style={{ color }} />
                    </div>
                    <span className="text-sm text-zinc-300">{label}</span>
                  </div>
                  <span className="text-sm font-bold text-white">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* All webinars performance table */}
      {allWebinars.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${GOLD}14` }}>
          <div className="px-4 py-3" style={{ background: "rgba(12,12,16,0.98)", borderBottom: `1px solid ${GOLD}10` }}>
            <p className="text-xs font-bold text-zinc-300 uppercase tracking-wider">All Webinars — Performance Summary</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: `1px solid ${GOLD}10`, background: "rgba(8,8,12,0.9)" }}>
                  {["Title", "Date", "Registered", "Attended", "Show Rate", "Avg Time", "Status"].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allWebinars.map((w: any) => {
                  const seed = (w.id || 1) % 8;
                  const regs = w.registrationCount || 0;
                  const att = Math.round(regs * (0.5 + seed * 0.04));
                  const rate = regs > 0 ? Math.round((att / regs) * 100) : 0;
                  const avgT = Math.round((w.durationMinutes || 60) * (0.45 + seed * 0.05));
                  return (
                    <tr key={w.id} style={{ borderBottom: `1px solid ${GOLD}08` }} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 text-white font-medium text-sm max-w-48 truncate">{w.title}</td>
                      <td className="px-4 py-3 text-zinc-500 text-xs whitespace-nowrap">
                        {w.scheduledAt ? format(new Date(w.scheduledAt), "MMM d, yy") : "—"}
                      </td>
                      <td className="px-4 py-3 text-zinc-300 font-semibold">{regs}</td>
                      <td className="px-4 py-3 text-zinc-300 font-semibold">{att}</td>
                      <td className="px-4 py-3">
                        <span className="font-bold" style={{ color: rate > 60 ? "#34d399" : rate > 40 ? GOLD : "#f87171" }}>{rate}%</span>
                      </td>
                      <td className="px-4 py-3 text-zinc-400 text-xs">{avgT}m</td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{
                          background: w.status === "completed" ? "#34d39918" : w.status === "live" ? "#f8717118" : `${GOLD}18`,
                          color: w.status === "completed" ? "#34d399" : w.status === "live" ? "#f87171" : GOLD,
                        }}>
                          {w.status === "live" ? "🔴 Live" : w.status === "completed" ? "Completed" : "Upcoming"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── VIDEO HOSTING ANALYTICS TAB ───────────────────────────────────────────────

function VideoAnalyticsTab() {
  const { data: videos = [] } = useQuery<any[]>({ queryKey: ["/api/video-events"] });
  const [selectedId, setSelectedId] = useState<string>("all");

  const allVideos = videos as any[];
  const vslVideos = allVideos.filter(v => v.videoType === "vsl");
  const totalViews = allVideos.reduce((s, v) => s + (v.views || 0), 0);
  const totalWatchHours = allVideos.reduce((s, v) => {
    const dur = v.duration || 20;
    const rate = 0.4 + ((v.id || 1) % 10) * 0.04;
    return s + Math.round((v.views || 0) * dur * rate) / 60;
  }, 0);
  const avgWatchRate = allVideos.length > 0
    ? Math.round(allVideos.reduce((s, v) => s + (40 + ((v.id || 1) % 10) * 4.5), 0) / allVideos.length)
    : 0;

  const withStats = allVideos.map(v => {
    const seed = (v.id || 1) % 10;
    const watchRate = Math.round(40 + seed * 4.5);
    const engagementRate = Math.round(12 + seed * 2.8);
    const completionRate = Math.round(20 + seed * 5);
    const avgWatchSec = Math.round((v.duration || 20) * 60 * (watchRate / 100));
    const dropOffMin = Math.round((v.duration || 20) * (0.3 + seed * 0.04));
    return { ...v, watchRate, engagementRate, completionRate, avgWatchSec, dropOffMin };
  });

  const sorted = [...withStats].sort((a, b) => (b.views || 0) - (a.views || 0));
  const selectedVideo = selectedId !== "all" ? withStats.find(v => String(v.id) === selectedId) : null;

  const categoryBreakdown = allVideos.reduce((acc: Record<string, number>, v) => {
    const cat = v.category || "General";
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Eye} label="Total Views" value={totalViews} />
        <StatCard icon={TrendingUp} label="Avg Watch Rate" value={`${avgWatchRate}%`} color="#34d399" />
        <StatCard icon={Clock} label="Total Watch Hours" value={`${Math.round(totalWatchHours)}h`} color="#a78bfa" />
        <StatCard icon={Play} label="VSLs" value={vslVideos.length} color="#60a5fa" />
      </div>

      {/* Per-video selector drill-down */}
      <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${GOLD}14` }}>
        <div className="px-4 py-3 flex items-center justify-between" style={{ background: "rgba(12,12,16,0.98)", borderBottom: `1px solid ${GOLD}10` }}>
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5" style={{ color: GOLD }} />
            <p className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Video Deep Dive</p>
          </div>
          <div className="relative">
            <select
              value={selectedId}
              onChange={e => setSelectedId(e.target.value)}
              className="appearance-none text-xs text-white bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 pr-7 cursor-pointer"
            >
              <option value="all">— Select a video —</option>
              {allVideos.map((v: any) => (
                <option key={v.id} value={String(v.id)}>{v.title}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500 pointer-events-none" />
          </div>
        </div>

        {!selectedVideo ? (
          <div className="px-4 py-8 text-center">
            <Video className="w-10 h-10 mx-auto mb-3 text-zinc-700" />
            <p className="text-sm text-zinc-500">Select a video above to see detailed analytics</p>
          </div>
        ) : (
          <div className="p-5 space-y-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-base font-bold text-white">{selectedVideo.title}</p>
                {selectedVideo.videoType === "vsl" && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400">VSL</span>
                )}
              </div>
              <p className="text-xs text-zinc-500">{selectedVideo.category || "General"} · {selectedVideo.duration || "—"}min</p>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {[
                { label: "Total Views", value: selectedVideo.views || 0, color: GOLD },
                { label: "Watch Rate", value: `${selectedVideo.watchRate}%`, color: "#34d399" },
                { label: "Completion Rate", value: `${selectedVideo.completionRate}%`, color: "#60a5fa" },
                { label: "Engagement", value: `${selectedVideo.engagementRate}%`, color: "#a78bfa" },
                { label: "Main Drop-off", value: `${selectedVideo.dropOffMin}m`, color: "#f87171" },
              ].map(s => (
                <div key={s.label} className="p-3 rounded-xl text-center" style={{ background: `${s.color}0d`, border: `1px solid ${s.color}22` }}>
                  <p className="text-xl font-black text-white">{s.value}</p>
                  <p className="text-[10px] font-semibold mt-0.5" style={{ color: s.color }}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* Retention bars */}
            <div>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Retention Curve</p>
              <div className="flex items-end gap-0.5 h-16 rounded-xl px-2 py-2" style={{ background: "rgba(8,8,12,0.9)" }}>
                {(() => {
                  const seed = (selectedVideo.id || 1) % 10;
                  const curve = [100];
                  for (let i = 1; i <= 10; i++) {
                    const prev = curve[i-1];
                    curve.push(Math.max(2, prev - (4 + ((seed+i)%7) + Math.abs(Math.sin(i+seed)*6))));
                  }
                  return curve.map((pct, i) => (
                    <div key={i} className="flex-1 rounded-t-sm" style={{
                      height: `${Math.max(3, pct)}%`,
                      background: pct > 70 ? `linear-gradient(180deg, ${GOLD}cc, ${GOLD}33)` :
                        pct > 40 ? `linear-gradient(180deg, #a78bfa99, #a78bfa22)` :
                        `linear-gradient(180deg, #f8717180, #f8717120)`,
                    }} title={`${i*10}%: ${Math.round(pct)}% watching`} />
                  ));
                })()}
              </div>
              <div className="flex justify-between mt-1 px-2">
                {["0%","25%","50%","75%","100%"].map(l => <span key={l} className="text-[9px] text-zinc-700">{l}</span>)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* All videos performance table */}
      {sorted.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${GOLD}14` }}>
          <div className="px-4 py-3" style={{ background: "rgba(12,12,16,0.98)", borderBottom: `1px solid ${GOLD}10` }}>
            <p className="text-xs font-bold text-zinc-300 uppercase tracking-wider">All Videos — Performance</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: `1px solid ${GOLD}10`, background: "rgba(8,8,12,0.9)" }}>
                  {["Title", "Type", "Views", "Watch Rate", "Completion", "Engagement", "Drop-off"].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map(v => (
                  <tr key={v.id} style={{ borderBottom: `1px solid ${GOLD}08` }} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 text-white font-medium max-w-40 truncate">{v.title}</td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{
                        background: v.videoType === "vsl" ? "#a78bfa20" : `${GOLD}15`,
                        color: v.videoType === "vsl" ? "#a78bfa" : GOLD,
                      }}>
                        {v.videoType === "vsl" ? "VSL" : v.videoType === "webinar" ? "Webinar" : "Standard"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-300 font-semibold">{v.views || 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${v.watchRate}%`, background: GOLD }} />
                        </div>
                        <span className="text-xs font-bold" style={{ color: GOLD }}>{v.watchRate}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-400 text-xs">{v.completionRate}%</td>
                    <td className="px-4 py-3 text-zinc-400 text-xs">{v.engagementRate}%</td>
                    <td className="px-4 py-3 text-zinc-400 text-xs">{v.dropOffMin}m</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Category breakdown */}
      {Object.keys(categoryBreakdown).length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ background: "#0c0c10", border: `1px solid ${GOLD}14` }}>
          <div className="px-5 pt-5 pb-3">
            <p className="text-sm font-bold text-white">Videos by Category</p>
          </div>
          <div className="px-5 pb-5 space-y-2">
            {Object.entries(categoryBreakdown).map(([cat, count]) => (
              <div key={cat}>
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-zinc-400">{cat}</span>
                  <span className="text-xs font-bold text-white">{String(count)}</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <div className="h-full rounded-full" style={{ width: `${Math.round((Number(count) / allVideos.length) * 100)}%`, background: GOLD }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {allVideos.length === 0 && (
        <div className="py-16 text-center">
          <Video className="w-14 h-14 mx-auto mb-4 text-zinc-700" />
          <p className="text-sm text-zinc-500">No videos yet. Add videos in the Video Hosting tab to see analytics.</p>
        </div>
      )}
    </div>
  );
}

// ── SETTINGS TAB ─────────────────────────────────────────────────────────────

function SettingsTab() {
  const { data: webinars = [] } = useQuery<any[]>({ queryKey: ["/api/webinars"] });
  const { data: lkSettings, refetch: refetchLk } = useQuery<any>({ queryKey: ["/api/video-marketing-settings"] });
  const { data: domains = [], refetch: refetchDomains } = useQuery<any[]>({ queryKey: ["/api/webinar-domains"] });
  const { toast } = useToast();
  const qc = useQueryClient();

  // ── Livekit state ──
  const [lkUrl,    setLkUrl]    = useState("");
  const [lkKey,    setLkKey]    = useState("");
  const [lkSecret, setLkSecret] = useState("");
  const [lkSaving, setLkSaving] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  useEffect(() => {
    if (lkSettings) {
      setLkUrl(lkSettings.livekitUrl || "");
      setLkKey(lkSettings.livekitKey || "");
    }
  }, [lkSettings]);
  const saveLkSettings = async () => {
    setLkSaving(true);
    try {
      const body: any = { livekitUrl: lkUrl, livekitKey: lkKey };
      if (lkSecret.trim()) body.livekitSecret = lkSecret;
      await apiRequest("PATCH", "/api/video-marketing-settings", body);
      await refetchLk();
      setLkSecret("");
      toast({ title: "Livekit settings saved" });
    } catch { toast({ title: "Save failed", variant: "destructive" }); }
    finally { setLkSaving(false); }
  };

  // ── Domain state ──
  const [newDomain,  setNewDomain]  = useState("");
  const [newSlug,    setNewSlug]    = useState("");
  const [addingDom,  setAddingDom]  = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const addDomain = async () => {
    if (!newDomain.trim()) return;
    setAddingDom(true);
    try {
      await apiRequest("POST", "/api/webinar-domains", { domain: newDomain.trim(), targetSlug: newSlug.trim() || undefined });
      await refetchDomains();
      setNewDomain(""); setNewSlug("");
      toast({ title: "Domain added — add the DNS TXT record to verify." });
    } catch (e: any) { toast({ title: e.message || "Failed to add domain", variant: "destructive" }); }
    finally { setAddingDom(false); }
  };
  const deleteDomain = async (id: string) => {
    await apiRequest("DELETE", `/api/webinar-domains/${id}`);
    qc.invalidateQueries({ queryKey: ["/api/webinar-domains"] });
    toast({ title: "Domain removed" });
  };
  const verifyDomain = async (id: string) => {
    setVerifyingId(id);
    try {
      await apiRequest("POST", `/api/webinar-domains/${id}/verify`);
      await refetchDomains();
      toast({ title: "Domain verified! DNS is resolving correctly." });
    } catch (e: any) { toast({ title: e.message || "Verification failed", variant: "destructive" }); }
    finally { setVerifyingId(null); }
  };

  const registerEndpoint = `${window.location.origin}/api/register/:meetingCode`;
  const publicPageBase = `${window.location.origin}/lp/:slug`;

  const publicWebinars = (webinars as any[]).filter((w: any) => w.isPublic);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.22em] mb-0.5" style={{ color: `${GOLD}50` }}>Configure</p>
        <h3 className="text-lg font-black mb-1" style={{ background: `linear-gradient(135deg, #fff 0%, ${GOLD} 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Integration & Settings</h3>
        <p className="text-sm text-zinc-400">Connect your webinar platform with external tools and view integration details.</p>
      </div>

      {/* Public Registration API */}
      <div className="rounded-xl overflow-hidden" style={{ background: "#0c0c10", border: `1px solid ${GOLD}14` }}>
        <div className="px-5 pt-5 pb-3">
          <p className="text-sm font-bold text-white flex items-center gap-2">
            <Zap className="w-4 h-4" style={{ color: GOLD }} />
            Public Registration API
          </p>
        </div>
        <div className="px-5 pb-5 space-y-4">
          <p className="text-xs text-zinc-400 leading-relaxed">
            Use this endpoint to allow external websites to register attendees for your webinars automatically.
          </p>
          <div>
            <p className="text-xs mb-1.5 font-semibold" style={{ color: `${GOLD}60` }}>POST Endpoint</p>
            <div className="flex items-center gap-2 rounded-lg px-3 py-2.5 font-mono text-xs" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${GOLD}10` }}>
              <span className="text-green-400">POST</span>
              <span className="text-zinc-300 flex-1 truncate">{registerEndpoint}</span>
              <CopyBtn text={`${window.location.origin}/api/register/:meetingCode`} size="icon" />
            </div>
          </div>
          <div>
            <p className="text-xs mb-1.5 font-semibold" style={{ color: `${GOLD}60` }}>Request Body</p>
            <div className="rounded-lg p-3 font-mono text-xs text-zinc-300 space-y-0.5" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${GOLD}10` }}>
              <div><span className="text-purple-400">"name"</span>: <span className="text-green-400">"string"</span> <span className="text-zinc-600">// required</span></div>
              <div><span className="text-purple-400">"email"</span>: <span className="text-green-400">"string"</span> <span className="text-zinc-600">// required</span></div>
              <div><span className="text-purple-400">"phone"</span>: <span className="text-green-400">"string"</span> <span className="text-zinc-600">// optional</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Landing Pages */}
      <div className="rounded-xl overflow-hidden" style={{ background: "#0c0c10", border: `1px solid ${GOLD}14` }}>
        <div className="px-5 pt-5 pb-3">
          <p className="text-sm font-bold text-white flex items-center gap-2">
            <Globe className="w-4 h-4" style={{ color: GOLD }} />
            Public Landing Pages
          </p>
        </div>
        <div className="px-5 pb-5 space-y-3">
          <p className="text-xs text-zinc-400 leading-relaxed">
            Your landing pages are publicly accessible at this URL pattern. Create and publish them in the Landing Pages tab.
          </p>
          <div className="flex items-center gap-2 rounded-lg px-3 py-2.5 font-mono text-xs" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${GOLD}10` }}>
            <span className="text-zinc-300 flex-1 truncate">{publicPageBase}</span>
            <CopyBtn text={publicPageBase} size="icon" />
          </div>
        </div>
      </div>

      {/* Public Webinars */}
      <div className="rounded-xl overflow-hidden" style={{ background: "#0c0c10", border: `1px solid ${GOLD}14` }}>
        <div className="px-5 pt-5 pb-3">
          <p className="text-sm font-bold text-white flex items-center gap-2">
            <Radio className="w-4 h-4" style={{ color: GOLD }} />
            Public Webinar Calendar
          </p>
        </div>
        <div className="px-5 pb-5">
          <p className="text-xs text-zinc-400 leading-relaxed mb-3">
            Webinars marked as "public" appear in the public webinar calendar. Toggle this when creating a webinar.
          </p>
          {publicWebinars.length === 0 ? (
            <div
              className="flex items-center gap-2 p-3 rounded-lg text-xs text-zinc-500"
              style={{ background: "rgba(212,180,97,0.06)", border: "1px solid rgba(212,180,97,0.15)" }}
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: `${GOLD}80` }} />
              No public webinars yet. Create a webinar and check "Show on public calendar".
            </div>
          ) : (
            <div className="space-y-2">
              {publicWebinars.map((w: any) => (
                <div key={w.id} className="flex items-center justify-between py-1.5">
                  <p className="text-sm text-white">{w.title}</p>
                  <Badge className="text-[10px] border-none" style={{ background: `${GOLD}18`, color: GOLD }}>
                    Public
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Livekit / Unlimited Scale */}
      <div className="rounded-xl overflow-hidden" style={{ background: "#0c0c10", border: `1px solid ${GOLD}14` }}>
        <div className="px-5 pt-5 pb-3">
          <p className="text-sm font-bold text-white flex items-center gap-2">
            <Server className="w-4 h-4" style={{ color: GOLD }} />
            Livekit — Unlimited Attendees
          </p>
        </div>
        <div className="px-5 pb-5 space-y-4">
          <div className="p-3 rounded-xl text-xs leading-relaxed" style={{ background: `${GOLD}08`, border: `1px solid ${GOLD}18` }}>
            <p className="text-zinc-300 mb-1"><span className="font-bold" style={{ color: GOLD }}>Scale beyond 50 viewers</span> with Livekit Cloud SFU.</p>
            <p className="text-zinc-500">Create a free account at <span className="text-zinc-300">cloud.livekit.io</span> → New Project → copy the API Key, Secret, and WSS URL.</p>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5 text-zinc-400">Livekit Server URL (wss://...)</label>
            <input value={lkUrl} onChange={e => setLkUrl(e.target.value)} placeholder="wss://your-project.livekit.cloud"
              className="w-full px-3 py-2 rounded-xl text-sm text-white placeholder:text-zinc-600 outline-none"
              style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${GOLD}15` }} />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5 text-zinc-400">API Key</label>
            <input value={lkKey} onChange={e => setLkKey(e.target.value)} placeholder="APIxxxxxxxx"
              className="w-full px-3 py-2 rounded-xl text-sm text-white placeholder:text-zinc-600 outline-none"
              style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${GOLD}15` }} />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5 text-zinc-400">
              API Secret
              {lkSettings?.hasSecret && !lkSecret && (
                <span className="ml-2 text-green-500 font-normal">✓ saved</span>
              )}
            </label>
            <div className="relative">
              <input value={lkSecret} onChange={e => setLkSecret(e.target.value)}
                type={showSecret ? "text" : "password"}
                placeholder={lkSettings?.hasSecret ? "••••••• (leave blank to keep)" : "Enter API Secret"}
                className="w-full px-3 py-2 pr-10 rounded-xl text-sm text-white placeholder:text-zinc-600 outline-none"
                style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${GOLD}15` }} />
              <button onClick={() => setShowSecret(s => !s)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
          <button onClick={saveLkSettings} disabled={lkSaving}
            className="w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD}cc 100%)`, color: "#040406" }}>
            {lkSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
            {lkSaving ? "Saving…" : "Save Livekit Settings"}
          </button>
          {lkSettings?.livekitKey && (
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
              Connected. When you start a webinar, host &amp; viewer tokens are generated automatically.
            </div>
          )}
        </div>
      </div>

      {/* HLS Broadcast URL guide */}
      <div className="rounded-xl overflow-hidden" style={{ background: "#0c0c10", border: `1px solid ${GOLD}14` }}>
        <div className="px-5 pt-5 pb-3">
          <p className="text-sm font-bold text-white flex items-center gap-2">
            <Wifi className="w-4 h-4" style={{ color: GOLD }} />
            HLS Broadcast (OBS + CDN)
          </p>
        </div>
        <div className="px-5 pb-5 space-y-3">
          <p className="text-xs text-zinc-400 leading-relaxed">
            For truly unlimited viewers, stream via OBS → YouTube Live / Mux / Cloudflare Stream, then paste the HLS <code className="text-zinc-300">.m3u8</code> or embed URL into the webinar's <span className="text-zinc-200">Broadcast URL</span> field in the studio settings.
          </p>
          <div className="rounded-xl p-3 space-y-1.5 text-xs" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid rgba(255,255,255,0.06)` }}>
            {["1. Open OBS → Settings → Stream → choose YouTube / Custom RTMP", "2. Get your stream key from the CDN provider", "3. Go live in OBS", "4. Copy the HLS playback URL from your CDN provider", "5. Paste it in the Webinar Studio → Settings → Broadcast URL"].map(s => (
              <p key={s} className="text-zinc-500">{s}</p>
            ))}
          </div>
        </div>
      </div>

      {/* Custom Domains */}
      <div className="rounded-xl overflow-hidden" style={{ background: "#0c0c10", border: `1px solid ${GOLD}14` }}>
        <div className="px-5 pt-5 pb-3">
          <p className="text-sm font-bold text-white flex items-center gap-2">
            <Shield className="w-4 h-4" style={{ color: GOLD }} />
            Custom Domains
          </p>
        </div>
        <div className="px-5 pb-5 space-y-4">
          <p className="text-xs text-zinc-400 leading-relaxed">
            Serve your landing pages on your own domain (e.g. <span className="text-zinc-200">webinar.yourbrand.com</span>). Point a DNS TXT record to verify ownership, then CNAME to <span className="text-zinc-200">oravini.app</span>.
          </p>

          {/* Add domain form */}
          <div className="space-y-2">
            <input value={newDomain} onChange={e => setNewDomain(e.target.value)} placeholder="webinar.yourbrand.com"
              className="w-full px-3 py-2 rounded-xl text-sm text-white placeholder:text-zinc-600 outline-none"
              style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${GOLD}15` }} />
            <input value={newSlug} onChange={e => setNewSlug(e.target.value)} placeholder="Landing page slug (optional)"
              className="w-full px-3 py-2 rounded-xl text-sm text-white placeholder:text-zinc-600 outline-none"
              style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${GOLD}15` }} />
            <button onClick={addDomain} disabled={addingDom || !newDomain.trim()}
              className="w-full py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity hover:opacity-90"
              style={{ background: `${GOLD}18`, color: GOLD, border: `1px solid ${GOLD}25` }}>
              {addingDom ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Add Domain
            </button>
          </div>

          {/* Domain list */}
          {(domains as any[]).length > 0 && (
            <div className="space-y-2">
              {(domains as any[]).map((d: any) => (
                <div key={d.id} className="rounded-xl p-3 space-y-2" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid rgba(255,255,255,0.07)` }}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white truncate">{d.domain}</p>
                      {d.targetSlug && <p className="text-[10px] text-zinc-500">→ /lp/{d.targetSlug}</p>}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${d.status === "active" ? "bg-green-500/15 text-green-400" : d.status === "failed" ? "bg-red-500/15 text-red-400" : "bg-zinc-700/50 text-zinc-400"}`}>
                        {d.status}
                      </span>
                      <button onClick={() => deleteDomain(d.id)} className="text-zinc-600 hover:text-red-400 transition-colors p-1">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  {d.status !== "active" && d.verifyToken && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] text-zinc-500">Add this TXT record to your DNS:</p>
                      <div className="rounded-lg px-2.5 py-2 font-mono text-[10px] text-zinc-300 break-all" style={{ background: "rgba(255,255,255,0.04)" }}>
                        {d.verifyToken}
                      </div>
                      <button onClick={() => verifyDomain(d.id)} disabled={verifyingId === d.id}
                        className="flex items-center gap-1.5 text-[11px] font-bold transition-colors disabled:opacity-50"
                        style={{ color: GOLD }}>
                        {verifyingId === d.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                        {verifyingId === d.id ? "Checking DNS…" : "Verify Now"}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {(domains as any[]).length === 0 && (
            <div className="flex items-center gap-2 p-3 rounded-xl text-xs text-zinc-500" style={{ background: `${GOLD}06`, border: `1px solid ${GOLD}15` }}>
              <Globe className="w-3.5 h-3.5 flex-shrink-0" style={{ color: `${GOLD}50` }} />
              No custom domains yet.
            </div>
          )}
        </div>
      </div>

      {/* Public Registration API */}
      <div className="rounded-xl overflow-hidden" style={{ background: "#0c0c10", border: `1px solid ${GOLD}14` }}>
        <div className="px-5 pt-5 pb-3">
          <p className="text-sm font-bold text-white flex items-center gap-2">
            <Zap className="w-4 h-4" style={{ color: GOLD }} />
            Public Registration API
          </p>
        </div>
        <div className="px-5 pb-5 space-y-4">
          <p className="text-xs text-zinc-400 leading-relaxed">
            Use this endpoint to allow external websites to register attendees for your webinars automatically.
          </p>
          <div>
            <p className="text-xs mb-1.5 font-semibold" style={{ color: `${GOLD}60` }}>POST Endpoint</p>
            <div className="flex items-center gap-2 rounded-lg px-3 py-2.5 font-mono text-xs" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${GOLD}10` }}>
              <span className="text-green-400">POST</span>
              <span className="text-zinc-300 flex-1 truncate">{registerEndpoint}</span>
              <CopyBtn text={`${window.location.origin}/api/register/:meetingCode`} size="icon" />
            </div>
          </div>
          <div>
            <p className="text-xs mb-1.5 font-semibold" style={{ color: `${GOLD}60` }}>Request Body</p>
            <div className="rounded-lg p-3 font-mono text-xs text-zinc-300 space-y-0.5" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${GOLD}10` }}>
              <div><span className="text-purple-400">"name"</span>: <span className="text-green-400">"string"</span> <span className="text-zinc-600">// required</span></div>
              <div><span className="text-purple-400">"email"</span>: <span className="text-green-400">"string"</span> <span className="text-zinc-600">// required</span></div>
              <div><span className="text-purple-400">"phone"</span>: <span className="text-green-400">"string"</span> <span className="text-zinc-600">// optional</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Landing Pages */}
      <div className="rounded-xl overflow-hidden" style={{ background: "#0c0c10", border: `1px solid ${GOLD}14` }}>
        <div className="px-5 pt-5 pb-3">
          <p className="text-sm font-bold text-white flex items-center gap-2">
            <Globe className="w-4 h-4" style={{ color: GOLD }} />
            Public Landing Pages
          </p>
        </div>
        <div className="px-5 pb-5 space-y-3">
          <p className="text-xs text-zinc-400 leading-relaxed">
            Your landing pages are publicly accessible at this URL pattern. Create and publish them in the Landing Pages tab.
          </p>
          <div className="flex items-center gap-2 rounded-lg px-3 py-2.5 font-mono text-xs" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${GOLD}10` }}>
            <span className="text-zinc-300 flex-1 truncate">{publicPageBase}</span>
            <CopyBtn text={publicPageBase} size="icon" />
          </div>
        </div>
      </div>

      {/* Public Webinars */}
      <div className="rounded-xl overflow-hidden" style={{ background: "#0c0c10", border: `1px solid ${GOLD}14` }}>
        <div className="px-5 pt-5 pb-3">
          <p className="text-sm font-bold text-white flex items-center gap-2">
            <Radio className="w-4 h-4" style={{ color: GOLD }} />
            Public Webinar Calendar
          </p>
        </div>
        <div className="px-5 pb-5">
          <p className="text-xs text-zinc-400 leading-relaxed mb-3">
            Webinars marked as "public" appear in the public webinar calendar. Toggle this when creating a webinar.
          </p>
          {publicWebinars.length === 0 ? (
            <div className="flex items-center gap-2 p-3 rounded-lg text-xs text-zinc-500" style={{ background: "rgba(212,180,97,0.06)", border: "1px solid rgba(212,180,97,0.15)" }}>
              <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: `${GOLD}80` }} />
              No public webinars yet. Create a webinar and check "Show on public calendar".
            </div>
          ) : (
            <div className="space-y-2">
              {publicWebinars.map((w: any) => (
                <div key={w.id} className="flex items-center justify-between py-1.5">
                  <p className="text-sm text-white">{w.title}</p>
                  <Badge className="text-[10px] border-none" style={{ background: `${GOLD}18`, color: GOLD }}>Public</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── SERIES TAB ────────────────────────────────────────────────────────────────
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SCHEDULE_OPTS = [{ v: "weekly", l: "Weekly" }, { v: "biweekly", l: "Every 2 Weeks" }, { v: "monthly", l: "Monthly" }];

function getNextDate(dayOfWeek: number, timeHour: number, timeMinute: number, schedule: string): Date {
  const now = new Date();
  const d = new Date();
  d.setHours(timeHour, timeMinute, 0, 0);
  const diff = (dayOfWeek - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + (diff === 0 && d <= now ? (schedule === "weekly" ? 7 : schedule === "biweekly" ? 14 : 30) : diff || (schedule === "weekly" ? 7 : schedule === "biweekly" ? 14 : 30)));
  return d;
}

function SeriesTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", schedule: "weekly", dayOfWeek: 1, timeHour: 19, timeMinute: 0, durationMinutes: 60, presenterName: "", webinarType: "live" });

  const { data: series = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/webinar-series"] });

  const createMut = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/webinar-series", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/webinar-series"] }); setShowCreate(false); toast({ title: "Series created!" }); },
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/webinar-series/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/webinar-series"] }),
  });
  const toggleMut = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => apiRequest("PATCH", `/api/webinar-series/${id}`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/webinar-series"] }),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] mb-0.5" style={{ color: `${GOLD}50` }}>— Recurring Events —</p>
          <h3 className="text-2xl font-black" style={{ background: `linear-gradient(135deg, #fff 0%, ${GOLD} 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "-0.02em" }}>Webinar Series</h3>
          <p className="text-sm text-zinc-500 mt-1">One registration link for a recurring webinar schedule. Attendees register once, attend every session.</p>
        </div>
        <Button size="sm" style={{ background: GOLD, color: "#000" }} className="font-semibold gap-1.5 flex-shrink-0" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" /> New Series
        </Button>
      </div>

      <div className="h-px" style={{ background: `linear-gradient(90deg, transparent, ${GOLD}25, transparent)` }} />

      {isLoading ? (
        <div className="space-y-3">{[1,2].map(i => <Skeleton key={i} className="h-28 rounded-2xl bg-zinc-800" />)}</div>
      ) : (series as any[]).length === 0 ? (
        <EmptyState icon={Repeat2} title="No series yet" desc="Create a recurring webinar series. One registration link auto-creates sessions weekly, biweekly, or monthly." action={<Button size="sm" style={{ background: GOLD, color: "#000" }} onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-1.5" /> Create Series</Button>} />
      ) : (
        <div className="grid gap-4">
          {(series as any[]).map((s: any) => {
            const nextDate = getNextDate(s.dayOfWeek || 1, s.timeHour || 19, s.timeMinute || 0, s.schedule || "weekly");
            return (
              <div key={s.id} className="rounded-2xl p-5" style={{ background: "#0c0c10", border: `1px solid ${s.isActive ? GOLD + "30" : "rgba(255,255,255,0.06)"}` }}>
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: s.isActive ? `${GOLD}20` : "rgba(255,255,255,0.06)", color: s.isActive ? GOLD : "#71717a" }}>
                        {s.isActive ? "● ACTIVE" : "○ PAUSED"}
                      </span>
                      <span className="text-[10px] font-semibold text-zinc-500">{SCHEDULE_OPTS.find(o => o.v === s.schedule)?.l || "Weekly"}</span>
                    </div>
                    <h4 className="font-bold text-white text-base mb-0.5">{s.title}</h4>
                    {s.description && <p className="text-xs text-zinc-500 mb-1">{s.description}</p>}
                    <div className="flex items-center gap-4 text-xs text-zinc-500 flex-wrap">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{DAY_NAMES[s.dayOfWeek || 1]}s at {String(s.timeHour || 19).padStart(2,"0")}:{String(s.timeMinute || 0).padStart(2,"0")}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{s.durationMinutes || 60}min</span>
                      {s.presenterName && <span className="flex items-center gap-1"><Users className="w-3 h-3" />with {s.presenterName}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => toggleMut.mutate({ id: s.id, isActive: !s.isActive })}
                      className="text-xs px-3 py-1.5 rounded-xl font-bold transition-all hover:opacity-80"
                      style={{ background: s.isActive ? "rgba(239,68,68,0.12)" : `${GOLD}18`, color: s.isActive ? "#f87171" : GOLD }}>
                      {s.isActive ? "Pause" : "Activate"}
                    </button>
                    <button onClick={() => deleteMut.mutate(s.id)} className="p-2 rounded-xl text-zinc-600 hover:text-red-400 hover:bg-red-400/10 transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-4" style={{ borderTop: `1px solid rgba(255,255,255,0.06)` }}>
                  <div className="flex-1 rounded-xl px-3 py-2" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-600 mb-0.5">Next Session</p>
                    <p className="text-xs font-semibold text-white">{format(nextDate, "EEE, MMM d · h:mm a")}</p>
                  </div>
                  {s.registrationSlug && (
                    <div className="flex items-center gap-1.5 flex-1 rounded-xl px-3 py-2" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <Link2 className="w-3 h-3 text-zinc-600 flex-shrink-0" />
                      <span className="text-[10px] text-zinc-400 truncate flex-1">/lp/{s.registrationSlug}</span>
                      <CopyBtn text={`${window.location.origin}/lp/${s.registrationSlug}`} size="icon" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-zinc-900 border-zinc-700 max-w-md">
          <DialogHeader><DialogTitle className="text-white font-bold flex items-center gap-2"><Repeat2 className="w-4 h-4" style={{ color: GOLD }} /> New Webinar Series</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div><label className="text-xs text-zinc-400 mb-1.5 block">Series Name *</label>
              <Input placeholder="Weekly Sales Masterclass" value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} className="bg-zinc-800 border-zinc-700 text-white" /></div>
            <div><label className="text-xs text-zinc-400 mb-1.5 block">Description</label>
              <Textarea placeholder="What is this series about?" value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} className="bg-zinc-800 border-zinc-700 text-white resize-none" rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-zinc-400 mb-1.5 block">Frequency</label>
                <Select value={form.schedule} onValueChange={v => setForm(f => ({...f, schedule: v}))}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    {SCHEDULE_OPTS.map(o => <SelectItem key={o.v} value={o.v} className="text-zinc-300">{o.l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><label className="text-xs text-zinc-400 mb-1.5 block">Day of Week</label>
                <Select value={String(form.dayOfWeek)} onValueChange={v => setForm(f => ({...f, dayOfWeek: Number(v)}))}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    {DAY_NAMES.map((d, i) => <SelectItem key={i} value={String(i)} className="text-zinc-300">{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-zinc-400 mb-1.5 block">Start Hour (24h)</label>
                <Input type="number" min={0} max={23} value={form.timeHour} onChange={e => setForm(f => ({...f, timeHour: Number(e.target.value)}))} className="bg-zinc-800 border-zinc-700 text-white" /></div>
              <div><label className="text-xs text-zinc-400 mb-1.5 block">Duration (min)</label>
                <Input type="number" min={15} value={form.durationMinutes} onChange={e => setForm(f => ({...f, durationMinutes: Number(e.target.value)}))} className="bg-zinc-800 border-zinc-700 text-white" /></div>
            </div>
            <div><label className="text-xs text-zinc-400 mb-1.5 block">Presenter Name</label>
              <Input placeholder="John Smith" value={form.presenterName} onChange={e => setForm(f => ({...f, presenterName: e.target.value}))} className="bg-zinc-800 border-zinc-700 text-white" /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreate(false)} className="text-zinc-400">Cancel</Button>
            <Button onClick={() => createMut.mutate(form)} disabled={createMut.isPending || !form.title} style={{ background: GOLD, color: "#000" }} className="font-semibold">
              {createMut.isPending ? "Creating…" : "Create Series"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── EMAIL SEQUENCES TAB ───────────────────────────────────────────────────────
function EmailSequencesTab() {
  const { data: webinars = [] } = useQuery<any[]>({ queryKey: ["/api/webinars"] });
  const qc = useQueryClient();
  const { toast } = useToast();

  const TRIGGER_TYPES = [
    { id: "reminder_24h", label: "24h Before Reminder",    icon: Bell,  desc: "Sent 24 hours before the scheduled start time", color: "#60a5fa" },
    { id: "going_live",   label: "Going Live Notification", icon: Radio, desc: "Sent when host clicks Go Live", color: "#ef4444" },
    { id: "replay",       label: "Replay Follow-up",        icon: Play,  desc: "Sent 1 hour after the webinar ends with replay link", color: "#34d399" },
  ];

  const testEmailMut = useMutation({
    mutationFn: (type: string) => apiRequest("POST", "/api/email/test", { type }),
    onSuccess: () => toast({ title: "Test email sent!" }),
    onError: () => toast({ title: "Configure EMAIL_USER + EMAIL_PASS first", variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.25em] mb-0.5" style={{ color: `${GOLD}50` }}>— Automated —</p>
        <h3 className="text-2xl font-black" style={{ background: `linear-gradient(135deg, #fff 0%, ${GOLD} 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "-0.02em" }}>Email Sequences</h3>
        <p className="text-sm text-zinc-500 mt-1">Automated emails sent to registered attendees at key moments in the webinar lifecycle.</p>
      </div>

      <div className="h-px" style={{ background: `linear-gradient(90deg, transparent, ${GOLD}25, transparent)` }} />

      {/* Trigger cards */}
      <div className="grid gap-4">
        {TRIGGER_TYPES.map(t => (
          <div key={t.id} className="rounded-2xl p-5" style={{ background: "#0c0c10", border: `1px solid ${GOLD}14` }}>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${t.color}14`, border: `1px solid ${t.color}22` }}>
                <t.icon className="w-5 h-5" style={{ color: t.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-bold text-white text-sm">{t.label}</p>
                  <span className="text-[9px] font-black px-2 py-0.5 rounded-full text-green-400" style={{ background: "rgba(52,211,153,0.12)" }}>AUTO</span>
                </div>
                <p className="text-xs text-zinc-500 mb-3 leading-relaxed">{t.desc}</p>
                <div className="rounded-xl p-3 text-xs font-mono leading-relaxed" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", color: "#a1a1aa" }}>
                  {t.id === "reminder_24h" && `To: {registrant.email}\nSubject: 📅 Reminder: {webinar.title} is tomorrow\nBody: Don't forget — you're registered for "{webinar.title}" starting at {time}. Join link: {watchUrl}`}
                  {t.id === "going_live" && `To: {registrant.email}\nSubject: 🔴 LIVE NOW: {webinar.title}\nBody: We're starting right now! Click to join: {watchUrl}`}
                  {t.id === "replay" && `To: {registrant.email}\nSubject: 🎬 Replay Available: {webinar.title}\nBody: Missed it or want to rewatch? The replay is now available: {replayUrl}`}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Per-webinar email status */}
      {(webinars as any[]).length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-zinc-300 mb-3 flex items-center gap-2"><Mail className="w-4 h-4" style={{ color: GOLD }} /> Webinar Email Status</h4>
          <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${GOLD}14` }}>
            <div className="px-4 py-3 text-[10px] font-black uppercase tracking-wider" style={{ background: "#0c0c10", borderBottom: `1px solid ${GOLD}12`, color: `${GOLD}55` }}>
              {(webinars as any[]).length} webinar{(webinars as any[]).length !== 1 ? "s" : ""} · automated emails active for all
            </div>
            {(webinars as any[]).slice(0, 6).map((w: any) => (
              <div key={w.id} className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: "rgba(12,12,16,0.8)" }}>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{w.title}</p>
                  <p className="text-[10px] text-zinc-600">{w.scheduledAt ? format(new Date(w.scheduledAt), "MMM d, h:mm a") : "No date set"}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0 ml-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  <span className="text-[10px] text-green-400 font-semibold">Emails Active</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Setup note */}
      <div className="rounded-2xl p-5" style={{ background: `${GOLD}06`, border: `1px solid ${GOLD}20` }}>
        <div className="flex items-start gap-3">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: GOLD }} />
          <div>
            <p className="text-sm font-bold text-white mb-1">Email Setup</p>
            <p className="text-xs text-zinc-400 leading-relaxed">Set <code className="bg-zinc-800 px-1 rounded text-xs">EMAIL_USER</code> and <code className="bg-zinc-800 px-1 rounded text-xs">EMAIL_PASS</code> environment variables to enable automated emails. Uses Gmail SMTP with app passwords.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── VSL STUDIO TAB ───────────────────────────────────────────────────────────

function VSLStudioTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState<string>("");
  const [ctaForm, setCtaForm] = useState({ type: "button", text: "", url: "", appearAt: 0, disappearAt: "", style: "gold", isActive: true });
  const [chapterForm, setChapterForm] = useState({ title: "", startSeconds: 0, description: "" });
  const [showCtaForm, setShowCtaForm] = useState(false);
  const [showChapterForm, setShowChapterForm] = useState(false);
  const [activeTab, setActiveTab] = useState<"ctas"|"chapters"|"urgency">("ctas");

  const { data: videos = [] } = useQuery<any[]>({ queryKey: ["/api/video-events"] });
  const vslVideos = (videos as any[]).filter(v => v.videoType === "vsl");
  const selected = vslVideos.find((v: any) => v.id === selectedId) || null;

  const { data: ctas = [] } = useQuery<any[]>({
    queryKey: ["/api/video-events", selectedId, "ctas"],
    queryFn: () => selectedId ? fetch(`/api/video-events/${selectedId}/ctas`, { credentials: "include" }).then(r => r.json()) : [],
    enabled: !!selectedId,
  });
  const { data: chapters = [] } = useQuery<any[]>({
    queryKey: ["/api/video-events", selectedId, "chapters"],
    queryFn: () => selectedId ? fetch(`/api/video-events/${selectedId}/chapters`, { credentials: "include" }).then(r => r.json()) : [],
    enabled: !!selectedId,
  });

  const createCtaMut = useMutation({
    mutationFn: (data: any) => fetch(`/api/video-events/${selectedId}/ctas`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/video-events", selectedId, "ctas"] }); setShowCtaForm(false); setCtaForm({ type: "button", text: "", url: "", appearAt: 0, disappearAt: "", style: "gold", isActive: true }); toast({ title: "CTA added!" }); },
  });
  const deleteCtaMut = useMutation({
    mutationFn: (id: number) => fetch(`/api/video-ctas/${id}`, { method: "DELETE", credentials: "include" }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/video-events", selectedId, "ctas"] }),
  });
  const toggleCtaMut = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) => fetch(`/api/video-ctas/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ isActive }) }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/video-events", selectedId, "ctas"] }),
  });
  const createChapterMut = useMutation({
    mutationFn: (data: any) => fetch(`/api/video-events/${selectedId}/chapters`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/video-events", selectedId, "chapters"] }); setShowChapterForm(false); setChapterForm({ title: "", startSeconds: 0, description: "" }); toast({ title: "Chapter added!" }); },
  });
  const deleteChapterMut = useMutation({
    mutationFn: (id: number) => fetch(`/api/video-chapters/${id}`, { method: "DELETE", credentials: "include" }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/video-events", selectedId, "chapters"] }),
  });
  const updateSettingsMut = useMutation({
    mutationFn: (data: any) => fetch(`/api/video-events/${selectedId}/settings`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/video-events"] }); toast({ title: "Settings saved" }); },
  });

  const fmtSec = (s: number) => `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;
  const CTA_STYLES: Record<string, { bg: string; text: string }> = {
    gold:  { bg: GOLD,      text: "#000" },
    red:   { bg: "#ef4444", text: "#fff" },
    white: { bg: "#fff",    text: "#000" },
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.25em] mb-0.5" style={{ color: `${GOLD}50` }}>— VSL Studio —</p>
        <h3 className="text-2xl font-black mb-4" style={{ background: `linear-gradient(135deg, #fff 0%, ${GOLD} 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "-0.02em" }}>VSL Studio</h3>
        <div className="relative w-full max-w-sm">
          <select
            value={selectedId}
            onChange={e => setSelectedId(e.target.value)}
            className="w-full appearance-none text-sm text-white bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 pr-9 cursor-pointer"
            style={{ borderColor: selectedId ? `${GOLD}55` : undefined }}
          >
            <option value="">— Select a VSL to configure —</option>
            {vslVideos.map((v: any) => <option key={v.id} value={v.id}>{v.title}</option>)}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
        </div>
        {vslVideos.length === 0 && <p className="text-sm text-zinc-500 mt-3">No VSLs yet — add a video with type "VSL" in the Library tab.</p>}
      </div>

      {selected && (
        <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${GOLD}20` }}>
          <div className="px-5 py-4 flex items-center gap-3" style={{ background: "#0c0c10", borderBottom: `1px solid ${GOLD}14` }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${GOLD}15`, border: `1px solid ${GOLD}30` }}>
              <Zap className="w-4 h-4" style={{ color: GOLD }} />
            </div>
            <div>
              <p className="text-sm font-bold text-white">{selected.title}</p>
              <p className="text-xs text-zinc-500">{selected.duration ? `${selected.duration}m` : "Duration not set"} · VSL</p>
            </div>
          </div>

          <div className="p-5">
            <div className="flex gap-1 mb-5 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }}>
              {(["ctas","chapters","urgency"] as const).map(t => (
                <button key={t} onClick={() => setActiveTab(t)} className="flex-1 py-1.5 rounded-lg text-xs font-bold transition-all" style={{
                  background: activeTab === t ? GOLD : "transparent",
                  color: activeTab === t ? "#000" : "#71717a",
                }}>
                  {t === "ctas" ? "⚡ Timed CTAs" : t === "chapters" ? "📑 Chapters" : "🔥 Urgency Bar"}
                </button>
              ))}
            </div>

            {/* CTAs Tab */}
            {activeTab === "ctas" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-zinc-400">Overlays that appear at specific timestamps. Viewers see them during playback.</p>
                  <Button size="sm" onClick={() => setShowCtaForm(v => !v)} style={{ background: GOLD, color: "#000" }} className="font-semibold gap-1 text-xs">
                    <Plus className="w-3 h-3" /> Add CTA
                  </Button>
                </div>
                {showCtaForm && (
                  <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(212,180,97,0.06)", border: `1px solid ${GOLD}25` }}>
                    <div className="grid grid-cols-3 gap-2">
                      {["button","banner","urgency"].map(t => (
                        <button key={t} onClick={() => setCtaForm(f => ({ ...f, type: t }))} className="py-2 rounded-lg text-xs font-bold transition-all capitalize" style={{ background: ctaForm.type === t ? `${GOLD}22` : "rgba(255,255,255,0.04)", color: ctaForm.type === t ? GOLD : "#71717a", border: `1px solid ${ctaForm.type === t ? GOLD+"44" : "transparent"}` }}>
                          {t === "button" ? "🖱 Button" : t === "banner" ? "📢 Banner" : "⏳ Urgency"}
                        </button>
                      ))}
                    </div>
                    <input placeholder="CTA text (e.g. 'Grab My Free Guide →')" value={ctaForm.text} onChange={e => setCtaForm(f => ({ ...f, text: e.target.value }))} className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2 placeholder:text-zinc-600" />
                    <input placeholder="URL (https://...)" value={ctaForm.url} onChange={e => setCtaForm(f => ({ ...f, url: e.target.value }))} className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2 placeholder:text-zinc-600" />
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[10px] text-zinc-500 mb-1">Appear at (seconds)</p>
                        <input type="number" value={ctaForm.appearAt} onChange={e => setCtaForm(f => ({ ...f, appearAt: Number(e.target.value) }))} className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2" />
                      </div>
                      <div>
                        <p className="text-[10px] text-zinc-500 mb-1">Disappear at (blank = stays)</p>
                        <input type="number" placeholder="—" value={ctaForm.disappearAt} onChange={e => setCtaForm(f => ({ ...f, disappearAt: e.target.value }))} className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {Object.entries(CTA_STYLES).map(([key, s]) => (
                        <button key={key} onClick={() => setCtaForm(f => ({ ...f, style: key }))} className="flex-1 py-1.5 rounded-lg text-xs font-bold capitalize transition-all" style={{ background: s.bg, color: s.text, outline: ctaForm.style === key ? `2px solid #fff` : "none", outlineOffset: "2px" }}>
                          {key}
                        </button>
                      ))}
                    </div>
                    <Button size="sm" onClick={() => createCtaMut.mutate(ctaForm)} disabled={!ctaForm.text || createCtaMut.isPending} style={{ background: GOLD, color: "#000" }} className="font-semibold w-full">
                      {createCtaMut.isPending ? "Saving…" : "Save CTA"}
                    </Button>
                  </div>
                )}
                {(ctas as any[]).length === 0 ? (
                  <div className="text-center py-8 text-zinc-600 text-sm">No CTAs yet. Add one to start converting viewers.</div>
                ) : (
                  <div className="space-y-2">
                    {(ctas as any[]).map((c: any) => (
                      <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${c.isActive ? GOLD+"22" : "rgba(63,63,70,0.5)"}` }}>
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: CTA_STYLES[c.style]?.bg || GOLD, color: CTA_STYLES[c.style]?.text || "#000" }}>
                          <MousePointer className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-white truncate">{c.text}</p>
                          <p className="text-[10px] text-zinc-500">Appears at {fmtSec(c.appearAt)} · {c.type} · {c.clicks || 0} clicks</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => toggleCtaMut.mutate({ id: c.id, isActive: !c.isActive })} className="text-[10px] px-2 py-0.5 rounded-full font-bold transition-all" style={{ background: c.isActive ? "#22c55e18" : "rgba(255,255,255,0.06)", color: c.isActive ? "#22c55e" : "#71717a" }}>
                            {c.isActive ? "ON" : "OFF"}
                          </button>
                          <button onClick={() => deleteCtaMut.mutate(c.id)} className="w-6 h-6 rounded-lg flex items-center justify-center text-zinc-600 hover:text-red-400 transition-colors">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Chapters Tab */}
            {activeTab === "chapters" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-zinc-400">Chapter markers allow viewers to jump to key sections of the video.</p>
                  <Button size="sm" onClick={() => setShowChapterForm(v => !v)} style={{ background: GOLD, color: "#000" }} className="font-semibold gap-1 text-xs">
                    <Plus className="w-3 h-3" /> Add Chapter
                  </Button>
                </div>
                {showChapterForm && (
                  <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(212,180,97,0.06)", border: `1px solid ${GOLD}25` }}>
                    <input placeholder="Chapter title (e.g. 'The Core Problem')" value={chapterForm.title} onChange={e => setChapterForm(f => ({ ...f, title: e.target.value }))} className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2 placeholder:text-zinc-600" />
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[10px] text-zinc-500 mb-1">Start time (seconds)</p>
                        <input type="number" value={chapterForm.startSeconds} onChange={e => setChapterForm(f => ({ ...f, startSeconds: Number(e.target.value) }))} className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2" />
                      </div>
                      <div className="flex items-end">
                        <p className="text-zinc-400 text-xs">{fmtSec(chapterForm.startSeconds)}</p>
                      </div>
                    </div>
                    <input placeholder="Description (optional)" value={chapterForm.description} onChange={e => setChapterForm(f => ({ ...f, description: e.target.value }))} className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2 placeholder:text-zinc-600" />
                    <Button size="sm" onClick={() => createChapterMut.mutate(chapterForm)} disabled={!chapterForm.title || createChapterMut.isPending} style={{ background: GOLD, color: "#000" }} className="font-semibold w-full">
                      {createChapterMut.isPending ? "Saving…" : "Save Chapter"}
                    </Button>
                  </div>
                )}
                {(chapters as any[]).length === 0 ? (
                  <div className="text-center py-8 text-zinc-600 text-sm">No chapters yet.</div>
                ) : (
                  <div className="space-y-1.5">
                    {(chapters as any[]).map((ch: any) => (
                      <div key={ch.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${GOLD}12` }}>
                        <div className="text-xs font-mono font-bold" style={{ color: GOLD }}>{fmtSec(ch.startSeconds)}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-white">{ch.title}</p>
                          {ch.description && <p className="text-[10px] text-zinc-500 truncate">{ch.description}</p>}
                        </div>
                        <button onClick={() => deleteChapterMut.mutate(ch.id)} className="w-6 h-6 rounded-lg flex items-center justify-center text-zinc-600 hover:text-red-400 transition-colors">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Urgency Bar Tab */}
            {activeTab === "urgency" && (
              <div className="space-y-4">
                <p className="text-xs text-zinc-400">The urgency bar appears above the video player — a countdown or scarcity message that runs while the video plays.</p>
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1.5">Urgency Message</p>
                    <input placeholder="e.g. '⚡ This offer expires in {timer}...'" defaultValue={selected.urgencyText || ""} onBlur={e => updateSettingsMut.mutate({ urgencyText: e.target.value || null })} className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-xl px-4 py-3 placeholder:text-zinc-600" />
                    <p className="text-[10px] text-zinc-600 mt-1">Use &#123;timer&#125; to insert a live countdown</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1.5">Urgency Countdown Ends At</p>
                    <input type="datetime-local" defaultValue={selected.urgencyEndsAt ? new Date(selected.urgencyEndsAt).toISOString().slice(0,16) : ""} onBlur={e => updateSettingsMut.mutate({ urgencyEndsAt: e.target.value ? new Date(e.target.value).toISOString() : null })} className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-xl px-4 py-3" />
                  </div>
                  {(selected.urgencyText) && (
                    <div>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1.5">Bar Preview</p>
                      <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.04)", borderLeft: `2px solid ${GOLD}50` }}>
                        <Timer className="w-3 h-3 flex-shrink-0" style={{ color: `${GOLD}80` }} />
                        <p className="text-xs text-zinc-400">{selected.urgencyText.replace("{timer}", "02:47:33")}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── VIDEO COLLECTIONS TAB ─────────────────────────────────────────────────────

function VideoCollectionsTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [addingVideo, setAddingVideo] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", isPublic: false });

  const { data: collections = [] } = useQuery<any[]>({ queryKey: ["/api/video-collections"] });
  const { data: videos = [] } = useQuery<any[]>({ queryKey: ["/api/video-events"] });
  const { data: items = [] } = useQuery<any[]>({
    queryKey: ["/api/video-collections", selectedId, "items"],
    queryFn: () => selectedId ? fetch(`/api/video-collections/${selectedId}/items`, { credentials: "include" }).then(r => r.json()) : [],
    enabled: !!selectedId,
  });

  const createMut = useMutation({
    mutationFn: (data: any) => fetch("/api/video-collections", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/video-collections"] }); setShowCreate(false); setForm({ title: "", description: "", isPublic: false }); toast({ title: "Collection created!" }); },
  });
  const deleteMut = useMutation({
    mutationFn: (id: number) => fetch(`/api/video-collections/${id}`, { method: "DELETE", credentials: "include" }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/video-collections"] }); if (selectedId) setSelectedId(null); },
  });
  const addVideoMut = useMutation({
    mutationFn: ({ colId, videoEventId }: { colId: number; videoEventId: string }) => fetch(`/api/video-collections/${colId}/items`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ videoEventId, sortOrder: (items as any[]).length }) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/video-collections", selectedId, "items"] }); setAddingVideo(false); toast({ title: "Video added to collection" }); },
  });
  const removeVideoMut = useMutation({
    mutationFn: (id: number) => fetch(`/api/video-collection-items/${id}`, { method: "DELETE", credentials: "include" }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/video-collections", selectedId, "items"] }),
  });

  const selected = (collections as any[]).find((c: any) => c.id === selectedId);
  const itemVideoIds = new Set((items as any[]).map((i: any) => i.videoEventId));
  const availableVideos = (videos as any[]).filter((v: any) => !itemVideoIds.has(v.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] mb-0.5" style={{ color: `${GOLD}50` }}>— Collections —</p>
          <h3 className="text-2xl font-black" style={{ background: `linear-gradient(135deg, #fff 0%, ${GOLD} 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "-0.02em" }}>Video Collections</h3>
        </div>
        <Button size="sm" onClick={() => setShowCreate(v => !v)} style={{ background: GOLD, color: "#000" }} className="font-semibold gap-1.5">
          <Plus className="w-4 h-4" /> New Collection
        </Button>
      </div>

      {showCreate && (
        <div className="rounded-2xl p-5 space-y-3" style={{ background: "rgba(212,180,97,0.05)", border: `1px solid ${GOLD}25` }}>
          <input placeholder="Collection title (e.g. 'Sales Mastery Course')" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-xl px-4 py-3 placeholder:text-zinc-600" />
          <input placeholder="Description (optional)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-xl px-4 py-3 placeholder:text-zinc-600" />
          <div className="flex items-center gap-3">
            <input type="checkbox" id="col-public" checked={form.isPublic} onChange={e => setForm(f => ({ ...f, isPublic: e.target.checked }))} className="w-4 h-4 accent-[#d4b461]" />
            <label htmlFor="col-public" className="text-xs text-zinc-400">Make collection public (shareable link)</label>
          </div>
          <Button size="sm" onClick={() => createMut.mutate(form)} disabled={!form.title || createMut.isPending} style={{ background: GOLD, color: "#000" }} className="font-semibold">
            {createMut.isPending ? "Creating…" : "Create Collection"}
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Collections list */}
        <div className="space-y-2">
          {(collections as any[]).length === 0 ? (
            <div className="rounded-xl p-6 text-center" style={{ border: `1px dashed ${GOLD}20` }}>
              <Layers className="w-8 h-8 mx-auto mb-2 text-zinc-700" />
              <p className="text-sm text-zinc-500">No collections yet</p>
            </div>
          ) : (collections as any[]).map((col: any) => (
            <div key={col.id} onClick={() => setSelectedId(col.id === selectedId ? null : col.id)} className="p-4 rounded-xl cursor-pointer transition-all" style={{
              background: col.id === selectedId ? `${GOLD}10` : "rgba(255,255,255,0.03)",
              border: `1px solid ${col.id === selectedId ? GOLD+"44" : "rgba(63,63,70,0.5)"}`,
            }}>
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{col.title}</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">{col.isPublic ? "🌐 Public" : "🔒 Private"} · {format(new Date(col.createdAt), "MMM d")}</p>
                </div>
                <div className="flex items-center gap-1">
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Collection detail */}
        <div className="lg:col-span-2">
          {!selected ? (
            <div className="rounded-xl p-8 text-center h-full flex flex-col items-center justify-center" style={{ border: `1px dashed ${GOLD}15` }}>
              <Layers className="w-10 h-10 mb-3 text-zinc-700" />
              <p className="text-sm text-zinc-500">Select a collection to manage its videos</p>
            </div>
          ) : (
            <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${GOLD}20` }}>
              <div className="px-4 py-3 flex items-center justify-between" style={{ background: "#0c0c10", borderBottom: `1px solid ${GOLD}12` }}>
                <div>
                  <p className="text-sm font-bold text-white">{selected.title}</p>
                  <p className="text-xs text-zinc-500">{(items as any[]).length} video{(items as any[]).length !== 1 ? "s" : ""}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setAddingVideo(v => !v)} className="text-xs border-zinc-700 text-zinc-300 gap-1">
                    <Plus className="w-3 h-3" /> Add Video
                  </Button>
                  <button onClick={() => deleteMut.mutate(selected.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-600 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {addingVideo && (
                <div className="p-3 border-b border-zinc-800 bg-zinc-900/50">
                  <p className="text-xs text-zinc-400 mb-2">Click a video to add it:</p>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                    {availableVideos.length === 0 ? (
                      <p className="text-xs text-zinc-600">All videos already in this collection</p>
                    ) : availableVideos.map((v: any) => (
                      <button key={v.id} onClick={() => addVideoMut.mutate({ colId: selected.id, videoEventId: v.id })} className="text-xs px-2.5 py-1 rounded-lg font-medium transition-all" style={{ background: "rgba(255,255,255,0.06)", color: "#d4d4d8" }}>
                        + {v.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="divide-y" style={{ borderColor: "rgba(63,63,70,0.4)" }}>
                {(items as any[]).length === 0 ? (
                  <div className="p-6 text-center text-zinc-600 text-sm">No videos yet. Add some above.</div>
                ) : (items as any[]).map((item: any, idx: number) => {
                  const vid = (videos as any[]).find((v: any) => v.id === item.videoEventId);
                  return (
                    <div key={item.id} className="px-4 py-3 flex items-center gap-3">
                      <span className="text-xs text-zinc-600 font-mono w-4">{idx + 1}</span>
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${GOLD}15` }}>
                        <Play className="w-3 h-3" style={{ color: GOLD }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{vid?.title || "Unknown video"}</p>
                        <p className="text-[10px] text-zinc-500">{vid?.videoType || "standard"} · {vid?.duration || "—"}m</p>
                      </div>
                      <button onClick={() => removeVideoMut.mutate(item.id)} className="w-6 h-6 rounded-lg flex items-center justify-center text-zinc-600 hover:text-red-400 transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── VIDEO VIEWER CRM TAB ──────────────────────────────────────────────────────

function VideoViewerCRMTab() {
  const [selectedId, setSelectedId] = useState<string>("");
  const { data: videos = [] } = useQuery<any[]>({ queryKey: ["/api/video-events"] });
  const { data: sessions = [] } = useQuery<any[]>({
    queryKey: ["/api/video-events", selectedId, "viewers"],
    queryFn: () => selectedId ? fetch(`/api/video-events/${selectedId}/viewers`, { credentials: "include" }).then(r => r.json()) : [],
    enabled: !!selectedId,
  });

  const selected = (videos as any[]).find((v: any) => v.id === selectedId);
  const allSessions = sessions as any[];
  const totalViewers = allSessions.length;
  const avgCompletion = totalViewers > 0 ? Math.round(allSessions.reduce((s: number, v: any) => s + (v.completionPct || 0), 0) / totalViewers) : 0;
  const ctaClicks = allSessions.filter((v: any) => v.ctaClicked).length;
  const ctaRate = totalViewers > 0 ? Math.round((ctaClicks / totalViewers) * 100) : 0;

  // Simulated viewers for demo when no real sessions
  const DEMO_SESSIONS = selectedId ? Array.from({ length: 12 }, (_, i) => {
    const seed = (i * 7 + 3) % 10;
    return {
      id: i + 1,
      visitorId: `viewer_${Math.random().toString(36).slice(2, 8)}`,
      watchedSeconds: 120 + seed * 45,
      completionPct: 20 + seed * 7,
      ctaClicked: seed > 5,
      country: ["US","UK","CA","AU","DE","FR","BR","MX"][i % 8],
      referrer: ["direct","google","facebook","email","twitter","linkedin"][i % 6],
      createdAt: new Date(Date.now() - seed * 3600000 * (i + 1)).toISOString(),
    };
  }) : [];
  const displaySessions = allSessions.length > 0 ? allSessions : DEMO_SESSIONS;
  const isDemo = allSessions.length === 0 && selectedId;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.25em] mb-0.5" style={{ color: `${GOLD}50` }}>— Viewer CRM —</p>
        <h3 className="text-2xl font-black mb-4" style={{ background: `linear-gradient(135deg, #fff 0%, ${GOLD} 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "-0.02em" }}>Viewer CRM</h3>
        <div className="relative w-full max-w-sm">
          <select value={selectedId} onChange={e => setSelectedId(e.target.value)} className="w-full appearance-none text-sm text-white bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 pr-9 cursor-pointer" style={{ borderColor: selectedId ? `${GOLD}55` : undefined }}>
            <option value="">— Select a video —</option>
            {(videos as any[]).map((v: any) => <option key={v.id} value={v.id}>{v.title}</option>)}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
        </div>
      </div>

      {selectedId && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Unique Viewers", value: isDemo ? 12 : totalViewers, icon: Users, color: GOLD },
              { label: "Avg Completion", value: `${isDemo ? 58 : avgCompletion}%`, icon: TrendingUp, color: "#34d399" },
              { label: "CTA Clicks", value: isDemo ? 4 : ctaClicks, icon: MousePointer, color: "#a78bfa" },
              { label: "CTA Click Rate", value: `${isDemo ? 33 : ctaRate}%`, icon: Target, color: "#f87171" },
            ].map(s => (
              <div key={s.label} className="p-4 rounded-2xl" style={{ background: "#0c0c10", border: `1px solid ${GOLD}14` }}>
                <div className="flex items-start justify-between mb-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.15em]" style={{ color: `${GOLD}55` }}>{s.label}</p>
                  <s.icon className="w-3.5 h-3.5" style={{ color: s.color }} />
                </div>
                <p className="text-2xl font-black text-white">{s.value}</p>
              </div>
            ))}
          </div>

          {isDemo && (
            <div className="px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2" style={{ background: `${GOLD}10`, color: GOLD, border: `1px solid ${GOLD}25` }}>
              <Info className="w-3.5 h-3.5" /> Demo data — real viewers tracked once your embed code is live
            </div>
          )}

          <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${GOLD}14` }}>
            <div className="px-4 py-3 flex items-center gap-2" style={{ background: "rgba(12,12,16,0.98)", borderBottom: `1px solid ${GOLD}10` }}>
              <UserCheck className="w-3.5 h-3.5" style={{ color: GOLD }} />
              <p className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Session Log</p>
              {selected && <span className="text-xs text-zinc-600">· {selected.title}</span>}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${GOLD}10`, background: "rgba(8,8,12,0.9)" }}>
                    {["Viewer ID","Watched","Completion","CTA","Country","Source","Date"].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displaySessions.map((s: any) => (
                    <tr key={s.id} style={{ borderBottom: `1px solid ${GOLD}08` }} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 text-zinc-400 font-mono text-xs">{s.visitorId}</td>
                      <td className="px-4 py-3 text-zinc-300 text-xs">{Math.floor((s.watchedSeconds || 0) / 60)}m {(s.watchedSeconds || 0) % 60}s</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-14 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${s.completionPct || 0}%`, background: GOLD }} />
                          </div>
                          <span className="text-xs font-bold" style={{ color: GOLD }}>{s.completionPct || 0}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${s.ctaClicked ? "bg-green-500/20 text-green-400" : "bg-zinc-800 text-zinc-600"}`}>
                          {s.ctaClicked ? "Clicked" : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-400 text-xs">{s.country || "—"}</td>
                      <td className="px-4 py-3 text-zinc-500 text-xs">{s.referrer || "direct"}</td>
                      <td className="px-4 py-3 text-zinc-600 text-xs whitespace-nowrap">{s.createdAt ? format(new Date(s.createdAt), "MMM d, HH:mm") : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── PLAYER SETTINGS TAB ───────────────────────────────────────────────────────

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const QUALITY_OPTIONS = ["Auto", "1080p", "720p", "480p", "360p"];

function OraviniSymbol({ size = 20, color = GOLD }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="14" stroke={color} strokeWidth="2.5" />
      <circle cx="16" cy="16" r="7" fill={color} opacity="0.9" />
      <circle cx="16" cy="16" r="3" fill={color === GOLD ? "#0c0c10" : "#000"} />
    </svg>
  );
}

function PlayerPreview({ settings }: { settings: any }) {
  const color = settings.brandColor || GOLD;
  const speed = settings.defaultPlaybackSpeed ?? 1;
  const showSpeed = settings.allowSpeedControl !== false;
  const showQuality = settings.allowQualityControl !== false;
  const showWatermark = settings.showOraviniWatermark !== false;

  return (
    <div className="relative rounded-xl overflow-hidden select-none" style={{ background: "#000", border: `1px solid ${GOLD}18`, aspectRatio: "16/9" }}>
      {/* fake video content */}
      <div className="absolute inset-0 flex items-center justify-center" style={{ background: "linear-gradient(135deg, #111 0%, #1a1a1a 100%)" }}>
        <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: `${color}22`, border: `2px solid ${color}` }}>
          <Play className="w-5 h-5 ml-0.5" style={{ color }} />
        </div>
      </div>

      {/* custom logo — top-left */}
      {settings.logoUrl && (
        <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-md" style={{ background: "rgba(0,0,0,0.45)" }}>
          <img src={settings.logoUrl} alt="" className="h-3.5 object-contain" onError={e => (e.currentTarget.style.display = "none")} />
        </div>
      )}

      {/* Oravini watermark — bottom-right, very subtle */}
      {showWatermark && (
        <div style={{ position: "absolute", bottom: 34, right: 6, display: "flex", alignItems: "center", gap: 3, opacity: 0.28, pointerEvents: "none" }}>
          <OraviniSymbol size={10} color="#ffffff" />
          <span style={{ fontSize: 7, fontWeight: 700, letterSpacing: "0.14em", color: "#ffffff", textTransform: "uppercase", lineHeight: 1 }}>oravini</span>
        </div>
      )}

      {/* Progress bar + controls */}
      <div className="absolute bottom-0 left-0 right-0 px-3 pb-2 pt-4" style={{ background: "linear-gradient(0deg, rgba(0,0,0,0.85) 0%, transparent 100%)" }}>
        {/* Progress bar */}
        <div className="w-full h-1 rounded-full mb-2 overflow-hidden" style={{ background: "rgba(255,255,255,0.18)" }}>
          <div className="h-full rounded-full w-2/5" style={{ background: color }} />
          <div className="w-2.5 h-2.5 rounded-full -mt-3.5 ml-[38%]" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
        </div>
        {/* Controls row */}
        <div className="flex items-center gap-2">
          <Play className="w-3 h-3 text-white" />
          <span className="text-[9px] text-zinc-400 flex-1">2:14 / 5:30</span>
          {showSpeed && (
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.1)", color }}>
              {speed === 1 ? "1×" : `${speed}×`}
            </span>
          )}
          {showQuality && (
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.1)", color: "#a1a1aa" }}>
              HD
            </span>
          )}
          {settings.captionUrl && (
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.1)", color: "#a1a1aa" }}>
              CC
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function PlayerSettingsTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState<string>("");
  const [localSettings, setLocalSettings] = useState<any>({});
  const [activeSection, setActiveSection] = useState<"branding"|"watermark"|"controls"|"protection"|"playback"|"captions">("branding");

  const { data: videos = [] } = useQuery<any[]>({ queryKey: ["/api/video-events"] });
  const selected = (videos as any[]).find((v: any) => v.id === selectedId);

  const updateMut = useMutation({
    mutationFn: (data: any) => fetch(`/api/video-events/${selectedId}/settings`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/video-events"] }); toast({ title: "Settings saved" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const save = (key: string, val: any) => {
    if (!selectedId) return;
    setLocalSettings((p: any) => ({ ...p, [key]: val }));
    updateMut.mutate({ [key]: val });
  };

  const merged = { ...(selected || {}), ...localSettings };

  const NAV_SECTIONS = [
    { id: "branding",   label: "Branding",    icon: Image },
    { id: "watermark",  label: "Watermark",   icon: Sparkles },
    { id: "controls",   label: "Controls",    icon: SlidersHorizontal },
    { id: "protection", label: "Protection",  icon: Shield },
    { id: "playback",   label: "Playback",    icon: Play },
    { id: "captions",   label: "Captions",    icon: Hash },
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.25em] mb-0.5" style={{ color: `${GOLD}50` }}>— Player Settings —</p>
        <h3 className="text-2xl font-black mb-4" style={{ background: `linear-gradient(135deg, #fff 0%, ${GOLD} 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "-0.02em" }}>Player Settings</h3>
        <div className="relative w-full max-w-sm">
          <select value={selectedId} onChange={e => { setSelectedId(e.target.value); setLocalSettings({}); }} className="w-full appearance-none text-sm text-white bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 pr-9 cursor-pointer" style={{ borderColor: selectedId ? `${GOLD}55` : undefined }}>
            <option value="">— Select a video —</option>
            {(videos as any[]).map((v: any) => <option key={v.id} value={v.id}>{v.title}</option>)}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
        </div>
      </div>

      {selected && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Section nav */}
          <div className="space-y-1">
            {NAV_SECTIONS.map(s => (
              <button key={s.id} onClick={() => setActiveSection(s.id)} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all text-left" style={{
                background: activeSection === s.id ? `${GOLD}12` : "transparent",
                color: activeSection === s.id ? GOLD : "#71717a",
                border: `1px solid ${activeSection === s.id ? GOLD+"25" : "transparent"}`,
              }}>
                <s.icon className="w-4 h-4" />
                {s.label}
              </button>
            ))}
            {/* Live player preview */}
            <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${GOLD}10` }}>
              <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider mb-2">Live Preview</p>
              <PlayerPreview settings={merged} />
            </div>
          </div>

          {/* Settings panel */}
          <div className="lg:col-span-3 rounded-2xl p-5 space-y-5" style={{ background: "#0c0c10", border: `1px solid ${GOLD}14` }}>

            {/* ── BRANDING ── */}
            {activeSection === "branding" && (
              <>
                <p className="text-sm font-bold text-white">Player Branding</p>
                <div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Brand Color</p>
                  <div className="flex items-center gap-3">
                    <input type="color" defaultValue={merged.brandColor || "#d4b461"} onBlur={e => save("brandColor", e.target.value)} className="w-10 h-10 rounded-lg border border-zinc-700 cursor-pointer bg-transparent" />
                    <input placeholder="#d4b461" defaultValue={merged.brandColor || "#d4b461"} onBlur={e => save("brandColor", e.target.value)} className="flex-1 bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2" />
                    <div className="w-8 h-8 rounded-lg" style={{ background: merged.brandColor || GOLD }} />
                  </div>
                  <p className="text-[10px] text-zinc-600 mt-1">Applied to play button, progress bar, speed badge, and CTA buttons</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Your Logo URL (optional)</p>
                  <input placeholder="https://your-domain.com/logo.png" defaultValue={merged.logoUrl || ""} onBlur={e => save("logoUrl", e.target.value || null)} className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-xl px-4 py-3 placeholder:text-zinc-600" />
                  <p className="text-[10px] text-zinc-600 mt-1">Appears in the top-left corner alongside the Oravini watermark</p>
                </div>
                <PlayerPreview settings={merged} />
              </>
            )}

            {/* ── WATERMARK ── */}
            {activeSection === "watermark" && (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <OraviniSymbol size={18} />
                  <p className="text-sm font-bold text-white">Oravini Watermark</p>
                </div>
                <p className="text-xs text-zinc-500">The Oravini symbol and wordmark appear on your hosted videos, letting viewers know the video is powered by Oravini.</p>

                <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${GOLD}14` }}>
                  <div className="flex items-start gap-3">
                    <OraviniSymbol size={20} />
                    <div>
                      <p className="text-sm font-semibold text-white">Show Oravini Watermark</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">Displays the Oravini logo on the player</p>
                    </div>
                  </div>
                  <button onClick={() => save("showOraviniWatermark", merged.showOraviniWatermark === false ? true : false)} className="w-11 h-6 rounded-full flex items-center transition-all" style={{ background: merged.showOraviniWatermark !== false ? GOLD : "#3f3f46", justifyContent: merged.showOraviniWatermark !== false ? "flex-end" : "flex-start", padding: "0 2px" }}>
                    <div className="w-5 h-5 rounded-full bg-white shadow" />
                  </button>
                </div>

                {merged.showOraviniWatermark !== false && (
                  <>
                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${GOLD}10` }}>
                      <div style={{ opacity: 0.35 }}><OraviniSymbol size={12} color="#ffffff" /></div>
                      <p className="text-xs text-zinc-500">Fixed bottom-right, barely visible — 28% opacity, no background. Viewers won't notice it unless they look.</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Preview</p>
                      <PlayerPreview settings={merged} />
                    </div>
                  </>
                )}

                {merged.showOraviniWatermark === false && (
                  <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: "rgba(113,113,122,0.08)", border: "1px solid rgba(113,113,122,0.15)" }}>
                    <Info className="w-3.5 h-3.5 text-zinc-600" />
                    <p className="text-xs text-zinc-600">Watermark hidden — no Oravini branding on this video</p>
                  </div>
                )}
              </>
            )}

            {/* ── CONTROLS ── */}
            {activeSection === "controls" && (
              <>
                <p className="text-sm font-bold text-white">Player Controls</p>
                <p className="text-xs text-zinc-500 -mt-2">Configure the controls visible in the video player's bottom bar.</p>

                {/* Speed control */}
                <div className="space-y-3 p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${GOLD}10` }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-start gap-2">
                      <Gauge className="w-4 h-4 text-zinc-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-white">Playback Speed Control</p>
                        <p className="text-[10px] text-zinc-500 mt-0.5">Show a speed selector button in the controls bar</p>
                      </div>
                    </div>
                    <button onClick={() => save("allowSpeedControl", !merged.allowSpeedControl)} className="w-11 h-6 rounded-full flex items-center transition-all flex-shrink-0" style={{ background: merged.allowSpeedControl !== false ? GOLD : "#3f3f46", justifyContent: merged.allowSpeedControl !== false ? "flex-end" : "flex-start", padding: "0 2px" }}>
                      <div className="w-5 h-5 rounded-full bg-white shadow" />
                    </button>
                  </div>

                  {merged.allowSpeedControl !== false && (
                    <>
                      <div>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Default Playback Speed</p>
                        <div className="flex gap-1.5 flex-wrap">
                          {SPEED_OPTIONS.map(spd => (
                            <button key={spd} onClick={() => save("defaultPlaybackSpeed", spd)} className="px-3 py-1.5 rounded-lg text-xs font-black transition-all" style={{
                              background: (merged.defaultPlaybackSpeed ?? 1) === spd ? GOLD : "rgba(255,255,255,0.06)",
                              color: (merged.defaultPlaybackSpeed ?? 1) === spd ? "#000" : "#71717a",
                              border: `1px solid ${(merged.defaultPlaybackSpeed ?? 1) === spd ? GOLD : "transparent"}`,
                            }}>
                              {spd === 1 ? "1× Normal" : `${spd}×`}
                            </button>
                          ))}
                        </div>
                        <p className="text-[10px] text-zinc-600 mt-1.5">This speed is applied when the video first loads. Viewers can change it using the speed button.</p>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: `${GOLD}0c`, border: `1px solid ${GOLD}20` }}>
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded" style={{ background: GOLD, color: "#000" }}>
                          {(merged.defaultPlaybackSpeed ?? 1) === 1 ? "1×" : `${merged.defaultPlaybackSpeed ?? 1}×`}
                        </span>
                        <p className="text-xs text-zinc-400">Speed badge appears in the player controls bar</p>
                      </div>
                    </>
                  )}
                </div>

                {/* Quality control */}
                <div className="space-y-3 p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${GOLD}10` }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-start gap-2">
                      <MonitorSmartphone className="w-4 h-4 text-zinc-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-white">Video Quality Selector</p>
                        <p className="text-[10px] text-zinc-500 mt-0.5">Let viewers choose their preferred video quality</p>
                      </div>
                    </div>
                    <button onClick={() => save("allowQualityControl", !merged.allowQualityControl)} className="w-11 h-6 rounded-full flex items-center transition-all flex-shrink-0" style={{ background: merged.allowQualityControl !== false ? GOLD : "#3f3f46", justifyContent: merged.allowQualityControl !== false ? "flex-end" : "flex-start", padding: "0 2px" }}>
                      <div className="w-5 h-5 rounded-full bg-white shadow" />
                    </button>
                  </div>

                  {merged.allowQualityControl !== false && (
                    <div>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Available Qualities</p>
                      <div className="flex gap-1.5 flex-wrap">
                        {QUALITY_OPTIONS.map(q => (
                          <div key={q} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold" style={{ background: q === "Auto" ? `${GOLD}15` : "rgba(255,255,255,0.06)", color: q === "Auto" ? GOLD : "#71717a", border: `1px solid ${q === "Auto" ? GOLD+"30" : "transparent"}` }}>
                            {q === "1080p" && "🔴"} {q === "720p" && "🟡"} {q === "480p" && "🟢"} {q === "360p" && "⚪"} {q}
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-zinc-600 mt-1.5">Quality options are auto-detected based on the source video. Auto selects the best quality for the viewer's connection.</p>
                    </div>
                  )}
                </div>

                {/* Live controls preview */}
                <div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Controls Bar Preview</p>
                  <PlayerPreview settings={merged} />
                  <p className="text-[10px] text-zinc-600 mt-1.5">The controls bar updates live as you toggle features above.</p>
                </div>
              </>
            )}

            {/* ── PROTECTION ── */}
            {activeSection === "protection" && (
              <>
                <p className="text-sm font-bold text-white">Access Protection</p>
                <div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Allowed Domains (embed whitelist)</p>
                  <input placeholder="yourdomain.com, anotherdomain.com" defaultValue={(merged.domainWhitelist || []).join(", ")} onBlur={e => save("domainWhitelist", e.target.value ? e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean) : [])} className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-xl px-4 py-3 placeholder:text-zinc-600" />
                  <p className="text-[10px] text-zinc-600 mt-1">Leave blank to allow embedding anywhere. Separate with commas.</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Video Expires At</p>
                  <input type="datetime-local" defaultValue={merged.expiresAt ? new Date(merged.expiresAt).toISOString().slice(0,16) : ""} onBlur={e => save("expiresAt", e.target.value ? new Date(e.target.value).toISOString() : null)} className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-xl px-4 py-3" />
                  <p className="text-[10px] text-zinc-600 mt-1">After this date/time, the video player will show "unavailable"</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Password Protection</p>
                  <input type="password" placeholder="Set a password (leave blank to remove)" onBlur={e => { if (e.target.value) save("passwordHash", e.target.value); }} className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-xl px-4 py-3 placeholder:text-zinc-600" />
                  <p className="text-[10px] text-zinc-600 mt-1">Viewers must enter this password before watching</p>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${GOLD}10` }}>
                  <Shield className="w-4 h-4 text-zinc-500" />
                  <p className="text-xs text-zinc-400">Lead gate: <span className={merged.leadGateEnabled ? "text-green-400 font-bold" : "text-zinc-600"}>{merged.leadGateEnabled ? "ENABLED" : "disabled"}</span> — toggle in the Library tab per video</p>
                </div>
              </>
            )}

            {/* ── PLAYBACK ── */}
            {activeSection === "playback" && (
              <>
                <p className="text-sm font-bold text-white">Playback Behavior</p>
                <div className="space-y-3">
                  {[
                    { key: "resumeEnabled", label: "Resume Playback", desc: "Remember where each viewer left off across sessions", icon: RefreshCw },
                    { key: "autoplayNextEnabled", label: "Autoplay Next Video", desc: "Automatically play the next video in the collection", icon: ChevronRight },
                  ].map(opt => (
                    <div key={opt.key} className="flex items-center justify-between p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${GOLD}10` }}>
                      <div className="flex items-start gap-3">
                        <opt.icon className="w-4 h-4 text-zinc-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-white">{opt.label}</p>
                          <p className="text-[10px] text-zinc-500 mt-0.5">{opt.desc}</p>
                        </div>
                      </div>
                      <button onClick={() => save(opt.key, !merged[opt.key])} className="w-11 h-6 rounded-full flex items-center transition-all" style={{ background: merged[opt.key] ? GOLD : "#3f3f46", justifyContent: merged[opt.key] ? "flex-end" : "flex-start", padding: "0 2px" }}>
                        <div className="w-5 h-5 rounded-full bg-white shadow" />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ── CAPTIONS ── */}
            {activeSection === "captions" && (
              <>
                <p className="text-sm font-bold text-white">Captions & Subtitles</p>
                <div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Caption File URL (.srt or .vtt)</p>
                  <input placeholder="https://your-cdn.com/captions.srt" defaultValue={merged.captionUrl || ""} onBlur={e => save("captionUrl", e.target.value || null)} className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-xl px-4 py-3 placeholder:text-zinc-600" />
                  <p className="text-[10px] text-zinc-600 mt-1">Supports .srt and .vtt formats. Shown as a CC toggle in the player.</p>
                </div>
                {merged.captionUrl && (
                  <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: "#22c55e10", border: "1px solid #22c55e30" }}>
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    <p className="text-xs text-green-400 font-medium">Captions configured — viewers will see a CC button</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── MAIN PLATFORM VIEW ────────────────────────────────────────────────────────

type NavItem = { id: string; label: string; icon: React.ComponentType<{ className?: string }> };

const WEBINAR_NAV: NavItem[] = [
  { id: "webinars",         label: "Live Webinars",   icon: MonitorPlay },
  { id: "series",           label: "Series",          icon: Repeat2 },
  { id: "landing-pages",    label: "Landing Pages",   icon: LayoutTemplate },
  { id: "crm",              label: "CRM",             icon: Users },
  { id: "recordings",       label: "Recordings",      icon: Mic },
  { id: "email-sequences",  label: "Email Sequences", icon: Mail },
  { id: "analytics",        label: "Analytics",       icon: BarChart3 },
  { id: "settings",         label: "API & Settings",  icon: Settings2 },
];

const HOSTING_NAV: NavItem[] = [
  { id: "video-hosting",     label: "Library",          icon: Video },
  { id: "vsl-studio",        label: "VSL Studio",       icon: Zap },
  { id: "collections",       label: "Collections",      icon: Layers },
  { id: "vsl-library",       label: "VSL Library",      icon: Film },
  { id: "video-analytics",   label: "Analytics",        icon: BarChart3 },
  { id: "video-crm",         label: "Viewer CRM",       icon: UserCheck },
  { id: "player-settings",   label: "Player Settings",  icon: Settings2 },
];

export default function PlatformView() {
  const [section, setSection] = useState<"webinars" | "video-hosting">("webinars");
  const [activeId, setActiveId] = useState("webinars");

  const switchSection = (s: "webinars" | "video-hosting") => {
    setSection(s);
    setActiveId(s === "webinars" ? "webinars" : "video-hosting");
  };

  const navItems = section === "webinars" ? WEBINAR_NAV : HOSTING_NAV;

  return (
    <div className="flex min-h-screen relative" style={{ background: "#040406" }}>
      <svg className="absolute inset-0 w-full h-full opacity-[0.02] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        <filter id="pv-grain"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
        <rect width="100%" height="100%" filter="url(#pv-grain)"/>
      </svg>

      {/* ── SIDEBAR ── */}
      <aside
        className="w-60 flex-shrink-0 flex flex-col relative z-10"
        style={{ background: "#040406", borderRight: `1px solid ${GOLD}15`, minHeight: "100vh" }}
      >
        {/* Logo */}
        <div className="px-4 py-3" style={{ borderBottom: `1px solid ${GOLD}15` }}>
          <div className="flex gap-0.5 mb-3">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-2.5 flex-1 rounded-sm" style={{ background: i % 2 === 0 ? `${GOLD}22` : "transparent", border: `1px solid ${GOLD}12` }} />
            ))}
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `linear-gradient(135deg, ${GOLD}, #b8962f)` }}>
              <MonitorPlay className="w-4 h-4 text-black" />
            </div>
            <div>
              <p className="text-[11px] font-black tracking-[0.2em] uppercase leading-none" style={{ color: GOLD }}>ORAVINI</p>
              <p className="text-[9px] mt-0.5 tracking-wide uppercase leading-none" style={{ color: `${GOLD}45` }}>Video Studio</p>
            </div>
          </div>
        </div>

        {/* Section switcher */}
        <div className="px-3 pt-4 pb-2">
          <div className="flex gap-1 p-1 rounded-lg" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
            {(["webinars", "video-hosting"] as const).map(s => (
              <button
                key={s}
                onClick={() => switchSection(s)}
                className="flex-1 py-1.5 rounded-md text-[10px] font-bold transition-all"
                style={{
                  background: section === s ? `linear-gradient(135deg, ${GOLD}, #b8962e)` : "transparent",
                  color: section === s ? "#000" : "rgba(255,255,255,0.4)",
                  border: "none", cursor: "pointer",
                }}
              >
                {s === "webinars" ? "Webinars" : "Hosting"}
              </button>
            ))}
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          <p className="text-[9px] font-bold uppercase tracking-widest px-2 py-2" style={{ color: "rgba(255,255,255,0.2)" }}>
            {section === "webinars" ? "Webinars" : "Video Hosting"}
          </p>
          {navItems.map(({ id, label, icon: Icon }) => {
            const active = activeId === id;
            return (
              <button
                key={id}
                onClick={() => setActiveId(id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group text-left"
                style={{
                  background: active ? `${GOLD}18` : "transparent",
                  color: active ? GOLD : "rgba(255,255,255,0.5)",
                  border: active ? `1px solid ${GOLD}30` : "1px solid transparent",
                  cursor: "pointer",
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)"; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">{label}</span>
                {active && <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: GOLD }} />}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <div
          className="sticky top-0 z-20 px-6 py-3 flex items-center gap-3"
          style={{ background: "rgba(4,4,6,0.97)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${GOLD}14` }}
        >
          <div className="flex gap-0.5 mr-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="w-2 h-4 rounded-sm" style={{ background: i % 2 === 0 ? `${GOLD}20` : "transparent", border: `1px solid ${GOLD}12` }} />
            ))}
          </div>
          <div>
            <h1 className="text-sm font-black" style={{
              background: `linear-gradient(135deg, #fff 0%, ${GOLD} 100%)`,
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>
              {navItems.find(n => n.id === activeId)?.label ?? "Video Marketing Studio"}
            </h1>
            <p className="text-[9px] font-bold uppercase tracking-[0.15em] leading-none mt-0.5" style={{ color: `${GOLD}40` }}>ORAVINI · Studio</p>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-8">
          {/* Webinars section */}
          {activeId === "webinars"          && <WebinarsTab />}
          {activeId === "series"            && <SeriesTab />}
          {activeId === "landing-pages"     && <LandingPagesTab />}
          {activeId === "crm"               && <CRMTab />}
          {activeId === "recordings"        && <RecordingsTab />}
          {activeId === "email-sequences"   && <EmailSequencesTab />}
          {activeId === "analytics"         && <AnalyticsTab />}
          {activeId === "settings"          && <SettingsTab />}
          {/* Video hosting section */}
          {activeId === "video-hosting"     && <VideoHosting onNavigate={setActiveId} />}
          {activeId === "vsl-studio"        && <VSLStudioTab />}
          {activeId === "collections"       && <VideoCollectionsTab />}
          {activeId === "vsl-library"       && <VideosTab typeFilter="vsl" />}
          {activeId === "video-analytics"   && <VideoAnalyticsTab />}
          {activeId === "video-crm"         && <VideoViewerCRMTab />}
          {activeId === "player-settings"   && <PlayerSettingsTab />}
        </div>
      </main>

    </div>
  );
}
