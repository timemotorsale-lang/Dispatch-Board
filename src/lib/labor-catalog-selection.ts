import { repairBaselineForId } from "./repair-catalog-baselines";
import { lightDutyOperationForId } from "./light-duty-baseline";
import type { LaborRepairOperation } from "@/server/diagnostics/labor-operation-taxonomy";

export const LABOR_PILOT_SYSTEMS = ["brakes", "steering"] as const;

export function connectedLaborSelection(selection: { id: string; catalogOperationId?: string; position?: "front-left" | "front-right" }, catalog: LaborRepairOperation[]) {
  const baseline = repairBaselineForId(selection.catalogOperationId ?? selection.id);
  if (!baseline || !["brakes", "steering"].includes(baseline.system)) throw new Error("This system has not completed the connected catalog audit. Use the existing guide for staff-reviewed work.");
  const operation = catalog.find(item => item.id === baseline.operation.id);
  if (!operation) throw new Error("The approved operation is unavailable in the current labor catalog.");
  if (selection.position && selection.id !== `${selection.catalogOperationId}:${selection.position}`) throw new Error("Invalid selected position scope.");
  const id = selection.position ? `${operation.id}:${selection.position}` : operation.id;
  if (`labor-${id.replace(/[^a-z0-9-]/gi, "-").toLowerCase()}`.length > 100) throw new Error("Selected work identity exceeds the estimate limit.");
  return { ...operation, id, position: selection.position ?? operation.position, title: `${operation.title}${selection.position ? ` · ${selection.position.replace("-", " ")}` : ""}` };
}

export function laborOperationForLineKey(key: string, catalog: LaborRepairOperation[]) {
  const normalize = (id: string) => `labor-${id.replace(/[^a-z0-9-]/gi, "-").toLowerCase()}`;
  const exact = catalog.find(operation => normalize(operation.id) === key);
  if (exact) return exact;
  for (const position of ["front-left", "front-right"] as const) {
    const operation = catalog.find(item => {
      const expanded = lightDutyOperationForId(item.id);
      const supportsFrontCorner = !expanded || (expanded.groupId === "tires-hubs" && expanded.zone === "unspecified" && !/\brear\b/i.test(expanded.label));
      return supportsFrontCorner && repairBaselineForId(item.id) && normalize(`${item.id}:${position}`) === key;
    });
    if (operation) return { ...operation, id: `${operation.id}:${position}`, position, title: `${operation.title} · ${position.replace("-", " ")}` };
  }
  return null;
}
