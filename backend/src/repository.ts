import { dataSource } from "./env.js";
import { hasSupabaseConfig, supabase } from "./supabase.js";
import * as mock from "./data.js";
import type { Developer, FreshSignal, GraphEdge, GraphNode, Hackathon, HackathonAppearance, IngestionRun, Offer, Project } from "./types.js";

type DeveloperWithOffer = Developer & { offer?: Offer | null };
type VisibilityOptions = { includeOffers?: boolean };

type Snapshot = {
  developers: Developer[];
  hackathons: Hackathon[];
  projects: Project[];
  offers: Offer[];
  members: { project_id: string; developer_id: string }[];
};

function useSupabase() {
  return dataSource() === "supabase" && hasSupabaseConfig();
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

function hoursBetween(a: string, b: string) {
  return Math.max(0, Math.round((Date.parse(b) - Date.parse(a)) / 36_000) / 100);
}

async function unwrap<T>(request: PromiseLike<{ data: T; error: unknown }>, action: string) {
  const { data, error } = await request;
  if (error) throw new Error(`${action} failed: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
  return data;
}

function normalizeDeveloper(row: Developer): Developer {
  return {
    ...row,
    avatar_url: row.avatar_url ?? null,
    headline: row.headline ?? null,
    stack: row.stack ?? [],
    links: row.links ?? { devpost: `https://devpost.com/${row.handle}` },
    linkedin_announced_at: row.linkedin_announced_at ?? null,
    signal_lead_hours: row.signal_lead_hours ?? null
  };
}

async function snapshot(): Promise<Snapshot> {
  const db = supabase();
  const [developers, hackathons, projects, offers, members] = await Promise.all([
    unwrap(db.from("developers").select("*"), "load developers"),
    unwrap(db.from("hackathons").select("*"), "load hackathons"),
    unwrap(db.from("projects").select("*"), "load projects"),
    unwrap(db.from("offers").select("*"), "load offers"),
    unwrap(db.from("project_members").select("*"), "load project members")
  ]);
  return {
    developers: (developers as Developer[]).map(normalizeDeveloper),
    hackathons: hackathons as Hackathon[],
    projects: projects as Project[],
    offers: offers as Offer[],
    members: members as { project_id: string; developer_id: string }[]
  };
}

function latestOffer(offers: Offer[], developerId: string) {
  return offers.filter((offer) => offer.developer_id === developerId).sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0] ?? null;
}

function projectMembers(project: Project, snap: Snapshot) {
  const ids = project.member_ids.length ? project.member_ids : snap.members.filter((row) => row.project_id === project.id).map((row) => row.developer_id);
  return ids.map((id) => snap.developers.find((developer) => developer.id === id)).filter(Boolean) as Developer[];
}

function developerProjects(developerId: string, snap: Snapshot) {
  const projectIds = snap.members.filter((row) => row.developer_id === developerId).map((row) => row.project_id);
  return snap.projects.filter((project) => project.member_ids.includes(developerId) || projectIds.includes(project.id)).sort((a, b) => Date.parse(b.submitted_at) - Date.parse(a.submitted_at));
}

function maybeWithOffer<T extends Developer>(developer: T, snap: Pick<Snapshot, "offers">, options: VisibilityOptions) {
  return options.includeOffers ? { ...developer, offer: latestOffer(snap.offers, developer.id) } : developer;
}

function withoutOffer<T extends Developer>(developer: T & { offer?: Offer | null }) {
  const clone = { ...developer };
  delete (clone as { offer?: Offer | null }).offer;
  return clone;
}

export async function listDevelopers(query: URLSearchParams, options: VisibilityOptions = {}) {
  if (!useSupabase()) {
    const publicQuery = new URLSearchParams(query);
    if (!options.includeOffers) publicQuery.delete("has_offer");
    const result = mock.queryDevelopers(publicQuery);
    return {
      developers: result.developers.map((developer) => options.includeOffers ? { ...developer, offer: mock.latestOfferForDeveloper(developer.id) } : developer),
      cursor: result.cursor
    };
  }

  const snap = await snapshot();
  const stack = query.get("stack")?.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean) ?? [];
  const hackathon = query.get("hackathon");
  const keyword = query.get("project_keyword")?.toLowerCase();
  const placedTop = query.get("placed_top") ? Number(query.get("placed_top")) : null;
  const hasOffer = options.includeOffers ? query.get("has_offer") : null;
  const sort = query.get("sort") ?? "recency";
  const limit = Math.min(Number(query.get("limit") ?? 50), 100);
  const offset = Number(query.get("cursor") ?? 0);

  let developers = snap.developers.filter((developer) => {
    const projects = developerProjects(developer.id, snap);
    const offered = latestOffer(snap.offers, developer.id) !== null;
    return stack.every((tag) => developer.stack.includes(tag)) &&
      (!hackathon || projects.some((project) => project.hackathon_slug === hackathon)) &&
      (!keyword || projects.some((project) => `${project.title} ${project.tagline ?? ""} ${project.description ?? ""}`.toLowerCase().includes(keyword))) &&
      (!placedTop || projects.some((project) => project.placement !== null && project.placement <= placedTop)) &&
      (hasOffer === null || String(offered) === hasOffer);
  });

  developers = developers.sort((a, b) => {
    if (sort === "placement") return b.wins - a.wins || Date.parse(b.first_indexed_at) - Date.parse(a.first_indexed_at);
    if (sort === "signal_lead") return (b.signal_lead_hours ?? Number.MAX_SAFE_INTEGER) - (a.signal_lead_hours ?? Number.MAX_SAFE_INTEGER);
    return Date.parse(b.first_indexed_at) - Date.parse(a.first_indexed_at);
  });

  const slice = developers.slice(offset, offset + limit).map((developer) => maybeWithOffer(developer, snap, options));
  return { developers: slice, cursor: offset + limit < developers.length ? String(offset + limit) : null };
}

export async function getDeveloper(id: string, options: VisibilityOptions = {}) {
  if (!useSupabase()) {
    const developer = mock.developerById(id);
    if (!developer) return null;
    return {
      developer: options.includeOffers ? { ...developer, offer: mock.latestOfferForDeveloper(id) } : developer,
      projects: mock.developerProjects(id),
      hackathons: mock.developerAppearances(id),
      links: developer.links
    };
  }

  const snap = await snapshot();
  const developer = snap.developers.find((entry) => entry.id === id);
  if (!developer) return null;
  const projects = developerProjects(id, snap);
  const appearances: HackathonAppearance[] = projects.map((project) => ({
    hackathon: snap.hackathons.find((hackathon) => hackathon.slug === project.hackathon_slug) as Hackathon,
    project,
    placement: project.placement
  })).filter((appearance) => appearance.hackathon);
  return { developer: maybeWithOffer(developer, snap, options), projects, hackathons: appearances, links: developer.links };
}

export async function listHackathons(query: URLSearchParams) {
  if (!useSupabase()) return { hackathons: mock.queryHackathons(query) };
  const snap = await snapshot();
  const q = query.get("q")?.toLowerCase();
  const year = query.get("year");
  return {
    hackathons: snap.hackathons.filter((hackathon) => (!q || `${hackathon.name} ${hackathon.slug}`.toLowerCase().includes(q)) && (!year || hackathon.start_date.startsWith(year)))
  };
}

export async function getHackathon(slug: string, options: VisibilityOptions = {}) {
  if (!useSupabase()) {
    const hackathon = mock.hackathonBySlug(slug);
    if (!hackathon) return null;
    const hackathonProjects = mock.projects.filter((project) => project.hackathon_slug === hackathon.slug);
    const podium = mock.podiumFor(hackathon.slug).map((row) => ({
      ...row,
      members: row.members.map((developer) => options.includeOffers ? { ...developer, offer: mock.latestOfferForDeveloper(developer.id) } : withoutOffer(developer)),
      offered_to: options.includeOffers ? row.offered_to : []
    }));
    return {
      hackathon,
      podium,
      all_winners: hackathonProjects.filter((project) => project.placement).sort((a, b) => (a.placement ?? 99) - (b.placement ?? 99)),
      submissions: hackathonProjects.sort((a, b) => (a.placement ?? 99) - (b.placement ?? 99))
    };
  }

  const snap = await snapshot();
  const hackathon = snap.hackathons.find((entry) => entry.slug === slug);
  if (!hackathon) return null;
  const submissions = snap.projects.filter((project) => project.hackathon_slug === slug).sort((a, b) => (a.placement ?? 99) - (b.placement ?? 99));
  const podium = [1, 2, 3].map((rank) => {
    const project = submissions.find((entry) => entry.placement === rank);
    if (!project) return null;
    const members = projectMembers(project, snap).map((developer) => maybeWithOffer(developer, snap, options)) as DeveloperWithOffer[];
    return { rank: rank as 1 | 2 | 3, project, members, offered_to: options.includeOffers ? members.filter((member) => latestOffer(snap.offers, member.id)) : [] };
  }).filter(Boolean);
  return { hackathon, podium, all_winners: submissions.filter((project) => project.placement), submissions };
}

export async function listProjects(query: URLSearchParams) {
  if (!useSupabase()) return { projects: mock.queryProjects(query) };
  const snap = await snapshot();
  const q = query.get("q")?.toLowerCase();
  const hackathon = query.get("hackathon");
  const stack = query.get("stack")?.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean) ?? [];
  return {
    projects: snap.projects.filter((project) => (!q || `${project.title} ${project.tagline ?? ""} ${project.description ?? ""}`.toLowerCase().includes(q)) && (!hackathon || project.hackathon_slug === hackathon) && stack.every((tag) => project.stack.includes(tag))).sort((a, b) => Date.parse(b.submitted_at) - Date.parse(a.submitted_at))
  };
}

export async function getProject(id: string, options: VisibilityOptions = {}) {
  if (!useSupabase()) {
    const project = mock.projectById(id);
    if (!project) return null;
    return {
      project,
      hackathon: mock.hackathonBySlug(project.hackathon_slug),
      members: mock.membersFor(project).map((developer) => options.includeOffers ? { ...developer, offer: mock.latestOfferForDeveloper(developer.id) } : developer),
      stack: project.stack,
      devpost_url: project.devpost_url,
      won: project.placement
    };
  }

  const snap = await snapshot();
  const project = snap.projects.find((entry) => entry.id === id);
  if (!project) return null;
  return {
    project,
    hackathon: snap.hackathons.find((hackathon) => hackathon.slug === project.hackathon_slug),
    members: projectMembers(project, snap).map((developer) => maybeWithOffer(developer, snap, options)),
    stack: project.stack,
    devpost_url: project.devpost_url,
    won: project.placement
  };
}

export async function listFreshSignals(query: URLSearchParams) {
  if (!useSupabase()) return { items: mock.freshSignals(query) };
  const snap = await snapshot();
  const since = query.get("since");
  const stack = query.get("stack")?.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean) ?? [];
  const hackathon = query.get("hackathon");
  const now = new Date().toISOString();
  const items: FreshSignal[] = snap.projects
    .map((project) => ({ project, members: projectMembers(project, snap) }))
    .filter(({ project, members }) => {
      return members.length > 0 &&
        members.every((member) => !member.linkedin_announced_at) &&
        (!since || Date.parse(project.submitted_at) >= Date.parse(since)) &&
        (!hackathon || project.hackathon_slug === hackathon) &&
        stack.every((tag) => project.stack.includes(tag));
    })
    .sort((a, b) => Date.parse(b.project.submitted_at) - Date.parse(a.project.submitted_at))
    .slice(0, 24)
    .map(({ project, members }) => ({
      project,
      hackathon: snap.hackathons.find((entry) => entry.slug === project.hackathon_slug) as Hackathon,
      members,
      indexed_at: project.submitted_at,
      hours_since_indexed: hoursBetween(project.submitted_at, now),
      linkedin_detected: false as const
    }));
  return { items };
}

export async function getGraph(center = "hackathon:hackmit-2025", depth = 2) {
  if (!useSupabase()) return mock.buildGraph(center, depth);
  const snap = await snapshot();
  const nodes = new Map<string, GraphNode>();
  const edgeKeys = new Set<string>();
  const edges: GraphEdge[] = [];

  function addNode(kind: "developer" | "hackathon" | "project", id: string) {
    const key = `${kind}:${id}`;
    if (nodes.has(key)) return;
    if (kind === "developer") {
      const developer = snap.developers.find((entry) => entry.id === id);
      if (developer) nodes.set(key, { id: key, type: "developer", label: developer.name, meta: { wins: developer.wins, hackathon_count: developer.hackathon_count, stack: developer.stack } });
    }
    if (kind === "hackathon") {
      const hackathon = snap.hackathons.find((entry) => entry.slug === id);
      if (hackathon) nodes.set(key, { id: key, type: "hackathon", label: hackathon.name, meta: { start_date: hackathon.start_date, submission_count: hackathon.submission_count } });
    }
    if (kind === "project") {
      const project = snap.projects.find((entry) => entry.id === id);
      if (project) nodes.set(key, { id: key, type: "project", label: project.title, meta: { placement: project.placement, stack: project.stack } });
    }
  }

  function addEdge(source: string, target: string, type: GraphEdge["type"]) {
    const key = `${source}-${target}-${type}`;
    if (edgeKeys.has(key)) return;
    edgeKeys.add(key);
    edges.push({ source, target, type });
  }

  const [kind, id] = center.split(":") as ["developer" | "hackathon" | "project", string];
  let frontier = [`${kind}:${id}`];
  const visited = new Set<string>();
  for (let level = 0; level <= depth; level += 1) {
    const next: string[] = [];
    for (const key of frontier) {
      if (visited.has(key)) continue;
      visited.add(key);
      const [nodeKind, nodeId] = key.split(":") as ["developer" | "hackathon" | "project", string];
      addNode(nodeKind, nodeId);
      const related = nodeKind === "developer" ? developerProjects(nodeId, snap) : nodeKind === "hackathon" ? snap.projects.filter((project) => project.hackathon_slug === nodeId).slice(0, 12) : snap.projects.filter((project) => project.id === nodeId);
      related.forEach((project) => {
        addNode("project", project.id);
        addNode("hackathon", project.hackathon_slug);
        addEdge(`project:${project.id}`, `hackathon:${project.hackathon_slug}`, project.placement ? "won" : "submitted_to");
        next.push(`project:${project.id}`, `hackathon:${project.hackathon_slug}`);
        projectMembers(project, snap).forEach((developer) => {
          addNode("developer", developer.id);
          addEdge(`developer:${developer.id}`, `project:${project.id}`, "member_of");
          next.push(`developer:${developer.id}`);
        });
      });
    }
    frontier = next;
  }
  return { nodes: Array.from(nodes.values()), edges };
}

export async function listOffers() {
  if (!useSupabase()) return { offers: mock.offers };
  return { offers: await unwrap(supabase().from("offers").select("*").order("created_at", { ascending: false }), "load offers") as Offer[] };
}

export async function getIngestionOverview(query: URLSearchParams) {
  if (!useSupabase()) {
    return {
      summary: {
        total_runs: 0,
        completed: 0,
        failed: 0,
        started: 0,
        projects_saved: 0,
        developers_saved: 0,
        latest_run: null,
        last_success: null,
        last_failure: null
      },
      runs: [] as IngestionRun[]
    };
  }

  const limit = Math.min(Math.max(Number(query.get("limit") ?? 25), 1), 100);
  const status = query.get("status");
  let request = supabase().from("ingestion_runs").select("*").order("created_at", { ascending: false }).limit(limit);
  if (status) request = request.eq("status", status);

  const runs = await unwrap(request, "load ingestion runs") as IngestionRun[];
  return {
    summary: {
      total_runs: runs.length,
      completed: runs.filter((run) => run.status === "completed").length,
      failed: runs.filter((run) => run.status === "failed").length,
      started: runs.filter((run) => run.status === "started").length,
      projects_saved: runs.reduce((sum, run) => sum + run.projects_saved, 0),
      developers_saved: runs.reduce((sum, run) => sum + run.developers_saved, 0),
      latest_run: runs[0] ?? null,
      last_success: runs.find((run) => run.status === "completed") ?? null,
      last_failure: runs.find((run) => run.status === "failed") ?? null
    },
    runs
  };
}

export async function createOffer(input: Omit<Offer, "id" | "created_at" | "status" | "notes"> & { notes?: string | null }) {
  if (!useSupabase()) return mock.createOffer(input);
  const offer: Offer = {
    id: `offer-${crypto.randomUUID()}`,
    developer_id: input.developer_id,
    role_title: input.role_title,
    sender_name: input.sender_name,
    sender_email: input.sender_email,
    status: "sent",
    created_at: new Date().toISOString(),
    notes: input.notes ?? null
  };
  return await unwrap(supabase().from("offers").insert(offer).select("*").single(), "create offer") as Offer;
}

export async function updateOffer(id: string, status: Offer["status"]) {
  if (!useSupabase()) return mock.updateOffer(id, status);
  return await unwrap(supabase().from("offers").update({ status }).eq("id", id).select("*").single(), "update offer") as Offer;
}
