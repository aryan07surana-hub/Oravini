import { useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
    MonitorPlay, Plus, Calendar, Users, Play, Video, FileVideo,
    ExternalLink, Trash2, Edit3, Copy, CheckCircle, XCircle,
    Clock, Eye, Download, Globe, Lock, ChevronRight, Search,
    BarChart3, Mic, Share2, Link2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";

const GOLD = "#d4b461";

type Webinar = {
    id: string;
    title: string;
    description: string | null;
    scheduledAt: string;
    durationMinutes: number;
    status: "upcoming" | "live" | "completed" | "cancelled";
    maxAttendees: number | null;
    meetingCode: string;
    chatChannels: string[];
    offerUrl: string | null;
    offerTitle: string | null;
    thumbnailUrl: string | null;
    isPublic: boolean;
    createdAt: string;
};

type VideoEvent = {
    id: string;
    title: string;
    description: string | null;
    videoUrl: string;
    thumbnailUrl: string | null;
    duration: number | null;
    category: string;
    tags: string[];
    views: number;
    isPublic: boolean;
    allowDownload: boolean;
    createdAt: string;
};

type Recording = {
    id: string;
    title: string;
    recordingUrl: string;
    thumbnailUrl: string | null;
    duration: number | null;
    fileSize: string | null;
    shareToken: string;
    isPublic: boolean;
    createdAt: string;
};

export default function AdminVideoMarketing() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState("webinars");
    const [searchQuery, setSearchQuery] = useState("");

    // Webinars
    const { data: webinars = [] } = useQuery<Webinar[]>({
        queryKey: ["/api/webinars"],
    });

    const createWebinar = useMutation({
        mutationFn: (data: any) => apiRequest("POST", "/api/webinars", data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/webinars"] });
            toast({ title: "Webinar created" });
        },
    });

    const deleteWebinar = useMutation({
        mutationFn: (id: string) => apiRequest("DELETE", `/api/webinars/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/webinars"] });
            toast({ title: "Webinar deleted" });
        },
    });

    // Video Events
    const { data: videos = [] } = useQuery<VideoEvent[]>({
        queryKey: ["/api/video-events"],
    });

    const createVideo = useMutation({
        mutationFn: (data: any) => apiRequest("POST", "/api/video-events", data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/video-events"] });
            toast({ title: "Video added" });
        },
    });

    const deleteVideo = useMutation({
        mutationFn: (id: string) => apiRequest("DELETE", `/api/video-events/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/video-events"] });
            toast({ title: "Video deleted" });
        },
    });

    // Recordings
    const { data: recordings = [] } = useQuery<Recording[]>({
        queryKey: ["/api/recordings"],
    });

    const createRecording = useMutation({
        mutationFn: (data: any) => apiRequest("POST", "/api/recordings", data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/recordings"] });
            toast({ title: "Recording added" });
        },
    });

    const deleteRecording = useMutation({
        mutationFn: (id: string) => apiRequest("DELETE", `/api/recordings/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/recordings"] });
            toast({ title: "Recording deleted" });
        },
    });

    const statusBadge = (status: string) => {
        const styles: Record<string, string> = {
            upcoming: "bg-blue-500/20 text-blue-400 border-blue-500/30",
            live: "bg-red-500/20 text-red-400 border-red-500/30 animate-pulse",
            completed: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
            cancelled: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
        };
        return <Badge className={`text-[10px] border ${styles[status] || styles.upcoming}`}>{status}</Badge>;
    };

    const filteredWebinars = webinars.filter(w =>
        w.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const filteredVideos = videos.filter(v =>
        v.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const filteredRecordings = recordings.filter(r =>
        r.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <AdminLayout>
            <div className="p-6 lg:p-8 max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Video Marketing</h1>
                        <p className="text-zinc-400 text-sm mt-0.5">Webinars, video events, recordings & landing pages</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                            <Input
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search..."
                                className="pl-9 bg-zinc-800/60 border-zinc-700 w-48"
                            />
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                    {[
                        { label: "Webinars", value: webinars.length, icon: MonitorPlay, color: "text-blue-400" },
                        { label: "Live Now", value: webinars.filter(w => w.status === "live").length, icon: Mic, color: "text-red-400" },
                        { label: "Video Events", value: videos.length, icon: Video, color: "text-purple-400" },
                        { label: "Recordings", value: recordings.length, icon: FileVideo, color: "text-emerald-400" },
                    ].map(s => (
                        <Card key={s.label} className="bg-zinc-900/40 border-zinc-800">
                            <CardContent className="p-4 flex items-center gap-3">
                                <s.icon className={`w-5 h-5 ${s.color}`} />
                                <div>
                                    <p className="text-xs text-zinc-500">{s.label}</p>
                                    <p className="text-xl font-bold text-white">{s.value}</p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="bg-zinc-900/60 border border-zinc-800 mb-6">
                        <TabsTrigger value="webinars" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                            <MonitorPlay className="w-3.5 h-3.5 mr-1.5" /> Webinars
                        </TabsTrigger>
                        <TabsTrigger value="videos" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                            <Video className="w-3.5 h-3.5 mr-1.5" /> Video Events
                        </TabsTrigger>
                        <TabsTrigger value="recordings" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                            <FileVideo className="w-3.5 h-3.5 mr-1.5" /> Recordings
                        </TabsTrigger>
                    </TabsList>

                    {/* WEBINARS TAB */}
                    <TabsContent value="webinars" className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-bold text-white">Upcoming Webinars</h2>
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button size="sm" style={{ background: GOLD, color: "#000" }}>
                                        <Plus className="w-4 h-4 mr-1" /> New Webinar
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg">
                                    <DialogHeader>
                                        <DialogTitle className="text-white">Create Webinar</DialogTitle>
                                    </DialogHeader>
                                    <WebinarForm onSubmit={(data) => createWebinar.mutate(data)} />
                                </DialogContent>
                            </Dialog>
                        </div>

                        {filteredWebinars.length === 0 ? (
                            <div className="text-center py-16 text-zinc-600">
                                <MonitorPlay className="w-10 h-10 mx-auto mb-3 opacity-40" />
                                <p className="text-sm">No webinars yet. Create your first one.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredWebinars.map(w => (
                                    <Card key={w.id} className="bg-zinc-900/40 border-zinc-800 overflow-hidden group">
                                        <div className="h-32 bg-zinc-800 relative">
                                            {w.thumbnailUrl ? (
                                                <img src={w.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <MonitorPlay className="w-8 h-8 text-zinc-600" />
                                                </div>
                                            )}
                                            <div className="absolute top-2 left-2">{statusBadge(w.status)}</div>
                                            {w.isPublic && (
                                                <div className="absolute top-2 right-2">
                                                    <Badge className="bg-zinc-900/80 text-zinc-300 border-zinc-700 text-[10px]">
                                                        <Globe className="w-3 h-3 mr-1" /> Public
                                                    </Badge>
                                                </div>
                                            )}
                                        </div>
                                        <CardContent className="p-4">
                                            <h3 className="text-sm font-bold text-white truncate">{w.title}</h3>
                                            <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{w.description || "No description"}</p>
                                            <div className="flex items-center gap-3 mt-3 text-xs text-zinc-400">
                                                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {format(new Date(w.scheduledAt), "MMM d, h:mm a")}</span>
                                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {w.durationMinutes}m</span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-3">
                                                <Button size="sm" variant="outline" className="border-zinc-700 text-xs h-7" onClick={() => navigator.clipboard.writeText(w.meetingCode).then(() => toast({ title: "Code copied" }))}>
                                                    <Copy className="w-3 h-3 mr-1" /> {w.meetingCode}
                                                </Button>
                                                <Button size="sm" variant="ghost" className="text-zinc-500 hover:text-red-400 h-7 w-7 p-0" onClick={() => deleteWebinar.mutate(w.id)}>
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    {/* VIDEO EVENTS TAB */}
                    <TabsContent value="videos" className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-bold text-white">Video Library</h2>
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button size="sm" style={{ background: GOLD, color: "#000" }}>
                                        <Plus className="w-4 h-4 mr-1" /> Add Video
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg">
                                    <DialogHeader>
                                        <DialogTitle className="text-white">Add Video Event</DialogTitle>
                                    </DialogHeader>
                                    <VideoForm onSubmit={(data) => createVideo.mutate(data)} />
                                </DialogContent>
                            </Dialog>
                        </div>

                        {filteredVideos.length === 0 ? (
                            <div className="text-center py-16 text-zinc-600">
                                <Video className="w-10 h-10 mx-auto mb-3 opacity-40" />
                                <p className="text-sm">No videos yet. Add your first one.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredVideos.map(v => (
                                    <Card key={v.id} className="bg-zinc-900/40 border-zinc-800 overflow-hidden">
                                        <div className="h-32 bg-zinc-800 relative">
                                            {v.thumbnailUrl ? (
                                                <img src={v.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <Play className="w-8 h-8 text-zinc-600" />
                                                </div>
                                            )}
                                            <div className="absolute bottom-2 right-2">
                                                <Badge className="bg-black/70 text-white border-0 text-[10px]">
                                                    {v.duration ? `${Math.floor(v.duration / 60)}:${String(v.duration % 60).padStart(2, "0")}` : "--:--"}
                                                </Badge>
                                            </div>
                                        </div>
                                        <CardContent className="p-4">
                                            <h3 className="text-sm font-bold text-white truncate">{v.title}</h3>
                                            <p className="text-xs text-zinc-500 mt-1">{v.category} {v.tags?.length > 0 && `· ${v.tags.join(", ")}`}</p>
                                            <div className="flex items-center justify-between mt-3">
                                                <span className="text-xs text-zinc-400 flex items-center gap-1"><Eye className="w-3 h-3" /> {v.views} views</span>
                                                <div className="flex gap-1">
                                                    {v.allowDownload && <Download className="w-3.5 h-3.5 text-zinc-500" />}
                                                    {v.isPublic ? <Globe className="w-3.5 h-3.5 text-zinc-500" /> : <Lock className="w-3.5 h-3.5 text-zinc-500" />}
                                                    <Button size="sm" variant="ghost" className="text-zinc-500 hover:text-red-400 h-6 w-6 p-0" onClick={() => deleteVideo.mutate(v.id)}>
                                                        <Trash2 className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    {/* RECORDINGS TAB */}
                    <TabsContent value="recordings" className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-bold text-white">Webinar Recordings</h2>
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button size="sm" style={{ background: GOLD, color: "#000" }}>
                                        <Plus className="w-4 h-4 mr-1" /> Add Recording
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg">
                                    <DialogHeader>
                                        <DialogTitle className="text-white">Add Recording</DialogTitle>
                                    </DialogHeader>
                                    <RecordingForm onSubmit={(data) => createRecording.mutate(data)} />
                                </DialogContent>
                            </Dialog>
                        </div>

                        {filteredRecordings.length === 0 ? (
                            <div className="text-center py-16 text-zinc-600">
                                <FileVideo className="w-10 h-10 mx-auto mb-3 opacity-40" />
                                <p className="text-sm">No recordings yet. Add your first one.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredRecordings.map(r => (
                                    <Card key={r.id} className="bg-zinc-900/40 border-zinc-800 overflow-hidden">
                                        <div className="h-32 bg-zinc-800 relative">
                                            {r.thumbnailUrl ? (
                                                <img src={r.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <FileVideo className="w-8 h-8 text-zinc-600" />
                                                </div>
                                            )}
                                        </div>
                                        <CardContent className="p-4">
                                            <h3 className="text-sm font-bold text-white truncate">{r.title}</h3>
                                            <div className="flex items-center gap-3 mt-2 text-xs text-zinc-400">
                                                {r.duration && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {Math.floor(r.duration / 60)}m</span>}
                                                {r.fileSize && <span>{r.fileSize}</span>}
                                            </div>
                                            <div className="flex items-center gap-2 mt-3">
                                                <Button size="sm" variant="outline" className="border-zinc-700 text-xs h-7" onClick={() => navigator.clipboard.writeText(`${window.location.origin}/watch/${r.shareToken}`).then(() => toast({ title: "Link copied" }))}>
                                                    <Link2 className="w-3 h-3 mr-1" /> Share
                                                </Button>
                                                <Button size="sm" variant="ghost" className="text-zinc-500 hover:text-red-400 h-7 w-7 p-0" onClick={() => deleteRecording.mutate(r.id)}>
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </AdminLayout>
    );
}

function WebinarForm({ onSubmit }: { onSubmit: (data: any) => void }) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [scheduledAt, setScheduledAt] = useState("");
    const [duration, setDuration] = useState("60");

    return (
        <div className="space-y-3 mt-2">
            <Input placeholder="Webinar title" value={title} onChange={e => setTitle(e.target.value)} className="bg-zinc-800 border-zinc-700" />
            <Input placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} className="bg-zinc-800 border-zinc-700" />
            <Input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} className="bg-zinc-800 border-zinc-700" />
            <Input type="number" placeholder="Duration (minutes)" value={duration} onChange={e => setDuration(e.target.value)} className="bg-zinc-800 border-zinc-700" />
            <Button
                className="w-full"
                style={{ background: GOLD, color: "#000" }}
                onClick={() => onSubmit({ title, description, scheduledAt, durationMinutes: parseInt(duration) || 60 })}
                disabled={!title || !scheduledAt}
            >
                Create Webinar
            </Button>
        </div>
    );
}

function VideoForm({ onSubmit }: { onSubmit: (data: any) => void }) {
    const [title, setTitle] = useState("");
    const [videoUrl, setVideoUrl] = useState("");
    const [category, setCategory] = useState("General");

    return (
        <div className="space-y-3 mt-2">
            <Input placeholder="Video title" value={title} onChange={e => setTitle(e.target.value)} className="bg-zinc-800 border-zinc-700" />
            <Input placeholder="Video URL (MP4, YouTube, etc.)" value={videoUrl} onChange={e => setVideoUrl(e.target.value)} className="bg-zinc-800 border-zinc-700" />
            <Input placeholder="Category" value={category} onChange={e => setCategory(e.target.value)} className="bg-zinc-800 border-zinc-700" />
            <Button
                className="w-full"
                style={{ background: GOLD, color: "#000" }}
                onClick={() => onSubmit({ title, videoUrl, category })}
                disabled={!title || !videoUrl}
            >
                Add Video
            </Button>
        </div>
    );
}

function RecordingForm({ onSubmit }: { onSubmit: (data: any) => void }) {
    const [title, setTitle] = useState("");
    const [recordingUrl, setRecordingUrl] = useState("");

    return (
        <div className="space-y-3 mt-2">
            <Input placeholder="Recording title" value={title} onChange={e => setTitle(e.target.value)} className="bg-zinc-800 border-zinc-700" />
            <Input placeholder="Recording URL" value={recordingUrl} onChange={e => setRecordingUrl(e.target.value)} className="bg-zinc-800 border-zinc-700" />
            <Button
                className="w-full"
                style={{ background: GOLD, color: "#000" }}
                onClick={() => onSubmit({ title, recordingUrl })}
                disabled={!title || !recordingUrl}
            >
                Add Recording
            </Button>
        </div>
    );
}

