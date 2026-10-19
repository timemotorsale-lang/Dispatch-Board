export const INTAKE_SOURCES = ["AUCTION", "TRADE", "DIRECT_PURCHASE", "DEALER_TRANSFER", "CONSIGNMENT", "OTHER"] as const;
export type IntakeDetails = { source: string; seller: string; boughtFrom: string; buyer: string; acquiredOn: string; reference: string; priceStatus: string; purchaseCents: number | null; proposedPriceCents: number | null; whereabouts: string; odometer: number | null; odometerUnit: string; condition: string; keys: number | null; titleStatus: string; documents: string; pendingNotes: string };
export function intakePending(details: IntakeDetails) {
  return [!details.source && "Acquisition source", !details.seller && "Seller", !details.boughtFrom && "Purchase location", !details.buyer && "Who acquired the vehicle", !details.acquiredOn && "Acquisition date", details.purchaseCents === null && "Purchase price", !details.reference && "Purchase reference", !details.whereabouts && "Current whereabouts", details.odometer === null && "Odometer", !details.condition && "Condition", details.keys === null && "Keys", details.titleStatus !== "RECEIVED" && "Title", !details.documents && "Documents"].filter((value): value is string => Boolean(value));
}
export function normalizeIntake(value: unknown, now: Date) {
  const body = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const raw = body.details && typeof body.details === "object" && !Array.isArray(body.details) ? body.details as Record<string, unknown> : {};
  const text = (key: string, max = 200) => { const value = raw[key]; if (value == null) return ""; if (typeof value !== "string" || value.trim().length > max) throw new Error(`Intake ${key} is invalid.`); return value.trim(); };
  const integer = (value: unknown, max: number) => { if (value == null) return null; if (!Number.isSafeInteger(value) || Number(value) < 0 || Number(value) > max) throw new Error("Intake numeric value is invalid."); return Number(value); };
  const source = text("source"), priceStatus = text("priceStatus"), titleStatus = text("titleStatus"), odometerUnit = text("odometerUnit");
  if (source && !INTAKE_SOURCES.includes(source as typeof INTAKE_SOURCES[number])) throw new Error("Intake source is invalid.");
  if (!["PENDING", "INCURRED", "ESTIMATED"].includes(priceStatus) || !["PENDING", "RECEIVED", "ISSUE"].includes(titleStatus) || !["MILES", "KILOMETERS"].includes(odometerUnit)) throw new Error("Intake status is invalid.");
  const acquiredOn = text("acquiredOn", 10);
  if (acquiredOn && (!/^\d{4}-\d{2}-\d{2}$/.test(acquiredOn) || !Number.isFinite(new Date(acquiredOn).getTime()) || new Date(acquiredOn).toISOString().slice(0, 10) !== acquiredOn || acquiredOn > now.toISOString().slice(0, 10))) throw new Error("Acquisition date is invalid or in the future.");
  const details: IntakeDetails = { source, seller: text("seller"), boughtFrom: text("boughtFrom"), buyer: text("buyer"), acquiredOn, reference: text("reference", 160), priceStatus, purchaseCents: integer(raw.purchaseCents, 2_000_000_000), proposedPriceCents: integer(raw.proposedPriceCents, 2_000_000_000), whereabouts: text("whereabouts", 500), odometer: integer(raw.odometer, 9_999_999), odometerUnit, condition: text("condition", 1000), keys: integer(raw.keys, 100), titleStatus, documents: text("documents", 1000), pendingNotes: text("pendingNotes", 1000) };
  if (priceStatus === "PENDING" && details.purchaseCents !== null || details.purchaseCents === 0 || details.proposedPriceCents === 0) throw new Error("Purchase/proposed price must be positive, or explicitly pending.");
  if (!["DRAFT", "CONFIRMED"].includes(String(body.status))) throw new Error("Intake action is invalid.");
  const expectedVersion = integer(body.expectedVersion, 2_000_000_000), expectedUnitVersion = integer(body.expectedUnitVersion, 2_000_000_000);
  if (expectedVersion === null || typeof body.idempotencyKey !== "string" || !body.idempotencyKey.trim() || body.idempotencyKey.length > 200 || typeof body.reason !== "string" || body.reason.trim().length < 10 || body.reason.length > 1000) throw new Error("Intake revision, retry key and reason are required.");
  const pendingItems = intakePending(details);
  if (body.status === "CONFIRMED") {
    if (!details.whereabouts || details.condition.length < 10) throw new Error("Current whereabouts and meaningful condition are required for handoff.");
    if (pendingItems.length && details.pendingNotes.length < 10) throw new Error("Explain pending information before confirming intake.");
    if (details.purchaseCents !== null && !details.reference) throw new Error("A purchase invoice/reference is required to record its cost.");
  }
  return { details, pendingItems, status: body.status as "DRAFT" | "CONFIRMED", expectedVersion, expectedUnitVersion, idempotencyKey: body.idempotencyKey.trim(), reason: body.reason.trim() };
}
