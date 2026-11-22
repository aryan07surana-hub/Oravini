// Shared visual primitives for the webinar funnel product (host + public pages).
// Calm dark-neutral surfaces, thin borders, one brand accent (GOLD). No logic lives here.
import type { ReactNode } from "react";
import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";
import type { FunnelDisplayStatus } from "./eventTime";
import { DISPLAY_STATUS_LABEL } from "./eventTime";

export const GOLD = "#d4b461";

/** Surface tokens (kept as literal Tailwind classes so JIT picks them up). */
export const surface = {
  page: "bg-[#0b0b0e]",
  card: "bg-[#111115] border border-white/[0.08]",
  inset: "bg-white/[0.025] border border-white/[0.06]",
};

export const focusRing =
  "outline-none focus-visible:ring-2 focus-visible:ring-[#d4b461]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0b0e]";

type BtnVariant = "primary" | "secondary" | "ghost" | "danger";
type BtnSize = "sm" | "md" | "lg";

/** Class string for a button or link styled as a button. */
export function btn(variant: BtnVariant = "secondary", size: BtnSize = "md") {
  const base = `inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap ${focusRing}`;
  const sizes: Record<BtnSize, string> = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-4 text-sm",
    lg: "h-12 px-6 text-[15px]",
  };
  const variants: Record<BtnVariant, string> = {
    primary: "bg-[#d4b461] text-[#14110a] hover:bg-[#dfc277] disabled:hover:bg-[#d4b461]",
    secondary: "bg-white/[0.04] text-zinc-200 border border-white/[0.1] hover:bg-white/[0.08] hover:text-white",
    ghost: "text-zinc-400 hover:text-white hover:bg-white/[0.05]",
    danger: "text-zinc-400 hover:text-red-300 hover:bg-red-500/10",
  };
  return `${base} ${sizes[size]} ${variants[variant]}`;
}

/** Square icon-only button. Always pass an aria-label where used. */
export function iconBtn(variant: "secondary" | "ghost" | "danger" = "ghost") {
  const v = variant === "secondary"
    ? "bg-white/[0.04] border border-white/[0.1] text-zinc-300 hover:text-white hover:bg-white/[0.08]"
    : variant === "danger" ? "text-zinc-500 hover:text-red-300 hover:bg-red-500/10"
    : "text-zinc-500 hover:text-white hover:bg-white/[0.06]";
  return `inline-flex items-center justify-center w-9 h-9 rounded-lg transition-colors disabled:opacity-40 ${focusRing} ${v}`;
}

export function Card({ children, className = "", as: Tag = "section", ...rest }: {
  children: ReactNode; className?: string; as?: "section" | "div" | "article" | "aside";
} & React.HTMLAttributes<HTMLElement>) {
  return <Tag className={`rounded-xl ${surface.card} ${className}`} {...rest}>{children}</Tag>;
}

export function SectionHeading({ title, description, action, id }: { title: string; description?: ReactNode; action?: ReactNode; id?: string }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-4">
      <div className="min-w-0">
        <h2 id={id} className="text-[15px] font-semibold text-white tracking-tight">{title}</h2>
        {description && <p className="text-[13px] text-zinc-500 mt-0.5 leading-relaxed">{description}</p>}
      </div>
      {action}
    </div>
  );
}

const STATUS_TONE: Record<FunnelDisplayStatus, string> = {
  draft: "text-zinc-400 bg-white/[0.04] border-white/[0.1]",
  scheduled: "text-emerald-300 bg-emerald-500/10 border-emerald-500/20",
  live: "text-red-300 bg-red-500/10 border-red-500/25",
  ended: "text-zinc-300 bg-white/[0.06] border-white/[0.12]",
};

export function StatusBadge({ status, label, testid }: { status: FunnelDisplayStatus; label?: string; testid?: string }) {
  return (
    <span data-testid={testid}
      className={`inline-flex items-center gap-1.5 h-[22px] px-2 rounded-md border text-[11px] font-semibold tracking-wide flex-shrink-0 ${STATUS_TONE[status]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${status === "live" ? "bg-red-400 animate-pulse" : status === "scheduled" ? "bg-emerald-400" : "bg-zinc-500"}`} aria-hidden />
      {label ?? DISPLAY_STATUS_LABEL[status]}
    </span>
  );
}

export function BackLink({ onClick, children = "All webinars" }: { onClick: () => void; children?: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={`inline-flex items-center gap-1.5 text-[13px] font-medium text-zinc-500 hover:text-zinc-200 rounded-md -ml-1 px-1 py-0.5 ${focusRing}`}>
      <ArrowLeft className="w-3.5 h-3.5" /> {children}
    </button>
  );
}

export function PageHeader({ eyebrow, title, description, actions, back }: {
  eyebrow?: ReactNode; title: ReactNode; description?: ReactNode; actions?: ReactNode; back?: ReactNode;
}) {
  return (
    <header className="mb-8">
      {back && <div className="mb-4">{back}</div>}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          {eyebrow && <div className="text-xs font-medium text-zinc-500 mb-1.5 max-w-full min-w-0">{eyebrow}</div>}
          <h1 className="text-2xl sm:text-[28px] font-semibold text-white tracking-tight leading-tight break-words">{title}</h1>
          {description && <p className="text-sm text-zinc-500 mt-1.5 max-w-2xl leading-relaxed">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 lg:flex-shrink-0">{actions}</div>}
      </div>
    </header>
  );
}

export function StatTile({ label, value, sub, testid }: { label: string; value: ReactNode; sub?: ReactNode; testid?: string }) {
  return (
    <div className={`rounded-xl p-4 ${surface.card}`} data-testid={testid}>
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="text-2xl font-semibold text-white tabular-nums mt-1 leading-none">{value}</p>
      {sub && <p className="text-[11px] text-zinc-600 mt-2">{sub}</p>}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action, testid }: {
  icon: typeof AlertTriangle; title: string; description?: ReactNode; action?: ReactNode; testid?: string;
}) {
  return (
    <div className={`rounded-xl ${surface.card} px-6 py-14 text-center`} data-testid={testid}>
      <div className="w-11 h-11 rounded-lg mx-auto mb-4 flex items-center justify-center bg-white/[0.04] border border-white/[0.08]">
        <Icon className="w-5 h-5 text-zinc-400" />
      </div>
      <p className="text-base font-semibold text-white">{title}</p>
      {description && <p className="text-sm text-zinc-500 mt-1.5 max-w-md mx-auto leading-relaxed">{description}</p>}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = "Something went wrong", description, onRetry, testid = "error-state" }: {
  title?: string; description?: ReactNode; onRetry?: () => void; testid?: string;
}) {
  return (
    <div role="alert" className="rounded-xl border border-red-500/20 bg-red-500/[0.04] px-5 py-5 flex flex-col sm:flex-row sm:items-center gap-4" data-testid={testid}>
      <AlertTriangle className="w-5 h-5 text-red-300 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white">{title}</p>
        {description && <p className="text-[13px] text-zinc-400 mt-0.5">{description}</p>}
      </div>
      {onRetry && <button type="button" onClick={onRetry} className={btn("secondary", "sm")}><RefreshCw className="w-3.5 h-3.5" /> Try again</button>}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`rounded-xl bg-white/[0.035] animate-pulse ${className}`} aria-hidden />;
}

/** Label/value row for compact detail lists. */
export function DetailRow({ icon: Icon, label, children }: { icon: typeof AlertTriangle; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.07] flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-zinc-400" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-500">{label}</p>
        <div className="text-sm text-zinc-100 mt-0.5 break-words">{children}</div>
      </div>
    </div>
  );
}
