import { useTemplates, useDeleteTemplate } from "@/hooks/use-templates";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Trash2, MoreVertical, Edit } from "lucide-react";
import { format } from "date-fns";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Templates() {
  const { user, loading: authLoading } = useAuth();
  const { data: templates = [], isLoading, error } = useTemplates();
  const deleteMutation = useDeleteTemplate();

  if (authLoading) {
    return <div className="p-8 text-center">Loading authentication...</div>;
  }

  if (!user) {
    return <div className="p-8 text-center text-destructive">Not authenticated. Please log in.</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Templates</h1>
          <p className="text-slate-500 mt-1">Design and manage your invoice layouts.</p>
        </div>
        <Button asChild className="rounded-xl shadow-md shadow-primary/20 hover:-translate-y-0.5 transition-all">
          <Link href="/templates/new">
            <Plus className="w-4 h-4 mr-2" /> New Template
          </Link>
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="rounded-xl">
          <AlertDescription className="space-y-3">
            <div>
              <strong>Firestore Setup Required</strong>
            </div>
            <div className="text-sm">
              Your Firebase project needs to be configured. Please follow these steps:
            </div>
            <ol className="text-sm list-decimal list-inside space-y-2">
              <li>Open <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" className="underline font-semibold">Firebase Console</a></li>
              <li>Select project: <strong>invoice-generator-12</strong></li>
              <li>Go to <strong>Firestore Database</strong> and click Create Database</li>
              <li>Choose <strong>production mode</strong> and select a region</li>
              <li>Click the <strong>Rules</strong> tab and paste the security rules (see FIREBASE_SETUP_INSTRUCTIONS.md)</li>
              <li>Enable <strong>Email/Password</strong> authentication</li>
              <li>Reload this page</li>
            </ol>
            <div className="text-xs text-slate-400 mt-4">
              Error: {error instanceof Error ? error.message : String(error)}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-64 bg-slate-100 animate-pulse rounded-2xl"></div>
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-16 text-center flex flex-col items-center">
          <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
            <FileText className="w-10 h-10 text-primary" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">No templates yet</h3>
          <p className="text-slate-500 max-w-md mb-8">Upload a PDF or image of your invoice layout to start mapping dynamic fields.</p>
          <Button asChild className="rounded-xl px-8 h-12 shadow-lg shadow-primary/20">
            <Link href="/templates/new">Create First Template</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <div key={template.id} className="group relative bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl hover:border-primary/30 transition-all duration-300">
              <div className="aspect-[1/1.4] bg-slate-100 relative overflow-hidden flex items-center justify-center">
                {/* Visual preview if we had thumbnails, for now just an icon */}
                <FileText className="w-16 h-16 text-slate-300" />
                
                {/* Overlay actions */}
                <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-sm">
                  <Button asChild variant="secondary" className="rounded-full font-medium">
                    <Link href={`/templates/edit/${template.id}`}>
                      <Edit className="w-4 h-4 mr-2" /> Edit
                    </Link>
                  </Button>
                </div>
              </div>
              <div className="p-5">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg truncate pr-4">{template.name}</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      {format(new Date(template.createdAt), 'MMM d, yyyy')} • {template.fields.length} fields
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 text-slate-400 hover:text-slate-900">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl">
                      <DropdownMenuItem asChild>
                        <Link href={`/templates/edit/${template.id}`} className="cursor-pointer">Edit Template</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-destructive focus:text-destructive cursor-pointer"
                        onClick={() => {
                          if(confirm('Delete template?')) deleteMutation.mutate(template.id);
                        }}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
