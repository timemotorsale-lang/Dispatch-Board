import type { Prisma } from "@prisma/client";

import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { prisma } from "@/server/db/client";

type AuthEmailDeliveryStatus = "DISABLED" | "QUEUED" | "SENT" | "FAILED";

export type AuthEmailDeliveryResult = {
  provider: string;
  status: AuthEmailDeliveryStatus;
  messageId?: string;
  error?: string;
};

export type AuthEmailInput = {
  actionLabel?: string;
  actionUrl?: string;
  actorUserId?: string | null;
  body: string;
  eventType: string;
  metadata?: Record<string, unknown>;
  preview: string;
  subject: string;
  subjectId: string;
  subjectType?: string;
  to: string;
  toName?: string | null;
};

function providerName() {
  return (process.env.AUTH_EMAIL_PROVIDER ?? (process.env.NODE_ENV === "production" ? "disabled" : "console")).trim().toLowerCase();
}

function publicBaseUrl() {
  return (process.env.AUTH_PUBLIC_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001").trim().replace(/\/+$/, "");
}

export function absoluteAuthUrl(pathOrUrl: string) {
  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }

  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${publicBaseUrl()}${path}`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderText(input: AuthEmailInput) {
  const lines = [
    input.toName ? `Hi ${input.toName},` : "Hello,",
    "",
    input.body,
    "",
    input.actionUrl && input.actionLabel ? `${input.actionLabel}: ${input.actionUrl}` : "",
    "",
    "If you did not expect this message, contact a manager before continuing."
  ];

  return lines.filter((line, index) => line || index < lines.length - 1).join("\n");
}

function renderHtml(input: AuthEmailInput) {
  const action = input.actionUrl && input.actionLabel
    ? `<p><a href="${escapeHtml(input.actionUrl)}" style="display:inline-block;background:#4055d6;color:#ffffff;text-decoration:none;border-radius:8px;padding:12px 16px;font-weight:700">${escapeHtml(input.actionLabel)}</a></p>`
    : "";

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#172033">
      <p>${input.toName ? `Hi ${escapeHtml(input.toName)},` : "Hello,"}</p>
      <p>${escapeHtml(input.body)}</p>
      ${action}
      <p style="color:#667085;font-size:13px">If you did not expect this message, contact a manager before continuing.</p>
    </div>
  `;
}

async function recordDeliveryAudit(input: AuthEmailInput, result: AuthEmailDeliveryResult) {
  await prisma.enterpriseAuditEvent.create({
    data: {
      organizationId: INITIAL_ORGANIZATION.id,
      actorUserId: input.actorUserId ?? input.subjectId,
      domain: "TEAM_SECURITY",
      subjectType: input.subjectType ?? "USER",
      subjectId: input.subjectId,
      eventType: input.eventType,
      reason: `${input.subject} email delivery ${result.status.toLowerCase()}.`,
      metadata: {
        ...(input.metadata ?? {}),
        deliveryError: result.error ?? null,
        deliveryMessageId: result.messageId ?? null,
        deliveryProvider: result.provider,
        deliveryStatus: result.status,
        recipient: input.to
      } as Prisma.InputJsonObject,
      correlationId: `team-security:${input.eventType.toLowerCase()}:${input.subjectId}:${Date.now()}`
    }
  });
}

async function sendViaResend(input: AuthEmailInput): Promise<AuthEmailDeliveryResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.AUTH_EMAIL_FROM;

  if (!apiKey || !from) {
    return {
      provider: "resend",
      status: "FAILED",
      error: "Resend email delivery requires RESEND_API_KEY and AUTH_EMAIL_FROM."
    };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      text: renderText(input),
      html: renderHtml(input),
      reply_to: process.env.AUTH_EMAIL_REPLY_TO || undefined
    })
  });
  const payload = (await response.json().catch(() => null)) as { id?: string; message?: string } | null;

  if (!response.ok) {
    return {
      provider: "resend",
      status: "FAILED",
      error: payload?.message ?? `Resend returned ${response.status}.`
    };
  }

  return {
    provider: "resend",
    status: "SENT",
    messageId: payload?.id
  };
}

export async function sendAuthEmail(input: AuthEmailInput): Promise<AuthEmailDeliveryResult> {
  const provider = providerName();
  let result: AuthEmailDeliveryResult;

  if (provider === "disabled") {
    result = { provider, status: "DISABLED" };
  } else if (provider === "resend") {
    result = await sendViaResend(input);
  } else {
    console.info("[auth-email]", {
      actionUrl: input.actionUrl,
      preview: input.preview,
      subject: input.subject,
      to: input.to
    });
    result = { provider: "console", status: "QUEUED" };
  }

  await recordDeliveryAudit(input, result);
  return result;
}
