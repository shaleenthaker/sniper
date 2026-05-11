"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api, queryStale } from "@/lib/api";
import { initials, shortDate } from "@/lib/utils";
import { OfferButton } from "@/components/offer-button";
import { EmptyState, ErrorState, LoadingRows } from "@/components/states";

export default function DeveloperDetailPage() {
  const { id } = useParams<{ id: string }>();
  const detail = useQuery({ queryKey: ["developer", id], queryFn: () => api.developer(id), staleTime: queryStale.normal });

  if (detail.isLoading) return <div className="p-4"><LoadingRows /></div>;
  if (detail.isError) return <div className="p-4"><ErrorState error={detail.error} /></div>;
  if (!detail.data) return <EmptyState text="developer not found" />;

  const { developer, hackathons } = detail.data;

  return (
    <div className="grid min-h-[calc(100vh-48px)] md:grid-cols-[280px_1fr]">
      <aside className="border-r hairline bg-[var(--bg-elev)] p-4">
        <div className="mb-4 grid size-24 place-items-center border hairline bg-[var(--accent-soft)] font-heading text-[28px] text-[var(--accent)]">{initials(developer.name)}</div>
        <h1 className="font-heading text-[22px]">{developer.name}</h1>
        <div className="mb-4 text-[12px] text-[var(--ink-mid)]">@{developer.handle}</div>
        <p className="mb-4 text-[12px] leading-5 text-[var(--ink-mid)]">{developer.headline}</p>
        <div className="mb-5 space-y-1 text-[12px] text-[var(--accent)]">
          <a href={developer.links.devpost} target="_blank">devpost ↗</a>
          {developer.links.github ? <a className="block" href={developer.links.github} target="_blank">github ↗</a> : null}
          {developer.links.linkedin ? <a className="block" href={developer.links.linkedin} target="_blank">linkedin ↗</a> : null}
        </div>
        <div className="mb-5 flex flex-wrap gap-1">{developer.stack.map((tag) => <span key={tag} className="chip">{tag}</span>)}</div>
        <OfferButton developerId={developer.id} label="+ SEND OFFER" />
      </aside>
      <section className="p-4">
        <h2 className="mb-3 text-[12px] uppercase text-[var(--ink-mid)]">hackathon history</h2>
        <div className="border-l hairline">
          {hackathons.map((appearance) => (
            <div key={appearance.project.id} className="relative border-b hairline py-3 pl-5 text-[12px] before:absolute before:left-[-5px] before:top-4 before:size-2 before:border before:border-[var(--accent)] before:bg-[var(--bg)]">
              <div className="mb-1 flex flex-wrap gap-2">
                <Link href={`/hackathons/${appearance.hackathon.slug}`} className="text-[var(--ink)]">{appearance.hackathon.name}</Link>
                <span className="text-[var(--ink-soft)]">{shortDate(appearance.hackathon.start_date)}</span>
                <span className="text-[var(--accent)]">{appearance.placement ? `0${appearance.placement}.` : "submitted"}</span>
              </div>
              <Link href={`/projects/${appearance.project.id}`} className="text-[var(--ink-mid)]">{appearance.project.title}</Link>
              <div className="mt-2">{appearance.project.stack.map((tag) => <span key={tag} className="chip mr-1">{tag}</span>)}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
