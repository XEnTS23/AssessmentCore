import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { AlertCircle, CheckCircle2, Loader2, Mail } from "lucide-react";
import { useAuth } from "../../../contexts/AuthContext";
import { AuthScaffold } from "./AuthScaffold";

export function VerifyEmailPage() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const navigate = useNavigate();
  const location = useLocation();
  const { verifyEmail, resendVerificationEmail } = useAuth();
  const email = (location.state as { email?: string } | null)?.email || "";

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const onVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (code.length !== 6) {
      setError("Please enter a valid 6-digit code");
      return;
    }
    setLoading(true);
    const response = await verifyEmail(email, code);
    if (response.success) {
      setSuccess(true);
      setTimeout(() => navigate("/workspace", { replace: true }), 1200);
    } else {
      setError(response.error || "Verification failed. Please try again.");
    }
    setLoading(false);
  };

  const onResend = async () => {
    setError("");
    setResendLoading(true);
    const response = await resendVerificationEmail(email);
    if (response.success) {
      setResendCooldown(60);
    } else {
      setError(response.error || "Failed to resend code. Please try again.");
    }
    setResendLoading(false);
  };

  if (!email) {
    return (
      <AuthScaffold title="Verification required" subtitle="Email was not provided for this step.">
        <Link to="/auth/register" className="inline-flex h-10 items-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white">
          Back to register
        </Link>
      </AuthScaffold>
    );
  }

  return (
    <AuthScaffold
      title="Check your email"
      subtitle={
        <>
          We sent a 6-digit code to <span className="font-medium text-slate-800">{email}</span>. It expires in 10 minutes.
        </>
      }
      footer={
        <>
          Use a different email?{" "}
          <Link to="/auth/register" className="font-medium text-slate-700 hover:text-slate-900">
            Back to register
          </Link>
        </>
      }
    >
      <form onSubmit={onVerify} className="space-y-4">
        {error ? (
          <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            <AlertCircle className="h-3.5 w-3.5" />
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Email verified. Redirecting to workspace...
          </div>
        ) : null}

        <label className="block text-xs font-medium text-slate-600">
          Verification code
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className="mt-1.5 h-12 w-full rounded-md border border-slate-300 bg-card px-3 text-center font-mono text-lg tracking-[0.35em] outline-none transition focus:border-border"
            placeholder="000000"
            disabled={loading}
          />
        </label>

        <button
          type="submit"
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-slate-900 text-sm font-medium text-white disabled:opacity-60"
          disabled={loading || code.length !== 6}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Verifying...
            </>
          ) : (
            "Verify email"
          )}
        </button>

        <button
          type="button"
          onClick={onResend}
          disabled={resendLoading || resendCooldown > 0}
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-card text-sm text-slate-700 disabled:opacity-60"
        >
          {resendLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Sending...
            </>
          ) : resendCooldown > 0 ? (
            `Resend in ${resendCooldown}s`
          ) : (
            <>
              <Mail className="h-4 w-4" /> Resend code
            </>
          )}
        </button>
      </form>
    </AuthScaffold>
  );
}
