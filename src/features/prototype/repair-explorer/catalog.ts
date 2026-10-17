import { EXPANDED_REPAIR_SYSTEMS } from "./expanded-catalog";
import { buildLaborPlan, type LaborPlan } from "./labor-guide";
import { BRAKE_GROUPS, BRAKE_OPERATIONS } from "@/lib/brake-baseline";
import { STEERING_GROUPS, STEERING_OPERATIONS } from "@/lib/steering-baseline";
import { LIGHT_DUTY_OPERATIONS, LIGHT_DUTY_SYSTEMS } from "@/lib/light-duty-baseline";

export type RepairOperation = {
  id: string;
  label: string;
  kind: "repair" | "diagnosis";
  hours: number | null;
  parts: number | null;
  keywords: string;
  includes: string[];
  conflictGroup?: string;
  laborPlan?: LaborPlan;
  catalogOperationId?: string;
  position?: "front-left" | "front-right";
};

export type RepairGroup = { id: string; label: string; operations: RepairOperation[] };
export type RepairSystem = { id: string; label: string; groups: RepairGroup[] };


export const REPAIR_SYSTEMS: RepairSystem[] = EXPANDED_REPAIR_SYSTEMS.map((system) => {
  if (system.id === "steering") return {
    ...system,
    groups: STEERING_GROUPS.map(group => ({ id: group.id, label: group.label, operations: STEERING_OPERATIONS.filter(item => item.groupId === group.id).map(item => {
      const repair: RepairOperation = { id: item.previewId, label: item.label, kind: item.diagnosis ? "diagnosis" : "repair", hours: item.hours, parts: item.parts.length ? null : 0, keywords: `${item.label} ${item.family} ${item.position} ${item.aliases.join(" ")} steering suspension`, includes: item.included };
      const plan = buildLaborPlan(repair, group.id);
      return { ...repair, laborPlan: { ...plan, basis: "WORK_BREAKDOWN" as const, scope: `${item.position}. Internal unvalidated planning allowance; confirm access, alignment and calibration requirements.` } };
    }) }))
  };
  if (system.id === "brakes") return {
    ...system,
    groups: [
      ...BRAKE_GROUPS.map(group => ({ id: group.id, label: group.label, operations: BRAKE_OPERATIONS.filter(item => item.groupId === group.id).map(item => {
        const repair: RepairOperation = { id: item.previewId, label: item.label, kind: item.diagnosis ? "diagnosis" : "repair", hours: item.hours, parts: item.parts.length ? null : 0, keywords: `${item.label} ${item.family} ${item.position} ${item.id} ${item.id === "brake-noise" ? "grinding squeal pulsation" : ""}`, includes: item.included };
        const plan = buildLaborPlan(repair, group.id);
        return { ...repair, laborPlan: { ...plan, basis: "WORK_BREAKDOWN" as const, scope: `${item.position}. Internal unvalidated planning allowance; review vehicle-specific access and procedures.` } };
      }) }))
    ]
  };
  const expanded = LIGHT_DUTY_SYSTEMS.find(item => item.id === system.id)!;
  return { ...expanded, groups: expanded.groups.map(group => ({ id: group.id, label: group.label, operations: LIGHT_DUTY_OPERATIONS.filter(item => item.systemId === expanded.id && item.groupId === group.id).map(item => ({
    id: item.previewId, label: item.label, kind: item.diagnosis ? "diagnosis" as const : "repair" as const, hours: item.hours, parts: item.parts.length ? null : 0,
    keywords: `${item.label} ${item.keywords} ${item.aliases.join(" ")} ${group.label}`, includes: item.included, laborPlan: item.laborPlan,
    ...(item.groupId === "engine-assembly" && ["Replace engine assembly", "Replace complete dressed engine assembly", "Replace engine long block", "Replace engine short block", "Overhaul engine assembly", "Remove and reinstall engine assembly"].includes(item.label) ? { conflictGroup: "engine-assembly-alternatives" } : {})
  })) })) };
});

export const CATALOG_ENTRIES = REPAIR_SYSTEMS.flatMap((system) => system.groups.flatMap((group) => group.operations.map((repair) => ({ system, group, repair }))));

export const CATALOG_COUNTS = { systems: REPAIR_SYSTEMS.length, groups: REPAIR_SYSTEMS.reduce((total, system) => total + system.groups.length, 0), operations: CATALOG_ENTRIES.length };

export function searchRepairs(query: string) {
  const words = query.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  return CATALOG_ENTRIES.filter(({ system, repair }) => {
    const terms = `${system.label} ${repair.label} ${repair.keywords}`.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
    return words.every((word) => terms.some((term) => term.startsWith(word)));
  }).sort((left, right) => /\b[pbcu]\d{4}\b/i.test(query) ? Number(right.repair.kind === "diagnosis") - Number(left.repair.kind === "diagnosis") || Number(right.repair.id === "engine-misfire") - Number(left.repair.id === "engine-misfire") : 0);
}
