export type Developer = {
  id: string;
  name: string;
  handle: string;
  avatar_url: string | null;
  headline: string | null;
  stack: string[];
  hackathon_count: number;
  wins: number;
  links: { devpost: string; github?: string; linkedin?: string; email?: string };
  linkedin_announced_at: string | null;
  first_indexed_at: string;
  signal_lead_hours: number | null;
};

export type Hackathon = {
  slug: string;
  name: string;
  organizer: string | null;
  start_date: string;
  end_date: string;
  url: string;
  submission_count: number;
  top_stacks: string[];
};

export type Project = {
  id: string;
  title: string;
  tagline: string | null;
  description: string | null;
  devpost_url: string;
  hackathon_slug: string;
  stack: string[];
  placement: 1 | 2 | 3 | null;
  member_ids: string[];
  submitted_at: string;
};

export type HackathonAppearance = {
  hackathon: Hackathon;
  project: Project;
  placement: 1 | 2 | 3 | null;
};

export type FreshSignal = {
  project: Project;
  hackathon: Hackathon;
  members: Developer[];
  indexed_at: string;
  hours_since_indexed: number;
  linkedin_detected: false;
};

export type Offer = {
  id: string;
  developer_id: string;
  role_title: string;
  sender_name: string;
  sender_email: string;
  status: "draft" | "sent" | "accepted" | "rejected" | "withdrawn";
  created_at: string;
  notes: string | null;
};

export type IngestionRun = {
  id: string;
  source: string;
  source_url: string;
  hackathon_slug: string | null;
  status: "started" | "completed" | "failed";
  projects_found: number;
  projects_saved: number;
  developers_saved: number;
  error: string | null;
  created_at: string;
  completed_at: string | null;
};

export type GraphNode =
  | { id: string; type: "developer"; label: string; meta: Pick<Developer, "wins" | "hackathon_count" | "stack"> }
  | { id: string; type: "hackathon"; label: string; meta: Pick<Hackathon, "start_date" | "submission_count"> }
  | { id: string; type: "project"; label: string; meta: { placement: 1 | 2 | 3 | null; stack: string[] } };

export type GraphEdge = {
  source: string;
  target: string;
  type: "member_of" | "submitted_to" | "won" | "teammate";
};
