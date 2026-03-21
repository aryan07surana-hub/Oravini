import { Link, useLocation } from "wouter";
import { useAuth, useLogout } from "@/hooks/use-auth";
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
  LayoutDashboard, Users, FileText, MessageSquare, Settings,
  LogOut, ChevronRight, Menu, X, Sparkles, BarChart2, BookOpen, TrendingUp, Inbox, Clapperboard, Film
} from "lucide-react";
import { useState } from "react";

const mainNavItems = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/clients", label: "Clients", icon: Users },
  { href: "/admin/tracking", label: "Tracking", icon: BarChart2 },
  { href: "/admin/competitor-study", label: "Competitor Study", icon: TrendingUp },
  { href: "/admin/dm-tracker", label: "DM Tracker", icon: Inbox },
  { href: "/admin/documents", label: "Documents", icon: FileText },
  { href: "/admin/chat", label: "Messages", icon: MessageSquare },
  { href: "/admin/course-modules", label: "Course Modules", icon: BookOpen },
  { href: "/admin/ai-ideas", label: "AI Content Ideas", icon: Sparkles },
  { href: "/admin/video-editor", label: "AI Video Editor", icon: Clapperboard },
  { href: "/admin/video-resources", label: "Video Library", icon: Film },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const logout = useLogout();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const initials = user?.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "A";

  return (
    <div className="min-h-screen bg-background flex">
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-300 lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"} lg:static lg:z-auto`}>
        <div className="px-6 py-5 border-b border-sidebar-border flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.25em] uppercase" style={{ color: "#d4b461" }}>BRANDVERSEE</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 tracking-wider uppercase">Admin Panel</p>
          </div>
          <button onClick={() => setMobileOpen(false)} className="lg:hidden text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {mainNavItems.map(({ href, label, icon: Icon }) => {
            const active = location === href || (href !== "/admin" && location.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                data-testid={`admin-nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
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
        </nav>

        <div className="px-4 pb-2">
          <div className="bg-primary/10 border border-primary/20 rounded-lg px-3 py-2.5">
            <p className="text-xs font-semibold text-primary">Admin Access</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Full portal control</p>
          </div>
        </div>

        <div className="p-4 border-t border-sidebar-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button data-testid="admin-user-menu" className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-sidebar-accent transition-colors">
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
                data-testid="admin-logout"
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
          <button onClick={() => setMobileOpen(true)}>
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
