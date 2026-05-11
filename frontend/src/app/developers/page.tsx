"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { api, queryStale } from "@/lib/api";
import { leadLabel, shortDate } from "@/lib/utils";
import { EmailButton } from "@/components/email-button";
import { EmptyState, ErrorState, LoadingRows } from "@/components/states";

function setParam(params: URLSearchParams, key: string, value: string) {
  if (value) params.set(key, value);
  else params.delete(key);
  return params.toString();
}

function DevelopersContent() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const queryString = searchParams.toString();
  const developers = useQuery({ queryKey: ["developers", queryString], queryFn: () => api.developers(queryString), staleTime: queryStale.normal });

  function update(key: string, value: string) {
    const next = new URLSearchParams(searchParams.toString());
    router.push(`${pathname}?${setParam(next, key, value)}`);
  }

  return (
    <div className="grid min-h-[calc(100vh-48px)] md:grid-cols-[240px_1fr]">
      <aside className="border-r hairline bg-[var(--bg-elev)] p-3">
        <div className="mb-4 text-[12px] uppercase text-[var(--ink-mid)]">filters</div>
        {[
          ["stack", "react,typescript"],
          ["hackathon", "hackmit-2025"],
          ["project_keyword", "neural"]
        ].map(([key, placeholder]) => (
          <label key={key} className="mb-3 block text-[11px] uppercase text-[var(--ink-soft)]">
            {key.replace("_", " ")}
            <input defaultValue={searchParams.get(key) ?? ""} placeholder={placeholder} onBlur={(event) => update(key, event.target.value)} className="mt-1 w-full border hairline bg-[var(--bg)] px-2 py-2 text-[12px] text-[var(--ink)] outline-none" />
          </label>
        ))}
        <div className="mb-3 text-[11px] uppercase text-[var(--ink-soft)]">placement</div>
        <div className="mb-4 flex flex-wrap gap-1">
          {[
            ["1st", "1"],
            ["2nd", "2"],
            ["3rd", "3"],
            ["any-podium", "3"],
            ["any", ""]
          ].map(([label, value]) => (
            <button key={label} onClick={() => update("placed_top", value)} className="chip hover:bg-[var(--bg-hover)]">{label}</button>
          ))}
        </div>
        <label className="mb-3 block text-[11px] uppercase text-[var(--ink-soft)]">
          status
          <select value={searchParams.get("has_offer") ?? ""} onChange={(event) => update("has_offer", event.target.value)} className="mt-1 w-full border hairline bg-[var(--bg)] px-2 py-2 text-[12px] text-[var(--ink)] outline-none">
            <option value="">available + offered</option>
            <option value="false">available</option>
            <option value="true">already offered</option>
          </select>
        </label>
        <label className="block text-[11px] uppercase text-[var(--ink-soft)]">
          sort
          <select value={searchParams.get("sort") ?? "recency"} onChange={(event) => update("sort", event.target.value)} className="mt-1 w-full border hairline bg-[var(--bg)] px-2 py-2 text-[12px] text-[var(--ink)] outline-none">
            <option value="recency">recency</option>
            <option value="placement">wins</option>
            <option value="signal_lead">signal lead</option>
          </select>
        </label>
      </aside>
      <section className="min-w-0 p-4">
        <h1 className="mb-3 text-[12px] uppercase text-[var(--ink-mid)]">developers</h1>
        {developers.isLoading ? <LoadingRows /> : developers.isError ? <ErrorState error={developers.error} /> : developers.data?.developers.length ? (
          <table className="dense-table text-[12px]">
            <thead>
              <tr><th>name</th><th>stack</th><th>hackathons</th><th>last won</th><th>lead</th><th>status</th><th>actions</th></tr>
            </thead>
            <tbody>
              {developers.data.developers.map((developer) => (
                <tr key={developer.id}>
                  <td><Link href={`/developers/${developer.id}`} className="text-[var(--ink)]">{developer.name}</Link><div className="text-[var(--ink-soft)]">@{developer.handle}</div></td>
                  <td className="max-w-[360px]">{developer.stack.slice(0, 6).map((tag) => <span key={tag} className="chip mr-1 mb-1">{tag}</span>)}</td>
                  <td>{developer.hackathon_count}</td>
                  <td>{shortDate(developer.first_indexed_at)}</td>
                  <td className="text-[var(--signal)]">{leadLabel(developer.signal_lead_hours)}</td>
                  <td className={developer.offer ? "text-[var(--offered)]" : "text-[var(--accent)]"}>{developer.offer ? "■ offered" : "□ open"}</td>
                  <td className="space-x-1">
                    <EmailButton developerId={developer.id} developerName={developer.name} defaultTo={developer.links.email} />
                    <Link href={`/developers/${developer.id}`} className="inline-block border hairline px-2 py-1 text-[11px] text-[var(--accent)]">→</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <EmptyState text="no developers match these filters · try removing a stack tag" />}
      </section>
    </div>
  );
}

export default function DevelopersPage() {
  return (
    <Suspense fallback={<div className="p-4"><LoadingRows /></div>}>
      <DevelopersContent />
    </Suspense>
  );
}
