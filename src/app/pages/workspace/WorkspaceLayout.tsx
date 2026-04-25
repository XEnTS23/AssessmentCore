import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, Outlet, useLocation, useNavigate } from "react-router";
import {
  Bell,
  Book,
  ChevronDown,
  CircleHelp,
  Code,
  Download,
  Home,
  LayoutDashboard,
  Lock,
  Moon,
  Settings,
  Sparkles,
  Sun,
  Upload,
} from "lucide-react";
import { useAuth } from "../../../contexts/AuthContext";
import { useTheme } from "../../../contexts/ThemeContext";
import { toast } from "sonner";

export function WorkspaceLayout() {
  const { user, loading, userUsage, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!profileMenuRef.current) return;
      if (!profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const currentPageLabel = useMemo(() => {
    if (location.pathname === "/workspace" || location.pathname.includes("/workspace/dashboard")) return "Dashboard";
    if (location.pathname.includes("/workspace/qti-renderer")) return "QTI Renderer";
    if (location.pathname.includes("/workspace/lms-export")) return "LMS Export";
    if (location.pathname.includes("/workspace/validation-dashboard")) return "Validation Dashboard";
    if (location.pathname.includes("/workspace/batch-creator")) return "Batch Creator";
    return "Workspace";
  }, [location.pathname]);

  const isBatchCreatorRoute = location.pathname.includes("/workspace/batch-creator");

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  if (isBatchCreatorRoute) {
    return (
      <div className="h-screen overflow-hidden">
        <Outlet />
      </div>
    );
  }

  const navItems = [
    { to: "/", label: "Home", icon: <Home className="h-4 w-4" /> },
    { to: "/workspace/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
    { to: "/workspace/qti-renderer", label: "QTI Renderer", icon: <Code className="h-4 w-4" /> },
    { to: "/workspace/batch-creator", label: "Batch Creator", icon: <Upload className="h-4 w-4" /> },
    { to: "/workspace/lms-export", label: "LMS Export", icon: <Download className="h-4 w-4" /> },
  ];

  const initials = (user.email || "U").slice(0, 1).toUpperCase();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground transition-colors duration-200">
      <aside className="flex w-[228px] shrink-0 flex-col border-r border-border bg-sidebar transition-colors duration-200">
        <div className="flex h-14 items-center gap-2 border-b border-border px-4">
          <img src={isDark ? '/logo-dark-1.png' : '/AC_logo.png'} alt="AssessmentCore logo" className="h-6 w-6 rounded-md object-contain" />
          <Link to="/" className="text-sm font-semibold text-foreground hover:text-primary transition-colors">
            AssessmentCore
          </Link>
        </div>

        <div className="border-b border-border px-4 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Current plan</div>
          <p className="mt-1 text-xs text-foreground">{userUsage?.is_premium ? "Premium" : "Free"} workspace</p>
          <p className="text-[11px] text-muted-foreground">{userUsage?.total_questions_converted || 0} questions converted</p>
        </div>

        <nav className="flex-1 space-y-1 px-2 py-3">
          {navItems.map((item) => {
            const active = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs ${
                  active
                    ? "border border-border bg-accent font-semibold text-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {item.icon}
                <span className="flex-1">{item.label}</span>
                {/* Removed item.locked as it's not relevant */}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-1 border-t border-border px-2 py-3">
          <Link
            to="/documentation"
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Book className="h-4 w-4" />
            Docs
          </Link>
          <button
            type="button"
            onClick={() => setIsSettingsOpen((prev) => !prev)}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-expanded={isSettingsOpen}
          >
            <Settings className="h-4 w-4" />
            Settings
            <ChevronDown className={`ml-auto h-3.5 w-3.5 transition-transform ${isSettingsOpen ? "rotate-180" : ""}`} />
          </button>

          {isSettingsOpen && (
            <div className="mx-2 mt-1 rounded-md border border-border bg-muted/50 p-2.5">
              <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Appearance</div>
              <button
                type="button"
                onClick={toggleTheme}
                className="flex w-full items-center justify-between rounded-md border border-border bg-background px-2.5 py-2 text-xs text-foreground hover:bg-muted transition-colors"
              >
                <span className="inline-flex items-center gap-1.5 font-medium">
                  {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                  Theme
                </span>
                <span className="rounded-full border border-border bg-card px-2 py-0.5 text-[10px] font-semibold">
                  {isDark ? "Dark" : "Light"}
                </span>
              </button>
            </div>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-6 transition-colors duration-200">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Workspace</span>
            <span>/</span>
            <span className="rounded-full border border-border bg-muted px-2 py-0.5 font-medium text-foreground">{currentPageLabel}</span>
          </div>

          <div className="flex items-center gap-3">
            <button type="button" className="text-muted-foreground hover:text-foreground transition-colors" title="Help">
              <CircleHelp className="h-4 w-4" />
            </button>
            <button type="button" className="relative text-muted-foreground hover:text-foreground transition-colors" title="Notifications">
              <Bell className="h-4 w-4" />
              <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-red-500" />
            </button>

            <div className="relative" ref={profileMenuRef}>
              <button
                type="button"
                onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                className="flex items-center gap-2 rounded-md border border-border bg-card px-2 py-1 hover:bg-accent transition-colors"
                aria-expanded={isProfileMenuOpen}
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-[11px] font-semibold text-primary-foreground">
                  {initials}
                </div>
                <div className="text-left">
                  <div className="max-w-[150px] truncate text-xs font-medium text-foreground">{user.email}</div>
                  <div className="text-[10px] text-muted-foreground">{userUsage?.is_premium ? "Premium" : "Free"} tier</div>
                </div>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>

              <div
                className={`absolute right-0 mt-1.5 w-44 rounded-md border border-border bg-popover p-1 shadow-lg transition ${
                  isProfileMenuOpen ? "visible opacity-100" : "invisible opacity-0"
                }`}
              >
                <Link
                  to="/workspace/dashboard"
                  className="block rounded px-2 py-1.5 text-xs text-popover-foreground hover:bg-muted"
                  onClick={() => setIsProfileMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <button
                  type="button"
                  className="w-full rounded px-2 py-1.5 text-left text-xs text-popover-foreground hover:bg-muted"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    toast.info("Profile management coming soon");
                  }}
                >
                  Profile
                </button>
                <button
                  type="button"
                  className="mt-1 w-full rounded px-2 py-1.5 text-left text-xs text-destructive hover:bg-destructive/10"
                  onClick={async () => {
                    setIsProfileMenuOpen(false);
                    const response = await logout();
                    if (response.success) {
                      navigate('/auth/login');
                    } else {
                      toast.error(response.error || "Failed to log out");
                    }
                  }}
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
