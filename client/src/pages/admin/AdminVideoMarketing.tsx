import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Users, Layout, MonitorPlay, TrendingUp, Video } from "lucide-react";

export default function AdminVideoMarketing() {
    const [activeTab, setActiveTab] = useState("webinars");
    const { data: webinars = [] } = useQuery({ queryKey: ["/api/webinars"], queryFn: async () => { const r = await apiRequest("GET", "/api/webinars"); return r.json(); } });
    const { data: videos = [] } = useQuery({ queryKey: ["/api/video-events"], queryFn: async () => { const r = await apiRequest("GET", "/api/video-events"); return r.json(); } });
    const { data: recordings = [] } = useQuery({ queryKey: ["/api/webinar-recordings"], queryFn: async () => { const r = await apiRequest("GET", "/api/webinar-recordings"); return r.json(); } });
    const { data: landingPages = [] } = useQuery({ queryKey: ["/api/webinar-landing-pages"], queryFn: async () => { const r = await apiRequest("GET", "/api/webinar-landing-pages"); return r.json(); } });
    const { data: contacts = [] } = useQuery({ queryKey: ["/api/webinar-contacts"], queryFn: async () => { const r = await apiRequest("GET", "/api/webinar-contacts"); return r.json(); } });

    return (
        <AdminLayout>
            <div className="p-6 max-w-7xl mx-auto">
                <h1 className="text-2xl font-bold text-white mb-2">Video Marketing</h1>
                <p className="text-sm text-zinc-500 mb-6">Webinars, recordings, landing pages, and CRM</p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                        <p className="text-xs text-zinc-500">Webinars</p>
                        <p className="text-2xl font-bold text-white">{webinars.length}</p>
                    </div>
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                        <p className="text-xs text-zinc-500">Registrations</p>
                        <p className="text-2xl font-bold text-white">{webinars.reduce((s: number, w: any) => s + (w.registrations || 0), 0)}</p>
                    </div>
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                        <p className="text-xs text-zinc-500">Videos</p>
                        <p className="text-2xl font-bold text-white">{videos.length}</p>
                    </div>
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                        <p className="text-xs text-zinc-500">Recordings</p>
                        <p className="text-2xl font-bold text-white">{recordings.length}</p>
                    </div>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="bg-zinc-900 border border-zinc-800 mb-4 flex-wrap h-auto gap-1 p-1">
                        <TabsTrigger value="webinars" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400">Webinars</TabsTrigger>
                        <TabsTrigger value="videos" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400">Videos</TabsTrigger>
                        <TabsTrigger value="recordings" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400">Recordings</TabsTrigger>
                        <TabsTrigger value="landing-pages" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400">Landing Pages</TabsTrigger>
                        <TabsTrigger value="contacts" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400">CRM</TabsTrigger>
                        <TabsTrigger value="analytics" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400">Analytics</TabsTrigger>
                    </TabsList>

                    <TabsContent value="webinars" className="space-y-4">
                        <h2 className="text-lg font-bold text-white">Webinars</h2>
                        {webinars.length === 0 ? (
                            <p className="text-zinc-600 text-sm py-8 text-center">No webinars yet.</p>
                        ) : (
                            <div className="space-y-3">
                                {webinars.map((w: any) => (
                                    <Card key={w.id} className="bg-zinc-900/40 border-zinc-800">
                                        <CardContent className="p-4">
                                            <h3 className="text-sm font-bold text-white">{w.title}</h3>
                                            <p className="text-xs text-zinc-400 mt-1">{w.description}</p>
                                            <div className="flex items-center gap-4 mt-2">
                                                <span className="text-xs text-zinc-500 flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {w.scheduledAt ? new Date(w.scheduledAt).toLocaleString() : "Not scheduled"}
                                                </span>
                                                <span className="text-xs text-zinc-500 flex items-center gap-1">
                                                    <Users className="w-3 h-3" />
                                                    {w.registrations || 0}
                                                </span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="videos" className="space-y-4">
                        <h2 className="text-lg font-bold text-white">Videos</h2>
                        {videos.length === 0 ? (
                            <p className="text-zinc-600 text-sm py-8 text-center">No videos yet.</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {videos.map((v: any) => (
                                    <Card key={v.id} className="bg-zinc-900/40 border-zinc-800">
                                        <CardContent className="p-4">
                                            <div className="aspect-video rounded-lg bg-zinc-800 mb-3 flex items-center justify-center">
                                                <Video className="w-8 h-8 text-zinc-600" />
                                            </div>
                                            <h3 className="text-sm font-bold text-white">{v.title}</h3>
                                            <p className="text-xs text-zinc-500">{v.category}</p>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="recordings" className="space-y-4">
                        <h2 className="text-lg font-bold text-white">Recordings</h2>
                        {recordings.length === 0 ? (
                            <p className="text-zinc-600 text-sm py-8 text-center">No recordings yet.</p>
                        ) : (
                            <div className="space-y-3">
                                {recordings.map((r: any) => (
                                    <Card key={r.id} className="bg-zinc-900/40 border-zinc-800">
                                        <CardContent className="p-4 flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0">
                                                    <MonitorPlay className="w-5 h-5 text-zinc-500" />
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-bold text-white">{r.title}</h3>
                                                    <p className="text-xs text-zinc-500">{r.duration ? `${r.duration} mins` : "No duration"}</p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="landing-pages" className="space-y-4">
                        <h2 className="text-lg font-bold text-white">Landing Pages</h2>
                        {landingPages.length === 0 ? (
                            <p className="text-zinc-600 text-sm py-8 text-center">No landing pages yet.</p>
                        ) : (
                            <div className="space-y-3">
                                {landingPages.map((lp: any) => (
                                    <Card key={lp.id} className="bg-zinc-900/40 border-zinc-800">
                                        <CardContent className="p-4">
                                            <h3 className="text-sm font-bold text-white">/lp/{lp.slug}</h3>
                                            <p className="text-xs text-zinc-400">{lp.headline}</p>
                                            <div className="flex items-center gap-4 mt-2">
                                                <span className="text-xs text-zinc-500 flex items-center gap-1">
                                                    <Users className="w-3 h-3" />
                                                    {lp.registrations || 0} registrations
                                                </span>
                                                <span className="text-xs text-zinc-500 flex items-center gap-1">
                                                    <Layout className="w-3 h-3" />
                                                    {lp.published ? "Published" : "Draft"}
                                                </span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="contacts" className="space-y-4">
                        <h2 className="text-lg font-bold text-white">CRM / Contacts</h2>
                        {contacts.length === 0 ? (
                            <p className="text-zinc-600 text-sm py-8 text-center">No contacts yet.</p>
                        ) : (
                            <div className="space-y-2">
                                {contacts.map((c: any) => (
                                    <Card key={c.id} className="bg-zinc-900/40 border-zinc-800">
                                        <CardContent className="p-3">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-sm font-bold text-white">{c.name || "Unnamed"}</h3>
                                                    <p className="text-xs text-zinc-400">{c.email}</p>
                                                    <p className="text-xs text-zinc-500">{c.stage} | {c.segment}</p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="analytics" className="space-y-4">
                        <h2 className="text-lg font-bold text-white">Video Analytics</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Card className="bg-zinc-900/40 border-zinc-800">
                                <CardContent className="p-6 text-center">
                                    <TrendingUp className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                                    <p className="text-3xl font-bold text-white">{webinars.reduce((s: number, w: any) => s + (w.views || 0), 0)}</p>
                                    <p className="text-xs text-zinc-500 mt-1">Webinar Views</p>
                                </CardContent>
                            </Card>
                            <Card className="bg-zinc-900/40 border-zinc-800">
                                <CardContent className="p-6 text-center">
                                    <Users className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                                    <p className="text-3xl font-bold text-white">{landingPages.reduce((s: number, lp: any) => s + (lp.registrations || 0), 0)}</p>
                                    <p className="text-xs text-zinc-500 mt-1">Registrations</p>
                                </CardContent>
                            </Card>
                            <Card className="bg-zinc-900/40 border-zinc-800">
                                <CardContent className="p-6 text-center">
                                    <MonitorPlay className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                                    <p className="text-3xl font-bold text-white">{videos.reduce((s: number, v: any) => s + (v.views || 0), 0)}</p>
                                    <p className="text-xs text-zinc-500 mt-1">Video Views</p>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </AdminLayout>
    );
}
