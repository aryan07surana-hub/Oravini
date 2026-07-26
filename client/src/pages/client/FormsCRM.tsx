import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import ClientLayout from "@/components/layout/ClientLayout";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Users, Mail, Phone, Search, Download, ArrowLeft, User,
  FileText, Calendar, SlidersHorizontal, ChevronDown,
} from "lucide-react";

const GOLD = "#d4b461";

const TYPE_COLORS: Record<string, string> = {
  form: "#818cf8",
  quiz: "#34d399",
  survey: GOLD,
  event: "#f472b6",
};

function Avatar({ name, size = 10 }: { name: string; size?: number }) {
  const initials = name
    .split(" ")
    .map(w => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  return (
    <div
      className={`w-${size} h-${size} rounded-full flex items-center justify-center text-xs font-black text-black flex-shrink-0`}
      style={{ background: GOLD, width: size * 4, height: size * 4, fontSize: size < 8 ? 11 : 13 }}
    >
      {initials || "?"}
    </div>
  );
}

export default function FormsCRM() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filterForm, setFilterForm] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  const { data: contacts = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/form-contacts"],
    queryFn: () => apiRequest("GET", "/api/form-contacts"),
  });

  // Build unique form list for filter
  const uniqueForms = useMemo(() => {
    const seen = new Map<string, { id: string; title: string; type: string }>();
    for (const c of contacts) {
      if (!seen.has(c.formId)) seen.set(c.formId, { id: c.formId, title: c.formTitle, type: c.formType });
    }
    return Array.from(seen.values());
  }, [contacts]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return contacts.filter(c => {
      const matchSearch = !q || (c.name || "").toLowerCase().includes(q) || (c.email || "").toLowerCase().includes(q) || (c.phone || "").toLowerCase().includes(q);
      const matchForm = filterForm === "all" || c.formId === filterForm;
      const matchType = filterType === "all" || c.formType === filterType;
      return matchSearch && matchForm && matchType;
    });
  }, [contacts, search, filterForm, filterType]);

  const exportCSV = () => {
    if (!filtered.length) { toast({ title: "No contacts to export" }); return; }
    const headers = ["Name", "Email", "Phone", "Form", "Form Type", "Date"];
    const rows = filtered.map(c => [
      c.name || "",
      c.email || "",
      c.phone || "",
      c.formTitle || "",
      c.formType || "",
      c.submittedAt ? new Date(c.submittedAt).toLocaleString() : "",
    ]);
    const csv = [headers, ...rows].map(r => r.map((v: string) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "form-contacts.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const totalWithEmail = contacts.filter(c => c.email).length;
  const totalWithPhone = contacts.filter(c => c.phone).length;

  return (
    <ClientLayout>
      <div className="max-w-4xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="flex items-start gap-4 mb-8">
          <button
            onClick={() => navigate("/tools/forms")}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-500 hover:text-white transition-colors flex-shrink-0 mt-0.5"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-black text-white">Contacts CRM</h1>
            <p className="text-sm text-zinc-500 mt-1">All leads collected from your forms, quizzes, and surveys</p>
          </div>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105 flex-shrink-0"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Total Contacts", value: contacts.length, icon: Users, color: GOLD },
            { label: "With Email", value: totalWithEmail, icon: Mail, color: "#818cf8" },
            { label: "With Phone", value: totalWithPhone, icon: Phone, color: "#34d399" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
                  <Icon className="w-3.5 h-3.5" style={{ color }} />
                </div>
                <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">{label}</span>
              </div>
              <p className="text-3xl font-black text-white">{value}</p>
            </div>
          ))}
        </div>

        {/* Search + filters */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <div className="flex-1 relative min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, email, or phone..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-white"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", outline: "none" }}
            />
          </div>

          <button
            onClick={() => setShowFilters(f => !f)}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: showFilters ? `${GOLD}15` : "rgba(255,255,255,0.04)",
              border: `1px solid ${showFilters ? GOLD + "40" : "rgba(255,255,255,0.09)"}`,
              color: showFilters ? GOLD : "rgba(255,255,255,0.5)",
            }}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {(filterForm !== "all" || filterType !== "all") && (
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 ml-0.5" />
            )}
          </button>

          <span className="text-xs text-zinc-600 flex-shrink-0">
            {filtered.length} of {contacts.length}
          </span>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="flex items-center gap-3 mb-5 flex-wrap p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">Form</label>
              <select
                value={filterForm}
                onChange={e => setFilterForm(e.target.value)}
                className="px-3 py-2 rounded-lg text-xs text-white appearance-none"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", outline: "none", minWidth: 160 }}
              >
                <option value="all">All forms</option>
                {uniqueForms.map(f => (
                  <option key={f.id} value={f.id}>{f.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">Type</label>
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                className="px-3 py-2 rounded-lg text-xs text-white appearance-none"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", outline: "none" }}
              >
                <option value="all">All types</option>
                <option value="form">Form</option>
                <option value="quiz">Quiz</option>
                <option value="survey">Survey</option>
                <option value="event">Event</option>
              </select>
            </div>
            {(filterForm !== "all" || filterType !== "all") && (
              <button
                onClick={() => { setFilterForm("all"); setFilterType("all"); }}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors self-end pb-2"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* Contacts table */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.03)" }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 rounded-2xl" style={{ border: "1px dashed rgba(255,255,255,0.08)" }}>
            <Users className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
            <p className="text-white font-bold mb-2">{contacts.length === 0 ? "No contacts yet" : "No contacts match your filters"}</p>
            <p className="text-zinc-500 text-sm">
              {contacts.length === 0
                ? "Publish forms with Name or Email questions. Contacts appear here after people fill them out."
                : "Try clearing your search or filters."}
            </p>
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
            {/* Table header */}
            <div
              className="grid gap-4 px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-600"
              style={{ gridTemplateColumns: "2fr 2fr 1.5fr 1.5fr 1fr", background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}
            >
              <span>Name</span>
              <span>Email</span>
              <span>Phone</span>
              <span>Form</span>
              <span>Date</span>
            </div>

            {/* Rows */}
            <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
              {filtered.map((c, i) => {
                const color = TYPE_COLORS[c.formType] || GOLD;
                return (
                  <div
                    key={c.submissionId}
                    className="grid gap-4 px-5 py-4 items-center hover:bg-white/[0.02] transition-colors"
                    style={{ gridTemplateColumns: "2fr 2fr 1.5fr 1.5fr 1fr" }}
                  >
                    {/* Name */}
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={c.name || String(i + 1)} size={8} />
                      <span className="text-sm font-semibold text-white truncate">{c.name || <span className="text-zinc-600 italic">Anonymous</span>}</span>
                    </div>

                    {/* Email */}
                    <div className="flex items-center gap-1.5 min-w-0">
                      {c.email ? (
                        <>
                          <Mail className="w-3 h-3 text-zinc-600 flex-shrink-0" />
                          <a
                            href={`mailto:${c.email}`}
                            className="text-xs text-zinc-300 hover:text-white transition-colors truncate"
                          >
                            {c.email}
                          </a>
                        </>
                      ) : <span className="text-zinc-700 text-xs">—</span>}
                    </div>

                    {/* Phone */}
                    <div className="flex items-center gap-1.5 min-w-0">
                      {c.phone ? (
                        <>
                          <Phone className="w-3 h-3 text-zinc-600 flex-shrink-0" />
                          <span className="text-xs text-zinc-300 truncate">{c.phone}</span>
                        </>
                      ) : <span className="text-zinc-700 text-xs">—</span>}
                    </div>

                    {/* Form */}
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: `${color}15`, color }}>
                        {c.formType}
                      </span>
                      <span className="text-xs text-zinc-500 truncate">{c.formTitle}</span>
                    </div>

                    {/* Date */}
                    <span className="text-xs text-zinc-600">
                      {c.submittedAt
                        ? new Date(c.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                        : "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </ClientLayout>
  );
}
