"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { api, queryStale } from "@/lib/api";
import { leadLabel, shortDate } from "@/lib/utils";
import { OfferButton } from "@/components/offer-button";
import { EmptyState, ErrorState, LoadingRows } from "@/components/states";

export default function DashboardPage() {
  const developers = useQuery({ queryKey: ["developers", "dashboard"], queryFn: () => api.developers("limit=50"), staleTime: queryStale.normal });
  const hackathons = useQuery({ queryKey: ["hackathons"], queryFn: () => api.hackathons("year=2025"), staleTime: queryStale.normal });
  const fresh = useQuery({ queryKey: ["fresh", "dashboard"], queryFn: () => api.fresh(), staleTime: queryStale.fresh });

  const avgLead = Math.round(
    (developers.data?.developers.filter((developer) => developer.signal_lead_hours).reduce((sum, developer) => sum + (developer.signal_lead_hours ?? 0), 0) ?? 0) /
      Math.max(1, developers.data?.developers.filter((developer) => developer.signal_lead_hours).length ?? 1)
  );

  return (
    <div className="space-y-6 p-4">
      <section className="grid gap-2 md:grid-cols-4">
        {[
          ["developers indexed", developers.data?.developers.length ?? "—"],
          ["hackathons covered", hackathons.data?.hackathons.length ?? "—"],
          ["fresh signals (24h)", fresh.data?.items.filter((item) => item.hours_since_indexed <= 24).length ?? 0],
          ["avg lead time vs linkedin", avgLead ? leadLabel(avgLead) : "—"]
        ].map(([label, value]) => (
          <div key={label} className="border hairline bg-[var(--bg-elev)] p-3">
            <div className="font-heading text-[32px] leading-none text-[var(--ink)]">{value}</div>
            <div className="mt-2 text-[11px] uppercase text-[var(--ink-mid)]">{label}</div>
          </div>
        ))}
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h1 className="text-[12px] uppercase text-[var(--ink-mid)]">live fresh feed</h1>
          <Link href="/feed" className="text-[11px] text-[var(--accent)]">open feed →</Link>
        </div>
        {fresh.isLoading ? <LoadingRows /> : fresh.isError ? <ErrorState error={fresh.error} /> : fresh.data?.items.length ? (
          <div className="border-y hairline">
            {fresh.data.items.slice(0, 8).map((item) => (
              <motion.div
                key={item.project.id}
                initial={{ y: -8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
                className="grid gap-2 border-b hairline px-3 py-2 text-[12px] hover:bg-[var(--bg-hover)] md:grid-cols-[120px_1fr_140px_220px_80px]"
              >
                <div className="text-[var(--ink-soft)]">{shortDate(item.indexed_at)}</div>
                <Link href={`/projects/${item.project.id}`} className="text-[var(--ink)]">{item.project.title}</Link>
                <Link href={`/hackathons/${item.hackathon.slug}`} className="text-[var(--ink-mid)]">{item.hackathon.slug}</Link>
                <div className="truncate text-[var(--ink-mid)]">{item.members.map((member) => member.name).join(" · ")}</div>
                <OfferButton developerId={item.members[0].id} />
              </motion.div>
            ))}
          </div>
        ) : <EmptyState text="no fresh signals · indexer is quiet" />}
      </section>

      <section>
        <h2 className="mb-2 text-[12px] uppercase text-[var(--ink-mid)]">saved searches</h2>
        <div className="grid gap-2 md:grid-cols-3">
          {[
            ["/developers?stack=react,typescript&placed_top=3&sort=signal_lead", "react + typescript podium"],
            ["/developers?stack=rust&placed_top=3&has_offer=false", "rust podium, not offered"],
            ["/feed?stack=llm", "fresh llm submissions"]
          ].map(([href, label]) => (
            <Link key={href} href={href} className="border hairline p-3 text-[12px] text-[var(--accent)] hover:bg-[var(--bg-hover)]">▸ {label}</Link>
          ))}
        </div>
      </section>
    </div>
  );
}
