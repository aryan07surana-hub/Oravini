// King Astrology webinar — owner sign-in and registrations dashboard
// (/king-astrology/admin). Its own sign-in, separate from the Oravini platform
// login: the session flag lives server-side in server/kingWebinar.ts.
import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2, Circle, Download, Loader2, LogOut, RefreshCw, Search, Sparkles, Users,
} from "lucide-react";
import { btn, field, focusRing } from "@/components/king/ui";
import { KingShell, KingEyebrow } from "@/components/king/shared";
import { KING_EVENT, KING_PATHS, KING_TITLE, KING_WHOP } from "@shared/kingWebinar";

type Reg = {
  id: string; name: string; email: string; phone: string | null;
  tier: string; paid: boolean; paid_at: string | null; paid_source: string | null;
  amount_cents: number | null; currency: string | null; created_at: string;
};
type Totals = { all: number; general: number; vip: number; vipPaid: number; vipUnpaid: number; revenueCents: number };

function money(cents: number, currency: string = KING_WHOP.currency) {
  return `${currency === "USD" ? "$" : ""}${(cents / 100).toFixed(2)}${currency === "USD" ? "" : ` ${currency}`}`;
}

function when(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

// ── Sign-in ──────────────────────────────────────────────────────────────────
function SignIn({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/king/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json().catch(() => ({} as any));
      if (!res.ok) throw new Error(data.message || "Sign-in failed.");
      onDone();
    } catch (err: any) {
      setError(err?.message || "Sign-in failed.");
      setBusy(false);
    }
  };

  return (
    <KingShell width="max-w-md">
      <KingEyebrow>Host sign-in</KingEyebrow>
      <h1 className="text-2xl font-semibold text-white tracking-tight">{KING_TITLE}</h1>
      <p className="text-sm text-zinc-500 mt-1.5">
        Sign in to see every registration, VIP and General.
      </p>
      <form onSubmit={submit} className="mt-7 space-y-4" data-testid="king-admin-signin" noValidate>
        <div>
          <label htmlFor="ka-email" className="block text-[13px] font-medium text-zinc-300 mb-1.5">Email</label>
          <input id="ka-email" data-testid="king-admin-email" type="email" value={email} autoComplete="username"
            onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className={field()} />
        </div>
        <div>
          <label htmlFor="ka-pass" className="block text-[13px] font-medium text-zinc-300 mb-1.5">Password</label>
          <input id="ka-pass" data-testid="king-admin-password" type="password" value={password} autoComplete="current-password"
            onChange={e => setPassword(e.target.value)} placeholder="Password" className={field()} />
        </div>
        {error && (
          <p role="alert" data-testid="king-admin-error"
            className="text-[13px] text-red-300 rounded-lg bg-red-500/[0.06] border border-red-500/20 px-3 py-2">
            {error}
          </p>
        )}
        <button type="submit" disabled={busy} data-testid="king-admin-submit" className={`${btn("primary", "lg")} w-full`}>
          {busy ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </KingShell>
  );
}

// ── Dashboard ────────────────────────────────────────────────────────────────
function Tile({ label, value, sub, testid }: { label: string; value: React.ReactNode; sub?: string; testid?: string }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#111115] p-4" data-testid={testid}>
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="text-2xl font-semibold text-white tabular-nums mt-1 leading-none">{value}</p>
      {sub && <p className="text-[11px] text-zinc-600 mt-2">{sub}</p>}
    </div>
  );
}

function Dashboard({ onSignedOut }: { onSignedOut: () => void }) {
  const [rows, setRows] = useState<Reg[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "vip" | "general">("all");
  const [q, setQ] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/king/admin/registrations");
      if (res.status === 401) return onSignedOut();
      if (!res.ok) throw new Error("Could not load registrations.");
      const data = await res.json();
      setRows(Array.isArray(data.registrations) ? data.registrations : []);
      setTotals(data.totals || null);
    } catch (err: any) {
      setError(err?.message || "Could not load registrations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);
  useEffect(() => { document.title = `Registrations — ${KING_TITLE}`; }, []);

  const togglePaid = async (r: Reg) => {
    setSaving(r.id);
    try {
      const res = await fetch(`/api/king/admin/registrations/${r.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paid: !r.paid }),
      });
      if (res.status === 401) return onSignedOut();
      if (!res.ok) throw new Error();
      await load();
    } catch {
      setError("Could not update that row.");
    } finally {
      setSaving(null);
    }
  };

  const signOut = async () => {
    await fetch("/api/king/admin/logout", { method: "POST" }).catch(() => {});
    onSignedOut();
  };

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows
      .filter(r => filter === "all" || r.tier === filter)
      .filter(r => !needle
        || r.name.toLowerCase().includes(needle)
        || r.email.toLowerCase().includes(needle)
        || (r.phone || "").toLowerCase().includes(needle));
  }, [rows, filter, q]);

  const tabs: { key: "all" | "vip" | "general"; label: string; count: number }[] = [
    { key: "all", label: "Everyone", count: totals?.all ?? 0 },
    { key: "vip", label: "VIP", count: totals?.vip ?? 0 },
    { key: "general", label: "General", count: totals?.general ?? 0 },
  ];

  return (
    <KingShell width="max-w-6xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-7">
        <div className="min-w-0">
          <KingEyebrow>Host dashboard</KingEyebrow>
          <h1 className="text-2xl sm:text-[28px] font-semibold text-white tracking-tight">Registrations</h1>
          <p className="text-sm text-zinc-500 mt-1.5">
            {KING_EVENT.dateLine} · {KING_EVENT.label}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => void load()} className={btn("secondary", "md")} data-testid="king-admin-refresh">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <a href="/api/king/admin/registrations.csv" className={btn("secondary", "md")} data-testid="king-admin-csv">
            <Download className="w-4 h-4" /> CSV
          </a>
          <button type="button" onClick={() => void signOut()} className={btn("ghost", "md")} data-testid="king-admin-signout">
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </div>

      {/* ── Totals ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Tile label="Total registered" value={totals?.all ?? "—"} testid="king-total-all"
          sub={`${totals?.general ?? 0} General · ${totals?.vip ?? 0} VIP`} />
        <Tile label="VIP paid" value={totals?.vipPaid ?? "—"} testid="king-total-vip-paid"
          sub={totals ? `${totals.vipUnpaid} awaiting payment` : undefined} />
        <Tile label="VIP revenue" value={totals ? money(totals.revenueCents) : "—"} testid="king-total-revenue"
          sub={`${KING_WHOP.price} per VIP seat`} />
        <Tile label="General" value={totals?.general ?? "—"} testid="king-total-general" sub="Free access" />
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex gap-1.5 p-1 rounded-lg bg-white/[0.03] border border-white/[0.08] w-fit" role="tablist" aria-label="Filter by tier">
          {tabs.map(t => (
            <button key={t.key} type="button" role="tab" aria-selected={filter === t.key}
              onClick={() => setFilter(t.key)} data-testid={`king-tab-${t.key}`}
              className={`h-8 px-3 rounded-md text-xs font-semibold transition-colors ${focusRing} ${
                filter === t.key ? "bg-[#d4b461] text-[#14110a]" : "text-zinc-400 hover:text-white"}`}>
              {t.label} <span className="tabular-nums opacity-70">{t.count}</span>
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-0 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 pointer-events-none" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, email or phone"
            aria-label="Search registrations" data-testid="king-admin-search"
            className={`${field()} h-10 pl-9`} />
        </div>
      </div>

      {error && (
        <p role="alert" className="text-[13px] text-red-300 rounded-lg bg-red-500/[0.06] border border-red-500/20 px-3 py-2 mb-4">
          {error}
        </p>
      )}

      {/* ── Table ── */}
      <div className="rounded-xl border border-white/[0.08] bg-[#111115] overflow-hidden">
        {loading ? (
          <p className="flex items-center justify-center gap-2 py-16 text-sm text-zinc-500">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading registrations...
          </p>
        ) : !shown.length ? (
          <div className="py-16 text-center" data-testid="king-admin-empty">
            <div className="w-11 h-11 rounded-lg mx-auto mb-4 flex items-center justify-center bg-white/[0.04] border border-white/[0.08]">
              <Users className="w-5 h-5 text-zinc-400" />
            </div>
            <p className="text-base font-semibold text-white">
              {rows.length ? "Nothing matches that filter" : "No registrations yet"}
            </p>
            <p className="text-sm text-zinc-500 mt-1.5">
              {rows.length ? "Try a different tier or search." : (
                <>Share <span className="text-zinc-300">{KING_PATHS.funnel}</span> to start filling this up.</>
              )}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="king-admin-table">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-[0.08em] text-zinc-500 border-b border-white/[0.06]">
                  <th scope="col" className="px-4 py-3 font-medium">Name</th>
                  <th scope="col" className="px-4 py-3 font-medium">Email</th>
                  <th scope="col" className="px-4 py-3 font-medium">Phone</th>
                  <th scope="col" className="px-4 py-3 font-medium">Access</th>
                  <th scope="col" className="px-4 py-3 font-medium">Payment</th>
                  <th scope="col" className="px-4 py-3 font-medium">Registered</th>
                </tr>
              </thead>
              <tbody>
                {shown.map(r => (
                  <tr key={r.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-white font-medium break-words max-w-[180px]">{r.name}</td>
                    <td className="px-4 py-3 text-zinc-300 break-all max-w-[220px]">
                      <a href={`mailto:${r.email}`} className="hover:text-white underline-offset-2 hover:underline">{r.email}</a>
                    </td>
                    <td className="px-4 py-3 text-zinc-400 whitespace-nowrap">{r.phone || "—"}</td>
                    <td className="px-4 py-3">
                      {r.tier === "vip" ? (
                        <span className="inline-flex items-center gap-1 h-[22px] px-2 rounded-md border border-[#d4b461]/30 bg-[#d4b461]/[0.08] text-[11px] font-semibold text-[#d4b461]">
                          <Sparkles className="w-3 h-3" /> VIP
                        </span>
                      ) : (
                        <span className="inline-flex items-center h-[22px] px-2 rounded-md border border-white/[0.1] bg-white/[0.04] text-[11px] font-semibold text-zinc-300">
                          General
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {r.tier === "vip" ? (
                        <button type="button" onClick={() => void togglePaid(r)} disabled={saving === r.id}
                          data-testid={`king-toggle-paid-${r.id}`}
                          title={r.paid ? `Paid${r.paid_source ? ` via ${r.paid_source}` : ""} — click to undo` : "Click to mark as paid"}
                          className={`inline-flex items-center gap-1.5 h-[26px] px-2 rounded-md border text-[11px] font-semibold transition-colors ${focusRing} ${
                            r.paid
                              ? "border-emerald-500/25 bg-emerald-500/[0.08] text-emerald-300 hover:bg-emerald-500/[0.14]"
                              : "border-white/[0.12] bg-white/[0.03] text-zinc-400 hover:text-white hover:bg-white/[0.07]"}`}>
                          {saving === r.id
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : r.paid ? <CheckCircle2 className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
                          {r.paid ? money(r.amount_cents ?? KING_WHOP.amount * 100, r.currency || KING_WHOP.currency) : "Unpaid"}
                        </button>
                      ) : (
                        <span className="text-[11px] text-zinc-600">Free</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-500 whitespace-nowrap">{when(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="mt-4 text-[11px] text-zinc-600 leading-relaxed max-w-2xl">
        VIP payments flip to paid on their own once the Whop webhook is registered. Until then — or if Whop
        ever misses one — tick the payment cell to set it by hand.
      </p>
    </KingShell>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function KingWebinarAdmin() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/king/admin/session");
        const data = await res.json().catch(() => ({} as any));
        setSignedIn(!!data.signedIn);
      } catch {
        setSignedIn(false);
      }
    })();
  }, []);

  if (signedIn === null) {
    return (
      <KingShell width="max-w-md">
        <p className="flex items-center justify-center gap-2 py-24 text-sm text-zinc-500">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading...
        </p>
      </KingShell>
    );
  }
  return signedIn
    ? <Dashboard onSignedOut={() => setSignedIn(false)} />
    : <SignIn onDone={() => setSignedIn(true)} />;
}
