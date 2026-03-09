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
// Tries to render the Cloudinary image. Falls back gracefully if it fails.
function TemplateThumbnail({ fileURL, name }: { fileURL?: string; name: string }) {
  const [errored, setErrored] = useState(false);

  // Build an optimised Cloudinary thumbnail URL if the URL is from Cloudinary.
  // We request a 400-wide, quality-auto version so it loads fast.
  const thumbUrl = (() => {
    if (!fileURL) return null;
    if (fileURL.includes("res.cloudinary.com")) {
      // Insert transformation before the version/filename segment
      return fileURL.replace("/upload/", "/upload/w_400,q_auto,f_auto/");
    }
    return fileURL;
  })();

  if (!thumbUrl || errored) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-50 gap-3">
        <FileText className="w-14 h-14 text-slate-300" />
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
    <div className="space-y-8">

      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Templates</h1>
          <p className="text-slate-500 mt-1">Design and manage your invoice layouts.</p>
        </div>
        <Button asChild className="rounded-xl shadow-md shadow-primary/20 hover:-translate-y-0.5 transition-all">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-2xl border border-white/[0.08] overflow-hidden animate-pulse">
              <div className="aspect-[1/1.4] bg-white/[0.06]" />
              <div className="p-5 space-y-2">
                <div className="h-4 bg-white/[0.06] rounded-lg w-3/4" />
                <div className="h-3 bg-white/[0.06] rounded-lg w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : templates.length === 0 ? (

        /* ── Empty state ─────────────────────────────────────────────────────── */
        <div className="bg-white/[0.03] rounded-3xl border border-dashed border-white/[0.08] p-16 text-center flex flex-col items-center">
          <div className="w-20 h-20 bg-amber-400/10 border border-amber-400/20 rounded-full flex items-center justify-center mb-6">
            <FileText className="w-10 h-10 text-amber-400" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No templates yet</h3>
          <p className="text-slate-500 max-w-md mb-8">
            Upload a PDF or image of your invoice layout to start mapping dynamic fields.
          </p>
          <Button asChild className="rounded-xl px-8 h-12 bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold shadow-lg shadow-amber-400/20 border-0">
            <Link href="/templates/new">Create First Template</Link>
          </Button>
        </div>

      ) : (

        /* ── Template grid ───────────────────────────────────────────────────── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map(template => (
            <div
              key={template.id}
              className="group relative bg-white/[0.03] rounded-2xl border border-white/[0.08] overflow-hidden hover:shadow-xl hover:border-primary/30 transition-all duration-300"
            >
              {/* ── Thumbnail ─────────────────────────────────────────────── */}
              <div className="aspect-[1/1.4] relative overflow-hidden bg-slate-100">
                <TemplateThumbnail fileURL={template.fileURL} name={template.name} />

                {/* Hover overlay with Edit button */}
                <div className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-3 backdrop-blur-[2px]">
                  <Button asChild variant="secondary" className="rounded-full font-medium shadow-lg">
                    <Link href={`/templates/edit/${template.id}`}>
                      <Edit className="w-4 h-4 mr-2" /> Edit Template
                    </Link>
                  </Button>
                </div>

                {/* Field count badge — always visible */}
                <div className="absolute top-3 right-3 bg-white/[0.03]/90 backdrop-blur-sm text-primary text-[11px] font-bold px-2 py-0.5 rounded-full border border-primary/20 shadow-sm">
                  {template.fields?.length ?? 0} fields
                </div>
              </div>

              {/* ── Card footer ──────────────────────────────────────────── */}
              <div className="p-4 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-bold text-white text-base truncate">{template.name}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
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
                    <div className="h-px bg-white/[0.06]my-1" />
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
        <AlertDialogContent className="rounded-2xl">
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
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive hover:bg-destructive/90 text-white"
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