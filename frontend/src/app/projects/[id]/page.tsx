"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api, queryStale } from "@/lib/api";
import { shortDate } from "@/lib/utils";
import { OfferButton } from "@/components/offer-button";
import { EmptyState, ErrorState, LoadingRows } from "@/components/states";

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const detail = useQuery({ queryKey: ["project", id], queryFn: () => api.project(id), staleTime: queryStale.normal });

  if (detail.isLoading) return <div className="p-4"><LoadingRows /></div>;
  if (detail.isError) return <div className="p-4"><ErrorState error={detail.error} /></div>;
  if (!detail.data) return <EmptyState text="project not found" />;

  const { project, hackathon, members } = detail.data;

  return (
    <div className="p-4">
      <header className="mb-5 border-b hairline pb-4">
        <div className="mb-2 text-[12px] text-[var(--accent)]">{project.placement ? `0${project.placement}. podium` : "submission"}</div>
        <h1 className="font-heading text-[28px]">{project.title}</h1>
        <p className="mt-2 max-w-3xl text-[13px] leading-6 text-[var(--ink-mid)]">{project.description}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-[12px]">
          <Link href={`/hackathons/${hackathon.slug}`} className="text-[var(--accent)]">{hackathon.name}</Link>
          <span className="text-[var(--ink-soft)]">{shortDate(project.submitted_at)}</span>
          <a href={project.devpost_url} target="_blank" className="text-[var(--accent)]">devpost ↗</a>
        </div>
      </header>
      <section className="mb-6">
        <h2 className="mb-2 text-[12px] uppercase text-[var(--ink-mid)]">team</h2>
        <table className="dense-table text-[12px]">
          <thead><tr><th>developer</th><th>stack</th><th>status</th><th>offer</th></tr></thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id}>
                <td><Link href={`/developers/${member.id}`}>{member.name}</Link><div className="text-[var(--ink-soft)]">@{member.handle}</div></td>
                <td>{member.stack.slice(0, 6).map((tag) => <span key={tag} className="chip mr-1">{tag}</span>)}</td>
                <td className={member.offer ? "text-[var(--offered)]" : "text-[var(--accent)]"}>{member.offer ? `■ ${member.offer.status}` : "□ open"}</td>
                <td><OfferButton developerId={member.id} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section>
        <h2 className="mb-2 text-[12px] uppercase text-[var(--ink-mid)]">stack</h2>
        <div>{project.stack.map((tag) => <span key={tag} className="chip mr-1">{tag}</span>)}</div>
      </section>
    </div>
  );
}
