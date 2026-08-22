import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router";
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
} from "lucide-react";
import { useAuth } from "../../../contexts/AuthContext";
import { AuthScaffold } from "./AuthScaffold";

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 30;

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  const isWorkspaceSubdomain =
    typeof window !== "undefined" &&
    window.location.hostname.startsWith("workspace.");

  // ── Rate-limiting state ───────────────────────────────────────────────
  const failCountRef = useRef(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [lockCountdown, setLockCountdown] = useState(0);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/workspace", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Countdown timer for lockout display
  useEffect(() => {
    if (!lockedUntil) return;
    const tick = () => {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setLockedUntil(null);
        setLockCountdown(0);
      } else {
        setLockCountdown(remaining);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lockedUntil]);

  const isLocked = lockedUntil !== null && Date.now() < lockedUntil;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (isLocked) {
      setError(`Too many attempts. Try again in ${lockCountdown}s.`);
      return;
    }

    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }
    if (!password) {
      setError("Password is required");
      return;
    }

    setLoading(true);
    const response = await login(email, password);
    if (response.success) {
      failCountRef.current = 0;
      navigate("/workspace", { replace: true });
    } else {
      failCountRef.current += 1;
      if (failCountRef.current >= MAX_ATTEMPTS) {
        const until = Date.now() + LOCKOUT_SECONDS * 1000;
        setLockedUntil(until);
        failCountRef.current = 0;
        setError(`Too many failed attempts. Locked for ${LOCKOUT_SECONDS}s.`);
      } else {
        const remaining = MAX_ATTEMPTS - failCountRef.current;
        setError(
          `${response.error || "Login failed."} ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`,
        );
      }
    }
    setLoading(false);
  };

  return (
    <AuthScaffold
      title="Welcome back"
      subtitle="Sign in to your workspace to continue your assessment pipeline."
      footer={
        !isWorkspaceSubdomain ? (
          <>
            New here?{" "}
            <Link
              to="/auth/register"
              className="font-medium text-foreground/80 hover:text-foreground"
            >
              Create an account
            </Link>
          </>
        ) : null
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {error ? (
          <div className="flex items-center gap-2 rounded-md border border-destructive/20 bg-destructive-light px-3 py-2 text-xs text-destructive">
            <AlertCircle className="h-3.5 w-3.5" />
            {error}
          </div>
        ) : null}

        <label className="block text-xs font-medium text-muted-foreground">
          Email
          <div className="relative mt-1.5">
            <Mail className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/50" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@school.edu"
              autoComplete="email"
              className="h-10 w-full rounded-md border border-border bg-card pl-9 pr-3 text-sm outline-none transition focus:border-chart-1"
              disabled={loading || isLocked}
            />
          </div>
        </label>

        <label className="block text-xs font-medium text-muted-foreground">
          <div className="mb-1.5 flex items-center justify-between">
            <span>Password</span>
            {!isWorkspaceSubdomain && (
              <Link
                to="/auth/forgot-password"
                className="text-[11px] font-normal text-muted-foreground hover:text-foreground"
              >
                Forgot?
              </Link>
            )}
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/50" />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              className="h-10 w-full rounded-md border border-border bg-card pl-9 pr-14 text-sm outline-none transition focus:border-chart-1"
              disabled={loading || isLocked}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-2 top-1.5 inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition hover:text-foreground"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              disabled={loading || isLocked}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </label>

        <button
          type="submit"
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-medium text-primary-foreground disabled:opacity-60 hover:bg-primary/90 transition-colors"
          disabled={loading || isLocked}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Signing in...
            </>
          ) : isLocked ? (
            `Locked — ${lockCountdown}s`
          ) : (
            <>
              Sign in <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>
    </AuthScaffold>
  );
}
