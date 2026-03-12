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
import {
  LayoutDashboard, FileText, MessageSquare, TrendingUp, Phone,
  LogOut, ChevronRight, ChevronDown, Menu, X, CalendarPlus, BarChart2,
  Instagram, Youtube, Clock, CalendarDays, Sparkles
} from "lucide-react";
import { useState } from "react";

const mainNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/progress", label: "Progress", icon: TrendingUp },
  { href: "/calls", label: "Call Feedback", icon: Phone },
  { href: "/ai-ideas", label: "AI Content Ideas", icon: Sparkles },
];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const logout = useLogout();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [trackingOpen, setTrackingOpen] = useState(
    location.startsWith("/tracking") || location === "/content-tracking"
  );

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

  const isTrackingActive = location.startsWith("/tracking") || location === "/content-tracking";

  return (
    <div className="min-h-screen bg-background flex">
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-300 lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"} lg:static lg:z-auto`}>
        <div className="px-6 py-5 border-b border-sidebar-border flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.25em] uppercase" style={{ color: "#d4b461" }}>BRANDVERSEE</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 tracking-wider uppercase">Client Portal</p>
          </div>
          <button onClick={() => setMobileOpen(false)} className="lg:hidden text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {mainNavItems.map(({ href, label, icon: Icon }) => {
            const active = location === href;
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
                  <Badge className={`text-[10px] h-5 min-w-5 px-1.5 ${active ? "bg-white/20 text-white border-0" : "bg-primary text-primary-foreground border-0"}`}>
                    {badge}
                  </Badge>
                )}
                {!active && <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />}
              </Link>
            );
          })}

          <div>
            <button
              onClick={() => setTrackingOpen(o => !o)}
              data-testid="nav-tracking-toggle"
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isTrackingActive
                  ? "bg-primary/10 text-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <BarChart2 className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">Tracking</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${trackingOpen ? "rotate-180" : ""}`} />
            </button>

            {trackingOpen && (
              <div className="mt-1 ml-3 pl-4 border-l border-sidebar-border space-y-1">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 pt-1 pb-0.5">Content Tracking</p>

                <Link
                  href="/tracking/content/instagram"
                  onClick={() => setMobileOpen(false)}
                  data-testid="nav-tracking-instagram"
                  className={`flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-all ${
                    location === "/tracking/content/instagram"
                      ? "bg-primary text-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent"
                  }`}
                >
                  <Instagram className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="flex-1">Instagram</span>
                  {location !== "/tracking/content/instagram" && <ChevronRight className="w-3 h-3 opacity-50" />}
                </Link>

                <Link
                  href="/tracking/content/youtube"
                  onClick={() => setMobileOpen(false)}
                  data-testid="nav-tracking-youtube"
                  className={`flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-all ${
                    location === "/tracking/content/youtube"
                      ? "bg-primary text-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent"
                  }`}
                >
                  <Youtube className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="flex-1">YouTube</span>
                  {location !== "/tracking/content/youtube" && <ChevronRight className="w-3 h-3 opacity-50" />}
                </Link>

                <Link
                  href="/tracking/content/calendar"
                  onClick={() => setMobileOpen(false)}
                  data-testid="nav-tracking-calendar"
                  className={`flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-all ${
                    location === "/tracking/content/calendar"
                      ? "bg-primary text-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent"
                  }`}
                >
                  <CalendarDays className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="flex-1">Calendar</span>
                  {location !== "/tracking/content/calendar" && <ChevronRight className="w-3 h-3 opacity-50" />}
                </Link>

                <div className="mt-1 space-y-1">
                  <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm opacity-50 cursor-not-allowed">
                    <BarChart2 className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />
                    <span className="flex-1 text-muted-foreground">Sales Tracking</span>
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">Soon</Badge>
                  </div>
                  <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm opacity-50 cursor-not-allowed">
                    <TrendingUp className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />
                    <span className="flex-1 text-muted-foreground">Ad Tracking</span>
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">Soon</Badge>
                  </div>
                </div>
              </div>
            )}
          </div>
        </nav>

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

        <div className="p-4 border-t border-sidebar-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button data-testid="user-menu" className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-sidebar-accent transition-colors">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-xs font-semibold text-sidebar-foreground truncate">{user?.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuSeparator />
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
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden sticky top-0 z-30 bg-background border-b border-border px-4 py-3 flex items-center gap-3">
          <button onClick={() => setMobileOpen(true)} data-testid="mobile-menu">
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-xs font-semibold tracking-[0.2em] uppercase" style={{ color: "#d4b461" }}>BRANDVERSEE</span>
        </header>

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
