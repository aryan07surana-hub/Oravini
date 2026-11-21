// Shared YouTube-connection helpers for the webinar wizard, editor and Settings.
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Copy, Eye, EyeOff } from "lucide-react";
import { GOLD } from "./hostUtils";

export type YoutubeConnection = {
  connected: boolean;
  configured?: boolean;
  channelId?: string | null;
  channelTitle?: string | null;
  channelThumbnail?: string | null;
};

export type YoutubeBroadcastInfo = {
  watchUrl: string;
  streamKey: string;
  ingestionAddress: string;
  broadcastId: string;
  studioUrl: string;
  channelTitle?: string | null;
};

export type YoutubeLiveStatus = {
  channelTitle: string | null;
  broadcastId: string | null;
  streamKey: string | null;
  ingestionAddress: string | null;
  watchUrl: string | null;
  studioUrl: string | null;
  replayVideoId: string | null;
  lifeCycleStatus: string | null;
  streamStatus: string | null;
  healthStatus: string | null;
};

export const YOUTUBE_STATUS_KEY = ["/api/youtube/status"];

export function useYoutubeConnection() {
  return useQuery<YoutubeConnection>({ queryKey: YOUTUBE_STATUS_KEY, staleTime: 30_000 });
}

/** Starts the YouTube OAuth flow and comes back to `returnTo` (defaults to the current page). */
export function startYoutubeConnect(returnTo?: string) {
  let path = returnTo;
  if (!path) {
    const u = new URL(window.location.href);
    u.searchParams.delete("yt_connected");
    u.searchParams.delete("yt_error");
    path = `${u.pathname}${u.search}`;
  }
  window.location.href = `/api/auth/youtube?returnTo=${encodeURIComponent(path)}`;
}

/**
 * Reads (and strips) ?yt_connected / ?yt_error left by the OAuth callback.
 * Returns null when neither is present.
 */
export function consumeYoutubeConnectResult(): { ok: true } | { ok: false; error: string } | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const connected = params.get("yt_connected");
  const error = params.get("yt_error");
  if (!connected && !error) return null;
  params.delete("yt_connected");
  params.delete("yt_error");
  const qs = params.toString();
  window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`);
  return connected === "1" ? { ok: true } : { ok: false, error: error || "Couldn't connect YouTube" };
}

export const LIFECYCLE_LABELS: Record<string, { label: string; color: string }> = {
  created: { label: "Created", color: "#a1a1aa" },
  ready: { label: "Scheduled", color: "#60a5fa" },
  testing: { label: "Testing (preview)", color: "#fbbf24" },
  testStarting: { label: "Starting preview", color: "#fbbf24" },
  liveStarting: { label: "Going live", color: "#f87171" },
  live: { label: "LIVE", color: "#ef4444" },
  complete: { label: "Ended", color: "#34d399" },
  revoked: { label: "Removed", color: "#71717a" },
  deleted: { label: "Deleted on YouTube", color: "#71717a" },
};

/** Masked value with reveal + copy. Used for the stream key and ingestion address. */
export function SecretField({ label, value, masked = true, testid }: { label: string; value: string; masked?: boolean; testid?: string }) {
  const [shown, setShown] = useState(!masked);
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  };
  return (
    <div>
      <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-[0.12em] mb-1">{label}</p>
      <div className="flex items-center gap-1.5 rounded-lg px-3 py-2" style={{ background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <code className="flex-1 min-w-0 truncate text-[12px] text-zinc-200 font-mono" data-testid={testid}>
          {shown ? value : "•".repeat(Math.min(24, Math.max(8, value.length)))}
        </code>
        {masked && (
          <button type="button" onClick={() => setShown(v => !v)} className="p-1 rounded text-zinc-500 hover:text-zinc-200" aria-label={shown ? `Hide ${label}` : `Reveal ${label}`} data-testid={testid ? `${testid}-toggle` : undefined}>
            {shown ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        )}
        <button type="button" onClick={copy} className="p-1 rounded text-zinc-500 hover:text-zinc-200" aria-label={`Copy ${label}`}>
          {copied ? <Check className="w-3.5 h-3.5" style={{ color: GOLD }} /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}
