import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "./hooks/use-auth";
import { AppLayout } from "./components/layout";

// Pages
import NotFound        from "@/pages/not-found";
import Landing         from "@/pages/landing";
import Login           from "@/pages/login";
import Register        from "@/pages/register";
import Dashboard       from "@/pages/dashboard";
import Templates       from "@/pages/templates";
import TemplateEditor  from "@/pages/template-editor";
import Customers       from "@/pages/customers";
import Invoices        from "@/pages/invoices";
import InvoiceGenerator from "@/pages/invoice-generator";

// ─── Protected route wrapper ──────────────────────────────────────────────────
function ProtectedRoute({ component: Component, ...rest }: any) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user)   return <Redirect to="/login" />;
  return <Component {...rest} />;
}

// ─── Router ───────────────────────────────────────────────────────────────────
function Router() {
  return (
    <Switch>
      {/* ── Public routes — NO sidebar/layout ── */}
      <Route path="/"         component={Landing}  />
      <Route path="/login"    component={Login}    />
      <Route path="/register" component={Register} />

      {/* ── Protected routes — wrapped in AppLayout ── */}
      <Route>
        {() => (
          <AppLayout>
            <Switch>
              <Route path="/dashboard">
                {() => <ProtectedRoute component={Dashboard} />}
              </Route>
              <Route path="/templates">
                {() => <ProtectedRoute component={Templates} />}
              </Route>
              <Route path="/templates/new">
                {() => <ProtectedRoute component={TemplateEditor} />}
              </Route>
              <Route path="/templates/edit/:id">
                {() => <ProtectedRoute component={TemplateEditor} />}
              </Route>
              <Route path="/customers">
                {() => <ProtectedRoute component={Customers} />}
              </Route>
              <Route path="/invoices">
                {() => <ProtectedRoute component={Invoices} />}
              </Route>
              <Route path="/invoices/new">
                {() => <ProtectedRoute component={InvoiceGenerator} />}
              </Route>
              <Route component={NotFound} />
            </Switch>
          </AppLayout>
        )}
      </Route>
    </Switch>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Router />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;