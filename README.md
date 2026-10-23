# Husimi

Monorepo for the Husimi public website and the staff-only Husimi Workspace.

| App | Path | Domain | Purpose |
|---|---|---|---|
| Website | `apps/website` | husimisolutions.com | Public marketing site (prerendered, SEO) |
| Workspace | `apps/workspace` | workspace.husimisolutions.com | Staff tool: OCR, Batch Creator, validation, QTI/JSON export |

```
apps/
  website/     Vite + React marketing site, prerender and SEO scripts
  workspace/   Vite + React staff app, validation engine, tests, fixtures
packages/
  brand/       Shared design tokens, fonts and base styles (@husimi/brand)
supabase/      Edge functions and database migrations (used by the workspace)
docs/          Project documentation
```

The two apps share only `@husimi/brand`. The website has no login and no
Supabase dependency; the workspace is staff-only and is never indexed.

## Getting started

Requires Node.js 20+ and npm.

```bash
npm install            # installs every app and package (npm workspaces)
cp .env.example .env   # Supabase settings, used by the workspace
```

| Command | What it does |
|---|---|
| `npm run dev:website` | Website dev server |
| `npm run dev:workspace` | Workspace dev server (port 5174) |
| `npm run build` | Build both apps |
| `npm run build:website` / `npm run build:workspace` | Build one app |
| `npm run typecheck` | Type-check both apps |
| `npm test` | Workspace test suite |
| `npm run seo:check` | Website sitemap, robots and prerender checks |

Commands specific to one app (for example the validator regression scripts)
run with `-w`, e.g. `npm run test:validator:regression -w @husimi/workspace`.

## Accounts

The workspace has no self-service sign-up, email verification or password
reset. Staff accounts are created and managed in the Supabase dashboard
(Authentication → Users), with public sign-ups disabled.

## Deployment

Each app is its own Vercel project:

| Vercel project | Root Directory | Environment variables |
|---|---|---|
| Website | `apps/website` | optional `VITE_SITE_URL` (defaults to the production domain) |
| Workspace | `apps/workspace` | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`; optional bucket names `VITE_SUPABASE_STORAGE_BUCKET`, `VITE_SUPABASE_OCR_BUCKET`, `VITE_SUPABASE_OCR_DIAGRAM_BUCKET` |

Edge functions in `supabase/functions` deploy separately with
`supabase functions deploy <name>`.
