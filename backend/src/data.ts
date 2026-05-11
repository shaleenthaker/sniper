import { developerProfiles, hackathons, offers, projects } from "./seed.js";
import { getEnv } from "./env.js";
import type { Developer, FreshSignal, GraphEdge, GraphNode, Hackathon, HackathonAppearance, Offer, Project } from "./types.js";

const now = new Date("2025-11-16T12:00:00Z");

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

function hoursBetween(a: string, b: string) {
  return Math.max(0, Math.round((Date.parse(b) - Date.parse(a)) / 36_000) / 100);
}

export function allDevelopers(): Developer[] {
  return developerProfiles.map(([id, name, handle, headline, firstIndexed, linkedInAnnounced]) => {
    const devProjects = projects.filter((project) => project.member_ids.includes(id));
    const stack = unique(devProjects.flatMap((project) => project.stack)).sort();
    const hackathon_count = unique(devProjects.map((project) => project.hackathon_slug)).length;
    const wins = devProjects.filter((project) => project.placement !== null).length;
    const signal_lead_hours = linkedInAnnounced ? hoursBetween(firstIndexed, linkedInAnnounced) : null;

    const demoEmail = id === "dev-shaleen-thaker" ? getEnv("DEMO_RECIPIENT_EMAIL") : undefined;

    return {
      id,
      name,
      handle,
      avatar_url: null,
      headline,
      stack,
      hackathon_count,
      wins,
      links: {
        devpost: `https://devpost.com/${handle}`,
        github: `https://github.com/${handle}`,
        linkedin: linkedInAnnounced ? `https://linkedin.com/in/${handle}` : undefined,
        email: demoEmail ?? `${handle}@example.com`
      },
      linkedin_announced_at: linkedInAnnounced,
      first_indexed_at: firstIndexed,
      signal_lead_hours
    };
  });
}

export const developers = allDevelopers();

export function developerById(id: string) {
  return developers.find((developer) => developer.id === id);
}

export function projectById(id: string) {
  return projects.find((project) => project.id === id);
}

export function hackathonBySlug(slug: string) {
  return hackathons.find((hackathon) => hackathon.slug === slug);
}

export function developerProjects(id: string) {
  return projects.filter((project) => project.member_ids.includes(id)).sort((a, b) => Date.parse(b.submitted_at) - Date.parse(a.submitted_at));
}

export function developerAppearances(id: string): HackathonAppearance[] {
  return developerProjects(id).map((project) => ({
    hackathon: hackathonBySlug(project.hackathon_slug) as Hackathon,
    project,
    placement: project.placement
  }));
}

export function membersFor(project: Project) {
  return project.member_ids.map((id) => developerById(id)).filter(Boolean) as Developer[];
}

export function offersForDeveloper(developerId: string) {
  return offers.filter((offer) => offer.developer_id === developerId);
}

export function latestOfferForDeveloper(developerId: string) {
  return offersForDeveloper(developerId).sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0] ?? null;
}

export function podiumFor(slug: string) {
  return [1, 2, 3].map((rank) => {
    const project = projects.find((entry) => entry.hackathon_slug === slug && entry.placement === rank);
    if (!project) return null;
    const members = membersFor(project).map((member) => ({ ...member, offer: latestOfferForDeveloper(member.id) }));
    return {
      rank: rank as 1 | 2 | 3,
      project,
      members,
      offered_to: members.filter((member) => offersForDeveloper(member.id).length > 0)
    };
  }).filter(Boolean);
}

export function queryDevelopers(query: URLSearchParams) {
  const stack = query.get("stack")?.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean) ?? [];
  const hackathon = query.get("hackathon");
  const keyword = query.get("project_keyword")?.toLowerCase();
  const placedTop = query.get("placed_top") ? Number(query.get("placed_top")) : null;
  const hasOffer = query.get("has_offer");
  const sort = query.get("sort") ?? "recency";
  const limit = Math.min(Number(query.get("limit") ?? 50), 100);
  const offset = Number(query.get("cursor") ?? 0);

  let filtered = developers.filter((developer) => {
    const devProjects = developerProjects(developer.id);
    const matchesStack = stack.every((tag) => developer.stack.includes(tag));
    const matchesHackathon = !hackathon || devProjects.some((project) => project.hackathon_slug === hackathon);
    const matchesKeyword = !keyword || devProjects.some((project) => `${project.title} ${project.tagline ?? ""} ${project.description ?? ""}`.toLowerCase().includes(keyword));
    const matchesPlacement = !placedTop || devProjects.some((project) => project.placement !== null && project.placement <= placedTop);
    const offered = offersForDeveloper(developer.id).length > 0;
    const matchesOffer = hasOffer === null || String(offered) === hasOffer;
    return matchesStack && matchesHackathon && matchesKeyword && matchesPlacement && matchesOffer;
  });

  filtered = filtered.sort((a, b) => {
    if (sort === "placement") return b.wins - a.wins || Date.parse(b.first_indexed_at) - Date.parse(a.first_indexed_at);
    if (sort === "signal_lead") return (b.signal_lead_hours ?? Number.MAX_SAFE_INTEGER) - (a.signal_lead_hours ?? Number.MAX_SAFE_INTEGER);
    return Date.parse(b.first_indexed_at) - Date.parse(a.first_indexed_at);
  });

  const slice = filtered.slice(offset, offset + limit);
  return { developers: slice, cursor: offset + limit < filtered.length ? String(offset + limit) : null };
}

export function queryHackathons(query: URLSearchParams) {
  const q = query.get("q")?.toLowerCase();
  const year = query.get("year");
  return hackathons.filter((hackathon) => {
    const matchesQ = !q || `${hackathon.name} ${hackathon.slug} ${hackathon.organizer ?? ""}`.toLowerCase().includes(q);
    const matchesYear = !year || hackathon.start_date.startsWith(year);
    return matchesQ && matchesYear;
  });
}

export function queryProjects(query: URLSearchParams) {
  const q = query.get("q")?.toLowerCase();
  const hackathon = query.get("hackathon");
  const stack = query.get("stack")?.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean) ?? [];
  return projects
    .filter((project) => {
      const matchesQ = !q || `${project.title} ${project.tagline ?? ""} ${project.description ?? ""}`.toLowerCase().includes(q);
      const matchesHackathon = !hackathon || project.hackathon_slug === hackathon;
      const matchesStack = stack.every((tag) => project.stack.includes(tag));
      return matchesQ && matchesHackathon && matchesStack;
    })
    .sort((a, b) => Date.parse(b.submitted_at) - Date.parse(a.submitted_at));
}

export function freshSignals(query: URLSearchParams): FreshSignal[] {
  const since = query.get("since");
  const stack = query.get("stack")?.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean) ?? [];
  const hackathon = query.get("hackathon");

  return projects
    .filter((project) => {
      const members = membersFor(project);
      const hasLinkedIn = members.some((member) => member.linkedin_announced_at !== null);
      const matchesSince = !since || Date.parse(project.submitted_at) >= Date.parse(since);
      const matchesStack = stack.every((tag) => project.stack.includes(tag));
      const matchesHackathon = !hackathon || project.hackathon_slug === hackathon;
      return !hasLinkedIn && matchesSince && matchesStack && matchesHackathon;
    })
    .sort((a, b) => Date.parse(b.submitted_at) - Date.parse(a.submitted_at))
    .slice(0, 24)
    .map((project) => ({
      project,
      hackathon: hackathonBySlug(project.hackathon_slug) as Hackathon,
      members: membersFor(project),
      indexed_at: project.submitted_at,
      hours_since_indexed: hoursBetween(project.submitted_at, now.toISOString()),
      linkedin_detected: false as const
    }));
}

export function buildGraph(center = "hackathon:hackmit-2025", depth = 2) {
  const nodes = new Map<string, GraphNode>();
  const edgeKeys = new Set<string>();
  const edges: GraphEdge[] = [];

  function addNode(entityType: "developer" | "hackathon" | "project", id: string) {
    const key = `${entityType}:${id}`;
    if (nodes.has(key)) return;
    if (entityType === "developer") {
      const developer = developerById(id);
      if (developer) nodes.set(key, { id: key, type: "developer", label: developer.name, meta: { wins: developer.wins, hackathon_count: developer.hackathon_count, stack: developer.stack } });
    }
    if (entityType === "hackathon") {
      const hackathon = hackathonBySlug(id);
      if (hackathon) nodes.set(key, { id: key, type: "hackathon", label: hackathon.name, meta: { start_date: hackathon.start_date, submission_count: hackathon.submission_count } });
    }
    if (entityType === "project") {
      const project = projectById(id);
      if (project) nodes.set(key, { id: key, type: "project", label: project.title, meta: { placement: project.placement, stack: project.stack } });
    }
  }

  function addEdge(source: string, target: string, type: GraphEdge["type"]) {
    const key = `${source}-${target}-${type}`;
    if (edgeKeys.has(key)) return;
    edgeKeys.add(key);
    edges.push({ source, target, type });
  }

  const [entityType, entityId] = center.split(":") as ["developer" | "hackathon" | "project", string];
  const visited = new Set<string>();
  let frontier = [`${entityType}:${entityId}`];

  for (let level = 0; level <= depth; level += 1) {
    const next: string[] = [];
    for (const key of frontier) {
      if (visited.has(key)) continue;
      visited.add(key);
      const [type, id] = key.split(":") as ["developer" | "hackathon" | "project", string];
      addNode(type, id);

      const relatedProjects =
        type === "developer" ? developerProjects(id) :
        type === "hackathon" ? projects.filter((project) => project.hackathon_slug === id).slice(0, 8) :
        [projectById(id)].filter(Boolean) as Project[];

      relatedProjects.forEach((project) => {
        addNode("project", project.id);
        addNode("hackathon", project.hackathon_slug);
        addEdge(`project:${project.id}`, `hackathon:${project.hackathon_slug}`, project.placement ? "won" : "submitted_to");
        next.push(`project:${project.id}`, `hackathon:${project.hackathon_slug}`);

        project.member_ids.forEach((memberId) => {
          addNode("developer", memberId);
          addEdge(`developer:${memberId}`, `project:${project.id}`, "member_of");
          next.push(`developer:${memberId}`);
        });

        for (let i = 0; i < project.member_ids.length; i += 1) {
          for (let j = i + 1; j < project.member_ids.length; j += 1) {
            addEdge(`developer:${project.member_ids[i]}`, `developer:${project.member_ids[j]}`, "teammate");
          }
        }
      });
    }
    frontier = next;
  }

  return { nodes: Array.from(nodes.values()), edges };
}

export function createOffer(input: Omit<Offer, "id" | "created_at" | "status" | "notes"> & { notes?: string | null }) {
  const offer: Offer = {
    id: `offer-${String(offers.length + 1).padStart(3, "0")}`,
    developer_id: input.developer_id,
    role_title: input.role_title,
    sender_name: input.sender_name,
    sender_email: input.sender_email,
    status: "sent",
    created_at: new Date().toISOString(),
    notes: input.notes ?? null
  };
  offers.unshift(offer);
  return offer;
}

export function updateOffer(id: string, status: Offer["status"]) {
  const offer = offers.find((entry) => entry.id === id);
  if (!offer) return null;
  offer.status = status;
  return offer;
}

export { hackathons, offers, projects };
