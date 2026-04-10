import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useLogout } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { 
  LogOut, 
  LayoutDashboard, 
  Banknote, 
  Users, 
  FileText, 
  ShieldCheck,
  Menu,
  Settings
} from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const [location] = useLocation();
  const logoutMutation = useLogout();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        logout();
      }
    });
  };

  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const isSuperAdmin = user?.role === "super_admin";
  const isCollector = user?.role === "collector";

  const NavLinks = () => (
    <>
      <Link href="/" className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${location === "/" ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted"}`}>
        <LayoutDashboard size={18} />
        <span>Public Dashboard</span>
      </Link>
      
      {isAuthenticated && (isCollector || isAdmin) && (
        <Link href="/collector" className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${location === "/collector" ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted"}`}>
          <Banknote size={18} />
          <span>Collector Panel</span>
        </Link>
      )}

      {isAuthenticated && isAdmin && (
        <>
          <Link href="/admin" className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${location === "/admin" ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted"}`}>
            <ShieldCheck size={18} />
            <span>Admin Analytics</span>
          </Link>
          <Link href="/admin/users" className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${location === "/admin/users" ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted"}`}>
            <Users size={18} />
            <span>User Management</span>
          </Link>
          <Link href="/admin/audit" className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${location === "/admin/audit" ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted"}`}>
            <FileText size={18} />
            <span>Audit Logs</span>
          </Link>
        </>
      )}

      {isAuthenticated && isSuperAdmin && (
        <Link href="/admin/settings" className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${location === "/admin/settings" ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted"}`}>
          <Settings size={18} />
          <span>Site Settings</span>
        </Link>
      )}
    </>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-40 w-full border-b bg-card shadow-sm">
        <div className="container flex h-auto min-h-16 items-center justify-between px-4 sm:px-6 md:px-8 py-2 gap-3">
          <div className="flex items-center gap-2">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[240px] sm:w-[300px]">
                <div className="flex flex-col gap-1 mb-6">
                  <div className="flex items-center gap-2 font-bold text-lg">
                    <div className="bg-primary text-primary-foreground p-1.5 rounded-md">
                      <ShieldCheck size={20} />
                    </div>
                    <span className="text-primary font-bold">श्री मां नर्मदा</span>
                  </div>
                  <p className="text-xs text-muted-foreground pl-10">भक्त परिवार</p>
                </div>
                <nav className="flex flex-col gap-2">
                  <NavLinks />
                </nav>
              </SheetContent>
            </Sheet>
            
            <Link href="/" className="flex items-center gap-2 tracking-tight">
              <div className="bg-primary text-primary-foreground p-1.5 rounded-md hidden sm:block">
                <ShieldCheck size={20} />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-base md:text-lg leading-tight text-primary">श्री मां नर्मदा भक्त परिवार</span>
                <span className="text-[10px] text-muted-foreground leading-tight hidden sm:block">दान प्रबंधन प्रणाली — Official Platform</span>
              </div>
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-1 overflow-x-auto mx-4">
            <NavLinks />
          </nav>

          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex flex-col items-end text-sm">
                  <span className="font-semibold leading-none">{user?.name}</span>
                  <span className="text-muted-foreground text-xs uppercase tracking-wider">{user?.role?.replace('_', ' ')}</span>
                </div>
                <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
                  <LogOut size={16} />
                  <span className="hidden sm:inline">Logout</span>
                </Button>
              </div>
            ) : (
              <Link href="/login">
                <Button size="sm">Login</Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        {children}
      </main>
      
      <footer className="border-t py-6 bg-primary/5">
        <div className="container text-center">
          <p className="font-bold text-primary text-base">श्री मां नर्मदा भक्त परिवार</p>
          <p className="text-sm text-muted-foreground mt-1">आधिकारिक दान प्रबंधन प्रणाली &copy; {new Date().getFullYear()}</p>
          <p className="text-xs text-muted-foreground mt-1">प्रत्येक लेनदेन सुरक्षित रूप से ऑडिट और ट्रैक किया जाता है।</p>
        </div>
      </footer>
    </div>
  );
}
