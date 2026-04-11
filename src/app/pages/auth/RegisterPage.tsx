import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router';
import { Mail, Lock, User, AlertCircle, CheckCircle2, Loader2, Eye, EyeOff, FileCode, Check } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';

// ── Password strength ──────────────────────────────────────────────────────────
type StrengthLevel = 'empty' | 'weak' | 'fair' | 'strong';

function getStrength(pw: string): StrengthLevel {
  if (!pw) return 'empty';
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return 'weak';
  if (score <= 3) return 'fair';
  return 'strong';
}

const STRENGTH_META: Record<StrengthLevel, { label: string; color: string; bars: number }> = {
  empty:  { label: '',       color: 'bg-border',      bars: 0 },
  weak:   { label: 'Weak',   color: 'bg-destructive', bars: 1 },
  fair:   { label: 'Fair',   color: 'bg-yellow-500',  bars: 2 },
  strong: { label: 'Strong', color: 'bg-green-500',   bars: 3 },
};

// ── Component ──────────────────────────────────────────────────────────────────
export function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  const { register } = useAuth();

  const strength = useMemo(() => getStrength(password), [password]);
  const strengthMeta = STRENGTH_META[strength];

  const validateForm = () => {
    if (!name.trim()) { setError('Name is required'); return false; }
    if (!email.trim() || !email.includes('@')) { setError('Please enter a valid email address'); return false; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return false; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return false; }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validateForm()) return;
    setLoading(true);
    const response = await register(email, password, name);
    if (response.success) {
      setSuccess(true);
      setTimeout(() => navigate('/auth/verify-email', { state: { email } }), 2000);
    } else {
      setError(response.error || 'Registration failed. Please try again.');
    }
    setLoading(false);
  };

  // Shared password input class — mirrors login page exactly
  const pwInputCls = 'w-full pl-9 pr-10 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm h-12 transition-all duration-200';

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Navbar — identical to login */}
      <header className="h-16 bg-card border-b border-border flex items-center px-6 shrink-0 z-10">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <FileCode className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-foreground text-lg">AssessmentCore</span>
        </Link>
        <div className="ml-auto flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">Already have an account?</span>
          <Link to="/auth/login">
            <Button variant="outline" size="sm" className="border-[#2457b8] text-[#2457b8] hover:bg-[#eef4ff]">
              Sign In
            </Button>
          </Link>
        </div>
      </header>

      {/* Main — same structure as login */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 relative overflow-hidden">

        {/* Background — identical to login */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-lighter via-primary-lighter/80 to-background" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
            backgroundSize: '28px 28px',
          }}
        />
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.055]"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L0,6 L6,3 z" fill="currentColor" />
            </marker>
          </defs>
          <circle cx="8%" cy="30%" r="5" fill="currentColor" />
          <circle cx="8%" cy="50%" r="5" fill="currentColor" />
          <circle cx="8%" cy="70%" r="5" fill="currentColor" />
          <circle cx="14%" cy="40%" r="3" fill="currentColor" />
          <circle cx="14%" cy="60%" r="3" fill="currentColor" />
          <line x1="8%"  y1="30%" x2="22%" y2="50%" stroke="currentColor" strokeWidth="1" />
          <line x1="8%"  y1="50%" x2="22%" y2="50%" stroke="currentColor" strokeWidth="1" />
          <line x1="8%"  y1="70%" x2="22%" y2="50%" stroke="currentColor" strokeWidth="1" />
          <line x1="14%" y1="40%" x2="22%" y2="50%" stroke="currentColor" strokeWidth="0.6" />
          <line x1="14%" y1="60%" x2="22%" y2="50%" stroke="currentColor" strokeWidth="0.6" />
          <circle cx="22%" cy="50%" r="9" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="22%" cy="50%" r="4" fill="currentColor" />
          <line x1="22%" y1="50%" x2="50%" y2="50%" stroke="currentColor" strokeWidth="1.2" markerEnd="url(#arr)" strokeDasharray="4 3" />
          <circle cx="33%" cy="38%" r="3" fill="currentColor" />
          <circle cx="40%" cy="62%" r="3" fill="currentColor" />
          <line x1="33%" y1="38%" x2="50%" y2="50%" stroke="currentColor" strokeWidth="0.6" />
          <line x1="40%" y1="62%" x2="50%" y2="50%" stroke="currentColor" strokeWidth="0.6" />
          <circle cx="50%" cy="50%" r="12" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="50%" cy="50%" r="6"  fill="currentColor" />
          <circle cx="50%" cy="50%" r="18" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 5" />
          <line x1="50%" y1="50%" x2="78%" y2="50%" stroke="currentColor" strokeWidth="1.2" markerEnd="url(#arr)" strokeDasharray="4 3" />
          <circle cx="62%" cy="36%" r="3" fill="currentColor" />
          <circle cx="68%" cy="64%" r="3" fill="currentColor" />
          <line x1="62%" y1="36%" x2="78%" y2="50%" stroke="currentColor" strokeWidth="0.6" />
          <line x1="68%" y1="64%" x2="78%" y2="50%" stroke="currentColor" strokeWidth="0.6" />
          <circle cx="78%" cy="50%" r="9" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="78%" cy="50%" r="4" fill="currentColor" />
          <circle cx="86%" cy="38%" r="4" fill="currentColor" />
          <circle cx="86%" cy="50%" r="4" fill="currentColor" />
          <circle cx="86%" cy="62%" r="4" fill="currentColor" />
          <circle cx="92%" cy="32%" r="3" fill="currentColor" />
          <circle cx="92%" cy="68%" r="3" fill="currentColor" />
          <line x1="78%" y1="50%" x2="86%" y2="38%" stroke="currentColor" strokeWidth="1" />
          <line x1="78%" y1="50%" x2="86%" y2="50%" stroke="currentColor" strokeWidth="1" />
          <line x1="78%" y1="50%" x2="86%" y2="62%" stroke="currentColor" strokeWidth="1" />
          <line x1="86%" y1="38%" x2="92%" y2="32%" stroke="currentColor" strokeWidth="0.6" />
          <line x1="86%" y1="62%" x2="92%" y2="68%" stroke="currentColor" strokeWidth="0.6" />
          {[18, 28, 38, 62, 72, 82].map((x) => (
            <line key={x} x1={`${x}%`} y1="10%" x2={`${x}%`} y2="90%" stroke="currentColor" strokeWidth="0.4" strokeDasharray="2 8" />
          ))}
        </svg>

        {/* Card wrapper — wider than login to house 2-col form */}
        <div className="relative z-10 w-full max-w-2xl flex flex-col items-center">

          {/* Card — same shadow, rounding, backdrop as login */}
          <div className="w-full bg-card rounded-2xl border border-border/60 shadow-[0_8px_40px_-8px_rgba(0,0,0,0.18)] p-8 space-y-6 backdrop-blur-sm">

            {/* Heading — same size/weight as login's "Welcome Back" */}
            <div>
              <h1 className="text-3xl font-bold text-foreground">Create Account</h1>
              <p className="text-muted-foreground mt-1.5 text-sm">
                Start fixing your question bank — upload, auto-fix issues, and export to LMS-ready QTI &amp; JSON.
              </p>
            </div>

            {/* Alerts */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Account created! Redirecting to email verification…
                </AlertDescription>
              </Alert>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Row 1: Name + Email — same label/input sizing as login */}
              <div className="grid grid-cols-2 gap-5">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <label htmlFor="name" className="text-sm font-medium text-foreground">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      placeholder="Jane Smith"
                      value={name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                      className="pl-9 bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20 h-12 transition-all duration-200"
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Work Email */}
                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-sm font-medium text-foreground">
                    Work Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@school.edu"
                      value={email}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                      className="pl-9 bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20 h-12 transition-all duration-200"
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

              {/* Row 2: Password + Confirm */}
              <div className="grid grid-cols-2 gap-5">
                {/* Password */}
                <div className="space-y-1.5">
                  <label htmlFor="password" className="text-sm font-medium text-foreground">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                      className={pwInputCls}
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {/* Strength indicator */}
                  {password.length > 0 && (
                    <div className="flex items-center gap-2 pt-0.5">
                      <div className="flex gap-1 flex-1">
                        {[0, 1, 2].map((i) => (
                          <div
                            key={i}
                            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                              i < strengthMeta.bars ? strengthMeta.color : 'bg-border'
                            }`}
                          />
                        ))}
                      </div>
                      <span className={`text-xs font-medium ${
                        strength === 'weak'   ? 'text-destructive' :
                        strength === 'fair'   ? 'text-yellow-600'  :
                        strength === 'strong' ? 'text-green-600'   : ''
                      }`}>
                        {strengthMeta.label}
                      </span>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      className={pwInputCls}
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {/* Match indicator — appears at same height as strength bar */}
                  {confirmPassword.length > 0 && (
                    <p className={`text-xs font-medium pt-0.5 ${
                      password === confirmPassword ? 'text-green-600' : 'text-destructive'
                    }`}>
                      {password === confirmPassword ? '✓ Passwords match' : 'Passwords don\'t match'}
                    </p>
                  )}
                </div>
              </div>

              {/* CTA — same height/style as login */}
              <Button
                type="submit"
                className="w-full bg-[#2457b8] hover:bg-[#1f4aa0] text-white font-semibold h-12 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                disabled={loading || success}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Account…
                  </>
                ) : (
                  'Create Account & Start Processing'
                )}
              </Button>
            </form>

            {/* Sign in link — same style as login's "New here?" */}
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to="/auth/login" className="text-primary hover:underline font-medium transition-colors">
                Sign in
              </Link>
            </p>
          </div>

          {/* Value + trust strip — below card, same style as login's strip */}
          <div className="mt-5 flex items-center justify-center gap-5 flex-wrap">
            {[
              'Auto-fixes messy data',
              'LMS-ready export',
              'No credit card required',
              'Your data is private',
            ].map((text) => (
              <span key={text} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                {text}
              </span>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
