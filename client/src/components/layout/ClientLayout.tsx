import { Link, useLocation } from "wouter";
import { useAuth, useLogout } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import FocusMusicPlayer from "@/components/ui/FocusMusicPlayer";
import { TourProvider } from "@/components/ui/TourGuide";
import JarvisBubble from "@/components/JarvisBubble";
import { JarvisProvider } from "@/contexts/JarvisContext";
import {
  LayoutDashboard, FileText, MessageSquare,
  LogOut, ChevronRight, Menu, X, CalendarPlus, BarChart2, Sparkles, Users, Bot, Clapperboard, Zap, Layers, Settings, ArrowUpRight, TrendingUp, Wand2, ScanSearch
} from "lucide-react";
import { useState } from "react";
import oraviniLogoPath from "@assets/FINAL_IMAGE_ORAVINI_1774725144846.png";

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

const mainNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/jarvis", label: "Jarvis AI", icon: Wand2 },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/tracking", label: "Tracking", icon: BarChart2 },
  { href: "/tracking/competitor", label: "Competitor Study", icon: Users },
  { href: "/ai-ideas", label: "Content Ideas", icon: Sparkles },
  { href: "/ai-design", label: "Design Studio", icon: Layers },
  { href: "/ai-coach", label: "Content Coach", icon: Bot },
  { href: "/content-analyser", label: "Content Analyser", icon: ScanSearch },
  { href: "/video-editor", label: "Video Editor", icon: Clapperboard },
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

  return (
    <JarvisProvider>
    <TourProvider>
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
              <p className="text-xs font-black tracking-[0.2em] uppercase leading-none" style={{ color: "#d4b461", letterSpacing: "0.15em" }}>ORAVINI</p>
              <p className="text-[9px] text-muted-foreground mt-0.5 tracking-wider uppercase leading-none">Powered by Brandverse</p>
            </div>
          </div>
          <button onClick={() => setMobileOpen(false)} className="lg:hidden text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {[
            ...mainNavItems.filter(item => {
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
            const badge = href === "/chat" ? unreadMessages : href === "/dashboard" ? unreadNotifs : 0;
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
                    style={active ? { background: "rgba(0,0,0,0.22)", color: "#1a1200" } : { background: "rgba(212,180,97,0.2)", color: "#d4b461" }}>
                    {badge}
                  </Badge>
                )}
                {!active && <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />}
              </Link>
            );
          })}
        </nav>

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
          {/* User info row */}
          <div className="flex items-center gap-3 px-2 py-1">
            <Avatar className="w-8 h-8 flex-shrink-0">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate" data-testid="sidebar-user-name">{user?.name}</p>
              <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>

          {/* Upgrade + Sign out row */}
          <div className="flex items-center gap-2">
            <Link href="/settings/plan" className="flex-1" data-testid="sidebar-upgrade-btn">
              <div className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 hover:scale-[1.02]"
                style={{ background: "rgba(212,180,97,0.12)", border: "1px solid rgba(212,180,97,0.25)", color: "#d4b461" }}>
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
          <span className="text-xs font-black tracking-[0.18em] uppercase" style={{ color: "#d4b461" }}>ORAVINI</span>
        </header>

        <main
          className="flex-1 overflow-auto"
          style={!isAdmin ? { userSelect: "none" } : undefined}
        >
          {children}
        </main>
      </div>

      <FocusMusicPlayer />
      <JarvisBubble />
    </div>
    </TourProvider>
    </JarvisProvider>
  );
}
