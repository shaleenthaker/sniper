"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { api, queryStale } from "@/lib/api";
import { leadLabel } from "@/lib/utils";
import { OfferButton } from "@/components/offer-button";
import { EmptyState, ErrorState, LoadingRows } from "@/components/states";

function FeedContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const query = searchParams.toString();
  const fresh = useQuery({ queryKey: ["fresh", query], queryFn: () => api.fresh(query), staleTime: queryStale.fresh });

  function update(key: string, value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <div className="p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-[12px] uppercase text-[var(--ink-mid)]">fresh signals · pre-linkedin</h1>
        <input defaultValue={searchParams.get("stack") ?? ""} onBlur={(event) => update("stack", event.target.value)} placeholder="stack=react,llm" className="border hairline bg-[var(--bg-elev)] px-2 py-1 text-[12px] outline-none" />
        <input defaultValue={searchParams.get("hackathon") ?? ""} onBlur={(event) => update("hackathon", event.target.value)} placeholder="hackathon=hackmit-2025" className="border hairline bg-[var(--bg-elev)] px-2 py-1 text-[12px] outline-none" />
      </div>
      {fresh.isLoading ? <LoadingRows rows={10} /> : fresh.isError ? <ErrorState error={fresh.error} /> : fresh.data?.items.length ? (
        <div className="border-y hairline">
          {fresh.data.items.map((item) => (
            <motion.div key={item.project.id} initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }} className="grid gap-2 border-b hairline px-3 py-2 text-[12px] hover:bg-[var(--bg-hover)] md:grid-cols-[84px_1fr_160px_220px_180px_84px]">
              <div className="text-[var(--signal)]"><span className="pulse-fresh">▪</span> {leadLabel(item.hours_since_indexed)}</div>
              <Link href={`/projects/${item.project.id}`}>{item.project.title}</Link>
              <Link href={`/hackathons/${item.hackathon.slug}`} className="text-[var(--ink-mid)]">{item.hackathon.slug}</Link>
              <div className="truncate text-[var(--ink-mid)]">{item.members.map((member) => member.name).join(" · ")}</div>
              <div>{item.project.stack.slice(0, 4).map((tag) => <span key={tag} className="chip mr-1">{tag}</span>)}</div>
              <OfferButton developerId={item.members[0].id} />
            </motion.div>
          ))}
        </div>
      ) : <EmptyState text="no fresh signals match these filters · try removing `rust`" />}
    </div>
  );
}

export default function FeedPage() {
  return (
    <Suspense fallback={<div className="p-4"><LoadingRows rows={10} /></div>}>
      <FeedContent />
    </Suspense>
  );
}
