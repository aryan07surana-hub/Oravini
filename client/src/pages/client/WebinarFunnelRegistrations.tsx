import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import ClientLayout from "@/components/layout/ClientLayout";
import { formatIST } from "@shared/webinarFunnel";
import { ArrowLeft, Download, Users, Mail, Phone, Search } from "lucide-react";
import type { WebinarFunnelRow } from "./WebinarFunnels";

const GOLD = "#d4b461";

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
  const { data, isLoading } = useQuery<Registration[] | null>({ queryKey: [`/api/webinar-funnels/${id}/registrations`] });
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
      <div className="max-w-5xl mx-auto px-6 py-10">
        <button onClick={() => navigate("/tools/webinars")} className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-300 mb-5">
          <ArrowLeft className="w-3.5 h-3.5" /> All webinars
        </button>

        <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(244,114,182,0.12)", border: "1px solid rgba(244,114,182,0.25)" }}>
              <Users className="w-4 h-4 text-pink-400" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-black text-white truncate">Registrations</h1>
              <p className="text-xs text-zinc-500 truncate">
                {webinar ? <>{webinar.title} · {formatIST(webinar.scheduledAt)}</> : " "}
              </p>
            </div>
          </div>
          <button
            data-testid="btn-export-csv"
            onClick={exportCSV}
            disabled={rows.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
            style={{ background: `${GOLD}18`, border: `1px solid ${GOLD}40`, color: GOLD }}
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: "Registrations", value: rows.length, icon: Users, color: "#f472b6" },
            { label: "With email", value: rows.filter(r => r.email).length, icon: Mail, color: GOLD },
            { label: "With phone", value: rows.filter(r => r.phone).length, icon: Phone, color: "#34d399" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-3.5 h-3.5" style={{ color }} />
                <span className="text-xs text-zinc-500">{label}</span>
              </div>
              <p className="text-2xl font-black text-white">{value}</p>
            </div>
          ))}
        </div>

        {rows.length > 0 && (
          <div className="relative mb-4">
            <Search className="w-4 h-4 text-zinc-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, email or phone"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-white placeholder:text-zinc-600"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", outline: "none" }} />
          </div>
        )}

        {isLoading ? (
          <div className="h-48 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.03)" }} />
        ) : rows.length === 0 ? (
          <div className="text-center py-16 rounded-2xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-white font-bold mb-1">No registrations yet</p>
            <p className="text-sm text-zinc-500">{webinar?.status === "draft" ? "Publish the webinar and share the link to start collecting leads." : "Share your registration link to start collecting leads."}</p>
          </div>
        ) : (
          <div className="rounded-2xl overflow-x-auto" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
            <table className="w-full text-sm" data-testid="registrations-table">
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                  {["Name", "Email", "Phone", "Registered (IST)"].map(h => (
                    <th key={h} className="text-left text-[11px] font-semibold text-zinc-500 uppercase tracking-wider px-4 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                    <td className="px-4 py-3 text-white font-medium whitespace-nowrap">{r.name}</td>
                    <td className="px-4 py-3 text-zinc-300"><a href={`mailto:${r.email}`} className="hover:underline">{r.email}</a></td>
                    <td className="px-4 py-3 text-zinc-400 whitespace-nowrap">{r.phone || <span className="text-zinc-700">—</span>}</td>
                    <td className="px-4 py-3 text-zinc-500 whitespace-nowrap text-xs">{formatIST(r.createdAt)}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-zinc-600 text-sm">No matches for “{q}”</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ClientLayout>
  );
}
