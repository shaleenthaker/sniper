"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, queryStale } from "@/lib/api";
import { shortDate } from "@/lib/utils";
import { EmptyState, ErrorState, LoadingRows } from "@/components/states";
import type { Offer } from "@/lib/types";

export default function OffersPage() {
  const queryClient = useQueryClient();
  const offers = useQuery({ queryKey: ["offers"], queryFn: api.offers, staleTime: queryStale.normal });
  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Offer["status"] }) => api.updateOffer(id, status),
    onSuccess: () => queryClient.invalidateQueries()
  });

  return (
    <div className="p-4">
      <h1 className="mb-3 text-[12px] uppercase text-[var(--ink-mid)]">outgoing offers</h1>
      {offers.isLoading ? <LoadingRows /> : offers.isError ? <ErrorState error={offers.error} /> : offers.data?.offers.length ? (
        <table className="dense-table text-[12px]">
          <thead><tr><th>role</th><th>developer</th><th>sender</th><th>created</th><th>status</th></tr></thead>
          <tbody>
            {offers.data.offers.map((offer) => (
              <tr key={offer.id}>
                <td>{offer.role_title}<div className="text-[var(--ink-soft)]">{offer.notes}</div></td>
                <td>{offer.developer_id}</td>
                <td>{offer.sender_name}<div className="text-[var(--ink-soft)]">{offer.sender_email}</div></td>
                <td>{shortDate(offer.created_at)}</td>
                <td>
                  <select value={offer.status} onChange={(event) => mutation.mutate({ id: offer.id, status: event.target.value as Offer["status"] })} className="border hairline bg-[var(--bg-elev)] px-2 py-1 text-[12px] text-[var(--ink)] outline-none">
                    {["sent", "accepted", "rejected", "withdrawn"].map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : <EmptyState text="no offers recorded" />}
    </div>
  );
}
