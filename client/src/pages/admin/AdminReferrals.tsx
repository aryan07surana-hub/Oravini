import AdminLayout from "@/components/layout/AdminLayout";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Users, MousePointerClick, UserCheck, TrendingUp, Gift } from "lucide-react";
import { useState, useEffect } from "react";

const GOLD = "#d4b461";

function useCountUp(target: number, duration = 900) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!target) { setVal(0); return; }
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setVal(Math.round(ease * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return val;
}

function StatCard({ icon: Icon, label, value, color, delay = 0 }: {
  icon: any; label: string; value: number; color: string; delay?: number;
}) {
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState(false);
  const animated = useCountUp(visible ? value : 0);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 18,
        border: `1.5px solid ${hovered ? color + "35" : "rgba(255,255,255,0.06)"}`,
        background: hovered
          ? `linear-gradient(135deg, ${color}0c 0%, rgba(255,255,255,0.02) 100%)`
          : "rgba(255,255,255,0.025)",
        padding: "20px 18px",
        display: "flex", alignItems: "center", gap: 14,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(10px)",
        transition: "opacity 0.4s ease, transform 0.4s ease, border-color 0.25s ease, background 0.25s ease, box-shadow 0.25s ease",
        boxShadow: hovered ? `0 8px 28px ${color}18` : "none",
        cursor: "default",
      }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
        transition: "transform 0.2s ease",
        transform: hovered ? "scale(1.1)" : "scale(1)",
      }}>
        <Icon style={{ width: 20, height: 20, color }} />
      </div>
      <div>
        <p style={{ fontSize: 11, color: "#71717a", marginBottom: 2 }}>{label}</p>
        <p style={{ fontSize: 26, fontWeight: 800, color: "#fafafa", lineHeight: 1 }}>{animated}</p>
      </div>
    </div>
  );
}

const RANK_STYLES: Record<number, { bg: string; color: string; label: string }> = {
  0: { bg: "rgba(212,180,97,0.18)", color: "#d4b461", label: "🥇" },
  1: { bg: "rgba(148,163,184,0.15)", color: "#94a3b8", label: "🥈" },
  2: { bg: "rgba(180,120,70,0.15)",  color: "#b47846", label: "🥉" },
};

export default function AdminReferrals() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 60); return () => clearTimeout(t); }, []);

  const { data: stats = [], isLoading: statsLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/referral-stats"],
  });
  const { data: leads = [], isLoading: leadsLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/referral-leads"],
  });

  const totalClicks      = stats.reduce((a: number, r: any) => a + Number(r.clicks      || 0), 0);
  const totalSignups     = stats.reduce((a: number, r: any) => a + Number(r.signups     || 0), 0);
  const totalConversions = stats.reduce((a: number, r: any) => a + Number(r.conversions || 0), 0);

  return (
    <AdminLayout>
      <div style={{ padding: "28px 24px", maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", gap: 32 }}>

        {/* Page header */}
        <div
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(-8px)",
            transition: "opacity 0.4s ease, transform 0.4s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${GOLD}20`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Gift style={{ width: 18, height: 18, color: GOLD }} />
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#fafafa", margin: 0 }}>Referral Program</h1>
          </div>
          <p style={{ fontSize: 13, color: "#71717a", margin: 0 }}>
            Track referral links, clicks, signups, and 50-credit bonuses in real time.
          </p>
        </div>

        {/* Overview stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
          <StatCard icon={Users}             label="Active Referrers" value={stats.length}     color="#a78bfa" delay={80}  />
          <StatCard icon={MousePointerClick} label="Total Clicks"     value={totalClicks}      color="#60a5fa" delay={140} />
          <StatCard icon={UserCheck}         label="Signups"          value={totalSignups}     color={GOLD}    delay={200} />
          <StatCard icon={TrendingUp}        label="Conversions"      value={totalConversions} color="#34d399" delay={260} />
        </div>

        {/* Leaderboard */}
        <div
          style={{
            borderRadius: 20, border: "1px solid rgba(255,255,255,0.07)",
            background: "rgba(255,255,255,0.015)", overflow: "hidden",
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(12px)",
            transition: "opacity 0.5s ease 0.2s, transform 0.5s ease 0.2s",
          }}
        >
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(255,255,255,0.02)",
          }}>
            <p style={{ fontWeight: 700, fontSize: 14, color: "#fafafa", margin: 0 }}>Referral Leaderboard</p>
            <span style={{
              fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 99,
              background: "rgba(255,255,255,0.07)", color: "#a1a1aa",
            }}>{stats.length} referrers</span>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  {["#", "Member", "Plan", "Code", "Clicks", "Signups", "Conversions"].map((h, i) => (
                    <th key={h} style={{
                      padding: "12px 18px", textAlign: i >= 4 ? "right" : "left",
                      fontSize: 11, fontWeight: 600, color: "#71717a",
                      background: "rgba(0,0,0,0.2)", letterSpacing: "0.03em",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {statsLoading ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      {Array(7).fill(0).map((_, j) => (
                        <td key={j} style={{ padding: "14px 18px" }}>
                          <Skeleton className="h-4" style={{ width: j === 1 ? 120 : 60 }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : stats.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: "48px 20px", textAlign: "center", color: "#52525b", fontSize: 13 }}>
                      No referral data yet — share the program with your members.
                    </td>
                  </tr>
                ) : (
                  stats.map((row: any, i: number) => {
                    const rank = RANK_STYLES[i];
                    return (
                      <ReferralRow key={row.user_id} row={row} i={i} rank={rank} delay={i * 40} />
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Referral Leads */}
        <div
          style={{
            borderRadius: 20, border: "1px solid rgba(255,255,255,0.07)",
            background: "rgba(255,255,255,0.015)", overflow: "hidden",
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(12px)",
            transition: "opacity 0.5s ease 0.35s, transform 0.5s ease 0.35s",
          }}
        >
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(255,255,255,0.02)",
          }}>
            <p style={{ fontWeight: 700, fontSize: 14, color: "#fafafa", margin: 0 }}>All Referral Leads</p>
            <span style={{
              fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 99,
              background: "rgba(255,255,255,0.07)", color: "#a1a1aa",
            }}>{leads.length} leads</span>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  {["Referred User", "Referred By", "Plan", "Status", "Date"].map(h => (
                    <th key={h} style={{
                      padding: "12px 18px", textAlign: "left",
                      fontSize: 11, fontWeight: 600, color: "#71717a",
                      background: "rgba(0,0,0,0.2)", letterSpacing: "0.03em",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leadsLoading ? (
                  Array(4).fill(0).map((_, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      {Array(5).fill(0).map((_, j) => (
                        <td key={j} style={{ padding: "14px 18px" }}>
                          <Skeleton className="h-4" style={{ width: j === 0 ? 130 : 90 }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : leads.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: "48px 20px", textAlign: "center", color: "#52525b", fontSize: 13 }}>
                      No referral leads yet.
                    </td>
                  </tr>
                ) : (
                  leads.map((lead: any, i: number) => (
                    <LeadRow key={lead.id} lead={lead} delay={i * 35} />
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

function ReferralRow({ row, i, rank, delay }: { row: any; i: number; rank: any; delay: number }) {
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 120 + delay); return () => clearTimeout(t); }, [delay]);

  return (
    <tr
      data-testid={`referral-row-${row.user_id}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        background: hovered ? "rgba(255,255,255,0.035)" : "transparent",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateX(0)" : "translateX(-8px)",
        transition: "opacity 0.35s ease, transform 0.35s ease, background 0.18s ease",
      }}
    >
      <td style={{ padding: "14px 18px" }}>
        {rank ? (
          <span style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 28, height: 28, borderRadius: 8,
            background: rank.bg, fontSize: 14,
          }}>{rank.label}</span>
        ) : (
          <span style={{ fontSize: 12, color: "#52525b", fontWeight: 600 }}>{i + 1}</span>
        )}
      </td>
      <td style={{ padding: "14px 18px" }}>
        <p style={{ fontWeight: 600, color: "#fafafa", margin: 0, fontSize: 13 }}>{row.name || "—"}</p>
        <p style={{ fontSize: 11, color: "#71717a", margin: 0 }}>{row.email}</p>
      </td>
      <td style={{ padding: "14px 18px" }}>
        <span style={{
          fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 6,
          border: "1px solid rgba(255,255,255,0.1)", color: "#a1a1aa",
          textTransform: "capitalize",
        }}>{row.plan || "free"}</span>
      </td>
      <td style={{ padding: "14px 18px" }}>
        <span style={{
          fontFamily: "monospace", fontSize: 11,
          padding: "3px 8px", borderRadius: 6,
          background: "rgba(255,255,255,0.06)", color: "#d4d4d4",
        }}>{row.code}</span>
      </td>
      <td style={{ padding: "14px 18px", textAlign: "right", color: "#a1a1aa" }}>{row.clicks}</td>
      <td style={{
        padding: "14px 18px", textAlign: "right", fontWeight: 700,
        color: Number(row.signups) > 0 ? GOLD : "#52525b",
      }}>{row.signups}</td>
      <td style={{ padding: "14px 18px", textAlign: "right", fontWeight: 700, color: "#34d399" }}>{row.conversions}</td>
    </tr>
  );
}

function LeadRow({ lead, delay }: { lead: any; delay: number }) {
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 180 + delay); return () => clearTimeout(t); }, [delay]);

  const statusEl = lead.converted ? (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6, background: "rgba(52,211,153,0.15)", color: "#34d399", border: "1px solid rgba(52,211,153,0.25)" }}>Converted</span>
  ) : lead.registered ? (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6, background: `${GOLD}18`, color: GOLD, border: `1px solid ${GOLD}35` }}>Signed up</span>
  ) : (
    <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 6, background: "rgba(255,255,255,0.06)", color: "#71717a" }}>Clicked</span>
  );

  return (
    <tr
      data-testid={`lead-row-${lead.id}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        background: hovered ? "rgba(255,255,255,0.035)" : "transparent",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateX(0)" : "translateX(-8px)",
        transition: "opacity 0.35s ease, transform 0.35s ease, background 0.18s ease",
      }}
    >
      <td style={{ padding: "14px 18px" }}>
        <p style={{ fontWeight: 600, color: "#fafafa", margin: 0, fontSize: 13 }}>
          {lead.referred_name || lead.referred_email_addr || lead.referred_email}
        </p>
        <p style={{ fontSize: 11, color: "#71717a", margin: 0 }}>{lead.referred_email_addr || lead.referred_email}</p>
      </td>
      <td style={{ padding: "14px 18px" }}>
        <p style={{ fontWeight: 600, color: "#fafafa", margin: 0, fontSize: 13 }}>{lead.referrer_name || "—"}</p>
        <p style={{ fontSize: 11, color: "#71717a", margin: 0 }}>{lead.referrer_email}</p>
      </td>
      <td style={{ padding: "14px 18px" }}>
        <span style={{
          fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 6,
          border: "1px solid rgba(255,255,255,0.1)", color: "#a1a1aa", textTransform: "capitalize",
        }}>{lead.referred_plan || "—"}</span>
      </td>
      <td style={{ padding: "14px 18px" }}>{statusEl}</td>
      <td style={{ padding: "14px 18px", fontSize: 12, color: "#71717a" }}>
        {lead.created_at ? new Date(lead.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}
      </td>
    </tr>
  );
}
