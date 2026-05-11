# Sniper Frontend

Next.js 15 App Router frontend for the recruiter-facing hackathon talent browser. It runs on port `3000` and reads from the Hono API on port `8080`.

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

```bash
NEXT_PUBLIC_API_URL=http://localhost:8080
```

If `NEXT_PUBLIC_API_URL` is not set, the app defaults to `http://localhost:8080`.

## Folder Structure

`src/app` contains App Router routes and route-specific UI.

`src/components` contains the persistent shell, command palette, offer modal, and shared loading/error states.

`src/lib/api.ts` centralizes typed backend calls through React Query.

`src/lib/types.ts` mirrors the backend product types.

## Routes

`/` recruiter dashboard with index stats, live fresh feed, and saved searches.

`/developers` searchable developer table with URL-backed filters.

`/developers/[id]` developer profile with hackathon history and offer action.

`/hackathons` hackathon index.

`/hackathons/[slug]` podium, fallback labels, leaderboard, and submissions.

`/projects` project index.

`/projects/[id]` project detail with team, stack, and Devpost link.

`/graph` force-directed entity graph.

`/feed` fresh pre-LinkedIn signal feed.

`/offers` outgoing offers and status updates.

## Design Tokens

Type is monospace throughout. The intended UI font is JetBrains Mono with IBM Plex Mono available for headings when installed on the host.

```css
--bg: #0B0B0A;
--bg-elev: #131311;
--bg-hover: #1B1A17;
--ink: #E8E4D8;
--ink-mid: #9A9588;
--ink-soft: #5E5A50;
--rule: #2A2823;
--accent: #D4A24C;
--accent-soft: #D4A24C1F;
--signal: #6FCF97;
--offered: #B23A1F;
```

## Data Source

The frontend always calls `NEXT_PUBLIC_API_URL`. To switch from the seeded local API to another backend, set that variable before running or deploying:

```bash
NEXT_PUBLIC_API_URL=https://api.example.com npm run dev
```
