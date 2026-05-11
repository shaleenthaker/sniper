"use client";

import { Command } from "cmdk";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api, queryStale } from "@/lib/api";

export function CommandMenu({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const developers = useQuery({ queryKey: ["developers", "command"], queryFn: () => api.developers("limit=50"), staleTime: queryStale.normal });
  const hackathons = useQuery({ queryKey: ["hackathons", "command"], queryFn: () => api.hackathons("year=2025"), staleTime: queryStale.normal });
  const projects = useQuery({ queryKey: ["projects", "command"], queryFn: () => api.projects(), staleTime: queryStale.normal });

  function go(path: string) {
    router.push(path);
    onOpenChange(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 p-4 pt-[12vh]" onClick={() => onOpenChange(false)}>
      <Command className="mx-auto max-w-2xl border hairline bg-[var(--bg)]" onClick={(event) => event.stopPropagation()}>
        <Command.Input autoFocus placeholder="run query..." className="w-full border-b hairline bg-[var(--bg-elev)] px-3 py-3 text-[13px] text-[var(--ink)] outline-none" />
        <Command.List className="max-h-[60vh] overflow-auto p-2">
          <Command.Empty className="px-2 py-8 text-center text-[12px] text-[var(--ink-soft)]">no query match · try react, rust, or hackmit</Command.Empty>
          <Command.Group heading="saved searches" className="text-[11px] uppercase text-[var(--ink-soft)]">
            <Command.Item onSelect={() => go("/developers?stack=react,rust&placed_top=3&sort=signal_lead")} className="cursor-pointer px-2 py-2 text-[12px] text-[var(--ink-mid)] aria-selected:bg-[var(--bg-hover)]">find top-3 developers using React and Rust</Command.Item>
            <Command.Item onSelect={() => go("/feed?stack=react")} className="cursor-pointer px-2 py-2 text-[12px] text-[var(--ink-mid)] aria-selected:bg-[var(--bg-hover)]">fresh pre-LinkedIn React signals</Command.Item>
          </Command.Group>
          <Command.Group heading="developers" className="text-[11px] uppercase text-[var(--ink-soft)]">
            {developers.data?.developers.map((developer) => (
              <Command.Item key={developer.id} value={`${developer.name} ${developer.stack.join(" ")}`} onSelect={() => go(`/developers/${developer.id}`)} className="cursor-pointer px-2 py-2 text-[12px] text-[var(--ink-mid)] aria-selected:bg-[var(--bg-hover)]">
                {developer.name} · {developer.stack.slice(0, 4).join(", ")}
              </Command.Item>
            ))}
          </Command.Group>
          <Command.Group heading="hackathons" className="text-[11px] uppercase text-[var(--ink-soft)]">
            {hackathons.data?.hackathons.map((hackathon) => (
              <Command.Item key={hackathon.slug} value={`${hackathon.name} ${hackathon.slug}`} onSelect={() => go(`/hackathons/${hackathon.slug}`)} className="cursor-pointer px-2 py-2 text-[12px] text-[var(--ink-mid)] aria-selected:bg-[var(--bg-hover)]">
                {hackathon.name} · {hackathon.submission_count} submissions
              </Command.Item>
            ))}
          </Command.Group>
          <Command.Group heading="projects" className="text-[11px] uppercase text-[var(--ink-soft)]">
            {projects.data?.projects.slice(0, 40).map((project) => (
              <Command.Item key={project.id} value={`${project.title} ${project.stack.join(" ")}`} onSelect={() => go(`/projects/${project.id}`)} className="cursor-pointer px-2 py-2 text-[12px] text-[var(--ink-mid)] aria-selected:bg-[var(--bg-hover)]">
                {project.title} · {project.hackathon_slug}
              </Command.Item>
            ))}
          </Command.Group>
        </Command.List>
      </Command>
    </div>
  );
}
