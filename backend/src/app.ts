import { createHash, timingSafeEqual } from "node:crypto";
import { Hono } from "hono";
import type { Context } from "hono";
import { cors } from "hono/cors";
import "./env.js";
import { getEnv } from "./env.js";
import { sendDeveloperEmail } from "./email.js";
import { ingestAllDevpostHackathons, ingestDevpostHackathon } from "./ingest.js";
import {
  createOffer,
  getDeveloper,
  getGraph,
  getHackathon,
  getIngestionOverview,
  getProject,
  listDevelopers,
  listFreshSignals,
  listHackathons,
  listOffers,
  listProjects,
  updateOffer
} from "./repository.js";

const app: Hono = new Hono();

app.use("*", cors({
  origin: getEnv("CORS_ORIGIN") ?? "*",
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "PATCH", "OPTIONS"]
}));

function configuredAdminToken() {
  return getEnv("ADMIN_TOKEN") ?? getEnv("INGEST_TOKEN");
}

function tokenDigest(value: string) {
  return createHash("sha256").update(value).digest();
}

function safeTokenEquals(actual: string, expected: string) {
  return timingSafeEqual(tokenDigest(actual), tokenDigest(expected));
}

function bearerToken(c: Context) {
  const header = c.req.header("authorization") ?? "";
  const [scheme, token] = header.split(" ");
  return scheme?.toLowerCase() === "bearer" && token ? token : null;
}

function isAdminRequest(c: Context) {
  const expected = configuredAdminToken();
  const actual = bearerToken(c);
  if (!expected || !actual) return false;
  return safeTokenEquals(actual, expected);
}

function requireAdmin(c: Context) {
  if (isAdminRequest(c)) return null;
  return c.json({ error: "Unauthorized" }, 401);
}

function integerBodyValue(value: unknown, fallback: number, max: number, min = 1) {
  const parsed = typeof value === "number" || typeof value === "string" ? Number(value) : fallback;
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

function optionalIntegerBodyValue(value: unknown, max: number, min = 0) {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = typeof value === "number" || typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(parsed)) return undefined;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

function devpostGalleryUrl(value: unknown) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    const isDevpostHost = url.hostname === "devpost.com" || url.hostname.endsWith(".devpost.com");
    if (url.protocol !== "https:" || !isDevpostHost) return null;
    if (!url.pathname.includes("project-gallery")) url.pathname = "/project-gallery";
    return url.toString();
  } catch {
    return null;
  }
}

function boundedGraphDepth(value: string | null) {
  return integerBodyValue(value ?? 2, 2, 3, 0);
}

app.onError((error, c) => {
  console.error(error);
  return c.json({ error: "Internal server error" }, 500);
});

app.notFound((c) => c.json({ error: "Not found" }, 404));

app.get("/", (c) => c.json({ ok: true, service: "sniper-backend" }));
app.get("/health", (c) => c.json({ ok: true }));
app.get("/api/health", (c) => c.json({ ok: true }));

app.get("/api/developers", async (c) => {
  return c.json(await listDevelopers(new URL(c.req.url).searchParams, { includeOffers: isAdminRequest(c) }));
});

app.get("/api/developers/:id", async (c) => {
  const developer = await getDeveloper(c.req.param("id"), { includeOffers: isAdminRequest(c) });
  if (!developer) return c.json({ error: "Developer not found" }, 404);
  return c.json(developer);
});

app.get("/api/hackathons", async (c) => c.json(await listHackathons(new URL(c.req.url).searchParams)));

app.get("/api/hackathons/:slug", async (c) => {
  const hackathon = await getHackathon(c.req.param("slug"), { includeOffers: isAdminRequest(c) });
  if (!hackathon) return c.json({ error: "Hackathon not found" }, 404);
  return c.json(hackathon);
});

app.get("/api/projects", async (c) => c.json(await listProjects(new URL(c.req.url).searchParams)));

app.get("/api/projects/:id", async (c) => {
  const project = await getProject(c.req.param("id"), { includeOffers: isAdminRequest(c) });
  if (!project) return c.json({ error: "Project not found" }, 404);
  return c.json(project);
});

app.get("/api/feed/fresh", async (c) => c.json(await listFreshSignals(new URL(c.req.url).searchParams)));

app.get("/api/graph", async (c) => {
  const params = new URL(c.req.url).searchParams;
  return c.json(await getGraph(params.get("center") ?? undefined, boundedGraphDepth(params.get("depth"))));
});

app.get("/api/offers", async (c) => {
  const blocked = requireAdmin(c);
  if (blocked) return blocked;
  return c.json(await listOffers());
});

app.post("/api/offers", async (c) => {
  const blocked = requireAdmin(c);
  if (blocked) return blocked;
  const body = await c.req.json().catch(() => null);
  if (!body?.developer_id || !body?.role_title || !body?.sender_name || !body?.sender_email) {
    return c.json({ error: "developer_id, role_title, sender_name, and sender_email are required" }, 400);
  }
  return c.json({ offer: await createOffer(body) }, 201);
});

app.patch("/api/offers/:id", async (c) => {
  const blocked = requireAdmin(c);
  if (blocked) return blocked;
  const body = await c.req.json().catch(() => null);
  const allowed = ["sent", "accepted", "rejected", "withdrawn"];
  if (!allowed.includes(body?.status)) return c.json({ error: "Invalid status" }, 400);
  const offer = await updateOffer(c.req.param("id"), body.status);
  if (!offer) return c.json({ error: "Offer not found" }, 404);
  return c.json({ offer });
});

app.post("/api/developers/:id/email", async (c) => {
  const blocked = requireAdmin(c);
  if (blocked) return blocked;
  const detail = await getDeveloper(c.req.param("id"));
  if (!detail) return c.json({ error: "Developer not found" }, 404);
  const body = await c.req.json().catch(() => null);
  if (!body?.subject || !body?.message || !body?.sender_name) {
    return c.json({ error: "subject, message, and sender_name are required" }, 400);
  }

  try {
    const email = await sendDeveloperEmail(detail.developer, {
      to: body.to,
      subject: body.subject,
      message: body.message,
      sender_name: body.sender_name,
      sender_email: body.sender_email
    });
    return c.json({ email }, 201);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : "Email send failed" }, 400);
  }
});

app.get("/api/admin/ingestion", async (c) => {
  const blocked = requireAdmin(c);
  if (blocked) return blocked;
  return c.json(await getIngestionOverview(new URL(c.req.url).searchParams));
});

app.post("/api/ingest/devpost", async (c) => {
  const blocked = requireAdmin(c);
  if (blocked) return blocked;
  const body = await c.req.json().catch(() => null);
  const url = devpostGalleryUrl(body?.url);
  if (!url) return c.json({ error: "valid Devpost project-gallery url is required" }, 400);
  const result = await ingestDevpostHackathon({
    url,
    slug: body.slug,
    maxPages: optionalIntegerBodyValue(body.max_pages, 3, 1),
    maxProjects: optionalIntegerBodyValue(body.max_projects, 50, 1),
    assignPodium: body.assign_podium ?? true,
    dryRun: body.dry_run ?? false
  });
  return c.json(result, body.dry_run ? 200 : 201);
});

app.post("/api/ingest/devpost/all", async (c) => {
  const blocked = requireAdmin(c);
  if (blocked) return blocked;
  const body = (await c.req.json().catch(() => ({}))) ?? {};
  if (body.all) {
    return c.json({ error: "Uncapped Devpost ingestion is disabled for the API; use the CLI or scheduled workflow" }, 400);
  }
  const result = await ingestAllDevpostHackathons({
    status: body.status ?? "ended",
    query: body.query,
    maxListPages: integerBodyValue(body.max_list_pages, 1, 10),
    maxHackathons: integerBodyValue(body.max_hackathons, 5, 25),
    maxProjectPages: integerBodyValue(body.max_project_pages, 1, 3),
    maxProjectsPerHackathon: integerBodyValue(body.max_projects_per_hackathon, 24, 50),
    skipRecentlyScrapedHours: optionalIntegerBodyValue(body.skip_recent_hours, 168, 0),
    assignPodium: body.assign_podium ?? true,
    dryRun: body.dry_run ?? false
  });
  return c.json(result, body.dry_run ? 200 : 201);
});

export default app;
