import { supabase } from "./supabase.js";
import { discoverDevpostHackathons, scrapeDevpostHackathon, type ScrapedDeveloper, type ScrapedHackathon } from "./devpost.js";
import { hackathonDelayMs } from "./env.js";
import type { Developer, Hackathon, Project } from "./types.js";

type IngestOptions = {
  url: string;
  slug?: string;
  maxPages?: number;
  maxProjects?: number;
  assignPodium?: boolean;
  dryRun?: boolean;
};

type IngestAllOptions = {
  status?: string;
  query?: string;
  maxListPages?: number;
  maxHackathons?: number;
  maxProjectPages?: number;
  maxProjectsPerHackathon?: number;
  skipRecentlyScrapedHours?: number;
  assignPodium?: boolean;
  dryRun?: boolean;
};

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

function toDeveloperRow(developer: ScrapedDeveloper): Developer {
  return {
    id: developer.id,
    name: developer.name,
    handle: developer.handle,
    avatar_url: developer.avatar_url,
    headline: developer.headline,
    stack: [],
    hackathon_count: 0,
    wins: 0,
    links: developer.links,
    linkedin_announced_at: null,
    first_indexed_at: developer.first_indexed_at,
    signal_lead_hours: null
  };
}

async function assertNoSupabaseError<T>(promise: PromiseLike<{ data: T; error: unknown }>, action: string) {
  const { data, error } = await promise;
  if (error) throw new Error(`${action} failed: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
  return data;
}

async function refreshDeveloperStats(developerIds: string[]) {
  const ids = unique(developerIds);
  if (!ids.length) return;
  const db = supabase();
  const rows = await assertNoSupabaseError(
    db.from("project_members").select("developer_id, projects(stack, hackathon_slug, placement, submitted_at)").in("developer_id", ids),
    "load developer project stats"
  ) as unknown as { developer_id: string; projects: Pick<Project, "stack" | "hackathon_slug" | "placement" | "submitted_at"> | Pick<Project, "stack" | "hackathon_slug" | "placement" | "submitted_at">[] | null }[];

  const grouped = new Map<string, Pick<Project, "stack" | "hackathon_slug" | "placement" | "submitted_at">[]>();
  rows.forEach((row) => {
    const relatedProjects = Array.isArray(row.projects) ? row.projects : row.projects ? [row.projects] : [];
    grouped.set(row.developer_id, [...(grouped.get(row.developer_id) ?? []), ...relatedProjects]);
  });

  await Promise.all(ids.map((id) => {
    const devProjects = grouped.get(id) ?? [];
    const stack = unique(devProjects.flatMap((project) => project.stack ?? [])).sort();
    const hackathonCount = unique(devProjects.map((project) => project.hackathon_slug)).length;
    const wins = devProjects.filter((project) => project.placement !== null).length;
    return assertNoSupabaseError(
      db.from("developers").update({ stack, hackathon_count: hackathonCount, wins, updated_at: new Date().toISOString() }).eq("id", id),
      `refresh developer ${id}`
    );
  }));
}

async function saveScrape(scrape: ScrapedHackathon) {
  const db = supabase();
  const developers = unique(scrape.projects.flatMap((entry) => entry.members).map((developer) => JSON.stringify(toDeveloperRow(developer)))).map((value) => JSON.parse(value) as Developer);
  const projects = scrape.projects.map((entry) => entry.project);
  const memberRows = scrape.projects.flatMap((entry) => entry.members.map((member) => ({ project_id: entry.project.id, developer_id: member.id })));

  await assertNoSupabaseError(db.from("hackathons").upsert(scrape.hackathon, { onConflict: "slug" }), "upsert hackathon");
  if (developers.length) await assertNoSupabaseError(db.from("developers").upsert(developers, { onConflict: "id" }), "upsert developers");
  if (projects.length) await assertNoSupabaseError(db.from("projects").upsert(projects, { onConflict: "id" }), "upsert projects");
  if (memberRows.length) await assertNoSupabaseError(db.from("project_members").upsert(memberRows, { onConflict: "project_id,developer_id" }), "upsert project members");
  await refreshDeveloperStats(developers.map((developer) => developer.id));

  return {
    hackathon: scrape.hackathon,
    projects_saved: projects.length,
    developers_saved: developers.length,
    project_members_saved: memberRows.length
  };
}

async function recentDevpostSourceUrls(hours: number) {
  if (!Number.isFinite(hours) || hours <= 0) return [];

  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  const rows = await assertNoSupabaseError(
    supabase()
      .from("ingestion_runs")
      .select("source_url")
      .eq("source", "devpost")
      .eq("status", "completed")
      .gte("completed_at", since)
      .range(0, 9999),
    "load recent Devpost ingestion runs"
  ) as unknown as { source_url: string | null }[];

  return unique(rows.map((row) => row.source_url).filter(Boolean) as string[]);
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function ingestDevpostHackathon(options: IngestOptions) {
  const startedAt = new Date().toISOString();
  const db = options.dryRun ? null : supabase();
  const run = options.dryRun ? null : await assertNoSupabaseError(
    db!.from("ingestion_runs").insert({
      source: "devpost",
      source_url: options.url,
      hackathon_slug: options.slug ?? null,
      status: "started",
      created_at: startedAt
    }).select("id").single(),
    "create ingestion run"
  ) as { id: string };

  try {
    const scrape = await scrapeDevpostHackathon(options);
    const summary = options.dryRun
      ? {
          hackathon: scrape.hackathon,
          projects_saved: 0,
          developers_saved: unique(scrape.projects.flatMap((entry) => entry.members.map((member) => member.id))).length,
          project_members_saved: scrape.projects.reduce((count, entry) => count + entry.members.length, 0)
        }
      : await saveScrape(scrape);

    if (run) {
      await assertNoSupabaseError(
        db!.from("ingestion_runs").update({
          status: "completed",
          hackathon_slug: scrape.hackathon.slug,
          projects_found: scrape.projects.length,
          projects_saved: summary.projects_saved,
          developers_saved: summary.developers_saved,
          completed_at: new Date().toISOString()
        }).eq("id", run.id),
        "complete ingestion run"
      );
    }

    return {
      dry_run: Boolean(options.dryRun),
      source_url: scrape.source_url,
      projects_found: scrape.projects.length,
      ...summary
    };
  } catch (error) {
    if (run) {
      await db!.from("ingestion_runs").update({
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
        completed_at: new Date().toISOString()
      }).eq("id", run.id);
    }
    throw error;
  }
}

export async function ingestAllDevpostHackathons(options: IngestAllOptions = {}) {
  const excludeSourceUrls = options.dryRun || !options.skipRecentlyScrapedHours
    ? []
    : await recentDevpostSourceUrls(options.skipRecentlyScrapedHours);

  const discovery = await discoverDevpostHackathons({
    status: options.status ?? "ended",
    query: options.query,
    maxListPages: options.maxListPages,
    maxHackathons: options.maxHackathons,
    excludeSourceUrls
  });

  const results: Array<{
    title: string;
    url: string;
    priority_score: number;
    priority_reasons: string[];
    ok: boolean;
    projects_found?: number;
    projects_saved?: number;
    developers_saved?: number;
    error?: string;
  }> = [];

  for (const hackathon of discovery.hackathons) {
    try {
      const result = await ingestDevpostHackathon({
        url: hackathon.submission_gallery_url,
        maxPages: options.maxProjectPages,
        maxProjects: options.maxProjectsPerHackathon,
        assignPodium: options.assignPodium ?? true,
        dryRun: options.dryRun
      });
      results.push({
        title: hackathon.title,
        url: hackathon.submission_gallery_url,
        priority_score: hackathon.priority_score,
        priority_reasons: hackathon.priority_reasons,
        ok: true,
        projects_found: result.projects_found,
        projects_saved: result.projects_saved,
        developers_saved: result.developers_saved
      });
    } catch (error) {
      results.push({
        title: hackathon.title,
        url: hackathon.submission_gallery_url,
        priority_score: hackathon.priority_score,
        priority_reasons: hackathon.priority_reasons,
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
    await sleep(hackathonDelayMs());
  }

  return {
    dry_run: Boolean(options.dryRun),
    status: options.status ?? "ended",
    pages_scanned: discovery.pages_scanned,
    total_pages_available: discovery.total_pages_available,
    hackathons_skipped_recently: discovery.hackathons_skipped,
    hackathons_discovered: discovery.hackathons.length,
    hackathons_succeeded: results.filter((result) => result.ok).length,
    hackathons_failed: results.filter((result) => !result.ok).length,
    projects_found: results.reduce((sum, result) => sum + (result.projects_found ?? 0), 0),
    projects_saved: results.reduce((sum, result) => sum + (result.projects_saved ?? 0), 0),
    developers_saved: results.reduce((sum, result) => sum + (result.developers_saved ?? 0), 0),
    results
  };
}

export type { IngestAllOptions, IngestOptions };
