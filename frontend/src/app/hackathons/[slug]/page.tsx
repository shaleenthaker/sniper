"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, queryStale } from "@/lib/api";
import { shortDate } from "@/lib/utils";
import { EmailButton } from "@/components/email-button";
import { OfferButton } from "@/components/offer-button";
import { EmptyState, ErrorState, LoadingRows } from "@/components/states";
import type { Developer } from "@/lib/types";

function offerStatus(members: Developer[]) {
  const offer = members.map((member) => member.offer).find(Boolean);
  return offer?.status ?? null;
}

export default function HackathonDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const queryClient = useQueryClient();
  const detail = useQuery({ queryKey: ["hackathon", slug], queryFn: () => api.hackathon(slug), staleTime: queryStale.normal });
  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "sent" | "accepted" | "rejected" | "withdrawn" }) => api.updateOffer(id, status),
    onSuccess: () => queryClient.invalidateQueries()
  });

  if (detail.isLoading) return <div className="p-4"><LoadingRows /></div>;
  if (detail.isError) return <div className="p-4"><ErrorState error={detail.error} /></div>;
  if (!detail.data) return <EmptyState text="hackathon not found" />;

  const firstStatus = offerStatus(detail.data.podium[0]?.members ?? []);
  const secondStatus = offerStatus(detail.data.podium[1]?.members ?? []);
  const fallbackRank = firstStatus === "rejected" && secondStatus === "rejected" ? 3 : firstStatus === "sent" || firstStatus === "rejected" ? 2 : null;

  return (
    <div className="p-4">
      <header className="mb-5 border-b hairline pb-4">
        <h1 className="font-heading text-[26px]">{detail.data.hackathon.name}</h1>
        <div className="mt-1 text-[12px] text-[var(--ink-mid)]">{shortDate(detail.data.hackathon.start_date)} → {shortDate(detail.data.hackathon.end_date)} · {detail.data.hackathon.organizer} · {detail.data.hackathon.submission_count} submissions</div>
      </header>

      <section className="mb-6">
        <h2 className="mb-2 text-[12px] uppercase text-[var(--ink-mid)]">podium</h2>
        <div className="border-y hairline">
          {detail.data.podium.map((row) => {
            const status = offerStatus(row.members);
            const offer = row.members.map((member) => member.offer).find(Boolean);
            const primaryMember = row.members[0];

            return (
              <div key={row.rank} className="grid gap-3 border-b hairline px-3 py-3 text-[12px] hover:bg-[var(--bg-hover)] md:grid-cols-[48px_1.3fr_1fr_1fr_160px]">
                <div className="font-heading text-[20px] text-[var(--accent)]">0{row.rank}.</div>
                <div>
                  <Link href={`/projects/${row.project.id}`} className="text-[var(--ink)]">{row.project.title}</Link>
                  {fallbackRank === row.rank ? <div className="mt-1 text-[var(--signal)]">next-up if 01 declines</div> : null}
                </div>
                <div className="space-y-1">
                  {row.members.length ? row.members.map((member) => (
                    <div key={member.id} className="flex flex-wrap items-center gap-1">
                      <Link href={`/developers/${member.id}`} className="text-[var(--ink-mid)]">{member.name}</Link>
                      <EmailButton developerId={member.id} developerName={member.name} defaultTo={member.links.email} label="+EMAIL" />
                    </div>
                  )) : <span className="text-[var(--ink-soft)]">no members indexed</span>}
                </div>
                <div>{row.project.stack.slice(0, 4).map((tag) => <span key={tag} className="chip mr-1">{tag}</span>)}</div>
                <div className="flex flex-wrap items-center gap-2">
                  {status ? <span className={status === "rejected" ? "text-[var(--offered)]" : "text-[var(--accent)]"}>■ {status}</span> : primaryMember ? <OfferButton developerId={primaryMember.id} /> : <span className="text-[11px] text-[var(--ink-soft)]">—</span>}
                  {offer ? <button onClick={() => mutation.mutate({ id: offer.id, status: "rejected" })} className="border hairline px-2 py-1 text-[11px] text-[var(--offered)]">mark rejected</button> : null}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-[12px] uppercase text-[var(--ink-mid)]">all submissions</h2>
        <table className="dense-table text-[12px]">
          <thead><tr><th>project</th><th>placement</th><th>stack</th><th>submitted</th><th>→</th></tr></thead>
          <tbody>
            {detail.data.submissions.map((project) => (
              <tr key={project.id}>
                <td>{project.title}</td>
                <td>{project.placement ? `0${project.placement}.` : "—"}</td>
                <td>{project.stack.map((tag) => <span key={tag} className="chip mr-1">{tag}</span>)}</td>
                <td>{shortDate(project.submitted_at)}</td>
                <td><Link href={`/projects/${project.id}`} className="text-[var(--accent)]">→</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
