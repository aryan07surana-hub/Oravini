import { Link, useLocation } from "wouter";
import { useAuth, useLogout } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import FocusMusicPlayer from "@/components/ui/FocusMusicPlayer";
import {
  LayoutDashboard, FileText, MessageSquare,
  LogOut, ChevronRight, Menu, X, CalendarPlus, BarChart2, Sparkles, Users, Bot, Clapperboard, Zap, Layers, Settings, ArrowUpRight, TrendingUp, ScanSearch, Wrench, Mic, Film, Scissors, Instagram, Users2, MessageCircle, Gift, Copy, Check, NotebookPen
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import oraviniLogoPath from "@assets/FINAL_IMAGE_ORAVINI_1774725144846.png";
import LowCreditsBanner from "@/components/LowCreditsBanner";
import UpgradeModal from "@/components/UpgradeModal";

const GOLD = "#d4b461";

function WatermarkOverlay({ email, name }: { email: string; name?: string }) {
  const label = name ? `${name} · ${email}` : email;
  const shared: React.CSSProperties = {
    position: "fixed",
    zIndex: 9990,
    pointerEvents: "none",
    userSelect: "none",
    color: "rgba(212,180,97,0.18)",
    fontSize: 10,
    fontWeight: 600,
    fontFamily: "'Inter', system-ui, sans-serif",
    letterSpacing: "0.06em",
    lineHeight: 1.6,
    textAlign: "right",
  };
  return (
    <>
      <div aria-hidden="true" style={{ ...shared, top: 14, right: 18 }}>
        <div>{label}</div>
        <div style={{ fontSize: 9, opacity: 0.75 }}>ORAVINI · CONFIDENTIAL</div>
      </div>
      <div aria-hidden="true" style={{ ...shared, bottom: 14, right: 18 }}>
        <div>{label}</div>
        <div style={{ fontSize: 9, opacity: 0.75 }}>ORAVINI · CONFIDENTIAL</div>
      </div>
    </>
  );
}

function CreditWidget() {
  const { data } = useQuery<any>({ queryKey: ["/api/credits"], staleTime: 60000 });
  const total = data ? data.balance.monthlyCredits + data.balance.bonusCredits : null;
  return (
    <div className="px-4 pb-2">
      <Link href="/credits">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 transition-colors cursor-pointer" data-testid="sidebar-credit-widget">
          <Zap className="w-3.5 h-3.5 text-[#d4b461] flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-zinc-500 leading-none">Credits</p>
            <p className="text-xs font-semibold text-white leading-none mt-0.5">
              {total === null ? "—" : total} remaining
            </p>
          </div>
          <ChevronRight className="w-3 h-3 text-zinc-600" />
        </div>
      </Link>
    </div>
  );
}

function SidebarReferralWidget() {
  const { data: stats } = useQuery<any>({
    queryKey: ["/api/referral/my-stats"],
    staleTime: 60000,
  });
  const [copied, setCopied] = useState(false);
  const [hovered, setHovered] = useState(false);

  const link = stats?.link || "";
  const code = stats?.code || "";
  const signups = stats?.signups ?? 0;

  const copy = useCallback(() => {
    if (!link) return;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [link]);

  return (
    <div className="px-4 pb-3">
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          borderRadius: 12,
          border: `1.5px solid ${hovered ? GOLD + "50" : GOLD + "28"}`,
          background: hovered
            ? `linear-gradient(135deg, ${GOLD}10 0%, rgba(255,255,255,0.02) 100%)`
            : `linear-gradient(135deg, ${GOLD}07 0%, transparent 100%)`,
          padding: "10px 12px",
          transition: "border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease",
          boxShadow: hovered ? `0 4px 20px ${GOLD}18` : "none",
        }}
      >
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
          <div style={{
            width: 22, height: 22, borderRadius: 6,
            background: `${GOLD}20`, display: "flex", alignItems: "center", justifyContent: "center",
            transition: "transform 0.2s ease",
            transform: hovered ? "scale(1.1)" : "scale(1)",
          }}>
            <Gift style={{ width: 11, height: 11, color: GOLD }} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: GOLD, letterSpacing: "0.02em" }}>Refer &amp; Earn</span>
          {signups > 0 && (
            <span style={{
              marginLeft: "auto", fontSize: 9, fontWeight: 700,
              background: `${GOLD}20`, color: GOLD, borderRadius: 99,
              padding: "2px 6px", border: `1px solid ${GOLD}30`,
            }}>
              {signups} signup{signups !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Code + copy row */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{
            flex: 1, display: "flex", alignItems: "center",
            padding: "5px 8px", borderRadius: 7,
            background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.06)",
            minWidth: 0,
          }}>
            <span style={{
              fontFamily: "monospace", fontSize: 10, color: code ? "#c4b37a" : "#52525b",
              letterSpacing: "0.08em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {code || "loading…"}
            </span>
          </div>
          <button
            data-testid="sidebar-copy-referral"
            onClick={copy}
            disabled={!link}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 26, height: 26, borderRadius: 7,
              background: copied ? "rgba(34,197,94,0.25)" : `${GOLD}20`,
              border: `1px solid ${copied ? "rgba(34,197,94,0.4)" : GOLD + "35"}`,
              cursor: link ? "pointer" : "not-allowed",
              transition: "background 0.25s ease, border-color 0.25s ease, transform 0.15s ease",
              transform: copied ? "scale(0.95)" : "scale(1)",
            }}
            onMouseEnter={e => { if (link) (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.08)"; }}
            onMouseLeave={e => { if (!copied) (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
          >
            {copied
              ? <Check style={{ width: 11, height: 11, color: "#22c55e" }} />
              : <Copy style={{ width: 11, height: 11, color: GOLD }} />
            }
          </button>
        </div>

        {/* Subtext */}
        <p style={{ fontSize: 9, color: "#52525b", marginTop: 6, lineHeight: 1.5 }}>
          +50 credits per friend who joins
        </p>
      </div>
    </div>
  );
}

function SoonBadge() {
  return (
    <span style={{
      background: `${GOLD}18`,
      border: `1px solid ${GOLD}44`,
      borderRadius: 10,
      padding: "1px 7px",
      color: GOLD,
      fontSize: 9,
      fontWeight: 700,
      letterSpacing: 0.8,
      textTransform: "uppercase" as const,
      flexShrink: 0,
    }}>Soon</span>
  );
}

const comingSoonItems = [
  { label: "DM Tracker", icon: MessageCircle },
  { label: "IG Bot", icon: Bot },
  { label: "Jarvis AI", icon: Bot },
  { label: "Notetaker", icon: NotebookPen },
];

const topNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/community", label: "Community", icon: Users2 },
  { href: "/tracking", label: "Tracking", icon: BarChart2 },
  { href: "/tracking/competitor", label: "Competitor Study", icon: Users },
  { href: "/ai-ideas", label: "Content Ideas", icon: Sparkles },
  { href: "/ai-design", label: "Design Studio", icon: Layers },
  { href: "/ai-coach", label: "Content Coach", icon: Bot },
  { href: "/content-analyser", label: "Content Analyser", icon: ScanSearch },
  { href: "/video-editor", label: "Video Editor", icon: Clapperboard },
  { href: "/clip-finder", label: "Clip Finder", icon: Scissors },
];

const bottomNavItems = [
  { href: "/credits", label: "Credits", icon: Zap },
  { href: "/settings/plan", label: "Your Settings", icon: Settings },
];


export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const logout = useLogout();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const { data: notifications } = useQuery<any[]>({
    queryKey: ["/api/notifications"],
    refetchInterval: 30000,
  });

  const { data: unreadMsg } = useQuery<{ count: number }>({
    queryKey: ["/api/messages/unread/count"],
    refetchInterval: 30000,
  });

  const unreadNotifs = (notifications || []).filter((n: any) => !n.read).length;
  const unreadMessages = unreadMsg?.count || 0;

  const initials = user?.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "U";
  const isAdmin = user?.role === "admin";
  const toolsActive = location.startsWith("/tools");

  return (
    <>
    {!isAdmin && user?.email && (
      <WatermarkOverlay email={user.email} name={user.name} />
    )}
    <div
      className="min-h-screen bg-background flex"
      onContextMenu={!isAdmin ? (e) => e.preventDefault() : undefined}
    >
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-300 lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"} lg:static lg:z-auto`}>
        <div className="px-5 py-4 border-b border-sidebar-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src={oraviniLogoPath} alt="Oravini" style={{ height: 38, width: 38, objectFit: "cover", objectPosition: "50% 32%", borderRadius: 7, flexShrink: 0 }} />
            <div>
              <p className="text-xs font-black tracking-[0.2em] uppercase leading-none" style={{ color: GOLD, letterSpacing: "0.15em" }}>ORAVINI</p>
              <p className="text-[9px] text-muted-foreground mt-0.5 tracking-wider uppercase leading-none">Powered by Brandverse</p>
            </div>
          </div>
          <button onClick={() => setMobileOpen(false)} className="lg:hidden text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">

          {/* ── Main nav ── */}
          <div className="space-y-1">
            {[
              ...topNavItems.filter(item => {
                if (item.href === "/documents") return (user as any)?.plan === "elite";
                return true;
              }),
              ...((user as any)?.plan === "elite" ? [{ href: "/progress", label: "Progress", icon: TrendingUp }] : []),
            ].map(({ href, label, icon: Icon }) => {
              const active = href === "/tracking"
                ? (location === "/tracking" || location.startsWith("/tracking/content"))
                : href === "/tracking/competitor"
                ? location.startsWith("/tracking/competitor")
                : href === "/content-analyser"
                ? location.startsWith("/content-analyser")
                : location === href;
              const badge = href === "/community" ? unreadMessages : href === "/dashboard" ? unreadNotifs : 0;
              return (
                <Link
                  key={href}
                  href={href}
                  data-testid={`nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1">{label}</span>
                  {badge > 0 && (
                    <Badge className="text-[10px] h-5 min-w-5 px-1.5 border-0"
                      style={active ? { background: "rgba(0,0,0,0.22)", color: "#1a1200" } : { background: "rgba(212,180,97,0.2)", color: GOLD }}>
                      {badge}
                    </Badge>
                  )}
                  {!active && <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />}
                </Link>
              );
            })}

            {/* Tools — directly below Video Editor, navigates to /tools hub page */}
            <Link
              href="/tools"
              data-testid="nav-tools"
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
                toolsActive
                  ? "bg-primary text-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <Wrench className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">Tools</span>
              {!toolsActive && <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />}
            </Link>
          </div>


          {/* ── Settings ── */}
          <div className="mt-4 pt-4 space-y-1" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            {bottomNavItems.map(({ href, label, icon: Icon }) => {
              const active = location === href;
              return (
                <Link
                  key={href}
                  href={href}
                  data-testid={`nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1">{label}</span>
                  {!active && <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />}
                </Link>
              );
            })}
          </div>

          {/* ── Coming Soon ── */}
          <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="px-3 text-[9px] font-bold uppercase tracking-[0.14em] mb-2" style={{ color: "rgba(255,255,255,0.18)" }}>Coming Soon</p>
            <div className="space-y-1">
              {comingSoonItems.map(({ label, icon: Icon }) => (
                <div
                  key={label}
                  data-testid={`nav-coming-soon-${label.toLowerCase().replace(/\s+/g, "-")}`}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium cursor-default"
                  style={{ opacity: 0.4 }}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1">{label}</span>
                  <SoonBadge />
                </div>
              ))}
            </div>
          </div>

        </nav>

        <SidebarReferralWidget />
        <CreditWidget />

        {(user as any)?.plan === "elite" && (
          <div className="px-4 pb-3">
            <a
              href="https://calendly.com/brandversee/30min"
              target="_blank"
              rel="noreferrer"
              data-testid="sidebar-book-call"
              className="flex items-center gap-3 px-3 py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors group"
            >
              <CalendarPlus className="w-4 h-4 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold leading-tight">Book a Call</p>
                <p className="text-[10px] text-primary-foreground/70 mt-0.5">30 min · Calendly</p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
            </a>
          </div>
        )}

        <div className="p-4 border-t border-sidebar-border space-y-2">
          <div className="flex items-center gap-3 px-2 py-1">
            <Avatar className="w-8 h-8 flex-shrink-0">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate" data-testid="sidebar-user-name">{user?.name}</p>
              <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/settings/plan" className="flex-1" data-testid="sidebar-upgrade-btn">
              <div className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 hover:scale-[1.02]"
                style={{ background: "rgba(212,180,97,0.12)", border: "1px solid rgba(212,180,97,0.25)", color: GOLD }}>
                <ArrowUpRight className="w-3 h-3" />
                Upgrade Plan
              </div>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  data-testid="user-menu"
                  className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-sidebar-accent transition-colors flex-shrink-0"
                  style={{ border: "1px solid rgba(255,255,255,0.07)" }}
                >
                  <LogOut className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem
                  data-testid="logout-button"
                  onClick={() => logout.mutate()}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden sticky top-0 z-30 bg-background border-b border-border px-4 py-3 flex items-center gap-3">
          <button onClick={() => setMobileOpen(true)} data-testid="mobile-menu">
            <Menu className="w-5 h-5" />
          </button>
          <img src={oraviniLogoPath} alt="Oravini" style={{ height: 32, width: 32, objectFit: "cover", objectPosition: "50% 32%", borderRadius: 6, flexShrink: 0 }} />
          <span className="text-xs font-black tracking-[0.18em] uppercase" style={{ color: GOLD }}>ORAVINI</span>
        </header>

        {!isAdmin && <LowCreditsBanner />}
        <main
          className="flex-1 overflow-auto"
          style={!isAdmin ? { userSelect: "none" } : undefined}
        >
          {children}
        </main>
      </div>

      <FocusMusicPlayer />
      {!isAdmin && <UpgradeModal />}
    </div>
    </>
  );
}
