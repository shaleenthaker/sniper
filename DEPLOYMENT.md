# Deployment

This repo can run without paid always-on hosting:

- Frontend: Vercel project from `frontend/`
- Backend API: Vercel project from `backend/`
- Scraper: GitHub Actions scheduled workflow
- Database: Supabase
- Email: Resend

The tradeoff is that scraping is scheduled every 6 hours instead of continuously running in a paid worker.

## Backend API on Vercel

Create a Vercel project from the same GitHub repo with:

```text
Root Directory: backend
Framework Preset: Other
Build Command: npm run build
Install Command: npm ci
```

Environment variables:

```text
DATA_SOURCE=supabase
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
ADMIN_TOKEN=choose-a-long-secret
CORS_ORIGIN=*
RESEND_API_KEY=your-resend-api-key
RESEND_FROM_EMAIL=Sniper <onboarding@resend.dev>
SCRAPER_USER_AGENT=SniperTalentIndexer/0.1 contact=your-email@example.com
NODEJS_HELPERS=0
```

After deploy, copy the backend URL. It will look like:

```text
https://sniper-backend.vercel.app
```

Check:

```bash
curl https://sniper-backend.vercel.app/api/health
```

## Frontend on Vercel

Create a second Vercel project from the same GitHub repo with:

```text
Root Directory: frontend
Framework Preset: Next.js
Build Command: npm run build
Install Command: npm ci
```

Environment variables:

```text
NEXT_PUBLIC_API_URL=https://your-backend-vercel-url.vercel.app
```

After the frontend deploys, optionally tighten backend `CORS_ORIGIN` from `*` to your frontend Vercel URL.

## Scraper on GitHub Actions

The workflow at `.github/workflows/devpost-scrape.yml` runs every 6 hours and can also be run manually from the GitHub Actions tab.

Add these repository secrets in GitHub:

```text
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
SCRAPER_USER_AGENT=SniperTalentIndexer/0.1 contact=your-email@example.com
```

Optional repository variables:

```text
DEVPOST_PRIORITY_KEYWORDS=hackmit,treehacks,cal hacks,ai,openai,stanford,berkeley
DEVPOST_PRIORITY_ORGANIZERS=mit,stanford,uc berkeley,major league hacking,openai
```

GitHub Actions is free for public repositories. Private repositories get a monthly free quota on GitHub Free; if you want a hard zero-cost guarantee, set your GitHub Actions spending limit to `$0`.

## Preflight

Run these before deploying:

```bash
cd backend
npm run build

cd ../frontend
npm run build
```

After deploy, open `/admin`, enter `ADMIN_TOKEN`, and confirm ingestion runs are visible.
