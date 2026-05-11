import "../env.js";
import { ingestAllDevpostHackathons } from "../ingest.js";

function readArg(name: string) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function hasFlag(name: string) {
  return process.argv.includes(name);
}

function numericArg(name: string, fallback?: number) {
  const value = readArg(name);
  return value ? Number(value) : fallback;
}

const scrapeEverything = hasFlag("--all");

if (scrapeEverything && !hasFlag("--yes")) {
  console.error("Refusing an uncapped Devpost scrape without --yes. This can take hours and make many requests.");
  console.error("Use capped options first, or run: npm run scrape:devpost:all -- --all --yes");
  process.exit(1);
}

const result = await ingestAllDevpostHackathons({
  status: readArg("--status") ?? "ended",
  query: readArg("--query"),
  maxListPages: scrapeEverything ? undefined : numericArg("--max-list-pages", 1),
  maxHackathons: scrapeEverything ? undefined : numericArg("--max-hackathons", 5),
  maxProjectPages: scrapeEverything ? undefined : numericArg("--max-project-pages", 1),
  maxProjectsPerHackathon: scrapeEverything ? undefined : numericArg("--max-projects-per-hackathon", 24),
  assignPodium: !hasFlag("--no-podium"),
  dryRun: hasFlag("--dry-run")
});

console.log(JSON.stringify(result, null, 2));
