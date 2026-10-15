import { Link } from "react-router";
import {
  Mail,
  MapPin,
  Phone,
  Linkedin,
  Github,
  Globe,
  ExternalLink,
  Facebook,
  Youtube,
  MessageCircle,
} from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border bg-card/60 px-6 py-14 transition-colors duration-200">
      <div className="mx-auto w-full max-w-7xl">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm tracking-tight">
                H
              </span>
              <div className="flex flex-col leading-none">
                <span className="text-base font-semibold tracking-tight text-foreground">
                  Husimi
                </span>
                <span className="text-xs text-muted-foreground font-normal tracking-tight mt-0.5">
                  Solutions
                </span>
              </div>
            </div>

            <p className="mt-3.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Assessment content services &amp; technology. Helping education companies create, digitize, validate, and migrate assessment content from legacy materials to modern platforms.
            </p>

            <div className="mt-4 inline-flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>Assessment Content Services</span>
            </div>

            <div className="mt-5 flex items-center gap-3 text-muted-foreground">
              <a
                href="https://husimisolutions.com"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-xs hover:text-foreground transition-colors"
                title="Husimi Solutions Corporate"
              >
                <Globe className="h-3.5 w-3.5" />
                husimisolutions.com
              </a>
              <span className="text-border">·</span>
              <a
                href="https://husimisolutions.com"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-xs hover:text-foreground transition-colors"
                title="Husimi Technology"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Tech Overview
              </a>
            </div>

            {/* Social Media Channels */}
            <div className="mt-6">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-3">
                Connect With Us
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href="https://www.linkedin.com"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="LinkedIn"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:border-primary/50 hover:bg-muted hover:text-foreground hover:scale-105 transition-all duration-200"
                  title="LinkedIn"
                >
                  <Linkedin className="h-4 w-4" />
                </a>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="GitHub"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:border-primary/50 hover:bg-muted hover:text-foreground hover:scale-105 transition-all duration-200"
                  title="GitHub"
                >
                  <Github className="h-4 w-4" />
                </a>
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="X (Twitter)"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:border-primary/50 hover:bg-muted hover:text-foreground hover:scale-105 transition-all duration-200"
                  title="X (Twitter)"
                >
                  <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
                <a
                  href="https://www.youtube.com"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="YouTube"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:border-primary/50 hover:bg-muted hover:text-foreground hover:scale-105 transition-all duration-200"
                  title="YouTube"
                >
                  <Youtube className="h-4 w-4" />
                </a>
                <a
                  href="https://www.facebook.com"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Facebook"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:border-primary/50 hover:bg-muted hover:text-foreground hover:scale-105 transition-all duration-200"
                  title="Facebook"
                >
                  <Facebook className="h-4 w-4" />
                </a>
                <a
                  href="https://wa.me/919382565942"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="WhatsApp"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:border-primary/50 hover:bg-muted hover:text-foreground hover:scale-105 transition-all duration-200"
                  title="WhatsApp"
                >
                  <MessageCircle className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>

          {/* Services Column */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Services
            </h4>
            <ul className="mt-4 space-y-2.5 text-xs text-muted-foreground">
              <li>
                <Link
                  to="/services#content-development"
                  className="hover:text-foreground transition-colors"
                >
                  Content Development
                </Link>
              </li>
              <li>
                <Link
                  to="/services#digitization"
                  className="hover:text-foreground transition-colors"
                >
                  Content Digitization
                </Link>
              </li>
              <li>
                <Link
                  to="/services#qa-remediation"
                  className="hover:text-foreground transition-colors"
                >
                  Question Bank QA
                </Link>
              </li>
              <li>
                <Link
                  to="/services#lms-migration"
                  className="hover:text-foreground transition-colors"
                >
                  LMS &amp; Assessment Migration
                </Link>
              </li>
            </ul>
          </div>

          {/* Solutions Column */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Solutions
            </h4>
            <ul className="mt-4 space-y-2.5 text-xs text-muted-foreground">
              <li>
                <Link
                  to="/solutions#platforms"
                  className="hover:text-foreground transition-colors"
                >
                  Assessment Platforms
                </Link>
              </li>
              <li>
                <Link
                  to="/solutions#edtech"
                  className="hover:text-foreground transition-colors"
                >
                  EdTech Companies
                </Link>
              </li>
              <li>
                <Link
                  to="/solutions#test-prep"
                  className="hover:text-foreground transition-colors"
                >
                  Test-Prep Organizations
                </Link>
              </li>
              <li>
                <Link
                  to="/solutions#publishers"
                  className="hover:text-foreground transition-colors"
                >
                  Publishers
                </Link>
              </li>
              <li>
                <Link
                  to="/solutions#certification"
                  className="hover:text-foreground transition-colors"
                >
                  Training &amp; Certification
                </Link>
              </li>
              <li>
                <Link
                  to="/solutions#partners"
                  className="hover:text-foreground transition-colors"
                >
                  LMS Implementation Partners
                </Link>
              </li>
            </ul>
          </div>

          {/* Company Column */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Company
            </h4>
            <ul className="mt-4 space-y-2.5 text-xs text-muted-foreground">
              <li>
                <Link
                  to="/resources"
                  className="hover:text-foreground transition-colors"
                >
                  Technical Library &amp; Guides
                </Link>
              </li>
              <li>
                <Link
                  to="/documentation"
                  className="hover:text-foreground transition-colors"
                >
                  Documentation
                </Link>
              </li>
              <li>
                <Link
                  to="/company"
                  className="hover:text-foreground transition-colors"
                >
                  About Husimi
                </Link>
              </li>
              <li>
                <Link
                  to="/contact"
                  className="hover:text-foreground transition-colors"
                >
                  Contact &amp; Scoping
                </Link>
              </li>
              <li>
                <Link
                  to="/changelog"
                  className="hover:text-foreground transition-colors"
                >
                  Changelog
                </Link>
              </li>
              <li>
                <Link
                  to="/status"
                  className="hover:text-foreground transition-colors"
                >
                  Status
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 sm:flex-row text-xs text-muted-foreground">
          <div className="flex flex-wrap items-center gap-3">
            <span>© {new Date().getFullYear()} Husimi. All rights reserved.</span>
            <span className="hidden sm:inline">·</span>
            <span>Enterprise assessment creation, QA, and migration.</span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <a
              href="mailto:hello@husimisolutions.com"
              className="flex items-center gap-1.5 hover:text-foreground transition-colors"
            >
              <Mail className="h-3.5 w-3.5" />
              hello@husimisolutions.com
            </a>
            <span className="text-border">·</span>
            <a
              href="tel:+919382565942"
              className="flex items-center gap-1.5 hover:text-foreground transition-colors"
            >
              <Phone className="h-3.5 w-3.5" />
              +91 9382565942
            </a>
            <span className="text-border">·</span>
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              Tamluk, India
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
