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
