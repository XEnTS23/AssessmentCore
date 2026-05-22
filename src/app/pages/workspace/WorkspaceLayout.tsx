import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, Outlet, useLocation, useNavigate } from "react-router";
import {
  Bell,
  Book,
  CircleHelp,
  Code,
  Download,
  Home,
  LayoutDashboard,
  Lock,
  Moon,
  ScanText,
  Sparkles,
  Sun,
  Upload,
} from "lucide-react";
import { useAuth } from "../../../contexts/AuthContext";
import { useTheme } from "../../../contexts/ThemeContext";
import { ProfileMenu } from "../../components/ProfileMenu";
import { toast } from "sonner";

export function WorkspaceLayout() {
  const { user, loading, userUsage } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);

  const currentPageLabel = useMemo(() => {
    if (location.pathname === "/workspace" || location.pathname.includes("/workspace/dashboard")) return "Dashboard";
    if (location.pathname.includes("/workspace/ocr")) return "OCR Processor";
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
    { to: "/workspace/ocr", label: "OCR Processor", icon: <ScanText className="h-4 w-4" /> },
    { to: "/workspace/qti-renderer", label: "QTI Renderer", icon: <Code className="h-4 w-4" />, comingSoon: true },
    { to: "/workspace/batch-creator", label: "Batch Creator", icon: <Upload className="h-4 w-4" />, premiumOnly: true },
    { to: "/workspace/lms-export", label: "LMS Export", icon: <Download className="h-4 w-4" />, comingSoon: true },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground transition-colors duration-200">
      <aside 
        className="flex shrink-0 flex-col border-r border-border bg-sidebar transition-all duration-300 ease-in-out z-20 overflow-hidden"
        style={{ width: isSidebarHovered ? '228px' : '72px' }}
        onMouseEnter={() => setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
      >
        <div className={`flex h-14 items-center border-b border-border transition-all ${isSidebarHovered ? 'px-4 gap-2 justify-start' : 'px-0 justify-center'}`}>
          <img src={isDark ? '/logo-dark-1.png' : '/AC_logo.png'} alt="AssessmentCore logo" className="h-6 w-6 shrink-0 rounded-md object-contain" />
          {isSidebarHovered && (
            <Link to="/" className="text-sm font-semibold text-foreground hover:text-primary transition-colors whitespace-nowrap">
              AssessmentCore
            </Link>
          )}
        </div>

        <div className={`border-b border-border px-4 py-3 flex flex-col justify-center transition-all ${isSidebarHovered ? '' : 'items-center opacity-0 h-0 overflow-hidden py-0 border-b-0'}`}>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">Current plan</div>
          <p className="mt-1 text-xs text-foreground whitespace-nowrap">{userUsage?.is_premium ? "Premium" : "Free"} workspace</p>
          <p className="text-[11px] text-muted-foreground whitespace-nowrap">{userUsage?.total_questions_converted || 0} questions converted</p>
        </div>

        <nav className="flex-1 space-y-1 px-2 py-3 overflow-y-auto overflow-x-hidden">
          {navItems.map((item) => {
            const active = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
            const isLocked = item.premiumOnly && !userUsage?.is_premium;
            const isComingSoon = item.comingSoon;
            const isDisabled = isLocked || isComingSoon;
            
            if (isDisabled) {
              return (
                <div
                  key={item.to}
                  className={`flex items-center rounded-md py-2 text-xs text-muted-foreground/60 cursor-not-allowed ${isSidebarHovered ? 'gap-2 px-3 justify-start' : 'gap-0 px-0 justify-center'}`}
                  title={isComingSoon ? (isSidebarHovered ? "Coming soon" : item.label) : (isSidebarHovered ? "Premium feature" : item.label)}
                >
                  <div className="shrink-0">{item.icon}</div>
                  {isSidebarHovered && (
                    <>
                      <span className="flex-1 whitespace-nowrap">{item.label}</span>
                      {isComingSoon ? (
                        <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Soon</span>
                      ) : (
                        <Lock className="h-3 w-3 shrink-0 text-primary" />
                      )}
                    </>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.to}
                to={item.to}
                title={!isSidebarHovered ? item.label : undefined}
                className={`flex items-center rounded-md py-2 text-xs transition-colors ${
                  active
                    ? "border border-border bg-accent font-semibold text-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                } ${isSidebarHovered ? 'gap-2 px-3 justify-start' : 'gap-0 px-0 justify-center'}`}
              >
                <div className="shrink-0">{item.icon}</div>
                {isSidebarHovered && <span className="flex-1 whitespace-nowrap">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-1 border-t border-border px-2 py-3 overflow-hidden">
          <Link
            to="/documentation"
            title={!isSidebarHovered ? "Docs" : undefined}
            className={`flex w-full items-center rounded-md py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground ${isSidebarHovered ? 'gap-2 px-3 justify-start' : 'gap-0 px-0 justify-center'}`}
          >
            <Book className="h-4 w-4 shrink-0" />
            {isSidebarHovered && <span className="whitespace-nowrap">Docs</span>}
          </Link>
          
          <button
            onClick={toggleTheme}
            title={!isSidebarHovered ? (isDark ? "Light mode" : "Dark mode") : undefined}
            className={`flex w-full items-center rounded-md py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors ${isSidebarHovered ? 'gap-2 px-3 justify-start' : 'gap-0 px-0 justify-center'}`}
          >
            {isDark ? (
              <Sun className="h-4 w-4 shrink-0" />
            ) : (
              <Moon className="h-4 w-4 shrink-0" />
            )}
            {isSidebarHovered && (
              <span className="whitespace-nowrap">
                {isDark ? "Light mode" : "Dark mode"}
              </span>
            )}
          </button>
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

            <ProfileMenu variant="navbar" />
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
