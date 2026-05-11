import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import {
  buildGraph,
  createOffer,
  developerAppearances,
  developerById,
  developerProjects,
  freshSignals,
  hackathonBySlug,
  latestOfferForDeveloper,
  membersFor,
  offers,
  podiumFor,
  projectById,
  projects,
  queryDevelopers,
  queryHackathons,
  queryProjects,
  updateOffer
} from "./data.js";

const app = new Hono();

app.use("*", cors({ origin: "*", allowMethods: ["GET", "POST", "PATCH", "OPTIONS"] }));

app.get("/health", (c) => c.json({ ok: true }));

app.get("/api/developers", (c) => {
  const result = queryDevelopers(new URL(c.req.url).searchParams);
  return c.json({
    developers: result.developers.map((developer) => ({ ...developer, offer: latestOfferForDeveloper(developer.id) })),
    cursor: result.cursor
  });
});

app.get("/api/developers/:id", (c) => {
  const developer = developerById(c.req.param("id"));
  if (!developer) return c.json({ error: "Developer not found" }, 404);
  return c.json({
    developer: { ...developer, offer: latestOfferForDeveloper(developer.id) },
    projects: developerProjects(developer.id),
    hackathons: developerAppearances(developer.id),
    links: developer.links
  });
});

app.get("/api/hackathons", (c) => c.json({ hackathons: queryHackathons(new URL(c.req.url).searchParams) }));

app.get("/api/hackathons/:slug", (c) => {
  const hackathon = hackathonBySlug(c.req.param("slug"));
  if (!hackathon) return c.json({ error: "Hackathon not found" }, 404);
  const hackathonProjects = projects.filter((project) => project.hackathon_slug === hackathon.slug);
  return c.json({
    hackathon,
    podium: podiumFor(hackathon.slug),
    all_winners: hackathonProjects.filter((project) => project.placement).sort((a, b) => (a.placement ?? 99) - (b.placement ?? 99)),
    submissions: hackathonProjects.sort((a, b) => (a.placement ?? 99) - (b.placement ?? 99))
  });
});

app.get("/api/projects", (c) => c.json({ projects: queryProjects(new URL(c.req.url).searchParams) }));

app.get("/api/projects/:id", (c) => {
  const project = projectById(c.req.param("id"));
  if (!project) return c.json({ error: "Project not found" }, 404);
  return c.json({
    project,
    hackathon: hackathonBySlug(project.hackathon_slug),
    members: membersFor(project).map((developer) => ({ ...developer, offer: latestOfferForDeveloper(developer.id) })),
    stack: project.stack,
    devpost_url: project.devpost_url,
    won: project.placement
  });
});

app.get("/api/feed/fresh", (c) => c.json({ items: freshSignals(new URL(c.req.url).searchParams) }));

app.get("/api/graph", (c) => {
  const params = new URL(c.req.url).searchParams;
  return c.json(buildGraph(params.get("center") ?? undefined, Number(params.get("depth") ?? 2)));
});

app.get("/api/offers", (c) => c.json({ offers }));

app.post("/api/offers", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body?.developer_id || !body?.role_title || !body?.sender_name || !body?.sender_email) {
    return c.json({ error: "developer_id, role_title, sender_name, and sender_email are required" }, 400);
  }
  if (!developerById(body.developer_id)) return c.json({ error: "Developer not found" }, 404);
  return c.json({ offer: createOffer(body) }, 201);
});

app.patch("/api/offers/:id", async (c) => {
  const body = await c.req.json().catch(() => null);
  const allowed = ["sent", "accepted", "rejected", "withdrawn"];
  if (!allowed.includes(body?.status)) return c.json({ error: "Invalid status" }, 400);
  const offer = updateOffer(c.req.param("id"), body.status);
  if (!offer) return c.json({ error: "Offer not found" }, 404);
  return c.json({ offer });
});

const port = Number(process.env.PORT ?? 8080);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`sniper api listening on http://localhost:${info.port}`);
});
