import { copyEstimateForRevision, type RevisableEstimateLine } from "@/lib/estimate-revision";
import { parsePreviewDraft, type EstimateLine } from "./estimate";

export type ServiceContext = { id: string; customer: string; vehicle: string; vehicleId: string; concern: string; roNumber: string; roVersion: number; live: boolean; latestEstimateVersion: number };
export const REVIEW_CONTEXTS: ServiceContext[] = [
  { id: "review-ro-1", customer: "Jordan · review customer", vehicle: "2019 Ford F-150 · 3.5L · confirm brake configuration", vehicleId: "review-vehicle-1", concern: "Grinding when braking", roNumber: "REVIEW-RO-001", roVersion: 1, live: false, latestEstimateVersion: 0 },
  { id: "review-ro-2", customer: "Casey · review customer", vehicle: "2018 Toyota Camry · 2.5L · confirm brake configuration", vehicleId: "review-vehicle-2", concern: "Brake vibration", roNumber: "REVIEW-RO-002", roVersion: 1, live: false, latestEstimateVersion: 0 }
];
export type Decision = "APPROVED" | "DECLINED" | "DEFERRED";
export type PresentedRevision = { id: string; version: number; contextId: string; roVersion: number; vehicleId: string; lines: EstimateLine[]; rate: number; lineItems: RevisableEstimateLine[]; subtotalCents: number; presentedAt: number; expiresAt: number; reason: string };
export type PreviewDecision = { revisionId: string; name: string; staff: string; at: number; choices: Record<string, Decision>; authorizedLineKeys: string[]; authorizedAmountCents: number };
export type PreviewHandoff = { revisionId: string; workId: string; technician: string; at: number; description: string };
export type ServicePreview = { lines: EstimateLine[]; rate: number; revisions: PresentedRevision[]; decisions: PreviewDecision[]; handoffs: PreviewHandoff[]; editing: boolean };

export function newServicePreview(): ServicePreview {
  return { lines: [{ id: "front-pads-rotors", label: "Replace front pads & rotors", hours: 2, parts: 220, laborBasis: "PLANNING", conflictGroup: "front-friction" }], rate: 150, revisions: [], decisions: [], handoffs: [], editing: true };
}

export function revisionLines(lines: EstimateLine[], rate: number): RevisableEstimateLine[] {
  const draft = parsePreviewDraft(JSON.stringify({ version: 1, lines, rate }));
  if (!draft || !lines.length || lines.some(line => line.hours === null || line.parts === null)) throw new Error("Complete labor and parts pricing for every work item first.");
  if (lines.some(line => line.id.length > 90)) throw new Error("A work identifier is too long for the existing estimate contract.");
  return lines.flatMap(line => [
    { key: `${line.id}:labor`, type: "LABOR" as const, description: line.label, quantity: 1, unitPriceCents: Math.round(line.hours! * rate * 100), taxable: false, workTypeCode: "REPAIR", laborGuideMinutes: Math.round(line.hours! * 60), plannedCorrection: line.label },
    { key: `${line.id}:parts`, type: "PART" as const, description: `Parts allowance · ${line.label}`, quantity: 1, unitPriceCents: Math.round(line.parts! * 100), taxable: true, workTypeCode: "REPAIR", laborGuideMinutes: 0, plannedCorrection: line.label }
  ]);
}

function required(value: string, label: string) {
  if (typeof value !== "string" || !value.trim() || value.length > 200) throw new Error(`${label} is required (up to 200 characters).`);
  return value.trim();
}

function validTime(now: number, previous = 0) {
  if (!Number.isSafeInteger(now) || now < previous) throw new Error("Check the device clock before continuing.");
}

export function presentServiceRevision(state: ServicePreview, context: ServiceContext, reason: string, now: number): ServicePreview {
  if (!state.editing) throw new Error("Create a revision before changing a presented estimate.");
  const previous = state.revisions.at(-1);
  if (previous && (previous.contextId !== context.id || previous.vehicleId !== context.vehicleId || previous.roVersion !== context.roVersion)) throw new Error("The RO context changed. Start a fresh review without carrying over scope or authorization.");
  validTime(now, Math.max(0, ...state.revisions.map(item => item.presentedAt), ...state.decisions.map(item => item.at), ...state.handoffs.map(item => item.at)));
  const lineItems = revisionLines(state.lines, state.rate);
  const version = context.latestEstimateVersion + state.revisions.length + 1;
  const revision: PresentedRevision = { id: `preview-v${version}`, version, contextId: context.id, vehicleId: context.vehicleId, roVersion: context.roVersion, lines: state.lines.map(line => ({ ...line })), rate: state.rate, lineItems, subtotalCents: lineItems.reduce((sum, line) => sum + line.quantity * line.unitPriceCents, 0), reason: required(reason, "Scope / revision reason"), presentedAt: now, expiresAt: now + 7 * 86400000 };
  return { ...state, revisions: [...state.revisions, revision], editing: false };
}

export function reviseServiceEstimate(state: ServicePreview): ServicePreview {
  const previous = state.revisions.at(-1);
  if (!previous || state.editing) throw new Error("Present the current draft first.");
  const copied = copyEstimateForRevision({ ...previous, taxCents: 0, discountCents: 0, taxBoundary: "Preview subtotal only; tax and fees not finalized" });
  return { ...state, lines: previous.lines.map(line => ({ ...line, label: copied.lineItems.find(item => item.key === `${line.id}:labor`)!.description })), rate: previous.rate, editing: true };
}

export function decideServiceRevision(state: ServicePreview, revisionId: string, choices: Record<string, Decision>, name: string, staff: string, now: number): ServicePreview {
  const revision = state.revisions.at(-1);
  if (state.editing || !revision || revision.id !== revisionId) throw new Error("This revision is stale. Review the latest presented estimate.");
  validTime(now, revision.presentedAt);
  if (now >= revision.expiresAt) throw new Error("This preview estimate expired. Create a new revision.");
  if (state.decisions.some(decision => decision.revisionId === revisionId)) throw new Error("The decision is already recorded. Use a new revision to change scope.");
  if (Object.keys(choices).length !== revision.lines.length || revision.lines.some(line => !Object.hasOwn(choices, line.id) || !["APPROVED", "DECLINED", "DEFERRED"].includes(choices[line.id]))) throw new Error("Choose approve, decline or defer for every work item.");
  const authorizedLineKeys = revision.lines.filter(line => choices[line.id] === "APPROVED").flatMap(line => [`${line.id}:labor`, `${line.id}:parts`]);
  const decision: PreviewDecision = { revisionId, choices: { ...choices }, name: required(name, "Reviewer acting as customer"), staff: required(staff, "Recording staff"), at: now, authorizedLineKeys, authorizedAmountCents: revision.lineItems.filter(line => authorizedLineKeys.includes(line.key)).reduce((sum, line) => sum + line.quantity * line.unitPriceCents, 0) };
  return { ...state, decisions: [...state.decisions, decision] };
}

export function handoffApprovedWork(state: ServicePreview, technician: string, now: number): ServicePreview {
  const revision = state.revisions.at(-1);
  const decision = state.decisions.find(item => item.revisionId === revision?.id);
  if (state.editing || !revision || !decision) throw new Error("The latest revision needs a recorded decision before handoff.");
  validTime(now, Math.max(decision.at, ...state.handoffs.map(item => item.at)));
  if (now >= revision.expiresAt) throw new Error("This preview estimate expired. Create a new revision.");
  const approved = revision.lines.filter(line => decision.choices[line.id] === "APPROVED");
  if (!approved.length) throw new Error("No approved work is available for handoff.");
  const assigned = required(technician, "Technician");
  const additions = approved.filter(line => !state.handoffs.some(item => item.revisionId === revision.id && item.workId === line.id)).map(line => ({ revisionId: revision.id, workId: line.id, description: line.label, technician: assigned, at: now }));
  return { ...state, handoffs: [...state.handoffs, ...additions] };
}
