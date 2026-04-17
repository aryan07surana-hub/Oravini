import AdminLayout from "@/components/layout/AdminLayout";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Users, MousePointerClick, UserCheck, TrendingUp, Gift } from "lucide-react";

const GOLD = "#d4b461";

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${GOLD}18` }}>
        <Icon className="w-5 h-5" style={{ color: GOLD }} />
      </div>
      <div>
        <p className="text-xs text-zinc-500 mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}

export default function AdminReferrals() {
  const { data: stats = [], isLoading: statsLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/referral-stats"],
  });
  const { data: leads = [], isLoading: leadsLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/referral-leads"],
  });

  const totalClicks = stats.reduce((a: number, r: any) => a + Number(r.clicks || 0), 0);
  const totalSignups = stats.reduce((a: number, r: any) => a + Number(r.signups || 0), 0);
  const totalConversions = stats.reduce((a: number, r: any) => a + Number(r.conversions || 0), 0);

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Gift className="w-6 h-6" style={{ color: GOLD }} />
            Referral Program
          </h1>
          <p className="text-sm text-zinc-500 mt-1">Track referral links, clicks, signups, and 50-credit bonuses.</p>
        </div>

        {/* Overview stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={Users} label="Active Referrers" value={stats.length} />
          <StatCard icon={MousePointerClick} label="Total Clicks" value={totalClicks} />
          <StatCard icon={UserCheck} label="Signups" value={totalSignups} />
          <StatCard icon={TrendingUp} label="Conversions" value={totalConversions} />
        </div>

        {/* Leaderboard */}
        <div className="rounded-2xl border border-zinc-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
            <p className="text-sm font-bold text-foreground">Referral Leaderboard</p>
            <Badge variant="secondary" className="text-[10px]">{stats.length} referrers</Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/30">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-500">#</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-500">Member</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-500">Plan</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-500">Code</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-zinc-500">Clicks</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-zinc-500">Signups</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-zinc-500">Conversions</th>
                </tr>
              </thead>
              <tbody>
                {statsLoading ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key={i} className="border-b border-zinc-800/50">
                      {Array(7).fill(0).map((_, j) => (
                        <td key={j} className="px-5 py-3"><Skeleton className="h-4 w-full" /></td>
                      ))}
                    </tr>
                  ))
                ) : stats.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-zinc-500 text-sm">No referral data yet.</td>
                  </tr>
                ) : (
                  stats.map((row: any, i: number) => (
                    <tr key={row.user_id} data-testid={`referral-row-${row.user_id}`} className="border-b border-zinc-800/50 hover:bg-zinc-900/40 transition-colors">
                      <td className="px-5 py-3 text-zinc-400 font-semibold">{i + 1}</td>
                      <td className="px-5 py-3">
                        <div>
                          <p className="font-semibold text-foreground">{row.name || "—"}</p>
                          <p className="text-xs text-zinc-500">{row.email}</p>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant="outline" className="text-[10px] capitalize">{row.plan || "free"}</Badge>
                      </td>
                      <td className="px-5 py-3">
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">{row.code}</span>
                      </td>
                      <td className="px-5 py-3 text-right text-zinc-300">{row.clicks}</td>
                      <td className="px-5 py-3 text-right font-semibold" style={{ color: Number(row.signups) > 0 ? GOLD : "inherit" }}>{row.signups}</td>
                      <td className="px-5 py-3 text-right text-emerald-400 font-semibold">{row.conversions}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Referral Leads */}
        <div className="rounded-2xl border border-zinc-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
            <p className="text-sm font-bold text-foreground">All Referral Leads</p>
            <Badge variant="secondary" className="text-[10px]">{leads.length} leads</Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/30">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-500">Referred User</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-500">Referred By</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-500">Plan</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-500">Status</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-500">Date</th>
                </tr>
              </thead>
              <tbody>
                {leadsLoading ? (
                  Array(4).fill(0).map((_, i) => (
                    <tr key={i} className="border-b border-zinc-800/50">
                      {Array(5).fill(0).map((_, j) => (
                        <td key={j} className="px-5 py-3"><Skeleton className="h-4 w-full" /></td>
                      ))}
                    </tr>
                  ))
                ) : leads.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-zinc-500 text-sm">No referral leads yet.</td>
                  </tr>
                ) : (
                  leads.map((lead: any) => (
                    <tr key={lead.id} data-testid={`lead-row-${lead.id}`} className="border-b border-zinc-800/50 hover:bg-zinc-900/40 transition-colors">
                      <td className="px-5 py-3">
                        <div>
                          <p className="font-medium text-foreground">{lead.referred_name || lead.referred_email_addr || lead.referred_email}</p>
                          <p className="text-xs text-zinc-500">{lead.referred_email_addr || lead.referred_email}</p>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div>
                          <p className="font-medium text-foreground">{lead.referrer_name || "—"}</p>
                          <p className="text-xs text-zinc-500">{lead.referrer_email}</p>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant="outline" className="text-[10px] capitalize">{lead.referred_plan || "—"}</Badge>
                      </td>
                      <td className="px-5 py-3">
                        {lead.converted ? (
                          <Badge className="text-[10px] bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Converted</Badge>
                        ) : lead.registered ? (
                          <Badge className="text-[10px]" style={{ background: `${GOLD}20`, color: GOLD, borderColor: `${GOLD}40` }}>Signed up</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">Clicked</Badge>
                        )}
                      </td>
                      <td className="px-5 py-3 text-xs text-zinc-500">
                        {lead.created_at ? new Date(lead.created_at).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
