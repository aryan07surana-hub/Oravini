import { Link, useLocation } from "wouter";
import { useAuth, useLogout } from "@/hooks/use-auth";
import { Users, FolderOpen, CheckSquare, BookOpenCheck, LogOut, Menu, X, ChevronRight } from "lucide-react";
import { useState } from "react";

const GOLD = "#d4b461";

const navItems = [
  { href: "/super-admin/clients", label: "Client List", icon: Users },
  { href: "/super-admin/documents", label: "Documents", icon: FolderOpen },
  { href: "/super-admin/todos", label: "To-Do List", icon: CheckSquare },
  { href: "/super-admin/daily-read", label: "Everyday Read", icon: BookOpenCheck },
];

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const logout = useLogout();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const initials = user?.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "O";

  return (
    <div className="min-h-screen bg-background flex">
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-300 md:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"} md:static md:z-auto`}>
        <div className="px-6 py-5 border-b border-sidebar-border">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase" style={{ color: GOLD }}>ORAVINI</p>
          <p className="text-[10px] text-muted-foreground mt-0.5 tracking-wider uppercase">Personal Workspace</p>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-1">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = location === href || location.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                  style={active ? { background: GOLD, color: "#0a0910" } : {}}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1">{label}</span>
                  {!active && <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: `${GOLD}22`, color: GOLD }}>
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{user?.name || "Oravini"}</p>
              <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={() => logout.mutate()}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-background sticky top-0 z-40">
          <button onClick={() => setMobileOpen(true)} className="text-foreground p-1 rounded-lg hover:bg-accent">
            <Menu className="w-5 h-5" />
          </button>
          <p className="text-sm font-semibold tracking-widest uppercase" style={{ color: GOLD }}>ORAVINI</p>
        </header>
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
