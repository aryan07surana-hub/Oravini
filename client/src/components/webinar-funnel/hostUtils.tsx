// Host-side helpers shared by the setup wizard, the editor and the live-room tabs.
import type { WebinarFunnelRow } from "@/pages/client/WebinarFunnels";

export const GOLD = "#d4b461";
const IST_OFFSET_MIN = 330;

export const inputCls =
  "w-full px-4 py-3 rounded-xl text-sm text-white placeholder:text-zinc-600 transition-colors focus:border-[#d4b461]/60";
export const inputStyle = {
  background: "rgba(255,255,255,0.035)",
  border: "1px solid rgba(255,255,255,0.1)",
  outline: "none",
  colorScheme: "dark" as const,
};
export const inputErrStyle = { ...inputStyle, border: "1px solid rgba(248,113,113,0.55)" };

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

export function Field({ label, hint, children, optional }: { label: string; hint?: React.ReactNode; children: React.ReactNode; optional?: boolean }) {
  return (
    <div>
      <label className="flex items-center gap-2 text-[11px] font-semibold text-zinc-400 uppercase tracking-[0.12em] mb-1.5">
        {label}
        {optional && <span className="normal-case tracking-normal font-medium text-zinc-600">optional</span>}
      </label>
      {children}
      {hint && <div className="text-[11px] text-zinc-500 mt-1.5 leading-relaxed">{hint}</div>}
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
