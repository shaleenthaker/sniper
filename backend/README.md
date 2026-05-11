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
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
DEVPOST_INDEXER_TOKEN=
LINKEDIN_DETECTION_TOKEN=
```

The current demo API uses in-memory seed data, so only `PORT` is read.

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
