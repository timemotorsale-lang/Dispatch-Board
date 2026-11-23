import type { CommercialLine } from "./service-commercial-ledger";
import type { ExplorerEstimateSeed } from "./explorer-estimate-handoff";
import { laborOperationForLineKey } from "./labor-catalog-selection";
import type { LaborRepairOperation } from "@/server/diagnostics/labor-operation-taxonomy";

export type SavedEstimateRevision = {
  documentId: string;
  documentHash: string;
  estimateId: string;
  version: number;
  expectedVersion: number;
  discountCents: number;
  taxRatePercent: number | null;
  lines: (CommercialLine & { plannedCorrection?: string; workTypeCode?: string })[];
};

export function manualRevisionLabor(rowId: string, title = "", hours = 0): LaborRepairOperation & { rowId: string } {
  return {
    id: rowId, rowId, title, hours, aliases: [], component: "Manual labor", concernExamples: [], included: [],
    operation: "Repair", overlapGroup: null, position: "", requiredAddOns: [], subsystem: "Manual labor", system: "Manual labor",
  };
}

export function estimateRevisionSeed(revision: SavedEstimateRevision, catalog: LaborRepairOperation[]): ExplorerEstimateSeed {
  const labor = revision.lines.filter(line => line.type === "LABOR").map(line => ({
    ...(laborOperationForLineKey(line.key, catalog) ?? manualRevisionLabor(line.key)),
    rowId: line.key,
    title: line.description,
    hours: (line.laborGuideMinutes ?? 0) / 60,
  }));
  const parts = revision.lines.filter(line => line.type === "PART").map(line => ({
    id: line.key,
    laborRowId: line.laborLineKey ?? "",
    name: line.description,
    number: line.partNumber ?? "",
    pricingStatus: "ESTIMATED" as const,
    quantity: line.quantity,
    source: "MANUAL" as const,
    taxable: line.taxable === true,
    unitPrice: line.unitPriceCents / 100,
  }));
  return { labor, parts };
}

// Existing rates remain in effect for retained hours. New or changed hours use the active shop rate.
export function retainedLaborKeys(source: CommercialLine[], revised: CommercialLine[]) {
  const labor = new Map(source.filter(line => line.type === "LABOR").map(line => [line.key, line]));
  return new Set(revised.filter(line => {
    const original = labor.get(line.key);
    return line.type === "LABOR" && original && original.quantity === line.quantity &&
      (original.laborGuideMinutes ?? 0) === (line.laborGuideMinutes ?? 0) && original.unitPriceCents === line.unitPriceCents;
  }).map(line => line.key));
}
