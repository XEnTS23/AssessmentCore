import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { AlertCircle, CheckCircle2, Loader2, Lock } from "lucide-react";
import { useAuth } from "../../../contexts/AuthContext";
import { AuthScaffold } from "./AuthScaffold";
import { validatePasswordStrength, getStrengthColor, getStrengthWidth } from "../../utils/passwordValidator";

export function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const { updatePassword } = useAuth();

  const passwordCheck = useMemo(() => validatePasswordStrength(password), [password]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!passwordCheck.valid) {
      setError(passwordCheck.error);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    const response = await updatePassword(password);
    if (response.success) {
      setSuccess(true);
      setTimeout(() => navigate("/auth/login", { replace: true }), 1500);
    } else {
      setError(response.error || "Failed to update password. Please try again.");
    }
    setLoading(false);
  };

  return (
    <AuthScaffold title="Set new password" subtitle="Choose a strong password to secure your account.">
      {success ? (
        <div className="flex items-center gap-2 rounded-md border border-success/20 bg-success-light px-3 py-2 text-xs text-success">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Password updated. Redirecting to sign in...
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          {error ? (
            <div className="flex items-center gap-2 rounded-md border border-destructive/20 bg-destructive-light px-3 py-2 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5" />
              {error}
            </div>
          ) : null}

          <label className="block text-xs font-medium text-muted-foreground">
            New password
            <div className="relative mt-1.5">
              <Lock className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/50" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10 w-full rounded-md border border-border bg-card pl-9 pr-3 text-sm outline-none transition focus:border-chart-1"
                placeholder="At least 8 characters"
                autoComplete="new-password"
                disabled={loading}
              />
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
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-10 w-full rounded-md border border-border bg-card pl-9 pr-3 text-sm outline-none transition focus:border-chart-1"
                placeholder="Confirm password"
                autoComplete="new-password"
                disabled={loading}
              />
            </div>
          </label>

          <button
            type="submit"
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-medium text-primary-foreground disabled:opacity-60 hover:bg-primary/90 transition-colors"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Updating...
              </>
            ) : (
              "Update password"
            )}
          </button>
        </form>
      )}
    </AuthScaffold>
  );
}
