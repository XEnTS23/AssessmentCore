import { useState } from "react";
import { Link, useLocation } from "react-router";
import {
  BookOpen,
  Briefcase,
  ChevronDown,
  Cpu,
  Layers,
  Menu,
  Send,
  Sparkles,
  Users,
  X,
} from "lucide-react";

export function Navbar() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);

  const navLinkClass = (path: string) => {
    const isActive =
      location.pathname === path || (path !== "/" && location.pathname.startsWith(`${path}/`));
    return `text-sm font-medium transition-colors hover:text-foreground ${
      isActive ? "text-foreground font-semibold" : "text-muted-foreground"
    }`;
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-md transition-colors duration-200">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-6">
        {/* Brand Group */}
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 group">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-xs tracking-tight shadow-xs">
              H
            </span>
            <div className="flex flex-col leading-none">
              <span className="text-sm font-semibold tracking-tight text-foreground group-hover:text-primary transition-colors">
                Husimi
              </span>
              <span className="text-xs text-muted-foreground font-normal tracking-tight">
                Solutions
              </span>
            </div>
          </Link>
        </div>

        {/* Right Section: Navigation & Actions */}
        <div className="flex items-center gap-6">
          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-6 text-sm">
            {/* Services Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setServicesOpen(true)}
              onMouseLeave={() => setServicesOpen(false)}
            >
              <Link
                to="/services"
                className={`flex items-center gap-1 py-2 ${navLinkClass("/services")}`}
              >
                Services
                <ChevronDown className="h-3 w-3 opacity-60" />
              </Link>

              {servicesOpen && (
                <div className="absolute right-0 top-full w-64 rounded-lg border border-border bg-popover p-2 shadow-lg animate-in fade-in-50 zoom-in-95">
                  <div className="px-2 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Assessment Content Services
                  </div>
                  <Link
                    to="/services/content-development"
                    onClick={() => setServicesOpen(false)}
                    className={`block rounded-md p-2 transition-colors text-xs ${
                      location.pathname === "/services/content-development"
                        ? "bg-muted font-medium text-primary"
                        : "hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    <div className="font-medium text-foreground">Content Development</div>
                    <div className="text-xs text-muted-foreground">MCQs, STEM items, explanations</div>
                  </Link>
                  <Link
                    to="/services/content-digitization"
                    onClick={() => setServicesOpen(false)}
                    className={`block rounded-md p-2 transition-colors text-xs ${
                      location.pathname === "/services/content-digitization"
                        ? "bg-muted font-medium text-primary"
                        : "hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    <div className="font-medium text-foreground">Content Digitization</div>
                    <div className="text-xs text-muted-foreground">PDFs, Word, scans, handwriting</div>
                  </Link>
                  <Link
                    to="/services#qa-remediation"
                    onClick={() => setServicesOpen(false)}
                    className="block rounded-md p-2 hover:bg-muted transition-colors text-xs"
                  >
                    <div className="font-medium text-foreground">Question Bank QA</div>
                    <div className="text-xs text-muted-foreground">Answer key checks, exception review</div>
                  </Link>
                  <Link
                    to="/services#lms-migration"
                    onClick={() => setServicesOpen(false)}
                    className="block rounded-md p-2 hover:bg-muted transition-colors text-xs"
                  >
                    <div className="font-medium text-foreground">LMS &amp; Migration</div>
                    <div className="text-xs text-muted-foreground">Canvas, Moodle, QTI, JSON</div>
                  </Link>
                </div>
              )}
            </div>

            <Link to="/resources" className={navLinkClass("/resources")}>
              Resources
            </Link>

            <Link to="/company" className={navLinkClass("/company")}>
              About
            </Link>

            <Link to="/contact" className={navLinkClass("/contact")}>
              Contact
            </Link>
          </nav>

          {/* Action Group */}
          <div className="flex items-center gap-2.5">
            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden flex h-8 w-8 items-center justify-center rounded-md border border-border text-foreground hover:bg-muted transition-colors"
              aria-label="Toggle navigation"
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-border bg-background px-6 py-4 space-y-3">
          <div className="space-y-1">
            <div>
              <Link
                to="/services"
                onClick={() => setMobileMenuOpen(false)}
                className={`block rounded-md py-2 px-3 text-sm font-medium ${
                  location.pathname === "/services"
                    ? "bg-muted text-foreground font-semibold"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                Services Overview
              </Link>
              <div className="ml-3 border-l border-border pl-3 my-1 space-y-1">
                <Link
                  to="/services/content-development"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block rounded-md py-1.5 px-2 text-xs font-medium transition-colors ${
                    location.pathname === "/services/content-development"
                      ? "bg-muted text-primary font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  Content Development
                </Link>
                <Link
                  to="/services/content-digitization"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block rounded-md py-1.5 px-2 text-xs font-medium transition-colors ${
                    location.pathname === "/services/content-digitization"
                      ? "bg-muted text-primary font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  Content Digitization
                </Link>
              </div>
            </div>

            <Link
              to="/resources"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-md py-2 px-3 text-sm font-medium text-foreground hover:bg-muted"
            >
              Resources &amp; Library
            </Link>
            <Link
              to="/company"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-md py-2 px-3 text-sm font-medium text-foreground hover:bg-muted"
            >
              About Husimi
            </Link>
            <Link
              to="/contact"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-md py-2 px-3 text-sm font-medium text-foreground hover:bg-muted"
            >
              Contact &amp; Project Scoping
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
