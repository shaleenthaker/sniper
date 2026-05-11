import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";
import { getEnv, scraperDelayMs } from "./env.js";
import { developerIdFromHandle, projectIdFromUrl, slugify } from "./ids.js";
import type { Developer, Hackathon, Project } from "./types.js";

export type ScrapedDeveloper = Pick<Developer, "id" | "name" | "handle" | "avatar_url" | "headline" | "links" | "first_indexed_at">;

export type ScrapedProject = {
  project: Project;
  members: ScrapedDeveloper[];
};

export type ScrapedHackathon = {
  hackathon: Hackathon;
  projects: ScrapedProject[];
  source_url: string;
};

export type DiscoveredDevpostHackathon = {
  id: number;
  title: string;
  url: string;
  submission_gallery_url: string;
  organization_name: string | null;
  open_state: string;
  submission_period_dates: string | null;
  registrations_count: number | null;
  winners_announced: boolean;
};

type GalleryProject = {
  url: string;
  title: string | null;
  tagline: string | null;
  winner: boolean;
  members: ScrapedDeveloper[];
};

function compactText(value: string | null | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeUrl(url: string, base?: string) {
  return new URL(url, base).toString();
}

function hackathonSlugFromUrl(url: string) {
  const parsed = new URL(url);
  if (parsed.hostname.endsWith(".devpost.com") && parsed.hostname !== "devpost.com") {
    return slugify(parsed.hostname.replace(".devpost.com", ""));
  }
  return slugify(parsed.pathname.split("/").filter(Boolean)[0] ?? parsed.hostname);
}

function galleryUrl(url: string, page: number) {
  const parsed = new URL(url);
  if (!parsed.pathname.includes("project-gallery")) parsed.pathname = "/project-gallery";
  parsed.searchParams.set("page", String(page));
  return parsed.toString();
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchHtml(url: string) {
  const res = await fetch(url, {
    headers: {
      accept: "text/html,application/xhtml+xml",
      "user-agent": getEnv("SCRAPER_USER_AGENT") ?? "SniperTalentIndexer/0.1 contact=admin@example.com"
    }
  });
  if (!res.ok) throw new Error(`Devpost fetch failed ${res.status} for ${url}`);
  return res.text();
}

async function fetchJson<T>(url: string) {
  const res = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent": getEnv("SCRAPER_USER_AGENT") ?? "SniperTalentIndexer/0.1 contact=admin@example.com"
    }
  });
  if (!res.ok) throw new Error(`Devpost API fetch failed ${res.status} for ${url}`);
  return res.json() as Promise<T>;
}

function parseJsonLd($: CheerioAPI) {
  for (const element of $('script[type="application/ld+json"]').toArray()) {
    const raw = $(element).text();
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return parsed as Record<string, unknown>;
    } catch {
      // Devpost templates vary; selector fallbacks below handle missing JSON-LD.
    }
  }
  return {};
}

function parseHackathon(html: string, url: string, slugOverride?: string): Hackathon {
  const $ = cheerio.load(html);
  const ld = parseJsonLd($);
  const slug = slugOverride ? slugify(slugOverride) : hackathonSlugFromUrl(url);
  const title = compactText($("title").first().text()).replace(/\s*-\s*Devpost$/i, "");
  const submissionText = compactText($(".pagination-info").first().text());
  const submissionCount = Number(submissionText.match(/of\s+([0-9,]+)/i)?.[1]?.replace(/,/g, "") ?? $(".gallery-item").length);
  const start = typeof ld.startDate === "string" ? ld.startDate.slice(0, 10) : new Date().toISOString().slice(0, 10);
  const end = typeof ld.endDate === "string" ? ld.endDate.slice(0, 10) : start;

  return {
    slug,
    name: typeof ld.name === "string" ? ld.name : title || slug,
    organizer: null,
    start_date: start,
    end_date: end,
    url: normalizeUrl(url),
    submission_count: submissionCount,
    top_stacks: []
  };
}

function parseGallery(html: string, baseUrl: string): GalleryProject[] {
  const $ = cheerio.load(html);
  return $(".gallery-item").toArray().map((element) => {
    const root = $(element);
    const href = root.find("a.link-to-software").first().attr("href");
    if (!href) return null;
    const members = root.find(".members .user-profile-link").toArray().map((memberElement) => {
      const member = $(memberElement);
      const profileUrl = member.attr("data-url") ?? member.attr("href") ?? "";
      const profile = new URL(profileUrl, baseUrl);
      const handle = decodeURIComponent(profile.pathname.split("/").filter(Boolean)[0] ?? "");
      const img = member.find("img").first();
      const name = compactText(img.attr("alt")) || handle;
      return {
        id: developerIdFromHandle(handle),
        name,
        handle,
        avatar_url: img.attr("src") ? normalizeUrl(img.attr("src") as string, baseUrl) : null,
        headline: null,
        links: { devpost: `https://devpost.com/${handle}` },
        first_indexed_at: new Date().toISOString()
      };
    }).filter((member) => member.handle);

    return {
      url: normalizeUrl(href, baseUrl),
      title: compactText(root.find("h5").first().text()) || null,
      tagline: compactText(root.find(".tagline").first().text()) || null,
      winner: /winner/i.test(root.find(".entry-badge").text()),
      members
    };
  }).filter(Boolean) as GalleryProject[];
}

function parseProject(html: string, galleryProject: GalleryProject, hackathonSlug: string, placement: 1 | 2 | 3 | null): ScrapedProject {
  const $ = cheerio.load(html);
  const title = compactText($("#app-title").first().text()) || galleryProject.title || projectIdFromUrl(galleryProject.url);
  const tagline = compactText($("#software-header p.large").first().text()) || galleryProject.tagline;
  const story = compactText($("#app-details-left").clone().find("#gallery, #built-with, .app-links").remove().end().text()).slice(0, 4000) || null;
  const stack = $("#built-with .cp-tag").toArray().map((element) => compactText($(element).text()).toLowerCase()).filter(Boolean);
  const teamMembers = $("#app-team .software-team-member").toArray().map((element) => {
    const root = $(element);
    const link = root.find(".user-profile-link").first();
    const href = link.attr("href");
    if (!href) return null;
    const profile = new URL(href, galleryProject.url);
    const handle = decodeURIComponent(profile.pathname.split("/").filter(Boolean)[0] ?? "");
    const img = root.find("img").first();
    const name = compactText(link.text()) || compactText(img.attr("alt")) || handle;
    const headline = compactText(root.find("small").first().text()) || null;
    return {
      id: developerIdFromHandle(handle),
      name,
      handle,
      avatar_url: img.attr("src") ? normalizeUrl(img.attr("src") as string, galleryProject.url) : null,
      headline,
      links: { devpost: `https://devpost.com/${handle}` },
      first_indexed_at: new Date().toISOString()
    };
  }).filter(Boolean) as ScrapedDeveloper[];

  const members = teamMembers.length ? teamMembers : galleryProject.members;
  const memberIds = members.map((member) => member.id);

  return {
    project: {
      id: projectIdFromUrl(galleryProject.url),
      title,
      tagline,
      description: story,
      devpost_url: galleryProject.url,
      hackathon_slug: hackathonSlug,
      stack: Array.from(new Set(stack)),
      placement,
      member_ids: memberIds,
      submitted_at: new Date().toISOString()
    },
    members
  };
}

export async function scrapeDevpostHackathon(input: { url: string; slug?: string; maxPages?: number; maxProjects?: number; assignPodium?: boolean }): Promise<ScrapedHackathon> {
  const firstUrl = galleryUrl(input.url, 1);
  const firstHtml = await fetchHtml(firstUrl);
  const firstHackathon = parseHackathon(firstHtml, input.url, input.slug);
  const firstGallery = parseGallery(firstHtml, firstUrl);
  const $ = cheerio.load(firstHtml);
  const discoveredPages = $("ul.pagination a").toArray()
    .map((element) => Number(new URL($(element).attr("href") ?? "", firstUrl).searchParams.get("page") ?? 0))
    .filter((page) => Number.isFinite(page) && page > 0);
  const lastPage = Math.max(1, ...discoveredPages);
  const maxPages = Math.min(input.maxPages ?? lastPage, lastPage);
  const galleryProjects = [...firstGallery];

  for (let page = 2; page <= maxPages; page += 1) {
    await sleep(scraperDelayMs());
    const pageUrl = galleryUrl(input.url, page);
    galleryProjects.push(...parseGallery(await fetchHtml(pageUrl), pageUrl));
  }

  const uniqueProjects = Array.from(new Map(galleryProjects.map((project) => [project.url, project])).values()).slice(0, input.maxProjects ?? galleryProjects.length);
  const scrapedProjects: ScrapedProject[] = [];
  let winnerRank = 0;

  for (const project of uniqueProjects) {
    await sleep(scraperDelayMs());
    const rank = input.assignPodium && project.winner && winnerRank < 3 ? (++winnerRank as 1 | 2 | 3) : null;
    scrapedProjects.push(parseProject(await fetchHtml(project.url), project, firstHackathon.slug, rank));
  }

  const topStacks = Array.from(new Set(scrapedProjects.flatMap((entry) => entry.project.stack))).slice(0, 12);
  return {
    source_url: firstUrl,
    hackathon: {
      ...firstHackathon,
      submission_count: firstHackathon.submission_count || uniqueProjects.length,
      top_stacks: topStacks
    },
    projects: scrapedProjects
  };
}

export async function discoverDevpostHackathons(input: { status?: string; maxListPages?: number; maxHackathons?: number; query?: string } = {}) {
  const status = input.status ?? "ended";
  const discovered: DiscoveredDevpostHackathon[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const url = new URL("https://devpost.com/api/hackathons");
    url.searchParams.append("status[]", status);
    url.searchParams.set("page", String(page));
    if (input.query) url.searchParams.set("search", input.query);

    const payload = await fetchJson<{
      hackathons: Array<{
        id: number;
        title: string;
        url: string;
        open_state: string;
        submission_gallery_url: string | null;
        organization_name: string | null;
        submission_period_dates: string | null;
        registrations_count: number | null;
        winners_announced: boolean;
      }>;
      meta?: { total_count?: number; per_page?: number };
    }>(url.toString());

    const perPage = payload.meta?.per_page ?? Math.max(payload.hackathons.length, 1);
    totalPages = Math.max(1, Math.ceil((payload.meta?.total_count ?? payload.hackathons.length) / perPage));
    payload.hackathons
      .filter((hackathon) => hackathon.submission_gallery_url)
      .forEach((hackathon) => {
        discovered.push({
          id: hackathon.id,
          title: hackathon.title,
          url: hackathon.url,
          submission_gallery_url: hackathon.submission_gallery_url as string,
          organization_name: hackathon.organization_name,
          open_state: hackathon.open_state,
          submission_period_dates: hackathon.submission_period_dates,
          registrations_count: hackathon.registrations_count,
          winners_announced: hackathon.winners_announced
        });
      });

    if (input.maxHackathons && discovered.length >= input.maxHackathons) break;
    if (input.maxListPages && page >= input.maxListPages) break;
    page += 1;
    await sleep(scraperDelayMs());
  }

  return {
    hackathons: discovered.slice(0, input.maxHackathons ?? discovered.length),
    pages_scanned: Math.min(page, input.maxListPages ?? page),
    total_pages_available: totalPages
  };
}
