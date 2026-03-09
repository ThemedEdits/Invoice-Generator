import { useState, useMemo } from "react";
import { useInvoices, useUpdateInvoiceStatus, useDeleteInvoice } from "@/hooks/use-invoices";
import { useCustomers } from "@/hooks/use-customers";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, FileText, CheckCircle2, AlertCircle, Clock, Eye, Trash2, Search, X, SlidersHorizontal } from "lucide-react";
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

// ─── Component ────────────────────────────────────────────────────────────────
export default function Invoices() {
  const { data: invoices = [], isLoading: loadingInvoices } = useInvoices();
  const { data: customers = [] } = useCustomers();
  const updateStatus = useUpdateInvoiceStatus();
  const deleteInvoice = useDeleteInvoice();

  // ── Filter state ────────────────────────────────────────────────────────────
  const [searchId, setSearchId] = useState("");
  const [searchCustomer, setSearchCustomer] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false);

  // ── Delete confirm state ────────────────────────────────────────────────────
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // ── Active filter count for badge ───────────────────────────────────────────
  const activeFilterCount = [
    searchId, searchCustomer, dateFrom, dateTo, amountMin, amountMax,
    statusFilter !== "all" ? statusFilter : "",
  ].filter(Boolean).length;

  // ── Clear all filters ───────────────────────────────────────────────────────
  const clearFilters = () => {
    setSearchId(""); setSearchCustomer(""); setDateFrom(""); setDateTo("");
    setAmountMin(""); setAmountMax(""); setStatusFilter("all");
  };

  // ── Filtered invoices ───────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return invoices.filter(inv => {
      const customer = customers.find(c => c.id === inv.customerId);
      const invId = `INV-${inv.id.substring(0, 6).toUpperCase()}`;
      const amount = inv.totals?.grandTotal ?? 0;
      const date = toDate(inv.createdAt);

      // Invoice ID
      if (searchId && !invId.toLowerCase().includes(searchId.toLowerCase())) return false;

      // Customer name
      if (searchCustomer && !(customer?.name ?? "Unknown").toLowerCase().includes(searchCustomer.toLowerCase())) return false;

      // Date range
      if (dateFrom && date && date < new Date(dateFrom)) return false;
      if (dateTo && date && date > new Date(dateTo + "T23:59:59")) return false;

      // Amount range
      if (amountMin && amount < parseFloat(amountMin)) return false;
      if (amountMax && amount > parseFloat(amountMax)) return false;

      // Status
      if (statusFilter !== "all" && inv.status !== statusFilter) return false;

      return true;
    });
  }, [invoices, customers, searchId, searchCustomer, dateFrom, dateTo, amountMin, amountMax, statusFilter]);

  // ── Invoice to delete ───────────────────────────────────────────────────────
  const invoiceToDelete = invoices.find(i => i.id === deleteId);
  const customerOfDelete = customers.find(c => c.id === invoiceToDelete?.customerId);

  return (
    <div className="space-y-6">

      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Invoices</h1>
          <p className="text-slate-500 mt-1">Manage and track your generated invoices.</p>
        </div>
        <Button asChild className="rounded-xl shadow-md shadow-primary/20 hover:-translate-y-0.5 transition-all">
          <Link href="/invoices/new">
            <Plus className="w-4 h-4 mr-2" /> Create Invoice
          </Link>
        </Button>
      </div>

      {/* ── Filter bar ───────────────────────────────────────────────────────── */}
      <div className="bg-white/[0.03] rounded-2xl border border-white/[0.19] shadow-sm overflow-hidden">
        {/* Toggle header */}
        <button
          onClick={() => setFiltersOpen(v => !v)}
          className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.04]/80 transition-colors"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-300">
            <SlidersHorizontal className="w-4 h-4 text-primary" />
            Filter Invoices
            {activeFilterCount > 0 && (
              <span className="bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                {activeFilterCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {activeFilterCount > 0 && (
              <button
                onClick={e => { e.stopPropagation(); clearFilters(); }}
                className="text-xs text-slate-400 hover:text-destructive flex items-center gap-1 transition-colors"
              >
                <X className="w-3 h-3" /> Clear all
              </button>
            )}
            <span className={`text-slate-400 text-xs transition-transform duration-200 ${filtersOpen ? "rotate-180" : ""}`}>▼</span>
          </div>
        </button>

        {/* Filter fields — collapsible */}
        {filtersOpen && (
          <div className="px-5 pb-5 pt-1 border-t border-white/[0.19] space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">

            {/* Row 1 — ID + Customer + Status */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Invoice ID */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Invoice ID</label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    value={searchId}
                    onChange={e => setSearchId(e.target.value)}
                    placeholder="e.g. INV-AB12CD"
                    className="pl-8 h-9 bg-white/[0.04] border-white/[0.08] rounded-lg text-sm"
                  />
                  {searchId && <button onClick={() => setSearchId("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-400"><X className="w-3.5 h-3.5" /></button>}
                </div>
              </div>

              {/* Customer */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    value={searchCustomer}
                    onChange={e => setSearchCustomer(e.target.value)}
                    placeholder="Customer name..."
                    className="pl-8 h-9 bg-white/[0.04] border-white/[0.08] rounded-lg text-sm"
                  />
                  {searchCustomer && <button onClick={() => setSearchCustomer("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-400"><X className="w-3.5 h-3.5" /></button>}
                </div>
              </div>

              {/* Status */}
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

            {/* Row 2 — Date range + Amount range */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Date range */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Date Range</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                    className="h-9 bg-white/[0.04] border-white/[0.08] rounded-lg text-sm flex-1"
                  />
                  <span className="text-slate-400 text-xs flex-shrink-0">to</span>
                  <Input
                    type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                    className="h-9 bg-white/[0.04] border-white/[0.08] rounded-lg text-sm flex-1"
                  />
                  {(dateFrom || dateTo) && (
                    <button onClick={() => { setDateFrom(""); setDateTo(""); }} className="text-slate-400 hover:text-destructive flex-shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Amount range */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount Range ($)</label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                    <Input
                      type="number" min={0} value={amountMin} onChange={e => setAmountMin(e.target.value)}
                      placeholder="Min" className="h-9 bg-white/[0.04] border-white/[0.08] rounded-lg text-sm pl-6"
                    />
                  </div>
                  <span className="text-slate-400 text-xs flex-shrink-0">to</span>
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                    <Input
                      type="number" min={0} value={amountMax} onChange={e => setAmountMax(e.target.value)}
                      placeholder="Max" className="h-9 bg-white/[0.04] border-white/[0.08] rounded-lg text-sm pl-6"
                    />
                  </div>
                  {(amountMin || amountMax) && (
                    <button onClick={() => { setAmountMin(""); setAmountMax(""); }} className="text-slate-400 hover:text-destructive flex-shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Results count */}
            <p className="text-xs text-slate-400">
              Showing <span className="font-semibold text-slate-400">{filtered.length}</span> of{" "}
              <span className="font-semibold text-slate-400">{invoices.length}</span> invoice{invoices.length !== 1 ? "s" : ""}
            </p>
          </div>
        )}
      </div>

      {/* ── Invoice table ─────────────────────────────────────────────────────── */}
      <div className="bg-white/[0.03] rounded-2xl shadow-sm border border-white/[0.19] overflow-hidden">
        {loadingInvoices ? (
          <div className="divide-y divide-slate-800">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center gap-4 px-6 py-4 animate-pulse">
                {/* Invoice ID */}
                <div className="w-24 h-4 bg-white/[0.06]rounded-lg" />
                {/* Customer */}
                <div className="w-32 h-4 bg-white/[0.06]rounded-lg" />
                {/* Date */}
                <div className="w-20 h-4 bg-white/[0.06]rounded-lg" />
                {/* Amount — pushed right */}
                <div className="ml-auto w-16 h-4 bg-white/[0.06]rounded-lg" />
                {/* Status badge */}
                <div className="w-16 h-6 bg-white/[0.06]rounded-full" />
                {/* Actions button */}
                <div className="w-16 h-8 bg-white/[0.06]rounded-lg" />
              </div>
            ))}
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center">
  <div className="w-20 h-20 bg-amber-400/10 border border-amber-400/20 rounded-full flex items-center justify-center mb-6">
    <FileText className="w-10 h-10 text-amber-400" />
  </div>
  <h3 className="text-xl font-bold text-white mb-2">No invoices yet</h3>
  <p className="text-slate-500 max-w-md mb-8">Select a template and customer to generate your first professional invoice.</p>
  <Button asChild className="rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold shadow-lg shadow-amber-400/20 border-0">
    <Link href="/invoices/new">Generate Invoice</Link>
  </Button>
</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <Search className="w-10 h-10 text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-300 mb-1">No invoices match your filters</h3>
            <p className="text-slate-500 text-sm mb-4">Try adjusting or clearing the active filters.</p>
            <Button variant="outline" onClick={clearFilters} className="rounded-xl">Clear Filters</Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-white/[0.04]/50 text-slate-500 font-medium border-b border-white/[0.19]">
                <tr>
                  <th className="px-6 py-4">Invoice ID</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4 text-right">Amount</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(invoice => {
                  const customer = customers.find(c => c.id === invoice.customerId);
                  const date = toDate(invoice.createdAt);
                  return (
                    <tr key={invoice.id} className="hover:bg-white/[0.04]/80 transition-colors group">
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
                        ${fmt(invoice.totals?.grandTotal ?? 0)}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={invoice.status} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Delete button — always visible on hover */}
                          <Button
                            variant="ghost" size="icon"
                            onClick={() => setDeleteId(invoice.id)}
                            className="h-8 w-8 rounded-lg text-slate-400 hover:text-destructive hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                            title="Delete invoice"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>

                          {/* Actions dropdown */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 rounded-lg">Actions</Button>
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
                                    <a
                                      href={invoice.pdfURL.replace("/upload/", "/upload/fl_attachment/")}
                                      download={`invoice-${invoice.id.substring(0, 6)}.pdf`}
                                    >
                                      <FileText className="w-4 h-4 mr-2" /> Download PDF
                                    </a>
                                  </DropdownMenuItem>
                                </>
                              )}
                              <div className="h-px bg-white/[0.06]my-1" />
                              <DropdownMenuItem className="cursor-pointer font-medium text-slate-400 text-xs uppercase pt-2 pointer-events-none">
                                Mark as
                              </DropdownMenuItem>
                              {(["Sent", "Paid", "Overdue"] as const).map(s => (
                                <DropdownMenuItem
                                  key={s} className="cursor-pointer"
                                  onClick={() => updateStatus.mutate({ id: invoice.id, status: s })}
                                >
                                  <StatusBadge status={s} />
                                </DropdownMenuItem>
                              ))}
                              <div className="h-px bg-white/[0.06]my-1" />
                              <DropdownMenuItem
                                className="cursor-pointer text-destructive focus:text-destructive focus:bg-red-50"
                                onClick={() => setDeleteId(invoice.id)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" /> Delete Invoice
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Delete confirmation dialog ────────────────────────────────────────── */}
      <AlertDialog open={!!deleteId} onOpenChange={open => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-4 h-4 text-destructive" />
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
              )}
              . This action cannot be undone and the PDF will no longer be accessible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive hover:bg-destructive/90 text-white"
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

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "Paid":
      return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800"><CheckCircle2 className="w-3 h-3 mr-1" />Paid</span>;
    case "Overdue":
      return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800"><AlertCircle className="w-3 h-3 mr-1" />Overdue</span>;
    case "Sent":
      return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800"><Clock className="w-3 h-3 mr-1" />Sent</span>;
    default:
      return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-white/[0.06]text-slate-400">Draft</span>;
  }
}