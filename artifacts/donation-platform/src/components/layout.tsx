import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useLogout } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LogOut,
  LayoutDashboard,
  Banknote,
  Users,
  FileText,
  ShieldCheck,
  MoreVertical,
  Settings,
  ChevronRight,
} from "lucide-react";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const [location] = useLocation();
  const logoutMutation = useLogout();

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        logout();
      },
    });
  };

  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const isSuperAdmin = user?.role === "super_admin";
  const isCollector = user?.role === "collector";

  type NavItem = { href: string; label: string; icon: React.ReactNode };

  const navItems: NavItem[] = [
    { href: "/", label: "Public Dashboard", icon: <LayoutDashboard size={16} /> },
    ...(isAuthenticated && (isCollector || isAdmin)
      ? [{ href: "/collector", label: "Collector Panel", icon: <Banknote size={16} /> }]
      : []),
    ...(isAuthenticated && isAdmin
      ? [
          { href: "/admin", label: "Admin Analytics", icon: <ShieldCheck size={16} /> },
          { href: "/admin/users", label: "User Management", icon: <Users size={16} /> },
          { href: "/admin/audit", label: "Audit Logs", icon: <FileText size={16} /> },
        ]
      : []),
    ...(isAuthenticated && isSuperAdmin
      ? [{ href: "/admin/settings", label: "Site Settings", icon: <Settings size={16} /> }]
      : []),
  ];

  const DesktopNavLinks = () => (
    <>
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
            location === item.href
              ? "bg-primary text-primary-foreground font-medium"
              : "hover:bg-muted"
          }`}
        >
          {item.icon}
          <span>{item.label}</span>
        </Link>
      ))}
    </>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-40 w-full border-b bg-card shadow-sm">
        <div className="container flex h-auto min-h-16 items-center justify-between px-4 sm:px-6 md:px-8 py-2 gap-3">
          <div className="flex items-center gap-2">
            <div className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <MoreVertical className="h-5 w-5" />
                    <span className="sr-only">Menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 mt-1">
                  <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                    Navigation
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {navItems.map((item) => (
                    <Link key={item.href} href={item.href}>
                      <DropdownMenuItem
                        className={`gap-2 cursor-pointer ${
                          location === item.href
                            ? "bg-primary/10 text-primary font-semibold"
                            : ""
                        }`}
                      >
                        {item.icon}
                        <span className="flex-1">{item.label}</span>
                        {location === item.href && <ChevronRight size={14} className="text-primary" />}
                      </DropdownMenuItem>
                    </Link>
                  ))}
                  {isAuthenticated && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                        onClick={handleLogout}
                      >
                        <LogOut size={16} />
                        <span>Logout</span>
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <Link href="/" className="flex items-center gap-2 tracking-tight">
              <img
                src="/logo.png"
                alt="लोगो"
                className="w-10 h-10 object-contain hidden sm:block"
              />
              <div className="flex flex-col">
                <span className="font-bold text-base md:text-lg leading-tight text-primary">
                  श्री मां नर्मदा भक्त परिवार
                </span>
                <span className="text-[10px] text-muted-foreground leading-tight hidden sm:block">
                  दान प्रबंधन प्रणाली — Official Platform
                </span>
              </div>
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-1 overflow-x-auto mx-4">
            <DesktopNavLinks />
          </nav>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col items-end text-sm">
                  <span className="font-semibold leading-none">{user?.name}</span>
                  <span className="text-muted-foreground text-xs uppercase tracking-wider">
                    {user?.role?.replace("_", " ")}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="gap-2 hidden md:flex"
                >
                  <LogOut size={16} />
                  <span>Logout</span>
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
          <p className="text-sm text-muted-foreground mt-1">
            आधिकारिक दान प्रबंधन प्रणाली &copy; {new Date().getFullYear()}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            प्रत्येक लेनदेन सुरक्षित रूप से ऑडिट और ट्रैक किया जाता है।
          </p>
        </div>
      </footer>
    </div>
  );
}
