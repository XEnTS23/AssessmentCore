import { useState, useEffect, useRef } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router";
import {
  Home,
  LayoutDashboard,
  Code,
  Bell,
  CircleHelp,
  Download,
  FileText,
  Upload,
  UserRound,
  Lock,
} from "lucide-react";
import { cn } from "../../components/ui/utils";
import { useAuth } from "../../../contexts/AuthContext";
import { toast } from "sonner";

export function WorkspaceLayout() {
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading, userUsage } = useAuth();
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth/login', { replace: true });
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!profileMenuRef.current) return;
      if (!profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onEscape);
    };
  }, []);

  const isActive = (path: string) => {
    if (path === "/workspace" && location.pathname === "/workspace") return true;
    if (path !== "/workspace" && location.pathname.includes(path)) return true;
    return false;
  };

  const isBatchCreatorRoute = location.pathname.includes('/workspace/batch-creator');
  const sidebarCollapsedWidth = 72;
  const sidebarExpandedWidth = 256;
  const sidebarWidth = isSidebarHovered ? sidebarExpandedWidth : sidebarCollapsedWidth;

  const currentPageLabel = (() => {
    if (location.pathname === '/workspace' || location.pathname.includes('/workspace/dashboard')) return 'Dashboard';
    if (location.pathname.includes('/workspace/qti-renderer')) return 'QTI Renderer';
    if (location.pathname.includes('/workspace/lms-export')) return 'LMS Export';
    if (location.pathname.includes('/workspace/validation-dashboard')) return 'Validation Dashboard';
    return 'Workspace';
  })();

  // Show nothing while auth state is resolving (redirect fires in useEffect above)
  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f9f9ff]">
        <div className="w-8 h-8 border-4 border-[#003a9f] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Batch Creator already renders its own full shell and should remain untouched.
  if (isBatchCreatorRoute) {
    return (
      <div className="h-screen overflow-hidden">
        <Outlet />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 bg-[radial-gradient(circle_at_top_left,_rgba(36,87,184,0.18),_transparent_36%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.12),_transparent_34%),linear-gradient(180deg,_#f5f8ff_0%,_#eef4f8_100%)] text-slate-900 antialiased flex overflow-hidden">
      <aside
        className="h-screen flex-shrink-0 bg-[linear-gradient(200deg,_#ffffff_0%,_#f7faff_52%,_#f2fbf8_100%)] flex flex-col border-r border-[#d5e4ff] transition-[width] duration-300"
        style={{ width: sidebarWidth }}
        onMouseEnter={() => setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
      >
        <div className={cn("mb-4", isSidebarHovered ? "p-8" : "p-4 flex justify-center")}>
          {isSidebarHovered ? (
            <>
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900 leading-none">AssessmentCore</h1>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">Workflow Wizard</p>
            </>
          ) : (
            <div className="w-9 h-9 rounded-lg bg-[#0052CC]/12 text-[#0052CC] font-black flex items-center justify-center ring-1 ring-[#0052CC]/15">A</div>
          )}
        </div>

        <nav className="flex-1 px-4 space-y-1">
          <Link
            to="/"
            className={cn(
              "w-full flex items-center py-3 rounded-lg transition-all text-sm font-medium",
              isSidebarHovered ? "gap-3 px-4 justify-start" : "px-0 justify-center",
              location.pathname === "/"
                ? "bg-[linear-gradient(135deg,_#e8f0ff_0%,_#e7f9f0_100%)] text-[#1f4aa0] font-semibold border border-[#bfd6ff] shadow-sm"
                : "text-slate-600 hover:bg-[linear-gradient(135deg,_#eef4ff_0%,_#ecfaf4_100%)] hover:text-[#1f4aa0]"
            )}
          >
            <Home className="w-5 h-5" />
            {isSidebarHovered && <span>Home</span>}
          </Link>

          <Link
            to="/workspace/dashboard"
            className={cn(
              "w-full flex items-center py-3 rounded-lg transition-all text-sm font-medium",
              isSidebarHovered ? "gap-3 px-4 justify-start" : "px-0 justify-center",
              isActive("/workspace/dashboard") || location.pathname === "/workspace"
                ? "bg-[linear-gradient(135deg,_#e8f0ff_0%,_#e7f9f0_100%)] text-[#1f4aa0] font-semibold border border-[#bfd6ff] shadow-sm"
                : "text-slate-600 hover:bg-[linear-gradient(135deg,_#eef4ff_0%,_#ecfaf4_100%)] hover:text-[#1f4aa0]"
            )}
          >
            <LayoutDashboard className="w-5 h-5" />
            {isSidebarHovered && <span>Dashboard</span>}
          </Link>

          <Link
            to="/workspace/qti-renderer"
            className={cn(
              "w-full flex items-center py-3 rounded-lg transition-all text-sm font-medium",
              isSidebarHovered ? "gap-3 px-4 justify-start" : "px-0 justify-center",
              isActive("/workspace/qti-renderer")
                ? "bg-[linear-gradient(135deg,_#e8f0ff_0%,_#e7f9f0_100%)] text-[#1f4aa0] font-semibold border border-[#bfd6ff] shadow-sm"
                : "text-slate-600 hover:bg-[linear-gradient(135deg,_#eef4ff_0%,_#ecfaf4_100%)] hover:text-[#1f4aa0]"
            )}
          >
            <Code className="w-5 h-5" />
            {isSidebarHovered && <span>QTI Renderer</span>}
          </Link>

          <Link
            to="/workspace/qti-renderer"
            className={cn(
              "hidden"
            )}
          >
            <Code className="w-5 h-5 flex-shrink-0" />
          </Link>

          <Link
            to="/workspace/batch-creator"
            className={cn(
              "w-full flex items-center py-3 rounded-lg transition-all text-sm font-medium",
              isSidebarHovered ? "gap-3 px-4 justify-start" : "px-0 justify-center",
              isActive("/workspace/batch-creator")
                ? "bg-[linear-gradient(135deg,_#e8f0ff_0%,_#e7f9f0_100%)] text-[#1f4aa0] font-semibold border border-[#bfd6ff] shadow-sm"
                : "text-slate-600 hover:bg-[linear-gradient(135deg,_#eef4ff_0%,_#ecfaf4_100%)] hover:text-[#1f4aa0]"
            )}
          >
            <Upload className="w-5 h-5 flex-shrink-0" />
            {isSidebarHovered && (
              <>
                <span className="flex-1">Batch QTI Creator</span>
                {!userUsage?.batch_creator_access && (
                  <Lock className="w-3 h-3 opacity-50 flex-shrink-0" />
                )}
              </>
            )}
          </Link>

          <Link
            to="/workspace/lms-export"
            className={cn(
              "w-full flex items-center py-3 rounded-lg transition-all text-sm font-medium",
              isSidebarHovered ? "gap-3 px-4 justify-start" : "px-0 justify-center",
              isActive("/workspace/lms-export")
                ? "bg-[linear-gradient(135deg,_#e8f0ff_0%,_#e7f9f0_100%)] text-[#1f4aa0] font-semibold border border-[#bfd6ff] shadow-sm"
                : "text-slate-600 hover:bg-[linear-gradient(135deg,_#eef4ff_0%,_#ecfaf4_100%)] hover:text-[#1f4aa0]"
            )}
          >
            <Download className="w-5 h-5 flex-shrink-0" />
            {isSidebarHovered && <span>LMS Export</span>}
          </Link>

        </nav>

        <div className="p-6 mt-auto">
          <button
            type="button"
            className={cn(
              "w-full py-2.5 bg-[linear-gradient(120deg,_#2457b8_0%,_#2f7ecf_52%,_#1f9d86_100%)] border border-transparent text-white rounded-lg text-sm font-semibold hover:brightness-95 transition-all shadow-sm flex items-center",
              isSidebarHovered ? "justify-center gap-2" : "justify-center"
            )}
          >
            <FileText className="w-4 h-4" />
            {isSidebarHovered && <span>Save Draft</span>}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="w-full bg-[linear-gradient(180deg,_#ffffff_0%,_#f6fbff_52%,_#f2fbf8_100%)] border-b border-[#d5e4ff] pt-4 pb-5 px-12 flex items-center justify-between shrink-0">
          <nav className="flex items-center gap-2 text-xs font-medium">
            <span className="text-slate-400">Workspace</span>
            <span className="text-slate-300">/</span>
            <span className="text-[#1f4aa0] font-semibold bg-[#e8f0ff] border border-[#bfd6ff] px-2.5 py-1 rounded-full">{currentPageLabel}</span>
          </nav>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4 border-r border-slate-200 pr-6">
              <button type="button" className="text-slate-400 hover:text-[#1f4aa0] transition-colors" title="Help">
                <CircleHelp className="w-5 h-5" />
              </button>
              <button type="button" className="text-slate-400 hover:text-[#1f4aa0] transition-colors relative" title="Notifications">
                <Bell className="w-5 h-5" />
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
              </button>
            </div>
            <div className="relative" ref={profileMenuRef}>
              <button
                type="button"
                onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                className="flex items-center gap-3"
                aria-expanded={isProfileMenuOpen}
              >
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-900 leading-none">{user?.email?.split('@')[0] || 'User'}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest">Admin Tier</p>
                </div>
                <div className="w-9 h-9 rounded-full ring-2 ring-slate-100 bg-[#e7eeff] text-[#0052CC] flex items-center justify-center">
                  <UserRound className="w-4 h-4" />
                </div>
              </button>

              <div className={cn(
                "absolute right-0 mt-2 w-56 rounded-xl border border-[#c5c5d4] bg-white shadow-[0_20px_40px_rgba(17,28,45,0.15)] p-2.5 origin-top-right transition-all duration-200",
                isProfileMenuOpen
                  ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
                  : "opacity-0 -translate-y-1 scale-95 pointer-events-none"
              )}>
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    toast.info('Profile page will be available soon');
                  }}
                  className="w-full text-left px-2 py-2 rounded-md text-sm text-[#111c2d] hover:bg-[#f9f9ff]"
                >
                  Profile
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    navigate('/workspace/dashboard');
                  }}
                  className="w-full text-left px-2 py-2 rounded-md text-sm text-[#111c2d] hover:bg-[#f9f9ff]"
                >
                  Dashboard
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto" id="workspace-scroll-container" data-workspace-scroll="true">
          <Outlet />
        </main>
      </div>
    </div>
  );
}


