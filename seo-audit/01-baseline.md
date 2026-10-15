# Phase 1: Baseline Technical SEO Audit

**Date:** 2026-10-15  
**Auditor:** Senior SEO Engineer / Full-Stack Developer (Antigravity)  
**Stack Detected:** React 19 + Vite 6 + React Router 7 + TailwindCSS 4 (Client-Side Rendered SPA)  
**Hosting / Deployment:** Vercel (`vercel.json`) behind Cloudflare DNS / CDN  
**Target Canonical Domain:** `https://husimisolutions.com`

---

## 1. Executive Summary & Defect Severity

| Defect ID | Severity | Category | Description | Impact |
|---|---|---|---|---|
| **DEF-01** | **CRITICAL** | DNS / Infrastructure | Apex domain `https://husimisolutions.com` resolves to a Hostinger Parking page | Search engines and users visiting apex domain see parking placeholder |
| **DEF-02** | **HIGH** | Rendering / Crawlability | Pure Client-Side SPA returns empty `<div id="root"></div>` for all raw HTTP requests | Search engine crawlers with limited JS execution see no copy, no navigation links, no H1 |
| **DEF-03** | **HIGH** | Indexability / Sitemap | `public/sitemap.xml` contains `/pricing`, which does not exist in `routes.tsx` | Search engines crawl dead URL; soft 404 / 404 error page indexation |
| **DEF-04** | **HIGH** | HTTP Status Codes | SPA returns HTTP 200 for missing pages instead of HTTP 404 | Soft 404s flagged in Google Search Console |
| **DEF-05** | **MEDIUM** | Metadata Synchronization | Raw `index.html` static metadata only matches homepage; subpages only update title/desc after client JS boots | If JS fails or is deferred, subpages display homepage title and canonical |
| **DEF-06** | **MEDIUM** | Structured Data | `Organization` schema in `SeoManager.tsx` lacks `logo`, official social profiles in `sameAs`, and contactPoint | Lower rich entity understanding in Google Knowledge Graph |

---

## 2. Framework & Routing Architecture

1. **Routing:** `react-router` (v7) `createBrowserRouter`. Routes are split into `publicRoutes` and `workspaceRoutes` (for `workspace.` subdomain).
2. **Metadata Management:** `src/app/components/SeoManager.tsx` dynamically modifies `document.title`, `<meta name="description">`, `<link rel="canonical">`, and injected JSON-LD using React `useEffect`.
3. **Weakness of Client-Side SEO Management:**
   - On initial HTTP fetch, crawlers receive the generic `index.html`.
   - The `<title>` is `Husimi | Assessment Content Services & Technology` and `<link rel="canonical">` points to `https://husimisolutions.com` on EVERY public route until JavaScript executes.
   - For Google, JS execution (the Web Rendering Service) is queued and resource-constrained. For other search engines (Bing, DuckDuckGo, AI search crawlers), client JS may not execute at all.

---

## 3. Robots.txt and Sitemap.xml Audit

- `public/robots.txt`:
  - `Allow: /`
  - Correctly disallows private paths: `/admin`, `/api`, `/auth/`, `/workspace`, `/ocr`.
  - Points to `Sitemap: https://husimisolutions.com/sitemap.xml`.
  - **Verdict:** PASS for policy; requires no change other than ensuring canonical sitemap matches live domain.
- `public/sitemap.xml`:
  - Contains 12 entries.
  - Line 7 contains `<loc>https://husimisolutions.com/pricing</loc>`.
  - In `src/app/routes.tsx`, there is NO `/pricing` route.
  - **Verdict:** FAIL (requires removing `/pricing`).

---

## 4. Performance & Core Web Vitals (Baseline Environment)

- **Measurement Environment:** Local Vite dev / production preview build.
- **Field Data (CrUX):** Inapplicable/unavailable for new domain `husimisolutions.com`.
- **Lab Diagnostics:**
  - Fast asset delivery from Vite bundle.
  - Fonts loaded from Google Fonts (`fonts.googleapis.com`).
  - No large render-blocking scripts in `<head>`.
  - Assets in `index.html` use preconnect to fonts.gstatic.com.

---

## 5. Deliverables Generated

- `seo-audit/url-inventory.csv`
- `seo-audit/issues.csv`
- `seo-audit/01-baseline.md`
