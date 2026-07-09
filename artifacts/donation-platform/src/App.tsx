import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { Layout } from "@/components/layout";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import CollectorPanel from "@/pages/collector";
import AdminPanel from "@/pages/admin";
import AdminUsers from "@/pages/admin-users";
import AdminAudit from "@/pages/admin-audit";
import AdminSettings from "@/pages/admin-settings";
import VerifyDonation from "@/pages/verify";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ component: Component, allowedRoles, ...rest }: any) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Redirect to="/" />;
  }

  return <Component {...rest} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/verify/:id" component={VerifyDonation} />
      <Route path="/login" component={Login} />
      
      <Route path="/">
        {() => (
          <Layout>
            <Dashboard />
          </Layout>
        )}
      </Route>
      
      <Route path="/collector">
        {() => (
          <Layout>
            <ProtectedRoute component={CollectorPanel} allowedRoles={['super_admin', 'admin', 'collector']} />
          </Layout>
        )}
      </Route>
      
      <Route path="/admin">
        {() => (
          <Layout>
            <ProtectedRoute component={AdminPanel} allowedRoles={['super_admin', 'admin']} />
          </Layout>
        )}
      </Route>
      
      <Route path="/admin/users">
        {() => (
          <Layout>
            <ProtectedRoute component={AdminUsers} allowedRoles={['super_admin', 'admin']} />
          </Layout>
        )}
      </Route>
      
      <Route path="/admin/audit">
        {() => (
          <Layout>
            <ProtectedRoute component={AdminAudit} allowedRoles={['super_admin', 'admin']} />
          </Layout>
        )}
      </Route>

      <Route path="/admin/settings">
        {() => (
          <Layout>
            <ProtectedRoute component={AdminSettings} allowedRoles={['super_admin']} />
          </Layout>
        )}
      </Route>

      <Route>
        {() => (
          <Layout>
            <NotFound />
          </Layout>
        )}
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
