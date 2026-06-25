import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import ClientLayout from "@/components/layout/ClientLayout";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar, Cell,
} from "recharts";
import {
  Users, TrendingUp, TrendingDown, RefreshCw, Trash2, Plus, Instagram,
  ExternalLink, Clock, Activity, Hash, MessageSquare, MapPin, User,
  Eye, Heart, MessageCircle, Search, Loader2, Copy, Check, ChevronDown,
  ChevronUp, Sparkles, BarChart2, Globe, Shield, Link,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

const GOLD = "#d4b461";

// ── helpers ────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

function timeAgo(date: string | Date) {
  try { return formatDistanceToNow(new Date(date), { addSuffix: true }); } catch { return ""; }
}

function copyText(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
}

// ── shared components ──────────────────────────────────────────────────────

function StatBox({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="flex flex-col gap-0.5 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.07]">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">{label}</p>
      <p className="text-2xl font-black" style={{ color: accent || "#fff" }}>{value}</p>
      {sub && <p className="text-[11px] text-zinc-500">{sub}</p>}
    </div>
  );
}

function PostGrid({ posts, accent = GOLD }: { posts: any[]; accent?: string }) {
  const [expanded, setExpanded] = useState<number | null>(null);
  if (!posts.length) return (
    <div className="flex flex-col items-center justify-center py-12 text-zinc-600">
      <Instagram className="w-10 h-10 mb-3 opacity-20" />
      <p className="text-sm">No posts scraped yet</p>
    </div>
  );
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2">
      {posts.map((post, i) => (
        <div key={post.id || i} className="group relative">
          <a
            href={post.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block aspect-square rounded-xl overflow-hidden bg-zinc-900 border border-white/[0.07] hover:border-white/20 transition-all"
          >
            {post.thumbnail
              ? <img src={post.thumbnail} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center"><Instagram className="w-8 h-8 text-zinc-700" /></div>
            }
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 rounded-xl">
              <p className="text-[11px] text-white font-bold">♥ {fmt(post.likes)}</p>
              <p className="text-[10px] text-zinc-300">💬 {fmt(post.comments)}</p>
              {post.views > 0 && <p className="text-[10px] text-zinc-300">👁 {fmt(post.views)}</p>}
            </div>
          </a>
          {post.ownerUsername && (
            <p className="text-[10px] text-zinc-500 truncate mt-1 px-0.5">@{post.ownerUsername}</p>
          )}
          {post.caption && (
            <button
              onClick={() => setExpanded(expanded === i ? null : i)}
              className="text-[10px] text-zinc-600 hover:text-zinc-400 px-0.5 flex items-center gap-1"
            >
              caption {expanded === i ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
            </button>
          )}
          {expanded === i && (
            <div className="mt-1 p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-[11px] text-zinc-400 leading-relaxed">
              {post.caption}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { copyText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-500 hover:text-zinc-300 transition-colors"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

const TooltipContent = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs shadow-2xl">
      <p className="text-zinc-400 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="font-bold">{p.name}: {fmt(p.value)}</p>
      ))}
    </div>
  );
};

// ── TAB 1: Growth Tracker ─────────────────────────────────────────────────

function Delta({ latest, prev }: { latest: number; prev: number | null }) {
  if (prev === null || prev === 0) return null;
  const diff = latest - prev;
  if (diff === 0) return <span className="text-xs text-zinc-600">—</span>;
  const pct = Math.abs((diff / prev) * 100).toFixed(1);
  return (
    <span className={`flex items-center gap-0.5 text-[11px] font-bold ${diff > 0 ? "text-emerald-400" : "text-red-400"}`}>
      {diff > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {diff > 0 ? "+" : ""}{fmt(diff)} ({pct}%)
    </span>
  );
}

function GrowthTracker() {
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [scanningId, setScanningId] = useState<number | null>(null);

  const { data: profiles = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/ig-tracker"] });

  const addMutation = useMutation({
    mutationFn: (u: string) => apiRequest("POST", "/api/ig-tracker", { username: u }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ig-tracker"] });
      setUsername("");
      toast({ title: "Profile added", description: "First snapshot captured." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/ig-tracker/${id}`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["/api/ig-tracker"] });
      if (selectedId === id) setSelectedId(null);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  async function handleScan(id: number) {
    setScanningId(id);
    try {
      await apiRequest("POST", `/api/ig-tracker/${id}/scan`);
      queryClient.invalidateQueries({ queryKey: ["/api/ig-tracker"] });
      if (selectedId === id) queryClient.invalidateQueries({ queryKey: ["/api/ig-tracker", id, "history"] });
      toast({ title: "Scan complete" });
    } catch (e: any) {
      toast({ title: "Scan failed", description: e.message, variant: "destructive" });
    } finally {
      setScanningId(null);
    }
  }

  const { data: history = [] } = useQuery<any[]>({
    queryKey: ["/api/ig-tracker", selectedId, "history"],
    enabled: selectedId !== null,
  });

  const selectedProfile = (profiles as any[]).find((p: any) => p.id === selectedId);
  const chartData = (history as any[]).map((s: any) => ({
    date: new Date(s.scannedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
    Followers: s.followersCount,
    Following: s.followsCount,
  }));

  return (
    <div className="space-y-6">
      {/* Add */}
      <div className="p-5 rounded-2xl border border-white/[0.08] bg-white/[0.02]">
        <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-3">Track Profile</p>
        <div className="flex gap-3">
          <div className="relative flex-1 max-w-sm">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm font-semibold">@</span>
            <Input
              value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={e => e.key === "Enter" && username.trim() && addMutation.mutate(username)}
              placeholder="username"
              className="pl-7 bg-zinc-800/60 border-zinc-700 text-white placeholder:text-zinc-600 focus:border-[#d4b461] h-10"
            />
          </div>
          <Button
            onClick={() => addMutation.mutate(username)}
            disabled={!username.trim() || addMutation.isPending}
            className="gap-2 h-10"
            style={{ background: GOLD, color: "#0a0800" }}
          >
            {addMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {addMutation.isPending ? "Scanning…" : "Track"}
          </Button>
        </div>
        {addMutation.isPending && (
          <p className="text-[11px] text-zinc-500 mt-2 flex items-center gap-1.5">
            <Loader2 className="w-3 h-3 animate-spin" /> Fetching via Apify — ~20s
          </p>
        )}
      </div>

      {/* Profile cards */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-[#d4b461] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (profiles as any[]).length === 0 ? (
        <div className="text-center py-20 border border-dashed border-white/[0.07] rounded-2xl text-zinc-600">
          <Instagram className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p className="text-sm font-medium">No profiles tracked yet</p>
          <p className="text-xs mt-1 text-zinc-700">Add an @username above</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {(profiles as any[]).map((profile: any) => {
            const snap = profile.latestSnapshot;
            const prev = profile.prevSnapshot;
            const isSelected = selectedId === profile.id;
            return (
              <motion.div
                key={profile.id}
                layoutId={`profile-${profile.id}`}
                onClick={() => setSelectedId(isSelected ? null : profile.id)}
                className="rounded-2xl border cursor-pointer transition-all"
                style={{
                  background: isSelected ? `${GOLD}08` : "rgba(255,255,255,0.02)",
                  borderColor: isSelected ? `${GOLD}50` : "rgba(255,255,255,0.07)",
                  boxShadow: isSelected ? `0 0 0 1px ${GOLD}30, 0 0 24px ${GOLD}08` : "none",
                }}
              >
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="relative flex-shrink-0">
                      {profile.profilePic
                        ? <img src={profile.profilePic} alt="" className="w-11 h-11 rounded-full object-cover" />
                        : <div className="w-11 h-11 rounded-full bg-zinc-800 flex items-center justify-center"><Instagram className="w-5 h-5 text-zinc-600" /></div>
                      }
                      <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#0a0a0a]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{profile.fullName || profile.username}</p>
                      <a
                        href={`https://instagram.com/${profile.username}`}
                        target="_blank" rel="noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="flex items-center gap-1 text-xs text-zinc-500 hover:text-[#d4b461] transition-colors"
                      >
                        @{profile.username} <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  </div>

                  {snap ? (
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      {[
                        { label: "Followers", val: snap.followersCount, prev: prev?.followersCount ?? null },
                        { label: "Following", val: snap.followsCount, prev: prev?.followsCount ?? null },
                      ].map(({ label, val, prev: p }) => (
                        <div key={label} className="rounded-xl bg-zinc-800/50 p-3">
                          <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-1">{label}</p>
                          <p className="text-xl font-black text-white">{fmt(val)}</p>
                          <Delta latest={val} prev={p} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl bg-zinc-800/40 p-3 mb-4 text-center text-xs text-zinc-600">No data — scan to start</div>
                  )}

                  {snap && (
                    <p className="text-[10px] text-zinc-600 flex items-center gap-1 mb-3">
                      <Clock className="w-3 h-3" /> {timeAgo(snap.scannedAt)}
                    </p>
                  )}

                  <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                    <Button
                      size="sm" variant="outline"
                      className="flex-1 gap-1.5 text-xs border-zinc-700 hover:border-[#d4b461] hover:text-[#d4b461] h-8"
                      onClick={() => handleScan(profile.id)}
                      disabled={scanningId === profile.id}
                    >
                      <RefreshCw className={`w-3 h-3 ${scanningId === profile.id ? "animate-spin" : ""}`} />
                      {scanningId === profile.id ? "Scanning…" : "Scan"}
                    </Button>
                    <Button
                      size="sm" variant="ghost"
                      className="text-zinc-600 hover:text-red-400 hover:bg-red-400/10 h-8 w-8 p-0"
                      onClick={() => deleteMutation.mutate(profile.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Chart */}
      {selectedId !== null && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-white">Growth — @{selectedProfile?.username}</h3>
              <p className="text-xs text-zinc-500 mt-0.5">{(history as any[]).length} data points</p>
            </div>
            <div className="flex gap-4 text-xs text-zinc-500">
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded-full inline-block" style={{ background: GOLD }} />Followers</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded-full inline-block bg-blue-400" />Following</span>
            </div>
          </div>
          {chartData.length < 2 ? (
            <div className="text-center py-12 text-zinc-600">
              <BarChart2 className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Need 2+ scans to show trend</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" tick={{ fill: "#52525b", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#52525b", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={fmt} width={52} />
                <Tooltip content={<TooltipContent />} />
                <Line type="monotone" dataKey="Followers" stroke={GOLD} strokeWidth={2.5} dot={{ fill: GOLD, r: 4, strokeWidth: 0 }} activeDot={{ r: 6, fill: GOLD }} />
                <Line type="monotone" dataKey="Following" stroke="#60a5fa" strokeWidth={2} dot={{ fill: "#60a5fa", r: 3, strokeWidth: 0 }} activeDot={{ r: 5, fill: "#60a5fa" }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </motion.div>
      )}
    </div>
  );
}

// ── TAB 2: Hashtag Scout ──────────────────────────────────────────────────

function HashtagScout() {
  const { toast } = useToast();
  const [hashtag, setHashtag] = useState("");
  const [limit, setLimit] = useState(30);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  async function handleScrape() {
    if (!hashtag.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const data = await apiRequest("POST", "/api/ig-scraper/hashtag", {
        hashtag: hashtag.trim().replace(/^#/, ""),
        limit,
      });
      setResult(data);
    } catch (e: any) {
      toast({ title: "Scrape failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  const CHART_COLORS = [GOLD, "#e879a0", "#60a5fa", "#34d399", "#a78bfa", "#fb923c"];
  const topPostsByLikes = result?.posts?.slice().sort((a: any, b: any) => b.likes - a.likes).slice(0, 8) || [];

  return (
    <div className="space-y-5">
      {/* Input */}
      <div className="p-5 rounded-2xl border border-white/[0.08] bg-white/[0.02]">
        <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-3">Hashtag Explorer</p>
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">#</span>
            <Input
              value={hashtag}
              onChange={e => setHashtag(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleScrape()}
              placeholder="entrepreneurship"
              className="pl-7 bg-zinc-800/60 border-zinc-700 text-white placeholder:text-zinc-600 focus:border-[#d4b461] h-10"
            />
          </div>
          <select
            value={limit}
            onChange={e => setLimit(Number(e.target.value))}
            className="bg-zinc-800/60 border border-zinc-700 text-zinc-300 rounded-lg px-3 h-10 text-sm"
          >
            <option value={10}>10 posts</option>
            <option value={20}>20 posts</option>
            <option value={30}>30 posts</option>
            <option value={50}>50 posts</option>
          </select>
          <Button onClick={handleScrape} disabled={loading || !hashtag.trim()} className="gap-2 h-10" style={{ background: GOLD, color: "#0a0800" }}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {loading ? "Scraping…" : "Scrape"}
          </Button>
        </div>
        {loading && <p className="text-[11px] text-zinc-500 mt-2 flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" />Pulling posts from #{hashtag} — 30-60s</p>}
      </div>

      {result && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatBox label="Posts scraped" value={String(result.postCount)} />
            <StatBox label="Avg Likes" value={fmt(result.avgLikes)} accent="#e879a0" />
            <StatBox label="Avg Comments" value={fmt(result.avgComments)} accent="#60a5fa" />
            <StatBox label="Avg Views" value={fmt(result.avgViews)} accent={GOLD} />
          </div>

          {/* Top posts by engagement bar chart */}
          {topPostsByLikes.length > 0 && (
            <div className="p-5 rounded-2xl border border-white/[0.07] bg-white/[0.02]">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4">Top Posts by Likes</p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={topPostsByLikes.map((p: any, i: number) => ({ name: `#${i + 1}`, likes: p.likes, comments: p.comments, views: p.views }))} barGap={4}>
                  <XAxis dataKey="name" tick={{ fill: "#52525b", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#52525b", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={fmt} width={44} />
                  <Tooltip content={<TooltipContent />} />
                  <Bar dataKey="likes" name="Likes" fill="#e879a0" radius={[4, 4, 0, 0]}>
                    {topPostsByLikes.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Top accounts */}
          {result.topAccounts?.length > 0 && (
            <div className="p-5 rounded-2xl border border-white/[0.07] bg-white/[0.02]">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Top Creators in #{result.hashtag}</p>
              <div className="flex flex-wrap gap-2">
                {result.topAccounts.map((acc: any) => (
                  <a
                    key={acc.ownerUsername}
                    href={`https://instagram.com/${acc.ownerUsername}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-800/60 border border-zinc-700 hover:border-[#d4b461] hover:text-[#d4b461] transition-colors text-xs text-zinc-400"
                  >
                    <User className="w-3 h-3" />@{acc.ownerUsername}
                    <ExternalLink className="w-2.5 h-2.5 opacity-50" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Post grid */}
          <div className="p-5 rounded-2xl border border-white/[0.07] bg-white/[0.02]">
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4">Scraped Posts</p>
            <PostGrid posts={result.posts} />
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ── TAB 3: Comment Miner ──────────────────────────────────────────────────

function CommentMiner() {
  const { toast } = useToast();
  const [postUrl, setPostUrl] = useState("");
  const [limit, setLimit] = useState(100);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [search, setSearch] = useState("");

  async function handleScrape() {
    if (!postUrl.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const data = await apiRequest("POST", "/api/ig-scraper/comments", { postUrl: postUrl.trim(), limit });
      setResult(data);
    } catch (e: any) {
      toast({ title: "Scrape failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  const filtered = result?.comments?.filter((c: any) =>
    !search || c.text.toLowerCase().includes(search.toLowerCase()) || c.ownerUsername?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div className="space-y-5">
      <div className="p-5 rounded-2xl border border-white/[0.08] bg-white/[0.02]">
        <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-3">Comment Miner</p>
        <div className="flex gap-3 flex-wrap">
          <Input
            value={postUrl}
            onChange={e => setPostUrl(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleScrape()}
            placeholder="https://www.instagram.com/p/... or /reel/..."
            className="flex-1 min-w-[280px] bg-zinc-800/60 border-zinc-700 text-white placeholder:text-zinc-600 focus:border-[#d4b461] h-10"
          />
          <select
            value={limit}
            onChange={e => setLimit(Number(e.target.value))}
            className="bg-zinc-800/60 border border-zinc-700 text-zinc-300 rounded-lg px-3 h-10 text-sm"
          >
            <option value={50}>50 comments</option>
            <option value={100}>100 comments</option>
            <option value={200}>200 comments</option>
          </select>
          <Button onClick={handleScrape} disabled={loading || !postUrl.trim()} className="gap-2 h-10" style={{ background: GOLD, color: "#0a0800" }}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
            {loading ? "Mining…" : "Mine"}
          </Button>
        </div>
        {loading && <p className="text-[11px] text-zinc-500 mt-2 flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" />Pulling comments — 30-60s</p>}
      </div>

      {result && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <StatBox label="Comments pulled" value={fmt(result.commentCount)} accent={GOLD} />
            <StatBox label="Unique commenters" value={fmt(new Set(result.comments.map((c: any) => c.ownerUsername)).size)} accent="#e879a0" />
          </div>

          {/* Top keywords */}
          {result.topKeywords?.length > 0 && (
            <div className="p-5 rounded-2xl border border-white/[0.07] bg-white/[0.02]">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-3.5 h-3.5" style={{ color: GOLD }} />
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Top Keywords in Comments</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {result.topKeywords.slice(0, 20).map(({ word, count }: any, i: number) => (
                  <span
                    key={word}
                    className="px-2.5 py-1 rounded-full text-xs font-semibold border"
                    style={{
                      opacity: 0.5 + (i / 20) * 0.5,
                      background: `${GOLD}10`,
                      borderColor: `${GOLD}30`,
                      color: GOLD,
                      fontSize: `${11 + Math.max(0, 5 - i)}px`,
                    }}
                  >
                    {word} <span className="opacity-60">×{count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Comment list */}
          <div className="p-5 rounded-2xl border border-white/[0.07] bg-white/[0.02]">
            <div className="flex items-center gap-3 mb-4">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex-1">Comments ({result.commentCount})</p>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Filter…"
                  className="pl-8 h-8 bg-zinc-800/60 border-zinc-700 text-white placeholder:text-zinc-600 text-xs w-48"
                />
              </div>
            </div>
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {filtered.slice(0, 200).map((c: any, i: number) => (
                <div key={c.id || i} className="flex gap-3 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 group">
                  <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {c.ownerProfilePic
                      ? <img src={c.ownerProfilePic} alt="" className="w-full h-full object-cover" />
                      : <User className="w-3.5 h-3.5 text-zinc-600" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <a href={`https://instagram.com/${c.ownerUsername}`} target="_blank" rel="noopener noreferrer"
                        className="text-[11px] font-bold text-zinc-400 hover:text-[#d4b461] transition-colors">
                        @{c.ownerUsername}
                      </a>
                      {c.likesCount > 0 && <span className="text-[10px] text-zinc-600">♥ {c.likesCount}</span>}
                      {c.timestamp && <span className="text-[10px] text-zinc-700">{timeAgo(c.timestamp)}</span>}
                    </div>
                    <p className="text-[13px] text-zinc-300 leading-relaxed">{c.text}</p>
                  </div>
                  <CopyBtn text={c.text} />
                </div>
              ))}
              {filtered.length === 0 && <p className="text-center py-8 text-sm text-zinc-600">No comments match your filter</p>}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ── TAB 4: Location Spy ────────────────────────────────────────────────────

function LocationSpy() {
  const { toast } = useToast();
  const [location, setLocation] = useState("");
  const [limit, setLimit] = useState(30);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  async function handleScrape() {
    if (!location.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const data = await apiRequest("POST", "/api/ig-scraper/location", { location: location.trim(), limit });
      setResult(data);
    } catch (e: any) {
      toast({ title: "Scrape failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="p-5 rounded-2xl border border-white/[0.08] bg-white/[0.02]">
        <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-3">Location Scout</p>
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
            <Input
              value={location}
              onChange={e => setLocation(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleScrape()}
              placeholder="New York, Dubai, Bali…"
              className="pl-9 bg-zinc-800/60 border-zinc-700 text-white placeholder:text-zinc-600 focus:border-[#d4b461] h-10"
            />
          </div>
          <select
            value={limit}
            onChange={e => setLimit(Number(e.target.value))}
            className="bg-zinc-800/60 border border-zinc-700 text-zinc-300 rounded-lg px-3 h-10 text-sm"
          >
            <option value={10}>10 posts</option>
            <option value={20}>20 posts</option>
            <option value={30}>30 posts</option>
            <option value={50}>50 posts</option>
          </select>
          <Button onClick={handleScrape} disabled={loading || !location.trim()} className="gap-2 h-10" style={{ background: GOLD, color: "#0a0800" }}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
            {loading ? "Scouting…" : "Scout"}
          </Button>
        </div>
        {loading && <p className="text-[11px] text-zinc-500 mt-2 flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" />Pulling location posts — 30-60s</p>}
      </div>

      {result && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          <StatBox label={`Posts at ${result.location}`} value={fmt(result.postCount)} accent={GOLD} />
          <div className="p-5 rounded-2xl border border-white/[0.07] bg-white/[0.02]">
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4">📍 Posts from {result.location}</p>
            <PostGrid posts={result.posts} />
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ── TAB 5: Profile Deep Dive ──────────────────────────────────────────────

function ProfileDeepDive() {
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [limit, setLimit] = useState(30);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  async function handleScrape() {
    if (!username.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const data = await apiRequest("POST", "/api/ig-scraper/profile-posts", {
        username: username.trim().replace(/^@/, ""),
        limit,
      });
      setResult(data);
    } catch (e: any) {
      toast({ title: "Scrape failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  const allHashtags = result?.posts?.flatMap((p: any) => p.hashtags || []) || [];
  const hashtagFreq: Record<string, number> = {};
  for (const h of allHashtags) { hashtagFreq[h] = (hashtagFreq[h] || 0) + 1; }
  const topHashtags = Object.entries(hashtagFreq).sort(([, a], [, b]) => b - a).slice(0, 15);

  return (
    <div className="space-y-5">
      <div className="p-5 rounded-2xl border border-white/[0.08] bg-white/[0.02]">
        <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-3">Profile Deep Dive</p>
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">@</span>
            <Input
              value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleScrape()}
              placeholder="username"
              className="pl-7 bg-zinc-800/60 border-zinc-700 text-white placeholder:text-zinc-600 focus:border-[#d4b461] h-10"
            />
          </div>
          <select
            value={limit}
            onChange={e => setLimit(Number(e.target.value))}
            className="bg-zinc-800/60 border border-zinc-700 text-zinc-300 rounded-lg px-3 h-10 text-sm"
          >
            <option value={15}>15 posts</option>
            <option value={30}>30 posts</option>
            <option value={50}>50 posts</option>
          </select>
          <Button onClick={handleScrape} disabled={loading || !username.trim()} className="gap-2 h-10" style={{ background: GOLD, color: "#0a0800" }}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <User className="w-4 h-4" />}
            {loading ? "Diving…" : "Deep Dive"}
          </Button>
        </div>
        {loading && <p className="text-[11px] text-zinc-500 mt-2 flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" />Scraping full profile — 30-60s</p>}
      </div>

      {result && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          {/* Profile card */}
          {result.profile && (
            <div className="p-5 rounded-2xl border border-white/[0.08] bg-white/[0.02]">
              <div className="flex items-start gap-4 mb-5">
                <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden flex-shrink-0 border-2" style={{ borderColor: `${GOLD}40` }}>
                  {result.profile.profilePic
                    ? <img src={result.profile.profilePic} alt="" className="w-full h-full object-cover" />
                    : <Instagram className="w-7 h-7 text-zinc-600" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-black text-white">{result.profile.fullName || result.username}</h3>
                    {result.profile.isVerified && <Shield className="w-4 h-4 text-blue-400" />}
                  </div>
                  <a href={`https://instagram.com/${result.username}`} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-zinc-500 hover:text-[#d4b461] transition-colors flex items-center gap-1">
                    @{result.username} <ExternalLink className="w-3 h-3" />
                  </a>
                  {result.profile.category && <Badge className="mt-1 text-[10px] bg-zinc-800 text-zinc-400 border-zinc-700">{result.profile.category}</Badge>}
                  {result.profile.bio && <p className="mt-2 text-sm text-zinc-400 leading-relaxed">{result.profile.bio}</p>}
                  {result.profile.website && (
                    <a href={result.profile.website} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 mt-1.5">
                      <Link className="w-3 h-3" />{result.profile.website}
                    </a>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <StatBox label="Followers" value={fmt(result.profile.followers)} accent={GOLD} />
                <StatBox label="Following" value={fmt(result.profile.following)} />
                <StatBox label="Posts" value={fmt(result.profile.postCount)} accent="#60a5fa" />
              </div>
            </div>
          )}

          {/* Avg stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatBox label="Posts scraped" value={String(result.postCount)} />
            <StatBox label="Avg Likes" value={fmt(result.avgLikes)} accent="#e879a0" />
            <StatBox label="Avg Views" value={fmt(result.avgViews)} accent="#60a5fa" />
            {result.profile && <StatBox label="Engagement %" value={result.profile.followers ? `${((result.avgLikes / result.profile.followers) * 100).toFixed(2)}%` : "—"} accent="#34d399" />}
          </div>

          {/* Top hashtags used */}
          {topHashtags.length > 0 && (
            <div className="p-5 rounded-2xl border border-white/[0.07] bg-white/[0.02]">
              <div className="flex items-center gap-2 mb-3">
                <Hash className="w-3.5 h-3.5 text-zinc-500" />
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Most Used Hashtags</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {topHashtags.map(([tag, count]) => (
                  <a key={tag} href={`https://instagram.com/explore/tags/${tag}/`} target="_blank" rel="noopener noreferrer"
                    className="px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors hover:border-[#d4b461] hover:text-[#d4b461]"
                    style={{ background: `${GOLD}08`, borderColor: `${GOLD}25`, color: GOLD }}
                  >
                    #{tag} <span className="opacity-50">×{count}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Posts grid */}
          <div className="p-5 rounded-2xl border border-white/[0.07] bg-white/[0.02]">
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4">Recent Posts</p>
            <PostGrid posts={result.posts} />
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

const TABS = [
  { id: "growth", label: "Growth Tracker", icon: TrendingUp, desc: "Follower & following over time" },
  { id: "hashtag", label: "Hashtag Scout", icon: Hash, desc: "Viral posts by hashtag" },
  { id: "comments", label: "Comment Miner", icon: MessageCircle, desc: "Pull & analyse comments" },
  { id: "location", label: "Location Spy", icon: MapPin, desc: "Posts by place" },
  { id: "profile", label: "Profile Deep Dive", icon: User, desc: "Full profile + post scrape" },
] as const;

type TabId = typeof TABS[number]["id"];

export default function IgGrowthTracker() {
  const [activeTab, setActiveTab] = useState<TabId>("growth");
  const active = TABS.find(t => t.id === activeTab)!;

  return (
    <ClientLayout>
      <div className="min-h-screen bg-[#080808] p-6 lg:p-8 max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${GOLD}22, ${GOLD}08)`, border: `1px solid ${GOLD}30` }}
            >
              <Instagram className="w-5 h-5" style={{ color: GOLD }} />
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight">Instagram Intelligence Hub</h1>
              <p className="text-xs text-zinc-500">Growth · Hashtags · Comments · Locations · Profiles — all in one place</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-3 ml-0.5">
            <Activity className="w-3 h-3 text-emerald-400" />
            <span className="text-[11px] text-zinc-600">Powered by Apify · Live Instagram data · Auto-scan daily at 6AM UTC</span>
          </div>
        </div>

        {/* Tab nav */}
        <div className="flex gap-2 flex-wrap mb-6">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: isActive ? GOLD : "rgba(255,255,255,0.04)",
                  color: isActive ? "#0a0800" : "rgba(255,255,255,0.45)",
                  border: `1px solid ${isActive ? GOLD : "rgba(255,255,255,0.07)"}`,
                  boxShadow: isActive ? `0 0 20px ${GOLD}30` : "none",
                }}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Active tab description */}
        <div className="flex items-center gap-2 mb-6 px-1">
          <active.icon className="w-4 h-4 text-zinc-500" />
          <p className="text-sm text-zinc-500">{active.desc}</p>
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === "growth" && <GrowthTracker />}
            {activeTab === "hashtag" && <HashtagScout />}
            {activeTab === "comments" && <CommentMiner />}
            {activeTab === "location" && <LocationSpy />}
            {activeTab === "profile" && <ProfileDeepDive />}
          </motion.div>
        </AnimatePresence>
      </div>
    </ClientLayout>
  );
}
