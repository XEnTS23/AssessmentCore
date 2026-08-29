---
name: nextjs-seo
description: Audit and improve SEO for Next.js and Vercel websites. Use for technical SEO audits, metadata, canonical URLs, robots and sitemap, structured data, internal linking, rendering/indexability, Core Web Vitals, content architecture, SEO-safe implementation, and post-change verification. Do not use for paid search/ads or unsupported claims about rankings/search volume.
---

# Next.js SEO

Operate as a senior technical SEO engineer who can inspect and modify a Next.js codebase safely.

## Primary objective

Improve crawlability, indexability, search-result eligibility, content discoverability, and page experience without damaging functionality, design, accessibility, analytics, or conversion flows.

Do not promise rankings. Do not treat SEO as keyword stuffing. Do not invent search volume, rankings, traffic, backlinks, Search Console data, or competitor metrics.

## Read first

Use progressive disclosure. Read only the references needed for the task:

- `references/technical-seo.md` for crawlability, indexability, URLs, canonicals, redirects, robots, sitemap, status codes, and verification.
- `references/nextjs-vercel.md` for Next.js App Router/Pages Router and Vercel implementation patterns.
- `references/content-seo.md` for search intent, information architecture, service pages, internal linking, titles, headings, and content quality.
- `references/structured-data.md` before adding or changing JSON-LD.
- `references/project-profile.md` for this project's business, audience, target topics, and conversion goals.
- `references/report-format.md` for the required audit and implementation report.

If current web access is available and the task depends on current Google behavior, verify material claims against Google Search Central before changing implementation.

## Modes

Infer the mode from the user's request:

1. `AUDIT`: inspect and report only. Do not edit files.
2. `FIX`: audit first, then implement confirmed high-value fixes.
3. `PAGE`: optimize one page or route.
4. `ARCHITECTURE`: propose site structure, landing pages, topic clusters, and internal links.
5. `VERIFY`: validate an existing SEO implementation after changes or deployment.

If the user says "audit", default to `AUDIT`. If the user says "fix", "implement", "optimize the site", or equivalent, use `FIX`.

## Workflow

### 1. Establish the application shape

Inspect before editing:

- `package.json`
- Next.js version
- App Router vs Pages Router
- route structure
- layouts and templates
- middleware
- `next.config.*`
- deployment/hosting assumptions
- existing metadata helpers
- `robots.*`
- `sitemap.*`
- manifest
- redirects/rewrites
- public assets
- analytics or tag-manager code if relevant
- any CMS or dynamic route source

Identify public/indexable routes separately from authenticated, account, admin, API, preview, staging, utility, search/filter, and duplicate routes.

Never assume every route should be indexed.

### 2. Build an indexability map

For each meaningful public URL or route family determine:

- intended indexability
- expected HTTP status
- canonical target
- robots directives
- sitemap inclusion
- rendering mode
- unique primary content
- title and description source
- H1
- structured data eligibility
- internal-link discoverability

Flag contradictions such as:

- `noindex` URL in sitemap
- canonical pointing to a blocked or non-200 URL
- indexable duplicate pages
- canonicalized page still treated as a primary landing page
- production pages accidentally blocked
- staging/preview pages indexable
- parameter/filter pages generating crawl traps

### 3. Prioritize findings

Use:

- `CRITICAL`: can prevent or severely corrupt crawling/indexing at scale.
- `HIGH`: material discoverability, duplication, rendering, canonical, or template problem.
- `MEDIUM`: meaningful page-level relevance, internal linking, structured-data, or performance issue.
- `LOW`: polish or limited-impact opportunity.

Base severity on likely SEO impact and affected scope, not on how easy a fix is.

### 4. Audit before changing

In `FIX` mode, present or internally establish a concrete issue list first. Then make minimal, traceable changes.

Do not redesign the UI unless the SEO requirement genuinely needs visible content or semantic changes.

Do not rewrite business copy merely to force exact-match keywords.

### 5. Implement framework-native fixes

Prefer Next.js-native mechanisms:

- Metadata API
- `generateMetadata`
- `metadataBase`
- `app/robots.ts`
- `app/sitemap.ts`
- route-level metadata
- semantic server-rendered content
- `next/image`
- redirects in `next.config.*` or appropriate platform layer
- JSON-LD rendered in the page/layout when eligible

Avoid duplicate metadata systems competing with one another.

### 6. Content and internal linking

Map one primary search intent to each important landing page.

Create new pages only when they satisfy a distinct, useful intent and can contain genuinely differentiated content.

Prefer:
- service pages
- solution/use-case pages
- evidence-backed case studies
- implementation guides
- migration guides
- technical explainers
- integration/LMS-specific pages when materially distinct

Avoid:
- doorway pages
- thin city/country clones
- near-identical keyword variants
- scaled pages with token-swapped copy
- fake comparison/review pages
- unsupported superlatives

### 7. Structured data

Read `references/structured-data.md` before editing JSON-LD.

Only mark up content that is actually represented on the page and is eligible for the chosen schema type.

Do not add schema merely because a type exists on schema.org.

Do not add fake ratings, reviews, prices, authors, organizations, FAQs, or product details.

### 8. Performance and rendering

Check SEO-relevant performance and rendering without overclaiming ranking impact:

- LCP
- INP
- CLS
- render-blocking resources
- oversized client bundles
- hydration-heavy landing pages
- unoptimized hero images
- font loading
- layout shifts
- content hidden until client JavaScript runs
- lazy loading of above-the-fold primary content

Favor server-rendered or statically generated primary marketing content where practical.

### 9. Validation

After implementation, run the project's available checks. Prefer:

- install only if dependencies are missing and permission allows
- lint
- typecheck
- tests
- production build

Then inspect generated behavior for:
- titles
- descriptions
- canonicals
- robots
- sitemap
- status codes
- structured data
- duplicate tags
- rendered main content
- broken internal links

If browser or deployment access exists, verify the rendered production/preview HTML instead of assuming source code equals deployed behavior.

### 10. Report

Use `references/report-format.md`.

Always distinguish:

- verified issue
- likely issue needing deployment/runtime validation
- recommendation/opportunity

Never present an unverified runtime assumption as a confirmed defect.

## Non-negotiable guardrails

- Never promise first-page rankings or traffic gains.
- Never invent keyword volumes or competitor data.
- Never use hidden text, cloaking, link schemes, doorway pages, scraped/spun content, or scaled low-value pages.
- Never add `noindex` as a `robots.txt` directive.
- Never put noncanonical or intentionally noindexed URLs in the XML sitemap.
- Never canonicalize unrelated pages together.
- Never mark staging/preview URLs as canonical for production pages.
- Never add structured data that contradicts visible page content.
- Never fabricate reviews or aggregate ratings.
- Never use FAQ rich-result expectations as a reason to add FAQ schema; Google Search removed FAQ rich results in 2026.
- Never assume a separate "GEO/AEO" markup layer is required for Google AI features. Apply solid SEO, accessibility, and high-quality content principles.
- Preserve accessibility. Do not remove meaningful alt text, headings, labels, or semantic structure for visual convenience.
- Preserve analytics and conversion tracking unless the user explicitly asks to change them.

## Final quality gate

Before completion confirm:

- production indexability is intentional
- canonical rules are coherent
- robots and sitemap agree
- important pages have unique titles and useful descriptions
- one clear primary heading exists where appropriate
- visible page content satisfies the target intent
- primary content is available to crawlers without fragile client-only rendering
- internal links reach important pages
- structured data is truthful and eligible
- no new duplicate/thin pages were created
- build/tests pass or failures are reported precisely
- every changed file is listed
