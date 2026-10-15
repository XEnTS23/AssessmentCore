# HUSIMI — ANTIGRAVITY SEO EXECUTION PLAYBOOK

**Objective:** Make the Husimi website technically crawlable, useful for high-intent B2B searches, measurable, and capable of earning relevant organic leads. Implement changes in the actual repository—not a generic SEO checklist.

**Working brand:** Husimi  
**Provisional main domain:** `https://husimisolutions.com/`  
**Related product / earlier domain:** `https://assessmentcore.in/`  
**Critical:** Domain ownership, active deployments, relationship between the two domains, framework, services currently offered, and any existing rankings must be verified. The main domain above is a working assumption, not a verified live-site finding.

**Scope:** Engineering SEO, information architecture, on-page SEO, evidence-backed B2B content, structured data, performance, Search Console readiness, conversion tracking, and an ongoing content/authority strategy.

---

## MASTER INSTRUCTIONS FOR THE CODING AGENT

You are the senior technical SEO engineer, full-stack developer, and SEO content strategist responsible for Husimi. You have access to the source repository and development terminal through Antigravity. **Your job is to audit, implement, test, and document concrete improvements. Do not stop after making a list of recommendations.**

Operating principles:

1. **Inspect before editing.** Detect the actual framework, routing, hosting, deployment configuration, SEO tooling, asset structure, and existing pages. Never assume React/Vite, Next.js, or any other stack without checking.
2. **Measure before claiming success.** Save baseline and post-change findings. Distinguish local tests, live HTTP tests, Google Search Console results, and guesses.
3. **Never invent evidence.** Do not fabricate clients, logos, employer affiliations, testimonials, reviews, case studies, conversions, speed improvements, awards, staff counts, or certifications. User experience with a third-party authoring tool is not an endorsement or partnership from its vendor.
4. **Focus on actual buyers.** Husimi targets education publishers, EdTech vendors, assessment operations teams, and LMS migration teams; do not trade qualified B2B leads for irrelevant blog traffic.
5. **Preserve working functionality.** Do not break the existing app, forms, exports, navigation, or demos to improve marketing-site SEO. The product app may remain client-side; public landing pages should preferably be statically rendered or server-rendered.
6. **Implement with repository conventions.** Use available tooling and tests. Avoid unnecessary framework rewrites and dependencies.
7. **Do not perform irreversible actions without approval.** Domain cutovers, cross-domain redirects, mass URL removals, substantial public claim changes, destructive operations, and production credential changes require owner approval. Other safe code improvements can proceed.
8. **Rankings are not guaranteed.** Technical SEO makes content accessible and understandable; ranking requires relevance, original proof, external recognition, and time. Never promise a Google position or deadline.
9. **Use Google's published documentation as the primary technical source.** Do not implement outdated SEO myths (meta keywords, keyword-density targets, arbitrary word counts, schema spam, mass AI location pages, purchased backlinks).
10. **Keep deliverables reviewable.** Each phase finishes with changed file paths, verification commands/results, unresolved blockers, and priority.

Use a branch such as `feat/seo-foundation`. Keep changes logically grouped. If a check fails, fix it before declaring the stage done. Do not mark an inaccessible production resource as passing.

---

## PHASE 0 — VERIFY THE WEBSITE AND BRAND ARCHITECTURE (P0)

### Tasks

- Identify the current production domain and hosting provider from the repository, deployment environment, DNS and existing site links.
- Check DNS resolution, HTTPS certificate, HTTP status, redirects, and accessible page content for `husimisolutions.com`, `www.husimisolutions.com`, `assessmentcore.in`, and `www.assessmentcore.in`.
- Inventory their live URLs, canonical signals, indexing directives, and public content. Do **not** conclude a domain is down based on one unsuccessful request; cross-check DNS, browser, deployment logs, and external probes.
- Determine whether AssessmentCore is (a) the Husimi product on a separate domain, (b) a site that will be migrated, or (c) a historical brand. Record the decision and domain ownership evidence.
- Choose **one canonical host per website**. Do not automatically redirect the AssessmentCore domain to Husimi merely because they share an owner. If a site move is approved, prepare one-to-one URL mappings and server-side permanent redirects, preserve relevant old URLs, and submit the new sitemap.
- Check branded-search discoverability and any existing Search Console data, if provided.

### Proof / output

`seo-audit/00-domains-and-brand.md`: domain matrix, redirect map, verified URLs, risks, and any decisions needing approval.

**Gate:** Production host and site/domain relationship are confirmed before hardcoding canonical URLs or shipping redirects.

---

## PHASE 1 — BASELINE TECHNICAL AUDIT (P0)

### Tasks

1. Inspect `package.json`, framework configuration, routes, HTML templates, deployment config, existing metadata, and scripts.
2. Enumerate all public, authentication-only, app, utility, and error URLs. Generate `seo-audit/url-inventory.csv` with: URL, page purpose, response status, indexability, canonical, title, description, H1, inbound internal links, inclusion in sitemap, and action.
3. Fetch raw HTML with `curl` / an HTTP client. Inspect rendered DOM separately with Playwright or an equivalent browser. **Compare raw vs rendered title, main copy, navigation and links.**
4. Detect and document: blank SPA HTML shell, duplicate or generic titles, missing descriptions, duplicate H1s, inaccessible internal links, thin pages, canonical errors, robots issues, `noindex`, broken routes, soft 404s, HTTP 200 error pages, image problems, mixed content, redirect chains and broken forms.
5. Check `robots.txt`, `sitemap.xml`, actual HTTP headers, meta-robots, canonical tags, hreflang only if multilingual, and error response codes.
6. Establish a desktop/mobile PageSpeed or Lighthouse baseline; record the measurement source and environment. If real-user Core Web Vitals are unavailable, say so explicitly rather than presenting lab numbers as field data.
7. Record current organic clicks, impressions, CTR, queries, landing pages, and conversions from connected GSC/analytics, if access exists; otherwise create an owner-action request.
8. Inspect five competing search results for each priority query and note search intent, content formats and differentiation. Do not invent keyword volumes from unsupported tools.

### Proof / output

- `seo-audit/01-baseline.md`
- `seo-audit/url-inventory.csv`
- `seo-audit/issues.csv` with `severity, URL, evidence, impact, suggested fix, status`
- Screenshots/reports where supported by repository tooling

**Gate:** Critical SEO defects are evidenced. No speculative "SEO score 100" claims.

---

## PHASE 2 — SELECT BUYER SEARCH INTENT AND KEYWORD-TO-PAGE MAP (P0)

Use these as **research hypotheses**, not certified search-volume/ranking facts. Validate against live SERPs, actual customer vocabulary, and GSC (if available).

| Priority | Buyer intent / topic | Candidate URL | Primary query hypothesis |
|---|---|---|---|
| 1 | Company + offerings | `/` | assessment content conversion services |
| 1 | Assessment ingestion and digitization | `/services/assessment-digitization/` | assessment content digitization services |
| 1 | QTI conversion / export | `/services/qti-conversion/` | QTI conversion services |
| 1 | LMS question migration | `/services/lms-migration/` | Canvas LMS quiz migration services |
| 1 | Assessment authoring | `/services/assessment-authoring/` | assessment content authoring services |
| 2 | Structured item bank migration | `/services/item-bank-migration/` | question bank migration services |
| 2 | Product offering | `/products/assessmentcore/` | PDF to QTI converter |
| 2 | Publisher vertical | `/solutions/educational-publishers/` | assessment publishing workflow solutions |
| 2 | EdTech vertical | `/solutions/edtech-platforms/` | assessment data conversion for edtech |
| 2 | Technical comparison | `/resources/qti-2-1-vs-qti-3-0/` | QTI 2.1 vs QTI 3.0 |
| 2 | Troubleshooting | `/resources/canvas-qti-import-guide/` | Canvas QTI import troubleshooting |
| 2 | Process education | `/resources/pdf-to-qti-workflow/` | how to convert PDF questions to QTI |

**Do not create all pages just to increase URL count.** Merge near-duplicate or unsupported service pages. A service URL should exist only if Husimi can truly deliver that service. Confirm names and capabilities before publishing definitive claims. A prototype feature cannot be presented as proven enterprise functionality.

Tasks:
- Group by informational, commercial investigation, and service/purchase intent.
- Assign exactly one primary search intent to each important page; retain natural secondary phrases.
- Review search results for each topic and record real competitors, user questions and deficiencies.
- Prioritize underserved, specific, purchase-adjacent queries instead of only broad terms such as "AI" or "education".
- Create a page map with goal, CTA, proof needed and internal link sources.

**Deliverable:** `seo-audit/02-keyword-page-map.csv` and `seo-audit/02-serp-findings.md`.

---

## PHASE 3 — SEO-SAFE RENDERING AND ROUTING (P0)

1. Identify whether public pages use SPA client-side rendering, SSR, SSG, or hybrid rendering.
2. For any public marketing page whose substantive copy exists only after JavaScript executes, implement a suitable **SSG/prerender or SSR** solution consistent with the stack. Prefer the smallest practical architecture change. For a React/Vite SPA, consider a static/prerendered marketing layer while retaining interactive assessment tooling as an SPA.
3. Ensure every indexable marketing route returns usable HTML containing its unique title, meta description, main heading, substantive body, internal links, canonical and JSON-LD **before client JS is run**, where feasible.
4. Use real `<a href="...">` links for navigation and links from all important pages; avoid clickable `div`s as the sole navigation mechanism.
5. Each public page must have its own crawlable URL. The SPA router must not silently replace the URL or serve identical HTML metadata to every route.
6. Nonexistent routes must return actual HTTP `404` (or `410` where appropriate); never send `200` with a "not found" message.
7. Keep private dashboards, authenticated content, internal search results, and testing paths out of the public sitemap; use appropriate access control and/or index directives.
8. Do not render materially different content to crawlers than ordinary users.

**Gate:** A JavaScript-disabled HTTP/HTML inspection shows the key public copy and metadata, or any exception is documented with Google URL Inspection / rendered HTML evidence.

---

## PHASE 4 — PUBLIC SITE INFORMATION ARCHITECTURE AND CONVERSION (P0–P1)

Implement a clean site structure based on validated offerings:

- Home: What problem Husimi solves, who it serves, specific service categories, real differentiation and one primary CTA (e.g. "Discuss an assessment conversion project").
- Services: Standalone landing pages for demonstrable offerings; describe inputs, outputs, steps, supported standards, QA process, limitations, representative samples and CTA.
- Product: Clearly separate AssessmentCore's **current working prototype** from intended or roadmap features. Explain formats, supported QTI versions, test status and limitations truthfully.
- Solutions: Education publisher and EdTech pages only when genuinely distinct and useful.
- Resources: Original how-to guides, schema examples, troubleshooting and validated implementation notes.
- About: Authentic owner/company identity, relevant firsthand technical experience, and accurate operational footprint.
- Contact: Working form or email, realistic response expectations, privacy notice and spam protection.
- Privacy / legal: Appropriate truthful pages based on what data the site collects and how it is processed; flag legal review when necessary.

Content expectations per service page:
- H1 that directly describes the service.
- First-screen statement of the customer problem and concrete outcome.
- Specific input/output example (e.g., scanned questions → validated QTI XML/package) when demonstrated.
- Who it is for, what the workflow includes, compatibility caveats, QA/validation proof.
- One genuine illustration, sanitized input/output sample, or embedded demo where available.
- Relevant FAQs written to answer buyers, not to manipulate FAQ rich results.
- Links to related technical guides and adjacent services.
- Clear enquiry CTA with a functioning event/lead metric.

No word-count quota. Content should be concise enough to be useful and detailed enough to answer intent.

---

## PHASE 5 — ON-PAGE META, HEADINGS, INTERNAL LINKS, IMAGE SEO (P0)

For every indexable URL:

- Unique, concise, descriptive `<title>` with primary user intent and the brand naturally incorporated.
- Accurate unique `meta name="description"`; this may influence Google's snippet, but Google can generate its own.
- One meaningful visible page H1; logical H2/H3 hierarchy.
- Absolute, self-referencing canonical for canonical pages; correct canonical on intentional duplicates; no conflicting signals.
- `html lang`, page favicon, viewport, meaningful page-specific Open Graph/Twitter previews.
- Absolute URLs for OG images with suitable dimensions, real descriptions and no broken assets.
- Optimized image filenames, truthful alt text, width/height attributes to reduce layout shifts, proper modern formats and loading behavior.
- Natural contextual internal links between service, product and guide pages, with descriptive anchor text.
- No orphan indexable pages; header/footer/breadcrumb navigation makes priority URLs discoverable.
- Avoid title/description keyword stuffing, nonstandard meta-keywords hacks, duplicated boilerplate across pages, auto-generated tag archives and over-optimization.

**Example metadata (illustrative, not to apply blindly):**

Home title: `Assessment Content Conversion & QTI Services | Husimi`  
Home description: `Husimi helps assessment teams digitize questions, structure item banks, and prepare content for QTI and LMS workflows. Explore our services and prototype tools.`

Service title: `QTI Conversion Services for Assessment Teams | Husimi`

Test content against actual capabilities and current positioning before publication.

**Gate:** URL inventory shows no unexpected missing/duplicate key tags or canonical conflicts.

---

## PHASE 6 — ROBOTS, SITEMAP, REDIRECTS, STRUCTURED DATA (P0–P1)

1. Publish a valid root-level `/robots.txt` with the correct production sitemap URL. Do not accidentally disallow the marketing site. Do not treat robots.txt as a `noindex` mechanism.
2. Publish and maintain `/sitemap.xml` with only canonical, indexable, live, successful public URLs. Use truthful `<lastmod>` based on actual meaningful changes; omit unsupported dates rather than manufacture them.
3. Ensure HTTP → HTTPS and nonpreferred → preferred host are redirected in one hop where possible; avoid loops and chains.
4. Use `301` or `308` for approved permanent page moves. Preserve old page value with page-to-equivalent-page mapping, not indiscriminate homepage redirects.
5. Create valid JSON-LD where applicable and **visible content supports it**:
   - `Organization` on homepage/About with accurate name, logo, URL, and real public `sameAs` profiles.
   - `WebSite` on the homepage for site identity.
   - `BreadcrumbList` for visible hierarchical navigation.
   - `Article` / `BlogPosting` for genuine editorial resources with accurate dates/author information.
   - `Service` only when accurately describing a real offering; this is not a promise of a Google rich result.
   - `SoftwareApplication` only if the product page meets its schema expectations and describes a real application accurately.
6. Do **not** invent AggregateRating, reviews, financial data, clients, or FAQ rich-result eligibility. Do not blanket-add unrelated schema.
7. Validate structured data with Google Rich Results Test / Schema Markup Validator; check that JSON-LD is parseable and on the intended URLs.
8. Produce an approved migration plan if one domain is being consolidated. Obtain approval before changing domain routing.

**Gate:** Robots and sitemap return `200` and valid text/XML; schema matches on-page facts; URL status/canonical policy is internally consistent.

---

## PHASE 7 — MOBILE, ACCESSIBILITY, CORE WEB VITALS (P1)

Target Google's **good real-user Core Web Vitals thresholds** at the 75th percentile where field data exist:

- LCP ≤ 2.5 seconds
- INP ≤ 200 milliseconds
- CLS ≤ 0.1

Actions based on evidence:
- Optimize hero/LCP images; avoid lazy-loading the key above-fold LCP image. Consider preload/fetchpriority when warranted.
- Compress images, use modern formats and responsive `srcset` where useful.
- Reduce unnecessary JS, third-party scripts, heavy animation and synchronous work.
- Eliminate render-blocking CSS/JS where practical; split marketing code from interactive editor chunks.
- Use caching, compression, correct asset fingerprints and CDN configuration when available.
- Reserve explicit dimensions for images/embeds; avoid font-induced layout shifts.
- Fix mobile nav, tap targets, forms and high-contrast readability.
- Use Lighthouse/Playwright plus real-world metrics (GSC/CrUX where available). Record caveats and regression thresholds.

**Gate:** No mobile usability blockers or known severe CWV regressions. Do not claim lab Lighthouse scores equal real-user CWV.

---

## PHASE 8 — ORIGINAL CONTENT AND DEMONSTRABLE EXPERTISE (P1)

Create useful assets in this order, **after** verifying details and collecting evidence:

1. **How to convert PDF questions to QTI** — real sample input, segmentation, interaction mapping, validation, XML/package output, known limitations.
2. **QTI 2.1 vs QTI 3.0 for assessment operations** — actual feature/compatibility distinctions backed by official standards and specific workflow implications.
3. **Canvas QTI import troubleshooting** — genuine import failure modes, manifest/file requirements and validation steps; clearly identify supported Canvas version/context.
4. **Moodle question-bank migration checklist** — specific import format differences and tested limitations.
5. **Inside a content QA process** — how valid/caution/rejected content is reviewed, what humans verify, and an anonymized example.
6. **A real case study** — publish only after there is an actual pilot/customer/permission; otherwise use a transparently labeled *internal demo*.

For each resource: date/author where appropriate, firsthand screenshots/outputs, citations to canonical QTI/Canvas/Moodle sources, natural links to a relevant service page, one useful CTA, and an annual accuracy review.

**Prohibited:** Fifty near-identical AI blogs, unsupported benchmarks, fabricated client results, fake staff biographies, keyword-stuffed location pages, and misleading "official Canvas/Pearson partner" claims.

---

## PHASE 9 — SEARCH CONSOLE, ANALYTICS, LEAD ATTRIBUTION (P0–P1)

Engineering tasks:

- Add supported site verification mechanism without exposing credentials or tokens in client source. Owner must complete account-based verification if access is unavailable.
- Prepare Google Search Console Domain Property verification instructions and correct production sitemap URL.
- Install or verify a privacy-compliant analytics setup appropriate to deployed stack and jurisdiction. Do not double-count pageviews in a SPA/SSR hybrid.
- Set up meaningful events: contact form success, pilot enquiry, demo request, click-to-email, and key CTA click as secondary diagnostic events. Do not register a click as a lead conversion when no lead was generated.
- If there is a working form, record attribution/campaign fields appropriately and handle personal data responsibly.
- Produce dashboard/report template by page, query, location, clicks, impressions, CTR, average position (with limitations), enquiries and qualified leads. Set the baseline date.

Owner-only tasks:
- Verify property in Search Console.
- Submit sitemap and inspect priority URLs.
- Grant access to valid Search Console and analytics data if ongoing reporting is desired.
- Approve any tracking/consent configuration and domain-change verification.

**Gate:** Automated tests confirm tracking events fire once; owner-only actions are clearly separated and not falsely marked completed.

---

## PHASE 10 — AUTHORITY BUILDING AND RELEVANT LINKS (P1–P2)

Technical SEO alone will not reliably rank a new B2B domain for competitive service searches. Produce an outreach/content plan, not fabricated backlinks.

- Publish one free, legitimately useful technical asset (e.g., QTI package validation checklist, non-confidential XML example, sample converter test data, reference implementation guide).
- Create honest business/team profiles on legitimate platforms where appropriate. Use actual company identity and domain; never claim a nonexistent local office.
- Pitch the asset to relevant assessment/LMS implementers, digital publishing communities, educational technology writers, and standards-focused communities with personalized relevance.
- Seek guest articles, integration documentation references and pilot case studies earned through genuine collaboration.
- If eligibility is met, evaluate a Google Business Profile; do not create a fake business address for an online-only company.
- Avoid purchased links, private blog networks, link exchanges at scale, mass directory submissions and spammy automated outreach.

**Output:** `seo-audit/10-authority-plan.md` with legitimate prospect categories, asset concept, proof requirements, and an outreach tracking table. Do not claim links were acquired unless verified.

---

## PHASE 11 — AUTOMATED SEO TESTS AND REGRESSION CHECKS (P0)

Add scripts/tests to the repository. Use existing testing framework if available; otherwise install only lightweight justified dependencies.

Cover:

- Expected public URL returns `200`; bad URL returns real `404`.
- No unintended `noindex` or robots blocking on important pages.
- Each intended indexable route has descriptive unique title, description, H1, canonical, and nonempty meaningful rendered content.
- Sitemap XML parses and includes only canonical, indexable public URLs that return successful responses.
- Every sitemap URL uses the intended canonical host; no duplicate paths due to trailing slash policy.
- All internal links are navigable; no broken public assets / alt issues.
- JSON-LD parses; important schema types are present only on correct pages.
- Redirections work and are not cyclic; old-to-new domain mapping is tested if and only if a migration has been approved.
- Mobile navigation and critical contact flows function in browser tests.
- Prerendered HTML contains meaningful text independently of browser JS (when SSG/SSR was chosen).
- No significant bundle-size or performance regressions.

Provide commands such as `npm run build`, `npm run test`, and a new `npm run seo:check` **only if you actually implement those package scripts**. The exact executable commands must match the detected repository stack.

**Gate:** Saved test output and no P0 failures.

---

## PHASE 12 — LAUNCH, VALIDATE, AND ITERATE (P0–P2)

1. Review git diff, check secrets, run build, existing tests, SEO checks and mobile smoke tests.
2. Deploy via existing authorized workflow; do not alter production DNS or move domains without owner sign-off.
3. Re-run the same audit against the live public URLs, not only localhost.
4. Verify headers, robots, sitemap, canonical, noindex, redirects, PageSpeed and the critical lead form on production.
5. With owner access, submit sitemap in Search Console and inspect the most important routes, prioritizing failures instead of mass "request indexing" operations.
6. Recheck indexing status periodically; a submitted sitemap is discovery guidance, **not** proof of indexing.
7. Track SEO progress based on actual Search Console data, technical health, relevant nonbranded impressions/clicks, and **qualified inbound enquiries**, not mere indexed-URL count.

### 30 / 60 / 90 day plan (milestones, not guarantees)

| Time frame | Focus | Measurable evidence |
|---|---|---|
| Days 1–14 | Technical P0 fixes, public page rendering, canonical/sitemap, GSC setup | All planned priority pages crawlable, tests pass, submission confirmed where account access exists |
| Days 15–30 | Priority service pages, truthful proof, conversion tracking | Buyer landing pages published and functioning, forms tested, baseline report saved |
| Days 31–60 | Original technical guides and demos, internal link optimization, initial outreach | 2–4 strong assets only if evidence exists; Search Console impressions/query growth tracked; earned references recorded |
| Days 61–90 | Refresh winners, resolve indexing issues, targeted authority building | Change in qualified nonbranded clicks, query/page performance, demo requests and leads compared with baseline |

Do not manufacture outcomes or promise page-one rankings in 90 days.

---

## PRIORITIZED BACKLOG

**P0 — Blocking discoverability or leads**

- Domain/DNS/HTTPS problem (if verified)
- Indexable pages lack useful HTML, broken production routes or wrong status codes
- Site-wide `noindex` / blocking robots, incorrect canonical, bad redirects
- Missing or broken sitemap for an otherwise ready site
- Broken contact/demo conversion path
- Duplicate service content across two domains with no intentional canonical/migration plan

**P1 — Meaningful improvement**

- Buyer-intent architecture; high-quality service and product landing pages
- Mobile/CWV improvements, strong internal links and unique metadata
- Accurate Organization/Website/Breadcrumb/Article schema where appropriate
- Search Console + conversion attribution
- Useful original implementation guides and demonstration assets

**P2 — Growth / refinement**

- Competitive query iteration, authority outreach, internal link refinements
- Additional verified industry pages, comparison pages and case studies
- Quarterly content updates and product documentation improvements

Do not prioritize meta descriptions over fixing site-wide indexability. Do not prioritize backlinks to pages that do not solve a real customer problem.

---

## REPORTING FORMAT — FOLLOW AFTER EACH PHASE

```text
PHASE: [name]
STATUS: PASS | PARTIAL | BLOCKED

BASELINE / EVIDENCE:
- [observations and how measured]

CHANGES IMPLEMENTED:
- [filename]: [precise change]

TESTS RUN:
- [command/check]: PASS/FAIL and relevant output

REMAINING RISKS:
- [severity and blocker]

OWNER ACTION REQUIRED:
- [only manual/external actions]

NEXT PRIORITY:
- [the next highest-impact phase or issue]
```

At completion produce:

- `SEO_IMPLEMENTATION_REPORT.md`: what changed, why, before/after, results, live deployment status, known issues.
- `seo-audit/00-domains-and-brand.md`
- `seo-audit/01-baseline.md`
- `seo-audit/url-inventory.csv`
- `seo-audit/issues.csv`
- `seo-audit/02-keyword-page-map.csv`
- `seo-audit/02-serp-findings.md`
- `seo-audit/10-authority-plan.md`
- The implemented SEO test suite and commands.
- `SEO_OWNER_ACTIONS.md` with only tasks that require site owner accounts, permissions, or decisions.
- A checklist with real PASS/FAIL/NOT-TESTED, not invented results.

**Definition of done for the code phase:** The deployed public pages meet the site's defined crawl/indexability policy; metadata, internal links, sitemap and structured data are coherent; the user-facing product still works; key lead paths work; smoke tests pass; and Search Console-specific steps are documented or completed with actual authorization. **Definition of success for SEO growth:** qualified organic enquiries rise over time after a fair observation period; rankings alone are insufficient.

---

## PRIMARY SOURCES FOR THE AGENT

Treat current Google guidance as authoritative and verify details if documentation changes:

- [Google Search Essentials](https://developers.google.com/search/docs/essentials)
- [SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide)
- [Google Search technical requirements](https://developers.google.com/search/docs/essentials/technical)
- [JavaScript SEO basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
- [Developers' SEO guide](https://developers.google.com/search/docs/fundamentals/get-started-developers)
- [Sitemap creation](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- [Core Web Vitals](https://developers.google.com/search/docs/appearance/core-web-vitals)
- [Organization structured data](https://developers.google.com/search/docs/appearance/structured-data/organization)
- [Structured data guidelines](https://developers.google.com/search/docs/appearance/structured-data/sd-policies)
- [Google Search Console setup](https://developers.google.com/search/docs/monitor-debug/search-console-start)
- [Site moves and domain migrations](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes)
- [Helpful, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
- [Search spam policies](https://developers.google.com/search/docs/essentials/spam-policies)
