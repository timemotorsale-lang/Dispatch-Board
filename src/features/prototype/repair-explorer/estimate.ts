import { brakeScopeConflict } from "@/lib/brake-baseline";
import { steeringScopeConflict } from "@/lib/steering-baseline";

export type EstimateLine = {
  id: string;
  label: string;
  hours: number | null;
  parts: number | null;
  conflictGroup?: string;
  laborBasis?: "PLANNING" | "MANUAL" | "REPORTED_MEDIAN";
  laborConfiguration?: string;
  reportedJobCount?: number;
  catalogOperationId?: string;
  position?: "front-left" | "front-right";
};

export type PreviewDraft = { version: 1; rate: number; lines: EstimateLine[]; repairOrderId?: string; vehicleId?: string };

export function isValidAmount(value: unknown, maximum: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= maximum;
}

export function estimateTotals(lines: EstimateLine[], rate: number) {
  const laborCents = lines.reduce((total, line) => total + Math.round((line.hours ?? 0) * rate * 100), 0);
  const partsCents = lines.reduce((total, line) => total + Math.round((line.parts ?? 0) * 100), 0);
  return {
    hours: lines.reduce((total, line) => total + (line.hours ?? 0), 0),
    unpricedLines: lines.filter((line) => line.hours === null || line.parts === null).length,
    labor: laborCents / 100,
    parts: partsCents / 100,
    subtotal: (laborCents + partsCents) / 100
  };
}

export function parsePreviewDraft(raw: string): PreviewDraft | null {
  try {
    const draft = JSON.parse(raw) as PreviewDraft;
    if (!draft || draft.version !== 1 || !isValidAmount(draft.rate, 1000) || !Array.isArray(draft.lines) || draft.lines.length > 100) return null;
    if (draft.repairOrderId !== undefined || draft.vehicleId !== undefined) {
      if (typeof draft.repairOrderId !== "string" || !draft.repairOrderId || draft.repairOrderId.length > 200 || typeof draft.vehicleId !== "string" || !draft.vehicleId || draft.vehicleId.length > 200) return null;
    }
    const identifiers = new Set<string>();
    const conflicts = new Set<string>();
    for (const line of draft.lines) {
      if (!line || typeof line.id !== "string" || !line.id || line.id.length > 200 || identifiers.has(line.id)
        || typeof line.label !== "string" || !line.label.trim() || line.label.length > 200
        || (line.hours !== null && !isValidAmount(line.hours, 100)) || (line.parts !== null && !isValidAmount(line.parts, 100000))
        || (line.conflictGroup !== undefined && (typeof line.conflictGroup !== "string" || !line.conflictGroup || conflicts.has(line.conflictGroup)))
        || (line.laborBasis !== undefined && !["PLANNING", "MANUAL", "REPORTED_MEDIAN"].includes(line.laborBasis))
        || (line.laborConfiguration !== undefined && (typeof line.laborConfiguration !== "string" || !line.laborConfiguration.trim() || line.laborConfiguration.length > 200))
        || (line.reportedJobCount !== undefined && (!Number.isInteger(line.reportedJobCount) || line.reportedJobCount < 3 || line.reportedJobCount > 1000))
        || (line.laborBasis === "REPORTED_MEDIAN" && (!line.laborConfiguration || line.reportedJobCount === undefined))
        || (line.catalogOperationId !== undefined && (typeof line.catalogOperationId !== "string" || !line.catalogOperationId || line.catalogOperationId.length > 200))
        || (line.position !== undefined && !["front-left", "front-right"].includes(line.position))
        || (Boolean(line.catalogOperationId) !== Boolean(line.position))) return null;
      identifiers.add(line.id);
      if (line.conflictGroup) conflicts.add(line.conflictGroup);
    }
    if (draft.lines.some((line, index) => draft.lines.slice(index + 1).some(other => brakeScopeConflict(line.id, other.id) || steeringScopeConflict(line.id, other.id)))) return null;
    return draft;
  } catch {
    return null;
  }
}
