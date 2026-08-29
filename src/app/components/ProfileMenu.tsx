import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../contexts/AuthContext";

interface ProfileMenuProps {
  variant?: "navbar" | "workspace";
}

export function ProfileMenu({ variant = "workspace" }: ProfileMenuProps) {
  const { user, userUsage, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const isPremium = !!userUsage?.is_premium;

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  if (!user) return null;

  const initials = (user.email || "U").slice(0, 1).toUpperCase();
  const compact = variant === "navbar";

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center justify-center transition-colors hover:bg-accent ${compact ? "h-9 w-9" : "h-8 w-8"} ${isPremium ? "rounded-md bg-gradient-to-br from-[#4285F4] via-[#34A853] via-[#FBBC05] to-[#EA4335] p-[2px] shadow-[0_0_0_1px_rgba(66,133,244,0.15),0_8px_20px_rgba(66,133,244,0.12)]" : "rounded-md border border-border bg-card"}`}
        aria-expanded={isOpen}
      >
        <div
          className={`flex items-center justify-center ${isPremium ? "rounded-sm bg-black text-white shadow-inner" : "rounded-md bg-primary text-primary-foreground"} text-[11px] font-semibold ${compact ? "h-7 w-7" : "h-6 w-6"}`}
        >
          {initials}
        </div>
      </button>

      <div
        className={`absolute right-0 mt-1.5 w-44 rounded-md border border-border bg-card p-1 shadow-lg transition z-50 ${
          isOpen ? "visible opacity-100" : "invisible opacity-0"
        }`}
      >
        {variant === "workspace" && (
          <>
            <Link
              to="/workspace"
              className="block rounded px-2 py-1.5 text-xs text-popover-foreground hover:bg-muted"
              onClick={() => setIsOpen(false)}
            >
              Workspace
            </Link>
            <Link
              to="/workspace/dashboard"
              className="block rounded px-2 py-1.5 text-xs text-popover-foreground hover:bg-muted"
              onClick={() => setIsOpen(false)}
            >
              Dashboard
            </Link>
          </>
        )}
        <button
          type="button"
          className="w-full rounded px-2 py-1.5 text-left text-xs text-popover-foreground hover:bg-muted"
          onClick={() => {
            setIsOpen(false);
            toast.info("Profile management coming soon");
          }}
        >
          Profile
        </button>
        <button
          type="button"
          className="mt-1 w-full rounded px-2 py-1.5 text-left text-xs text-destructive hover:bg-destructive/10"
          onClick={async () => {
            setIsOpen(false);
            const response = await logout();
            if (response.success) {
              navigate("/auth/login");
            } else {
              toast.error(response.error || "Failed to log out");
            }
          }}
        >
          Logout
        </button>
      </div>
    </div>
  );
}
