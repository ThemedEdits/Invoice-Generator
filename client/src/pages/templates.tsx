import { useState } from "react";
import { useTemplates, useDeleteTemplate } from "@/hooks/use-templates";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Plus, FileText, MoreVertical, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

// ─── Thumbnail component ──────────────────────────────────────────────────────
function TemplateThumbnail({ fileURL, name }: { fileURL?: string; name: string }) {
  const [errored, setErrored] = useState(false);

  const thumbUrl = (() => {
    if (!fileURL) return null;
    if (fileURL.includes("res.cloudinary.com")) {
      return fileURL.replace("/upload/", "/upload/w_400,q_auto,f_auto/");
    }
    return fileURL;
  })();

  if (!thumbUrl || errored) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-50 gap-3">
        <FileText className="w-10 h-10 sm:w-14 sm:h-14 text-slate-300" />
        <span className="text-xs text-slate-400 font-medium px-4 text-center truncate max-w-full">{name}</span>
      </div>
    );
  }

  return (
    <img
      src={thumbUrl}
      alt={name}
      onError={() => setErrored(true)}
      className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
      loading="lazy"
    />
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Templates() {
  const { user, loading: authLoading } = useAuth();
  const { data: templates = [], isLoading, error } = useTemplates();
  const deleteMutation = useDeleteTemplate();

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const templateToDelete = templates.find(t => t.id === deleteId);

  if (authLoading) {
    return <div className="p-8 text-center text-slate-500">Loading authentication...</div>;
  }

  if (!user) {
    return <div className="p-8 text-center text-destructive">Not authenticated. Please log in.</div>;
  }

  return (
    <div className="space-y-6 sm:space-y-8">

      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Templates</h1>
          <p className="text-slate-500 mt-1 text-sm sm:text-base">Design and manage your invoice layouts.</p>
        </div>
        <Button asChild className="w-full sm:w-auto rounded-xl shadow-md shadow-primary/20 hover:-translate-y-0.5 transition-all">
          <Link href="/templates/new">
            <Plus className="w-4 h-4 mr-2" /> New Template
          </Link>
        </Button>
      </div>

      {/* ── Firebase error ───────────────────────────────────────────────────── */}
      {error && (
        <Alert variant="destructive" className="rounded-xl">
          <AlertDescription className="space-y-3">
            <div><strong>Firestore Setup Required</strong></div>
            <div className="text-sm">Your Firebase project needs to be configured. Please follow these steps:</div>
            <ol className="text-sm list-decimal list-inside space-y-2">
              <li>Open <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" className="underline font-semibold">Firebase Console</a></li>
              <li>Select project: <strong>invoice-generator-12</strong></li>
              <li>Go to <strong>Firestore Database</strong> and click Create Database</li>
              <li>Choose <strong>production mode</strong> and select a region</li>
              <li>Click the <strong>Rules</strong> tab and paste the security rules</li>
              <li>Enable <strong>Email/Password</strong> authentication</li>
              <li>Reload this page</li>
            </ol>
            <div className="text-xs text-slate-400 mt-4">
              Error: {error instanceof Error ? error.message : String(error)}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* ── Loading skeletons ─────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-2xl border border-white/[0.08] overflow-hidden animate-pulse">
              <div className="aspect-[1/1.4] bg-white/[0.06]" />
              <div className="p-3 sm:p-5 space-y-2">
                <div className="h-4 bg-white/[0.06] rounded-lg w-3/4" />
                <div className="h-3 bg-white/[0.06] rounded-lg w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : templates.length === 0 ? (

        /* ── Empty state ─────────────────────────────────────────────────────── */
        <div className="bg-white/[0.03] rounded-3xl border border-dashed border-white/[0.08] p-8 sm:p-16 text-center flex flex-col items-center backdrop-blur-sm">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-amber-400/10 border border-amber-400/20 rounded-full flex items-center justify-center mb-5 sm:mb-6">
            <FileText className="w-8 h-8 sm:w-10 sm:h-10 text-amber-400" />
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-white mb-2">No templates yet</h3>
          <p className="text-slate-500 text-sm sm:text-base max-w-md mb-6 sm:mb-8">
            Upload a PDF or image of your invoice layout to start mapping dynamic fields.
          </p>
          <Button asChild className="w-full sm:w-auto rounded-xl px-8 h-11 sm:h-12 bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold shadow-lg shadow-amber-400/20 border-0">
            <Link href="/templates/new">Create First Template</Link>
          </Button>
        </div>

      ) : (

        /* ── Template grid ───────────────────────────────────────────────────── */
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {templates.map(template => (
            <div
              key={template.id}
              className="group relative bg-white/[0.03] rounded-2xl border border-white/[0.08] overflow-hidden hover:shadow-xl hover:border-primary/30 transition-all duration-300"
            >
              {/* ── Thumbnail ─────────────────────────────────────────────── */}
              <div className="aspect-[1/1.4] relative overflow-hidden bg-slate-100">
                <TemplateThumbnail fileURL={template.fileURL} name={template.name} />

                {/* Hover overlay with Edit button — hidden on mobile, tap menu used instead */}
                <div className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hidden sm:flex items-center justify-center gap-3 backdrop-blur-[2px]">
                  <Button asChild variant="secondary" className="rounded-full font-medium shadow-lg">
                    <Link href={`/templates/edit/${template.id}`}>
                      <Edit className="w-4 h-4 mr-2" /> Edit Template
                    </Link>
                  </Button>
                </div>

                {/* Field count badge — always visible */}
                <div className="absolute top-2 sm:top-3 right-2 sm:right-3 bg-white/[0.03]/90 backdrop-blur-sm text-primary text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full border border-primary/20 shadow-sm">
                  {template.fields?.length ?? 0} fields
                </div>
              </div>

              {/* ── Card footer ──────────────────────────────────────────── */}
              <div className="p-3 sm:p-4 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-bold text-white text-sm sm:text-base truncate">{template.name}</h3>
                  <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">
                    {template.createdAt
                      ? format(
                        template.createdAt?.toDate
                          ? template.createdAt.toDate()
                          : new Date(template.createdAt),
                        "MMM d, yyyy"
                      )
                      : "—"}
                  </p>
                </div>

                {/* Three-dot menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost" size="icon"
                      className="h-8 w-8 flex-shrink-0 text-slate-400 hover:text-slate-300 -mr-1"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-xl w-44">
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link href={`/templates/edit/${template.id}`}>
                        <Edit className="w-4 h-4 mr-2" /> Edit Template
                      </Link>
                    </DropdownMenuItem>
                    <div className="h-px bg-white/[0.06] my-1" />
                    <DropdownMenuItem
                      className="cursor-pointer text-destructive focus:text-destructive focus:bg-red-50"
                      onClick={() => setDeleteId(template.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> Delete Template
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Delete confirmation dialog ────────────────────────────────────────── */}
      <AlertDialog open={!!deleteId} onOpenChange={open => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent className="rounded-2xl mx-4 sm:mx-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-4 h-4 text-destructive" />
              </div>
              Delete Template?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 leading-relaxed">
              You are about to permanently delete{" "}
              <span className="font-semibold text-slate-300">{templateToDelete?.name}</span>.
              Any invoices already generated from this template will not be affected,
              but you will no longer be able to create new invoices using it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0">
            <AlertDialogCancel className="rounded-xl w-full sm:w-auto">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive hover:bg-destructive/90 text-white w-full sm:w-auto"
              onClick={() => {
                if (deleteId) deleteMutation.mutate(deleteId);
                setDeleteId(null);
              }}
            >
              Delete Template
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}