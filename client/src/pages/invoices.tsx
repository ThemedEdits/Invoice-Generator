import { useInvoices, useUpdateInvoiceStatus } from "@/hooks/use-invoices";
import { useCustomers } from "@/hooks/use-customers";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Plus, FileText, CheckCircle2, AlertCircle, Clock, Eye } from "lucide-react";
import { format } from "date-fns";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function Invoices() {
  const { data: invoices = [], isLoading: loadingInvoices } = useInvoices();
  const { data: customers = [] } = useCustomers();
  const updateStatus = useUpdateInvoiceStatus();

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Invoices</h1>
          <p className="text-slate-500 mt-1">Manage and track your generated invoices.</p>
        </div>
        <Button asChild className="rounded-xl shadow-md shadow-primary/20 hover:-translate-y-0.5 transition-all">
          <Link href="/invoices/new">
            <Plus className="w-4 h-4 mr-2" /> Create Invoice
          </Link>
        </Button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {loadingInvoices ? (
          <div className="p-8 text-center text-slate-500">Loading invoices...</div>
        ) : invoices.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
              <FileText className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No invoices created</h3>
            <p className="text-slate-500 max-w-md mb-8">Select a template and customer to generate your first professional invoice.</p>
            <Button asChild className="rounded-xl shadow-lg shadow-primary/20">
              <Link href="/invoices/new">Generate Invoice</Link>
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/50 text-slate-500 font-medium border-b border-slate-100">
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
                {invoices.map((invoice) => {
                  const customer = customers.find(c => c.id === invoice.customerId);
                  return (
                    <tr key={invoice.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900">
                        INV-{invoice.id.substring(0,6).toUpperCase()}
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-medium">
                        {customer?.name || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {invoice.createdAt
                          ? format(
                              invoice.createdAt?.toDate
                                ? invoice.createdAt.toDate()
                                : new Date(invoice.createdAt),
                              "MMM d, yyyy"
                            )
                          : "—"}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-slate-900">
                        ${invoice.totals.grandTotal.toFixed(2)}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={invoice.status} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 rounded-lg">Actions</Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl w-40">
                            {invoice.pdfURL && (
                              <>
                                <DropdownMenuItem asChild className="cursor-pointer">
                                  <a
                                     href={invoice.pdfURL.replace("/upload/", "/upload/fl_attachment/")}
                                  >
                                    <Eye className="w-4 h-4 mr-2" /> Download PDF
                                  </a>
                                </DropdownMenuItem>

                                <DropdownMenuItem asChild className="cursor-pointer">
                                  <a
                                    href={invoice.pdfURL}
                                    download={`invoice-${invoice.id.substring(0,6)}.pdf`}
                                  >
                                    <FileText className="w-4 h-4 mr-2" /> View PDF
                                  </a>
                                </DropdownMenuItem>
                              </>
                            )}
                            <div className="h-px bg-slate-100 my-1" />
                            <DropdownMenuItem className="cursor-pointer font-medium text-slate-500 text-xs uppercase pt-2">Mark as</DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer" onClick={() => updateStatus.mutate({ id: invoice.id, status: 'Sent' })}>Sent</DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer" onClick={() => updateStatus.mutate({ id: invoice.id, status: 'Paid' })}>Paid</DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer" onClick={() => updateStatus.mutate({ id: invoice.id, status: 'Overdue' })}>Overdue</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'Paid': return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800"><CheckCircle2 className="w-3 h-3 mr-1" /> Paid</span>;
    case 'Overdue': return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800"><AlertCircle className="w-3 h-3 mr-1" /> Overdue</span>;
    case 'Sent': return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800"><Clock className="w-3 h-3 mr-1" /> Sent</span>;
    default: return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-800">Draft</span>;
  }
}
