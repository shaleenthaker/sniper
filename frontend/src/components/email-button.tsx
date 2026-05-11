"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";

export function EmailButton({ developerId, defaultTo, developerName, label = "+EMAIL" }: { developerId: string; defaultTo?: string; developerName: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState(defaultTo ?? "");
  const [subject, setSubject] = useState(`Quick note about your hackathon work`);
  const [message, setMessage] = useState(`Hi ${developerName},\n\nI saw your hackathon work and thought it looked relevant to a role we are hiring for. Would you be open to a quick conversation this week?\n\nBest,\nMara`);
  const mutation = useMutation({
    mutationFn: () => api.sendDeveloperEmail(developerId, {
      to: to || undefined,
      subject,
      message,
      sender_name: "Mara Stone",
      sender_email: "mara@northstar.example"
    })
  });

  return (
    <>
      <button className="border hairline px-2 py-1 text-[11px] text-[var(--signal)] hover:bg-[var(--bg-hover)]" onClick={() => setOpen(true)}>
        {label}
      </button>
      {open ? (
        <div className="fixed inset-0 z-40 bg-black/60 p-4 pt-[14vh]" onClick={() => setOpen(false)}>
          <div className="mx-auto max-w-lg border hairline bg-[var(--bg)] p-4" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 text-[12px] uppercase text-[var(--ink-mid)]">send email · {developerName}</div>
            <label className="mb-3 block text-[11px] uppercase text-[var(--ink-soft)]">
              recipient
              <input value={to} onChange={(event) => setTo(event.target.value)} placeholder="developer@example.com" className="mt-1 w-full border hairline bg-[var(--bg-elev)] px-2 py-2 text-[12px] text-[var(--ink)] outline-none" />
            </label>
            <label className="mb-3 block text-[11px] uppercase text-[var(--ink-soft)]">
              subject
              <input value={subject} onChange={(event) => setSubject(event.target.value)} className="mt-1 w-full border hairline bg-[var(--bg-elev)] px-2 py-2 text-[12px] text-[var(--ink)] outline-none" />
            </label>
            <label className="mb-4 block text-[11px] uppercase text-[var(--ink-soft)]">
              message
              <textarea value={message} onChange={(event) => setMessage(event.target.value)} className="mt-1 min-h-44 w-full border hairline bg-[var(--bg-elev)] px-2 py-2 text-[12px] text-[var(--ink)] outline-none" />
            </label>
            {mutation.isSuccess ? <div className="mb-3 border hairline border-[var(--signal)] p-2 text-[12px] text-[var(--signal)]">sent to {mutation.data.email.to}</div> : null}
            {mutation.isError ? <div className="mb-3 border hairline border-[var(--offered)] p-2 text-[12px] text-[var(--offered)]">{mutation.error.message}</div> : null}
            <div className="flex justify-end gap-2">
              <button className="border hairline px-3 py-2 text-[12px] text-[var(--ink-mid)]" onClick={() => setOpen(false)}>close</button>
              <button className="border hairline px-3 py-2 text-[12px] text-[var(--signal)] hover:bg-[var(--bg-hover)]" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
                {mutation.isPending ? "sending..." : "+ SEND EMAIL"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
