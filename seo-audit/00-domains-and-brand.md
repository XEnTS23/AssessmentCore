# Phase 0: Domains & Brand Architecture Verification

**Generated:** 2026-10-15  
**Auditor:** Senior SEO Engineer / Full-Stack Developer (Antigravity)  
**Status:** BLOCKED ON PRODUCTION DNS / OWNER ACTION (Codebase prepared)

---

## 1. Domain Resolution & Live Probe Matrix

Probes executed directly against live production DNS and HTTP endpoints on 2026-10-15:

| Host / URL | DNS / Provider | HTTP Status | Canonical Header / Tag | Live Content Served | Health / Risk |
|---|---|---|---|---|---|
| `http://husimisolutions.com` | Hostinger DNS / Cloudflare | 200 | None | Hostinger Parked Page (`title: Parked Domain name on Hostinger DNS system`) | **CRITICAL FAILURE**: Apex domain not routed to Vercel deployment |
| `https://husimisolutions.com` | Hostinger DNS / Cloudflare | 200 | None | Hostinger Parked Page | **CRITICAL FAILURE**: Public search engines crawl parking page |
| `http://www.husimisolutions.com` | Cloudflare / Vercel | 308 -> `https://www.husimisolutions.com/` | N/A | Redirect to HTTPS www | Expected |
| `https://www.husimisolutions.com/` | Cloudflare / Vercel | 200 | `https://assessmentcore.vercel.app` (Stale) | Legacy SPA build (`title: AssessmentCore \| PDF-to-QTI assessment platform`) | **HIGH**: Outdated canonical pointing to vercel.app; outdated branding |
| `http://assessmentcore.in` | Vercel DNS | 308 -> `https://assessmentcore.in/` | N/A | Redirect to HTTPS apex | Expected |
| `https://assessmentcore.in` | Vercel DNS | 308 -> `https://www.assessmentcore.in/` | N/A | Redirect to www.assessmentcore.in | Expected |
| `https://www.assessmentcore.in/` | Vercel DNS | 200 | `https://assessmentcore.vercel.app` (Stale) | Legacy SPA build (`title: AssessmentCore \| PDF-to-QTI assessment platform`) | Dual-branded legacy production site |

---

## 2. Brand & Domain Architecture Decision

### Relationship between Husimi and AssessmentCore
1. **Husimi (`husimisolutions.com`)**: The parent business and primary agency/services brand ("Assessment Content Services & Technology").
2. **AssessmentCore (`assessmentcore.in`)**: The proprietary assessment conversion/validation software platform (product / internal tool / legacy domain).
3. **Canonical Production Target**: The target domain designated in `public/robots.txt`, `public/sitemap.xml`, `index.html`, and `src/app/components/SeoManager.tsx` is `https://husimisolutions.com`.

### Critical Architecture Defect
- The codebase assumes `https://husimisolutions.com` (apex) as canonical.
- In DNS, the apex `husimisolutions.com` is parked at Hostinger!
- Meanwhile, `www.husimisolutions.com` is routed to Vercel.
- **Immediate Owner Action Needed**: Update Hostinger / Cloudflare DNS A/ALIAS records for `husimisolutions.com` to point to Vercel (`76.76.21.21`), or designate `www.husimisolutions.com` as canonical and 301 redirect apex to www in Cloudflare.
- Do NOT perform domain cutovers or DNS switches automatically without owner authorization.

---

## 3. Recommended Production Redirect Map

Once DNS is routed to Vercel:

```text
http://husimisolutions.com        301 -> https://husimisolutions.com/
http://www.husimisolutions.com    301 -> https://husimisolutions.com/
https://www.husimisolutions.com   301 -> https://husimisolutions.com/

# AssessmentCore legacy domain mapping (when approved for migration):
https://www.assessmentcore.in/    301 -> https://husimisolutions.com/
https://assessmentcore.in/        301 -> https://husimisolutions.com/
https://assessmentcore.in/workspace -> https://workspace.husimisolutions.com/ or https://husimisolutions.com/workspace
```

---

## 4. Required Owner Actions (Account Access Required)

1. **Hostinger / Cloudflare DNS**:
   - Point apex `husimisolutions.com` to Vercel (`76.76.21.21` or CNAME configured in Vercel project settings).
   - Ensure `husimisolutions.com` and `www.husimisolutions.com` are both added to the Vercel project domains, with `husimisolutions.com` set as the Primary Domain (redirecting www to apex, or vice versa).
2. **Google Search Console**:
   - Add Domain Property for `husimisolutions.com` via DNS TXT record.
   - Verify existing GSC property for `assessmentcore.in` to monitor historical search traffic before any redirect activation.
