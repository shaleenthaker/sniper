import type { Developer, FreshSignal, GraphEdge, GraphNode, Hackathon, HackathonAppearance, Offer, Project } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...init?.headers
    }
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export const api = {
  developers: (params = "") => request<{ developers: Developer[]; cursor: string | null }>(`/api/developers${params ? `?${params}` : ""}`),
  developer: (id: string) => request<{ developer: Developer; projects: Project[]; hackathons: HackathonAppearance[]; links: Developer["links"] }>(`/api/developers/${id}`),
  hackathons: (params = "") => request<{ hackathons: Hackathon[] }>(`/api/hackathons${params ? `?${params}` : ""}`),
  hackathon: (slug: string) => request<{ hackathon: Hackathon; podium: { rank: 1 | 2 | 3; project: Project; members: Developer[]; offered_to: Developer[] }[]; all_winners: Project[]; submissions: Project[] }>(`/api/hackathons/${slug}`),
  projects: (params = "") => request<{ projects: Project[] }>(`/api/projects${params ? `?${params}` : ""}`),
  project: (id: string) => request<{ project: Project; hackathon: Hackathon; members: Developer[]; stack: string[]; devpost_url: string; won: 1 | 2 | 3 | null }>(`/api/projects/${id}`),
  fresh: (params = "") => request<{ items: FreshSignal[] }>(`/api/feed/fresh${params ? `?${params}` : ""}`),
  graph: (params = "") => request<{ nodes: GraphNode[]; edges: GraphEdge[] }>(`/api/graph${params ? `?${params}` : ""}`),
  offers: () => request<{ offers: Offer[] }>("/api/offers"),
  createOffer: (body: { developer_id: string; role_title: string; sender_name: string; sender_email: string; notes?: string | null }) =>
    request<{ offer: Offer }>("/api/offers", { method: "POST", body: JSON.stringify(body) }),
  updateOffer: (id: string, status: Offer["status"]) =>
    request<{ offer: Offer }>(`/api/offers/${id}`, { method: "PATCH", body: JSON.stringify({ status }) })
};

export const queryStale = {
  normal: 30_000,
  fresh: 5_000
};
