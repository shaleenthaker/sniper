create table if not exists public.developers (
  id text primary key,
  name text not null,
  handle text not null unique,
  avatar_url text,
  headline text,
  stack text[] not null default '{}',
  hackathon_count integer not null default 0,
  wins integer not null default 0,
  links jsonb not null default '{}'::jsonb,
  linkedin_announced_at timestamptz,
  first_indexed_at timestamptz not null default now(),
  signal_lead_hours numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hackathons (
  slug text primary key,
  name text not null,
  organizer text,
  start_date date not null,
  end_date date not null,
  url text not null,
  submission_count integer not null default 0,
  top_stacks text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id text primary key,
  title text not null,
  tagline text,
  description text,
  devpost_url text not null unique,
  hackathon_slug text not null references public.hackathons(slug) on delete cascade,
  stack text[] not null default '{}',
  placement smallint check (placement in (1, 2, 3)),
  member_ids text[] not null default '{}',
  submitted_at timestamptz not null,
  indexed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_members (
  project_id text not null references public.projects(id) on delete cascade,
  developer_id text not null references public.developers(id) on delete cascade,
  primary key (project_id, developer_id)
);

create table if not exists public.offers (
  id text primary key,
  developer_id text not null references public.developers(id) on delete cascade,
  role_title text not null,
  sender_name text not null,
  sender_email text not null,
  status text not null check (status in ('draft', 'sent', 'accepted', 'rejected', 'withdrawn')),
  created_at timestamptz not null default now(),
  notes text
);

create table if not exists public.ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'devpost',
  source_url text not null,
  hackathon_slug text,
  status text not null check (status in ('started', 'completed', 'failed')),
  projects_found integer not null default 0,
  projects_saved integer not null default 0,
  developers_saved integer not null default 0,
  error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists developers_stack_idx on public.developers using gin (stack);
create index if not exists projects_stack_idx on public.projects using gin (stack);
create index if not exists projects_hackathon_slug_idx on public.projects (hackathon_slug);
create index if not exists projects_submitted_at_idx on public.projects (submitted_at desc);
create index if not exists offers_developer_id_idx on public.offers (developer_id);
