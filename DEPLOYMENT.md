# Deployment

## Production Shape

Deploy the Next.js frontend to Vercel from the `frontend` directory.

Run the backend API and Devpost watcher on Render. `render.yaml` defines:

- `sniper-backend`: a public Hono web service
- `sniper-devpost-worker`: a background worker that runs the continuous Devpost scraper

The worker requires a paid Render instance type. If you want to avoid a persistent worker later, replace it with a Render cron job that runs the watcher with `--once`.

## Render Backend

1. Commit and push `render.yaml`.
2. Open Render Dashboard.
3. Select **New > Blueprint**.
4. Connect the GitHub repository.
5. Use the default Blueprint path: `render.yaml`.
6. Fill in the prompted secret environment variables for both services.

Backend service secret values:

```text
ADMIN_TOKEN=choose-a-long-secret
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
RESEND_API_KEY=your-resend-api-key
RESEND_FROM_EMAIL=Sniper <onboarding@resend.dev>
SCRAPER_USER_AGENT=SniperTalentIndexer/0.1 contact=your-email@example.com
```

Worker secret values:

```text
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
SCRAPER_USER_AGENT=SniperTalentIndexer/0.1 contact=your-email@example.com
```

After Render provisions the web service, copy its public URL. It will look like:

```text
https://sniper-backend.onrender.com
```

Check:

```bash
curl https://sniper-backend.onrender.com/health
```

## Vercel Frontend

Vercel project settings:

```text
Root Directory: frontend
Build Command: npm run build
Install Command: npm ci
```

Environment variables:

```text
NEXT_PUBLIC_API_URL=https://your-backend.example.com
```

Use the Render web service URL for `NEXT_PUBLIC_API_URL`.

After Vercel deploys, optionally tighten Render's `CORS_ORIGIN` from `*` to your Vercel production URL.

## Preflight

Run these before deploying:

```bash
cd backend
npm run build

cd ../frontend
npm run build
```

After deploy, open `/admin`, enter `ADMIN_TOKEN`, and confirm ingestion runs are visible.
