"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api, queryStale } from "@/lib/api";
import { shortDate } from "@/lib/utils";
import { EmptyState, ErrorState, LoadingRows } from "@/components/states";

export default function ProjectsPage() {
  const projects = useQuery({ queryKey: ["projects", "list"], queryFn: () => api.projects(), staleTime: queryStale.normal });

  return (
    <div className="p-4">
      <h1 className="mb-3 text-[12px] uppercase text-[var(--ink-mid)]">projects</h1>
      {projects.isLoading ? <LoadingRows rows={10} /> : projects.isError ? <ErrorState error={projects.error} /> : projects.data?.projects.length ? (
        <table className="dense-table text-[12px]">
          <thead><tr><th>project</th><th>hackathon</th><th>stack</th><th>placement</th><th>submitted</th><th>→</th></tr></thead>
          <tbody>
            {projects.data.projects.map((project) => (
              <tr key={project.id}>
                <td><Link href={`/projects/${project.id}`}>{project.title}</Link><div className="text-[var(--ink-soft)]">{project.tagline}</div></td>
                <td><Link href={`/hackathons/${project.hackathon_slug}`}>{project.hackathon_slug}</Link></td>
                <td>{project.stack.slice(0, 5).map((tag) => <span key={tag} className="chip mr-1">{tag}</span>)}</td>
                <td>{project.placement ? `0${project.placement}.` : "—"}</td>
                <td>{shortDate(project.submitted_at)}</td>
                <td><Link href={`/projects/${project.id}`} className="text-[var(--accent)]">→</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : <EmptyState text="no projects indexed" />}
    </div>
  );
}
