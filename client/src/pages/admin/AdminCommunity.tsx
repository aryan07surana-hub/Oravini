import { useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Heart, MessageCircle, Pin, Trash2, Send, Trophy,
  HelpCircle, Megaphone, BookOpen, Users2, ChevronDown,
  ChevronUp, MessageSquare, Star, BarChart2
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const CHANNELS = [
  { id: "announcements", label: "Announcements", icon: Megaphone,   color: "text-[#d4b461]"    },
  { id: "wins",          label: "Wins",           icon: Trophy,      color: "text-emerald-400"  },
  { id: "qa",            label: "Q&A",            icon: HelpCircle,  color: "text-blue-400"     },
  { id: "general",       label: "General",        icon: Users2,      color: "text-zinc-300"     },
  { id: "resources",     label: "Resources",      icon: BookOpen,    color: "text-violet-400"   },
];

const PLAN_BADGE: Record<string, string> = {
  elite:   "border-[#d4b461]/60 text-[#d4b461]",
  pro:     "border-emerald-500/40 text-emerald-400",
  growth:  "border-violet-500/40 text-violet-400",
  starter: "border-blue-500/40 text-blue-400",
  free:    "border-zinc-600 text-zinc-400",
};

function initials(name?: string) {
  return (name ?? "?").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

interface Post {
  id: number;
  user_id: string;
  channel: string;
  content: string;
  parent_id: number | null;
  is_pinned: boolean;
  created_at: string;
  author_name?: string;
  author_email?: string;
  author_plan?: string;
  like_count: number;
  liked_by_me: boolean;
}

function ReplyRow({ reply, onDelete, onLike }: { reply: Post; onDelete: (id: number) => void; onLike: (id: number) => void }) {
  return (
    <div className="flex gap-3 py-2 group border-b border-zinc-800/30 last:border-0">
      <Avatar className="w-6 h-6 shrink-0 mt-0.5">
        <AvatarFallback className="bg-zinc-800 text-zinc-400 text-[9px] font-semibold">
          {initials(reply.author_name)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className="text-xs font-semibold text-white">{reply.author_name ?? "Member"}</span>
          {reply.author_plan && (
            <Badge variant="outline" className={`text-[10px] h-4 px-1 ${PLAN_BADGE[reply.author_plan] ?? ""}`}>
              {reply.author_plan}
            </Badge>
          )}
          <span className="text-xs text-zinc-600">{formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}</span>
          <button
            onClick={() => onDelete(reply.id)}
            className="ml-auto opacity-0 group-hover:opacity-100 flex items-center gap-1 text-xs text-zinc-700 hover:text-red-400 transition-all"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
        <p className="text-xs text-zinc-400 whitespace-pre-wrap break-words">{reply.content}</p>
        <button
          onClick={() => onLike(reply.id)}
          className={`mt-1 flex items-center gap-1 text-[11px] transition-colors ${reply.liked_by_me ? "text-pink-400" : "text-zinc-700 hover:text-pink-400"}`}
        >
          <Heart className={`w-3 h-3 ${reply.liked_by_me ? "fill-pink-400" : ""}`} />
          {reply.like_count > 0 && reply.like_count}
        </button>
      </div>
    </div>
  );
}

function PostRow({ post, isQA, onDelete, onLike, onPin }: {
  post: Post;
  isQA: boolean;
  onDelete: (id: number) => void;
  onLike: (id: number) => void;
  onPin: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [composing, setComposing] = useState(false);
  const [replyText, setReplyText] = useState("");
  const { toast } = useToast();

  const { data: replies = [], refetch } = useQuery<Post[]>({
    queryKey: ["/api/community/posts", post.id, "replies"],
    queryFn: () => apiRequest("GET", `/api/community/posts/${post.id}/replies`),
    enabled: expanded,
  });

  const submitReply = useMutation({
    mutationFn: (content: string) =>
      apiRequest("POST", "/api/community/posts", { channel: post.channel, content, parent_id: post.id }),
    onSuccess: () => {
      setReplyText("");
      setComposing(false);
      setExpanded(true);
      refetch();
      queryClient.invalidateQueries({ queryKey: ["/api/community/posts"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className={`border rounded-xl px-4 py-3 mb-3 transition-all ${post.is_pinned ? "border-[#d4b461]/30 bg-[#d4b461]/[0.03]" : "border-zinc-800 bg-zinc-950/40"}`}>
      <div className="flex gap-3">
        <Avatar className="w-8 h-8 shrink-0 mt-0.5">
          <AvatarFallback className="bg-zinc-800 text-zinc-300 text-xs font-semibold">
            {initials(post.author_name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {isQA && <span className="text-[10px] font-bold uppercase tracking-wide text-blue-400 border border-blue-400/30 rounded px-1.5 py-0.5">Q</span>}
            <span className="text-sm font-semibold text-white">{post.author_name ?? "Member"}</span>
            {post.author_plan && (
              <Badge variant="outline" className={`text-[10px] h-4 px-1.5 ${PLAN_BADGE[post.author_plan] ?? ""}`}>
                {post.author_plan}
              </Badge>
            )}
            {post.author_email && (
              <span className="text-[11px] text-zinc-600">{post.author_email}</span>
            )}
            {post.is_pinned && (
              <span className="flex items-center gap-1 text-[10px] text-[#d4b461] font-medium ml-1">
                <Pin className="w-2.5 h-2.5" /> Pinned
              </span>
            )}
            <span className="text-xs text-zinc-600 ml-auto">
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            </span>
          </div>

          <p className="text-sm text-zinc-300 whitespace-pre-wrap break-words leading-relaxed mb-2">{post.content}</p>

          {/* Action row */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => onLike(post.id)}
              className={`flex items-center gap-1.5 text-xs transition-colors ${post.liked_by_me ? "text-pink-400" : "text-zinc-600 hover:text-pink-400"}`}
            >
              <Heart className={`w-3.5 h-3.5 ${post.liked_by_me ? "fill-pink-400" : ""}`} />
              {post.like_count > 0 && <span>{post.like_count}</span>}
            </button>

            <button
              onClick={() => { setComposing(!composing); setExpanded(true); }}
              className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-blue-400 transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>{isQA ? "Answer" : "Reply"}</span>
            </button>

            <button
              onClick={() => setExpanded(v => !v)}
              className="flex items-center gap-1 text-xs text-zinc-600 hover:text-zinc-300 transition-colors"
            >
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {expanded ? "Collapse" : "View replies"}
            </button>

            <button
              onClick={() => onPin(post.id)}
              className={`flex items-center gap-1 text-xs transition-colors ${post.is_pinned ? "text-[#d4b461]" : "text-zinc-600 hover:text-[#d4b461]"}`}
            >
              <Pin className="w-3 h-3" />
              {post.is_pinned ? "Unpin" : "Pin"}
            </button>

            <button
              onClick={() => onDelete(post.id)}
              className="flex items-center gap-1 text-xs text-zinc-700 hover:text-red-400 transition-colors ml-auto"
            >
              <Trash2 className="w-3 h-3" />
              Delete
            </button>
          </div>

          {/* Reply composer */}
          {composing && (
            <div className="mt-3 flex gap-2">
              <Textarea
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                placeholder={isQA ? "Write an answer as Admin…" : "Write a reply as Admin…"}
                className="min-h-[52px] text-sm bg-zinc-900 border-zinc-700 resize-none flex-1"
                onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && replyText.trim()) submitReply.mutate(replyText); }}
              />
              <Button
                size="sm"
                disabled={!replyText.trim() || submitReply.isPending}
                onClick={() => replyText.trim() && submitReply.mutate(replyText)}
                className="self-end bg-[#d4b461] hover:bg-[#c4a450] text-black"
              >
                <Send className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}

          {/* Replies */}
          {expanded && (
            <div className="mt-3 border-l-2 border-zinc-800 pl-3">
              {replies.length === 0 ? (
                <p className="text-xs text-zinc-700 py-1">No replies yet.</p>
              ) : (
                replies.map(r => (
                  <ReplyRow
                    key={r.id}
                    reply={r}
                    onDelete={onDelete}
                    onLike={onLike}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminCommunity() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeChannel, setActiveChannel] = useState("announcements");
  const [postText, setPostText] = useState("");
  const isQA = activeChannel === "qa";

  const { data: posts = [], isLoading } = useQuery<Post[]>({
    queryKey: ["/api/community/posts", activeChannel],
    queryFn: () => apiRequest("GET", `/api/community/posts?channel=${activeChannel}`),
    refetchInterval: 15000,
  });

  const createPost = useMutation({
    mutationFn: (content: string) =>
      apiRequest("POST", "/api/community/posts", { channel: activeChannel, content }),
    onSuccess: () => {
      setPostText("");
      queryClient.invalidateQueries({ queryKey: ["/api/community/posts", activeChannel] });
      toast({ title: "Posted", description: "Your message has been posted." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deletePost = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/community/posts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community/posts", activeChannel] });
      toast({ title: "Deleted" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const likePost = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/community/posts/${id}/like`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/community/posts", activeChannel] }),
  });

  const pinPost = useMutation({
    mutationFn: (id: number) => apiRequest("PATCH", `/api/community/posts/${id}/pin`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/community/posts", activeChannel] }),
  });

  const channel = CHANNELS.find(c => c.id === activeChannel)!;
  const ChannelIcon = channel.icon;
  const pinnedCount = posts.filter(p => p.is_pinned).length;
  const totalPosts = posts.length;

  return (
    <AdminLayout>
      <div className="flex h-screen overflow-hidden">

        {/* Channel sidebar */}
        <aside className="w-56 shrink-0 border-r border-zinc-800 bg-zinc-950/50 flex flex-col">
          <div className="px-4 py-4 border-b border-zinc-800">
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Channels</p>
          </div>
          <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
            {CHANNELS.map(({ id, label, icon: Icon, color }) => (
              <button
                key={id}
                onClick={() => setActiveChannel(id)}
                data-testid={`admin-channel-${id}`}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${
                  activeChannel === id
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900"
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${activeChannel === id ? color : ""}`} />
                <span>{label}</span>
              </button>
            ))}
          </nav>

          {/* Stats pill */}
          <div className="p-3 border-t border-zinc-800 space-y-1">
            <div className="flex items-center justify-between px-2">
              <span className="text-[10px] text-zinc-600">Posts</span>
              <span className="text-[10px] font-semibold text-zinc-400">{totalPosts}</span>
            </div>
            <div className="flex items-center justify-between px-2">
              <span className="text-[10px] text-zinc-600">Pinned</span>
              <span className="text-[10px] font-semibold text-[#d4b461]">{pinnedCount}</span>
            </div>
          </div>
        </aside>

        {/* Main area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* Channel header */}
          <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-950/30 flex items-center gap-3">
            <ChannelIcon className={`w-5 h-5 ${channel.color}`} />
            <div>
              <h1 className="text-base font-bold text-white">#{channel.label}</h1>
              <p className="text-xs text-zinc-500">{totalPosts} post{totalPosts !== 1 ? "s" : ""} · {pinnedCount} pinned</p>
            </div>
            <Badge variant="outline" className="ml-auto text-[#d4b461] border-[#d4b461]/30 text-xs">
              Admin View
            </Badge>
          </div>

          {/* Posts */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {isLoading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => (
                  <div key={i} className="h-24 rounded-xl bg-zinc-900/50 animate-pulse" />
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <ChannelIcon className={`w-10 h-10 ${channel.color} opacity-20 mb-3`} />
                <p className="text-zinc-500 text-sm">No posts in #{channel.label} yet</p>
              </div>
            ) : (
              posts.map(post => (
                <PostRow
                  key={post.id}
                  post={post}
                  isQA={isQA}
                  onDelete={(id) => deletePost.mutate(id)}
                  onLike={(id) => likePost.mutate(id)}
                  onPin={(id) => pinPost.mutate(id)}
                />
              ))
            )}
          </div>

          {/* Admin compose */}
          <div className="px-6 pb-5 pt-3 border-t border-zinc-800 bg-zinc-950/30">
            <p className="text-[10px] font-semibold text-[#d4b461] uppercase tracking-wider mb-2">
              Post as Brandverse Admin
            </p>
            <div className="flex gap-3 items-end">
              <Textarea
                value={postText}
                onChange={e => setPostText(e.target.value)}
                placeholder={`Write a message in #${channel.label}… (Ctrl+Enter to post)`}
                className="min-h-[56px] max-h-[140px] text-sm bg-zinc-900 border-zinc-700 resize-none flex-1"
                data-testid="admin-community-compose"
                onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && postText.trim()) createPost.mutate(postText); }}
              />
              <Button
                disabled={!postText.trim() || createPost.isPending}
                onClick={() => postText.trim() && createPost.mutate(postText)}
                data-testid="admin-community-submit"
                className="bg-[#d4b461] hover:bg-[#c4a450] text-black font-semibold h-10 px-4"
              >
                {createPost.isPending ? "…" : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
