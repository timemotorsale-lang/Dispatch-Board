"use client";

/** Calls a Collections API and returns JSON, or throws a plain-English error. */
export async function callCollections<T = Record<string, unknown>>(url: string, body?: unknown, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, body === undefined
    ? { cache: "no-store", ...init }
    : { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), cache: "no-store", ...init });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "Something went wrong. Nothing was changed.");
  return payload as T;
}

export function accountAction<T = { ok: true; message: string }>(accountId: string, action: string, values: Record<string, unknown> = {}) {
  return callCollections<T>(`/api/collections/accounts/${encodeURIComponent(accountId)}/actions`, { action, ...values });
}

export async function uploadAccountDocument(accountId: string, file: File, purpose: string, options: { ocr?: boolean } = {}) {
  const form = new FormData();
  form.set("file", file);
  form.set("purpose", purpose);
  if (options.ocr) form.set("ocr", "1");
  const response = await fetch(`/api/collections/accounts/${encodeURIComponent(accountId)}/documents`, { method: "POST", body: form });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "The upload failed. Nothing was changed.");
  return payload as { documentId: string; prefill?: Record<string, unknown> | null };
}

export function formatWhen(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function label(value: string | null | undefined) {
  if (!value) return "—";
  const lower = value.replaceAll("_", " ").toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}
