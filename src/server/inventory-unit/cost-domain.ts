export const COST_CATEGORIES = ["ACQUISITION", "RECONDITIONING", "TRANSPORT", "TITLE", "FEES", "MERCHANDISING", "CARRYING", "OTHER_READINESS"] as const;
export function normalizeCostRecord(value: unknown, now = new Date()) {
  const body = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const required = (key: string, max: number) => {
    const value = body[key];
    if (typeof value !== "string" || !value.trim() || value.trim().length > max) throw new Error(`Valid ${key} is required.`);
    return value.trim();
  };
  const reason = required("reason", 1000);
  if (reason.length < 10) throw new Error("Provide a meaningful cost record reason.");
  if (!Number.isSafeInteger(body.expectedVersion) || Number(body.expectedVersion) < 1) throw new Error("Current inventory version is required.");
  const base = { reason, expectedVersion: Number(body.expectedVersion), idempotencyKey: required("idempotencyKey", 200) };
  if (body.action === "VOID_COST") return { ...base, action: "VOID_COST" as const, costId: required("costId", 200) };
  if (body.action !== "RECORD_COST") throw new Error("Cost action is invalid.");
  if (!COST_CATEGORIES.includes(body.category as typeof COST_CATEGORIES[number])) throw new Error("Cost category is invalid.");
  if (body.status !== "ESTIMATED" && body.status !== "INCURRED") throw new Error("Cost status must be estimated or incurred.");
  if (body.currency !== "USD") throw new Error("Manual cost capture currently requires USD.");
  if (!Number.isSafeInteger(body.amountCents) || Number(body.amountCents) <= 0 || Number(body.amountCents) > 2_000_000_000) throw new Error("Cost amount must be positive whole cents within its limit.");
  const observed = required("observedAt", 40);
  if (!/^\d{4}-\d{2}-\d{2}T/.test(observed)) throw new Error("Cost date is invalid.");
  const observedAt = new Date(observed);
  if (!Number.isFinite(observedAt.getTime()) || observedAt.toISOString() !== observed || observedAt > now) throw new Error("Cost date must be a valid UTC timestamp and cannot be in the future.");
  return { ...base, action: "RECORD_COST" as const, category: body.category as typeof COST_CATEGORIES[number], status: body.status, currency: "USD", amountCents: Number(body.amountCents), observedAt, reference: required("reference", 160), notes: required("notes", 1000) };
}

export function summarizeRecordedCosts(entries: readonly { status: string; currency: string; amountCents: number }[]) {
  const active = entries.filter(entry => entry.status !== "VOID" && entry.status !== "REVERSED");
  const eligible = active.filter(entry => entry.currency === "USD" && ["ESTIMATED", "INCURRED"].includes(entry.status));
  return {
    incurredCents: eligible.filter(entry => entry.status === "INCURRED").reduce((sum, entry) => sum + entry.amountCents, 0),
    estimatedCents: eligible.filter(entry => entry.status === "ESTIMATED").reduce((sum, entry) => sum + entry.amountCents, 0),
    unclassified: active.length - eligible.length
  };
}
