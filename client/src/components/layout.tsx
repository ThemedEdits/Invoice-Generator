import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  LayoutDashboard, FileText, Users, FileSpreadsheet,
  LogOut, Loader2, ChevronLeft, ChevronRight, Menu, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AiAssistant } from "@/components/ai-assistant";

// ─── Nav config ───────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/templates", label: "Templates", icon: FileText },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/invoices", label: "Invoices", icon: FileSpreadsheet },
];

const STORAGE_KEY = "invio_sidebar_collapsed";

// ─── Portal tooltip ───────────────────────────────────────────────────────────
// Renders directly into document.body so it escapes ALL stacking contexts.
function NavTooltip({ label, show: shouldShow, children }: {
  label: string;
  show: boolean;   // only render when sidebar is collapsed
  children: React.ReactNode;
}) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const handleEnter = () => {
    if (!shouldShow || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPos({ top: rect.top + rect.height / 2, left: rect.right + 14 });
  };

  const handleLeave = () => setPos(null);

  // Hide tooltip on scroll / resize
  useEffect(() => {
    const hide = () => setPos(null);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    return () => {
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
    };
  }, []);

  return (
    <div ref={triggerRef} onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      {children}
      {pos && shouldShow && createPortal(
        <div
          style={{
            position: "fixed",
            top: pos.top,
            left: pos.left,
            transform: "translateY(-50%)",
            zIndex: 99999,
          }}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap",
            "bg-[#1a1d24] border border-white/[0.12] text-white",
            "shadow-xl shadow-black/60",
            "pointer-events-none select-none",
            "animate-fade-in",
          )}
        >
          {label}
          {/* Arrow pointing left */}
          <span className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent border-r-[#1a1d24]" />
        </div>,
        document.body,
      )}
    </div>
  );
}

// ─── Root layout ──────────────────────────────────────────────────────────────
export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const [location] = useLocation();

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem(STORAGE_KEY) === "true"; } catch { return false; }
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, String(collapsed)); } catch { }
  }, [collapsed]);

  useEffect(() => { setMobileOpen(false); }, [location]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d0f14]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
          <p className="text-sm text-slate-500">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) return <>{children}</>;

  const isFullscreen =
    location.includes("/templates/edit/") || location === "/templates/new";

  if (isFullscreen) {
    return (
      <div className="min-h-screen bg-[#0d0f14] flex flex-col">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0f14] flex">

      {/* ── Ambient glow ──────────────────────────────────────────────────── */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[30%] w-[500px] h-[500px] rounded-full bg-amber-500/5 blur-[140px]" />
        <div className="absolute bottom-[-10%] right-[10%] w-[400px] h-[400px] rounded-full bg-indigo-600/5 blur-[120px]" />
      </div>

      {/* ── Grid texture ──────────────────────────────────────────────────── */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* ── Mobile backdrop ───────────────────────────────────────────────── */}
      <div
        onClick={() => setMobileOpen(false)}
        className={cn(
          "fixed inset-0 bg-black/60 backdrop-blur-sm z-20 md:hidden transition-opacity duration-300",
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
      />

      {/* ── Desktop sidebar ───────────────────────────────────────────────── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden md:flex flex-col",
          "bg-[#0d0f14] border-r border-white/[0.08]",
          "shadow-[2px_0_24px_rgba(0,0,0,0.3)]",
          "transition-[width] duration-300 ease-in-out",
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
          "bg-[#0d0f14] border-r border-white/[0.08] w-64",
          "shadow-[4px_0_40px_rgba(0,0,0,0.5)]",
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
          "flex-1 min-h-screen flex flex-col relative z-10",
          "md:transition-[margin-left] md:duration-300 md:ease-in-out",
          collapsed ? "md:ml-[72px]" : "md:ml-64",
        )}
      >
        {/* Mobile top bar */}
        <header className="md:hidden sticky top-0 z-10 h-14 flex items-center gap-3 px-4 bg-[#0d0f14]/90 backdrop-blur-xl border-b border-white/[0.08] shadow-sm">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-xl text-slate-500 hover:bg-white/5 hover:text-slate-300 active:bg-white/10 transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <img
            src="/invio-logo.svg"
            alt="Invote"
            className="h-7 w-auto"
            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          <span className="font-semibold text-white text-sm" style={{ fontFamily: "'Cinzel', serif" }}>
            Invote
          </span>
        </header>

        <div className="flex-1 max-w-6xl w-full mx-auto p-5 md:p-8">
          {children}
        </div>
        <AiAssistant />
      </main>
    </div>
  );
}

// ─── Sidebar inner ────────────────────────────────────────────────────────────
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
          "h-16 flex items-center flex-shrink-0 border-b border-white/[0.08] relative",
          collapsed ? "justify-center px-0" : "px-5 justify-between",
        )}
      >
        {/* Full logo */}
        <div
          className={cn(
            "flex items-center gap-2.5 transition-all duration-300 overflow-hidden",
            collapsed ? "w-0 opacity-0 pointer-events-none" : "w-auto opacity-100",
          )}
        >
          <img
            src="/invio-logo.svg"
            alt="Invote"
            className="h-10 w-auto flex-shrink-0"
            onError={e => {
              const img = e.target as HTMLImageElement;
              img.style.display = "none";
              (img.nextElementSibling as HTMLElement)?.classList.remove("hidden");
            }}
          />
          <span className="hidden font-bold text-xl text-white" style={{ fontFamily: "'Cinzel', serif" }}>Invote</span>
          <span className="font-semibold text-xl text-white" style={{ fontFamily: "'Cinzel', serif" }}>Invote</span>
        </div>

        {/* Icon-only logo when collapsed */}
        {collapsed && (
          <img
            src="/invio-logo.svg"
            alt="Invote"
            className="h-10 w-8 object-contain"
            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        )}

        {/* Mobile close */}
        {isMobileClose && (
          <button
            onClick={onToggleCollapse}
            aria-label="Close menu"
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:bg-white/5 hover:text-slate-300 transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Desktop collapse toggle — sits on the sidebar edge */}
        {!isMobileClose && (
          <button
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "absolute -right-4 top-1/2 -translate-y-1/2 z-[200]",
              "w-8 h-8 rounded-full flex items-center justify-center",
              "bg-[#1a1d24] border-2 border-white/[0.10] shadow-lg shadow-black/50",
              "text-slate-400",
              "hover:bg-amber-400 hover:text-slate-900 hover:border-amber-400 hover:shadow-amber-500/30",
              "hover:scale-110 active:scale-95 transition-all duration-200",
            )}
          >
            {collapsed
              ? <ChevronRight className="w-4 h-4" />
              : <ChevronLeft className="w-4 h-4" />
            }
          </button>
        )}
      </div>

      {/* ── Navigation ────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto overflow-x-visible py-4 px-3 space-y-0.5">

        {!collapsed && (
          <p className="px-3 pb-2 text-[10px] font-bold text-slate-600 uppercase tracking-widest select-none">
            Menu
          </p>
        )}

        {NAV_ITEMS.map(item => {
          const isActive =
            location === item.href ||
            location.startsWith(item.href + "/");

          return (
            <NavTooltip key={item.href} label={item.label} show={collapsed}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center rounded-xl text-sm font-medium transition-all duration-200",
                  collapsed ? "justify-center h-11 w-11 mx-auto" : "px-3 py-2.5 gap-3",
                  isActive
                    ? "bg-amber-400/15 text-amber-400 border border-amber-400/20"
                    : "text-slate-500 hover:bg-white/5 hover:text-slate-200 border border-transparent",
                )}
              >
                <item.icon
                  className={cn(
                    "w-5 h-5 flex-shrink-0 transition-colors",
                    isActive ? "text-amber-400" : "text-slate-500",
                  )}
                />
                {!collapsed && (
                  <>
                    <span className="truncate flex-1 min-w-0">{item.label}</span>
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400/60 flex-shrink-0" />
                    )}
                  </>
                )}
              </Link>
            </NavTooltip>
          );
        })}
      </nav>

      {/* ── User footer ───────────────────────────────────────────────── */}
      <div className={cn(
        "flex-shrink-0 border-t border-white/[0.08] space-y-1",
        collapsed ? "p-2" : "p-3",
      )}>

        {/* User info */}
        <div className={cn(
          "flex items-center rounded-xl bg-white/[0.03] border border-white/[0.08]",
          collapsed ? "justify-center p-2" : "px-3 py-2.5 gap-3",
        )}>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-slate-900 font-bold text-xs flex-shrink-0 shadow-md ring-2 ring-amber-400/20">
            {initial}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate leading-none">
                {user.displayName || user.email?.split("@")[0]}
              </p>
              <p className="text-[11px] text-slate-500 truncate mt-0.5">{user.email}</p>
            </div>
          )}
        </div>

        {/* Sign out */}
        <NavTooltip label="Sign Out" show={collapsed}>
          {collapsed ? (
            <button
              onClick={signOut}
              className="w-full flex items-center justify-center h-10 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-all duration-200"
            >
              <LogOut className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={signOut}
              className="w-full flex items-center gap-2 h-9 px-3 rounded-xl text-sm font-medium text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-all duration-200"
            >
              <LogOut className="w-4 h-4 flex-shrink-0" />
              Sign Out
            </button>
          )}
        </NavTooltip>
        {/* ── Designed by ───────────────────────────────────────────────── */}
        {!collapsed && (
          <p className="px-3 pt-1 text-[14px] text-slate-600 text-center">
            Designed by{" "}
            <a
              href="https://themed-edits.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-amber-400 transition-colors"
            >
              Themed Edits
            </a>
          </p>
        )}
      </div>
    </>
  );
}