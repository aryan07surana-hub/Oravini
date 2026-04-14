import { useState, useRef } from "react";
import ClientLayout from "@/components/layout/ClientLayout";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Heart, MessageCircle, Pin, Trash2, Send, Trophy, HelpCircle, Megaphone, BookOpen, Users2, ChevronDown, ChevronUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const CHANNELS = [
  { id: "announcements", label: "Announcements", icon: Megaphone, color: "text-[#d4b461]", desc: "Updates from the Oravini team" },
  { id: "wins",         label: "Wins",          icon: Trophy,     color: "text-emerald-400", desc: "Share your wins & milestones" },
  { id: "qa",           label: "Q&A",           icon: HelpCircle, color: "text-blue-400",    desc: "Ask questions, get answers" },
  { id: "general",      label: "General",       icon: Users2,     color: "text-zinc-300",    desc: "Open conversation" },
  { id: "resources",    label: "Resources",     icon: BookOpen,   color: "text-violet-400",  desc: "Tools, links & templates" },
];

const PLAN_BADGE: Record<string, string> = {
  elite:   "border-[#d4b461]/60 text-[#d4b461]",
  pro:     "border-emerald-500/40 text-emerald-400",
  growth:  "border-violet-500/40 text-violet-400",
  starter: "border-blue-500/40 text-blue-400",
  free:    "border-zinc-600 text-zinc-400",
};

function authorInitials(name?: string) {
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

function PostCard({
  post,
  currentUserId,
  isAdmin,
  onDelete,
  onLike,
  onPin,
  depth = 0,
}: {
  post: Post;
  currentUserId: string;
  isAdmin: boolean;
  onDelete: (id: number) => void;
  onLike: (id: number) => void;
  onPin: (id: number) => void;
  depth?: number;
}) {
  const [showReplies, setShowReplies] = useState(false);
  const [composing, setComposing] = useState(false);
  const [replyText, setReplyText] = useState("");
  const { toast } = useToast();
  const { data: replies = [], refetch: refetchReplies } = useQuery<Post[]>({
    queryKey: ["/api/community/posts", post.id, "replies"],
    queryFn: () => apiRequest("GET", `/api/community/posts/${post.id}/replies`),
    enabled: showReplies,
  });

  const submitReply = useMutation({
    mutationFn: (content: string) =>
      apiRequest("POST", "/api/community/posts", { channel: post.channel, content, parent_id: post.id }),
    onSuccess: () => {
      setReplyText("");
      setComposing(false);
      setShowReplies(true);
      refetchReplies();
      queryClient.invalidateQueries({ queryKey: ["/api/community/posts"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className={`group ${depth > 0 ? "ml-8 pl-4 border-l border-zinc-800" : ""}`}>
      <div className="flex gap-3 py-3">
        <Avatar className="w-8 h-8 shrink-0 mt-0.5">
          <AvatarFallback className="bg-zinc-800 text-zinc-300 text-xs font-semibold">
            {authorInitials(post.author_name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-sm font-semibold text-white">{post.author_name ?? "Member"}</span>
            {post.author_plan && (
              <Badge variant="outline" className={`text-[10px] h-4 px-1.5 ${PLAN_BADGE[post.author_plan] ?? ""}`}>
                {post.author_plan}
              </Badge>
            )}
            {post.is_pinned && (
              <span className="flex items-center gap-1 text-[10px] text-[#d4b461] font-medium">
                <Pin className="w-2.5 h-2.5" /> Pinned
              </span>
            )}
            <span className="text-xs text-zinc-600">
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            </span>
          </div>
          <p className="text-sm text-zinc-300 whitespace-pre-wrap break-words leading-relaxed">{post.content}</p>

          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={() => onLike(post.id)}
              data-testid={`btn-like-post-${post.id}`}
              className={`flex items-center gap-1.5 text-xs transition-colors ${post.liked_by_me ? "text-pink-400" : "text-zinc-600 hover:text-pink-400"}`}
            >
              <Heart className={`w-3.5 h-3.5 ${post.liked_by_me ? "fill-pink-400" : ""}`} />
              {post.like_count > 0 && <span>{post.like_count}</span>}
            </button>
            {depth === 0 && (
              <button
                onClick={() => { setComposing(!composing); setShowReplies(true); }}
                data-testid={`btn-reply-post-${post.id}`}
                className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-blue-400 transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Reply</span>
              </button>
            )}
            {(isAdmin || post.user_id === currentUserId) && (
              <button
                onClick={() => onDelete(post.id)}
                data-testid={`btn-delete-post-${post.id}`}
                className="flex items-center gap-1 text-xs text-zinc-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
            {isAdmin && depth === 0 && (
              <button
                onClick={() => onPin(post.id)}
                data-testid={`btn-pin-post-${post.id}`}
                className={`flex items-center gap-1 text-xs transition-colors opacity-0 group-hover:opacity-100 ${post.is_pinned ? "text-[#d4b461]" : "text-zinc-700 hover:text-[#d4b461]"}`}
              >
                <Pin className="w-3 h-3" />
              </button>
            )}
          </div>

          {composing && (
            <div className="mt-3 flex gap-2">
              <Textarea
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                placeholder="Write a reply…"
                className="min-h-[64px] text-sm bg-zinc-900/80 border-zinc-700 resize-none"
                data-testid={`textarea-reply-${post.id}`}
                onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && replyText.trim()) submitReply.mutate(replyText); }}
              />
              <Button
                size="sm"
                disabled={!replyText.trim() || submitReply.isPending}
                onClick={() => replyText.trim() && submitReply.mutate(replyText)}
                data-testid={`btn-submit-reply-${post.id}`}
                className="self-end bg-[#d4b461] hover:bg-[#c4a450] text-black"
              >
                <Send className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}

          {depth === 0 && (replies.length > 0 || showReplies) && (
            <button
              onClick={() => setShowReplies(!showReplies)}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 mt-2 transition-colors"
            >
              {showReplies ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {showReplies ? "Hide" : "Show"} {replies.length > 0 ? `${replies.length} ` : ""}replies
            </button>
          )}
        </div>
      </div>

      {showReplies && depth === 0 && (
        <div className="ml-11">
          {replies.map(reply => (
            <PostCard
              key={reply.id}
              post={reply}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              onDelete={onDelete}
              onLike={onLike}
              onPin={onPin}
              depth={1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Community() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeChannel, setActiveChannel] = useState("announcements");
  const [postText, setPostText] = useState("");
  const isAdmin = user?.role === "admin";

  const { data: posts = [], isLoading, refetch } = useQuery<Post[]>({
    queryKey: ["/api/community/posts", activeChannel],
    queryFn: () => apiRequest("GET", `/api/community/posts?channel=${activeChannel}`),
    refetchInterval: 30000,
  });

  const createPost = useMutation({
    mutationFn: (content: string) =>
      apiRequest("POST", "/api/community/posts", { channel: activeChannel, content }),
    onSuccess: () => {
      setPostText("");
      queryClient.invalidateQueries({ queryKey: ["/api/community/posts", activeChannel] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deletePost = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/community/posts/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/community/posts", activeChannel] }),
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

  return (
    <ClientLayout>
      <div className="flex h-[calc(100vh-0px)] overflow-hidden">
        {/* Channel sidebar */}
        <aside className="w-56 shrink-0 border-r border-zinc-800 bg-zinc-950/50 flex flex-col">
          <div className="px-4 py-4 border-b border-zinc-800">
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Channels</p>
          </div>
          <nav className="flex-1 p-2 space-y-0.5">
            {CHANNELS.map(({ id, label, icon: Icon, color }) => (
              <button
                key={id}
                onClick={() => setActiveChannel(id)}
                data-testid={`btn-channel-${id}`}
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
          <div className="p-4 border-t border-zinc-800">
            <p className="text-xs text-zinc-600">Members-only space. Be respectful.</p>
          </div>
        </aside>

        {/* Main feed */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Channel header */}
          <div className="px-6 py-4 border-b border-zinc-800 flex items-center gap-3 bg-zinc-950/30">
            <ChannelIcon className={`w-5 h-5 ${channel.color}`} />
            <div>
              <h1 className="text-base font-bold text-white">#{channel.label}</h1>
              <p className="text-xs text-zinc-500">{channel.desc}</p>
            </div>
          </div>

          {/* Posts feed */}
          <div className="flex-1 overflow-y-auto px-6 py-2">
            {isLoading ? (
              <div className="space-y-4 pt-4">
                {[1,2,3].map(i => (
                  <div key={i} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-800 animate-pulse shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-32 bg-zinc-800 rounded animate-pulse" />
                      <div className="h-4 w-full bg-zinc-800 rounded animate-pulse" />
                      <div className="h-4 w-2/3 bg-zinc-800 rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <ChannelIcon className={`w-12 h-12 ${channel.color} opacity-30 mb-4`} />
                <p className="text-zinc-400 font-semibold">No posts yet in #{channel.label}</p>
                <p className="text-zinc-600 text-sm mt-1">Be the first to post!</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/40">
                {posts.map(post => (
                  <PostCard
                    key={post.id}
                    post={post}
                    currentUserId={user?.id ?? ""}
                    isAdmin={isAdmin}
                    onDelete={(id) => deletePost.mutate(id)}
                    onLike={(id) => likePost.mutate(id)}
                    onPin={(id) => pinPost.mutate(id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="px-6 pb-5 pt-3 border-t border-zinc-800 bg-zinc-950/30">
            <div className="flex gap-3 items-end">
              <Avatar className="w-8 h-8 shrink-0">
                <AvatarFallback className="bg-zinc-800 text-zinc-300 text-xs font-semibold">
                  {authorInitials(user?.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 flex gap-2 items-end">
                <Textarea
                  value={postText}
                  onChange={e => setPostText(e.target.value)}
                  placeholder={`Post in #${channel.label}… (Ctrl+Enter to send)`}
                  className="min-h-[60px] max-h-[160px] text-sm bg-zinc-900 border-zinc-700 resize-none flex-1"
                  data-testid="textarea-community-post"
                  onKeyDown={e => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && postText.trim()) {
                      createPost.mutate(postText);
                    }
                  }}
                />
                <Button
                  disabled={!postText.trim() || createPost.isPending}
                  onClick={() => postText.trim() && createPost.mutate(postText)}
                  data-testid="btn-submit-community-post"
                  className="bg-[#d4b461] hover:bg-[#c4a450] text-black font-semibold h-10 px-4"
                >
                  {createPost.isPending ? "…" : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}
