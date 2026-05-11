import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import "./env.js";
import { getEnv } from "./env.js";
import { ingestAllDevpostHackathons, ingestDevpostHackathon } from "./ingest.js";
import {
  createOffer,
  getDeveloper,
  getGraph,
  getHackathon,
  getProject,
  listDevelopers,
  listFreshSignals,
  listHackathons,
  listOffers,
  listProjects,
  updateOffer
} from "./repository.js";

const app = new Hono();

app.use("*", cors({ origin: "*", allowMethods: ["GET", "POST", "PATCH", "OPTIONS"] }));

app.get("/health", (c) => c.json({ ok: true }));

app.get("/api/developers", async (c) => {
  return c.json(await listDevelopers(new URL(c.req.url).searchParams));
});

app.get("/api/developers/:id", async (c) => {
  const developer = await getDeveloper(c.req.param("id"));
  if (!developer) return c.json({ error: "Developer not found" }, 404);
  return c.json(developer);
});

app.get("/api/hackathons", async (c) => c.json(await listHackathons(new URL(c.req.url).searchParams)));

app.get("/api/hackathons/:slug", async (c) => {
  const hackathon = await getHackathon(c.req.param("slug"));
  if (!hackathon) return c.json({ error: "Hackathon not found" }, 404);
  return c.json(hackathon);
});

app.get("/api/projects", async (c) => c.json(await listProjects(new URL(c.req.url).searchParams)));

app.get("/api/projects/:id", async (c) => {
  const project = await getProject(c.req.param("id"));
  if (!project) return c.json({ error: "Project not found" }, 404);
  return c.json(project);
});

app.get("/api/feed/fresh", async (c) => c.json(await listFreshSignals(new URL(c.req.url).searchParams)));

app.get("/api/graph", async (c) => {
  const params = new URL(c.req.url).searchParams;
  return c.json(await getGraph(params.get("center") ?? undefined, Number(params.get("depth") ?? 2)));
});

app.get("/api/offers", async (c) => c.json(await listOffers()));

app.post("/api/offers", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body?.developer_id || !body?.role_title || !body?.sender_name || !body?.sender_email) {
    return c.json({ error: "developer_id, role_title, sender_name, and sender_email are required" }, 400);
  }
  return c.json({ offer: await createOffer(body) }, 201);
});

app.patch("/api/offers/:id", async (c) => {
  const body = await c.req.json().catch(() => null);
  const allowed = ["sent", "accepted", "rejected", "withdrawn"];
  if (!allowed.includes(body?.status)) return c.json({ error: "Invalid status" }, 400);
  const offer = await updateOffer(c.req.param("id"), body.status);
  if (!offer) return c.json({ error: "Offer not found" }, 404);
  return c.json({ offer });
});

app.post("/api/ingest/devpost", async (c) => {
  const token = getEnv("INGEST_TOKEN");
  if (token && c.req.header("authorization") !== `Bearer ${token}`) return c.json({ error: "Unauthorized" }, 401);
  const body = await c.req.json().catch(() => null);
  if (!body?.url) return c.json({ error: "url is required" }, 400);
  const result = await ingestDevpostHackathon({
    url: body.url,
    slug: body.slug,
    maxPages: body.max_pages,
    maxProjects: body.max_projects,
    assignPodium: body.assign_podium ?? true,
    dryRun: body.dry_run ?? false
  });
  return c.json(result, body.dry_run ? 200 : 201);
});

app.post("/api/ingest/devpost/all", async (c) => {
  const token = getEnv("INGEST_TOKEN");
  if (token && c.req.header("authorization") !== `Bearer ${token}`) return c.json({ error: "Unauthorized" }, 401);
  const body = await c.req.json().catch(() => ({}));
  if (body.all && body.confirm !== true) {
    return c.json({ error: "Uncapped Devpost ingestion requires confirm=true" }, 400);
  }
  const uncapped = body.all === true;
  const result = await ingestAllDevpostHackathons({
    status: body.status ?? "ended",
    query: body.query,
    maxListPages: uncapped ? undefined : body.max_list_pages ?? 1,
    maxHackathons: uncapped ? undefined : body.max_hackathons ?? 5,
    maxProjectPages: uncapped ? undefined : body.max_project_pages ?? 1,
    maxProjectsPerHackathon: uncapped ? undefined : body.max_projects_per_hackathon ?? 24,
    assignPodium: body.assign_podium ?? true,
    dryRun: body.dry_run ?? false
  });
  return c.json(result, body.dry_run ? 200 : 201);
});

const port = Number(process.env.PORT ?? 8080);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`sniper api listening on http://localhost:${info.port}`);
});
