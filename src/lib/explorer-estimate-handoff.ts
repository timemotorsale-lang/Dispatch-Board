import { parsePreviewDraft, type PreviewDraft } from "@/features/prototype/repair-explorer/estimate";
import type { LaborRepairOperation } from "@/server/diagnostics/labor-operation-taxonomy";
import { connectedLaborSelection } from "./labor-catalog-selection";
import { repairScopeConflict } from "./repair-catalog-baselines";

export type ExplorerEstimateSeed = {
  reviewNote?: string;
  labor: Array<LaborRepairOperation & { rowId: string }>;
  parts: Array<{ id: string; laborRowId: string; name: string; number: string; pricingStatus: "PRICE_PENDING" | "ESTIMATED"; quantity: number; source: "MANUAL"; unitPrice: number }>;
};

export function prepareExplorerQuote(raw: string, catalog: LaborRepairOperation[], allowedSystems: readonly string[], newId: () => string) {
  const draft = parsePreviewDraft(raw);
  if (!draft?.lines.length) throw new Error("The saved draft is unavailable. No work was replaced.");
  if (draft.lines.some((line, index) => draft.lines.slice(index + 1).some(other => repairScopeConflict(line.id, other.id)))) throw new Error("Remove overlapping work before continuing.");
  const issues = explorerEstimateIssues(raw, catalog, allowedSystems);
  const reviewable = issues.filter(issue => issue.message.startsWith("This system has not completed") || issue.message.startsWith("The approved operation is unavailable"));
  if (reviewable.length !== issues.length) throw new Error("Enter missing hours and correct invalid work before continuing.");
  const reviewedIds = new Set(reviewable.map(issue => issue.id));
  const reviewed = { ...draft, lines: draft.lines.map(line => reviewedIds.has(line.id) ? {
    id: `custom-${newId()}`, label: `${line.label}${line.position ? ` · ${line.position.replace("-", " ")}` : ""}`, hours: line.hours, parts: line.parts, laborBasis: "MANUAL" as const, ...(line.conflictGroup ? { conflictGroup: line.conflictGroup } : {}),
  } : line) };
  const transfer = explorerEstimateSeed(JSON.stringify(reviewed), catalog, allowedSystems);
  transfer.seed.reviewNote = `Staff quote selections: ${reviewable.map(issue => `${issue.label} [${issue.id}]`).join("; ")}`.slice(0, 2000);
  const partLines = reviewed.lines.filter(line => line.parts === null || line.parts > 0);
  transfer.seed.parts = transfer.seed.parts.map((part, index) => ({ ...part, id: part.id.replace("explorer-allowance-", "explorer-quote-"), name: part.name.replace("Unitemized allowance:", "Parts for"), pricingStatus: partLines[index].parts === null ? "PRICE_PENDING" : "ESTIMATED" }));
  return transfer;
}

export function assertExplorerDraftTarget(draft: PreviewDraft, target?: { id: string; vehicle: { id?: string } } | null) {
  if ((draft.repairOrderId ?? null) !== (target?.id ?? null) || (draft.vehicleId ?? null) !== (target?.vehicle.id ?? null)) {
    throw new Error("This draft belongs to a different repair order or vehicle. Return to the original guide; no work was attached or replaced.");
  }
}

export function explorerEstimateSeed(raw: string, catalog: LaborRepairOperation[], allowedSystems: readonly string[]): { draft: PreviewDraft; seed: ExplorerEstimateSeed } {
  const draft = parsePreviewDraft(raw);
  if (!draft?.lines.length) throw new Error("The browser draft is missing or invalid. Return to Repair Explorer and generate it again. No current work was replaced.");
  if (draft.lines.some((line, index) => draft.lines.slice(index + 1).some(other => repairScopeConflict(line.id, other.id)))) throw new Error("Remove overlapping work in Repair Explorer before continuing.");
  const seed: ExplorerEstimateSeed = { labor: [], parts: [] };
  const identities = new Set<string>();
  for (const line of draft.lines) {
    if (line.hours === null) throw new Error(`Enter labor hours for ${line.label} in Repair Explorer before continuing.`);
    const custom = /^custom-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(line.id) && line.laborBasis === "MANUAL" && !line.catalogOperationId && !line.position;
    const operation: LaborRepairOperation = custom ? {
      id: line.id, title: line.label, hours: line.hours, aliases: [], component: "Staff-defined work", concernExamples: [], included: ["Custom work: verify scope and labor basis for the actual vehicle"], operation: "Service", overlapGroup: null, position: "Vehicle", requiredAddOns: [], subsystem: "Custom work", system: "Staff-reviewed custom work",
    } : connectedLaborSelection(line, catalog, allowedSystems);
    if (identities.has(operation.id)) throw new Error("The same catalog work appears more than once. Remove duplicate work before continuing.");
    identities.add(operation.id);
    seed.labor.push({ ...operation, hours: line.hours, rowId: operation.id });
    if (line.parts === null || line.parts > 0) seed.parts.push({ id: `explorer-allowance-${seed.parts.length}`, laborRowId: operation.id, name: `Unitemized allowance: ${line.label}`, number: "", pricingStatus: "PRICE_PENDING", quantity: 1, source: "MANUAL", unitPrice: line.parts ?? 0 });
  }
  return { draft, seed };
}

export function unresolvedExplorerAllowance(part: { id: string; name: string; number: string }) {
  return part.id.startsWith("explorer-allowance-") && (!part.number.trim() || part.name.toLowerCase().startsWith("unitemized allowance:"));
}

export function explorerEstimateIssues(raw: string, catalog: LaborRepairOperation[], allowedSystems: readonly string[]) {
  const draft = parsePreviewDraft(raw);
  if (!draft) return [];
  return draft.lines.flatMap(line => {
    try {
      explorerEstimateSeed(JSON.stringify({ ...draft, lines: [line] }), catalog, allowedSystems);
      return [];
    } catch (error) {
      return [{ id: line.id, label: line.label, message: error instanceof Error ? error.message : "Review this operation before importing." }];
    }
  });
}
