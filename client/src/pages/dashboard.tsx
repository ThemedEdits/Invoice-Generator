import { useInvoices } from "@/hooks/use-invoices";
import { useCustomers } from "@/hooks/use-customers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, FileText, Plus, TrendingUp, Users } from "lucide-react";
import { format } from "date-fns";

export default function Dashboard() {
  const { data: invoices, isLoading: loadingInvoices } = useInvoices();
  const { data: customers, isLoading: loadingCustomers } = useCustomers();

  if (loadingInvoices || loadingCustomers) {
    return <div className="animate-pulse flex space-x-4"><div className="flex-1 space-y-6 py-1"><div className="h-2 bg-slate-200 rounded"></div><div className="space-y-3"><div className="grid grid-cols-3 gap-4"><div className="h-2 bg-slate-200 rounded col-span-2"></div><div className="h-2 bg-slate-200 rounded col-span-1"></div></div><div className="h-2 bg-slate-200 rounded"></div></div></div></div>;
  }

  const totalInvoices = invoices?.length || 0;
  const paidInvoices = invoices?.filter(i => i.status === "Paid").length || 0;
  const revenue = invoices?.filter(i => i.status === "Paid").reduce((acc, inv) => acc + (inv.totals?.grandTotal || 0), 0) || 0;
  
  const recentInvoices = invoices?.slice(0, 5) || [];

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-slate-500 mt-1">Overview of your invoicing activity.</p>
        </div>
        <Button asChild className="rounded-xl shadow-md shadow-primary/20 hover:-translate-y-0.5 transition-all">
          <Link href="/invoices/new">
            <Plus className="w-4 h-4 mr-2" /> Create Invoice
          </Link>
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-2xl border-slate-100 shadow-sm">
          <CardContent className="p-6 flex items-center">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-primary mr-4">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Revenue</p>
              <h3 className="text-2xl font-bold text-slate-900">${revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-slate-100 shadow-sm">
          <CardContent className="p-6 flex items-center">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 mr-4">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Invoices Generated</p>
              <h3 className="text-2xl font-bold text-slate-900">{totalInvoices}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-slate-100 shadow-sm">
          <CardContent className="p-6 flex items-center">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 mr-4">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Customers</p>
              <h3 className="text-2xl font-bold text-slate-900">{customers?.length || 0}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Invoices */}
      <Card className="rounded-2xl border-slate-100 shadow-sm overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 bg-slate-50/50 py-4 px-6">
          <CardTitle className="text-lg font-semibold text-slate-800">Recent Invoices</CardTitle>
          <Link href="/invoices" className="text-sm font-medium text-primary flex items-center hover:underline">
            View all <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </CardHeader>
        <div className="divide-y divide-slate-100">
          {recentInvoices.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No invoices generated yet.</div>
          ) : (
            recentInvoices.map((invoice) => {
              const customer = customers?.find(c => c.id === invoice.customerId);
              return (
                <div key={invoice.id} className="flex items-center justify-between p-6 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-medium mr-4">
                      {customer?.name?.charAt(0) || '#'}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{customer?.name || 'Unknown Customer'}</p>
                      <p className="text-sm text-slate-500">{format(new Date(invoice.createdAt), 'MMM d, yyyy')}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-6">
                    <div className="text-right">
                      <p className="font-semibold text-slate-900">${invoice.totals.grandTotal.toFixed(2)}</p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1
                        ${invoice.status === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 
                          invoice.status === 'Draft' ? 'bg-slate-100 text-slate-800' : 
                          'bg-amber-100 text-amber-800'}`}>
                        {invoice.status}
                      </span>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/invoices/${invoice.id}`}>View</Link>
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </Card>
    </div>
  );
}
