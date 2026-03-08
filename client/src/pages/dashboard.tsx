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
  const { data: invoices = [],  isLoading: loadingInvoices  } = useInvoices();
  const { data: customers = [], isLoading: loadingCustomers } = useCustomers();
  const { data: templates = [], isLoading: loadingTemplates } = useTemplates();

  const loading = loadingInvoices || loadingCustomers || loadingTemplates;

  // ── derived stats ────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const paid     = invoices.filter(i => i.status === "Paid");
    const overdue  = invoices.filter(i => i.status === "Overdue");
    const pending  = invoices.filter(i => i.status === "Sent");
    const revenue  = paid.reduce((s, i) => s + (i.totals?.grandTotal ?? 0), 0);
    const outstanding = [...overdue, ...pending].reduce((s, i) => s + (i.totals?.grandTotal ?? 0), 0);
    const thisMonth = invoices.filter(i => isThisMonth(toDate(i.createdAt)));
    const thisWeek  = invoices.filter(i => isThisWeek(toDate(i.createdAt)));
    return { paid, overdue, pending, revenue, outstanding, thisMonth, thisWeek };
  }, [invoices]);

  const recentInvoices = useMemo(
    () => [...invoices].sort((a, b) => toDate(b.createdAt).getTime() - toDate(a.createdAt).getTime()).slice(0, 6),
    [invoices]
  );

  // ── loading skeleton ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-10 w-48 bg-slate-200 rounded-xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-28 bg-slate-100 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-slate-100 rounded-2xl" />
          <div className="h-96 bg-slate-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  const hasData = invoices.length > 0;

  return (
    <div className="space-y-8">

      {/* ── Page header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-slate-500 mt-1">
            {hasData
              ? `${stats.thisWeek.length} invoice${stats.thisWeek.length !== 1 ? "s" : ""} created this week`
              : "Welcome! Get started by creating your first invoice."}
          </p>
        </div>
        <Button
          asChild
          className="rounded-xl shadow-md shadow-primary/20 hover:-translate-y-0.5 transition-all"
        >
          <Link href="/invoices/new">
            <Plus className="w-4 h-4 mr-2" /> Create Invoice
          </Link>
        </Button>
      </div>

      {/* ── Metric cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Revenue"
          value={`$${fmt$(stats.revenue)}`}
          sub={`${stats.paid.length} paid invoice${stats.paid.length !== 1 ? "s" : ""}`}
          icon={DollarSign}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          accent="border-emerald-200"
        />
        <MetricCard
          label="Outstanding"
          value={`$${fmt$(stats.outstanding)}`}
          sub={`${stats.overdue.length} overdue · ${stats.pending.length} sent`}
          icon={TrendingUp}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          accent={stats.outstanding > 0 ? "border-amber-200" : "border-slate-100"}
        />
        <MetricCard
          label="Total Invoices"
          value={String(invoices.length)}
          sub={`${stats.thisMonth.length} this month`}
          icon={FileSpreadsheet}
          iconBg="bg-indigo-50"
          iconColor="text-primary"
          accent="border-indigo-100"
        />
        <MetricCard
          label="Customers"
          value={String(customers.length)}
          sub={`${templates.length} template${templates.length !== 1 ? "s" : ""}`}
          icon={Users}
          iconBg="bg-sky-50"
          iconColor="text-sky-600"
          accent="border-sky-100"
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent invoices */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <h2 className="text-base font-semibold text-slate-800">Recent Invoices</h2>
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
                const grad     = avatarGrad(customer?.name);
                const date     = toDate(invoice.createdAt);
                return (
                  <div
                    key={invoice.id}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/80 transition-colors group"
                  >
                    {/* Avatar */}
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm`}>
                      {(customer?.name ?? "?").charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 truncate text-sm">
                        {customer?.name ?? "Unknown Customer"}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        INV-{invoice.id.substring(0, 6).toUpperCase()} · {format(date, "MMM d, yyyy")}
                      </p>
                    </div>

                    {/* Amount + status */}
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-slate-900 text-sm">
                        ${fmt$(invoice.totals?.grandTotal ?? 0)}
                      </p>
                      <StatusPill status={invoice.status} />
                    </div>

                    {/* View link */}
                    {invoice.pdfURL && (
                      <a
                        href={invoice.pdfURL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                        title="View PDF"
                      >
                        <div className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-primary hover:text-white flex items-center justify-center text-slate-400 transition-all">
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
        <div className="space-y-5">

          {/* Quick actions */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 bg-slate-50/50">
              <Zap className="w-4 h-4 text-primary" />
              <h2 className="text-base font-semibold text-slate-800">Quick Actions</h2>
            </div>
            <div className="p-4 grid grid-cols-2 gap-2.5">
              {[
                { label: "New Invoice",  icon: Plus,           href: "/invoices/new",    color: "bg-primary/10 text-primary hover:bg-primary hover:text-white"  },
                { label: "Add Customer", icon: Users,          href: "/customers",        color: "bg-sky-50 text-sky-600 hover:bg-sky-500 hover:text-white"      },
                { label: "New Template", icon: LayoutTemplate, href: "/templates/new",   color: "bg-violet-50 text-violet-600 hover:bg-violet-500 hover:text-white" },
                { label: "All Invoices", icon: FileText,       href: "/invoices",         color: "bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white" },
              ].map(a => (
                <Link
                  key={a.href}
                  href={a.href}
                  className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${a.color}`}
                >
                  <a.icon className="w-5 h-5" />
                  {a.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Invoice status summary */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 bg-slate-50/50">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              <h2 className="text-base font-semibold text-slate-800">Status Summary</h2>
            </div>
            <div className="p-4 space-y-3">
              {[
                { label: "Paid",    count: stats.paid.length,              color: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
                { label: "Sent",    count: stats.pending.length,           color: "bg-blue-100 text-blue-700",     dot: "bg-blue-500"    },
                { label: "Overdue", count: stats.overdue.length,           color: "bg-red-100 text-red-700",       dot: "bg-red-500"     },
                { label: "Draft",   count: invoices.filter(i => !i.status || i.status === "Draft").length, color: "bg-slate-100 text-slate-600", dot: "bg-slate-400" },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                    <span className="text-sm text-slate-600 font-medium">{s.label}</span>
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
            <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-start gap-3">
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
    <div className={`bg-white rounded-2xl border shadow-sm p-5 flex items-start gap-4 ${accent}`}>
      <div className={`w-11 h-11 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
        <p className="text-xl font-bold text-slate-900 mt-0.5 truncate">{value}</p>
        <p className="text-xs text-slate-400 mt-0.5 truncate">{sub}</p>
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
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-6 py-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-slate-700">Invoice Overview</p>
        <p className="text-xs text-slate-400">{total} total</p>
      </div>
      <div className="flex h-2.5 rounded-full overflow-hidden gap-px bg-slate-100">
        {paid    > 0 && <div className="bg-emerald-500 rounded-full transition-all duration-500" style={{ width: pct(paid)    }} title={`Paid: ${paid}`}    />}
        {pending > 0 && <div className="bg-blue-400   rounded-full transition-all duration-500" style={{ width: pct(pending) }} title={`Sent: ${pending}`}   />}
        {overdue > 0 && <div className="bg-red-400    rounded-full transition-all duration-500" style={{ width: pct(overdue) }} title={`Overdue: ${overdue}`} />}
        {draft   > 0 && <div className="bg-slate-200  rounded-full transition-all duration-500" style={{ width: pct(draft)   }} title={`Draft: ${draft}`}    />}
      </div>
      <div className="flex items-center gap-4 mt-3 flex-wrap">
        {[
          { label: "Paid",    count: paid,    color: "bg-emerald-500" },
          { label: "Sent",    count: pending, color: "bg-blue-400"   },
          { label: "Overdue", count: overdue, color: "bg-red-400"    },
          { label: "Draft",   count: draft,   color: "bg-slate-300"  },
        ].filter(s => s.count > 0).map(s => (
          <div key={s.label} className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className={`w-2 h-2 rounded-full ${s.color}`} />
            {s.label} · <span className="font-semibold text-slate-700">{s.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    Paid:    "bg-emerald-100 text-emerald-700",
    Sent:    "bg-blue-100 text-blue-700",
    Overdue: "bg-red-100 text-red-700",
    Draft:   "bg-slate-100 text-slate-500",
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
    <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-slate-300" />
      </div>
      <p className="font-semibold text-slate-700">{title}</p>
      <p className="text-sm text-slate-400 mt-1 mb-5">{desc}</p>
      <Button asChild size="sm" className="rounded-xl shadow-sm shadow-primary/20">
        <Link href={href}><Plus className="w-3.5 h-3.5 mr-1.5" />{cta}</Link>
      </Button>
    </div>
  );
}