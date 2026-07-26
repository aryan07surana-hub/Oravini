import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import ClientLayout from "@/components/layout/ClientLayout";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient, ApiError } from "@/lib/queryClient";
import {
  Plus, FileText, BarChart2, ExternalLink, Trash2, Copy, Eye, CheckCircle2,
  Clock, Zap, ClipboardList, Users, Mail, GitBranch, TrendingUp,
} from "lucide-react";

const GOLD = "#d4b461";
const TYPE_LABELS: Record<string, string> = { form: "Form", quiz: "Quiz", survey: "Survey", event: "Event Registration" };
const TYPE_COLORS: Record<string, string> = { form: "#818cf8", quiz: "#34d399", survey: GOLD, event: "#f472b6" };

function CreateModal({ onClose, onCreate }: { onClose: () => void; onCreate: (data: any) => void }) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState("form");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleCreate = async () => {
    if (!title.trim()) { toast({ title: "Title required", variant: "destructive" }); return; }
    setLoading(true);
    try {
      await onCreate({ title: title.trim(), type, description: description.trim() || undefined });
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}>
      <div className="w-full max-w-md rounded-2xl p-6" style={{ background: "#0e0e10", border: "1px solid rgba(212,180,97,0.2)" }}>
        <h2 className="text-lg font-black text-white mb-5">Create New Form</h2>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">Title *</label>
            <input
              data-testid="input-form-title"
              value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Audience Quiz, Event Registration..."
              className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder:text-zinc-600"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", outline: "none" }}
              onKeyDown={e => { if (e.key === "Enter") handleCreate(); }}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">Type</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(TYPE_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  data-testid={`type-btn-${key}`}
                  onClick={() => setType(key)}
                  className="px-3 py-2.5 rounded-xl text-xs font-bold transition-all"
                  style={{
                    background: type === key ? `${TYPE_COLORS[key]}18` : "rgba(255,255,255,0.03)",
                    border: `1px solid ${type === key ? TYPE_COLORS[key] + "50" : "rgba(255,255,255,0.07)"}`,
                    color: type === key ? TYPE_COLORS[key] : "rgba(255,255,255,0.4)",
                  }}
                >{label}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">Description (optional)</label>
            <textarea
              data-testid="input-form-description"
              value={description} onChange={e => setDescription(e.target.value)}
              placeholder="What is this form about?"
              rows={2}
              className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder:text-zinc-600 resize-none"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", outline: "none" }}
            />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-zinc-400" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>Cancel</button>
          <button
            data-testid="btn-create-form"
            onClick={handleCreate}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105 disabled:opacity-50"
            style={{ background: `${GOLD}18`, border: `1px solid ${GOLD}40`, color: GOLD }}
          >{loading ? "Creating..." : "Create Form"}</button>
        </div>
      </div>
    </div>
  );
}

export default function FormsHub() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);

  const { data: _formsList, isLoading } = useQuery<any[]>({ queryKey: ["/api/forms"] });
  const formsList = _formsList ?? [];

  const { data: contacts = [] } = useQuery<any[]>({
    queryKey: ["/api/form-contacts"],
    queryFn: () => apiRequest("GET", "/api/form-contacts"),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/forms", data),
    onSuccess: (form: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/forms"] });
      setCreating(false);
      navigate(`/tools/forms/${form.id}`);
    },
    onError: (e: any) => {
      const msg = e instanceof ApiError && e.status === 401 ? "Session expired. Please log in again." : e.message;
      toast({ title: "Failed to create form", description: msg, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/forms/${id}`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/forms"] }),
  });

  const copyLink = (slug: string, status: string) => {
    if (status !== "published") { toast({ title: "Publish the form first to get a shareable link", variant: "destructive" }); return; }
    const url = `${window.location.origin}/f/${slug}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copied!", description: url });
  };

  const published = formsList.filter((f: any) => f.status === "published");
  const drafts = formsList.filter((f: any) => f.status === "draft");
  const formsWithLogic = formsList.filter((f: any) => false); // logic is per-question, tracked visually

  return (
    <ClientLayout>
      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Header */}
        <div data-tour="forms-hub-main" className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(212,180,97,0.12)", border: "1px solid rgba(212,180,97,0.2)" }}>
              <ClipboardList className="w-4 h-4" style={{ color: GOLD }} />
            </div>
            <div>
              <h1 className="text-xl font-black text-white">Forms & Surveys</h1>
              <p className="text-xs text-zinc-500">Build forms, quizzes, surveys — with logic, analytics & CRM</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/tools/forms/crm")}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-bold transition-all hover:scale-105"
              style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)", color: "#818cf8" }}
            >
              <Users className="w-4 h-4" />
              CRM
              {contacts.length > 0 && (
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md" style={{ background: "rgba(99,102,241,0.2)", color: "#818cf8" }}>
                  {contacts.length}
                </span>
              )}
            </button>
            <button
              data-testid="btn-new-form"
              onClick={() => setCreating(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105"
              style={{ background: `${GOLD}18`, border: `1px solid ${GOLD}40`, color: GOLD }}
            >
              <Plus className="w-4 h-4" /> New Form
            </button>
          </div>
        </div>

        {/* Overview stats */}
        {formsList.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Total Forms", value: formsList.length, icon: FileText, color: GOLD },
              { label: "Published", value: published.length, icon: CheckCircle2, color: "#34d399" },
              { label: "Drafts", value: drafts.length, icon: Clock, color: "#818cf8" },
              { label: "Contacts", value: contacts.length, icon: Users, color: "#f472b6" },
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
        )}

        {/* Quick access: CRM banner when contacts exist */}
        {contacts.length > 0 && formsList.length > 0 && (
          <div
            className="flex items-center gap-4 px-5 py-4 rounded-2xl mb-6 cursor-pointer transition-all hover:scale-[1.005]"
            style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.2)" }}
            onClick={() => navigate("/tools/forms/crm")}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)" }}>
              <Users className="w-4.5 h-4.5 text-indigo-400" style={{ width: 18, height: 18 }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white">{contacts.length} contact{contacts.length !== 1 ? "s" : ""} collected</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                {contacts.filter((c: any) => c.email).length} with email · {contacts.filter((c: any) => c.phone).length} with phone
              </p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold flex-shrink-0" style={{ background: "rgba(99,102,241,0.15)", color: "#818cf8" }}>
              Open CRM →
            </div>
          </div>
        )}

        {/* Forms list */}
        <div data-tour="forms-hub-list" />
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.03)" }} />)}
          </div>
        ) : formsList.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(212,180,97,0.08)", border: "1px solid rgba(212,180,97,0.15)" }}>
              <ClipboardList className="w-7 h-7" style={{ color: GOLD }} />
            </div>
            <p className="text-white font-bold text-lg mb-2">No forms yet</p>
            <p className="text-zinc-500 text-sm mb-6">Create your first form, quiz, or survey. Share the link in your story and track every response.</p>
            <button onClick={() => setCreating(true)} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold" style={{ background: `${GOLD}18`, border: `1px solid ${GOLD}40`, color: GOLD }}>
              <Plus className="w-4 h-4" /> Create your first form
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {formsList.map((form: any) => {
              const color = TYPE_COLORS[form.type] || GOLD;
              return (
                <div key={form.id} data-testid={`form-card-${form.id}`} className="rounded-2xl p-5 flex items-center gap-4 transition-all hover:scale-[1.005]" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
                    <FileText className="w-4 h-4" style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="text-sm font-bold text-white truncate">{form.title}</p>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0" style={{ background: `${color}18`, color }}>{TYPE_LABELS[form.type] || form.type}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0 ${form.status === "published" ? "bg-emerald-500/15 text-emerald-400" : "bg-zinc-800 text-zinc-500"}`}>
                        {form.status === "published" ? "● Live" : "Draft"}
                      </span>
                    </div>
                    {form.description && <p className="text-xs text-zinc-500 truncate">{form.description}</p>}
                    <p className="text-[11px] text-zinc-600 mt-0.5">{new Date(form.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button data-testid={`btn-copy-${form.id}`} onClick={() => copyLink(form.slug, form.status)} title="Copy link" className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white transition-colors" style={{ background: "rgba(255,255,255,0.04)" }}>
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button data-testid={`btn-responses-${form.id}`} onClick={() => navigate(`/tools/forms/${form.id}/responses`)} title="Analytics" className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-emerald-400 transition-colors" style={{ background: "rgba(255,255,255,0.04)" }}>
                      <BarChart2 className="w-3.5 h-3.5" />
                    </button>
                    <button data-testid={`btn-edit-${form.id}`} onClick={() => navigate(`/tools/forms/${form.id}`)} title="Edit form" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105" style={{ background: `${color}15`, border: `1px solid ${color}30`, color }}>
                      Edit <ExternalLink className="w-3 h-3" />
                    </button>
                    <button data-testid={`btn-delete-${form.id}`} onClick={() => { if (confirm("Delete this form and all responses?")) deleteMutation.mutate(form.id); }} title="Delete" className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-600 hover:text-red-400 transition-colors" style={{ background: "rgba(255,255,255,0.04)" }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {creating && <CreateModal onClose={() => setCreating(false)} onCreate={data => createMutation.mutateAsync(data)} />}
      </div>
    </ClientLayout>
  );
}
