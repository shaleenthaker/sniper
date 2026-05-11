# Sniper Backend

Hono + TypeScript API for a recruiter-facing hackathon talent browser. The service runs on port `8080` by default and returns JSON for every route.

## Setup

```bash
npm install
npm run dev
```

Build check:

```bash
npm run build
```

## Environment

Create `backend/.env` locally if needed. Do not commit real values.

```bash
PORT=
DATA_SOURCE=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
DEVPOST_INDEXER_TOKEN=
LINKEDIN_DETECTION_TOKEN=
INGEST_TOKEN=
SCRAPER_USER_AGENT=
DEVPOST_SCRAPE_DELAY_MS=
DEVPOST_HACKATHON_DELAY_MS=
RESEND_API_KEY=
RESEND_KEY=
RESEND_FROM_EMAIL=
```

`DATA_SOURCE=mock` uses the seeded in-memory demo data. `DATA_SOURCE=supabase` makes the existing API routes read from Supabase.

`INGEST_TOKEN` is optional. If set, `POST /api/ingest/devpost` requires `Authorization: Bearer <token>`.

`RESEND_API_KEY` powers recruiter email sending. `RESEND_KEY` is also accepted as a fallback variable name. `RESEND_FROM_EMAIL` should be a verified Resend sender; if omitted, the backend uses `Sniper <onboarding@resend.dev>` for testing.

## Supabase Setup

Run `backend/supabase/schema.sql` in the Supabase SQL editor before the first live ingestion.

The schema creates:

`developers`, `hackathons`, `projects`, `project_members`, `offers`, and `ingestion_runs`.

The backend uses `SUPABASE_SERVICE_ROLE_KEY` server-side only. Do not expose it to the frontend.

## Devpost Ingestion

Dry run one page and one project without writing to Supabase:

```bash
npm run scrape:devpost -- --url https://thx.devpost.com/project-gallery --max-pages 1 --max-projects 1 --dry-run
```

Save a Devpost hackathon gallery to Supabase:

```bash
npm run scrape:devpost -- --url https://thx.devpost.com/project-gallery --max-pages 2 --max-projects 48
```

The scraper reads public Devpost gallery pages and project pages. It extracts hackathon metadata, projects, stack tags, Devpost team members, avatars, and winner badges. When `--no-podium` is not passed, the first three winner-badged projects in gallery order are assigned placements `1`, `2`, and `3` as a best-effort podium.

Automatically discover ended public Devpost hackathons and scrape their galleries:

```bash
npm run scrape:devpost:all -- --max-list-pages 1 --max-hackathons 5 --max-project-pages 1 --max-projects-per-hackathon 24
```

Dry run automatic discovery without Supabase writes:

```bash
npm run scrape:devpost:all -- --max-list-pages 1 --max-hackathons 2 --max-project-pages 1 --max-projects-per-hackathon 1 --dry-run
```

Run uncapped discovery across all ended hackathon listing pages:

```bash
npm run scrape:devpost:all -- --all --yes
```

Uncapped mode can take hours and makes many public Devpost requests. Use `DEVPOST_SCRAPE_DELAY_MS` and `DEVPOST_HACKATHON_DELAY_MS` to slow it down. The writes are upserts, so the command can be rerun.

You can also ingest through the API:

```bash
curl -X POST http://localhost:8080/api/ingest/devpost \
  -H 'content-type: application/json' \
  -d '{"url":"https://thx.devpost.com/project-gallery","max_pages":1,"max_projects":12}'
```

With `INGEST_TOKEN` set:

```bash
curl -X POST http://localhost:8080/api/ingest/devpost \
  -H 'authorization: Bearer <token>' \
  -H 'content-type: application/json' \
  -d '{"url":"https://thx.devpost.com/project-gallery","max_pages":1,"max_projects":12}'
```

Automatic ingestion through the API:

```bash
curl -X POST http://localhost:8080/api/ingest/devpost/all \
  -H 'content-type: application/json' \
  -d '{"max_list_pages":1,"max_hackathons":5,"max_project_pages":1,"max_projects_per_hackathon":24}'
```

Uncapped API ingestion requires both `all=true` and `confirm=true`.

## Endpoints

`GET /api/developers?stack=react,typescript&placed_top=3&has_offer=false&sort=signal_lead&limit=50`

```json
{ "developers": [{ "id": "dev-ada-kim", "name": "Ada Kim", "stack": ["hono", "postgres", "react", "typescript"] }], "cursor": null }
```

`GET /api/developers/:id`

```json
{ "developer": { "id": "dev-ada-kim", "name": "Ada Kim" }, "projects": [], "hackathons": [], "links": { "devpost": "https://devpost.com/adak" } }
```

`GET /api/hackathons?q=hack&year=2025`

```json
{ "hackathons": [{ "slug": "hackmit-2025", "name": "HackMIT 2025" }] }
```

`GET /api/hackathons/:slug`

```json
{ "hackathon": { "slug": "hackmit-2025" }, "podium": [{ "rank": 1, "project": {}, "members": [], "offered_to": [] }], "all_winners": [] }
```

`GET /api/projects/:id`

```json
{ "project": { "id": "proj-001" }, "hackathon": {}, "members": [], "stack": ["react"], "devpost_url": "https://devpost.com/software/proj-001", "won": 1 }
```

`GET /api/projects?q=graph&hackathon=hackmit-2025`

```json
{ "projects": [{ "id": "proj-001", "title": "Latency Lens" }] }
```

`GET /api/feed/fresh?since=2025-11-01T00:00:00Z&stack=react`

```json
{ "items": [{ "project": {}, "hackathon": {}, "members": [], "indexed_at": "2025-11-09T20:45:00Z", "hours_since_indexed": 162.25, "linkedin_detected": false }] }
```

`GET /api/graph?center=developer:dev-ada-kim&depth=2`

```json
{ "nodes": [{ "id": "developer:dev-ada-kim", "type": "developer", "label": "Ada Kim" }], "edges": [] }
```

`GET /api/offers`

```json
{ "offers": [{ "id": "offer-001", "developer_id": "dev-ada-kim", "status": "sent" }] }
```

`POST /api/offers`

```json
{
  "developer_id": "dev-ada-kim",
  "role_title": "Founding frontend engineer",
  "sender_name": "Mara Stone",
  "sender_email": "mara@example.com",
  "notes": "Reach out this week"
}
```

Response:

```json
{ "offer": { "id": "offer-004", "developer_id": "dev-ada-kim", "status": "sent" } }
```

`PATCH /api/offers/:id`

```json
{ "status": "rejected" }
```

Response:

```json
{ "offer": { "id": "offer-001", "status": "rejected" } }
```

`POST /api/developers/:id/email`

```json
{
  "to": "candidate@example.com",
  "subject": "Quick note about your hackathon work",
  "message": "I saw your project and would like to talk.",
  "sender_name": "Mara Stone",
  "sender_email": "mara@example.com"
}
```

Response:

```json
{ "email": { "id": "resend_email_id", "to": "candidate@example.com", "developer_id": "devpost-handle" } }
```

`POST /api/ingest/devpost`

```json
{
  "url": "https://thx.devpost.com/project-gallery",
  "slug": "tamuhack-x",
  "max_pages": 1,
  "max_projects": 12,
  "assign_podium": true,
  "dry_run": false
}
```

Response:

```json
{
  "dry_run": false,
  "source_url": "https://thx.devpost.com/project-gallery?page=1",
  "projects_found": 12,
  "hackathon": { "slug": "tamuhack-x", "name": "TAMUhack X" },
  "projects_saved": 12,
  "developers_saved": 34,
  "project_members_saved": 41
}
```

`POST /api/ingest/devpost/all`

```json
{
  "status": "ended",
  "query": "ai",
  "max_list_pages": 1,
  "max_hackathons": 5,
  "max_project_pages": 1,
  "max_projects_per_hackathon": 24,
  "assign_podium": true,
  "dry_run": false
}
```

Response:

```json
{
  "dry_run": false,
  "status": "ended",
  "pages_scanned": 1,
  "hackathons_discovered": 5,
  "hackathons_succeeded": 5,
  "hackathons_failed": 0,
  "projects_saved": 82,
  "developers_saved": 211
}
```
