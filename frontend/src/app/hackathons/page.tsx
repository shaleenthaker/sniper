"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api, queryStale } from "@/lib/api";
import { shortDate } from "@/lib/utils";
import { EmptyState, ErrorState, LoadingRows } from "@/components/states";

export default function HackathonsPage() {
  const hackathons = useQuery({ queryKey: ["hackathons", "list"], queryFn: () => api.hackathons("year=2025"), staleTime: queryStale.normal });

  return (
    <div className="p-4">
      <h1 className="mb-3 text-[12px] uppercase text-[var(--ink-mid)]">hackathons</h1>
      {hackathons.isLoading ? <LoadingRows /> : hackathons.isError ? <ErrorState error={hackathons.error} /> : hackathons.data?.hackathons.length ? (
        <table className="dense-table text-[12px]">
          <thead><tr><th>name</th><th>dates</th><th>submissions</th><th>top stacks</th><th>→</th></tr></thead>
          <tbody>
            {hackathons.data.hackathons.map((hackathon) => (
              <tr key={hackathon.slug}>
                <td><Link href={`/hackathons/${hackathon.slug}`}>{hackathon.name}</Link><div className="text-[var(--ink-soft)]">{hackathon.organizer}</div></td>
                <td>{shortDate(hackathon.start_date)} · {shortDate(hackathon.end_date)}</td>
                <td>{hackathon.submission_count}</td>
                <td>{hackathon.top_stacks.map((tag) => <span key={tag} className="chip mr-1">{tag}</span>)}</td>
                <td><Link href={`/hackathons/${hackathon.slug}`} className="text-[var(--accent)]">→</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : <EmptyState text="no hackathons match this query" />}
    </div>
  );
}
