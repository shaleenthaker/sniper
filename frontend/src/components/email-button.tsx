"use client";

import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { api, getAdminToken, setAdminToken } from "@/lib/api";

export function EmailButton({ developerId, defaultTo, developerName, label }: { developerId: string; defaultTo?: string; developerName: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState(defaultTo ?? "");
  const [subject, setSubject] = useState(`Quick note about your hackathon work`);
  const [message, setMessage] = useState(`Hi ${developerName},\n\nI saw your hackathon work and thought it looked relevant to a role we are hiring for. Would you be open to a quick conversation this week?\n\nBest,\nMara`);
  const [copied, setCopied] = useState(false);
  const [adminToken, setLocalAdminToken] = useState("");
  const hasRecipient = to.trim().length > 0;
  const hasAdminToken = adminToken.trim().length > 0;
  const actionLabel = label ?? (defaultTo ? "+EMAIL" : "+ADD EMAIL");
  const mutation = useMutation({
    mutationFn: () => {
      const token = adminToken.trim();
      setAdminToken(token);
      return api.sendDeveloperEmail(developerId, {
        to: to.trim() || undefined,
        subject,
        message,
        sender_name: "Mara Stone",
        sender_email: "mara@northstar.example"
      }, token);
    }
  });

  useEffect(() => {
    setLocalAdminToken(getAdminToken());
  }, [open]);

  function saveToken() {
    setAdminToken(adminToken);
    mutation.reset();
  }

  async function copyDraft() {
    await navigator.clipboard.writeText(`To: ${to || "[recipient]"}\nSubject: ${subject}\n\n${message}`);
    setCopied(true);
  }

  return (
    <>
      <button className="border hairline px-2 py-1 text-[11px] text-[var(--signal)] hover:bg-[var(--bg-hover)]" onClick={() => setOpen(true)}>
        {actionLabel}
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
            <div className={`mb-3 border hairline p-2 text-[12px] ${hasRecipient ? "text-[var(--signal)]" : "text-[var(--accent)]"}`}>
              {hasRecipient ? "recipient ready" : "recipient missing"}
            </div>
            <div className={`mb-3 border hairline p-2 text-[12px] ${hasAdminToken ? "text-[var(--signal)]" : "text-[var(--accent)]"}`}>
              <div className="mb-2">{hasAdminToken ? "admin token ready" : "admin token missing"}</div>
              <div className="flex gap-2">
                <input value={adminToken} onChange={(event) => setLocalAdminToken(event.target.value)} type="password" placeholder="ADMIN_TOKEN" className="min-w-0 flex-1 border hairline bg-[var(--bg-elev)] px-2 py-2 text-[12px] text-[var(--ink)] outline-none" />
                <button className="border hairline px-3 py-2 text-[12px] text-[var(--accent)] hover:bg-[var(--accent-soft)]" onClick={saveToken}>save</button>
              </div>
            </div>
            {mutation.isSuccess ? <div className="mb-3 border hairline border-[var(--signal)] p-2 text-[12px] text-[var(--signal)]">sent to {mutation.data.email.to}</div> : null}
            {mutation.isError ? <div className="mb-3 border hairline border-[var(--offered)] p-2 text-[12px] text-[var(--offered)]">{mutation.error.message}</div> : null}
            {copied ? <div className="mb-3 border hairline border-[var(--signal)] p-2 text-[12px] text-[var(--signal)]">draft copied</div> : null}
            <div className="flex justify-end gap-2">
              <button className="border hairline px-3 py-2 text-[12px] text-[var(--ink-mid)]" onClick={() => setOpen(false)}>close</button>
              <button className="border hairline px-3 py-2 text-[12px] text-[var(--accent)] hover:bg-[var(--accent-soft)]" onClick={copyDraft}>copy draft</button>
              <button className="border hairline px-3 py-2 text-[12px] text-[var(--signal)] hover:bg-[var(--bg-hover)] disabled:text-[var(--ink-soft)]" onClick={() => mutation.mutate()} disabled={mutation.isPending || !hasRecipient || !hasAdminToken || !subject.trim() || !message.trim()}>
                {mutation.isPending ? "sending..." : "+ SEND EMAIL"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
