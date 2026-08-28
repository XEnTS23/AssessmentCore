import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { AlertCircle, ArrowRight, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { useAuth } from "../../../contexts/AuthContext";
import "./WorkspaceLoginPage.css";

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 30;

export function WorkspaceLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  const failCountRef = useRef(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [lockCountdown, setLockCountdown] = useState(0);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/workspace", { replace: true });
    }
  }, [isAuthenticated, navigate]);

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

    if (!email.trim()) {
      setError("Please enter a valid employee ID or email");
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
        setError(`Locked for ${LOCKOUT_SECONDS}s.`);
      } else {
        const remaining = MAX_ATTEMPTS - failCountRef.current;
        setError(`${response.error || "Login failed."} ${remaining} attempt(s) left.`);
      }
    }
    setLoading(false);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[linear-gradient(110deg,#f9fbff_0%,#f8fbff_48%,#eef6ff_100%)] font-sans text-slate-900">
      
      {/* Decorative background shapes */}
      <div className="wlp-shape wlp-shape-1"></div>
      <div className="wlp-shape wlp-shape-2"></div>
      <div className="wlp-shape wlp-shape-3"></div>
      <div className="wlp-dot-pattern"></div>

      {/* Office illustration */}
      <div className="wlp-office" aria-hidden="true">
        <div className="wlp-window"></div>
        <div className="wlp-building wlp-b1"></div>
        <div className="wlp-building wlp-b2"></div>
        <div className="wlp-building wlp-b3"></div>
        <div className="wlp-building wlp-b4"></div>
        <div className="wlp-lamp-wire"></div>
        <div className="wlp-lamp"></div>
        <div className="wlp-wall-picture"></div>
        <div className="wlp-desk"></div>
        <div className="wlp-chair wlp-chair-left"></div>
        <div className="wlp-chair wlp-chair-right"></div>
        
        <div className="wlp-person wlp-person-one">
          <div className="wlp-head"></div>
          <div className="wlp-hair"></div>
          <div className="wlp-body"></div>
        </div>
        
        <div className="wlp-person wlp-person-two">
          <div className="wlp-head"></div>
          <div className="wlp-hair"></div>
          <div className="wlp-body"></div>
        </div>
        
        <div className="wlp-person wlp-person-three">
          <div className="wlp-head"></div>
          <div className="wlp-hair"></div>
          <div className="wlp-body"></div>
          <div className="wlp-legs"></div>
          <div className="wlp-tablet"></div>
        </div>
        
        <div className="wlp-plant-pot"></div>
        <div className="wlp-leaf wlp-leaf-1"></div>
        <div className="wlp-leaf wlp-leaf-2"></div>
        <div className="wlp-leaf wlp-leaf-3"></div>
      </div>

      {/* Login Card */}
      <section className="relative z-10 w-full max-w-[460px] mx-5 py-10 px-8 sm:py-11 sm:px-12 bg-white/96 backdrop-blur-md border border-slate-200/65 rounded-2xl shadow-[0_22px_55px_rgba(18,46,83,0.13),0_6px_18px_rgba(18,46,83,0.06)]">
        
        <div className="flex items-center justify-center gap-3 mb-5">
          <img src="/AC_logo.png" alt="Logo" className="h-9 w-9" />
          <div className="text-xl font-extrabold tracking-tight text-slate-900">
            AssessmentCore
          </div>
        </div>

        <p className="text-center text-sm sm:text-[15px] text-slate-500 mb-7">
          Sign in to access your secure workspace
        </p>

        <form onSubmit={onSubmit}>
          {error && (
            <div className="flex items-center gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-[13px] text-red-600 mb-5">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="mb-5">
            <label htmlFor="employee" className="block text-[13px] font-semibold text-slate-700 mb-1.5">
              Employee ID or Email
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-slate-400" />
              <input
                id="employee"
                name="employee"
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your employee ID or email"
                autoComplete="username"
                className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3.5 text-sm text-slate-900 outline-none transition-all focus:border-slate-400 focus:ring-3 focus:ring-slate-100 placeholder:text-slate-400"
                disabled={loading || isLocked}
                required
              />
            </div>
          </div>

          <div className="mb-4">
            <label htmlFor="password" className="block text-[13px] font-semibold text-slate-700 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-slate-400" />
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-11 text-sm text-slate-900 outline-none transition-all focus:border-slate-400 focus:ring-3 focus:ring-slate-100 placeholder:text-slate-400"
                disabled={loading || isLocked}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1 rounded hover:bg-slate-50"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
              </button>
            </div>
          </div>

          <div className="flex items-center text-[13px] mb-6">
            <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600">
              <input 
                type="checkbox" 
                name="remember" 
                className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer" 
              />
              <span>Remember me</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading || isLocked}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-900 text-sm font-semibold text-white shadow-md shadow-slate-900/15 transition-all hover:bg-slate-800 hover:-translate-y-px hover:shadow-lg hover:shadow-slate-900/20 disabled:opacity-70 disabled:hover:shadow-none disabled:hover:translate-y-0 active:translate-y-px"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Signing in...</>
            ) : isLocked ? (
              `Locked — ${lockCountdown}s`
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <div className="h-px bg-slate-100 w-full my-5"></div>

        <div className="flex items-center justify-center gap-1.5 text-[13px] text-slate-500">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
            <path d="M4 14v-2a8 8 0 0 1 16 0v2"></path>
            <path d="M4 14h3v6H5a1 1 0 0 1-1-1v-5Z"></path>
            <path d="M20 14h-3v6h2a1 1 0 0 0 1-1v-5Z"></path>
          </svg>
          <span>Need help?</span>
          <a href="#" className="font-medium text-slate-900 hover:underline">
            Contact IT support
          </a>
        </div>

      </section>
    </div>
  );
}
