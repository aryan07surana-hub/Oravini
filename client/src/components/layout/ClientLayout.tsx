import { Link, useLocation } from "wouter";
import { useAuth, useLogout } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard, FileText, MessageSquare, TrendingUp, Phone, Bell,
  LogOut, ChevronRight, Zap, Menu, X
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/progress", label: "Progress", icon: TrendingUp },
  { href: "/calls", label: "Call Feedback", icon: Phone },
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

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-300 lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"} lg:static lg:z-auto`}>
        {/* Logo */}
        <div className="p-6 border-b border-sidebar-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <span className="font-bold text-sidebar-foreground text-sm tracking-tight">Brandverse</span>
              <p className="text-[10px] text-muted-foreground">Client Portal</p>
            </div>
          </div>
          <button onClick={() => setMobileOpen(false)} className="lg:hidden text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = location === href;
            const badge = href === "/chat" ? unreadMessages : href === "/dashboard" ? unreadNotifs : 0;
            return (
              <Link key={href} href={href}>
                <a
                  data-testid={`nav-${label.toLowerCase().replace(" ", "-")}`}
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
                </a>
              </Link>
            );
          })}
        </nav>

        {/* User */}
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar for mobile */}
        <header className="lg:hidden sticky top-0 z-30 bg-background border-b border-border px-4 py-3 flex items-center gap-3">
          <button onClick={() => setMobileOpen(true)} data-testid="mobile-menu">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
              <Zap className="w-3 h-3 text-primary-foreground" />
            </div>
            <span className="font-bold text-sm">Brandverse</span>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
