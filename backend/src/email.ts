import { getEnv } from "./env.js";
import type { Developer } from "./types.js";

type DeveloperEmailInput = {
  to?: string;
  subject: string;
  message: string;
  sender_name: string;
  sender_email?: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function senderFromEnv() {
  return getEnv("RESEND_FROM_EMAIL") ?? "Sniper <onboarding@resend.dev>";
}

function resendApiKey() {
  const key = getEnv("RESEND_API_KEY") ?? getEnv("RESEND_KEY");
  if (!key) throw new Error("RESEND_API_KEY is required");
  return key;
}

export async function sendDeveloperEmail(developer: Developer, input: DeveloperEmailInput) {
  const to = input.to ?? developer.links.email;
  if (!to) throw new Error("Recipient email is required for this developer");
  if (!input.subject.trim()) throw new Error("Subject is required");
  if (!input.message.trim()) throw new Error("Message is required");

  const payload = {
    from: senderFromEnv(),
    to: [to],
    reply_to: input.sender_email ? [input.sender_email] : undefined,
    subject: input.subject,
    text: `${input.message}\n\nSent by ${input.sender_name}`,
    html: `
      <div style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; line-height: 1.5; color: #111;">
        <p>${escapeHtml(input.message).replaceAll("\n", "<br>")}</p>
        <hr style="border: 0; border-top: 1px solid #ddd; margin: 24px 0;">
        <p style="color: #555; font-size: 12px;">Sent by ${escapeHtml(input.sender_name)} through Sniper.</p>
      </div>
    `
  };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${resendApiKey()}`,
      "content-type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = typeof body.message === "string" ? body.message : `Resend request failed with status ${res.status}`;
    throw new Error(message);
  }

  return {
    id: typeof body.id === "string" ? body.id : null,
    to,
    subject: input.subject,
    developer_id: developer.id
  };
}
