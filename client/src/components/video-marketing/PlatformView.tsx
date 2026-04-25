import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import ClientLayout from "@/components/layout/ClientLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
    Calendar, Users, Layout, MonitorPlay, TrendingUp, Video, Plus, Play,
    Clock, Upload, Sparkles, Crown,
} from "lucide-react";
import { format } from "date-fns";

const GOLD = "#d4b461";

interface PlatformViewProps {
    userPlan: string;
    userName?: string;
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) {
    return (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-zinc-500">{label}</p>
                <Icon className="w-4 h-4" style={{ color }} />
            </div>
            <p className="text-2xl font-bold text-white">{value}</p>
        </div>
    );
}

function EmptyState({
    icon: Icon, title, description, ctaLabel, onCta,
}: {
    icon: any; title: string; description: string; ctaLabel?: string; onCta?: () => void;
}) {
    return (
        <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/20 py-16 px-6 text-center">
            <div
                className="mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-4"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
                <Icon className="w-6 h-6 text-zinc-500" />
            </div>
            <h3 className="text-sm font-bold text-white">{title}</h3>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">{description}</p>
            {ctaLabel && onCta && (
                <Button
                    onClick={onCta}
                    className="mt-5 font-semibold"
                    style={{ background: GOLD, color: "#000" }}
                >
                    <Plus className="w-4 h-4 mr-2" /> {ctaLabel}
                </Button>
            )}
        </div>
    );
}

function InsightRow({ label, value }: { label: string; value: number | string }) {
    return (
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-900/40 border border-zinc-800">
            <span className="text-xs text-zinc-400">{label}</span>
            <span className="text-sm font-bold text-white">{value}</span>
        </div>
    );
}

export default function PlatformView({ userPlan, userName }: PlatformViewProps) {
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState("webinars");
    const [hostOpen, setHostOpen] = useState(false);
    const [uploadOpen, setUploadOpen] = useState(false);

    // Host webinar form
    const [wTitle, setWTitle] = useState("");
    const [wDesc, setWDesc] = useState("");
    const [wDate, setWDate] = useState("");
    const [wDuration, setWDuration] = useState("60");
    const [wMax, setWMax] = useState("");

    // Upload video form
    const [vTitle, setVTitle] = useState("");
    const [vDesc, setVDesc] = useState("");
    const [vUrl, setVUrl] = useState("");
    const [vCategory, setVCategory] = useState("General");

    const { data: webinars = [] } = useQuery<any[]>({
        queryKey: ["/api/webinars"],
        queryFn: async () => (await apiRequest("GET", "/api/webinars")).json(),
    });
    const { data: videos = [] } = useQuery<any[]>({
        queryKey: ["/api/video-events"],
        queryFn: async () => (await apiRequest("GET", "/api/video-events")).json(),
    });
    const { data: recordings = [] } = useQuery<any[]>({
        queryKey: ["/api/webinar-recordings"],
        queryFn: async () => (await apiRequest("GET", "/api/webinar-recordings")).json(),
    });
    const { data: landingPages = [] } = useQuery<any[]>({
        queryKey: ["/api/webinar-landing-pages"],
        queryFn: async () => (await apiRequest("GET", "/api/webinar-landing-pages")).json(),
    });

    const createWebinar = useMutation({
        mutationFn: async () => {
            if (!wTitle.trim()) throw new Error("Title is required");
            if (!wDate) throw new Error("Date/time is required");
            const r = await apiRequest("POST", "/api/webinars", {
                title: wTitle.trim(),
                description: wDesc.trim() || undefined,
                scheduledAt: new Date(wDate).toISOString(),
                durationMinutes: parseInt(wDuration || "60", 10),
                maxAttendees: wMax ? parseInt(wMax, 10) : undefined,
            });
            return r.json();
        },
        onSuccess: () => {
            toast({ title: "Webinar created", description: "Your webinar is scheduled." });
            queryClient.invalidateQueries({ queryKey: ["/api/webinars"] });
            setHostOpen(false);
            setWTitle(""); setWDesc(""); setWDate(""); setWDuration("60"); setWMax("");
        },
        onError: (err: any) => toast({
            title: "Failed to host webinar",
            description: err.message,
            variant: "destructive",
        }),
    });

    const uploadVideo = useMutation({
        mutationFn: async () => {
            if (!vTitle.trim()) throw new Error("Title is required");
            if (!vUrl.trim()) throw new Error("Video URL is required");
            const r = await apiRequest("POST", "/api/video-events", {
                title: vTitle.trim(),
                description: vDesc.trim() || undefined,
                videoUrl: vUrl.trim(),
                category: vCategory || "General",
            });
            return r.json();
        },
        onSuccess: () => {
            toast({ title: "Video uploaded", description: "Your video is hosted." });
            queryClient.invalidateQueries({ queryKey: ["/api/video-events"] });
            setUploadOpen(false);
            setVTitle(""); setVDesc(""); setVUrl(""); setVCategory("General");
        },
        onError: (err: any) => toast({
            title: "Failed to upload video",
            description: err.message,
            variant: "destructive",
        }),
    });

    const totalRegs = webinars.reduce((s: number, w: any) => s + (w.registrations || 0), 0);
    const totalWebinarViews = webinars.reduce((s: number, w: any) => s + (w.views || 0), 0);
    const totalVideoViews = videos.reduce((s: number, v: any) => s + (v.views || 0), 0);
    const totalLpRegs = landingPages.reduce((s: number, lp: any) => s + (lp.registrations || 0), 0);
    const planLabel = userPlan === "elite" ? "Elite" : "Pro";
    const firstName = userName?.split(" ")[0] || "there";

    return (
        <ClientLayout>
            <div className="p-6 max-w-7xl mx-auto">
                {/* Welcome header */}
                <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-1.5">
                            <Badge
                                className="border-0"
                                style={{
                                    background: `${GOLD}18`,
                                    color: GOLD,
                                    border: `1px solid ${GOLD}33`,
                                }}
                            >
                                <Crown className="w-3 h-3 mr-1.5" /> {planLabel} · Video Marketing
                            </Badge>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-black text-white">
                            Welcome back, {firstName}
                        </h1>
                        <p className="text-sm text-zinc-500 mt-1">
                            Host webinars, upload videos, build landing pages, and track every conversion.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={() => setUploadOpen(true)}
                            variant="outline"
                            className="border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-900"
                        >
                            <Upload className="w-4 h-4 mr-2" /> Upload Video
                        </Button>
                        <Button
                            onClick={() => setHostOpen(true)}
                            className="font-semibold"
                            style={{ background: GOLD, color: "#000" }}
                            data-testid="btn-host-webinar"
                        >
                            <Plus className="w-4 h-4 mr-2" /> Host a Webinar
                        </Button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <StatCard label="Webinars" value={webinars.length} icon={MonitorPlay} color="#60a5fa" />
                    <StatCard label="Registrations" value={totalRegs + totalLpRegs} icon={Users} color="#34d399" />
                    <StatCard label="Videos" value={videos.length} icon={Video} color="#a78bfa" />
                    <StatCard label="Recordings" value={recordings.length} icon={Play} color={GOLD} />
                </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="bg-zinc-900 border border-zinc-800 mb-4 flex-wrap h-auto gap-1 p-1">
                        <TabsTrigger value="webinars" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400">My Webinars</TabsTrigger>
                        <TabsTrigger value="videos" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400">Videos</TabsTrigger>
                        <TabsTrigger value="recordings" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400">Recordings</TabsTrigger>
                        <TabsTrigger value="landing-pages" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400">Landing Pages</TabsTrigger>
                        <TabsTrigger value="analytics" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400">Analytics</TabsTrigger>
                    </TabsList>

                    <TabsContent value="webinars" className="space-y-4">
                        {webinars.length === 0 ? (
                            <EmptyState
                                icon={MonitorPlay}
                                title="No webinars yet"
                                description="Host your first webinar and start converting viewers into customers."
                                ctaLabel="Host a Webinar"
                                onCta={() => setHostOpen(true)}
                            />
                        ) : (
                            <div className="space-y-3">
                                {webinars.map((w: any) => (
                                    <Card key={w.id} className="bg-zinc-900/40 border-zinc-800 hover:border-zinc-700 transition-colors">
                                        <CardContent className="p-4">
                                            <div className="flex items-start justify-between gap-4 flex-wrap">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                        <h3 className="text-sm font-bold text-white">{w.title}</h3>
                                                        {w.status === "live" && (
                                                            <Badge className="bg-red-500/20 text-red-400 border border-red-500/40 text-[10px] h-5">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse mr-1" /> LIVE
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    {w.description && (
                                                        <p className="text-xs text-zinc-400 line-clamp-2">{w.description}</p>
                                                    )}
                                                    <div className="flex items-center gap-4 mt-2 flex-wrap">
                                                        <span className="text-xs text-zinc-500 flex items-center gap-1">
                                                            <Calendar className="w-3 h-3" />
                                                            {w.scheduledAt ? format(new Date(w.scheduledAt), "MMM d, yyyy · h:mm a") : "Not scheduled"}
                                                        </span>
                                                        <span className="text-xs text-zinc-500 flex items-center gap-1">
                                                            <Clock className="w-3 h-3" /> {w.durationMinutes || 60}m
                                                        </span>
                                                        <span className="text-xs text-zinc-500 flex items-center gap-1">
                                                            <Users className="w-3 h-3" /> {w.registrations || 0} registered
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {w.meetingCode && (
                                                        <Badge variant="outline" className="border-zinc-700 text-zinc-400 font-mono text-[10px]">
                                                            {w.meetingCode}
                                                        </Badge>
                                                    )}
                                                    <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800 h-8">
                                                        Manage
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="videos" className="space-y-4">
                        {videos.length === 0 ? (
                            <EmptyState
                                icon={Video}
                                title="No videos yet"
                                description="Upload a video and host it with full engagement analytics."
                                ctaLabel="Upload Video"
                                onCta={() => setUploadOpen(true)}
                            />
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {videos.map((v: any) => (
                                    <Card key={v.id} className="bg-zinc-900/40 border-zinc-800 hover:border-zinc-700 transition-colors">
                                        <CardContent className="p-4">
                                            <div className="aspect-video rounded-lg bg-zinc-800 mb-3 flex items-center justify-center overflow-hidden">
                                                {v.thumbnailUrl ? (
                                                    <img src={v.thumbnailUrl} alt={v.title} className="w-full h-full object-cover" />
                                                ) : (
                                                    <Video className="w-8 h-8 text-zinc-600" />
                                                )}
                                            </div>
                                            <h3 className="text-sm font-bold text-white line-clamp-1">{v.title}</h3>
                                            <p className="text-xs text-zinc-500 mt-0.5">{v.category}</p>
                                            <div className="flex items-center justify-between mt-2 text-xs text-zinc-500">
                                                <span className="flex items-center gap-1"><Play className="w-3 h-3" /> {v.views || 0}</span>
                                                {v.duration && <span>{v.duration}</span>}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="recordings" className="space-y-4">
                        {recordings.length === 0 ? (
                            <EmptyState
                                icon={Play}
                                title="No recordings yet"
                                description="Recordings from your live webinars will appear here automatically."
                            />
                        ) : (
                            <div className="space-y-3">
                                {recordings.map((r: any) => (
                                    <Card key={r.id} className="bg-zinc-900/40 border-zinc-800">
                                        <CardContent className="p-4 flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0">
                                                    <MonitorPlay className="w-5 h-5 text-zinc-500" />
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="text-sm font-bold text-white truncate">{r.title}</h3>
                                                    <p className="text-xs text-zinc-500">{r.duration ? `${r.duration} mins` : "No duration"}</p>
                                                </div>
                                            </div>
                                            <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800 h-8 flex-shrink-0">
                                                <Play className="w-3 h-3 mr-1.5" /> Play
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="landing-pages" className="space-y-4">
                        {landingPages.length === 0 ? (
                            <EmptyState
                                icon={Layout}
                                title="No landing pages yet"
                                description="Create a landing page for your webinar to drive registrations."
                            />
                        ) : (
                            <div className="space-y-3">
                                {landingPages.map((lp: any) => (
                                    <Card key={lp.id} className="bg-zinc-900/40 border-zinc-800">
                                        <CardContent className="p-4">
                                            <div className="flex items-start justify-between gap-4 flex-wrap">
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-sm font-bold text-white">/lp/{lp.slug}</h3>
                                                    <p className="text-xs text-zinc-400 line-clamp-1">{lp.headline}</p>
                                                    <div className="flex items-center gap-4 mt-2 flex-wrap">
                                                        <span className="text-xs text-zinc-500 flex items-center gap-1">
                                                            <Users className="w-3 h-3" /> {lp.registrations || 0} registrations
                                                        </span>
                                                        <Badge
                                                            variant="outline"
                                                            className={`text-[10px] h-5 ${lp.published ? "border-emerald-600/40 text-emerald-400" : "border-zinc-700 text-zinc-500"}`}
                                                        >
                                                            {lp.published ? "Published" : "Draft"}
                                                        </Badge>
                                                    </div>
                                                </div>
                                                <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800 h-8 flex-shrink-0">
                                                    Edit
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="analytics" className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Card className="bg-zinc-900/40 border-zinc-800">
                                <CardContent className="p-6 text-center">
                                    <TrendingUp className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                                    <p className="text-3xl font-bold text-white">{totalWebinarViews}</p>
                                    <p className="text-xs text-zinc-500 mt-1">Webinar Views</p>
                                </CardContent>
                            </Card>
                            <Card className="bg-zinc-900/40 border-zinc-800">
                                <CardContent className="p-6 text-center">
                                    <Users className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                                    <p className="text-3xl font-bold text-white">{totalLpRegs}</p>
                                    <p className="text-xs text-zinc-500 mt-1">Landing Page Registrations</p>
                                </CardContent>
                            </Card>
                            <Card className="bg-zinc-900/40 border-zinc-800">
                                <CardContent className="p-6 text-center">
                                    <MonitorPlay className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                                    <p className="text-3xl font-bold text-white">{totalVideoViews}</p>
                                    <p className="text-xs text-zinc-500 mt-1">Video Views</p>
                                </CardContent>
                            </Card>
                        </div>

                        <Card className="bg-zinc-900/40 border-zinc-800">
                            <CardContent className="p-6">
                                <div className="flex items-center gap-2 mb-3">
                                    <Sparkles className="w-4 h-4" style={{ color: GOLD }} />
                                    <h3 className="text-sm font-bold text-white">Quick insights</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                    <InsightRow label="Total webinars hosted" value={webinars.length} />
                                    <InsightRow label="Total registrations" value={totalRegs + totalLpRegs} />
                                    <InsightRow label="Videos uploaded" value={videos.length} />
                                    <InsightRow label="Recordings available" value={recordings.length} />
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Host Webinar Dialog */}
            <Dialog open={hostOpen} onOpenChange={setHostOpen}>
                <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-white">Host a Webinar</DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            Schedule a new live webinar. You will get a meeting code and shareable landing page.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <div className="space-y-1.5">
                            <Label className="text-zinc-400">Title *</Label>
                            <Input
                                value={wTitle}
                                onChange={(e) => setWTitle(e.target.value)}
                                placeholder="Scale your business with webinars"
                                className="bg-zinc-900 border-zinc-800 text-white"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-zinc-400">Description</Label>
                            <Textarea
                                value={wDesc}
                                onChange={(e) => setWDesc(e.target.value)}
                                placeholder="What attendees will learn..."
                                rows={3}
                                className="bg-zinc-900 border-zinc-800 text-white"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-zinc-400">Date & time *</Label>
                                <Input
                                    type="datetime-local"
                                    value={wDate}
                                    onChange={(e) => setWDate(e.target.value)}
                                    className="bg-zinc-900 border-zinc-800 text-white"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-zinc-400">Duration (min)</Label>
                                <Input
                                    type="number"
                                    min="15"
                                    value={wDuration}
                                    onChange={(e) => setWDuration(e.target.value)}
                                    className="bg-zinc-900 border-zinc-800 text-white"
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-zinc-400">Max attendees (optional)</Label>
                            <Input
                                type="number"
                                min="1"
                                value={wMax}
                                onChange={(e) => setWMax(e.target.value)}
                                placeholder="Unlimited"
                                className="bg-zinc-900 border-zinc-800 text-white"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setHostOpen(false)}
                            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={() => createWebinar.mutate()}
                            disabled={createWebinar.isPending}
                            className="font-semibold"
                            style={{ background: GOLD, color: "#000" }}
                        >
                            {createWebinar.isPending ? "Creating..." : "Schedule Webinar"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
                <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-white">Upload a Video</DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            Host an on-demand video with built-in analytics.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <div className="space-y-1.5">
                            <Label className="text-zinc-400">Title *</Label>
                            <Input
                                value={vTitle}
                                onChange={(e) => setVTitle(e.target.value)}
                                placeholder="Product walkthrough"
                                className="bg-zinc-900 border-zinc-800 text-white"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-zinc-400">Video URL *</Label>
                            <Input
                                value={vUrl}
                                onChange={(e) => setVUrl(e.target.value)}
                                placeholder="https://..."
                                className="bg-zinc-900 border-zinc-800 text-white"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-zinc-400">Description</Label>
                            <Textarea
                                value={vDesc}
                                onChange={(e) => setVDesc(e.target.value)}
                                rows={3}
                                className="bg-zinc-900 border-zinc-800 text-white"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-zinc-400">Category</Label>
                            <Input
                                value={vCategory}
                                onChange={(e) => setVCategory(e.target.value)}
                                placeholder="General"
                                className="bg-zinc-900 border-zinc-800 text-white"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setUploadOpen(false)}
                            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={() => uploadVideo.mutate()}
                            disabled={uploadVideo.isPending}
                            className="font-semibold"
                            style={{ background: GOLD, color: "#000" }}
                        >
                            {uploadVideo.isPending ? "Uploading..." : "Upload Video"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </ClientLayout>
    );
}
