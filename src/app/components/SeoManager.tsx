import { useEffect } from "react";
import { useLocation } from "react-router";

export const SITE_URL = (
  import.meta.env.VITE_SITE_URL || "https://husimisolutions.com"
).replace(/\/$/, "");
export const DEFAULT_IMAGE = `${SITE_URL}/logo-dark-1.png`;

export type SeoConfig = {
  title: string;
  description: string;
  canonical?: string;
  robots?: string;
  structuredData?: Record<string, unknown> | Array<Record<string, unknown>>;
};

export const PUBLIC_SEO: Record<string, SeoConfig> = {
  "/": {
    title: "Assessment Content Conversion & QTI Services | Husimi",
    description:
      "Husimi helps education companies, publishers, and assessment teams create, digitize, validate, and migrate assessment content to LMS-ready QTI standards.",
    canonical: "/",
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "Husimi",
        url: SITE_URL,
        logo: `${SITE_URL}/logo-dark-1.png`,
        description:
          "Assessment content services and technology business helping education companies create, digitize, validate, and migrate assessment content.",
        sameAs: [
          "https://www.linkedin.com",
          "https://github.com",
          "https://twitter.com",
          "https://www.youtube.com",
          "https://www.facebook.com"
        ],
        contactPoint: {
          "@type": "ContactPoint",
          telephone: "+91-9382565942",
          contactType: "customer service",
          email: "hello@husimisolutions.com",
          areaServed: "Global"
        },
        makesOffer: [
          {
            "@type": "Offer",
            name: "Assessment Content Development"
          },
          {
            "@type": "Offer",
            name: "Assessment Content Digitization"
          },
          {
            "@type": "Offer",
            name: "Question Bank QA & Remediation"
          },
          {
            "@type": "Offer",
            name: "LMS & Assessment Migration"
          }
        ]
      },
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "Husimi",
        url: SITE_URL
      }
    ]
  },
  "/services": {
    title: "Assessment Content Services & QTI Migration | Husimi",
    description:
      "Content development, legacy assessment digitization, question bank QA, and automated QTI/LMS migration services powered by proprietary validation technology.",
    canonical: "/services",
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "Service",
        name: "Assessment Content Conversion & QTI Services",
        provider: {
          "@type": "Organization",
          name: "Husimi",
          url: SITE_URL
        },
        serviceType: "Assessment Digitization & LMS Migration",
        description:
          "End-to-end assessment authoring, legacy PDF/scan digitization, structural LaTeX validation, and standard QTI 2.1 & 3.0 packaging."
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: `${SITE_URL}/`
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Services",
            item: `${SITE_URL}/services`
          }
        ]
      }
    ]
  },
  "/solutions": {
    title: "Assessment Solutions for EdTech & Publishers | Husimi",
    description:
      "Workflow solutions for education publishers, EdTech platforms, test-prep organizations, and certification providers to manage assessment content at scale.",
    canonical: "/solutions",
    structuredData: {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: `${SITE_URL}/`
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Solutions",
          item: `${SITE_URL}/solutions`
        }
      ]
    }
  },
  "/resources": {
    title: "QTI Assessment Resources & Technical Guides | Husimi",
    description:
      "Practical guides for question bank schemas, STEM diagrams, LaTeX delimiters, validation rules, and Canvas/Moodle LMS exports.",
    canonical: "/resources",
    structuredData: {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: `${SITE_URL}/`
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Resources",
          item: `${SITE_URL}/resources`
        }
      ]
    }
  },
  "/company": {
    title: "About Husimi | Assessment Technology & Services",
    description:
      "Learn about Husimi's engineering heritage, proprietary assessment processing pipeline, and hands-on digital authoring experience.",
    canonical: "/company",
    structuredData: {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: `${SITE_URL}/`
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "About Husimi",
          item: `${SITE_URL}/company`
        }
      ]
    }
  },
  "/contact": {
    title: "Discuss an Assessment Project & Pilot | Husimi",
    description:
      "Scope an assessment digitization, QA remediation, or LMS migration project with Husimi. Request a representative sample conversion or pilot.",
    canonical: "/contact",
    structuredData: {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: `${SITE_URL}/`
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Contact",
          item: `${SITE_URL}/contact`
        }
      ]
    }
  },
  "/changelog": {
    title: "Platform Release Notes & Changelog | Husimi",
    description:
      "Review platform updates, assessment validation rules, and improvements to the Husimi processing workflow.",
    canonical: "/changelog",
    structuredData: {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: `${SITE_URL}/`
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Changelog",
          item: `${SITE_URL}/changelog`
        }
      ]
    }
  },
  "/status": {
    title: "Platform Status & Uptime | Husimi",
    description:
      "Check the operational status of Husimi ingestion, validation, and export systems.",
    canonical: "/status",
    structuredData: {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: `${SITE_URL}/`
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Status",
          item: `${SITE_URL}/status`
        }
      ]
    }
  },
  "/documentation": {
    title: "Question Bank Schemas & Documentation | Husimi",
    description:
      "Complete technical documentation for question bank schemas, validation rules, and platform-ready QTI packaging.",
    canonical: "/documentation",
    structuredData: {
      "@context": "https://schema.org",
      "@type": "TechArticle",
      headline: "Husimi Question Bank Schema & Validation Specifications",
      description:
        "Technical documentation covering canonical data extraction, question types, formula preservation, and QTI packaging standards.",
      author: {
        "@type": "Organization",
        name: "Husimi"
      }
    }
  },
  "/resources/sample-package": {
    title: "Sample QTI 3.0 Assessment Package Proof | Husimi",
    description:
      "Inspect a proof package showing how complex source documents are converted into validated QTI 3.0 exports.",
    canonical: "/resources/sample-package",
    structuredData: {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: `${SITE_URL}/`
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Resources",
          item: `${SITE_URL}/resources`
        },
        {
          "@type": "ListItem",
          position: 3,
          name: "Sample Package",
          item: `${SITE_URL}/resources/sample-package`
        }
      ]
    }
  },
  "/resources/source-pdf": {
    title: "Assessment Source Document Example | Husimi",
    description:
      "Inspect the source PDF used in our proof workflow before assessment structuring and QTI conversion.",
    canonical: "/resources/source-pdf",
    structuredData: {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: `${SITE_URL}/`
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Resources",
          item: `${SITE_URL}/resources`
        },
        {
          "@type": "ListItem",
          position: 3,
          name: "Source PDF",
          item: `${SITE_URL}/resources/source-pdf`
        }
      ]
    }
  }
};

export function getConfig(pathname: string, isWorkspaceHost: boolean): SeoConfig {
  if (isWorkspaceHost) {
    return {
      title: "Husimi Workspace",
      description: "Authenticated Husimi workspace.",
      robots: "noindex, nofollow"
    };
  }

  if (pathname.startsWith("/auth/")) {
    return {
      title: "Husimi Account",
      description: "Sign in or manage your Husimi account.",
      robots: "noindex, nofollow"
    };
  }

  if (pathname === "/ocr") {
    return {
      title: "Husimi Document Processor",
      description: "Process assessment source documents with the Husimi workflow.",
      robots: "noindex, follow"
    };
  }

  if (pathname === "/docs" || pathname.startsWith("/docs/")) {
    return {
      title: "Question Bank Schemas & Documentation | Husimi",
      description: "The canonical documentation is available at /documentation.",
      canonical: "/documentation",
      robots: "noindex, follow"
    };
  }

  return (
    PUBLIC_SEO[pathname] || {
      title: "Page Not Found | Husimi",
      description: "The requested page could not be found.",
      robots: "noindex, nofollow"
    }
  );
}

function upsertMeta(attribute: "name" | "property", key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(
    `meta[${attribute}="${key}"]`
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
    'link[rel="canonical"]'
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

function upsertStructuredData(
  data: Record<string, unknown> | Array<Record<string, unknown>> | undefined
) {
  const existing = document.head.querySelector<HTMLScriptElement>(
    'script[data-seo-jsonld="true"]'
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
    upsertMeta("name", "author", "Husimi");
    upsertMeta("property", "og:type", "website");
    upsertMeta("property", "og:url", canonicalUrl || `${SITE_URL}${pathname}`);
    upsertMeta("property", "og:title", config.title);
    upsertMeta("property", "og:description", config.description);
    upsertMeta("property", "og:image", DEFAULT_IMAGE);
    upsertMeta("property", "og:image:alt", "Husimi");
    upsertMeta("property", "og:site_name", "Husimi");
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
