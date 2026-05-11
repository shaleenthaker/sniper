import "dotenv/config";

export function getEnv(name: string) {
  return process.env[name]?.trim() || undefined;
}

export function requireEnv(name: string) {
  const value = getEnv(name);
  if (!value) throw new Error(`${name} is required`);
  return value;
}

export function dataSource() {
  return getEnv("DATA_SOURCE") === "supabase" ? "supabase" : "mock";
}

export function scraperDelayMs() {
  return Number(getEnv("DEVPOST_SCRAPE_DELAY_MS") ?? 650);
}

export function hackathonDelayMs() {
  return Number(getEnv("DEVPOST_HACKATHON_DELAY_MS") ?? 2500);
}
