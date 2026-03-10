import { useMemo } from "react";
import { useInvoices } from "@/hooks/use-invoices";
import { useCustomers } from "@/hooks/use-customers";
import { useTemplates } from "@/hooks/use-templates";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, FileText, Plus, TrendingUp, Users, Clock,
  CheckCircle2, AlertCircle, LayoutTemplate, DollarSign,
  FileSpreadsheet, ArrowUpRight, Zap,
} from "lucide-react";
import { format, isThisMonth, isThisWeek } from "date-fns";

// ─── helpers ──────────────────────────────────────────────────────────────────
const toDate = (val: any): Date => {
  if (!val) return new Date(0);
  if (val?.toDate) return val.toDate();
  return new Date(val);
};

const fmt$ = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const AVATAR_COLORS = [
  "from-violet-400 to-indigo-500",
  "from-sky-400 to-cyan-500",
  "from-emerald-400 to-teal-500",
  "from-amber-400 to-orange-500",
  "from-rose-400 to-pink-500",
];
const avatarGrad = (name = "") =>
  AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

// ─── component ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { data: invoices = [], isLoading: loadingInvoices } = useInvoices();
  const { data: customers = [], isLoading: loadingCustomers } = useCustomers();
  const { data: templates = [], isLoading: loadingTemplates } = useTemplates();

  const loading = loadingInvoices || loadingCustomers || loadingTemplates;

  // ── derived stats ────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const paid = invoices.filter(i => i.status === "Paid");
    const overdue = invoices.filter(i => i.status === "Overdue");
    const pending = invoices.filter(i => i.status === "Sent");
    const revenue = paid.reduce((s, i) => s + (i.totals?.grandTotal ?? 0), 0);
    const outstanding = [...overdue, ...pending].reduce((s, i) => s + (i.totals?.grandTotal ?? 0), 0);
    const thisMonth = invoices.filter(i => isThisMonth(toDate(i.createdAt)));
    const thisWeek = invoices.filter(i => isThisWeek(toDate(i.createdAt)));
    return { paid, overdue, pending, revenue, outstanding, thisMonth, thisWeek };
  }, [invoices]);

  const recentInvoices = useMemo(
    () => [...invoices].sort((a, b) => toDate(b.createdAt).getTime() - toDate(a.createdAt).getTime()).slice(0, 6),
    [invoices]
  );

  // ── loading skeleton ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6 sm:space-y-8 animate-pulse">
        <div className="h-10 w-48 bg-white/[0.08] rounded-xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 sm:h-28 bg-white/[0.06] rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2 h-80 sm:h-96 bg-white/[0.06] rounded-2xl" />
          <div className="h-80 sm:h-96 bg-white/[0.06] rounded-2xl" />
        </div>
      </div>
    );
  }

  const hasData = invoices.length > 0;

  return (
    <div className="space-y-6 sm:space-y-8">

      {/* ── Page header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Dashboard</h1>
          <p className="text-slate-500 mt-1 text-sm sm:text-base">
            {hasData
              ? `${stats.thisWeek.length} invoice${stats.thisWeek.length !== 1 ? "s" : ""} created this week`
              : "Welcome! Get started by creating your first invoice."}
          </p>
        </div>
        <Button
          asChild
          className="w-full sm:w-auto rounded-xl shadow-md shadow-primary/20 hover:-translate-y-0.5 transition-all"
        >
          <Link href="/invoices/new">
            <Plus className="w-4 h-4 mr-2" /> Create Invoice
          </Link>
        </Button>
      </div>

      {/* ── Metric cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 backdrop-blur-sm">
        <MetricCard
          label="Total Revenue"
          value={`Rs ${fmt$(stats.revenue)}`}
          sub={`${stats.paid.length} paid invoice${stats.paid.length !== 1 ? "s" : ""}`}
          icon={DollarSign}
          iconBg="bg-emerald-400/15"
          iconColor="text-emerald-400"
          accent="border-emerald-400/20"
        />
        <MetricCard
          label="Outstanding"
          value={`Rs ${fmt$(stats.outstanding)}`}
          sub={`${stats.overdue.length} overdue · ${stats.pending.length} sent`}
          icon={TrendingUp}
          iconBg="bg-amber-400/15"
          iconColor="text-amber-400"
          accent={stats.outstanding > 0 ? "border-amber-400/20" : "border-white/[0.08]"}
        />
        <MetricCard
          label="Total Invoices"
          value={String(invoices.length)}
          sub={`${stats.thisMonth.length} this month`}
          icon={FileSpreadsheet}
          iconBg="bg-indigo-400/15"
          iconColor="text-indigo-400"
          accent="border-indigo-400/20"
        />
        <MetricCard
          label="Customers"
          value={String(customers.length)}
          sub={`${templates.length} template${templates.length !== 1 ? "s" : ""}`}
          icon={Users}
          iconBg="bg-sky-400/15"
          iconColor="text-sky-400"
          accent="border-sky-400/20"
        />
      </div>

      {/* ── Status breakdown bar ───────────────────────────────────────────── */}
      {hasData && (
        <StatusBar
          paid={stats.paid.length}
          pending={stats.pending.length}
          overdue={stats.overdue.length}
          draft={invoices.filter(i => !i.status || i.status === "Draft").length}
          total={invoices.length}
        />
      )}

      {/* ── Main grid ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">

        {/* Recent invoices */}
        <div className="lg:col-span-2 bg-[--card-foreground] rounded-2xl border border-white/[0.19] shadow-sm overflow-hidden backdrop-blur-sm">
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-white/[0.19] bg-white/[0.04]/50">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <h2 className="text-base font-semibold text-slate-100">Recent Invoices</h2>
            </div>
            <Link
              href="/invoices"
              className="text-sm font-medium text-primary flex items-center gap-1 hover:gap-2 transition-all"
            >
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {recentInvoices.length === 0 ? (
            <EmptyState
              icon={FileSpreadsheet}
              title="No invoices yet"
              desc="Create your first invoice to see it here."
              href="/invoices/new"
              cta="Create Invoice"
            />
          ) : (
            <div className="divide-y divide-slate-50">
              {recentInvoices.map(invoice => {
                const customer = customers.find(c => c.id === invoice.customerId);
                const grad = avatarGrad(customer?.name);
                const date = toDate(invoice.createdAt);
                return (
                  <div
                    key={invoice.id}
                    className="flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-3 sm:py-4 hover:bg-white/[0.04]/80 transition-colors group"
                  >
                    {/* Avatar */}
                    <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm`}>
                      {(customer?.name ?? "?").charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white truncate text-sm">
                        {customer?.name ?? "Unknown Customer"}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        <span className="hidden xs:inline">INV-{invoice.id.substring(0, 6).toUpperCase()} · </span>
                        {format(date, "MMM d, yyyy")}
                      </p>
                    </div>

                    {/* Amount + status */}
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-white text-sm">
                        ${fmt$(invoice.totals?.grandTotal ?? 0)}
                      </p>
                      <StatusPill status={invoice.status} />
                    </div>

                    {/* View link — hidden on mobile to avoid clutter */}
                    {invoice.pdfURL && (
                      <a
                        href={invoice.pdfURL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hidden sm:flex opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                        title="View PDF"
                      >
                        <div className="w-8 h-8 rounded-lg bg-white/[0.06] hover:bg-primary hover:text-white flex items-center justify-center text-slate-400 transition-all">
                          <ArrowUpRight className="w-4 h-4" />
                        </div>
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4 sm:space-y-5">

          {/* Quick actions */}
          <div className="bg-white/[0.03] rounded-2xl border border-white/[0.08] overflow-hidden backdrop-blur-sm">
            <div className="flex items-center gap-2 px-4 sm:px-5 py-3 sm:py-4 border-b border-white/[0.08]">
              <Zap className="w-4 h-4 text-amber-400" />
              <h2 className="text-base font-semibold text-white">Quick Actions</h2>
            </div>
            <div className="p-3 sm:p-4 grid grid-cols-4 sm:grid-cols-2 gap-2 sm:gap-2.5">
              {[
                { label: "New Invoice", icon: Plus, href: "/invoices/new", color: "bg-amber-400/10  text-amber-400  hover:bg-amber-400  hover:text-slate-900" },
                { label: "Add Customer", icon: Users, href: "/customers", color: "bg-sky-400/10    text-sky-400    hover:bg-sky-400    hover:text-slate-900" },
                { label: "New Template", icon: LayoutTemplate, href: "/templates/new", color: "bg-violet-400/10 text-violet-400 hover:bg-violet-400 hover:text-white" },
                { label: "All Invoices", icon: FileText, href: "/invoices", color: "bg-emerald-400/10 text-emerald-400 hover:bg-emerald-400 hover:text-slate-900" },
              ].map(a => (
                <Link
                  key={a.href}
                  href={a.href}
                  className={`flex flex-col items-center justify-center gap-1.5 sm:gap-2 p-2.5 sm:p-4 rounded-xl text-[10px] sm:text-xs font-semibold transition-all duration-200 cursor-pointer border border-white/[0.06] hover:border-transparent hover:-translate-y-0.5 hover:shadow-lg ${a.color}`}
                >
                  <a.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="text-center leading-tight">{a.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Invoice status summary */}
          <div className="bg-white/[0.03] rounded-2xl border border-white/[0.08] overflow-hidden backdrop-blur-sm">
            <div className="flex items-center gap-2 px-4 sm:px-5 py-3 sm:py-4 border-b border-white/[0.08]">
              <CheckCircle2 className="w-4 h-4 text-amber-400" />
              <h2 className="text-base font-semibold text-white">Status Summary</h2>
            </div>
            <div className="p-3 sm:p-4 space-y-2.5 sm:space-y-3">
              {[
                { label: "Paid", count: stats.paid.length, color: "bg-emerald-400/15 text-emerald-400", dot: "bg-emerald-400" },
                { label: "Sent", count: stats.pending.length, color: "bg-sky-400/15     text-sky-400", dot: "bg-sky-400" },
                { label: "Overdue", count: stats.overdue.length, color: "bg-red-400/15     text-red-400", dot: "bg-red-400" },
                { label: "Draft", count: invoices.filter(i => !i.status || i.status === "Draft").length, color: "bg-white/[0.06]   text-slate-400", dot: "bg-slate-500" },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 sm:gap-2.5">
                    <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                    <span className="text-sm text-slate-400 font-medium">{s.label}</span>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${s.color}`}>
                    {s.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Overdue alert */}
          {stats.overdue.length > 0 && (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-3 sm:p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <AlertCircle className="w-4 h-4 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-red-800">
                  {stats.overdue.length} overdue invoice{stats.overdue.length !== 1 ? "s" : ""}
                </p>
                <p className="text-xs text-red-600 mt-0.5">
                  ${fmt$(stats.overdue.reduce((s, i) => s + (i.totals?.grandTotal ?? 0), 0))} outstanding
                </p>
                <Link href="/invoices" className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 hover:text-red-900 mt-2 transition-colors">
                  Review now <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricCard({
  label, value, sub, icon: Icon, iconBg, iconColor, accent,
}: {
  label: string; value: string; sub: string;
  icon: any; iconBg: string; iconColor: string; accent: string;
}) {
  return (
    <div className={`bg-white/[0.03] rounded-2xl border shadow-sm p-3.5 sm:p-5 flex items-start gap-3 sm:gap-4 ${accent}`}>
      <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${iconColor}`} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
        <p className="text-base sm:text-xl font-bold text-white mt-0.5 truncate">{value}</p>
        <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 truncate">{sub}</p>
      </div>
    </div>
  );
}

function StatusBar({
  paid, pending, overdue, draft, total,
}: {
  paid: number; pending: number; overdue: number; draft: number; total: number;
}) {
  if (total === 0) return null;
  const pct = (n: number) => `${Math.round((n / total) * 100)}%`;
  return (
    <div className="bg-white/[0.03] rounded-2xl border border-white/[0.19] shadow-sm px-4 sm:px-6 py-3 sm:py-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-slate-300">Invoice Overview</p>
        <p className="text-xs text-slate-400">{total} total</p>
      </div>
      <div className="flex h-2.5 rounded-full overflow-hidden gap-px bg-slate-100">
        {paid > 0 && <div className="bg-emerald-500 rounded-full transition-all duration-500" style={{ width: pct(paid) }} title={`Paid: ${paid}`} />}
        {pending > 0 && <div className="bg-blue-400   rounded-full transition-all duration-500" style={{ width: pct(pending) }} title={`Sent: ${pending}`} />}
        {overdue > 0 && <div className="bg-red-400    rounded-full transition-all duration-500" style={{ width: pct(overdue) }} title={`Overdue: ${overdue}`} />}
        {draft > 0 && <div className="bg-white/[0.08] rounded-full transition-all duration-500" style={{ width: pct(draft) }} title={`Draft: ${draft}`} />}
      </div>
      <div className="flex items-center gap-3 sm:gap-4 mt-3 flex-wrap">
        {[
          { label: "Paid", count: paid, color: "bg-emerald-500" },
          { label: "Sent", count: pending, color: "bg-blue-400" },
          { label: "Overdue", count: overdue, color: "bg-red-400" },
          { label: "Draft", count: draft, color: "bg-slate-300" },
        ].filter(s => s.count > 0).map(s => (
          <div key={s.label} className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className={`w-2 h-2 rounded-full ${s.color}`} />
            {s.label} · <span className="font-semibold text-slate-300">{s.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    Paid: "bg-emerald-100 text-emerald-700",
    Sent: "bg-blue-100 text-blue-700",
    Overdue: "bg-red-100 text-red-700",
    Draft: "bg-white/[0.06] text-slate-500",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold mt-1 ${map[status] ?? map.Draft}`}>
      {status || "Draft"}
    </span>
  );
}

function EmptyState({
  icon: Icon, title, desc, href, cta,
}: {
  icon: any; title: string; desc: string; href: string; cta: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-10 sm:py-14 px-6 text-center">
      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-amber-400" />
      </div>
      <p className="font-semibold text-white">{title}</p>
      <p className="text-sm text-slate-500 mt-1 mb-5">{desc}</p>
      <Button asChild size="sm" className="rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold shadow-sm shadow-amber-400/20 border-0">
        <Link href={href}><Plus className="w-3.5 h-3.5 mr-1.5" />{cta}</Link>
      </Button>
    </div>
  );
}