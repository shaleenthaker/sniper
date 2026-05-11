import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function leadLabel(hours: number | null | undefined) {
  if (hours == null) return "+live";
  if (hours < 24) return `+${Math.round(hours)}h`;
  const days = Math.floor(hours / 24);
  const rest = Math.round(hours % 24);
  return `+${days}d ${rest}h`;
}

export function shortDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "2-digit", year: "numeric" }).format(new Date(value));
}

export function initials(name: string) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}
