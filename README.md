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

Automatic discovery prioritizes high-profile hackathons first using registration count, winner-announced state, recency, organizer names, and keywords.

Run the scraper continuously:

```bash
npm run scrape:devpost:watch -- --max-list-pages 3 --max-hackathons 10 --max-project-pages 1 --max-projects-per-hackathon 24
```

The watcher skips hackathons attempted in the last 24 hours by default, so it keeps moving through prioritized events instead of reprocessing the same few galleries every cycle.

For an uncapped run across all discovered ended hackathons:

```bash
npm run scrape:devpost:all -- --all --yes
```

Uncapped runs can take hours. Start with the capped command first.

4. Set `DATA_SOURCE=supabase` in `backend/.env` and restart the backend.

The same API routes then serve scraped Supabase data instead of the local seed.

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
