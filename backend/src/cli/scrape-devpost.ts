import "../env.js";
import { ingestDevpostHackathon } from "../ingest.js";

function readArg(name: string) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function hasFlag(name: string) {
  return process.argv.includes(name);
}

const url = readArg("--url") ?? process.argv[2];

if (!url || url.startsWith("--")) {
  console.error("Usage: npm run scrape:devpost -- --url https://example.devpost.com/project-gallery [--slug example-2025] [--max-pages 1] [--max-projects 24] [--dry-run]");
  process.exit(1);
}

const result = await ingestDevpostHackathon({
  url,
  slug: readArg("--slug"),
  maxPages: readArg("--max-pages") ? Number(readArg("--max-pages")) : undefined,
  maxProjects: readArg("--max-projects") ? Number(readArg("--max-projects")) : undefined,
  assignPodium: !hasFlag("--no-podium"),
  dryRun: hasFlag("--dry-run")
});

console.log(JSON.stringify(result, null, 2));
