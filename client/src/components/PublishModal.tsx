import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Send, CalendarDays, RefreshCw, Linkedin, Twitter, Image, X, AlertCircle, CheckCircle2
} from "lucide-react";
import { AiRefineButton } from "@/components/ui/AiRefineButton";

interface PublishModalProps {
  open: boolean;
  onClose: () => void;
  initialText: string;
  defaultPlatform?: "linkedin" | "twitter";
  ideaTitle?: string;
}

const PLATFORM_LIMITS: Record<string, number> = { linkedin: 3000, twitter: 280 };

function CharCount({ text, platform }: { text: string; platform: string }) {
  const limit = PLATFORM_LIMITS[platform] ?? 3000;
  const len = text.length;
  const over = len > limit;
  const near = len > limit * 0.85;
  return (
    <span className={`text-xs font-mono ${over ? "text-red-400" : near ? "text-yellow-400" : "text-zinc-500"}`}>
      {len}/{limit}
    </span>
  );
}

export default function PublishModal({ open, onClose, initialText, defaultPlatform = "linkedin", ideaTitle }: PublishModalProps) {
  const { toast } = useToast();
  const [platform, setPlatform] = useState<"linkedin" | "twitter">(defaultPlatform);
  const [text, setText] = useState(initialText);
  const [imageUrl, setImageUrl] = useState("");
  const [mode, setMode] = useState<"now" | "schedule">("now");
  const [schedDate, setSchedDate] = useState("");
  const [schedTime, setSchedTime] = useState("");
  const [showImageInput, setShowImageInput] = useState(false);

  const { data: liStatus } = useQuery<{ connected: boolean; name: string | null }>({ queryKey: ["/api/linkedin/status"] });
  const { data: twStatus } = useQuery<{ connected: boolean; name: string | null }>({ queryKey: ["/api/twitter/status"] });

  const limit = PLATFORM_LIMITS[platform];
  const finalText = imageUrl.trim() ? `${text.trim()}\n\n${imageUrl.trim()}` : text.trim();

  const postNowMutation = useMutation({
    mutationFn: async () => {
      if (platform === "linkedin") {
        return apiRequest("POST", "/api/linkedin/post", { content: finalText });
      } else {
        return apiRequest("POST", "/api/twitter/post", { text: finalText });
      }
    },
    onSuccess: () => {
      toast({
        title: "Posted!",
        description: `Your idea is now live on ${platform === "linkedin" ? "LinkedIn" : "X / Twitter"}.`,
      });
      onClose();
    },
    onError: (err: any) => {
      toast({ title: "Failed to post", description: err.message, variant: "destructive" });
    },
  });

  const scheduleMutation = useMutation({
    mutationFn: async () => {
      if (!schedDate || !schedTime) throw new Error("Please select a date and time");
      const scheduledFor = new Date(`${schedDate}T${schedTime}`).toISOString();
      if (platform === "linkedin") {
        return apiRequest("POST", "/api/linkedin/scheduled", { content: finalText, scheduledFor });
      } else {
        return apiRequest("POST", "/api/twitter/scheduled", { text: finalText, scheduledFor });
      }
    },
    onSuccess: () => {
      toast({
        title: "Scheduled!",
        description: `Will auto-post to ${platform === "linkedin" ? "LinkedIn" : "X / Twitter"} at your chosen time.`,
      });
      onClose();
    },
    onError: (err: any) => {
      toast({ title: "Failed to schedule", description: err.message, variant: "destructive" });
    },
  });

  const isConnected = platform === "linkedin" ? liStatus?.connected : twStatus?.connected;
  const connectedName = platform === "linkedin" ? liStatus?.name : twStatus?.name;
  const isBusy = postNowMutation.isPending || scheduleMutation.isPending;
  const overLimit = finalText.length > limit;

  const handleSwitch = (p: "linkedin" | "twitter") => {
    setPlatform(p);
    const newLimit = PLATFORM_LIMITS[p];
    if (text.length > newLimit) {
      setText(text.slice(0, newLimit));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg w-full" style={{ background: "#0f0f0f", border: "1px solid rgba(255,255,255,0.08)" }}>
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
            <Send className="w-4 h-4 text-primary" />
            Publish Idea
            {ideaTitle && <span className="text-zinc-500 font-normal text-xs ml-1 line-clamp-1">— {ideaTitle}</span>}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-1">
          {/* Platform toggle */}
          <div className="flex gap-1 p-1 rounded-xl bg-zinc-900 border border-zinc-800">
            {(["linkedin", "twitter"] as const).map((p) => {
              const Icon = p === "linkedin" ? Linkedin : Twitter;
              const label = p === "linkedin" ? "LinkedIn" : "X / Twitter";
              const active = platform === p;
              return (
                <button
                  key={p}
                  onClick={() => handleSwitch(p)}
                  data-testid={`platform-toggle-${p}`}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${active ? (p === "linkedin" ? "bg-[#0a66c2] text-white" : "bg-zinc-700 text-white") : "text-zinc-400 hover:text-zinc-200"}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              );
            })}
          </div>

          {/* Connection status */}
          {isConnected ? (
            <div className="flex items-center gap-2 text-xs text-zinc-400 px-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              Posting as <span className="text-white font-semibold">{connectedName}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-amber-400 px-1">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              {platform === "linkedin" ? "LinkedIn" : "X / Twitter"} not connected — go to the scheduler page first
            </div>
          )}

          {/* Text editor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400">Post Content</span>
              <CharCount text={finalText} platform={platform} />
            </div>
            <Textarea
              value={text}
              onChange={e => setText(e.target.value)}
              className="min-h-[160px] bg-zinc-900 border-zinc-700 text-zinc-200 placeholder:text-zinc-600 resize-none text-sm"
              placeholder="Edit your post content..."
              data-testid="textarea-publish-text"
            />
            <AiRefineButton
              text={text}
              onAccept={setText}
              context={platform === "linkedin" ? "professional LinkedIn post, max 3000 chars" : "punchy X/Twitter post, max 280 chars"}
            />
          </div>

          {/* Image URL toggle */}
          <div>
            {!showImageInput ? (
              <button
                onClick={() => setShowImageInput(true)}
                className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                data-testid="button-add-image"
              >
                <Image className="w-3.5 h-3.5" /> Add image URL (optional)
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  value={imageUrl}
                  onChange={e => setImageUrl(e.target.value)}
                  placeholder="https://your-image-url.com/photo.jpg"
                  className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200 outline-none focus:border-primary/50"
                  data-testid="input-image-url"
                />
                <button onClick={() => { setImageUrl(""); setShowImageInput(false); }} className="text-zinc-600 hover:text-zinc-400">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Mode toggle */}
          <div className="flex gap-1 p-1 rounded-xl bg-zinc-900 border border-zinc-800">
            {([
              { id: "now", label: "Post Now", icon: Send },
              { id: "schedule", label: "Schedule", icon: CalendarDays },
            ] as const).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setMode(id)}
                data-testid={`mode-${id}`}
                className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-semibold transition-all ${mode === id ? "bg-primary text-black" : "text-zinc-400 hover:text-zinc-200"}`}
              >
                <Icon className="w-3.5 h-3.5" />{label}
              </button>
            ))}
          </div>

          {/* Schedule date/time */}
          {mode === "schedule" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <span className="text-xs text-zinc-400">Date</span>
                <input
                  type="date"
                  value={schedDate}
                  onChange={e => setSchedDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 outline-none focus:border-primary/50"
                  data-testid="input-sched-date"
                />
              </div>
              <div className="space-y-1.5">
                <span className="text-xs text-zinc-400">Time</span>
                <input
                  type="time"
                  value={schedTime}
                  onChange={e => setSchedTime(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 outline-none focus:border-primary/50"
                  data-testid="input-sched-time"
                />
              </div>
            </div>
          )}

          {/* Action button */}
          {!isConnected ? (
            <Button
              className="w-full"
              variant="outline"
              onClick={() => {
                onClose();
                window.location.href = platform === "linkedin" ? "/linkedin-scheduler" : "/twitter-scheduler";
              }}
            >
              Connect {platform === "linkedin" ? "LinkedIn" : "X / Twitter"} →
            </Button>
          ) : mode === "now" ? (
            <Button
              className="w-full gap-2"
              onClick={() => postNowMutation.mutate()}
              disabled={!text.trim() || overLimit || isBusy}
              data-testid="button-publish-now"
            >
              {postNowMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {postNowMutation.isPending ? "Publishing..." : `Post to ${platform === "linkedin" ? "LinkedIn" : "X / Twitter"}`}
            </Button>
          ) : (
            <Button
              className="w-full gap-2"
              onClick={() => scheduleMutation.mutate()}
              disabled={!text.trim() || overLimit || !schedDate || !schedTime || isBusy}
              data-testid="button-schedule-post"
            >
              {scheduleMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CalendarDays className="w-4 h-4" />}
              {scheduleMutation.isPending ? "Scheduling..." : "Schedule Post"}
            </Button>
          )}

          {overLimit && (
            <p className="text-xs text-red-400 text-center">
              Post is {finalText.length - limit} characters over the limit
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
