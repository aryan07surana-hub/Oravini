// Webinar email send log (webinar_email_sends) — used by Settings → Email sending and the
// funnel editor's Emails tab.
import { CheckCircle2, XCircle, MinusCircle } from "lucide-react";

export type EmailSendRow = {
  id: number;
  webinarId: string | null;
  registrationId: string | null;
  type: string;
  toEmail: string;
  subject: string | null;
  status: "sent" | "failed" | "skipped";
  via: string | null;
  error: string | null;
  createdAt: string;
  webinarTitle?: string | null;
};

export const SEND_TYPE_LABEL: Record<string, string> = {
  confirmation: "Confirmation",
  reminder: "1h reminder",
  followup_attended: "Follow-up · attended",
  followup_no_show: "Follow-up · no-show",
  followup_clicked: "Follow-up · clicked",
  test: "Test",
};

export const VIA_LABEL: Record<string, string> = {
  account: "Your sender",
  platform_gmail: "Oravini",
  platform_smtp: "Oravini",
  none: "—",
};

const STATUS = {
  sent: { icon: CheckCircle2, color: "#4ade80", label: "Sent" },
  failed: { icon: XCircle, color: "#f87171", label: "Failed" },
  skipped: { icon: MinusCircle, color: "#a1a1aa", label: "Skipped" },
} as const;

function when(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function EmailLogList({ rows, showWebinar = false, emptyText = "No emails sent yet." }: {
  rows: EmailSendRow[] | undefined;
  showWebinar?: boolean;
  emptyText?: string;
}) {
  if (!rows?.length) return <p className="text-xs text-zinc-600 py-4 text-center">{emptyText}</p>;
  return (
    <ul className="divide-y divide-white/5" data-testid="email-log-list">
      {rows.map(r => {
        const s = STATUS[r.status] ?? STATUS.skipped;
        return (
          <li key={r.id} className="py-2.5 flex items-start gap-3 min-w-0" data-testid={`email-log-row-${r.status}`}>
            <s.icon className="w-4 h-4 mt-0.5 shrink-0" style={{ color: s.color }} aria-label={s.label} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-white">{SEND_TYPE_LABEL[r.type] ?? r.type}</span>
                <span className="text-xs text-zinc-400 truncate max-w-full">{r.toEmail}</span>
                {showWebinar && r.webinarTitle && <span className="text-[11px] text-zinc-600 truncate max-w-full">· {r.webinarTitle}</span>}
              </div>
              {r.error && <p className="text-[11px] mt-0.5 break-words" style={{ color: r.status === "failed" ? "#fca5a5" : "#a1a1aa" }}>{r.error}</p>}
            </div>
            <div className="text-right shrink-0">
              <p className="text-[11px] text-zinc-500 whitespace-nowrap">{when(r.createdAt)}</p>
              {r.via && r.via !== "none" && <p className="text-[10px] text-zinc-600">{VIA_LABEL[r.via] ?? r.via}</p>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
