# Sniper

Recruiter-facing browser for hackathon talent. Recruiters search for specific signals such as tech stack, hackathon, or project archetype, then move through ranked developers, project histories, podiums, and outgoing offer status.

The product is built around pre-LinkedIn signal: Devpost submissions are indexed and surfaced before a winner posts about the result elsewhere, giving recruiters a narrow outreach window.

No applicant-facing workflow. No OA flow. No scoring system.

## Apps

`backend/` is a Hono + TypeScript API on port `8080`.

`frontend/` is a Next.js 15 App Router UI on port `3000`.

## Run Locally

Backend:

```bash
cd backend
npm install
npm run dev
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

The frontend defaults to `NEXT_PUBLIC_API_URL=http://localhost:8080`.

## Live Devpost Data

1. Run `backend/supabase/schema.sql` in the Supabase SQL editor.
2. Put `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `backend/.env`.
3. Scrape a Devpost gallery:

```bash
cd backend
npm run scrape:devpost -- --url https://thx.devpost.com/project-gallery --max-pages 1 --max-projects 24
```

Or automatically discover ended Devpost hackathons and scrape each project gallery:

```bash
npm run scrape:devpost:all -- --max-list-pages 1 --max-hackathons 5 --max-project-pages 1 --max-projects-per-hackathon 24
```

For an uncapped run across all discovered ended hackathons:

```bash
npm run scrape:devpost:all -- --all --yes
```

Uncapped runs can take hours. Start with the capped command first.

4. Set `DATA_SOURCE=supabase` in `backend/.env` and restart the backend.

The same API routes then serve scraped Supabase data instead of the local seed.

## Demo Branch Email Flow

On the `demo` branch, `DEMO_MODE=true` forces the backend to use the hardcoded demo dataset with `Shaleen Thaker` as the top developer.

For a live email demo, set these in `backend/.env`:

```bash
DEMO_MODE=true
DEMO_RECIPIENT_EMAIL=you@example.com
RESEND_API_KEY=your_resend_key
RESEND_FROM_EMAIL="Your Name <you@yourdomain.com>"
```

Then start the backend and frontend. Open `/developers`, choose `Shaleen Thaker`, and click `+EMAIL`.

## Verification

```bash
cd backend && npm run build
cd frontend && npm run build
```

## Core API

`GET /api/developers`

`GET /api/developers/:id`

`GET /api/hackathons`

`GET /api/hackathons/:slug`

`GET /api/projects`

`GET /api/projects/:id`

`GET /api/feed/fresh`

`GET /api/graph`

`GET /api/offers`

`POST /api/offers`

`PATCH /api/offers/:id`
