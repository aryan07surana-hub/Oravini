import { useState } from "react";
import { useLocation } from "wouter";
import ClientLayout from "@/components/layout/ClientLayout";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Heart, MessageCircle, Pin, Trash2, Send, Trophy, HelpCircle, Megaphone, BookOpen, Users2, ChevronDown, ChevronUp, MessageSquare, Star } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const CHANNELS = [
  { id: "announcements", label: "Announcements", icon: Megaphone, color: "text-[#d4b461]",    desc: "Updates from the Oravini team" },
  { id: "wins",          label: "Wins",           icon: Trophy,    color: "text-emerald-400",  desc: "Share your wins & milestones" },
  { id: "qa",            label: "Q&A",            icon: HelpCircle,color: "text-blue-400",     desc: "Forum-style questions & answers" },
  { id: "general",       label: "General",        icon: Users2,    color: "text-zinc-300",     desc: "Open conversation" },
  { id: "resources",     label: "Resources",      icon: BookOpen,  color: "text-violet-400",   desc: "Tools, links & templates" },
];

const CHANNEL_GUIDES: Record<string, { title: string; body: string }> = {
  announcements: {
    title: "How to use Announcements",
    body: "This channel is for official Oravini team posts only — strategy updates, new features, community events, and important notices. Reactions and replies are welcome. Stay tuned here for everything happening in the program.",
  },
  wins: {
    title: "How to post your wins",
    body: "This is your space to celebrate. Post any win — a follower milestone, first brand deal, a viral reel, landing a client, or simply showing up consistently. No win is too small. Sharing your progress inspires everyone here and holds you accountable. Include a screenshot if you have one! The community is here to cheer you on.",
  },
};

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

function ReplyList({ post, currentUserId, isAdmin, isQA, onLike, onDelete }: {
  post: Post;
  currentUserId: string;
  isAdmin: boolean;
  isQA: boolean;
  onLike: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const [showReplies, setShowReplies] = useState(false);
  const [composing, setComposing] = useState(false);
  const [replyText, setReplyText] = useState("");
  const { toast } = useToast();

  const { data: replies = [], refetch } = useQuery<Post[]>({
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
      refetch();
      queryClient.invalidateQueries({ queryKey: ["/api/community/posts"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const answerCount = replies.length;

  return (
    <div>
      {/* Reply toggle */}
      <div className="flex items-center gap-3 mt-2">
        <button
          onClick={() => onLike(post.id)}
          data-testid={`btn-like-post-${post.id}`}
          className={`flex items-center gap-1.5 text-xs transition-colors ${post.liked_by_me ? "text-pink-400" : "text-zinc-600 hover:text-pink-400"}`}
        >
          <Heart className={`w-3.5 h-3.5 ${post.liked_by_me ? "fill-pink-400" : ""}`} />
          {post.like_count > 0 && <span>{post.like_count}</span>}
        </button>

        <button
          onClick={() => { setComposing(!composing); setShowReplies(true); }}
          data-testid={`btn-reply-post-${post.id}`}
          className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-blue-400 transition-colors"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          <span>{isQA ? "Answer" : "Reply"}</span>
        </button>

        {(showReplies || answerCount > 0) && (
          <button
            onClick={() => setShowReplies(v => !v)}
            className="flex items-center gap-1 text-xs text-zinc-600 hover:text-zinc-300 transition-colors"
          >
            {showReplies ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {isQA
              ? (showReplies ? "Hide answers" : `${answerCount > 0 ? answerCount : "View"} answer${answerCount !== 1 ? "s" : ""}`)
              : (showReplies ? "Hide replies" : "View replies")
            }
          </button>
        )}

        {(isAdmin || post.user_id === currentUserId) && (
          <button
            onClick={() => onDelete(post.id)}
            data-testid={`btn-delete-post-${post.id}`}
            className="ml-auto flex items-center gap-1 text-xs text-zinc-700 hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Reply composer */}
      {composing && (
        <div className="mt-3 flex gap-2 ml-11">
          <Textarea
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            placeholder={isQA ? "Write your answer…" : "Write a reply…"}
            className="min-h-[60px] text-sm bg-zinc-900/80 border-zinc-700 resize-none"
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

      {/* Replies / Answers */}
      {showReplies && (
        <div className="ml-11 mt-2 space-y-0 border-l border-zinc-800 pl-4">
          {replies.length === 0 ? (
            <p className="text-xs text-zinc-600 py-2">{isQA ? "No answers yet — be the first to answer." : "No replies yet."}</p>
          ) : replies.map(reply => (
            <div key={reply.id} className="flex gap-3 py-2.5 group">
              <Avatar className="w-7 h-7 shrink-0 mt-0.5">
                <AvatarFallback className="bg-zinc-800 text-zinc-300 text-[10px] font-semibold">
                  {authorInitials(reply.author_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  {isQA && (
                    <span className="text-[10px] font-bold uppercase tracking-wide text-blue-400 border border-blue-400/30 rounded px-1.5 py-0.5">Answer</span>
                  )}
                  <span className="text-xs font-semibold text-white">{reply.author_name ?? "Member"}</span>
                  {reply.author_plan && (
                    <Badge variant="outline" className={`text-[10px] h-4 px-1 ${PLAN_BADGE[reply.author_plan] ?? ""}`}>
                      {reply.author_plan}
                    </Badge>
                  )}
                  <span className="text-xs text-zinc-600">{formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}</span>
                </div>
                <p className="text-sm text-zinc-300 whitespace-pre-wrap break-words">{reply.content}</p>
                <div className="flex items-center gap-3 mt-1">
                  <button
                    onClick={() => onLike(reply.id)}
                    className={`flex items-center gap-1 text-xs transition-colors ${reply.liked_by_me ? "text-pink-400" : "text-zinc-700 hover:text-pink-400"}`}
                  >
                    <Heart className={`w-3 h-3 ${reply.liked_by_me ? "fill-pink-400" : ""}`} />
                    {reply.like_count > 0 && <span>{reply.like_count}</span>}
                  </button>
                  {(isAdmin || reply.user_id === currentUserId) && (
                    <button
                      onClick={() => onDelete(reply.id)}
                      className="flex items-center gap-1 text-xs text-zinc-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PostCard({ post, currentUserId, isAdmin, isQA, onDelete, onLike, onPin }: {
  post: Post;
  currentUserId: string;
  isAdmin: boolean;
  isQA: boolean;
  onDelete: (id: number) => void;
  onLike: (id: number) => void;
  onPin: (id: number) => void;
}) {
  return (
    <div className={`group py-4 ${isQA ? "border border-zinc-800/60 rounded-xl px-4 mb-3 bg-zinc-950/30" : "border-b border-zinc-800/40"}`}>
      <div className="flex gap-3">
        <Avatar className="w-8 h-8 shrink-0 mt-0.5">
          <AvatarFallback className="bg-zinc-800 text-zinc-300 text-xs font-semibold">
            {authorInitials(post.author_name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {isQA && (
              <span className="text-[10px] font-bold uppercase tracking-wide text-blue-400 border border-blue-400/30 rounded px-1.5 py-0.5">Question</span>
            )}
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
            {isAdmin && (
              <button
                onClick={() => onPin(post.id)}
                data-testid={`btn-pin-post-${post.id}`}
                className={`ml-auto flex items-center gap-1 text-xs opacity-0 group-hover:opacity-100 transition-all ${post.is_pinned ? "text-[#d4b461]" : "text-zinc-700 hover:text-[#d4b461]"}`}
              >
                <Pin className="w-3 h-3" />
              </button>
            )}
          </div>
          <p className="text-sm text-zinc-300 whitespace-pre-wrap break-words leading-relaxed">{post.content}</p>

          <ReplyList
            post={post}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            isQA={isQA}
            onLike={onLike}
            onDelete={onDelete}
          />
        </div>
      </div>
    </div>
  );
}

export default function Community() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [activeChannel, setActiveChannel] = useState("announcements");
  const [postText, setPostText] = useState("");
  const isAdmin = user?.role === "admin";
  const isQA = activeChannel === "qa";

  const { data: posts = [], isLoading } = useQuery<Post[]>({
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
  const guide = CHANNEL_GUIDES[activeChannel];

  return (
    <ClientLayout>
      <div className="flex h-[calc(100vh-0px)] overflow-hidden">
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

          {/* Support divider + button */}
          <div className="p-2 border-t border-zinc-800">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 px-3 mb-1.5">Private</p>
            <button
              onClick={() => navigate("/chat")}
              data-testid="btn-support-chat"
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/80"
            >
              <MessageSquare className="w-4 h-4 shrink-0" />
              <span>Talk to Support</span>
            </button>
            <p className="text-[10px] text-zinc-700 px-3 mt-1.5 leading-relaxed">Private message with the Oravini team.</p>
          </div>
        </aside>

        {/* Main feed */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Channel header */}
          <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-950/30">
            <div className="flex items-center gap-3">
              <ChannelIcon className={`w-5 h-5 ${channel.color}`} />
              <div>
                <h1 className="text-base font-bold text-white">#{channel.label}</h1>
                <p className="text-xs text-zinc-500">{channel.desc}</p>
              </div>
            </div>

            {/* Channel guide card */}
            {guide && (
              <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <Star className="w-3.5 h-3.5 text-[#d4b461]" />
                  <p className="text-xs font-semibold text-[#d4b461]">{guide.title}</p>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">{guide.body}</p>
              </div>
            )}
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
                    </div>
                  </div>
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <ChannelIcon className={`w-10 h-10 ${channel.color} opacity-25 mb-3`} />
                <p className="text-zinc-400 font-semibold text-sm">No posts in #{channel.label} yet</p>
                <p className="text-zinc-600 text-xs mt-1">
                  {isQA ? "Ask the first question below." : "Be the first to post!"}
                </p>
              </div>
            ) : (
              <div className={isQA ? "pt-3 space-y-1" : ""}>
                {posts.map(post => (
                  <PostCard
                    key={post.id}
                    post={post}
                    currentUserId={user?.id ?? ""}
                    isAdmin={isAdmin}
                    isQA={isQA}
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
                  placeholder={
                    isQA
                      ? "Ask a question in #Q&A… (Ctrl+Enter to post)"
                      : `Post in #${channel.label}… (Ctrl+Enter to send)`
                  }
                  className="min-h-[56px] max-h-[160px] text-sm bg-zinc-900 border-zinc-700 resize-none flex-1"
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
            {isQA && (
              <p className="text-xs text-zinc-600 mt-2 ml-11">Start your question with "How do I…", "What's the best way to…", or "Has anyone tried…" for the best answers.</p>
            )}
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}
