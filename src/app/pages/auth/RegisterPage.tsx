import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router";
import { AlertCircle, ArrowRight, Eye, EyeOff, Loader2, Lock, Mail, User } from "lucide-react";
import { useAuth } from "../../../contexts/AuthContext";
import { AuthScaffold } from "./AuthScaffold";
import { validatePasswordStrength, getStrengthColor, getStrengthWidth } from "../../utils/passwordValidator";

export function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { register } = useAuth();

  const passwordCheck = useMemo(() => validatePasswordStrength(password), [password]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) return setError("Name is required");
    if (!email.trim() || !email.includes("@")) return setError("Please enter a valid email address");
    if (!passwordCheck.valid) return setError(passwordCheck.error);
    if (password !== confirmPassword) return setError("Passwords do not match");

    setLoading(true);
    const response = await register(email, password, name);
    if (response.success) {
      navigate("/auth/verify-email", { state: { email } });
    } else {
      setError(response.error || "Registration failed. Please try again.");
    }
    setLoading(false);
  };

  return (
    <AuthScaffold
      title="Create an account"
      subtitle="Deploy your first question bank today."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/auth/login" className="font-medium text-foreground/80 hover:text-foreground">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {error ? (
          <div className="flex items-center gap-2 rounded-md border border-destructive/20 bg-destructive-light px-3 py-2 text-xs text-destructive">
            <AlertCircle className="h-3.5 w-3.5" />
            {error}
          </div>
        ) : null}

        <div className="grid gap-4">
          <label className="block text-xs font-medium text-muted-foreground">
            Full name
            <div className="relative mt-1.5">
              <User className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/50" />
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Educator"
                autoComplete="name"
                className="h-10 w-full rounded-md border border-border bg-card pl-9 pr-3 text-sm outline-none transition focus:border-chart-1"
                disabled={loading}
              />
            </div>
          </label>

          <label className="block text-xs font-medium text-muted-foreground">
            Work email
            <div className="relative mt-1.5">
              <Mail className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/50" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@school.edu"
                autoComplete="email"
                className="h-10 w-full rounded-md border border-border bg-card pl-9 pr-3 text-sm outline-none transition focus:border-chart-1"
                disabled={loading}
              />
            </div>
          </label>
        </div>

        <div className="grid gap-4">
          <label className="block text-xs font-medium text-slate-600">
            Password
            <div className="relative mt-1.5">
              <Lock className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                className="h-10 w-full rounded-md border border-border bg-card pl-9 pr-14 text-sm outline-none transition focus:border-chart-1"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-2 top-1.5 inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                disabled={loading}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {password.length > 0 && (
              <div className="mt-1.5 space-y-1">
                <div className="h-1 w-full rounded-full bg-muted">
                  <div className={`h-full rounded-full transition-all duration-300 ${getStrengthColor(passwordCheck.strength)} ${getStrengthWidth(passwordCheck.strength)}`} />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {passwordCheck.valid ? `Strength: ${passwordCheck.strength}` : passwordCheck.error}
                </p>
              </div>
            )}
          </label>

          <label className="block text-xs font-medium text-muted-foreground">
            Confirm password
            <div className="relative mt-1.5">
              <Lock className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/50" />
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                autoComplete="new-password"
                className="h-10 w-full rounded-md border border-border bg-card pl-9 pr-14 text-sm outline-none transition focus:border-chart-1"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute right-2 top-1.5 inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition hover:text-foreground"
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                aria-pressed={showConfirmPassword}
                disabled={loading}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>
        </div>

        <button
          type="submit"
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-medium text-primary-foreground disabled:opacity-60 hover:bg-primary/90 transition-colors"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Creating account...
            </>
          ) : (
            <>
              Create account <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>
    </AuthScaffold>
  );
}
