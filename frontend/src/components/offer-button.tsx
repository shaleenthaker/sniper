"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";

export function OfferButton({ developerId, label = "+OFFER" }: { developerId: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState("Founding engineer");
  const [notes, setNotes] = useState("");
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => api.createOffer({
      developer_id: developerId,
      role_title: role,
      sender_name: "Mara Stone",
      sender_email: "mara@northstar.example",
      notes
    }),
    onSuccess: () => {
      queryClient.invalidateQueries();
      setOpen(false);
    }
  });

  return (
    <>
      <button className="border hairline px-2 py-1 text-[11px] text-[var(--accent)] hover:bg-[var(--accent-soft)]" onClick={() => setOpen(true)}>
        {label}
      </button>
      {open ? (
        <div className="fixed inset-0 z-40 bg-black/60 p-4 pt-[18vh]" onClick={() => setOpen(false)}>
          <div className="mx-auto max-w-md border hairline bg-[var(--bg)] p-4" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 text-[12px] uppercase text-[var(--ink-mid)]">send offer intent</div>
            <label className="mb-3 block text-[11px] uppercase text-[var(--ink-soft)]">
              role title
              <input value={role} onChange={(event) => setRole(event.target.value)} className="mt-1 w-full border hairline bg-[var(--bg-elev)] px-2 py-2 text-[12px] text-[var(--ink)] outline-none" />
            </label>
            <label className="mb-4 block text-[11px] uppercase text-[var(--ink-soft)]">
              notes
              <textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-1 min-h-24 w-full border hairline bg-[var(--bg-elev)] px-2 py-2 text-[12px] text-[var(--ink)] outline-none" />
            </label>
            {mutation.isError ? <div className="mb-3 border hairline border-[var(--offered)] p-2 text-[12px] text-[var(--offered)]">{mutation.error.message}</div> : null}
            <div className="flex justify-end gap-2">
              <button className="border hairline px-3 py-2 text-[12px] text-[var(--ink-mid)]" onClick={() => setOpen(false)}>cancel</button>
              <button className="border hairline px-3 py-2 text-[12px] text-[var(--accent)] hover:bg-[var(--accent-soft)]" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
                {mutation.isPending ? "sending..." : "+ SEND OFFER"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
