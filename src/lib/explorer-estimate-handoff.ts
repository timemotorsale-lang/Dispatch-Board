import { parsePreviewDraft, type PreviewDraft } from "@/features/prototype/repair-explorer/estimate";
import type { LaborRepairOperation } from "@/server/diagnostics/labor-operation-taxonomy";
import { connectedLaborSelection } from "./labor-catalog-selection";
import { repairScopeConflict } from "./repair-catalog-baselines";

export type ExplorerEstimateSeed = {
  labor: Array<LaborRepairOperation & { rowId: string }>;
  parts: Array<{ id: string; laborRowId: string; name: string; number: string; pricingStatus: "PRICE_PENDING"; quantity: number; source: "MANUAL"; unitPrice: number }>;
};

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
