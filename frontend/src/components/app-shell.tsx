"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { api, queryStale } from "@/lib/api";
import { CommandMenu } from "./command-menu";

const nav = [
  ["SEARCH", "/"],
  ["DEVELOPERS", "/developers"],
  ["HACKATHONS", "/hackathons"],
  ["PROJECTS", "/projects"],
  ["FRESH FEED", "/feed"],
  ["OFFERS", "/offers"],
  ["ADMIN", "/admin"]
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [commandOpen, setCommandOpen] = useState(false);
  const offers = useQuery({ queryKey: ["offers"], queryFn: api.offers, staleTime: queryStale.normal });

  useEffect(() => {
    let awaitingTarget = false;
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((open) => !open);
        return;
      }

      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.key === "g") {
        if (awaitingTarget) {
          router.push("/graph");
          awaitingTarget = false;
        } else {
          awaitingTarget = true;
          window.setTimeout(() => {
            awaitingTarget = false;
          }, 700);
        }
        return;
      }
      if (awaitingTarget) {
        const routes: Record<string, string> = { d: "/developers", h: "/hackathons", f: "/feed" };
        const route = routes[event.key.toLowerCase()];
        if (route) router.push(route);
        awaitingTarget = false;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);

  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-[180px_1fr]">
      <aside className="border-r hairline bg-[var(--bg-elev)] px-3 py-4">
        <Link href="/" className="mb-7 block font-heading text-[18px] uppercase text-[var(--accent)]">sniper</Link>
        <nav className="space-y-5">
          {nav.map(([section, href]) => (
            <div key={section}>
              <div className="mb-2 text-[10px] uppercase text-[var(--ink-soft)]">{section}</div>
              <Link
                href={href}
                className="block border-y hairline py-2 text-[12px] lowercase text-[var(--ink-mid)] hover:bg-[var(--bg-hover)] hover:text-[var(--ink)]"
              >
                {pathname === href || (href !== "/" && pathname.startsWith(href)) ? "▸ " : "  "}
                {section.toLowerCase()}
              </Link>
            </div>
          ))}
        </nav>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b hairline bg-[var(--bg)] px-4">
          <button
            className="border hairline bg-[var(--bg-elev)] px-3 py-1 text-left text-[12px] text-[var(--ink-mid)] hover:bg-[var(--bg-hover)] hover:text-[var(--ink)]"
            onClick={() => setCommandOpen(true)}
          >
            ⌘K · run query
          </button>
          <div className="text-[12px] text-[var(--ink-mid)]">mara stone · {offers.data?.offers.length ?? 0} offers</div>
        </header>
        <main className="min-h-[calc(100vh-48px)]">{children}</main>
      </div>
      <CommandMenu open={commandOpen} onOpenChange={setCommandOpen} />
    </div>
  );
}
