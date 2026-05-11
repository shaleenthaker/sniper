"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, queryStale } from "@/lib/api";
import { EmptyState, ErrorState, LoadingRows } from "@/components/states";
import type { GraphNode } from "@/lib/types";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

type GraphDatum = GraphNode & { x?: number; y?: number };

export default function GraphPage() {
  const [depth, setDepth] = useState(2);
  const [center, setCenter] = useState("hackathon:hackmit-2025");
  const [selected, setSelected] = useState<GraphDatum | null>(null);
  const graph = useQuery({ queryKey: ["graph", center, depth], queryFn: () => api.graph(`center=${encodeURIComponent(center)}&depth=${depth}`), staleTime: queryStale.normal });
  const data = useMemo(() => graph.data ? { nodes: graph.data.nodes, links: graph.data.edges } : { nodes: [], links: [] }, [graph.data]);

  return (
    <div className="relative h-[calc(100vh-48px)] overflow-hidden">
      <div className="absolute right-4 top-4 z-20 flex gap-2">
        <Link href="/developers" className="border hairline bg-[var(--bg)] px-3 py-2 text-[12px] text-[var(--accent)]">list view →</Link>
      </div>
      {graph.isLoading ? <div className="p-4"><LoadingRows /></div> : graph.isError ? <div className="p-4"><ErrorState error={graph.error} /></div> : data.nodes.length ? (
        <ForceGraph2D
          graphData={data}
          backgroundColor="#0B0B0A"
          nodeRelSize={5}
          linkColor={(link) => link.type === "won" ? "#D4A24C" : "#2A2823"}
          linkWidth={(link) => link.type === "won" ? 1.5 : 1}
          nodeCanvasObject={(rawNode, ctx, scale) => {
            const node = rawNode as GraphDatum;
            const label = node.label;
            const size = node.type === "developer" ? 4 : 5;
            ctx.save();
            ctx.strokeStyle = node.type === "hackathon" ? "#D4A24C" : "#9A9588";
            ctx.fillStyle = node.type === "developer" ? "#E8E4D8" : "#0B0B0A";
            ctx.lineWidth = 1;
            if (node.type === "hackathon") {
              ctx.strokeRect((node.x ?? 0) - size, (node.y ?? 0) - size, size * 2, size * 2);
            } else {
              ctx.beginPath();
              ctx.arc(node.x ?? 0, node.y ?? 0, size, 0, Math.PI * 2);
              node.type === "developer" ? ctx.fill() : ctx.stroke();
            }
            ctx.font = `${11 / scale}px var(--font-jetbrains), monospace`;
            ctx.fillStyle = "#9A9588";
            ctx.textAlign = "center";
            ctx.fillText(label, node.x ?? 0, (node.y ?? 0) + 14);
            ctx.restore();
          }}
          onNodeClick={(node) => setSelected(node as GraphDatum)}
        />
      ) : <EmptyState text="graph returned no nodes" />}

      <div className="absolute bottom-4 left-4 z-20 w-[320px] border hairline bg-[var(--bg)] p-3">
        <div className="mb-2 text-[11px] uppercase text-[var(--ink-mid)]">graph controls</div>
        <label className="mb-3 block text-[11px] uppercase text-[var(--ink-soft)]">
          center on...
          <input value={center} onChange={(event) => setCenter(event.target.value)} className="mt-1 w-full border hairline bg-[var(--bg-elev)] px-2 py-2 text-[12px] text-[var(--ink)] outline-none" />
        </label>
        <label className="block text-[11px] uppercase text-[var(--ink-soft)]">
          depth {depth}
          <input type="range" min="1" max="3" value={depth} onChange={(event) => setDepth(Number(event.target.value))} className="mt-2 w-full accent-[var(--accent)]" />
        </label>
        <div className="mt-3 flex gap-2 text-[11px] text-[var(--ink-soft)]"><span>■ developer</span><span>□ project</span><span>□ hackathon</span></div>
      </div>

      {selected ? (
        <aside className="absolute bottom-0 right-0 top-0 z-30 w-full max-w-sm border-l hairline bg-[var(--bg)] p-4">
          <button onClick={() => setSelected(null)} className="mb-4 border hairline px-2 py-1 text-[12px] text-[var(--ink-mid)]">close</button>
          <div className="mb-2 text-[11px] uppercase text-[var(--ink-soft)]">{selected.type}</div>
          <h2 className="font-heading text-[22px]">{selected.label}</h2>
          <pre className="mt-4 whitespace-pre-wrap border hairline bg-[var(--bg-elev)] p-3 text-[11px] text-[var(--ink-mid)]">{JSON.stringify(selected.meta, null, 2)}</pre>
          <Link href={selected.type === "developer" ? `/developers/${selected.id.replace("developer:", "")}` : selected.type === "hackathon" ? `/hackathons/${selected.id.replace("hackathon:", "")}` : `/projects/${selected.id.replace("project:", "")}`} className="mt-4 inline-block border hairline px-3 py-2 text-[12px] text-[var(--accent)]">go to full page →</Link>
        </aside>
      ) : null}
    </div>
  );
}
