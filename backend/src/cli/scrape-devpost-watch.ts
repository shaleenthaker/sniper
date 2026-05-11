import "../env.js";
import { ingestAllDevpostHackathons } from "../ingest.js";
import { skipRecentHackathonsHours, watchIntervalMs } from "../env.js";

function readArg(name: string) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function hasFlag(name: string) {
  return process.argv.includes(name);
}

function numericArg(name: string, fallback: number) {
  const value = readArg(name);
  if (!value) return fallback;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

const intervalMs = numericArg("--interval-ms", watchIntervalMs());
const skipRecentlyScrapedHours = hasFlag("--no-skip-recent") ? undefined : numericArg("--skip-recent-hours", skipRecentHackathonsHours());
const once = hasFlag("--once");

let cycle = 1;

while (true) {
  const startedAt = new Date().toISOString();
  console.log(`[${startedAt}] starting prioritized Devpost scrape cycle ${cycle}`);

  const result = await ingestAllDevpostHackathons({
    status: readArg("--status") ?? "ended",
    query: readArg("--query"),
    maxListPages: numericArg("--max-list-pages", 3),
    maxHackathons: numericArg("--max-hackathons", 10),
    maxProjectPages: numericArg("--max-project-pages", 1),
    maxProjectsPerHackathon: numericArg("--max-projects-per-hackathon", 24),
    skipRecentlyScrapedHours,
    assignPodium: !hasFlag("--no-podium"),
    dryRun: hasFlag("--dry-run")
  });

  console.log(JSON.stringify(result, null, 2));

  if (once) break;

  console.log(`[${new Date().toISOString()}] sleeping ${intervalMs}ms before next scrape cycle`);
  await sleep(intervalMs);
  cycle += 1;
}
