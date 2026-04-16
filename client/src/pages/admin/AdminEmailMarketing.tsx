import { useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Mail, Send, Zap, BarChart2, Plus, Trash2, Edit2, Check, X,
  ChevronDown, ChevronRight, PlayCircle, PauseCircle, Eye, Clock, Users, RefreshCw, Megaphone
} from "lucide-react";

const GOLD = "#d4b461";

const TRIGGER_LABELS: Record<string, { label: string; color: string; desc: string }> = {
  join:    { label: "On Join",    color: "border-blue-500/40 text-blue-400",    desc: "Sent when a new member registers" },
  upgrade: { label: "On Upgrade", color: "border-emerald-500/40 text-emerald-400", desc: "Sent when a member upgrades their plan" },
  liked:   { label: "Re-engage",  color: "border-violet-500/40 text-violet-400",  desc: "For engaged members — relationship & upsell" },
};

const SEGMENT_LABELS: Record<string, string> = {
  all: "All Members", free: "Tier 1 — Free", starter: "Tier 2 — Starter",
  growth: "Tier 3 — Growth", pro: "Tier 4 — Pro", elite: "Elite",
};

function StatCard({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string | number; sub?: string }) {
  return (
    <Card className="border border-card-border">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Icon className="w-4 h-4" style={{ color: GOLD }} />
          <p className="text-xs text-zinc-500">{label}</p>
        </div>
        <p className="text-2xl font-bold text-white">{value}</p>
        {sub && <p className="text-xs text-zinc-600 mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function AdminEmailMarketing() {
  const [activeTab, setActiveTab] = useState<"sequences" | "broadcasts" | "stats">("sequences");
  const [selectedSeqId, setSelectedSeqId] = useState<string | null>(null);
  const [editingEmail, setEditingEmail] = useState<any>(null);
  const [newEmailOpen, setNewEmailOpen] = useState(false);
  const [newSeqOpen, setNewSeqOpen] = useState(false);
  const [broadcastForm, setBroadcastForm] = useState({ name: "", subject: "", bodyHtml: "", segment: "all" });
  const { toast } = useToast();

  const { data: sequences = [], isLoading: seqLoading } = useQuery<any[]>({ queryKey: ["/api/admin/email/sequences"] });
  const { data: seqEmails = [], isLoading: emailsLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/email/sequences", selectedSeqId, "emails"],
    enabled: !!selectedSeqId,
  });
  const { data: statsData } = useQuery<{ stats: any; logs: any[] }>({ queryKey: ["/api/admin/email/stats"] });
  const { data: broadcasts = [] } = useQuery<any[]>({ queryKey: ["/api/admin/email/broadcasts"] });

  const selectedSeq = sequences.find((s: any) => s.id === selectedSeqId);

  const seedMut = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/email/seed-sequences"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email/sequences"] });
      toast({ title: "Sequences seeded!", description: "3 pre-built sequences are ready." });
    },
  });

  const toggleSeq = useMutation({
    mutationFn: (seq: any) => apiRequest("PATCH", `/api/admin/email/sequences/${seq.id}`, { active: !seq.active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/email/sequences"] }),
  });

  const deleteSeq = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/email/sequences/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email/sequences"] });
      setSelectedSeqId(null);
      toast({ title: "Sequence deleted" });
    },
  });

  const createSeqMut = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/admin/email/sequences", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email/sequences"] });
      setNewSeqOpen(false);
      toast({ title: "Sequence created" });
    },
  });

  const createEmailMut = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/api/admin/email/sequences/${selectedSeqId}/emails`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email/sequences", selectedSeqId, "emails"] });
      setNewEmailOpen(false);
      toast({ title: "Email added" });
    },
  });

  const updateEmailMut = useMutation({
    mutationFn: ({ id, ...data }: any) => apiRequest("PATCH", `/api/admin/email/sequence-emails/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email/sequences", selectedSeqId, "emails"] });
      setEditingEmail(null);
      toast({ title: "Email updated" });
    },
  });

  const deleteEmailMut = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/email/sequence-emails/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/email/sequences", selectedSeqId, "emails"] }),
  });

  const broadcastMut = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/admin/email/broadcast", data),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email/broadcasts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email/stats"] });
      setBroadcastForm({ name: "", subject: "", bodyHtml: "", segment: "all" });
      toast({ title: `Broadcast sent!`, description: `Delivered to ${res.sent} recipients.` });
    },
    onError: (e: any) => toast({ title: "Broadcast failed", description: e.message, variant: "destructive" }),
  });

  const stats = statsData?.stats;
  const logs = statsData?.logs ?? [];
  const openRate = stats?.totalSent > 0 ? Math.round((stats.totalOpened / stats.totalSent) * 100) : 0;

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Mail className="w-6 h-6" style={{ color: GOLD }} />
              Email Marketing
            </h1>
            <p className="text-sm text-zinc-500 mt-0.5">Sequences, broadcasts, and nurture flows</p>
          </div>
          <div className="flex gap-2">
            {sequences.length === 0 && (
              <Button
                data-testid="button-seed-sequences"
                size="sm"
                onClick={() => seedMut.mutate()}
                disabled={seedMut.isPending}
                className="gap-1.5 text-xs"
                style={{ background: GOLD, color: "#000", fontWeight: 700, border: "none" }}
              >
                {seedMut.isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                Seed Pre-built Sequences
              </Button>
            )}
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={Send} label="Emails Sent Today" value={stats?.sentToday ?? 0} />
          <StatCard icon={Mail} label="Total Sent" value={stats?.totalSent ?? 0} />
          <StatCard icon={Eye} label="Open Rate" value={`${openRate}%`} sub={`${stats?.totalOpened ?? 0} opens`} />
          <StatCard icon={Users} label="Active Enrollments" value={stats?.activeEnrollments ?? 0} sub="in sequences" />
        </div>

        {/* Tabs */}
        <div className="flex rounded-lg border border-zinc-800 p-1 gap-1 w-fit">
          {(["sequences", "broadcasts", "stats"] as const).map(tab => (
            <button
              key={tab}
              data-testid={`tab-email-${tab}`}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all capitalize ${activeTab === tab ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-white"}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ── Sequences Tab ── */}
        {activeTab === "sequences" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left: sequence list */}
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Sequences ({sequences.length})</p>
                <button
                  data-testid="button-new-sequence"
                  onClick={() => setNewSeqOpen(v => !v)}
                  className="text-xs font-medium flex items-center gap-1 px-2 py-1 rounded-md hover:bg-zinc-800 transition-colors"
                  style={{ color: GOLD }}
                >
                  <Plus className="w-3.5 h-3.5" /> New
                </button>
              </div>

              {newSeqOpen && <NewSequenceForm onSave={(d: any) => createSeqMut.mutate(d)} onClose={() => setNewSeqOpen(false)} isPending={createSeqMut.isPending} />}

              {seqLoading ? (
                <div className="space-y-2 animate-pulse">{[1,2,3].map(i => <div key={i} className="h-16 bg-zinc-800 rounded-lg" />)}</div>
              ) : sequences.length === 0 ? (
                <div className="text-center py-12 text-zinc-600 text-sm">
                  <Mail className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  No sequences yet.<br />Click "Seed Pre-built Sequences" above.
                </div>
              ) : (
                sequences.map((seq: any) => {
                  const meta = TRIGGER_LABELS[seq.trigger] || { label: seq.trigger, color: "border-zinc-600 text-zinc-400", desc: "" };
                  const isSelected = selectedSeqId === seq.id;
                  return (
                    <div
                      key={seq.id}
                      data-testid={`seq-card-${seq.id}`}
                      onClick={() => setSelectedSeqId(isSelected ? null : seq.id)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${isSelected ? "border-[#d4b461]/40 bg-[#d4b461]/5" : "border-zinc-800 hover:border-zinc-700 bg-zinc-900/50"}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{seq.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className={`text-[10px] h-4 px-1.5 ${meta.color}`}>{meta.label}</Badge>
                            <span className="text-[10px] text-zinc-600">{seq.emailCount} email{seq.emailCount !== 1 ? "s" : ""}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            data-testid={`toggle-seq-${seq.id}`}
                            onClick={e => { e.stopPropagation(); toggleSeq.mutate(seq); }}
                            className="p-1 rounded hover:bg-zinc-700 transition-colors"
                          >
                            {seq.active
                              ? <PlayCircle className="w-4 h-4 text-emerald-400" />
                              : <PauseCircle className="w-4 h-4 text-zinc-600" />}
                          </button>
                          <button
                            data-testid={`delete-seq-${seq.id}`}
                            onClick={e => { e.stopPropagation(); if (confirm("Delete this sequence?")) deleteSeq.mutate(seq.id); }}
                            className="p-1 rounded hover:bg-zinc-700 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-zinc-600 hover:text-red-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Right: selected sequence emails */}
            <div className="lg:col-span-2">
              {!selectedSeq ? (
                <div className="flex flex-col items-center justify-center h-48 text-zinc-600 text-sm border border-zinc-800 rounded-xl bg-zinc-900/30">
                  <ChevronRight className="w-8 h-8 mb-2 opacity-30" />
                  Select a sequence to see its emails
                </div>
              ) : (
                <Card className="border border-card-border">
                  <CardHeader className="pb-3 border-b border-zinc-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base font-bold text-white">{selectedSeq.name}</CardTitle>
                        <p className="text-xs text-zinc-500 mt-0.5">{selectedSeq.description}</p>
                        <Badge variant="outline" className={`text-[10px] mt-1.5 ${TRIGGER_LABELS[selectedSeq.trigger]?.color}`}>
                          {TRIGGER_LABELS[selectedSeq.trigger]?.label} — {TRIGGER_LABELS[selectedSeq.trigger]?.desc}
                        </Badge>
                      </div>
                      <button
                        data-testid="button-add-email"
                        onClick={() => setNewEmailOpen(v => !v)}
                        className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-white transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Email
                      </button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    {newEmailOpen && (
                      <EmailEditor
                        initial={{ subject: "", bodyHtml: "", delayDays: 0, sortOrder: (seqEmails?.length ?? 0) + 1 }}
                        onSave={(d: any) => createEmailMut.mutate(d)}
                        onClose={() => setNewEmailOpen(false)}
                        isPending={createEmailMut.isPending}
                      />
                    )}
                    {emailsLoading ? (
                      <div className="space-y-2 animate-pulse">{[1,2,3].map(i => <div key={i} className="h-14 bg-zinc-800 rounded-lg" />)}</div>
                    ) : (seqEmails?.length ?? 0) === 0 ? (
                      <p className="text-center text-sm text-zinc-600 py-8">No emails in this sequence yet. Add the first one above.</p>
                    ) : (
                      (seqEmails ?? []).map((em: any, idx: number) => (
                        <div key={em.id} data-testid={`email-row-${em.id}`}>
                          {editingEmail?.id === em.id ? (
                            <EmailEditor
                              initial={editingEmail}
                              onSave={(d: any) => updateEmailMut.mutate({ id: em.id, ...d })}
                              onClose={() => setEditingEmail(null)}
                              isPending={updateEmailMut.isPending}
                            />
                          ) : (
                            <div className="flex items-start gap-3 p-3 rounded-lg bg-zinc-800/40 border border-zinc-800 group">
                              <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center shrink-0 text-xs font-bold text-zinc-400">{idx + 1}</div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-white truncate">{em.subject}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <Clock className="w-3 h-3 text-zinc-600" />
                                  <span className="text-xs text-zinc-500">Day {em.delayDays}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  data-testid={`edit-email-${em.id}`}
                                  onClick={() => setEditingEmail(em)}
                                  className="p-1 rounded hover:bg-zinc-700 transition-colors"
                                >
                                  <Edit2 className="w-3.5 h-3.5 text-zinc-400 hover:text-white" />
                                </button>
                                <button
                                  data-testid={`delete-email-${em.id}`}
                                  onClick={() => { if (confirm("Delete this email?")) deleteEmailMut.mutate(em.id); }}
                                  className="p-1 rounded hover:bg-zinc-700 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-zinc-600 hover:text-red-400" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* ── Broadcasts Tab ── */}
        {activeTab === "broadcasts" && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <Card className="border border-card-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Megaphone className="w-4 h-4" style={{ color: GOLD }} />
                    Send Broadcast
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-xs text-zinc-500 mb-1 block">Campaign Name</label>
                    <Input
                      data-testid="input-broadcast-name"
                      placeholder="e.g. March Upsell Push"
                      value={broadcastForm.name}
                      onChange={e => setBroadcastForm(f => ({ ...f, name: e.target.value }))}
                      className="bg-zinc-800/60 border-zinc-700 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 mb-1 block">Segment</label>
                    <select
                      data-testid="select-broadcast-segment"
                      value={broadcastForm.segment}
                      onChange={e => setBroadcastForm(f => ({ ...f, segment: e.target.value }))}
                      className="w-full h-9 px-3 rounded-md text-sm bg-zinc-800/60 border border-zinc-700 text-white outline-none"
                    >
                      {Object.entries(SEGMENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 mb-1 block">Subject Line</label>
                    <Input
                      data-testid="input-broadcast-subject"
                      placeholder="e.g. We just dropped something big..."
                      value={broadcastForm.subject}
                      onChange={e => setBroadcastForm(f => ({ ...f, subject: e.target.value }))}
                      className="bg-zinc-800/60 border-zinc-700 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 mb-1 block">Email Body (HTML or plain text)</label>
                    <Textarea
                      data-testid="input-broadcast-body"
                      placeholder="<p>Hey {{name}},</p><p>...</p>"
                      value={broadcastForm.bodyHtml}
                      onChange={e => setBroadcastForm(f => ({ ...f, bodyHtml: e.target.value }))}
                      className="bg-zinc-800/60 border-zinc-700 text-sm min-h-[180px] font-mono text-xs"
                    />
                    <p className="text-[10px] text-zinc-600 mt-1">Use {"{{name}}"} and {"{{email}}"} as variables</p>
                  </div>
                  <Button
                    data-testid="button-send-broadcast"
                    onClick={() => broadcastMut.mutate(broadcastForm)}
                    disabled={broadcastMut.isPending || !broadcastForm.name || !broadcastForm.subject || !broadcastForm.bodyHtml}
                    className="w-full gap-2 font-semibold"
                    style={{ background: GOLD, color: "#000", border: "none", opacity: broadcastMut.isPending ? 0.7 : 1 }}
                  >
                    {broadcastMut.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {broadcastMut.isPending ? "Sending..." : "Send Broadcast"}
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-3">
              <Card className="border border-card-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Broadcast History</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {broadcasts.length === 0 ? (
                    <p className="text-center text-sm text-zinc-600 py-10">No broadcasts sent yet.</p>
                  ) : (
                    <div className="divide-y divide-zinc-800">
                      {broadcasts.map((bc: any) => (
                        <div key={bc.id} className="flex items-center gap-4 px-5 py-3" data-testid={`broadcast-row-${bc.id}`}>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{bc.name}</p>
                            <p className="text-xs text-zinc-500 truncate">{bc.subject}</p>
                          </div>
                          <Badge variant="outline" className="text-xs border-zinc-700 text-zinc-400 shrink-0">
                            {SEGMENT_LABELS[bc.segment] || bc.segment}
                          </Badge>
                          <div className="text-xs text-zinc-500 shrink-0 flex items-center gap-1">
                            <Users className="w-3 h-3" />{bc.recipientsCount ?? 0}
                          </div>
                          <div className="text-xs text-zinc-600 shrink-0">
                            {bc.sentAt ? new Date(bc.sentAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Draft"}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ── Stats Tab ── */}
        {activeTab === "stats" && (
          <div className="space-y-4">
            <Card className="border border-card-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <BarChart2 className="w-4 h-4" style={{ color: GOLD }} />
                  Recent Email Activity (last 30)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {logs.length === 0 ? (
                  <p className="text-center text-sm text-zinc-600 py-10">No emails sent yet.</p>
                ) : (
                  <div className="divide-y divide-zinc-800">
                    {logs.map((log: any) => (
                      <div key={log.id} className="flex items-center gap-4 px-5 py-2.5" data-testid={`log-row-${log.id}`}>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-white truncate">{log.toEmail}</p>
                          <p className="text-[11px] text-zinc-500 truncate">{log.subject}</p>
                        </div>
                        <div className="shrink-0">
                          {log.openedAt
                            ? <Badge className="text-[10px] h-4 px-1.5 bg-emerald-500/15 text-emerald-400 border-0">Opened</Badge>
                            : <Badge className="text-[10px] h-4 px-1.5 bg-zinc-800 text-zinc-500 border-0">Sent</Badge>}
                        </div>
                        <div className="text-[11px] text-zinc-600 shrink-0">
                          {log.sentAt ? new Date(log.sentAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function NewSequenceForm({ onSave, onClose, isPending }: { onSave: (d: any) => void; onClose: () => void; isPending: boolean }) {
  const [form, setForm] = useState({ name: "", description: "", trigger: "join" });
  return (
    <div className="p-3 rounded-lg border border-[#d4b461]/30 bg-[#d4b461]/5 space-y-2 mb-2">
      <Input placeholder="Sequence name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="bg-zinc-800/60 border-zinc-700 text-sm h-8" data-testid="input-seq-name" />
      <Input placeholder="Description (optional)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="bg-zinc-800/60 border-zinc-700 text-sm h-8" data-testid="input-seq-desc" />
      <select value={form.trigger} onChange={e => setForm(f => ({ ...f, trigger: e.target.value }))} className="w-full h-8 px-2 rounded-md text-sm bg-zinc-800/60 border border-zinc-700 text-white outline-none" data-testid="select-seq-trigger">
        <option value="join">On Join</option>
        <option value="upgrade">On Upgrade</option>
        <option value="liked">Re-engagement</option>
      </select>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => onSave(form)} disabled={isPending || !form.name} className="flex-1 h-7 text-xs" style={{ background: GOLD, color: "#000", border: "none" }} data-testid="button-save-seq">
          {isPending ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Save
        </Button>
        <Button size="sm" variant="ghost" onClick={onClose} className="h-7 text-xs text-zinc-400"><X className="w-3 h-3" /></Button>
      </div>
    </div>
  );
}

function EmailEditor({ initial, onSave, onClose, isPending }: { initial: any; onSave: (d: any) => void; onClose: () => void; isPending: boolean }) {
  const [form, setForm] = useState({ subject: initial.subject || "", bodyHtml: initial.bodyHtml || "", delayDays: initial.delayDays ?? 0, sortOrder: initial.sortOrder ?? 0 });
  return (
    <div className="p-3 rounded-lg border border-[#d4b461]/30 bg-[#d4b461]/5 space-y-2">
      <Input placeholder="Subject line — e.g. Welcome to Oravini 👋" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} className="bg-zinc-900 border-zinc-700 text-sm h-8 font-medium" data-testid="input-email-subject" />
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-[10px] text-zinc-500 block mb-0.5">Send on day</label>
          <Input type="number" min={0} value={form.delayDays} onChange={e => setForm(f => ({ ...f, delayDays: parseInt(e.target.value) || 0 }))} className="bg-zinc-900 border-zinc-700 text-sm h-8" data-testid="input-email-delay" />
        </div>
        <div className="flex-1">
          <label className="text-[10px] text-zinc-500 block mb-0.5">Order</label>
          <Input type="number" min={1} value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 1 }))} className="bg-zinc-900 border-zinc-700 text-sm h-8" data-testid="input-email-order" />
        </div>
      </div>
      <Textarea placeholder="<p>Hey {{name}},</p>..." value={form.bodyHtml} onChange={e => setForm(f => ({ ...f, bodyHtml: e.target.value }))} className="bg-zinc-900 border-zinc-700 text-xs font-mono min-h-[160px]" data-testid="input-email-body" />
      <p className="text-[10px] text-zinc-600">Use {"{{name}}"} for recipient's name. Supports HTML.</p>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => onSave(form)} disabled={isPending || !form.subject || !form.bodyHtml} className="flex-1 h-7 text-xs" style={{ background: GOLD, color: "#000", border: "none" }} data-testid="button-save-email">
          {isPending ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Save Email
        </Button>
        <Button size="sm" variant="ghost" onClick={onClose} className="h-7 text-xs text-zinc-400"><X className="w-3 h-3" /></Button>
      </div>
    </div>
  );
}
