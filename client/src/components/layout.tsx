import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, FileText, Users, FileSpreadsheet,
  LogOut, Loader2, ChevronLeft, ChevronRight, Menu, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Nav config ───────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { href: "/",          label: "Dashboard", icon: LayoutDashboard },
  { href: "/templates", label: "Templates", icon: FileText        },
  { href: "/customers", label: "Customers", icon: Users           },
  { href: "/invoices",  label: "Invoices",  icon: FileSpreadsheet },
];

const STORAGE_KEY = "invio_sidebar_collapsed";

// ─── Root layout ──────────────────────────────────────────────────────────────
export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const [location] = useLocation();

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem(STORAGE_KEY) === "true"; } catch { return false; }
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, String(collapsed)); } catch {}
  }, [collapsed]);

  // Close mobile drawer on navigation
  useEffect(() => { setMobileOpen(false); }, [location]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <>{children}</>;

  const isFullscreen =
    location.includes("/templates/edit/") || location === "/templates/new";

  if (isFullscreen) {
    return <div className="min-h-screen bg-slate-100 flex flex-col">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">

      {/* ── Mobile backdrop ───────────────────────────────────────────────── */}
      <div
        onClick={() => setMobileOpen(false)}
        className={cn(
          "fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-20 md:hidden transition-opacity duration-300",
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
      />

      {/* ── Desktop sidebar ───────────────────────────────────────────────── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden md:flex flex-col",
          "bg-white border-r border-slate-100",
          "shadow-[2px_0_20px_rgba(0,0,0,0.04)]",
          "transition-[width] duration-300 ease-in-out ",
          collapsed ? "w-[72px]" : "w-64",
        )}
      >
        <SidebarInner
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed(v => !v)}
          location={location}
          user={user}
          signOut={signOut}
        />
      </aside>

      {/* ── Mobile sidebar ────────────────────────────────────────────────── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 flex flex-col md:hidden",
          "bg-white border-r border-slate-100 w-64",
          "shadow-[4px_0_32px_rgba(0,0,0,0.10)]",
          "transition-transform duration-300 ease-in-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <SidebarInner
          collapsed={false}
          onToggleCollapse={() => setMobileOpen(false)}
          location={location}
          user={user}
          signOut={signOut}
          isMobileClose
        />
      </aside>

      {/* ── Page content ──────────────────────────────────────────────────── */}
      <main
        className={cn(
          "flex-1 min-h-screen flex flex-col",
          "md:transition-[margin-left] md:duration-300 md:ease-in-out",
          collapsed ? "md:ml-[72px]" : "md:ml-64",
        )}
      >
        {/* Mobile top bar */}
        <header className="md:hidden sticky top-0 z-10 h-14 flex items-center gap-3 px-4 bg-white border-b border-slate-100 shadow-sm">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 active:bg-slate-200 transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <img
            src="/invio-logo.svg"
            alt="Invio"
            className="h-7 w-auto"
            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        </header>

        <div className="flex-1 max-w-6xl w-full mx-auto p-5 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

// ─── Sidebar inner content ────────────────────────────────────────────────────
function SidebarInner({
  collapsed,
  onToggleCollapse,
  location,
  user,
  signOut,
  isMobileClose = false,
}: {
  collapsed: boolean;
  onToggleCollapse: () => void;
  location: string;
  user: any;
  signOut: () => void;
  isMobileClose?: boolean;
}) {
  const initial = (user.displayName?.[0] ?? user.email?.[0] ?? "U").toUpperCase();

  return (
    <>
      {/* ── Logo header ───────────────────────────────────────────────── */}
      <div
        className={cn(
          "h-16 flex items-center flex-shrink-0 border-b border-slate-100 relative",
          collapsed ? "justify-center px-0" : "px-5 justify-between",
        )}
      >
        {/* Full logo — fades out when collapsed */}
        <div
          className={cn(
            "flex items-center gap-2.5 transition-all duration-300 overflow-hidden",
            collapsed ? "w-0 opacity-0 pointer-events-none" : "w-auto opacity-100",
          )}
        >
          <img
            src="/invio-logo.svg"
            alt="Invio"
            className="h-8 w-auto flex-shrink-0"
            onError={e => {
              const img = e.target as HTMLImageElement;
              img.style.display = "none";
              (img.nextElementSibling as HTMLElement)?.classList.remove("hidden");
            }}
          />
          {/* Text fallback if SVG fails to load */}
          <span className="hidden font-bold text-xl tracking-tight text-slate-900">Invio</span>
        </div>

        {/* Icon-only logo mark — visible only when collapsed */}
        {collapsed && (
          <img
            src="/invio-logo.svg"
            alt="Invio"
            className="h-8 w-8 object-contain"
            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        )}

        {/* Toggle button */}
        <button
          onClick={onToggleCollapse}
          aria-label={isMobileClose ? "Close menu" : collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "flex items-center justify-center transition-all duration-200",
            isMobileClose
              // Mobile: plain icon button in header
              ? "w-8 h-8 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 flex-shrink-0"
              // Desktop: floating pill on the sidebar edge
              : cn(
                  "absolute -right-3 top-1/2 -translate-y-1/2 z-100",
                  "w-6 h-6 rounded-full bg-white border border-slate-200 shadow-md",
                  "text-slate-400 hover:bg-primary hover:text-white hover:border-primary",
                  "hover:scale-110 active:scale-95",
                ),
          )}
        >
          {isMobileClose
            ? <X className="w-4 h-4" />
            : collapsed
              ? <ChevronRight className="w-3.5 h-3.5" />
              : <ChevronLeft  className="w-3.5 h-3.5" />
          }
        </button>
      </div>

      {/* ── Navigation ────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-3 space-y-0.5">

        {!collapsed && (
          <p className="px-3 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest select-none">
            Menu
          </p>
        )}

        {NAV_ITEMS.map(item => {
          const isActive =
            location === item.href ||
            (item.href !== "/" && location.startsWith(item.href));

          return (
            <div key={item.href} className="relative group/nav">
              <Link
                href={item.href}
                className={cn(
                  "flex items-center rounded-xl text-sm font-medium",
                  "transition-all duration-200",
                  collapsed
                    ? "justify-center h-11 w-11 mx-auto"
                    : "px-3 py-2.5 gap-3",
                  isActive
                    ? "bg-primary text-white shadow-lg shadow-primary/20"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                )}
              >
                <item.icon
                  className={cn(
                    "w-5 h-5 flex-shrink-0 transition-colors",
                    isActive
                      ? "text-white"
                      : "text-slate-400 group-hover/nav:text-slate-700",
                  )}
                />
                {!collapsed && (
                  <>
                    <span className="truncate flex-1 overflow-hidden">{item.label}</span>
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-white/60 flex-shrink-0" />
                    )}
                  </>
                )}
              </Link>

              {/* Tooltip — only when collapsed on desktop */}
              {collapsed && (
                <div className={cn(
                  "absolute  left-full top-1/2 -translate-y-1/2 ml-3 z-50",
                  "px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap",
                  "bg-slate-900 text-white shadow-xl",
                  "pointer-events-none select-none",
                  "opacity-0 group-hover/nav:opacity-100",
                  "translate-x-1 group-hover/nav:translate-x-0",
                  "transition-all duration-150",
                )}>
                  {item.label}
                  {/* Arrow pointing left */}
                  <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900" />
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* ── User footer ───────────────────────────────────────────────── */}
      <div className={cn(
        "flex-shrink-0 border-t border-slate-100 space-y-1",
        collapsed ? "p-2" : "p-3",
      )}>

        {/* User info card */}
        <div className={cn(
          "flex items-center rounded-xl bg-slate-50 border border-slate-100 overflow-hidden",
          collapsed ? "justify-center p-2" : "px-3 py-2.5 gap-3",
        )}>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-indigo-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-sm ring-2 ring-white">
            {initial}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate leading-none">
                {user.displayName || user.email?.split("@")[0]}
              </p>
              <p className="text-[11px] text-slate-400 truncate mt-0.5">{user.email}</p>
            </div>
          )}
        </div>

        {/* Sign out */}
        <div className="relative group/signout">
          {collapsed ? (
            <button
              onClick={signOut}
              className="w-full flex items-center justify-center h-10 rounded-xl text-slate-400 hover:text-destructive hover:bg-red-50 transition-all duration-200"
            >
              <LogOut className="w-4 h-4" />
            </button>
          ) : (
            <Button
              variant="ghost" size="sm" onClick={signOut}
              className="w-full justify-start h-9 px-3 text-slate-500 hover:text-destructive hover:bg-red-50 rounded-xl font-medium"
            >
              <LogOut className="w-4 h-4 mr-2 flex-shrink-0" />
              Sign Out
            </Button>
          )}

          {/* Tooltip for sign-out when collapsed */}
          {collapsed && (
            <div className={cn(
              "absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50",
              "px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap",
              "bg-slate-900 text-white shadow-xl pointer-events-none select-none",
              "opacity-0 group-hover/signout:opacity-100",
              "translate-x-1 group-hover/signout:translate-x-0",
              "transition-all duration-150",
            )}>
              Sign Out
              <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900" />
            </div>
          )}
        </div>
      </div>
    </>
  );
}