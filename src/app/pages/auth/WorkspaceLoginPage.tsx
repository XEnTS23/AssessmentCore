import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { AlertCircle, ArrowRight, Eye, EyeOff, Loader2, Lock, Mail, CheckCircle2 } from "lucide-react";
import { useAuth } from "../../../contexts/AuthContext";

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
        setError(`Locked for ${LOCKOUT_SECONDS}s.`);
      } else {
        const remaining = MAX_ATTEMPTS - failCountRef.current;
        setError(`${response.error || "Login failed."} ${remaining} attempt(s) left.`);
      }
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen w-full bg-white font-sans text-slate-900">
      {/* Left Pane - Abstract Premium Visual */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-slate-950 items-center justify-center">
        {/* Gradient Mesh Background */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full bg-blue-600/30 blur-[120px] mix-blend-screen" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-purple-600/30 blur-[120px] mix-blend-screen" />
          <div className="absolute top-[20%] right-[10%] w-[40%] h-[40%] rounded-full bg-emerald-500/20 blur-[100px] mix-blend-screen" />
        </div>
        
        {/* Glassmorphic Element */}
        <div className="relative z-10 p-12 max-w-lg">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-10 backdrop-blur-2xl shadow-2xl">
            <div className="flex items-center gap-4 mb-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <h2 className="text-3xl font-bold text-white tracking-tight">AssessmentCore</h2>
            </div>
            <h1 className="text-4xl font-extrabold text-white leading-tight mb-6">
              The premier platform for assessment generation.
            </h1>
            <p className="text-slate-300 text-lg leading-relaxed">
              Access your secure internal workspace to process OCR documents, build test batches, and export to QTI seamlessly.
            </p>
          </div>
        </div>
      </div>

      {/* Right Pane - Clean Login Form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8 sm:p-12 lg:p-24 bg-white relative z-10">
        <div className="w-full max-w-sm">
          <div className="mb-12 lg:hidden flex items-center gap-3">
            <img src="/AC_logo.png" alt="Logo" className="h-10 w-10" />
            <span className="font-bold text-2xl tracking-tight">AssessmentCore</span>
          </div>

          <h2 className="text-3xl font-bold tracking-tight text-slate-900 mb-3">Welcome back</h2>
          <p className="text-slate-500 text-base mb-10">
            Sign in to access your secure workspace.
          </p>

          <form onSubmit={onSubmit} className="space-y-6">
            {error && (
              <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 shadow-sm">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 ml-1">Email Address</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@school.edu"
                  autoComplete="email"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm text-slate-900 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  disabled={loading || isLocked}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 ml-1">Password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-12 text-sm text-slate-900 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  disabled={loading || isLocked}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || isLocked}
              className="mt-8 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition-all hover:bg-slate-800 hover:shadow-xl hover:shadow-slate-900/30 disabled:opacity-70 disabled:hover:shadow-none"
            >
              {loading ? (
                <><Loader2 className="h-5 w-5 animate-spin" /> Signing in...</>
              ) : isLocked ? (
                `Locked — ${lockCountdown}s`
              ) : (
                <>Sign In <ArrowRight className="h-5 w-5" /></>
              )}
            </button>
          </form>

          <div className="mt-10 border-t border-slate-100 pt-6 text-center">
            <p className="text-xs text-slate-400">
              For internal use only. Contact your administrator if you need access.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
