import type { Developer, FreshSignal, GraphEdge, GraphNode, Hackathon, HackathonAppearance, IngestionOverview, Offer, Project } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
const ADMIN_TOKEN_KEY = "sniper_admin_token";

export function getAdminToken() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(ADMIN_TOKEN_KEY) ?? "";
}

export function setAdminToken(value: string) {
  if (typeof window === "undefined") return;
  const token = value.trim();
  if (token) window.localStorage.setItem(ADMIN_TOKEN_KEY, token);
  else window.localStorage.removeItem(ADMIN_TOKEN_KEY);
}

type ApiRequestInit = RequestInit & { adminToken?: string };

async function request<T>(path: string, init?: ApiRequestInit): Promise<T> {
  const { adminToken: explicitAdminToken, ...requestInit } = init ?? {};
  const adminToken = explicitAdminToken ?? getAdminToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...requestInit,
    headers: {
      "content-type": "application/json",
      ...(adminToken ? { authorization: `Bearer ${adminToken}` } : {}),
      ...requestInit.headers
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
  ingestion: (params = "") => request<IngestionOverview>(`/api/admin/ingestion${params ? `?${params}` : ""}`),
  runDevpostIngestion: (body: {
    dry_run?: boolean;
    max_list_pages?: number;
    max_hackathons?: number;
    max_project_pages?: number;
    max_projects_per_hackathon?: number;
    skip_recent_hours?: number;
  }) => request<Record<string, unknown>>("/api/ingest/devpost/all", { method: "POST", body: JSON.stringify(body) }),
  createOffer: (body: { developer_id: string; role_title: string; sender_name: string; sender_email: string; notes?: string | null }) =>
    request<{ offer: Offer }>("/api/offers", { method: "POST", body: JSON.stringify(body) }),
  updateOffer: (id: string, status: Offer["status"]) =>
    request<{ offer: Offer }>(`/api/offers/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
  sendDeveloperEmail: (id: string, body: { to?: string; subject: string; message: string; sender_name: string; sender_email?: string }, adminToken?: string) =>
    request<{ email: { id: string | null; to: string; subject: string; developer_id: string } }>(`/api/developers/${id}/email`, { method: "POST", body: JSON.stringify(body), adminToken })
};

export const queryStale = {
  normal: 30_000,
  fresh: 5_000
};
