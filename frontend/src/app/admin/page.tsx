"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { api, getAdminToken, queryStale, setAdminToken } from "@/lib/api";
import { shortDate } from "@/lib/utils";
import { EmptyState, ErrorState, LoadingRows } from "@/components/states";
import type { IngestionRun } from "@/lib/types";

function statusClass(status: IngestionRun["status"]) {
  if (status === "completed") return "text-[var(--signal)]";
  if (status === "failed") return "text-[var(--offered)]";
  return "text-[var(--accent)]";
}

function sourceLabel(url: string) {
  return url.replace(/^https?:\/\//, "").replace(/\/project-gallery.*$/, "");
}

export default function AdminPage() {
  const queryClient = useQueryClient();
  const [token, setToken] = useState("");

  useEffect(() => {
    setToken(getAdminToken());
  }, []);

  const ingestion = useQuery({
    queryKey: ["admin", "ingestion", token],
    queryFn: () => api.ingestion("limit=30"),
    staleTime: queryStale.fresh
  });

  const dryRun = useMutation({
    mutationFn: () => api.runDevpostIngestion({
      dry_run: true,
      max_list_pages: 1,
      max_hackathons: 3,
      max_project_pages: 1,
      max_projects_per_hackathon: 1
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "ingestion"] })
  });

  const liveRun = useMutation({
    mutationFn: () => api.runDevpostIngestion({
      dry_run: false,
      max_list_pages: 3,
      max_hackathons: 10,
      max_project_pages: 1,
      max_projects_per_hackathon: 24,
      skip_recent_hours: 24
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "ingestion"] })
  });

  function saveToken() {
    setAdminToken(token);
    queryClient.invalidateQueries();
  }

  const action = dryRun.data ?? liveRun.data;
  const actionError = dryRun.error ?? liveRun.error;
  const actionPending = dryRun.isPending || liveRun.isPending;
  const summary = ingestion.data?.summary;

  return (
    <div className="space-y-6 p-4">
      <section className="grid gap-2 md:grid-cols-[1fr_360px]">
        <div>
          <h1 className="mb-3 text-[12px] uppercase text-[var(--ink-mid)]">admin</h1>
          <div className="grid gap-2 md:grid-cols-4">
            {[
              ["latest", summary?.latest_run?.status ?? "--"],
              ["completed", summary?.completed ?? "--"],
              ["failed", summary?.failed ?? "--"],
              ["saved", `${summary?.projects_saved ?? 0}p / ${summary?.developers_saved ?? 0}d`]
            ].map(([label, value]) => (
              <div key={label} className="border hairline bg-[var(--bg-elev)] p-3">
                <div className="font-heading text-[28px] leading-none text-[var(--ink)]">{value}</div>
                <div className="mt-2 text-[11px] uppercase text-[var(--ink-mid)]">{label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="border-y hairline py-3">
          <label className="block text-[11px] uppercase text-[var(--ink-soft)]">
            admin token
            <input value={token} onChange={(event) => setToken(event.target.value)} type="password" className="mt-1 w-full border hairline bg-[var(--bg-elev)] px-2 py-2 text-[12px] text-[var(--ink)] outline-none" />
          </label>
          <div className="mt-2 flex gap-2">
            <button onClick={saveToken} className="border hairline px-3 py-2 text-[12px] text-[var(--accent)] hover:bg-[var(--accent-soft)]">save</button>
            <button onClick={() => { setToken(""); setAdminToken(""); queryClient.invalidateQueries(); }} className="border hairline px-3 py-2 text-[12px] text-[var(--ink-mid)]">clear</button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-[260px_1fr]">
        <div className="border-y hairline py-3">
          <h2 className="mb-3 text-[12px] uppercase text-[var(--ink-mid)]">ingestion controls</h2>
          <div className="space-y-2">
            <button disabled={actionPending} onClick={() => dryRun.mutate()} className="block w-full border hairline px-3 py-2 text-left text-[12px] text-[var(--signal)] hover:bg-[var(--bg-hover)] disabled:text-[var(--ink-soft)]">dry run</button>
            <button disabled={actionPending} onClick={() => liveRun.mutate()} className="block w-full border hairline px-3 py-2 text-left text-[12px] text-[var(--accent)] hover:bg-[var(--accent-soft)] disabled:text-[var(--ink-soft)]">run capped scrape</button>
            <button onClick={() => ingestion.refetch()} className="block w-full border hairline px-3 py-2 text-left text-[12px] text-[var(--ink-mid)] hover:bg-[var(--bg-hover)]">refresh</button>
          </div>
        </div>

        <div className="min-w-0">
          {actionPending ? <LoadingRows rows={3} /> : actionError ? <ErrorState error={actionError} /> : action ? (
            <pre className="max-h-64 overflow-auto border hairline bg-[var(--bg-elev)] p-3 text-[11px] text-[var(--ink-mid)]">{JSON.stringify(action, null, 2)}</pre>
          ) : null}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-[12px] uppercase text-[var(--ink-mid)]">ingestion runs</h2>
        {ingestion.isLoading ? <LoadingRows rows={8} /> : ingestion.isError ? <ErrorState error={ingestion.error} /> : ingestion.data?.runs.length ? (
          <table className="dense-table text-[12px]">
            <thead><tr><th>status</th><th>source</th><th>saved</th><th>started</th><th>completed</th><th>error</th></tr></thead>
            <tbody>
              {ingestion.data.runs.map((run) => (
                <tr key={run.id}>
                  <td className={statusClass(run.status)}>{run.status}</td>
                  <td><a href={run.source_url} target="_blank" className="text-[var(--accent)]">{sourceLabel(run.source_url)}</a><div className="text-[var(--ink-soft)]">{run.hackathon_slug ?? "pending slug"}</div></td>
                  <td>{run.projects_saved}p / {run.developers_saved}d</td>
                  <td>{shortDate(run.created_at)}</td>
                  <td>{run.completed_at ? shortDate(run.completed_at) : "--"}</td>
                  <td className="max-w-[360px] truncate text-[var(--offered)]">{run.error ?? "--"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <EmptyState text="no ingestion runs recorded" />}
      </section>
    </div>
  );
}
