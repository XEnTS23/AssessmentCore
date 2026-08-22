import { useEffect } from "react";
import { useLocation } from "react-router";

const SITE_URL = (import.meta.env.VITE_SITE_URL || "https://assessmentcore.vercel.app").replace(/\/$/, "");
const DEFAULT_IMAGE = `${SITE_URL}/AC_logo.png`;

type SeoConfig = {
  title: string;
  description: string;
  canonical?: string;
  robots?: string;
  structuredData?: Record<string, unknown>;
};

const PUBLIC_SEO: Record<string, SeoConfig> = {
  "/": {
    title: "AssessmentCore | PDF-to-QTI assessment platform",
    description:
      "Turn messy PDFs and images into LMS-ready assessments with AssessmentCore's deterministic OCR, validation, and QTI export workflow.",
    canonical: "/",
    structuredData: {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "AssessmentCore",
      description:
        "A platform for creating, validating, and converting educational assessment questions to QTI format.",
      applicationCategory: "EducationalApplication",
      url: SITE_URL,
      offers: [
        {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
          description: "Free tier available",
        },
        {
          "@type": "Offer",
          price: "1999",
          priceCurrency: "INR",
          description: "Premium monthly plan",
        },
      ],
      creator: {
        "@type": "Organization",
        name: "AssessmentCore",
      },
    },
  },
  "/solutions": {
    title: "QTI assessment conversion solutions | AssessmentCore",
    description:
      "Explore AssessmentCore solutions for converting question banks into validated QTI packages for Canvas, Moodle, Blackboard, and other LMS platforms.",
    canonical: "/solutions",
  },
  "/services": {
    title: "Assessment engineering services | AssessmentCore",
    description:
      "AssessmentCore services help teams digitize legacy question banks, validate assessment data, and produce LMS-ready QTI exports.",
    canonical: "/services",
  },
  "/resources": {
    title: "AssessmentCore resources and QTI guides",
    description:
      "Read AssessmentCore guides for OCR ingestion, spreadsheet schemas, question types, MathML, LaTeX, validation rules, and LMS exports.",
    canonical: "/resources",
  },
  "/pricing": {
    title: "AssessmentCore pricing",
    description:
      "Compare AssessmentCore plans for testing assessment validation and scaling PDF-to-QTI generation workflows.",
    canonical: "/pricing",
  },
  "/company": {
    title: "About AssessmentCore",
    description:
      "Learn how AssessmentCore engineers reliable infrastructure for digital assessment conversion and LMS delivery.",
    canonical: "/company",
  },
  "/contact": {
    title: "Contact AssessmentCore",
    description:
      "Contact the AssessmentCore team about PDF-to-QTI conversion, assessment engineering, validation, and LMS export workflows.",
    canonical: "/contact",
  },
  "/changelog": {
    title: "AssessmentCore release notes",
    description:
      "Review AssessmentCore product updates, assessment-engine changes, and improvements to the QTI workflow.",
    canonical: "/changelog",
  },
  "/status": {
    title: "AssessmentCore platform status",
    description:
      "Check the current operational status of the AssessmentCore assessment conversion platform.",
    canonical: "/status",
  },
  "/documentation": {
    title: "AssessmentCore documentation",
    description:
      "Learn the AssessmentCore workflow for ingestion, validation, remediation, review, and LMS-ready QTI packaging.",
    canonical: "/documentation",
  },
  "/resources/sample-package": {
    title: "AssessmentCore sample QTI package",
    description:
      "Inspect a proof package showing how AssessmentCore converts a messy source document into a clean QTI export.",
    canonical: "/resources/sample-package",
  },
  "/resources/source-pdf": {
    title: "AssessmentCore source PDF example",
    description:
      "Inspect the source PDF used in the AssessmentCore proof workflow before OCR cleanup and QTI conversion.",
    canonical: "/resources/source-pdf",
  },
};

function getConfig(pathname: string, isWorkspaceHost: boolean): SeoConfig {
  if (isWorkspaceHost) {
    return {
      title: "AssessmentCore workspace",
      description: "Authenticated AssessmentCore workspace.",
      robots: "noindex, nofollow",
    };
  }

  if (pathname.startsWith("/auth/")) {
    return {
      title: "AssessmentCore account",
      description: "Sign in or manage your AssessmentCore account.",
      robots: "noindex, nofollow",
    };
  }

  if (pathname === "/ocr") {
    return {
      title: "AssessmentCore OCR processor",
      description: "Process assessment source documents with the AssessmentCore OCR workflow.",
      robots: "noindex, follow",
    };
  }

  if (pathname === "/docs" || pathname.startsWith("/docs/")) {
    return {
      title: "AssessmentCore documentation",
      description:
        "The canonical AssessmentCore documentation is available at /documentation.",
      canonical: "/documentation",
      robots: "noindex, follow",
    };
  }

  return (
    PUBLIC_SEO[pathname] || {
      title: "Page not found | AssessmentCore",
      description: "The requested AssessmentCore page could not be found.",
      robots: "noindex, nofollow",
    }
  );
}

function upsertMeta(attribute: "name" | "property", key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(
    `meta[${attribute}="${key}"]`,
  );

  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }

  element.dataset.seoManaged = "true";
  element.content = content;
}

function upsertCanonical(href: string | undefined) {
  const existing = document.head.querySelector<HTMLLinkElement>(
    'link[rel="canonical"]',
  );

  if (!href) {
    existing?.remove();
    return;
  }

  const canonical = existing || document.createElement("link");
  canonical.rel = "canonical";
  canonical.href = `${SITE_URL}${href}`;
  canonical.dataset.seoManaged = "true";
  if (!existing) document.head.appendChild(canonical);
}

function upsertStructuredData(data: Record<string, unknown> | undefined) {
  const existing = document.head.querySelector<HTMLScriptElement>(
    'script[data-seo-jsonld="true"]',
  );

  if (!data) {
    existing?.remove();
    return;
  }

  const script = existing || document.createElement("script");
  script.type = "application/ld+json";
  script.dataset.seoJsonld = "true";
  script.textContent = JSON.stringify(data);
  if (!existing) document.head.appendChild(script);
}

export function SeoManager() {
  const { pathname } = useLocation();

  useEffect(() => {
    const isWorkspaceHost = window.location.hostname.startsWith("workspace.");
    const config = getConfig(pathname, isWorkspaceHost);
    const canonicalUrl = config.canonical
      ? `${SITE_URL}${config.canonical}`
      : undefined;

    document.title = config.title;
    upsertMeta("name", "description", config.description);
    upsertMeta("name", "robots", config.robots || "index, follow");
    upsertMeta("name", "author", "AssessmentCore");
    upsertMeta("property", "og:type", "website");
    upsertMeta("property", "og:url", canonicalUrl || `${SITE_URL}${pathname}`);
    upsertMeta("property", "og:title", config.title);
    upsertMeta("property", "og:description", config.description);
    upsertMeta("property", "og:image", DEFAULT_IMAGE);
    upsertMeta("property", "og:image:alt", "AssessmentCore logo");
    upsertMeta("property", "og:site_name", "AssessmentCore");
    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:url", canonicalUrl || `${SITE_URL}${pathname}`);
    upsertMeta("name", "twitter:title", config.title);
    upsertMeta("name", "twitter:description", config.description);
    upsertMeta("name", "twitter:image", DEFAULT_IMAGE);
    upsertCanonical(config.canonical);
    upsertStructuredData(config.structuredData);
  }, [pathname]);

  return null;
}
