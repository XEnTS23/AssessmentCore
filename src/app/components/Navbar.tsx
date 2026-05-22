import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import { useLocation } from "react-router";
import { useAuth } from "../../contexts/AuthContext";
import { ProfileMenu } from "./ProfileMenu";

export function Navbar() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  const navLinkClass = (path: string) => {
    const isActive = location.pathname === path || location.pathname.startsWith(`${path}/`);
    return `transition-colors focus:outline-none focus-visible:outline-none ${isActive ? 'text-foreground border-b-2 border-foreground pb-0.5' : 'text-muted-foreground hover:text-foreground'}`;
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur transition-colors duration-200">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-6 pl-6 pr-2">
        <div className="flex items-center gap-2">
          <img src={'/AC_logo.png'} alt="AssessmentCore logo" className="h-7 w-7 rounded-md object-contain" />
          <Link to="/" className="text-sm font-semibold text-foreground hover:text-primary transition-colors">
            AssessmentCore
          </Link>
          <span className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground hidden sm:inline-block">v1.0</span>
        </div>
        
        <div className="flex items-center gap-6">
          <nav className="hidden md:flex items-center gap-4 text-sm font-medium text-muted-foreground">
            <Link to="/solutions" className={navLinkClass('/solutions')}>Solutions</Link>
            <Link to="/services" className={navLinkClass('/services')}>Services</Link>
            <Link to="/resources" className={navLinkClass('/resources')}>Resources</Link>
            <Link to="/pricing" className={navLinkClass('/pricing')}>Pricing</Link>
            <Link to="/company" className={navLinkClass('/company')}>Company</Link>
            <Link to="/contact" className={navLinkClass('/contact')}>Contact</Link>
          </nav>
          
          <div className="ml-auto flex items-center gap-3 border-l border-border pl-6">
            {!isAuthenticated && (
              <Link to="/auth/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Log in
              </Link>
            )}
            {isAuthenticated ? (
              <ProfileMenu variant="navbar" />
            ) : (
              <Link
                to="/auth/register"
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Sign Up
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
