import { useState, useMemo } from "react";
import { useCustomers, useCreateCustomer, useUpdateCustomer, useDeleteCustomer } from "@/hooks/use-customers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Trash2, Edit2, Plus, Users, Search, X, Mail, Phone, MapPin, UserCircle2, Loader2 } from "lucide-react";
import { Customer } from "@shared/schema";

// ─── Avatar colors ────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  "bg-violet-100 text-violet-700",
  "bg-sky-100 text-sky-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-indigo-100 text-indigo-700",
  "bg-teal-100 text-teal-700",
  "bg-orange-100 text-orange-700",
];
const getAvatarColor = (name: string) =>
  AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

// ─── Skeletons ────────────────────────────────────────────────────────────────
function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-white/[0.03] rounded-2xl border border-white/[0.19] shadow-sm px-5 py-4 animate-pulse">
          <div className="h-7 bg-white/[0.06]rounded-lg w-10 mb-2" />
          <div className="h-3 bg-white/[0.06]rounded-lg w-28" />
        </div>
      ))}
    </div>
  );
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-white/[0.06]flex-shrink-0" />
          <div className="h-3.5 bg-white/[0.06]rounded-lg w-28" />
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="space-y-2">
          <div className="h-3 bg-white/[0.06]rounded-lg w-36" />
          <div className="h-3 bg-white/[0.06]rounded-lg w-24" />
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="h-3 bg-white/[0.06]rounded-lg w-40" />
      </td>
      <td className="px-6 py-4">
        <div className="flex justify-end gap-2">
          <div className="w-8 h-8 bg-white/[0.06]rounded-lg" />
          <div className="w-8 h-8 bg-white/[0.06]rounded-lg" />
        </div>
      </td>
    </tr>
  );
}

function SkeletonCard() {
  return (
    <div className="px-5 py-4 flex items-start gap-4 animate-pulse">
      <div className="w-11 h-11 rounded-full bg-white/[0.06]flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 bg-white/[0.06]rounded-lg w-1/3" />
        <div className="h-3 bg-white/[0.06]rounded-lg w-1/2" />
        <div className="h-3 bg-white/[0.06]rounded-lg w-1/4" />
      </div>
      <div className="flex gap-1 flex-shrink-0">
        <div className="w-8 h-8 bg-white/[0.06]rounded-lg" />
        <div className="w-8 h-8 bg-white/[0.06]rounded-lg" />
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Customers() {
  const { data: customers = [], isLoading } = useCustomers();
  const [search,       setSearch]       = useState("");
  const [isAddOpen,    setIsAddOpen]    = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const deleteMutation = useDeleteCustomer();

  const filtered = useMemo(() =>
    customers.filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone ?? "").toLowerCase().includes(search.toLowerCase())
    ),
    [customers, search]
  );

  return (
    <div className="space-y-8">

      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Customers</h1>
          <p className="text-slate-500 mt-1">Manage your client details for faster invoicing.</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl shadow-md shadow-primary/20 hover:-translate-y-0.5 transition-all">
              <Plus className="w-4 h-4 mr-2" /> Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[460px] rounded-2xl p-0 overflow-hidden">
            <div className="bg-gradient-to-br from-primary/5 to-indigo-50 px-6 pt-6 pb-4 border-b border-white/[0.19]">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <UserCircle2 className="w-4 h-4 text-primary" />
                  </div>
                  Add New Customer
                </DialogTitle>
                <p className="text-sm text-slate-500 mt-1">Customer details auto-fill when creating invoices.</p>
              </DialogHeader>
            </div>
            <div className="px-6 py-4">
              <CustomerForm onSuccess={() => setIsAddOpen(false)} />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Stats strip ──────────────────────────────────────────────────────── */}
      {isLoading ? (
        <StatsSkeleton />
      ) : customers.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { label: "Total Customers", value: customers.length,                        color: "text-primary"     },
            { label: "With Phone",      value: customers.filter(c => c.phone).length,   color: "text-emerald-600" },
            { label: "With Address",    value: customers.filter(c => c.address).length, color: "text-sky-600"     },
          ].map(stat => (
            <div key={stat.label} className="bg-white/[0.03] rounded-2xl border border-white/[0.19] shadow-sm px-5 py-4">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">{stat.label}</p>
            </div>
          ))}
        </div>
      ) : null}

      {/* ── Table card ───────────────────────────────────────────────────────── */}
      <div className="bg-white/[0.03] rounded-2xl shadow-sm border border-white/[0.19] overflow-hidden">

        {/* Search bar */}
        <div className="px-5 py-3.5 border-b border-white/[0.19] bg-white/[0.04]/50 flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by name, email or phone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9 bg-white/[0.03] border-white/[0.08] rounded-xl text-sm"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-400"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {search && !isLoading && (
            <p className="text-xs text-slate-400 flex-shrink-0">
              {filtered.length} of {customers.length} shown
            </p>
          )}
        </div>

        {/* ── Loading ───────────────────────────────────────────────────────── */}
        {isLoading ? (
          <>
            <div className="hidden md:block">
              <table className="w-full text-sm text-left">
                <thead className="bg-white/[0.04]/50 text-slate-500 font-medium border-b border-white/[0.19]">
                  <tr>
                    <th className="px-6 py-3.5">Customer</th>
                    <th className="px-6 py-3.5">Contact</th>
                    <th className="px-6 py-3.5">Address</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {[1, 2, 3, 4, 5].map(i => <SkeletonRow key={i} />)}
                </tbody>
              </table>
            </div>
            <div className="md:hidden divide-y divide-slate-800">
              {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
            </div>
          </>

        ) : filtered.length === 0 ? (
          /* ── Empty state ──────────────────────────────────────────────────── */
          <div className="p-16 text-center flex flex-col items-center">
  <div className="w-16 h-16 bg-amber-400/10 border border-amber-400/20 rounded-full flex items-center justify-center mb-4">
    <Users className="w-7 h-7 text-amber-400" />
  </div>
  <h3 className="text-base font-semibold text-white">
    {search ? "No customers match your search" : "No customers yet"}
  </h3>
  <p className="text-slate-500 text-sm mt-1 max-w-xs">
    {search
      ? "Try a different name, email, or phone number."
      : "Add your first customer to start generating invoices quickly."}
  </p>
  {search && (
    <Button variant="outline" size="sm" onClick={() => setSearch("")} className="mt-4 rounded-xl border-white/10 text-slate-400 hover:bg-white/5 hover:text-white">
      Clear Search
    </Button>
  )}
</div>

        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-white/[0.04]/50 text-slate-500 font-medium border-b border-white/[0.19]">
                  <tr>
                    <th className="px-6 py-3.5">Customer</th>
                    <th className="px-6 py-3.5">Contact</th>
                    <th className="px-6 py-3.5">Address</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map(customer => (
                    <CustomerRow
                      key={customer.id}
                      customer={customer}
                      onDeleteRequest={() => setDeleteTarget(customer)}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-slate-100">
              {filtered.map(customer => (
                <CustomerCard
                  key={customer.id}
                  customer={customer}
                  onDeleteRequest={() => setDeleteTarget(customer)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Delete confirmation ───────────────────────────────────────────────── */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={open => { if (!open) setDeleteTarget(null); }}
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-4 h-4 text-destructive" />
              </div>
              Delete Customer?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 leading-relaxed">
              You are about to permanently delete{" "}
              <span className="font-semibold text-slate-300">{deleteTarget?.name}</span>
              {deleteTarget?.email && (
                <> (<span className="text-slate-400">{deleteTarget.email}</span>)</>
              )}
              . This will not delete existing invoices, but you won't be able to
              select this customer for new ones.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive hover:bg-destructive/90 text-white"
              onClick={() => {
                if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              Delete Customer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

// ─── Desktop table row ────────────────────────────────────────────────────────
function CustomerRow({
  customer,
  onDeleteRequest,
}: {
  customer: Customer;
  onDeleteRequest: () => void;
}) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const avatarColor = getAvatarColor(customer.name);

  return (
    <tr className="hover:bg-white/[0.04]/70 transition-colors group">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${avatarColor}`}>
            {customer.name.charAt(0).toUpperCase()}
          </div>
          <span className="font-semibold text-white">{customer.name}</span>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 text-slate-400 text-sm">
            <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            {customer.email}
          </div>
          {customer.phone && (
            <div className="flex items-center gap-1.5 text-slate-500 text-xs">
              <Phone className="w-3 h-3 text-slate-400 flex-shrink-0" />
              {customer.phone}
            </div>
          )}
        </div>
      </td>
      <td className="px-6 py-4">
        {customer.address ? (
          <div className="flex items-start gap-1.5 text-slate-500 text-sm max-w-[200px]">
            <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
            <span className="truncate">{customer.address}</span>
          </div>
        ) : (
          <span className="text-slate-300 text-sm">—</span>
        )}
      </td>
      <td className="px-6 py-4 text-right">
        <div className="flex justify-end items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost" size="icon"
                className="h-8 w-8 rounded-lg text-slate-400 hover:text-primary hover:bg-indigo-50"
                title="Edit customer"
              >
                <Edit2 className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[460px] rounded-2xl p-0 overflow-hidden">
              <div className="bg-gradient-to-br from-primary/5 to-indigo-50 px-6 pt-6 pb-4 border-b border-white/[0.19]">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${getAvatarColor(customer.name)}`}>
                      {customer.name.charAt(0).toUpperCase()}
                    </div>
                    Edit {customer.name}
                  </DialogTitle>
                  <p className="text-sm text-slate-500 mt-1">Update this customer's details.</p>
                </DialogHeader>
              </div>
              <div className="px-6 py-4">
                <CustomerForm initialData={customer} onSuccess={() => setIsEditOpen(false)} />
              </div>
            </DialogContent>
          </Dialog>
          <Button
            variant="ghost" size="icon"
            className="h-8 w-8 rounded-lg text-slate-400 hover:text-destructive hover:bg-red-50"
            title="Delete customer"
            onClick={onDeleteRequest}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

// ─── Mobile customer card ─────────────────────────────────────────────────────
function CustomerCard({
  customer,
  onDeleteRequest,
}: {
  customer: Customer;
  onDeleteRequest: () => void;
}) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const avatarColor = getAvatarColor(customer.name);

  return (
    <div className="px-5 py-4 flex items-start gap-4 hover:bg-white/[0.04]/70 transition-colors">
      <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-base flex-shrink-0 ${avatarColor}`}>
        {customer.name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <p className="font-semibold text-white truncate">{customer.name}</p>
        <div className="flex items-center gap-1.5 text-slate-500 text-xs">
          <Mail className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{customer.email}</span>
        </div>
        {customer.phone && (
          <div className="flex items-center gap-1.5 text-slate-400 text-xs">
            <Phone className="w-3 h-3 flex-shrink-0" />
            {customer.phone}
          </div>
        )}
        {customer.address && (
          <div className="flex items-center gap-1.5 text-slate-400 text-xs">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{customer.address}</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400 hover:text-primary hover:bg-indigo-50">
              <Edit2 className="w-4 h-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[460px] rounded-2xl p-0 overflow-hidden">
            <div className="bg-gradient-to-br from-primary/5 to-indigo-50 px-6 pt-6 pb-4 border-b border-white/[0.19]">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${avatarColor}`}>
                    {customer.name.charAt(0).toUpperCase()}
                  </div>
                  Edit {customer.name}
                </DialogTitle>
              </DialogHeader>
            </div>
            <div className="px-6 py-4">
              <CustomerForm initialData={customer} onSuccess={() => setIsEditOpen(false)} />
            </div>
          </DialogContent>
        </Dialog>
        <Button
          variant="ghost" size="icon"
          className="h-8 w-8 rounded-lg text-slate-400 hover:text-destructive hover:bg-red-50"
          onClick={onDeleteRequest}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

// ─── Customer form ────────────────────────────────────────────────────────────
function CustomerForm({
  initialData,
  onSuccess,
}: {
  initialData?: Customer;
  onSuccess: () => void;
}) {
  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();

  const [formData, setFormData] = useState({
    name:    initialData?.name    ?? "",
    email:   initialData?.email   ?? "",
    phone:   initialData?.phone   ?? "",
    address: initialData?.address ?? "",
  });

  const set = (key: keyof typeof formData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setFormData(prev => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (initialData) {
      updateMutation.mutate({ id: initialData.id, ...formData }, { onSuccess });
    } else {
      createMutation.mutate(formData, { onSuccess });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-sm font-semibold text-slate-300">
          Full Name <span className="text-destructive">*</span>
        </Label>
        <div className="relative">
          <UserCircle2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            required
            value={formData.name}
            onChange={set("name")}
            placeholder="e.g. John Smith"
            className="pl-9 bg-white/[0.04] border-white/[0.08] rounded-xl"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm font-semibold text-slate-300">
          Email Address <span className="text-destructive">*</span>
        </Label>
        <div className="relative">
          <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            required
            type="email"
            value={formData.email}
            onChange={set("email")}
            placeholder="john@company.com"
            className="pl-9 bg-white/[0.04] border-white/[0.08] rounded-xl"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm font-semibold text-slate-300 flex items-center justify-between">
          Phone Number
          <span className="text-xs text-slate-400 font-normal">Optional</span>
        </Label>
        <div className="relative">
          <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={formData.phone}
            onChange={set("phone")}
            placeholder="+1 (555) 000-0000"
            className="pl-9 bg-white/[0.04] border-white/[0.08] rounded-xl"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm font-semibold text-slate-300 flex items-center justify-between">
          Billing Address
          <span className="text-xs text-slate-400 font-normal">Optional</span>
        </Label>
        <div className="relative">
          <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <Textarea
            value={formData.address}
            onChange={set("address")}
            placeholder="123 Main St, City, Country"
            rows={2}
            className="pl-9 bg-white/[0.04] border-white/[0.08] rounded-xl resize-none text-sm"
          />
        </div>
      </div>

      <DialogFooter className="pt-2 gap-2">
        <Button
          type="submit"
          disabled={isPending}
          className="w-full rounded-xl h-11 shadow-md shadow-primary/20 font-semibold"
        >
          {isPending ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
          ) : (
            initialData ? "Save Changes" : "Create Customer"
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}