import { useState } from "react";
import { Link } from "react-router";
import { AlertCircle, CheckCircle2, Loader2, Mail } from "lucide-react";
import { useAuth } from "../../../contexts/AuthContext";
import { AuthScaffold } from "./AuthScaffold";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const { resetPasswordForEmail } = useAuth();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    const response = await resetPasswordForEmail(email);
    if (response.success) {
      setSuccess(true);
    } else {
      setError(response.error || "Failed to send reset email. Please try again.");
    }
    setLoading(false);
  };

  return (
    <AuthScaffold
      title="Reset your password"
      subtitle="Enter your account email and we will send a password reset link."
      footer={
        <>
          Remembered your password?{" "}
          <Link to="/auth/login" className="font-medium text-foreground/80 hover:text-foreground">
            Back to sign in
          </Link>
        </>
      }
    >
      {success ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-md border border-success/20 bg-success-light px-3 py-2 text-xs text-success">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Reset email sent. Please check your inbox.
          </div>
          <button
            type="button"
            onClick={() => setSuccess(false)}
            className="inline-flex h-10 w-full items-center justify-center rounded-md border border-border bg-card text-sm text-foreground hover:bg-muted transition-colors"
          >
            Send again
          </button>
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
                <Loader2 className="h-4 w-4 animate-spin" /> Sending...
              </>
            ) : (
              "Send reset link"
            )}
          </button>
        </form>
      )}
    </AuthScaffold>
  );
}
