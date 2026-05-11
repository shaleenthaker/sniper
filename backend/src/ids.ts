export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/https?:\/\//g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

export function developerIdFromHandle(handle: string) {
  return `devpost-${slugify(handle)}`;
}

export function projectIdFromUrl(url: string) {
  const parsed = new URL(url);
  const slug = parsed.pathname.split("/").filter(Boolean).pop() ?? parsed.hostname;
  return `devpost-${slugify(slug)}`;
}
