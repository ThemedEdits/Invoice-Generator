import { useState, useMemo } from "react";
import { useInvoices, useUpdateInvoiceStatus, useDeleteInvoice } from "@/hooks/use-invoices";
import { useCustomers } from "@/hooks/use-customers";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, FileText, CheckCircle2, AlertCircle, Clock, Eye, Trash2, Search, X, SlidersHorizontal, MoreVertical } from "lucide-react";
import { format } from "date-fns";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const toDate = (val: any): Date | null => {
  if (!val) return null;
  if (val?.toDate) return val.toDate();
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
};

const fmt = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ─── Skeleton rows ────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 sm:px-6 py-4 animate-pulse border-b border-white/[0.05]">
      <div className="w-20 sm:w-24 h-4 bg-white/[0.06] rounded-lg flex-shrink-0" />
      <div className="w-24 sm:w-32 h-4 bg-white/[0.06] rounded-lg flex-shrink-0" />
      <div className="hidden sm:block w-20 h-4 bg-white/[0.06] rounded-lg" />
      <div className="ml-auto w-14 sm:w-16 h-4 bg-white/[0.06] rounded-lg flex-shrink-0" />
      <div className="w-14 sm:w-16 h-6 bg-white/[0.06] rounded-full flex-shrink-0" />
      <div className="w-8 h-8 bg-white/[0.06] rounded-lg flex-shrink-0" />
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Invoices() {
  const { data: invoices = [], isLoading: loadingInvoices } = useInvoices();
  const { data: customers = [] } = useCustomers();
  const updateStatus = useUpdateInvoiceStatus();
  const deleteInvoice = useDeleteInvoice();

  const [searchId,       setSearchId]       = useState("");
  const [searchCustomer, setSearchCustomer] = useState("");
  const [dateFrom,       setDateFrom]       = useState("");
  const [dateTo,         setDateTo]         = useState("");
  const [amountMin,      setAmountMin]      = useState("");
  const [amountMax,      setAmountMax]      = useState("");
  const [statusFilter,   setStatusFilter]   = useState("all");
  const [filtersOpen,    setFiltersOpen]    = useState(false);
  const [deleteId,       setDeleteId]       = useState<string | null>(null);

  const activeFilterCount = [
    searchId, searchCustomer, dateFrom, dateTo, amountMin, amountMax,
    statusFilter !== "all" ? statusFilter : "",
  ].filter(Boolean).length;

  const clearFilters = () => {
    setSearchId(""); setSearchCustomer(""); setDateFrom(""); setDateTo("");
    setAmountMin(""); setAmountMax(""); setStatusFilter("all");
  };

  const filtered = useMemo(() => {
    return invoices.filter(inv => {
      const customer = customers.find(c => c.id === inv.customerId);
      const invId = `INV-${inv.id.substring(0, 6).toUpperCase()}`;
      const amount = inv.totals?.grandTotal ?? 0;
      const date = toDate(inv.createdAt);
      if (searchId && !invId.toLowerCase().includes(searchId.toLowerCase())) return false;
      if (searchCustomer && !(customer?.name ?? "Unknown").toLowerCase().includes(searchCustomer.toLowerCase())) return false;
      if (dateFrom && date && date < new Date(dateFrom)) return false;
      if (dateTo && date && date > new Date(dateTo + "T23:59:59")) return false;
      if (amountMin && amount < parseFloat(amountMin)) return false;
      if (amountMax && amount > parseFloat(amountMax)) return false;
      if (statusFilter !== "all" && inv.status !== statusFilter) return false;
      return true;
    });
  }, [invoices, customers, searchId, searchCustomer, dateFrom, dateTo, amountMin, amountMax, statusFilter]);

  const invoiceToDelete = invoices.find(i => i.id === deleteId);
  const customerOfDelete = customers.find(c => c.id === invoiceToDelete?.customerId);

  return (
    <div className="space-y-6 sm:space-y-8">

      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Invoices</h1>
          <p className="text-slate-500 mt-1 text-sm sm:text-base">Manage and track your generated invoices.</p>
        </div>
        <Button asChild className="w-full sm:w-auto rounded-xl shadow-md shadow-amber-400/20 hover:-translate-y-0.5 transition-all bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold border-0">
          <Link href="/invoices/new">
            <Plus className="w-4 h-4 mr-2" /> Create Invoice
          </Link>
        </Button>
      </div>

      {/* ── Filter bar ───────────────────────────────────────────────────────── */}
      <div className="bg-white/[0.03] rounded-2xl border border-white/[0.08] overflow-hidden backdrop-blur-sm">
        {/* Toggle header */}
        <button
          onClick={() => setFiltersOpen(v => !v)}
          className="w-full flex items-center justify-between px-4 sm:px-5 py-3 sm:py-3.5 hover:bg-white/[0.03] transition-colors"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-300">
            <SlidersHorizontal className="w-4 h-4 text-amber-400" />
            Filter Invoices
            {activeFilterCount > 0 && (
              <span className="bg-amber-400 text-slate-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                {activeFilterCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {activeFilterCount > 0 && (
              <button
                onClick={e => { e.stopPropagation(); clearFilters(); }}
                className="text-xs text-slate-500 hover:text-red-400 flex items-center gap-1 transition-colors"
              >
                <X className="w-3 h-3" /> Clear all
              </button>
            )}
            <span className={`text-slate-500 text-xs transition-transform duration-200 ${filtersOpen ? "rotate-180" : ""}`}>▼</span>
          </div>
        </button>

        {/* Filter fields */}
        {filtersOpen && (
          <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-1 border-t border-white/[0.08] space-y-3 sm:space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">

            {/* Row 1 — ID + Customer + Status */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Invoice ID</label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input value={searchId} onChange={e => setSearchId(e.target.value)} placeholder="e.g. INV-AB12CD" className="pl-8 h-9 bg-white/[0.04] border-white/[0.08] rounded-lg text-sm" />
                  {searchId && <button onClick={() => setSearchId("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"><X className="w-3.5 h-3.5" /></button>}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input value={searchCustomer} onChange={e => setSearchCustomer(e.target.value)} placeholder="Customer name..." className="pl-8 h-9 bg-white/[0.04] border-white/[0.08] rounded-lg text-sm" />
                  {searchCustomer && <button onClick={() => setSearchCustomer("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"><X className="w-3.5 h-3.5" /></button>}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 bg-white/[0.04] border-white/[0.08] rounded-lg text-sm">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Draft">Draft</SelectItem>
                    <SelectItem value="Sent">Sent</SelectItem>
                    <SelectItem value="Paid">Paid</SelectItem>
                    <SelectItem value="Overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 2 — Date + Amount */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Date Range</label>
                <div className="flex items-center gap-2">
                  <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-9 bg-white/[0.04] border-white/[0.08] rounded-lg text-sm flex-1 min-w-0" />
                  <span className="text-slate-500 text-xs flex-shrink-0">to</span>
                  <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-9 bg-white/[0.04] border-white/[0.08] rounded-lg text-sm flex-1 min-w-0" />
                  {(dateFrom || dateTo) && (
                    <button onClick={() => { setDateFrom(""); setDateTo(""); }} className="text-slate-500 hover:text-red-400 flex-shrink-0"><X className="w-3.5 h-3.5" /></button>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount Range (Rs)</label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 min-w-0">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs">Rs</span>
                    <Input type="number" min={0} value={amountMin} onChange={e => setAmountMin(e.target.value)} placeholder="Min" className="h-9 bg-white/[0.04] border-white/[0.08] rounded-lg text-sm pl-9" />
                  </div>
                  <span className="text-slate-500 text-xs flex-shrink-0">to</span>
                  <div className="relative flex-1 min-w-0">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs">Rs</span>
                    <Input type="number" min={0} value={amountMax} onChange={e => setAmountMax(e.target.value)} placeholder="Max" className="h-9 bg-white/[0.04] border-white/[0.08] rounded-lg text-sm pl-9" />
                  </div>
                  {(amountMin || amountMax) && (
                    <button onClick={() => { setAmountMin(""); setAmountMax(""); }} className="text-slate-500 hover:text-red-400 flex-shrink-0"><X className="w-3.5 h-3.5" /></button>
                  )}
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-500">
              Showing <span className="font-semibold text-slate-400">{filtered.length}</span> of{" "}
              <span className="font-semibold text-slate-400">{invoices.length}</span> invoice{invoices.length !== 1 ? "s" : ""}
            </p>
          </div>
        )}
      </div>

      {/* ── Invoice list ──────────────────────────────────────────────────────── */}
      <div className="bg-white/[0.03] rounded-2xl border border-white/[0.08] overflow-hidden">
        {loadingInvoices ? (
          <div>{[1,2,3,4,5].map(i => <SkeletonRow key={i} />)}</div>

        ) : invoices.length === 0 ? (
          /* ── Empty state ── */
          <div className="p-10 sm:p-16 text-center flex flex-col items-center backdrop-blur-sm">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-amber-400/10 border border-amber-400/20 rounded-full flex items-center justify-center mb-5 sm:mb-6">
              <FileText className="w-8 h-8 sm:w-10 sm:h-10 text-amber-400" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white mb-2">No invoices yet</h3>
            <p className="text-slate-500 text-sm sm:text-base max-w-md mb-6 sm:mb-8">Select a template and customer to generate your first professional invoice.</p>
            <Button asChild className="w-full sm:w-auto rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold shadow-lg shadow-amber-400/20 border-0">
              <Link href="/invoices/new">Generate Invoice</Link>
            </Button>
          </div>

        ) : filtered.length === 0 ? (
          /* ── No results ── */
          <div className="p-10 sm:p-12 text-center flex flex-col items-center backdrop-blur-sm">
            <div className="w-14 h-14 bg-white/[0.04] border border-white/[0.08] rounded-full flex items-center justify-center mb-4">
              <Search className="w-6 h-6 text-slate-500" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-white mb-1">No invoices match your filters</h3>
            <p className="text-slate-500 text-xs sm:text-sm mb-4">Try adjusting or clearing the active filters.</p>
            <Button variant="outline" onClick={clearFilters} className="rounded-xl border-white/10 text-slate-400 hover:bg-white/5 hover:text-white">Clear Filters</Button>
          </div>

        ) : (
          <>
            {/* ── Desktop table (md+) ── */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-white/[0.04] text-slate-500 font-medium border-b border-white/[0.08]">
                  <tr>
                    <th className="px-6 py-4">Invoice ID</th>
                    <th className="px-6 py-4">Customer</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4 text-right">Amount</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {filtered.map(invoice => {
                    const customer = customers.find(c => c.id === invoice.customerId);
                    const date = toDate(invoice.createdAt);
                    return (
                      <tr key={invoice.id} className="hover:bg-white/[0.03] transition-colors group">
                        <td className="px-6 py-4 font-medium text-white">
                          INV-{invoice.id.substring(0, 6).toUpperCase()}
                        </td>
                        <td className="px-6 py-4 text-slate-400 font-medium">
                          {customer?.name || "Unknown"}
                        </td>
                        <td className="px-6 py-4 text-slate-500">
                          {date ? format(date, "MMM d, yyyy") : "—"}
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-white">
                          Rs {fmt(invoice.totals?.grandTotal ?? 0)}
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={invoice.status} />
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost" size="icon"
                              onClick={() => setDeleteId(invoice.id)}
                              className="h-8 w-8 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-all"
                              title="Delete invoice"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                            <InvoiceActionsMenu
                              invoice={invoice}
                              onDelete={() => setDeleteId(invoice.id)}
                              onStatusChange={(s) => updateStatus.mutate({ id: invoice.id, status: s })}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Mobile cards (< md) ── */}
            <div className="md:hidden divide-y divide-white/[0.05]">
              {filtered.map(invoice => {
                const customer = customers.find(c => c.id === invoice.customerId);
                const date = toDate(invoice.createdAt);
                return (
                  <div key={invoice.id} className="px-4 py-3.5 hover:bg-white/[0.03] transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      {/* Left */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-white text-sm">
                            INV-{invoice.id.substring(0, 6).toUpperCase()}
                          </span>
                          <StatusBadge status={invoice.status} />
                        </div>
                        <p className="text-slate-400 text-xs font-medium truncate">
                          {customer?.name || "Unknown"}
                        </p>
                        <p className="text-slate-500 text-xs">
                          {date ? format(date, "MMM d, yyyy") : "—"}
                        </p>
                      </div>

                      {/* Right */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="font-bold text-white text-sm">
                          Rs {fmt(invoice.totals?.grandTotal ?? 0)}
                        </span>
                        <InvoiceActionsMenu
                          invoice={invoice}
                          onDelete={() => setDeleteId(invoice.id)}
                          onStatusChange={(s) => updateStatus.mutate({ id: invoice.id, status: s })}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ── Delete confirmation ───────────────────────────────────────────────── */}
      <AlertDialog open={!!deleteId} onOpenChange={open => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent className="rounded-2xl mx-4 sm:mx-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-4 h-4 text-red-400" />
              </div>
              Delete Invoice?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 leading-relaxed">
              You are about to permanently delete{" "}
              <span className="font-semibold text-slate-300">
                INV-{deleteId?.substring(0, 6).toUpperCase()}
              </span>
              {customerOfDelete && (
                <> for <span className="font-semibold text-slate-300">{customerOfDelete.name}</span></>
              )}. This action cannot be undone and the PDF will no longer be accessible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0">
            <AlertDialogCancel className="rounded-xl w-full sm:w-auto">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive hover:bg-destructive/90 text-white w-full sm:w-auto"
              onClick={() => {
                if (deleteId) deleteInvoice.mutate(deleteId);
                setDeleteId(null);
              }}
            >
              Delete Invoice
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

// ─── Invoice actions dropdown — shared between desktop & mobile ───────────────
function InvoiceActionsMenu({ invoice, onDelete, onStatusChange }: {
  invoice: any;
  onDelete: () => void;
  onStatusChange: (s: "Sent" | "Paid" | "Overdue") => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-300 flex-shrink-0">
          <MoreVertical className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-xl w-44">
        {invoice.pdfURL && (
          <>
            <DropdownMenuItem asChild className="cursor-pointer">
              <a href={invoice.pdfURL} target="_blank" rel="noopener noreferrer">
                <Eye className="w-4 h-4 mr-2" /> View PDF
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="cursor-pointer">
              <a href={invoice.pdfURL.replace("/upload/", "/upload/fl_attachment/")} download={`invoice-${invoice.id.substring(0, 6)}.pdf`}>
                <FileText className="w-4 h-4 mr-2" /> Download PDF
              </a>
            </DropdownMenuItem>
          </>
        )}
        <div className="h-px bg-white/[0.06] my-1" />
        <DropdownMenuItem className="text-slate-500 text-xs uppercase font-medium pt-2 pointer-events-none">
          Mark as
        </DropdownMenuItem>
        {(["Sent", "Paid", "Overdue"] as const).map(s => (
          <DropdownMenuItem key={s} className="cursor-pointer" onClick={() => onStatusChange(s)}>
            <StatusBadge status={s} />
          </DropdownMenuItem>
        ))}
        <div className="h-px bg-white/[0.06] my-1" />
        <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive focus:bg-red-500/10" onClick={onDelete}>
          <Trash2 className="w-4 h-4 mr-2" /> Delete Invoice
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "Paid":
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-400/10 text-emerald-400 border border-emerald-400/20"><CheckCircle2 className="w-3 h-3 mr-1" />Paid</span>;
    case "Overdue":
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-400/10 text-red-400 border border-red-400/20"><AlertCircle className="w-3 h-3 mr-1" />Overdue</span>;
    case "Sent":
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-400/10 text-sky-400 border border-sky-400/20"><Clock className="w-3 h-3 mr-1" />Sent</span>;
    default:
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-white/[0.06] text-slate-400 border border-white/[0.08]">Draft</span>;
  }
}