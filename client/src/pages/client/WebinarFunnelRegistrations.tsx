import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import ClientLayout from "@/components/webinar-funnel/WebinarWorkspaceLayout";
import { formatIST } from "@shared/webinarFunnel";
import { Download, Users, Search } from "lucide-react";
import type { WebinarFunnelRow } from "./WebinarFunnels";
import { funnelDisplayStatus } from "@/components/webinar-funnel/eventTime";
import { BackLink, EmptyState, ErrorState, PageHeader, Skeleton, StatTile, StatusBadge, btn, focusRing } from "@/components/webinar-funnel/ui";

type Registration = { id: string; name: string; email: string; phone: string | null; createdAt: string };

/** Quote a CSV cell; prefix formula-looking values so spreadsheets don't execute them.
 *  Phone-like values ("+91 98765 43210") contain no function calls and are left as-is. */
function csvCell(value: unknown) {
  let s = value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s) && !/^[+\-]?[\d\s().-]+$/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export function registrationsToCsv(rows: Registration[]) {
  const header = ["Name", "Email", "Phone", "Registered At (IST)"];
  const lines = rows.map(r => [r.name, r.email, r.phone || "", formatIST(r.createdAt)]);
  return [header, ...lines].map(r => r.map(csvCell).join(",")).join("\r\n");
}

export default function WebinarFunnelRegistrations({ id }: { id: string }) {
  const [, navigate] = useLocation();
  const [q, setQ] = useState("");

  const { data: webinar } = useQuery<WebinarFunnelRow | null>({ queryKey: [`/api/webinar-funnels/${id}`] });
  const { data, isLoading, isError, refetch } = useQuery<Registration[] | null>({ queryKey: [`/api/webinar-funnels/${id}/registrations`] });
  const rows = data ?? [];

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(r => [r.name, r.email, r.phone || ""].some(v => v.toLowerCase().includes(term)));
  }, [rows, q]);

  const exportCSV = () => {
    // Built entirely in the browser — nothing is written on the server.
    const csv = "﻿" + registrationsToCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(webinar?.slug || "webinar")}-registrations.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <ClientLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <PageHeader
          back={<BackLink onClick={() => navigate("/tools/webinars")} />}
          eyebrow={webinar ? (
            <span className="flex items-center gap-2 min-w-0">
              <StatusBadge status={funnelDisplayStatus(webinar.status, webinar.scheduledAt)} />
              <span className="truncate min-w-0">{webinar.title} · {formatIST(webinar.scheduledAt)}</span>
            </span>
          ) : " "}
          title="Registrations"
          actions={
            <button
              data-testid="btn-export-csv"
              onClick={exportCSV}
              disabled={rows.length === 0}
              className={btn("secondary", "md")}
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
          }
        />

        <div className="grid grid-cols-3 gap-3 mb-6">
          <StatTile label="Registrations" value={rows.length} />
          <StatTile label="With email" value={rows.filter(r => r.email).length} />
          <StatTile label="With phone" value={rows.filter(r => r.phone).length} />
        </div>

        {rows.length > 0 && (
          <div className="relative mb-4">
            <label htmlFor="reg-search" className="sr-only">Search registrations</label>
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" aria-hidden />
            <input id="reg-search" type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, email or phone"
              className={`w-full h-11 pl-10 pr-4 rounded-lg text-sm text-white placeholder:text-zinc-600 bg-white/[0.03] border border-white/[0.1] focus:border-[#d4b461]/60 ${focusRing}`} />
          </div>
        )}

        {isLoading ? (
          <Skeleton className="h-48" />
        ) : isError ? (
          <ErrorState title="Couldn't load registrations" description="Check your connection and try again." onRetry={() => refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState
            testid="registrations-empty"
            icon={Users}
            title="No registrations yet"
            description={webinar?.status === "draft" ? "Publish the webinar and share the link to start collecting leads." : "Share your registration link to start collecting leads."}
          />
        ) : (
          <>
            {/* Mobile: stacked cards */}
            <ul className="sm:hidden space-y-2" aria-label="Registrations">
              {filtered.map(r => (
                <li key={r.id} className="rounded-xl border border-white/[0.08] bg-[#111115] p-4">
                  <p className="text-sm font-semibold text-white break-words">{r.name}</p>
                  <a href={`mailto:${r.email}`} className="block text-[13px] text-zinc-300 break-all mt-0.5 hover:underline">{r.email}</a>
                  <div className="flex items-center justify-between gap-3 mt-2 text-xs text-zinc-500">
                    <span>{r.phone || "No phone"}</span>
                    <span className="text-right">{formatIST(r.createdAt)}</span>
                  </div>
                </li>
              ))}
              {filtered.length === 0 && <li className="py-8 text-center text-zinc-500 text-sm">No matches for “{q}”</li>}
            </ul>
            {/* sm+: table */}
            <div className="hidden sm:block rounded-xl overflow-x-auto border border-white/[0.08] bg-[#111115]">
              <table className="w-full text-sm" data-testid="registrations-table">
                <thead>
                  <tr className="border-b border-white/[0.08]">
                    {["Name", "Email", "Phone", "Registered (IST)"].map(h => (
                      <th key={h} scope="col" className="text-left text-xs font-medium text-zinc-500 px-4 py-3 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <tr key={r.id} className="border-t border-white/[0.05] first:border-t-0 hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-white font-medium whitespace-nowrap">{r.name}</td>
                      <td className="px-4 py-3 text-zinc-300"><a href={`mailto:${r.email}`} className="hover:underline">{r.email}</a></td>
                      <td className="px-4 py-3 text-zinc-400 whitespace-nowrap">{r.phone || <span className="text-zinc-700">—</span>}</td>
                      <td className="px-4 py-3 text-zinc-500 whitespace-nowrap text-xs">{formatIST(r.createdAt)}</td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-zinc-500 text-sm">No matches for “{q}”</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </ClientLayout>
  );
}
