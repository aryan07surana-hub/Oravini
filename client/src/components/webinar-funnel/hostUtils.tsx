// Host-side helpers shared by the setup wizard, the editor and the live-room tabs.
import type { WebinarFunnelRow } from "@/pages/client/WebinarFunnels";

export const GOLD = "#d4b461";
const IST_OFFSET_MIN = 330;

export const inputCls =
  "w-full h-11 px-3.5 rounded-lg text-sm text-white placeholder:text-zinc-600 transition-colors bg-white/[0.03] border border-white/[0.1] hover:border-white/[0.16] focus:border-[#d4b461]/70 focus-visible:ring-2 focus-visible:ring-[#d4b461]/25 outline-none [&:is(textarea)]:h-auto [&:is(textarea)]:py-2.5";
// Colors live in inputCls; inputStyle only carries what classes can't (kept for API compatibility).
export const inputStyle = {
  outline: "none",
  colorScheme: "dark" as const,
};
export const inputErrStyle = { ...inputStyle, borderColor: "rgba(248,113,113,0.6)" };

/** UTC ISO → "YYYY-MM-DDTHH:mm" wall-clock in IST, for <input type="datetime-local">. */
export function toISTInput(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return new Date(d.getTime() + IST_OFFSET_MIN * 60_000).toISOString().slice(0, 16);
}
/** "YYYY-MM-DDTHH:mm" interpreted as IST → UTC ISO string. */
export function fromISTInput(value: string) {
  if (!value) return null;
  const d = new Date(`${value}:00+05:30`);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

export function Field({ label, hint, children, optional, htmlFor }: { label: string; hint?: React.ReactNode; children: React.ReactNode; optional?: boolean; htmlFor?: string }) {
  return (
    <div>
      {label && (
        <label htmlFor={htmlFor} className="flex items-center gap-2 text-[13px] font-medium text-zinc-300 mb-1.5">
          {label}
          {optional && <span className="text-xs font-normal text-zinc-600">Optional</span>}
        </label>
      )}
      {children}
      {hint && <div className="text-xs text-zinc-500 mt-1.5 leading-relaxed">{hint}</div>}
    </div>
  );
}

export type WebinarFunnelFull = WebinarFunnelRow & {
  deckUrl: string | null;
  replayUrl: string | null;
  offerText: string | null;
  offerPrice: string | null;
  offerExpiresAt: string | null;
  durationMinutes: number | null;
  remindersEnabled: boolean;
  // Set when the stream was created on the host's connected YouTube channel
  youtubeBroadcastId?: string | null;
  youtubeStreamId?: string | null;
  youtubeIngestionAddress?: string | null;
  youtubeStreamKeySet?: boolean;
};

export function fmtDuration(sec: number) {
  if (!sec) return "0m";
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m${s && m < 10 ? ` ${s}s` : ""}`;
  return `${s}s`;
}

/** Uploads a PDF deck; resolves to the stored URL. */
export async function uploadDeck(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("deck", file);
  const res = await fetch("/api/webinar-funnels/tools/upload-deck", { method: "POST", body: fd, credentials: "include" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Upload failed");
  return data.url as string;
}
