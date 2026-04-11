import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Mail, Lock, AlertCircle, Loader2, Eye, EyeOff, FileCode, Check } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/workspace');
    }
  }, [isAuthenticated, navigate]);

  const validateForm = () => {
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address');
      return false;
    }
    if (!password) {
      setError('Password is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validateForm()) return;
    setLoading(true);
    const response = await login(email, password);
    if (response.success) {
      navigate('/workspace', { replace: true });
    } else {
      setError(response.error || 'Login failed. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Navbar */}
      <header className="h-16 bg-card border-b border-border flex items-center px-6 shrink-0 z-10">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <FileCode className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-foreground text-lg">AssessmentCore</span>
        </Link>
        <div className="ml-auto flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">Don't have an account?</span>
          <Link to="/auth/register">
            <Button variant="outline" size="sm" className="border-primary text-primary hover:bg-accent">
              Register Free
            </Button>
          </Link>
        </div>
      </header>

      {/* Main area */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 relative overflow-hidden">

        {/* ── Background layer ── */}
        {/* Base gradient — matches home hero */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-lighter via-primary-lighter/80 to-background" />

        {/* Dot grid */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
            backgroundSize: '28px 28px',
          }}
        />

        {/* Abstract pipeline SVG — upload → process → export flow */}
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.055]"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L0,6 L6,3 z" fill="currentColor" />
            </marker>
          </defs>

          {/* Left cluster — raw data nodes */}
          <circle cx="8%" cy="30%" r="5" fill="currentColor" />
          <circle cx="8%" cy="50%" r="5" fill="currentColor" />
          <circle cx="8%" cy="70%" r="5" fill="currentColor" />
          <circle cx="14%" cy="40%" r="3" fill="currentColor" />
          <circle cx="14%" cy="60%" r="3" fill="currentColor" />

          {/* Lines converging from left nodes to first hub */}
          <line x1="8%" y1="30%" x2="22%" y2="50%" stroke="currentColor" strokeWidth="1" />
          <line x1="8%" y1="50%" x2="22%" y2="50%" stroke="currentColor" strokeWidth="1" />
          <line x1="8%" y1="70%" x2="22%" y2="50%" stroke="currentColor" strokeWidth="1" />
          <line x1="14%" y1="40%" x2="22%" y2="50%" stroke="currentColor" strokeWidth="0.6" />
          <line x1="14%" y1="60%" x2="22%" y2="50%" stroke="currentColor" strokeWidth="0.6" />

          {/* Hub 1 — ingest */}
          <circle cx="22%" cy="50%" r="9" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="22%" cy="50%" r="4" fill="currentColor" />

          {/* Pipeline: hub1 → hub2 */}
          <line x1="22%" y1="50%" x2="50%" y2="50%" stroke="currentColor" strokeWidth="1.2" markerEnd="url(#arrow)" strokeDasharray="4 3" />

          {/* Mid decoration nodes */}
          <circle cx="33%" cy="38%" r="3" fill="currentColor" />
          <circle cx="40%" cy="62%" r="3" fill="currentColor" />
          <line x1="33%" y1="38%" x2="50%" y2="50%" stroke="currentColor" strokeWidth="0.6" />
          <line x1="40%" y1="62%" x2="50%" y2="50%" stroke="currentColor" strokeWidth="0.6" />

          {/* Hub 2 — process / validate */}
          <circle cx="50%" cy="50%" r="12" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="50%" cy="50%" r="6" fill="currentColor" />
          {/* Orbit ring */}
          <circle cx="50%" cy="50%" r="18" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 5" />

          {/* Pipeline: hub2 → hub3 */}
          <line x1="50%" y1="50%" x2="78%" y2="50%" stroke="currentColor" strokeWidth="1.2" markerEnd="url(#arrow)" strokeDasharray="4 3" />

          {/* Mid-right decoration nodes */}
          <circle cx="62%" cy="36%" r="3" fill="currentColor" />
          <circle cx="68%" cy="64%" r="3" fill="currentColor" />
          <line x1="62%" y1="36%" x2="78%" y2="50%" stroke="currentColor" strokeWidth="0.6" />
          <line x1="68%" y1="64%" x2="78%" y2="50%" stroke="currentColor" strokeWidth="0.6" />

          {/* Hub 3 — export */}
          <circle cx="78%" cy="50%" r="9" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="78%" cy="50%" r="4" fill="currentColor" />

          {/* Right cluster — output nodes */}
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

          {/* Faint vertical data columns — background texture */}
          {[18, 28, 38, 62, 72, 82].map((x) => (
            <line key={x} x1={`${x}%`} y1="10%" x2={`${x}%`} y2="90%" stroke="currentColor" strokeWidth="0.4" strokeDasharray="2 8" />
          ))}
        </svg>

        {/* ── Login card + value strip ── */}
        <div className="relative z-10 w-full max-w-md flex flex-col items-center">

          {/* Card */}
          <div className="w-full bg-card rounded-2xl border border-border/60 shadow-[0_8px_40px_-8px_rgba(0,0,0,0.18)] p-8 space-y-6 backdrop-blur-sm">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Welcome Back</h1>
              <p className="text-muted-foreground mt-1.5 text-sm">Sign in to your AssessmentCore account</p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
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

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-sm font-medium text-foreground">
                    Password
                  </label>
                  <Link to="/auth/forgot-password" className="text-xs text-primary hover:underline transition-colors">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    className="w-full pl-9 pr-10 py-3 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm h-12 transition-all duration-200"
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
              </div>

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary text-primary-foreground font-semibold h-12 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Continue to Dashboard'
                )}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground">
              New here?{' '}
              <Link to="/auth/register" className="text-primary hover:underline font-medium transition-colors">
                Create a free account
              </Link>
            </p>
          </div>

          {/* Minimal value strip — below card, no box */}
          <div className="mt-5 flex items-center justify-center gap-5 flex-wrap">
            {['Auto-fixes messy data', 'LMS-ready export', 'No manual cleanup'].map((text) => (
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
