import { CATALOG_RELEASE, LABOR_CATEGORIES, operationFor, type LaborCategory } from "./catalog";

export type BodyPart = { id: string; description: string; number: string; quantity: number; unitPriceCents: number | null; source: "OEM" | "AFTERMARKET" | "RECYCLED" | "OTHER"; fitment: string; taxable: boolean };
export type BodyLine = { id: string; operationId: string; position: string; minutes: number | null; basis: string; applicability: string; procedure: string; category: LaborCategory; parts: BodyPart[]; materialsCents: number | null; materialsBasis: string; subletCents: number | null; subletReference: string; taxable: boolean; sharedAccess: { group: string; minutes: number; reason: string } | null; evidenceIds: string[]; note: string };
export type BodyDraft = { schema: 1; release: string; title: string; vehicleId: string | null; repairOrderId: string | null; payer: "INTERNAL" | "CUSTOMER" | "INSURANCE"; claimReference: string; lines: BodyLine[]; rates: Record<LaborCategory, number | null>; rateReason: string; taxBasisPoints: number | null; taxReference: string; discountCents: number; priorEstimateId: string | null; supplementReason: string; evidenceIds: string[] };
export type BodyCalculation = ReturnType<typeof calculateBodyDraft>;
const limits = { lines: 150, parts: 100 };
function object(value: unknown): Record<string, unknown> { if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("A valid estimating record is required."); return value as Record<string, unknown>; }
function text(value: unknown, max = 2000) { if (typeof value !== "string" || value.length > max) throw new Error("An estimating text field is invalid or too long."); return value.trim(); }
function optionalId(value: unknown) { return value == null ? null : text(value, 200) || null; }
function integer(value: unknown, max: number, nullable = false): number | null { if (nullable && value === null) return null; if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0 || value > max) throw new Error("Enter a valid nonnegative whole amount."); return value; }
function ids(value: unknown) { if (!Array.isArray(value) || value.length > 100) throw new Error("Evidence references are invalid."); return [...new Set(value.map(item => text(item, 200)))].filter(Boolean); }
export function emptyBodyDraft(rateCents: number | null = null): BodyDraft { return { schema: 1, release: CATALOG_RELEASE, title: "Autobody estimate", vehicleId: null, repairOrderId: null, payer: "CUSTOMER", claimReference: "", lines: [], rates: Object.fromEntries(LABOR_CATEGORIES.map(category => [category, category === "SUBLET" ? 0 : rateCents])) as BodyDraft["rates"], rateReason: "", taxBasisPoints: null, taxReference: "", discountCents: 0, priorEstimateId: null, supplementReason: "", evidenceIds: [] }; }
export function newBodyLine(operationId: string): BodyLine { const operation = operationFor(operationId); if (!operation) throw new Error("Choose an available collision operation."); return { id: crypto.randomUUID(), operationId, position: "", minutes: operation.method === "SUBLET" ? 0 : null, basis: "", applicability: "", procedure: "", category: operation.category, parts: [], materialsCents: 0, materialsBasis: "", subletCents: operation.method === "SUBLET" ? null : 0, subletReference: "", taxable: false, sharedAccess: null, evidenceIds: [], note: "" }; }
export function normalizeBodyDraft(value: unknown): BodyDraft {
  const raw = object(value), ratesRaw = object(raw.rates);
  if (raw.schema !== 1 || raw.release !== CATALOG_RELEASE || !["INTERNAL", "CUSTOMER", "INSURANCE"].includes(String(raw.payer))) throw new Error("This catalog or draft version cannot be used. Reload the saved draft.");
  if (!Array.isArray(raw.lines) || raw.lines.length > limits.lines) throw new Error("An estimate supports up to 150 work lines.");
  const lineIds = new Set<string>();
  const lines = raw.lines.map(value => { const row = object(value), id = text(row.id, 80), operationId = text(row.operationId, 150), operation = operationFor(operationId); if (!id || lineIds.has(id) || !operation) throw new Error("Estimate line identities must be unique and use available operations."); lineIds.add(id);
    if (!Array.isArray(row.parts) || row.parts.length > limits.parts) throw new Error("Part list is invalid.");
    const partIds = new Set<string>();
    const parts = row.parts.map(value => { const part = object(value), partId = text(part.id, 80); if (!partId || partIds.has(partId) || !["OEM", "AFTERMARKET", "RECYCLED", "OTHER"].includes(String(part.source))) throw new Error("Part identity or source is invalid."); partIds.add(partId); const quantity = integer(part.quantity, 10000)!; if (!quantity) throw new Error("Part quantity must be positive."); return { id: partId, description: text(part.description, 400), number: text(part.number, 100), quantity, unitPriceCents: integer(part.unitPriceCents, 100000000, true), source: part.source as BodyPart["source"], fitment: text(part.fitment), taxable: part.taxable === true }; });
    const shared = row.sharedAccess == null ? null : object(row.sharedAccess);
    return { id, operationId, position: text(row.position, 100), minutes: integer(row.minutes, 60000, true), basis: text(row.basis), applicability: text(row.applicability), procedure: text(row.procedure), category: operation.category, parts, materialsCents: integer(row.materialsCents, 100000000, true), materialsBasis: text(row.materialsBasis), subletCents: integer(row.subletCents, 100000000, true), subletReference: text(row.subletReference), taxable: row.taxable === true, sharedAccess: shared ? { group: text(shared.group, 100), minutes: integer(shared.minutes, 60000)!, reason: text(shared.reason) } : null, evidenceIds: ids(row.evidenceIds), note: text(row.note) };
  });
  return { schema: 1, release: CATALOG_RELEASE, title: text(raw.title, 200), vehicleId: optionalId(raw.vehicleId), repairOrderId: optionalId(raw.repairOrderId), payer: raw.payer as BodyDraft["payer"], claimReference: text(raw.claimReference, 200), lines, rates: Object.fromEntries(LABOR_CATEGORIES.map(category => [category, integer(ratesRaw[category], 100000, true)])) as BodyDraft["rates"], rateReason: text(raw.rateReason ?? ""), taxBasisPoints: integer(raw.taxBasisPoints, 3000, true), taxReference: text(raw.taxReference, 500), discountCents: integer(raw.discountCents, 100000000)!, priorEstimateId: optionalId(raw.priorEstimateId), supplementReason: text(raw.supplementReason), evidenceIds: ids(raw.evidenceIds) };
}
export function calculateBodyDraft(draft: BodyDraft) {
  const issues: string[] = [], seen = new Map<string, string[]>(), shared = new Set<string>();
  if (!draft.lines.length) issues.push("Add at least one operation.");
  if (draft.taxBasisPoints === null || !draft.taxReference) issues.push("Confirm the applicable tax rate and its reference, including a zero-tax decision.");
  const lines = [...draft.lines].sort((a, b) => a.id.localeCompare(b.id)).map(line => {
    const operation = operationFor(line.operationId)!;
    const problems: string[] = [], rate = draft.rates[line.category], scopeKey = `${operation.componentId}:${line.position}`;
    const selected = seen.get(scopeKey) ?? []; selected.push(operation.method); seen.set(scopeKey, selected);
    if (line.minutes === null || (line.minutes > 0 && rate === null)) problems.push("Labor time or category rate is pending.");
    if (line.minutes !== null && operation.method !== "SUBLET" && (!line.basis || !line.applicability)) problems.push("Record the estimator allowance basis and vehicle applicability review.");
    if (operation.technicalReview && !line.procedure) problems.push("Record the applicable technical procedure / qualified review reference.");
    let deduction = 0;
    if (line.sharedAccess) { if (!line.sharedAccess.group || !line.sharedAccess.reason || line.sharedAccess.minutes > (line.minutes ?? 0)) problems.push("Shared access requires a group, explanation and time no greater than the line allowance."); else if (shared.has(line.sharedAccess.group)) deduction = line.sharedAccess.minutes; else shared.add(line.sharedAccess.group); }
    const netMinutes = line.minutes === null ? null : line.minutes - deduction;
    const laborCents = netMinutes === null || (netMinutes > 0 && rate === null) ? null : Math.round(netMinutes * (rate ?? 0) / 60);
    const parts = line.parts.map(part => { if (!part.description || !part.fitment || !part.number || part.unitPriceCents === null) problems.push("Complete part description, reference, fitment and price."); return { ...part, totalCents: part.unitPriceCents === null ? null : part.quantity * part.unitPriceCents }; });
    if (line.materialsCents === null || line.subletCents === null) problems.push("A material or vendor amount is pending.");
    if ((line.materialsCents ?? 0) > 0 && !line.materialsBasis) problems.push("Explain the material amount and confirm it is not charged elsewhere.");
    if ((line.subletCents ?? 0) > 0 && !line.subletReference) problems.push("Record the vendor quotation reference.");
    const partsCents = parts.reduce((sum, part) => sum + (part.totalCents ?? 0), 0), totalCents = (laborCents ?? 0) + partsCents + (line.materialsCents ?? 0) + (line.subletCents ?? 0);
    const taxableCents = (line.taxable ? (laborCents ?? 0) + (line.materialsCents ?? 0) + (line.subletCents ?? 0) : 0) + parts.filter(part => part.taxable).reduce((sum, part) => sum + (part.totalCents ?? 0), 0);
    issues.push(...problems.map(problem => `${operation.label}: ${problem}`));
    return { id: line.id, operationId: line.operationId, label: operation.label, category: line.category, baseMinutes: line.minutes, deductionMinutes: deduction, netMinutes, laborCents, partsCents, totalCents, taxableCents, problems, explanation: deduction ? `Deducted ${deduction} minutes of reviewed shared access: ${line.sharedAccess?.reason}` : "No shared-access deduction.", parts };
  });
  for (const methods of seen.values()) {
    if (new Set(methods).size !== methods.length) issues.push("The same component, position and operation is selected more than once.");
    if (methods.includes("REPLACE") && (methods.includes("REPAIR") || methods.includes("REMOVE_INSTALL"))) issues.push("Replacement already includes its removal/installation. Resolve the competing repair or removal line.");
    if (methods.includes("REFINISH") && methods.includes("BLEND")) issues.push("Choose refinish or blend for the same panel position, not both.");
  }
  if (draft.priorEstimateId && !draft.supplementReason) issues.push("Explain the changed scope for this supplement.");
  const subtotalCents = lines.reduce((sum, line) => sum + line.totalCents, 0);
  if (draft.discountCents > subtotalCents) issues.push("Discount cannot exceed the known subtotal.");
  const taxableCents = lines.reduce((sum, line) => sum + line.taxableCents, 0);
  if (draft.discountCents > 0 && taxableCents > 0) issues.push("Taxable discounts require a reviewed allocated adjustment through the existing document workflow; remove this draft discount first.");
  const taxCents = draft.taxBasisPoints === null ? null : Math.round(taxableCents * draft.taxBasisPoints / 10000);
  if (!Number.isSafeInteger(subtotalCents) || subtotalCents + (taxCents ?? 0) > 2000000000) issues.push("Estimate exceeds the supported financial limit.");
  return { release: draft.release, lines, subtotalCents, taxCents, discountCents: draft.discountCents, totalCents: subtotalCents + (taxCents ?? 0) - draft.discountCents, issues: [...new Set(issues)], ready: issues.length === 0, knownSubtotalOnly: issues.length > 0, laborByCategory: Object.fromEntries(LABOR_CATEGORIES.map(category => [category, lines.filter(line => line.category === category).reduce((sum, line) => sum + (line.laborCents ?? 0), 0)])) };
}
export function compareBodyDrafts(previous: BodyDraft, next: BodyDraft) { const before = new Map(previous.lines.map(line => [line.id, line])), after = new Map(next.lines.map(line => [line.id, line])); return { added: next.lines.filter(line => !before.has(line.id)).map(line => line.id), removed: previous.lines.filter(line => !after.has(line.id)).map(line => line.id), changed: next.lines.filter(line => before.has(line.id) && JSON.stringify(before.get(line.id)) !== JSON.stringify(line)).map(line => line.id) }; }

export function bodyEstimateLines(draft: BodyDraft) {
  const calculation = calculateBodyDraft(draft);
  if (!calculation.ready) throw new Error(calculation.issues[0] ?? "Review this estimate first.");
  return calculation.lines.flatMap(result => {
    const line = draft.lines.find(line => line.id === result.id)!, operation = operationFor(line.operationId)!, key = `body-${operation.componentId}-${operation.method.toLowerCase()}-${line.id}`;
    const common = { quantity: 1, workTypeCode: `BODY_${line.category}`, plannedCorrection: `${result.label}${line.position ? ` · ${line.position}` : ""}. ${line.note}`.trim() };
    const entries = operation.method === "SUBLET" ? [] : [{ ...common, key, type: "LABOR" as const, description: common.plannedCorrection.slice(0, 500), unitPriceCents: result.laborCents ?? 0, laborGuideMinutes: result.netMinutes ?? 0, taxable: line.taxable }];
    const parts = line.parts.map(part => ({ ...common, key: `bp-${part.id}`, type: "PART" as const, description: part.description, quantity: part.quantity, unitPriceCents: part.unitPriceCents!, taxable: part.taxable, laborGuideMinutes: 0, partNumber: part.number, ...(operation.method === "SUBLET" ? {} : { laborLineKey: key }) }));
    const fees = ([ ["materials", line.materialsCents, line.materialsBasis], ["vendor", line.subletCents, line.subletReference] ] as const).filter(([, amount]) => (amount ?? 0) > 0).map(([kind, amount, basis]) => ({ ...common, key: `bf-${line.id}-${kind}`, type: "FEE" as const, description: `${kind === "vendor" ? "Sublet" : "Materials"}: ${result.label} · ${basis}`.slice(0, 500), unitPriceCents: amount!, taxable: line.taxable, laborGuideMinutes: 0 }));
    return [...entries, ...parts, ...fees];
  });
}
