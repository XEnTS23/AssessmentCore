# Actions Requiring Owner Account Access & Authorization

**Target Domain:** `https://husimisolutions.com`  
**Current Date:** 2026-10-15  
**Severity:** CRITICAL / BLOCKING

The codebase and build pipelines have been fully updated, verified, and equipped with automated SEO prerendering and validation tests. However, several critical infrastructure and configuration tasks require your direct administrative access to third-party provider dashboards.

---

## 1. Domain & DNS Configuration (CRITICAL / BLOCKING)

### Current Live Status
- **Hostinger DNS / Apex Domain**: `https://husimisolutions.com` currently resolves to a Hostinger Parking page (`title: Parked Domain name on Hostinger DNS system`).
- **Cloudflare / www Domain**: `https://www.husimisolutions.com` is connected to Vercel.
- **Vercel Project**: The project has canonical references set to `https://husimisolutions.com` (apex).

### Required Actions in Hostinger / Cloudflare:
1. Log in to your DNS provider (Hostinger and/or Cloudflare).
2. Update the `@` (apex) DNS record for `husimisolutions.com`:
   - Point the `A` record to Vercel's IP: `76.76.21.21` (or CNAME flattening if on Cloudflare).
3. In Vercel Project Settings > Domains:
   - Ensure both `husimisolutions.com` and `www.husimisolutions.com` are present.
   - Choose one canonical host:
     - **Option A (Recommended)**: Set `husimisolutions.com` as Primary Domain, and configure `www.husimisolutions.com` to redirect to `husimisolutions.com` (308/301).
     - **Option B**: If you prefer `www.husimisolutions.com` as primary, let us know so we update canonical URLs to www.

---

## 2. Google Search Console Verification

### Required Actions:
1. Go to [Google Search Console](https://search.google.com/search-console).
2. Add a **Domain Property** for `husimisolutions.com`.
3. Copy the verification DNS TXT token and paste it into your DNS records (Hostinger / Cloudflare).
4. Note: A meta tag verification (`<meta name="google-site-verification" content="ZD6_0UQF7d_9lE2IdJVmESpPIBUuiY1D2ctYQQYXYzI" />`) is already present in `index.html`. If you control the URL-prefix property for `https://husimisolutions.com/`, it can verify automatically once DNS points to Vercel.
5. In Search Console, navigate to **Sitemaps** and submit:
   ```text
   https://husimisolutions.com/sitemap.xml
   ```

---

## 3. Legacy Domain Migration (assessmentcore.in -> husimisolutions.com)

### Decision & Approval Needed:
- Currently, `https://www.assessmentcore.in` is live on Vercel.
- Once you approve consolidating the legacy brand into Husimi:
  - Configure permanent 301 redirects in Vercel or Cloudflare:
    ```text
    https://assessmentcore.in/*      -> https://husimisolutions.com/$1
    https://www.assessmentcore.in/*  -> https://husimisolutions.com/$1
    ```
  - Submit a **Change of Address** in Google Search Console from `assessmentcore.in` to `husimisolutions.com`.
- Do **not** execute domain cutovers until you explicitly approve the timing.
